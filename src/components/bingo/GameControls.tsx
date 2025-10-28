/**
 * GAME CONTROLS COMPONENT - Host Control Panel for Game Management
 *
 * PURPOSE:
 * This component provides the host with interactive controls to manage the Bingo game
 * in real-time. It includes buttons for auto-play toggle, game pause/unpause, winner
 * declarations, and navigation. Only the host sees and can use these controls, making
 * it the central command interface for game orchestration.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Provides host-only controls for game state management
 * - Toggles auto-play mode (automatic number calling every 3 seconds)
 * - Pauses and resumes gameplay for all players
 * - Allows host to declare winners (line and full house)
 * - Shows contextual buttons based on current game state
 * - Emits control events to server via callback functions
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Used by Game.tsx and GameScreen.tsx when current player is host
 *   - Receives callbacks from useGame hook (onToggleAutoPlay, onUnpauseGame)
 *   - Receives game state props (isPaused, autoPlay, hasWon, winners)
 *   - Conditionally renders based on host status and game state
 *   - Navigation via React Router for returning to landing page
 *
 * WebSocket Server Integration (Indirect):
 *   - Callbacks emit socket events via useGame hook
 *   - onToggleAutoPlay -> socket.emit('toggle_auto_play')
 *   - onUnpauseGame -> socket.emit('unpause_game')
 *   - onDeclareLineWinners -> socket.emit('declare_line_winners')
 *   - onDeclareFullHouseWinners -> socket.emit('declare_full_house_winners')
 *   - Server broadcasts state changes to all players in room
 *
 * Solana Program (No Direct Relationship):
 *   - Game controls manage ephemeral gameplay state only
 *   - Winner declarations trigger blockchain transactions externally
 *   - Prize distribution happens after full house winner declared
 *   - Pattern: Declare winner -> Verify -> Execute Solana transaction
 *
 * KEY RESPONSIBILITIES:
 * 1. Auto-Play Toggle: Start/stop automatic number calling
 * 2. Pause Control: Pause game when needed (displays Unpause button)
 * 3. Winner Declarations: Allow host to confirm and declare winners
 * 4. State Management: Enable/disable buttons based on game state
 * 5. Navigation: Return to landing page with confirmation
 * 6. Visual Feedback: Show current state via button text and icons
 *
 * PROPS:
 * - onToggleAutoPlay: () => void - Toggle auto-play mode
 * - onUnpauseGame: () => void - Resume paused game
 * - onDeclareLineWinners?: () => void - Declare line winners (optional)
 * - onDeclareFullHouseWinners?: () => void - Declare full house winners (optional)
 * - hasWon: boolean - Current player has won (disables controls)
 * - autoPlay: boolean - Auto-play currently active
 * - isPaused: boolean - Game currently paused
 * - showDeclarationsButtons?: boolean - Show winner declaration buttons
 * - lineWinners?: {id, name}[] - List of line winners
 * - fullHouseWinners?: {id, name}[] - List of full house winners
 * - lineWinClaimed?: boolean - Line prize already claimed
 *
 * BUTTON VISIBILITY LOGIC:
 * - Auto-Play Toggle: Always visible, disabled if hasWon or isPaused
 * - Unpause: Only visible when isPaused is true, disabled if hasWon
 * - Declare Line Winners: When showDeclarationsButtons && lineWinners.length > 0 && !lineWinClaimed
 * - Declare Full House: When showDeclarationsButtons && fullHouseWinners.length > 0
 * - Return to Landing: Always visible
 *
 * VISUAL STATES:
 * - Auto-Play ON: "Pause" button with Pause icon
 * - Auto-Play OFF: "Auto Play" button with Play icon
 * - Paused: Blue "Unpause Game" button with PlayCircle icon
 * - Disabled: 50% opacity, no hover effects, cursor-not-allowed
 * - Active: Gradient background, hover effects, shadows
 *
 * COMPONENT STRUCTURE:
 * ```
 * <div> (flex container with gap)
 *   ├─ Auto-Play Toggle button
 *   ├─ Unpause button (conditional: when isPaused)
 *   ├─ Declare Line Winners button (conditional: when winners present)
 *   ├─ Declare Full House button (conditional: when winners present)
 *   └─ Return to Landing button
 * ```
 *
 * BUTTON DESIGN:
 * - Gradient backgrounds: from-indigo-600 to-purple-600
 * - Icons from Lucide React (Play, Pause, PlayCircle, Trophy, ArrowLeft)
 * - Responsive sizing: px-6 py-3 for comfortable touch targets
 * - Rounded corners: rounded-lg for modern look
 * - Shadows: shadow-md for depth
 * - Hover effects: Darken gradient on hover
 *
 * ACCESSIBILITY:
 * - type="button" to prevent form submission
 * - disabled attribute for proper state
 * - Icons with text labels for clarity
 * - Clear hover and disabled states
 * - Keyboard navigable (Tab to focus, Space/Enter to activate)
 *
 * CONFIRMATION DIALOGS:
 * - Return to Landing: Asks "Are you sure?" before navigation
 * - Prevents accidental exits during active games
 * - Uses native window.confirm() for simplicity
 *
 * USAGE EXAMPLE:
 * ```tsx
 * function Game() {
 *   const { autoPlay, toggleAutoPlay, unpauseGame } = useGame(socket, roomId);
 *   const { isPaused, lineWinners, fullHouseWinners } = useGameStore();
 *   const isHost = room?.players.find(p => p.id === socket?.id)?.isHost;
 *
 *   if (!isHost) return null; // Only show for host
 *
 *   return (
 *     <GameControls
 *       onToggleAutoPlay={toggleAutoPlay}
 *       onUnpauseGame={unpauseGame}
 *       hasWon={gameState.hasWonFullHouse}
 *       autoPlay={autoPlay}
 *       isPaused={isPaused}
 *       lineWinners={lineWinners}
 *       fullHouseWinners={fullHouseWinners}
 *     />
 *   );
 * }
 * ```
 *
 * PERFORMANCE NOTES:
 * - Re-renders on any prop change
 * - Console logs for debugging (can be removed in production)
 * - Navigation confirmation prevents accidental state loss
 * - Disabled state prevents rapid clicking/double submission
 */

