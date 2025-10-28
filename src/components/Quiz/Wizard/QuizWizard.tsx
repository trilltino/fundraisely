/**
 * Quiz Wizard - Multi-Step Quiz Creation Form
 *
 * **Purpose:**
 * Orchestrates the 8-step wizard flow for creating a fundraising quiz. Manages step navigation,
 * progress tracking, and renders the appropriate step component based on current index. Acts as
 * the parent container coordinating all wizard steps via callbacks.
 *
 * **8-Step Wizard Flow:**
 * ```
 * Step 1: Host Info       → Collect host name
 * Step 2: Game Type       → Select quiz type (Pub Quiz, Speed Quiz, etc.)
 * Step 3: Payment Method  → Web2 (cash) or Web3 (Solana blockchain)
 * Step 4: Fundraising     → Enable/price fundraising extras (buyHint, extraTime, etc.)
 * Step 5: Prizes          → Prize mode (pool split or assets) + distribution
 * Step 6: Round Settings  → Rounds, questions per round, time per question
 * Step 7: Schedule        → Start time (immediate or scheduled)
 * Step 8: Review & Launch → Review config, deploy to Solana, create room
 * ```
 *
 * **Role in Application:**
 * - **Navigation Controller**: Manages currentStepIndex state and step transitions
 * - **Step Orchestrator**: Renders correct step component with navigation callbacks
 * - **Progress Indicator**: Shows "Step X of 8" to user
 * - **UX Coordinator**: Smooth scrolling to top on step change
 *
 * **State Management:**
 * - **Local State (this component)**: currentStepIndex (which step is visible)
 * - **Global State (useQuizConfig)**: Accumulated quiz configuration from all steps
 * - **Step Components**: Local validation state + form inputs
 *
 * **Navigation Pattern:**
 * ```typescript
 * // User completes Step 3 (Payment Method)
 * StepPaymentMethod validates → updateConfig({ entryFee: '10' }) → onNext()
 *   ↓
 * QuizWizard.goNext() → setCurrentStepIndex(3 → 4) → window.scrollTo(0)
 *   ↓
 * Re-render with Step 4 (Fundraising Options)
 * ```
 *
 * **Step Routing Logic:**
 * Uses switch/case pattern instead of array-based routing for:
 * - Type safety (TypeScript catches missing steps)
 * - Explicit step order (readable, intentional)
 * - Easy to add conditional steps (future: skip steps based on config)
 *
 * **Scroll Behavior:**
 * `window.scrollTo({ top: 0, behavior: 'smooth' })` on every step change ensures:
 * - User sees new step content immediately (not mid-scroll)
 * - Consistent UX (same position for every step)
 * - Mobile-friendly (long forms don't confuse users)
 *
 * **Why Not React Router for Steps:**
 * - ✅ Simpler: No URL params, no route config, just useState
 * - ✅ State persists: Back button doesn't lose progress (stays in wizard)
 * - ✅ Validation: Can't skip to step 8 without completing 1-7
 * - ❌ Not shareable: Can't link directly to "Step 5" (intentional - must start at Step 1)
 *
 * **Alternative with React Router:**
 * ```typescript
 * // ❌ More complex, allows skipping steps
 * <Route path="/create-quiz/step/:stepNumber" element={<DynamicStep />} />
 * ```
 *
 * **This approach:**
 * ```typescript
 * // ✅ Simple, enforces linear progression
 * const [currentStepIndex, setCurrentStepIndex] = useState(0);
 * ```
 *
 * **Progress Tracking:**
 * Shows "Step X of 8" to set user expectations:
 * - Reduces abandonment (users know how many steps remain)
 * - Improves UX (clear progress indication)
 * - Encourages completion (psychological commitment)
 *
 * **Future Enhancements:**
 * - Add step validation checkmarks (✓ completed steps)
 * - Add "Save Draft" button (persist to localStorage)
 * - Add stepper UI (clickable step indicators for completed steps)
 * - Add conditional step skipping (e.g., skip prizes step if cash-only)
 * - Add URL persistence (bookmark current step, but still validate progression)
 *
 * **Usage:**
 * ```typescript
 * import QuizWizard from '@/components/Quiz/Wizard/QuizWizard';
 *
 * function CreateQuizPage() {
 *   return (
 *     <div>
 *       <QuizWizard />
 *     </div>
 *   );
 * }
 * ```
 *
 * **Integration with useQuizConfig:**
 * ```
 * QuizWizard (navigation only)
 *    ↓
 * StepPaymentMethod (validates + saves)
 *    ↓
 * useQuizConfig.updateConfig({ entryFee: '10', paymentMethod: 'web3' })
 *    ↓
 * StepReviewLaunch (reads full config)
 *    ↓
 * Deploy to Solana using useQuizConfig.config
 * ```
 *
 * @module components/Quiz/Wizard
 * @category Quiz Components
 */

import { useState } from 'react';
import StepHostInfo from './StepHostInfo';
import StepGameType from './StepGameType';
import StepRoundSettings from './StepRoundSettings';
import StepFundraisingOptions from './StepFundraisingOptions';
import StepPaymentMethod from './StepPaymentMethod';
import StepReviewLaunch from './StepReviewLaunch';
import StepPrizes from './StepPrizes';
import StepSchedule from './StepSchedule';


const steps = ['host', 'type', 'payment', 'fundraising', 'stepPrizes',  'round', 'schedule', 'review'] as const;


export default function QuizWizard() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const goNext = () => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentStep = steps[currentStepIndex];

  const renderStep = () => {
    switch (currentStep) {
      case 'host':
        return <StepHostInfo onNext={goNext} />;
      case 'type':
        return <StepGameType onNext={goNext} onBack={goBack} />;
      case 'payment':
        return <StepPaymentMethod onNext={goNext} onBack={goBack} />;
        
      case 'fundraising':
        return <StepFundraisingOptions onNext={goNext} onBack={goBack} />;
      case 'stepPrizes':
        return <StepPrizes onNext={goNext} onBack={goBack} />;
      case 'round':
        return <StepRoundSettings onNext={goNext} onBack={goBack} />; 
      case 'schedule':
        return <StepSchedule onNext={goNext} onBack={goBack} />;
      case 'review':
        return <StepReviewLaunch onNext={goNext} onBack={goBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-indigo-800">Create Your Fundraising Quiz</h1>
        <p className="text-sm text-gray-600 mt-2">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">{renderStep()}</div>
    </div>
  );
}
