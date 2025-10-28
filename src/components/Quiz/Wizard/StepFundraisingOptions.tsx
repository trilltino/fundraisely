/**
 * Step Fundraising Options - Configurable Game Enhancements for Revenue
 *
 * **Purpose:** Step 4 of quiz wizard. Allows hosts to enable optional paid features that
 * players can purchase during the quiz (buy hints, extra time, etc.). Each enabled feature
 * has a custom price set by the host, generating additional revenue for charity.
 *
 * **Fundraising Extras System:**
 * Quiz types define which extras are available. Common extras include:
 * - **buyHint**: Reveal correct answer for a question (maxPerPlayer: 3, usagePhase: "during_question")
 * - **extraTime**: Add 10 seconds to timer (maxPerPlayer: 5, usagePhase: "before_timeout")
 * - **skipQuestion**: Skip question without penalty (maxPerPlayer: 2, usagePhase: "during_question")
 * - **50-50**: Eliminate 2 wrong answers (maxPerPlayer: 3, usagePhase: "during_question")
 * - **askAudience**: Show aggregated player votes (maxPerPlayer: 1, usagePhase: "during_question")
 *
 * **Configuration Flow:**
 * ```
 * Quiz type selected in Step 2
 *   ↓
 * quizGameTypes.find(type).fundraisingOptions → Available extras for this quiz type
 *   ↓
 * Host toggles extras on/off (checkbox)
 *   ↓
 * Host sets price for each enabled extra (number input)
 *   ↓
 * Saved to config.fundraisingOptions (boolean map) + config.fundraisingPrices (price map)
 * ```
 *
 * **Pricing Strategy:**
 * - **Web2 (cash)**: Prices set in local currency (€, $, £) configured in StepPaymentMethod
 * - **Web3 (blockchain)**: Prices interpreted as token units (USDC, SOL) on-chain
 * - **Recommendation**: Low prices (€0.50-€2.00) to encourage usage and maximize charity donations
 *
 * **Data Structure Example:**
 * ```typescript
 * // User selects "buyHint" and "extraTime", sets prices
 * updateConfig({
 *   fundraisingOptions: {
 *     buyHint: true,
 *     extraTime: true,
 *     skipQuestion: false,
 *   },
 *   fundraisingPrices: {
 *     buyHint: 1.50,  // €1.50 or 1.50 USDC
 *     extraTime: 0.75, // €0.75 or 0.75 USDC
 *   }
 * });
 * ```
 *
 * **Validation Rules:**
 * - Prices must be non-negative numbers (≥0)
 * - Only enabled extras need valid prices
 * - Disabled extras ignored (no price validation)
 * - Empty price fields for enabled extras → Error: "Please enter a valid price for {option}"
 *
 * **Usage Phase Metadata:**
 * Each extra has `usagePhase` defining when players can purchase:
 * - `"during_question"`: Available while question is displayed
 * - `"before_timeout"`: Available before timer expires
 * - `"between_rounds"`: Available in break between rounds
 *
 * **Max Per Player Enforcement:**
 * `maxPerPlayer` limits how many times a player can buy each extra:
 * - Tracked client-side in player state
 * - Server validates purchase count on socket events
 * - Example: buyHint max=3 → Player can buy hint at most 3 times per quiz
 *
 * **UI Interaction:**
 * - **Toggle extras**: Click checkbox or card to enable/disable
 * - **Set price**: Number input appears when extra enabled
 * - **Visual feedback**: Enabled cards highlighted with indigo border + background
 * - **Metadata display**: Shows `(Max: 3, Use: during_question)` for each extra
 *
 * **State Management:**
 * - Local: `selectedOptions` (boolean map), `priceInputs` (string map for controlled inputs), `error`
 * - Global: Saves to `useQuizConfig.config.{fundraisingOptions, fundraisingPrices}`
 *
 * **Integration:**
 * - Parent: QuizWizard (Step 4 of 8)
 * - Previous: StepPaymentMethod (sets currency)
 * - Next: StepPrizes (prize distribution)
 * - Data source: `quiztypeconstants.ts` (defines available extras per quiz type)
 * - Used by: HostDashboard (displays enabled extras), PlayerClient (purchase UI)
 *
 * **Revenue Flow:**
 * ```
 * Player buys hint for €1.50
 *   ↓
 * Payment added to prize pool (Web3) OR tracked in payment reconciliation (Web2)
 *   ↓
 * At game end: Prize pool + extras revenue distributed per StepPrizes config
 *   ↓
 * Charity receives their % of (entry fees + extras revenue)
 * ```
 *
 * **Fallback Behavior:**
 * If no quiz type selected (should never happen due to wizard flow):
 * - Display error: "Something went wrong. Please go back and choose a quiz type again."
 * - Provide "Back" button to return to StepGameType
 *
 * @component
 * @category Quiz Wizard
 */

