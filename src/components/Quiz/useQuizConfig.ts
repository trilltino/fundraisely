/**
 * Quiz Configuration Store
 *
 * **Purpose:**
 * Zustand store managing the complete Quiz configuration as the user progresses through the
 * creation wizard. Accumulates settings from each wizard step (host info, game type, payment
 * method, prizes, etc.) into a single QuizConfig object that's eventually deployed to the
 * blockchain or sent to the WebSocket server.
 *
 * **Role in Application:**
 * - **Central State Repository**: Single source of truth for quiz configuration during creation
 * - **Wizard State Persistence**: Retains settings as user navigates between wizard steps
 * - **Blockchain Deployment Prep**: Serializes config for Solana smart contract deployment
 * - **Room Verification**: Provides config for players to verify before joining
 *
 * **State Lifecycle:**
 * ```
 * 1. User visits /create-quiz → useQuizConfig initialized (empty config: {})
 * 2. StepHostInfo → updateConfig({ hostName: 'John' })
 * 3. StepGameType → updateConfig({ gameType: 'pub_quiz', roundCount: 5 })
 * 4. StepPaymentMethod → updateConfig({ paymentMethod: 'web3', entryFee: '10' })
 * 5. StepFundraisingOptions → updateConfig({ fundraisingOptions: { buyHint: true } })
 * 6. StepPrizes → updateConfig({ prizeMode: 'split', prizeSplits: { 1: 60, 2: 40 } })
 * 7. StepRoundSettings → updateConfig({ timePerQuestion: 30 })
 * 8. StepSchedule → updateConfig({ startTime: '2024-12-01T19:00' })
 * 9. StepReviewLaunch → Reads full config, deploys to Solana, creates room
 * 10. After deployment → resetConfig() (clean slate for next quiz)
 * ```
 *
 * **Store Structure:**
 * ```typescript
 * interface QuizState {
 *   config: Partial<QuizConfig>;           // Accumulated quiz configuration
 *   updateConfig: (updates) => void;        // Merge updates into config
 *   resetConfig: () => void;                // Clear config (post-deployment)
 * }
 * ```
 *
 * **Deep Merge Strategy:**
 * `updateConfig()` performs shallow merge at top level, but **deep merge** for nested objects:
 * - `fundraisingOptions`: Merges individual boolean flags (buyHint, extraTime, etc.)
 * - `fundraisingPrices`: Merges individual price values
 *
 * **Example:**
 * ```typescript
 * // Step 1: Enable buyHint
 * updateConfig({ fundraisingOptions: { buyHint: true } });
 * // config.fundraisingOptions = { buyHint: true }
 *
 * // Step 2: Enable extraTime (doesn't overwrite buyHint)
 * updateConfig({ fundraisingOptions: { extraTime: true } });
 * // config.fundraisingOptions = { buyHint: true, extraTime: true } ✅
 *
 * // If we used shallow merge:
 * // config.fundraisingOptions = { extraTime: true } ❌ (buyHint lost!)
 * ```
 *
 * **Why Zustand (not React Context):**
 * - ✅ No re-renders for components that don't use config
 * - ✅ Simpler API (no Provider wrapper needed)
 * - ✅ DevTools support for debugging
 * - ✅ Persist to localStorage easily (future: persist middleware)
 * - ✅ TypeScript-friendly with minimal boilerplate
 *
 * **Usage in Wizard Steps:**
 * ```typescript
 * import { useQuizConfig } from '../useQuizConfig';
 *
 * function StepPaymentMethod({ onNext }: WizardStepProps) {
 *   const { config, updateConfig } = useQuizConfig();
 *   const [entryFee, setEntryFee] = useState(config.entryFee || '');
 *
 *   const handleSubmit = () => {
 *     updateConfig({ entryFee, paymentMethod: 'web3' });
 *     onNext();
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 *
 * **Usage in Review/Launch:**
 * ```typescript
 * function StepReviewLaunch() {
 *   const { config, resetConfig } = useQuizConfig();
 *   const { deploy } = useContractActions();
 *
 *   const handleDeploy = async () => {
 *     // Deploy config to Solana
 *     const result = await deploy({
 *       roomId: config.roomId,
 *       entryFee: config.entryFee,
 *       charityAddress: config.web3CharityAddress,
 *       // ... all other config fields
 *     });
 *
 *     if (result.success) {
 *       resetConfig(); // Clear for next quiz
 *       navigate(`/quiz/${config.roomId}`);
 *     }
 *   };
 * }
 * ```
 *
 * **Config Validation:**
 * This store does NOT validate config (validation happens in each wizard step).
 * By the time user reaches StepReviewLaunch, config is assumed complete and valid.
 *
 * **Persistence:**
 * Currently in-memory only (resets on page refresh). Future enhancement:
 * ```typescript
 * import { persist } from 'zustand/middleware';
 *
 * export const useQuizConfig = create<QuizState>()(
 *   persist(
 *     (set) => ({ ... }),
 *     { name: 'quiz-config-draft' } // Save to localStorage
 *   )
 * );
 * ```
 *
 * **vs. Alternative State Solutions:**
 *
 * **Approach 1: useState in QuizWizard parent**
 * ```typescript
 * const [config, setConfig] = useState({}); // ❌ Prop drilling to all steps
 * ```
 *
 * **Approach 2: React Context**
 * ```typescript
 * <QuizConfigContext.Provider value={config}> // ❌ Causes re-renders, verbose
 * ```
 *
 * **This approach (Zustand):**
 * ```typescript
 * const { config, updateConfig } = useQuizConfig(); // ✅ Simple, performant
 * ```
 *
 * @module components/Quiz
 * @category State Management
 */

import { create } from 'zustand';
import type { QuizConfig } from '../../types/quiz';

interface QuizState {
  config: Partial<QuizConfig>;
  updateConfig: (updates: Partial<QuizConfig>) => void;
  resetConfig: () => void;
}

export const useQuizConfig = create<QuizState>((set) => ({
  config: {},

  updateConfig: (updates) =>
    set((state) => ({
      config: {
        ...state.config,
        ...updates,
        fundraisingOptions: {
          ...state.config.fundraisingOptions,
          ...updates.fundraisingOptions,
        },
        fundraisingPrices: {
          ...state.config.fundraisingPrices,
          ...updates.fundraisingPrices,
        },
      },
    })),

  resetConfig: () => set({ config: {} }),


}));
