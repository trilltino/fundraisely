/**
 * GAMEOVERSCREEN.TSX - Bingo Game Completion and Winners Display
 *
 * This is the final screen displayed after a Bingo game concludes, celebrating the winners and
 * providing a path back to the home page. It shows line winners and full house winners separately,
 * displays their wallet addresses (truncated) for blockchain verification, and includes a notice
 * about upcoming Solana prize distribution functionality. The screen serves as both a celebration
 * moment and a transition point back to the application home.
 *
 * ROLE IN THE APPLICATION:
 * - Final destination after game completion and prize distribution
 * - Displays all winners (line and full house) with wallet information
 * - Celebrates game conclusion with trophy icon and congratulatory messaging
 * - Provides clear navigation back to home page
 * - Resets game state when user leaves (cleanup)
 * - Acts as transition between gameplay and next activity
 * - Logs game completion for debugging and analytics
 *
 * WINNER DISPLAY:
 * Winners are categorized into two groups:
 *
 * 1. Line Winners:
 *    - Players who completed a line (row, column, or diagonal) first
 *    - Typically receive 30% of prize pool (per game rules)
 *    - Multiple winners possible if simultaneous wins
 *    - Listed first in winners section
 *
 * 2. Full House Winners:
 *    - Players who marked all numbers on their card
 *    - Typically receive 70% of prize pool (per game rules)
 *    - Usually one winner, but ties possible
 *    - Listed second in winners section
 *
 * Each winner card displays:
 * - Winner's name (bold, white text)
 * - Wallet address (if available) in truncated format
 *   Format: XXXX...YYYY (first 4 and last 4 characters)
 * - Semi-transparent white background for readability
 * - Rounded corners and padding
 *
 * UI LAYOUT:
 * 1. Full-Screen Gradient Background:
 *    - Purple-900 → Blue-900 → Indigo-900 gradient
 *    - Conveys celebration and finality
 *    - Consistent with app's purple-indigo theme
 *
 * 2. Centered Content Card:
 *    - White/10 background with backdrop blur (glass morphism)
 *    - Rounded 2xl corners
 *    - Max-width md (448px) for readability
 *    - Padding p-8
 *
 * 3. Header Section:
 *    - Trophy icon (w-16 h-16) in yellow-400
 *    - "Game Over!" heading in 4xl white text
 *    - "Congratulations to all winners!" subtext in gray-300
 *    - Center-aligned for emphasis
 *
 * 4. Winners Section (if winners exist):
 *    - "[WINNER] Winners" heading
 *    - Separate subsections for line and full house
 *    - Individual winner cards with name and wallet
 *    - Space-y-3 for vertical rhythm
 *
 * 5. Prize Distribution Notice:
 *    - Blue-themed info box
 *    - Border and background in blue with opacity
 *    - "[IDEA] Prize distribution on Solana coming soon!"
 *    - Manages expectations about blockchain integration
 *
 * 6. Back to Home Button:
 *    - Full-width button with gradient (purple-600 → blue-600)
 *    - Home icon + text
 *    - Prominent placement at bottom
 *    - Triggers navigation and cleanup
 *
 * PRIZE DISTRIBUTION (TODO):
 * Currently displays placeholder message about Solana integration.
 * Future implementation should:
 * - Trigger smart contract method for prize distribution
 * - Display transaction status and hash
 * - Show estimated SOL amounts for each winner
 * - Handle blockchain errors gracefully
 * - Confirm successful transfers
 * - Update winner objects with transaction data
 *
 * STATE MANAGEMENT:
 * - Uses React Router navigate for navigation
 * - Calls resetGameState from useGameStore on exit
 * - Clears all game-related state from Zustand store
 * - Ensures clean state for next game
 *
 * LIFECYCLE:
 * - useEffect logs game completion on mount
 * - Logs roomId and winner data for debugging
 * - No cleanup needed (no subscriptions/timers)
 * - State reset handled on button click
 *
 * NAVIGATION FLOW:
 * User lands here from Game.tsx when:
 * 1. Game ends (full house winner confirmed)
 * 2. Backend triggers 'game_over' event
 * 3. Game.tsx conditionally renders this screen
 *
 * User exits via:
 * 1. Click "Back to Home" button
 * 2. Triggers handleGoHome callback
 * 3. Resets game state (Zustand)
 * 4. Navigates to '/' (Landing page)
 *
 * PROP INTERFACE:
 * - lineWinners: Array of Winner objects (id, name, wallet)
 * - fullHouseWinners: Array of Winner objects
 * - roomId: String identifier for completed game (for logging)
 *
 * EDGE CASES:
 * - No winners: Still shows header and back button (shouldn't happen)
 * - Empty lineWinners but fullHouseWinners exist: Only shows full house
 * - Missing wallet addresses: Wallet display gracefully hidden
 * - Single winner in multiple categories: Possible, handled correctly
 *
 * STYLING:
 * - Tailwind CSS utility classes
 * - Glass morphism effect (backdrop-blur-lg)
 * - Gradient backgrounds for visual appeal
 * - Responsive text sizing (4xl, xl, sm, xs)
 * - Consistent color scheme (purple, blue, yellow, white)
 * - Lucide React icons for Trophy and Home
 *
 * ACCESSIBILITY:
 * - Clear heading hierarchy
 * - High contrast text on colored backgrounds
 * - Large touch target for button
 * - Icon + text for button clarity
 * - Semantic HTML structure
 *
 * DEPENDENCIES:
 * - React Router useNavigate
 * - lucide-react icons (Trophy, Home)
 * - React useEffect for lifecycle logging
 * - Zustand useGameStore for state reset
 *
 * FUTURE ENHANCEMENTS:
 * - Implement actual Solana prize distribution
 * - Add confetti or celebration animation
 * - Show game statistics (duration, numbers called, etc.)
 * - Add social sharing buttons ("Share my win!")
 * - Display prize pool breakdown (25% host, 60% winners, 15% platform)
 * - Add "Play Again" button to create new room
 * - Show transaction confirmations with Solana Explorer links
 * - Add leaderboard integration
 */

