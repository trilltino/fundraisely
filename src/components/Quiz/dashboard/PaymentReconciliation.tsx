/**
 * Payment Reconciliation Panel - Financial Tracking Dashboard
 *
 * **Purpose:** Sub-panel of HostDashboard providing comprehensive financial overview of quiz
 * revenue. Aggregates entry fees + fundraising extras by payment method, shows paid/unpaid
 * players, and calculates totals for end-of-quiz reconciliation.
 *
 * **Key Features:**
 * 1. **Entry Fee Tracking**: Total expected vs. received entry fees
 * 2. **Extras Revenue**: Aggregate fundraising extras income
 * 3. **Payment Method Breakdown**: Cash vs. Revolut vs. Other split
 * 4. **Percentage Analysis**: Each method's % of total revenue
 * 5. **Unpaid Player List**: Red-flagged players who haven't paid entry
 *
 * **Financial Calculations:**
 *
 * **Entry Fees:**
 * ```
 * Expected Entry = entryFee × totalPlayers
 * Received Entry = entryFee × paidPlayers.length
 * Outstanding = Expected - Received
 * ```
 *
 * **Example:**
 * - Entry fee: €10
 * - Total players: 20
 * - Paid players: 18
 * - Expected: €200
 * - Received: €180
 * - Outstanding: €20 (2 unpaid)
 *
 * **Extras Revenue:**
 * ```
 * For each player:
 *   For each player.extraPayments entry:
 *     Add amount to paymentMethod total
 * ```
 *
 * **Example:**
 * - Player1 bought buyHint (cash, €1.50)
 * - Player2 bought extraTime (revolut, €0.75)
 * - Player3 bought buyHint × 2 (cash, €3.00)
 * - Total extras: €5.25
 * - Cash extras: €4.50
 * - Revolut extras: €0.75
 *
 * **Payment Data Structure:**
 * ```typescript
 * paymentData: {
 *   cash: { entry: 90, extras: 4.50, total: 94.50 },
 *   revolut: { entry: 90, extras: 0.75, total: 90.75 },
 *   unknown: { entry: 0, extras: 0, total: 0 }
 * }
 * ```
 *
 * **Aggregation Algorithm:**
 * ```
 * 1. Initialize paymentData = {}
 * 2. For each player:
 *    a. If paid entry → Add entryFee to paymentData[player.paymentMethod].entry
 *    b. For each extraPayment:
 *       - Add amount to paymentData[extraPayment.method].extras
 * 3. Calculate totals: entry + extras per method
 * ```
 *
 * **Table Breakdown Display:**
 * 5-column table:
 * - **Payment Method**: cash/revolut/web3/unknown (capitalized)
 * - **Entry Fees**: Entry fee revenue for this method
 * - **Extras**: Fundraising extras revenue for this method
 * - **Total**: Entry + Extras for this method
 * - **% of Total**: Percentage of grand total revenue
 *
 * **Example Table:**
 * ```
 * | Method   | Entry Fees | Extras | Total   | % of Total |
 * |----------|-----------|--------|---------|------------|
 * | Cash     | €90.00    | €4.50  | €94.50  | 51.2%      |
 * | Revolut  | €90.00    | €0.75  | €90.75  | 48.8%      |
 * | Total    | €180.00   | €5.25  | €185.25 | 100%       |
 * ```
 *
 * **Summary Metrics (Grid Display):**
 * - **Entry Fee**: €10 (or "Free")
 * - **Total Players**: 20
 * - **Expected Entry**: €200.00
 * - **Received Entry**: €180.00
 * - **Received Extras**: €5.25
 * - **Total Received**: €185.25 (bold)
 *
 * **Unpaid Players Section:**
 * Red-flagged list showing:
 * - Player names who have `paid: false`
 * - If all paid: Green "[COMPLETE] All players are paid. Ready to go!"
 * - Used by host to chase outstanding payments
 *
 * **Use Cases:**
 *
 * **1. Pre-Quiz Check:**
 * - Verify all players paid before starting
 * - Chase unpaid players (call/message)
 * - Decide whether to let unpaid players join
 *
 * **2. During Quiz:**
 * - Track extras purchases as they happen
 * - Monitor fundraising extras revenue in real-time
 * - Verify payment methods match expectations
 *
 * **3. Post-Quiz Reconciliation:**
 * - Final count of all revenue
 * - Split by payment method for cash drawer reconciliation
 * - Generate final financial report
 * - Calculate charity donation amount
 *
 * **Integration with Other Panels:**
 *
 * **PlayerListPanel:**
 * - Sets `player.paid` (entry fee payment status)
 * - Sets `player.paymentMethod` (cash/revolut/web3/unknown)
 *
 * **FundraisingExtrasPanel:**
 * - Adds `player.extraPayments` (extras purchases)
 * - Format: `{ extraKey: { method: 'cash', amount: 1.50 } }`
 *
 * **Currency Handling:**
 * Uses `config.currencySymbol` (default '€'):
 * - Set in StepPaymentMethod
 * - Applied to all monetary displays
 * - Consistent across all panels
 *
 * **Web2 vs. Web3:**
 * - **Web2**: All data manually entered by host (honor system)
 * - **Web3**: Entry fees auto-verified on-chain, extras still manual (future: on-chain extras)
 *
 * **Zero Cases:**
 * - **Free entry** (entryFee = 0): Shows "Free", expected = €0.00
 * - **No extras**: Shows €0.00 for extras column
 * - **No payments yet**: Empty table, all zeros
 *
 * **Percentage Calculation:**
 * ```typescript
 * percentage = (methodTotal / grandTotal) × 100
 * // Rounded to 1 decimal place
 * // Shows "—" if grandTotal is 0 (avoid division by zero)
 * ```
 *
 * **Integration:**
 * - Parent: HostDashboard (4th panel)
 * - State: usePlayerStore (players array), useQuizConfig (entry fee, currency)
 * - Related: PlayerListPanel (entry payment tracking)
 * - Related: FundraisingExtrasPanel (extras payment tracking)
 *
 * **Future Enhancements:**
 * - Export to CSV/Excel for accounting
 * - Email financial report to host
 * - Print receipt for each player
 * - Charity donation calculator (after platform/host fees)
 * - Real-time updates during quiz (WebSocket sync)
 * - Payment gateway integration (Stripe/PayPal)
 * - Refund tracking (if player cancels)
 *
 * @component
 * @category Quiz Dashboard
 */