// src/components/GameControls.tsx
import { Play, Pause, ArrowLeft, PlayCircle, } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { memo, useEffect } from 'react';

interface GameControlsProps {
  onToggleAutoPlay: () => void;
  onUnpauseGame: () => void;
  onDeclareLineWinners?: () => void;
  onDeclareFullHouseWinners?: () => void;
  hasWon: boolean;
  autoPlay: boolean;
  isPaused: boolean;
  showDeclarationsButtons?: boolean;
  lineWinners?: Array<{ id: string; name: string }>;
  fullHouseWinners?: Array<{ id: string; name: string }>;
  lineWinClaimed?: boolean;
}

/**
 * GameControls Component
 *
 * ✅ OPTIMIZED: Wrapped with React.memo to prevent unnecessary re-renders
 * ✅ OPTIMIZED: Moved console.log from render phase to useEffect
 */
export const GameControls = memo(function GameControls({
  onToggleAutoPlay,
  onUnpauseGame,

  hasWon,
  autoPlay,
  isPaused,

  lineWinners = [],
  fullHouseWinners = [],
  lineWinClaimed = false,
}: GameControlsProps) {
  const navigate = useNavigate();

  // ✅ OPTIMIZED: Side effects moved to useEffect instead of render phase
  // (from React docs: "Keeping Components Pure")
  useEffect(() => {
    console.log('[GameControls] [LAUNCH] Rendering GameControls', {
      isPaused,
      lineWinners,
      fullHouseWinners,
      lineWinClaimed,
      hasWon,
      autoPlay,
    });
  }, [isPaused, lineWinners, fullHouseWinners, lineWinClaimed, hasWon, autoPlay]);

  const handleReturnToLanding = () => {
    if (window.confirm('Are you sure you want to return to the landing page?')) {
      navigate('/');
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6">
      {/* Auto Play Control */}
      <button
        type="button"
        onClick={onToggleAutoPlay}
        disabled={hasWon || isPaused}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {autoPlay ? <Pause size={20} /> : <Play size={20} />}
        {autoPlay ? 'Pause' : 'Auto Play'}
      </button>

      {/* Unpause Button - Show when paused */}
      {isPaused && (
        <button
          type="button"
          onClick={() => {
            console.log('[GameControls]  Unpause button clicked');
            onUnpauseGame();
          }}
          disabled={hasWon}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlayCircle size={20} />
          Unpause Game
        </button>
      )}


      {/* Return to Landing button */}
      <button
        type="button"
        onClick={handleReturnToLanding}
        className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-md"
      >
        <ArrowLeft size={20} />
        Return to Landing
      </button>
    </div>
  );
});