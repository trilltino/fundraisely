/**
 * Step Round Settings - Quiz Timing and Question Configuration
 *
 * **Purpose:** Step 6 of quiz wizard. Configures core gameplay parameters including number
 * of questions per round, time limits per question, and total round duration (for speed rounds).
 * Settings auto-populate with quiz type defaults but can be customized.
 *
 * **Configurable Parameters:**
 * 1. **questionsPerRound**: How many questions in each round
 *    - Range: 1-20 questions
 *    - Default: 5 (varies by quiz type)
 *    - Used by: Host dashboard to generate/validate question sets
 *
 * 2. **timePerQuestion**: Seconds allowed to answer each question
 *    - Range: 5-180 seconds
 *    - Default: 30 seconds (varies by quiz type)
 *    - Used by: Client-side countdown timer, answer deadline enforcement
 *
 * 3. **totalTimeSeconds**: Total time for entire round (Speed Round only)
 *    - Range: 30-600 seconds
 *    - Default: 120 seconds
 *    - Only shown if `config.gameType === 'speed_round'`
 *    - Used by: Speed round mode to enforce overall time limit
 *
 * **Quiz Type Defaults:**
 * Each quiz type has pre-configured timing in `quiztypeconstants.ts`:
 * ```typescript
 * // Example defaults:
 * pubQuiz: { questionsPerRound: 10, timePerQuestion: 45 }
 * speedQuiz: { questionsPerRound: 5, timePerQuestion: 15, totalTimeSeconds: 120 }
 * trivianight: { questionsPerRound: 8, timePerQuestion: 30 }
 * ```
 *
 * **Reset to Defaults:**
 * "Reset to defaults for this quiz type" button restores:
 * - `questionsPerRound` → `selectedDefaults.questionsPerRound ?? 5`
 * - `timePerQuestion` → `selectedDefaults.timePerQuestion ?? 30`
 * - `totalTimeSeconds` → `120` (if speed round)
 *
 * **Timing Strategy Examples:**
 *
 * **Pub Quiz (Casual):**
 * - 10 questions per round
 * - 45 seconds per question
 * - Total round: ~7.5 minutes
 * - Strategy: Allows discussion, team collaboration
 *
 * **Speed Round (Fast-paced):**
 * - 5 questions per round
 * - 15 seconds per question
 * - Total round limit: 120 seconds (2 minutes)
 * - Strategy: Rapid-fire, no time to overthink
 *
 * **Trivia Night (Balanced):**
 * - 8 questions per round
 * - 30 seconds per question
 * - Total round: ~4 minutes
 * - Strategy: Standard quiz show format
 *
 * **Validation:**
 * No explicit validation errors displayed (HTML5 min/max enforced by browser):
 * - `questionsPerRound`: Must be 1-20
 * - `timePerQuestion`: Must be 5-180
 * - `totalTimeSeconds`: Must be 30-600
 *
 * **State Management:**
 * - Local: `questionsPerRound`, `timePerQuestion`, `totalTimeSeconds` (controlled inputs)
 * - Global: Saves to `useQuizConfig.config.{questionsPerRound, timePerQuestion, totalTimeSeconds}`
 *
 * **Integration:**
 * - Parent: QuizWizard (Step 6 of 8)
 * - Previous: StepPrizes (prize configuration)
 * - Next: StepSchedule (start time)
 * - Data source: `quiztypeconstants.ts` (default values per quiz type)
 * - Used by: HostDashboard (displays timing), Client countdown timers, Server validation
 *
 * **Speed Round Special Behavior:**
 * When `config.gameType === 'speed_round'`:
 * - Additional input field: "Total time for round (in seconds)"
 * - Used to enforce hard time limit on entire round (even if not all questions answered)
 * - Example: 5 questions × 15s = 75s max, but round ends at 120s regardless
 *
 * **Usage in Game Flow:**
 * ```
 * Round starts
 *   ↓
 * For each question (1 to questionsPerRound):
 *   - Display question
 *   - Start timer: timePerQuestion seconds
 *   - Wait for answers or timeout
 *   - Show correct answer + leaderboard
 *   ↓
 * Round complete
 *   ↓
 * (Speed Round: Also check totalTimeSeconds limit)
 * ```
 *
 * **Future Enhancements:**
 * - Per-round timing: Different time limits for different rounds
 * - Bonus round mode: Double time for final round
 * - Dynamic timing: Increase time if many players struggling
 *
 * @component
 * @category Quiz Wizard
 */

import { FC, useState } from 'react';
import type { WizardStepProps } from './WizardStepProps';
import { useQuizConfig } from '../useQuizConfig';
import { quizGameTypes } from '../../../constants/quiztypeconstants';

const StepRoundSettings: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { config, updateConfig } = useQuizConfig();
  const selectedDefaults = quizGameTypes.find((t) => t.id === config.gameType)?.defaultConfig;

  const [questionsPerRound, setQuestionsPerRound] = useState(config.questionsPerRound ?? 5);
  const [timePerQuestion, setTimePerQuestion] = useState(
    config.timePerQuestion ?? selectedDefaults?.timePerQuestion ?? 30
  );
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(config.totalTimeSeconds ?? 120);

  const isSpeedRound = config.gameType === 'speed_round';

  const handleResetDefaults = () => {
    setQuestionsPerRound(selectedDefaults?.questionsPerRound ?? 5);
    setTimePerQuestion(selectedDefaults?.timePerQuestion ?? 30);
    if (isSpeedRound) {
      setTotalTimeSeconds(120); // default
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      questionsPerRound,
      timePerQuestion,
      ...(isSpeedRound && { totalTimeSeconds }),
    });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-indigo-800">Step 6 of 7: Customize Rounds</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">
            How many questions per round?
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={questionsPerRound}
            onChange={(e) => setQuestionsPerRound(Number(e.target.value))}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Time per question (in seconds)
          </label>
          <input
            type="number"
            min={5}
            max={180}
            value={timePerQuestion}
            onChange={(e) => setTimePerQuestion(Number(e.target.value))}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
          />
        </div>

        {isSpeedRound && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Total time for round (in seconds)
            </label>
            <input
              type="number"
              min={30}
              max={600}
              value={totalTimeSeconds}
              onChange={(e) => setTotalTimeSeconds(Number(e.target.value))}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleResetDefaults}
          className="text-sm text-indigo-600 hover:underline"
        >
          Reset to defaults for this quiz type
        </button>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-5 rounded-xl"
        >
          Back
        </button>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-5 rounded-xl"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default StepRoundSettings;

