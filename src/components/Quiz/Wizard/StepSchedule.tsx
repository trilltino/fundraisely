/**
 * Step Schedule - Quiz Start Time Configuration
 *
 * **Purpose:** Step 7 of quiz wizard. Allows hosts to schedule when the quiz should start.
 * Used for timing reminders, room opening, and coordinating player attendance. Simple step
 * with single datetime input.
 *
 * **Key Features:**
 * - **Local time input**: Uses HTML5 `datetime-local` input (browser handles timezone conversion)
 * - **Required field**: Cannot proceed without selecting a start time
 * - **Reminder system**: Server can send notifications before quiz starts (future feature)
 * - **Room opening**: Auto-open room at scheduled time (future feature)
 *
 * **DateTime Format:**
 * Input type `datetime-local` produces ISO 8601 format without timezone:
 * ```
 * User selects: "December 25, 2025 at 7:00 PM" (in their local timezone)
 * Value stored: "2025-12-25T19:00"
 * ```
 *
 * **Timezone Handling:**
 * - **User perspective**: Always sees their local time (browser auto-adjusts)
 * - **Storage**: Saved as ISO string without explicit timezone
 * - **Server interpretation**: Should parse as UTC or store original timezone
 * - **Display to others**: Convert to each player's local timezone
 *
 * **Example Use Cases:**
 *
 * **1. Scheduled Fundraiser:**
 * - Host: "Quiz starts Friday, Dec 25, 2025 at 7:00 PM"
 * - System sends email reminders 24h and 1h before
 * - Room auto-opens 15 minutes early for player check-in
 * - Game starts automatically at scheduled time
 *
 * **2. Immediate Start:**
 * - Host: "Quiz starts now" (selects current datetime)
 * - No reminders sent
 * - Room immediately available
 * - Host manually starts when ready
 *
 * **3. Recurring Event:**
 * - Host: "Weekly trivia every Tuesday at 8:00 PM"
 * - Create new quiz each week with same start time pattern
 * - Players recognize consistent schedule
 *
 * **Validation:**
 * - **Required**: HTML5 `required` attribute prevents empty submission
 * - **No past date check**: Currently allows scheduling in past (could add validation)
 * - **No minimum advance**: Can schedule 1 minute from now (could enforce minimum lead time)
 *
 * **Future Features (Not Yet Implemented):**
 * - **Auto-start at scheduled time**: Room transitions to "active" automatically
 * - **Reminder emails**: Send notifications to registered players
 * - **Countdown display**: Show time until quiz starts on join page
 * - **Timezone display**: Show "7:00 PM EST (1:00 AM GMT)" for clarity
 * - **Recurring schedules**: "Every Tuesday at 8:00 PM" template
 *
 * **State Management:**
 * - Local: `startTime` (controlled input, ISO datetime string)
 * - Global: Saves to `useQuizConfig.config.startTime`
 *
 * **Integration:**
 * - Parent: QuizWizard (Step 7 of 8)
 * - Previous: StepRoundSettings (timing configuration)
 * - Next: StepReviewLaunch (final deployment)
 * - Used by: StepReviewLaunch (displays scheduled time in review)
 * - Future: Server cron jobs, email notification system, room opening scheduler
 *
 * **Display in Review Step:**
 * ```typescript
 * // StepReviewLaunch.tsx shows:
 * const formattedTime = new Date(config.startTime).toLocaleString();
 * // "12/25/2025, 7:00:00 PM" (user's local timezone)
 * ```
 *
 * **Storage:**
 * Saved to server when room created:
 * ```typescript
 * socket.emit('create_quiz_room', {
 *   roomId,
 *   config: {
 *     startTime: "2025-12-25T19:00", // ISO format
 *     // ... other config
 *   }
 * });
 * ```
 *
 * @component
 * @category Quiz Wizard
 */

import { FC, useState } from 'react';
import type { WizardStepProps } from './WizardStepProps';
import { useQuizConfig } from '../useQuizConfig';

const StepSchedule: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { config, updateConfig } = useQuizConfig();
  const [startTime, setStartTime] = useState(config.startTime ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime) return;
    updateConfig({ startTime });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-indigo-800">Step 8 of 9: Set Schedule</h2>
      <p className="text-sm text-gray-600 mb-2">
        Choose when the quiz should begin. This will be used to time reminders and room opening.
      </p>

      <div>
        <label htmlFor="startTime" className="block text-gray-700 font-medium mb-1">
          Quiz Start Time (Local Time)
        </label>
        <input
          id="startTime"
          type="datetime-local"
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
      </div>

      <div className="flex justify-between">
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

export default StepSchedule;