import { useState, type FC } from 'react';
import type { FormEvent } from 'react';
import { quizGameTypes } from '../../../constants/quiztypeconstants';
import { useQuizConfig } from './../useQuizConfig';
import type { WizardStepProps } from './WizardStepProps';
import { AlertCircle, CheckCircle } from 'lucide-react';

const StepFundraisingOptions: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { config, updateConfig } = useQuizConfig();
  const [error, setError] = useState('');

  const selectedType = quizGameTypes.find((t) => t.id === config.gameType);
  const allowedOptions = Object.entries(selectedType?.fundraisingOptions || {});
  const initialOptions = config.fundraisingOptions || {};
  const initialPrices = config.fundraisingPrices || {};
  const currencySymbol = config.currencySymbol || '€';

  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>(
    () =>
      allowedOptions.reduce((acc, [opt]) => {
        acc[opt] = initialOptions[opt] ?? false;
        return acc;
      }, {} as Record<string, boolean>)
  );

  const [priceInputs, setPriceInputs] = useState<Record<string, string>>(
    () =>
      allowedOptions.reduce((acc, [opt]) => {
        acc[opt] = initialPrices[opt]?.toString() || '';
        return acc;
      }, {} as Record<string, string>)
  );

  if (!selectedType) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        <p>Something went wrong. Please go back and choose a quiz type again.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-4 rounded-lg text-sm"
        >
          Back
        </button>
      </div>
    );
  }

  const handleToggle = (option: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const prices: Record<string, number> = {};
    for (const [key, value] of Object.entries(priceInputs)) {
      if (selectedOptions[key]) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && parsed >= 0) {
          prices[key] = parsed;
        } else {
          setError(`Please enter a valid price for "${key}".`);
          return;
        }
      }
    }

    setError('');
    updateConfig({
      fundraisingOptions: selectedOptions,
      fundraisingPrices: prices,
    });

    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-indigo-800">Step 4 of 7: Fundraising Options</h2>
      <p className="text-sm text-gray-600 mb-2">
        Select the fundraising extras you'd like to enable and set a donation amount for each.
      </p>

      <div className="grid gap-5">
        {allowedOptions.map(([option, meta]) => (
          <div key={option} className="space-y-1">
            <label
              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition ${
                selectedOptions[option]
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedOptions[option]}
                onChange={() => handleToggle(option)}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {selectedOptions[option] ? (
                  <CheckCircle className="h-5 w-5 text-indigo-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border border-gray-300" />
                )}
                <span className="capitalize text-gray-800">
                  {option.replace(/([A-Z])/g, ' $1')}
                  <span className="text-xs text-gray-500 ml-2">
                    (Max: {meta.maxPerPlayer}, Use: {meta.usagePhase})
                  </span>
                </span>
              </div>
            </label>

            {selectedOptions[option] && (
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder={`Set price (e.g. ${currencySymbol}2)`}
                value={priceInputs[option]}
                onChange={(e) =>
                  setPriceInputs((prev) => ({
                    ...prev,
                    [option]: e.target.value,
                  }))
                }
                className="mt-2 w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500"
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-5 rounded-xl transition"
          >
            Back
          </button>
        )}
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-xl transition"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default StepFundraisingOptions;