import React from 'react';
import { usePlayerStore } from '../../../stores/quizPlayerStore';
import { useQuizConfig } from '../useQuizConfig';

const PaymentReconciliationPanel: React.FC = () => {
  const { players } = usePlayerStore();
  const { config } = useQuizConfig();

  const currency = config.currencySymbol || '€';
  const entryFee = parseFloat(config.entryFee || '0');
  const isWeb3 = config.paymentMethod === 'web3';

  const paidPlayers = players.filter((p) => p.paid);
  const unpaidPlayers = players.filter((p) => !p.paid);
  const totalPlayers = players.length;

  const extrasEnabled = config.fundraisingOptions || {};
  const extrasPrices = config.fundraisingPrices || {};

  // Build per-method totals
  const paymentData: Record<
    string,
    { entry: number; extras: number; total: number }
  > = {};

  for (const player of players) {
    const method = player.paymentMethod || 'unknown';

    if (player.paid) {
      if (!paymentData[method]) {
        paymentData[method] = { entry: 0, extras: 0, total: 0 };
      }
      paymentData[method].entry += entryFee;
    }

    if (player.extraPayments) {
      for (const [, val] of Object.entries(player.extraPayments)) {
        const extraMethod = val.method || 'unknown';
        const amount = val.amount || 0;

        if (!paymentData[extraMethod]) {
          paymentData[extraMethod] = { entry: 0, extras: 0, total: 0 };
        }

        paymentData[extraMethod].extras += amount;
      }
    }
  }

  // Finalize totals per method
  for (const method in paymentData) {
    const data = paymentData[method];
    data.total = data.entry + data.extras;
  }

  // Calculate global totals
  const totalEntryReceived = paidPlayers.length * entryFee;
  const totalExtrasReceived = Object.values(paymentData).reduce(
    (sum, val) => sum + val.extras,
    0
  );
  const totalReceived = totalEntryReceived + totalExtrasReceived;

  return (
    <div className="bg-white p-8 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        [MONEY] Payment Reconciliation
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-600 mb-6">
        <div>
          <strong>Entry Fee:</strong> {entryFee ? `${currency}${entryFee}` : 'Free'}
        </div>
        <div>
          <strong>Total Players:</strong> {totalPlayers}
        </div>
        <div>
          <strong>Expected Entry:</strong> {currency}
          {(entryFee * totalPlayers).toFixed(2)}
        </div>
        <div>
          <strong>Received Entry:</strong> {currency}
          {totalEntryReceived.toFixed(2)}
        </div>
        <div>
          <strong>Received Extras:</strong> {currency}
          {totalExtrasReceived.toFixed(2)}
        </div>
        <div className="font-semibold text-gray-800">
          <strong>Total Received:</strong> {currency}
          {totalReceived.toFixed(2)}
        </div>
      </div>

      {/* Table Breakdown */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-2">
          Breakdown by Payment Method:
        </h3>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm text-gray-700 border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">Payment Method</th>
                <th className="px-4 py-2 border">Entry Fees</th>
                <th className="px-4 py-2 border">Extras</th>
                <th className="px-4 py-2 border">Total</th>
                <th className="px-4 py-2 border">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(paymentData).map(([method, data]) => (
                <tr key={method}>
                  <td className="px-4 py-2 border capitalize">{method}</td>
                  <td className="px-4 py-2 border">
                    {currency}
                    {data.entry.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 border">
                    {currency}
                    {data.extras.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 border">
                    {currency}
                    {data.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 border">
                    {totalReceived > 0
                      ? `${((data.total / totalReceived) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-2 border">Total</td>
                <td className="px-4 py-2 border">{currency}{totalEntryReceived.toFixed(2)}</td>
                <td className="px-4 py-2 border">{currency}{totalExtrasReceived.toFixed(2)}</td>
                <td className="px-4 py-2 border">{currency}{totalReceived.toFixed(2)}</td>
                <td className="px-4 py-2 border">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Unpaid Players */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">
           Unpaid Players (Entry):
        </h3>
        {unpaidPlayers.length === 0 ? (
          <p className="text-green-700">All players are paid. Ready to go! [COMPLETE]</p>
        ) : (
          <ul className="list-disc list-inside text-red-600 space-y-1">
            {unpaidPlayers.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PaymentReconciliationPanel;