// GameOverScreen.tsx - Solana version (simplified, prize distribution TODO)
import { useNavigate } from 'react-router-dom';
import { Trophy, Home } from 'lucide-react';
import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';

interface Winner {
  id: string;
  name: string;
  wallet?: string;
}

interface GameOverScreenProps {
  lineWinners: Winner[];
  fullHouseWinners: Winner[];
  roomId: string;
}

export default function GameOverScreen({ lineWinners, fullHouseWinners, roomId }: GameOverScreenProps) {
  const navigate = useNavigate();
  const { resetGameState } = useGameStore();

  useEffect(() => {
    console.log('[GameOverScreen] Game ended', { roomId, lineWinners, fullHouseWinners });
  }, [roomId, lineWinners, fullHouseWinners]);

  const handleGoHome = () => {
    resetGameState();
    navigate('/');
  };

  const allWinners = [...lineWinners, ...fullHouseWinners];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Game Over!</h1>
          <p className="text-gray-300">Congratulations to all winners!</p>
        </div>

        {allWinners.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-xl font-semibold text-white mb-4">[WINNER] Winners</h2>

            {lineWinners.length > 0 && (
              <div>
                <p className="text-sm text-gray-300 mb-2">Line Winners:</p>
                {lineWinners.map((winner, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 mb-2">
                    <p className="text-white font-medium">{winner.name}</p>
                    {winner.wallet && (
                      <p className="text-gray-400 text-xs">
                        {winner.wallet.slice(0, 4)}...{winner.wallet.slice(-4)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {fullHouseWinners.length > 0 && (
              <div>
                <p className="text-sm text-gray-300 mb-2">Full House Winners:</p>
                {fullHouseWinners.map((winner, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 mb-2">
                    <p className="text-white font-medium">{winner.name}</p>
                    {winner.wallet && (
                      <p className="text-gray-400 text-xs">
                        {winner.wallet.slice(0, 4)}...{winner.wallet.slice(-4)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-200">
            [IDEA] Prize distribution on Solana coming soon! For now, enjoy the glory of winning.
          </p>
        </div>

        <button
          onClick={handleGoHome}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
