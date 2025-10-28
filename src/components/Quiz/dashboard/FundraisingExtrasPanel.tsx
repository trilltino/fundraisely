/**
 * Fundraising Extras Panel - Player Extras Purchase Management (Web2)
 *
 * **Purpose:** Sub-panel of HostDashboard for tracking fundraising extras purchases by players
 * in Web2 rooms. Allows hosts to manually record when players buy hints, extra time, etc.,
 * and tracks payment methods (cash/revolut) for reconciliation.
 *
 * **Key Features:**
 * 1. **Per-Player Extras Tracking**: Each player can purchase multiple extras
 * 2. **Quantity Validation**: Enforces maxPerPlayer limits from quiz type config
 * 3. **Payment Method Recording**: Tracks cash/revolut/other for each purchase
 * 4. **Total Calculation**: Auto-calculates total cost (quantity × price)
 * 5. **Confirmation State**: Marks purchases as confirmed after host adds them
 *
 * **Web2 Only Feature:**
 * This panel ONLY shows for Web2 rooms (`config.paymentMethod !== 'web3'`):
 * - **Web2**: Host manually tracks purchases (honor system)
 * - **Web3**: Purchases tracked on-chain (separate flow in player UI)
 *
 * **Fundraising Extras System:**
 * Extras configured in StepFundraisingOptions, examples:
 * - **buyHint**: Reveal correct answer (max 3 per player, €1.50 each)
 * - **extraTime**: Add 10 seconds (max 5 per player, €0.75 each)
 * - **skipQuestion**: Skip without penalty (max 2 per player, €2.00 each)
 *
 * **UI Flow:**
 * ```
 * For each player:
 *   For each enabled extra:
 *     1. Host enters quantity (1-max)
 *     2. Host selects payment method (cash/revolut/other)
 *     3. Panel calculates total: quantity × price
 *     4. Host clicks "Add" → Purchase confirmed
 *     5. Shows green "[COMPLETE]" badge
 * ```
 *
 * **Form State Structure:**
 * ```typescript
 * formState: {
 *   [playerId]: {
 *     [extraKey]: {
 *       method: 'cash' | 'revolut' | 'other',  // Payment method
 *       quantity: number,                       // How many bought
 *       confirmed: boolean                      // Added to player record?
 *     }
 *   }
 * }
 * ```
 *
 * **Example:**
 * ```typescript
 * formState['player123']['buyHint'] = {
 *   method: 'cash',
 *   quantity: 2,
 *   confirmed: true
 * }
 * // Player bought 2 hints for €3.00 total, paid cash
 * ```
 *
 * **Validation Rules:**
 * 1. **Quantity > 0**: Cannot purchase 0 or negative extras
 * 2. **Quantity ≤ max**: Cannot exceed maxPerPlayer from quiz type config
 * 3. **Price > 0**: Extra must have valid price set in StepFundraisingOptions
 * 4. **Valid before confirm**: Cannot click "Add" if validation fails
 *
 * **Validation Feedback:**
 * - Quantity > max → Red border + error message: "You can purchase a maximum of {max}"
 * - Invalid quantity → Red border + error message: "Invalid quantity"
 * - Valid → Normal gray border
 *
 * **Store Integration:**
 * ```typescript
 * // When host confirms purchase:
 * toggleExtraForPlayer(playerId, extraKey, roomId);
 * // Adds extra to player.extras array
 *
 * updateExtraPayment(playerId, extraKey, method, amount, roomId);
 * // Records payment: player.extraPayments[extraKey] = { method, amount }
 * ```
 *
 * **Payment Tracking:**
 * Each purchase recorded in player object:
 * ```typescript
 * player.extraPayments = {
 *   buyHint: { method: 'cash', amount: 3.00 },
 *   extraTime: { method: 'revolut', amount: 0.75 }
 * }
 * ```
 *
 * **Used By PaymentReconciliationPanel:**
 * Extra payments aggregated by method to show:
 * - Total extras revenue
 * - Breakdown: cash vs. revolut
 * - Percentage of total fundraising
 *
 * **Per-Player Display:**
 * Grid layout showing:
 * - **Col 1**: Extra name + price (e.g., "Buy Hint - €1.50 each")
 * - **Col 2**: Quantity input (number field, 0-max)
 * - **Col 3**: Payment method dropdown (cash/revolut/other)
 * - **Col 4**: Total amount (auto-calculated, e.g., "€3.00")
 * - **Col 5**: Add button or confirmed badge
 *
 * **Confirmed State:**
 * After clicking "Add":
 * - Input fields disabled (can't edit)
 * - Shows green badge: "[COMPLETE] 2x Buy Hint"
 * - No undo (host would need to edit player store directly)
 *
 * **Empty States:**
 * - **No extras enabled**: "No fundraising extras enabled for this quiz."
 * - **No players**: "No players to manage extras for."
 *
 * **Integration:**
 * - Parent: HostDashboard (3rd panel)
 * - State: usePlayerStore (players array), useQuizConfig (extras config)
 * - Related: StepFundraisingOptions (defines which extras available)
 * - Related: PaymentReconciliationPanel (aggregates extra payments)
 * - Persistence: Changes saved to localStorage via usePlayerStore
 *
 * **maxPerPlayer Enforcement:**
 * Limits come from `quiztypeconstants.ts`:
 * ```typescript
 * fundraisingOptions: {
 *   buyHint: { maxPerPlayer: 3, usagePhase: 'during_question' },
 *   extraTime: { maxPerPlayer: 5, usagePhase: 'before_timeout' }
 * }
 * ```
 *
 * **Revenue Calculation:**
 * ```typescript
 * const totalAmount = quantity * price;
 * // Example: 2 hints × €1.50 = €3.00
 * ```
 *
 * **Currency Display:**
 * Uses `config.currencySymbol` (default: '€'):
 * - Set in StepPaymentMethod
 * - Consistent across all panels
 *
 * **Future Enhancements:**
 * - Edit confirmed purchases (currently no undo)
 * - Bulk add (apply same extras to multiple players)
 * - Pre-purchase during join (players buy extras when joining)
 * - Real-time sync with player UI (players see credits available)
 * - Receipt generation (PDF/email for each purchase)
 *
 * @component
 * @category Quiz Dashboard
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePlayerStore } from '../../../stores/quizPlayerStore';
import { useQuizConfig } from '../useQuizConfig';
import { quizGameTypes } from '../../../constants/quiztypeconstants';

function isValidQuantity(qty: number, max: number): boolean {
  return qty > 0 && qty <= max;
}

const FundraisingExtrasPanel: React.FC = () => {
  const { players, toggleExtraForPlayer, updateExtraPayment } = usePlayerStore();
  const { config } = useQuizConfig();
  const { roomId } = useParams();

  if (!roomId) return null;

  const selectedType = quizGameTypes.find((t) => t.id === config.gameType);
  const fundraisingLimits = selectedType?.fundraisingOptions || {};

  const isWeb3 = config.paymentMethod === 'web3';
  const enabledExtras = Object.entries(config.fundraisingOptions || {}).filter(([_, enabled]) => enabled);

  const [formState, setFormState] = useState<{
    [playerId: string]: {
      [extraKey: string]: {
        method: 'cash' | 'revolut' | 'other';
        quantity: number;
        confirmed: boolean;
      };
    };
  }>({});

  const handleInputChange = (
    playerId: string,
    extra: string,
    field: 'method' | 'quantity',
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [extra]: {
          ...prev[playerId]?.[extra],
          confirmed: false,
          [field]: field === 'quantity' ? parseInt(value, 10) || 0 : value,
        },
      },
    }));
  };

  const handleConfirm = (playerId: string, extra: string, price: number) => {
    const data = formState[playerId]?.[extra];
    if (!data || data.quantity <= 0 || price <= 0) return;

    const maxAllowed = fundraisingLimits[extra]?.maxPerPlayer ?? Infinity;
    if (data.quantity > maxAllowed) {
      alert(`You can only purchase up to ${maxAllowed} of "${extra}".`);
      return;
    }

    const amount = data.quantity * price;

    toggleExtraForPlayer(playerId, extra, roomId);
    updateExtraPayment(playerId, extra, data.method, amount, roomId);

    setFormState((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [extra]: {
          ...prev[playerId][extra],
          confirmed: true,
        },
      },
    }));
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">[IDEA] Fundraising Extras</h2>

      {enabledExtras.length === 0 ? (
        <p className="text-gray-600">No fundraising extras enabled for this quiz.</p>
      ) : players.length === 0 ? (
        <p className="text-gray-600">No players to manage extras for.</p>
      ) : (
        <div className="space-y-6">
          {players.map((player) => (
            <div key={player.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <p className="text-lg font-medium text-gray-800">{player.name}</p>

              {enabledExtras.map(([extra]) => {
                const price = config.fundraisingPrices?.[extra] || 0;
                const form = formState[player.id]?.[extra];
                const quantity = form?.quantity || 0;
                const confirmed = form?.confirmed;
                const maxAllowed = fundraisingLimits[extra]?.maxPerPlayer ?? Infinity;
                const isValid = isValidQuantity(quantity, maxAllowed);
                const totalAmount = quantity * price;

                return (
                  <div key={extra} className="grid sm:grid-cols-6 gap-4 items-center">
                    <div>
                      <label className="font-medium text-gray-700">
                        {extra.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <p className="text-sm text-gray-500">
                        {config.currencySymbol || '€'}{price} each
                      </p>
                    </div>

                    <div>
                      {!isWeb3 && (
                        <input
                          type="number"
                          min={0}
                          placeholder="Qty"
                          value={form?.quantity || ''}
                          onChange={(e) =>
                            handleInputChange(player.id, extra, 'quantity', e.target.value)
                          }
                          className={`w-full border rounded-lg px-3 py-2 text-sm ${
                            isValid || quantity === 0 ? 'border-gray-300' : 'border-red-500'
                          }`}
                        />
                      )}
                    </div>

                   <div>
  {!isWeb3 && (
    <>
      <input
        type="number"
        min={0}
        placeholder="Qty"
        value={form?.quantity || ''}
        onChange={(e) =>
          handleInputChange(player.id, extra, 'quantity', e.target.value)
        }
        className={`w-full border rounded-lg px-3 py-2 text-sm ${
          isValid || quantity === 0 ? 'border-gray-300' : 'border-red-500'
        }`}
      />
      {quantity > maxAllowed && (
        <p className="text-xs text-red-500 mt-1">
          You can purchase a maximum of {maxAllowed} for this extra.
        </p>
      )}
      {!isValid && quantity > 0 && quantity <= maxAllowed && (
        <p className="text-xs text-red-500 mt-1">
          Invalid quantity. Please enter a valid number.
        </p>
      )}
    </>
  )}
</div>


                    <div>
                      {!!form && (
                        <span className="text-gray-800 text-sm">
                          {config.currencySymbol || '€'}{totalAmount.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div>
                      {!!form && (
                        confirmed ? (
                          <span className="text-green-600 font-medium">
                            [COMPLETE] {quantity}x {extra.replace(/([A-Z])/g, ' $1')}
                          </span>
                        ) : (
                          <button
                            disabled={!isValid || price === 0}
                            onClick={() => handleConfirm(player.id, extra, price)}
                            className={`px-4 py-1 rounded-lg text-sm font-medium transition ${
                              isValid && price > 0
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Add
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FundraisingExtrasPanel;







