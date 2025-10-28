/**
 * Quiz Wizard Step Props Interface
 *
 * **Purpose:**
 * Defines the standardized prop interface for all wizard step components in the Quiz creation flow.
 * Ensures consistent navigation API across all 8 wizard steps (host, type, payment, fundraising,
 * prizes, rounds, schedule, review).
 *
 * **Role in Wizard Architecture:**
 * - Enforces uniform navigation callbacks across all wizard steps
 * - Enables parent QuizWizard component to control step transitions
 * - Provides type safety for step component implementations
 * - Simplifies adding new wizard steps (just implement this interface)
 *
 * **Navigation Flow:**
 * ```
 * QuizWizard (parent)
 *    ├─ Step 1: StepHostInfo       → onNext() only
 *    ├─ Step 2: StepGameType       → onNext(), onBack()
 *    ├─ Step 3: StepPaymentMethod  → onNext(), onBack()
 *    ├─ Step 4: StepFundraisingOptions → onNext(), onBack()
 *    ├─ Step 5: StepPrizes         → onNext(), onBack()
 *    ├─ Step 6: StepRoundSettings  → onNext(), onBack()
 *    ├─ Step 7: StepSchedule       → onNext(), onBack()
 *    └─ Step 8: StepReviewLaunch   → onBack() only (no onNext, deploys contract)
 * ```
 *
 * **Props:**
 * - `onNext`: Callback to advance to next wizard step
 *   - Called after: Form validation passes, config saved to useQuizConfig
 *   - Triggers: Parent increments currentStepIndex, renders next step
 *   - Usage: Submit button onClick
 *
 * - `onBack`: (Optional) Callback to return to previous wizard step
 *   - Called: Back button onClick
 *   - Triggers: Parent decrements currentStepIndex, renders previous step
 *   - Optional: First step (StepHostInfo) doesn't need back button
 *
 * **Implementation Pattern:**
 * ```typescript
 * import type { WizardStepProps } from './WizardStepProps';
 *
 * const StepExample: FC<WizardStepProps> = ({ onNext, onBack }) => {
 *   const { config, updateConfig } = useQuizConfig();
 *   const [localState, setLocalState] = useState('');
 *
 *   const handleSubmit = (e: FormEvent) => {
 *     e.preventDefault();
 *
 *     // Validate form
 *     if (!localState) {
 *       setError('Field required');
 *       return;
 *     }
 *
 *     // Save to global config
 *     updateConfig({ someField: localState });
 *
 *     // Advance to next step
 *     onNext();
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input value={localState} onChange={(e) => setLocalState(e.target.value)} />
 *       <button type="button" onClick={onBack}>Back</button>
 *       <button type="submit">Next</button>
 *     </form>
 *   );
 * };
 * ```
 *
 * **Why This Pattern:**
 * - **Separation of Concerns**: Steps handle UI/validation, parent handles navigation
 * - **Reusability**: Same interface for all wizard steps
 * - **Type Safety**: TypeScript enforces onNext/onBack presence
 * - **Testability**: Mock onNext/onBack in tests to verify navigation
 * - **Flexibility**: Easy to add conditional navigation (skip steps, branching)
 *
 * **State Management:**
 * Steps don't manage wizard navigation state. They only:
 * 1. Render form UI based on current config (from useQuizConfig)
 * 2. Validate user input locally
 * 3. Update global config via updateConfig()
 * 4. Call onNext() when ready to advance
 *
 * Parent (QuizWizard) manages:
 * - currentStepIndex state
 * - Which step to render
 * - Step progression logic
 * - URL routing (optional)
 *
 * **vs. Alternative Approaches:**
 *
 * **Alternative 1: Shared wizard context**
 * ```typescript
 * const { goNext, goBack } = useWizardContext(); // ❌ More complex
 * ```
 * **This approach (props):**
 * ```typescript
 * const StepExample: FC<WizardStepProps> = ({ onNext, onBack }) => // ✅ Simple, explicit
 * ```
 *
 * **Alternative 2: Direct state mutation**
 * ```typescript
 * setCurrentStep(prev => prev + 1); // ❌ Couples steps to parent state
 * ```
 * **This approach (callbacks):**
 * ```typescript
 * onNext(); // ✅ Decoupled, parent controls navigation
 * ```
 *
 * @module components/Quiz/Wizard
 * @category Type Definitions
 */

export interface WizardStepProps {
    onNext: () => void;
    onBack?: () => void;
  }
  