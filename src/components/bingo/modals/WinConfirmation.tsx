/**
 * WINCONFIRMATION.TSX - Host Win Verification Modal Component
 *
 * This component displays a confirmation prompt for the host to verify and approve player win claims
 * (either line or full house). It serves as a critical gatekeeper in the win validation flow, ensuring
 * the host manually verifies winning cards before prizes are awarded and game state changes. This
 * prevents false wins and maintains game integrity.
 *
 * ROLE IN THE APPLICATION:
 * - Displays when a player claims a win (line or full house)
 * - Pauses the game until host confirms or denies the win
 * - Shows winner's name and win type for host review
 * - Provides single-click confirmation button
 * - Differentiates visually between line and full house wins
 * - Triggers game state progression on confirmation
 * - Host-only interface (players don't see this)
 *
 * WIN CONFIRMATION FLOW:
 * 1. Player achieves winning pattern (line or full house)
 * 2. Client detects win and emits claim to server
 * 3. Server broadcasts win claim to all clients
 * 4. Host's UI displays this WinConfirmation component
 * 5. Host verifies player's card visually
 * 6. Host clicks confirmation button
 * 7. onConfirm callback triggered → server broadcasts win confirmation
 * 8. For line win: Game resumes, players continue towards full house
 * 9. For full house win: Game ends, prize distribution initiated
 *
 * COMPONENT VARIANTS:
 * Line Win Confirmation:
 * - Yellow color scheme (bg-yellow-50, border-yellow-200, text-yellow-800)
 * - Heading: "Line Win Claimed!"
 * - Description: "{winnerName} claimed a line win."
 * - Button text: "Confirm Line Win & Continue Game"
 * - Button color: Green (bg-green-600)
 * - Game continues after confirmation
 *
 * Full House Confirmation:
 * - Purple color scheme (bg-purple-50, border-purple-200, text-purple-800)
 * - Heading: "Full House Claimed!"
 * - Description: "{winnerName} claimed a full house."
 * - Button text: "Confirm Full House Win & End Game"
 * - Button color: Purple (bg-purple-600)
 * - Game ends after confirmation
 *
 * UI STRUCTURE:
 * ```
 * <div> (colored container with border)
 *   ├─ <h3> Win type heading
 *   ├─ <p> Winner name and description
 *   └─ <button> Confirmation button
 * ```
 *
 * PROPS INTERFACE:
 * - type: 'line' | 'fullHouse' - Type of win being confirmed
 * - winnerName: string - Name of claiming player
 * - onConfirm: () => void - Callback when host confirms win
 * - disabled: boolean (optional, default false) - Disables button
 *
 * BUTTON BEHAVIOR:
 * - Enabled State:
 *   - Full width (w-full) for easy clicking
 *   - Hover effect darkens background
 *   - Cursor pointer
 *   - Clear call-to-action text
 *
 * - Disabled State:
 *   - 50% opacity (opacity-50)
 *   - No hover effect
 *   - Prevents double-confirmation
 *   - Used when processing confirmation
 *
 * COLOR CODING RATIONALE:
 * - Yellow for Line: Warning/caution (game not over, verify carefully)
 * - Purple for Full House: Royal/victory (game ending, final verification)
 * - Green Confirm Button: Positive action, proceed
 * - Purple Confirm Button: Final action, matches full house theme
 *
 * INTEGRATION:
 * - Rendered by GameScreen component
 * - Shown when isPaused && winners.length > 0 && !confirmed
 * - Host sees this, players see generic "waiting for host" message
 * - Positioned prominently above game controls
 * - Modal-like behavior (blocks game progress)
 *
 * CONDITIONAL RENDERING IN PARENT:
 * Line Win:
 * ```tsx
 * {isPaused && lineWinners.length > 0 && !lineWinConfirmed && (
 *   <WinConfirmation
 *     type="line"
 *     winnerName={lineWinners[lineWinners.length - 1].name}
 *     onConfirm={handleConfirmLineWin}
 *   />
 * )}
 * ```
 *
 * Full House Win:
 * ```tsx
 * {isPaused && fullHouseWinners.length > 0 && !fullHouseWinConfirmed && (
 *   <WinConfirmation
 *     type="fullHouse"
 *     winnerName={fullHouseWinners[fullHouseWinners.length - 1].name}
 *     onConfirm={handleConfirmFullHouseWin}
 *   />
 * )}
 * ```
 *
 * GAME INTEGRITY:
 * This component is crucial for preventing:
 * - False win claims from bugs or cheating
 * - Incorrect prize distribution
 * - Premature game endings
 * - Disputes over winners
 *
 * Host has final authority to verify the actual card state before
 * triggering blockchain transactions or prize distribution.
 *
 * ACCESSIBILITY:
 * - type="button" prevents form submission
 * - Full-width button for large touch target
 * - High contrast color combinations
 * - Clear descriptive text
 * - Disabled state clearly communicated
 *
 * STYLING:
 * - Rounded corners (rounded-lg)
 * - Border for definition
 * - Padding for breathing room (p-4)
 * - Margin for spacing (my-4)
 * - Responsive text sizing
 * - Smooth color transitions
 *
 * ERROR PREVENTION:
 * - Disabled prop prevents double-confirmation
 * - Button only appears when needed (conditional rendering)
 * - Clear visual feedback for button state
 * - onConfirm callback handles all validation
 *
 * TYPICAL HOST WORKFLOW:
 * 1. Hear audio notification of win claim (if implemented)
 * 2. See WinConfirmation component appear
 * 3. Look at winner's name
 * 4. Visually verify winner's Bingo card (if accessible)
 * 5. Click confirmation button
 * 6. Component disappears
 * 7. Game continues (line) or ends (full house)
 *
 * DEPENDENCIES:
 * - React FC type annotation
 * - No external libraries (pure React)
 * - Relies on Tailwind CSS for styling
 *
 * FUTURE ENHANCEMENTS:
 * - Show winner's Bingo card for visual verification
 * - Add "Reject Win" button for false claims
 * - Display win pattern (which line or full house)
 * - Show timer for confirmation (auto-confirm after X seconds)
 * - Add win claim history log
 * - Display multiple winners if tied
 * - Add sound notification for host
 * - Show prize amount being awarded
 */

// src/components/WinConfirmation.tsx
import type React from 'react';

interface WinConfirmationProps {
  type: 'line' | 'fullHouse';
  winnerName: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export const WinConfirmation: React.FC<WinConfirmationProps> = ({
  type,
  winnerName,
  onConfirm,
  disabled = false,
}) => {
  const isLine = type === 'line';

  return (
    <div
      className={`${
        isLine ? 'bg-yellow-50 border border-yellow-200' : 'bg-purple-50 border border-purple-200'
      } rounded-lg p-4 my-4`}
    >
      <h3 className={`font-medium ${isLine ? 'text-yellow-800' : 'text-purple-800'} mb-2`}>
        {isLine ? 'Line Win Claimed!' : 'Full House Claimed!'}
      </h3>
      <p className={`${isLine ? 'text-yellow-700' : 'text-purple-700'} mb-3`}>
        {winnerName || 'Player'} claimed a {isLine ? 'line win' : 'full house'}.
      </p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className={`w-full py-2 px-4 rounded-lg text-white transition-colors ${
          isLine
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-purple-600 hover:bg-purple-700'
        } disabled:opacity-50`}
      >
        {isLine ? 'Confirm Line Win & Continue Game' : 'Confirm Full House Win & End Game'}
      </button>
    </div>
  );
};
