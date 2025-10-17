/**
 * GAMESCREEN.TSX - Main Bingo Game Screen Layout Component
 *
 * This is the primary layout orchestrator for active Bingo gameplay, composing multiple child
 * components (NumberCaller, BingoCard, GameControls, WinEffects, WinConfirmation) into a cohesive
 * game interface. It handles the conditional rendering logic based on game state, player role (host
 * vs player), and win conditions, serving as the central hub for all gameplay UI during an active
 * Bingo game.
 *
 * ROLE IN THE APPLICATION:
 * - Orchestrates the layout and visibility of all gameplay components
 * - Manages conditional rendering based on game state (playing, paused, game over)
 * - Differentiates UI between host controls and player card interface
 * - Coordinates win notification displays with animations
 * - Handles win confirmation flow for line and full house wins
 * - Bridges UI events to parent component via callback props
 * - Displays game status messages (paused, game over, waiting)
 *
 * COMPONENT COMPOSITION:
 * This component composes the following child components:
 *
 * 1. NumberCaller:
 *    - Always visible during active gameplay
 *    - Shows current number, called numbers history, auto-play status
 *    - Common interface for both host and players
 *
 * 2. Status Messages:
 *    - Game Over notification (green): "Waiting for prize distribution..."
 *    - Paused notification (yellow): Instructions for host/players
 *    - Conditional based on game state flags
 *
 * 3. WinConfirmation (Host Only):
 *    - Modal for host to confirm line winners
 *    - Modal for host to confirm full house winners
 *    - Displayed sequentially (line first, then full house)
 *    - Only shown when winners pending and not yet confirmed
 *
 * 4. WinEffects:
 *    - Animated win notification overlay
 *    - Shows confetti and celebration for winners
 *    - Shows congratulations message for non-winners
 *    - Wrapped in AnimatePresence for smooth transitions
 *    - Dismissed via onClose callback
 *
 * 5. BingoCard (Players Only):
 *    - Interactive grid for marking called numbers
 *    - Only visible to non-host players
 *    - Hidden during game over
 *
 * 6. GameControls (Host Only):
 *    - Control panel with auto-play toggle, manual number call
 *    - Buttons to declare line/full house winners
 *    - Unpause button to continue game after win verification
 *    - Only visible to host
 *    - Hidden during game over
 *
 * GAME STATE FLOW:
 * 1. Active Play:
 *    - NumberCaller shows current number
 *    - Players see BingoCard to mark numbers
 *    - Host sees GameControls to manage game
 *
 * 2. Win Detected (Game Paused):
 *    - Yellow pause message appears
 *    - Host sees WinConfirmation modal
 *    - Players see waiting message
 *    - NumberCaller paused (no new numbers)
 *
 * 3. Win Confirmed:
 *    - WinEffects animation plays for all players
 *    - Winners see celebration
 *    - Non-winners see congratulatory message
 *    - Game resumes for full house (if line win) or ends (if full house)
 *
 * 4. Game Over:
 *    - Green "Game Over" message displayed
 *    - All gameplay components hidden
 *    - Waiting for prize distribution from backend/blockchain
 *    - Parent component will navigate to GameOverScreen
 *
 * CONDITIONAL RENDERING LOGIC:
 * - showGameOver: Hides gameplay components, shows game over message
 * - isPaused: Shows pause message, enables win confirmation modals
 * - isHost: Determines whether to show GameControls or BingoCard
 * - showWinNotification: Controls WinEffects visibility
 * - lineWinConfirmed: Controls line win confirmation modal
 * - fullHouseWinConfirmed: Controls full house win confirmation modal
 * - lineWinClaimed: Determines if full house confirmation can be shown
 *
 * SOCKET EVENTS:
 * This component emits Socket.IO events via local handlers:
 * - 'declare_line_winners': Host manually declares line winners
 * - 'declare_full_house_winners': Host manually declares full house winners
 * These are alternatives to automatic win detection
 *
 * PROP INTERFACE:
 * The component receives 20+ props covering:
 * - socket: WebSocket connection for emitting events
 * - gameState: Current game state (card, numbers, current number)
 * - Player info: playerName, isHost, isWinner
 * - Game flags: isPaused, autoPlay, showGameOver, showWinNotification
 * - Win data: lineWinners, fullHouseWinners, win confirmations, winnerName
 * - Callbacks: Various event handlers for UI actions
 *
 * LAYOUT STRUCTURE:
 * - Fragment wrapper (no additional container)
 * - Stacked vertical layout (implicit from block elements)
 * - NumberCaller at top (always present)
 * - Status messages below NumberCaller
 * - Win confirmations as modal overlays
 * - WinEffects as full-screen overlay (AnimatePresence)
 * - BingoCard or GameControls at bottom (conditional)
 *
 * STYLING:
 * - No wrapper div (uses React Fragment)
 * - Delegates styling to child components
 * - Status messages have colored backgrounds (yellow, green)
 * - Responsive padding and text sizing in status messages
 *
 * ACCESSIBILITY:
 * - Status messages use semantic color coding
 * - Clear text instructions during paused states
 * - Role-specific messaging (host vs player instructions)
 * - Animation can be disabled via prefers-reduced-motion (framer-motion)
 *
 * DEPENDENCIES:
 * - Child components: NumberCaller, BingoCard, GameControls, WinEffects, WinConfirmation
 * - framer-motion AnimatePresence for exit animations
 * - Socket.IO client types
 * - React FC and type annotations
 *
 * INTEGRATION:
 * - Rendered within Game.tsx during active gameplay phase
 * - Receives state from parent's WebSocket listeners
 * - Emits events back to parent via callback props
 * - Replaced by GameOverScreen when game concludes
 *
 * DATA FLOW:
 * - Parent (Game.tsx) manages WebSocket state
 * - GameScreen receives state as props
 * - GameScreen renders appropriate child components
 * - User interactions fire callbacks back to parent
 * - Parent emits Socket events to server
 * - Server broadcasts state updates to all clients
 * - Cycle repeats
 *
 * FUTURE ENHANCEMENTS:
 * - Add spectator mode UI variant
 * - Show player count or status indicators
 * - Add chat panel for player communication
 * - Display prize pool in real-time
 * - Show game timer or round number
 * - Add sound effects for number calls and wins
 */

import type React from 'react';
import { NumberCaller } from './NumberCaller';
import { BingoCard } from './BingoCard';
import { GameControls } from './GameControls';
import { WinEffects } from './effects/WinEffects';
import { WinConfirmation } from './modals/WinConfirmation';
import { AnimatePresence } from 'framer-motion';
import type { Socket } from 'socket.io-client';

interface GameScreenProps {
  socket: Socket | null;
  gameState: any;
  playerName: string;
  isHost: boolean;
  isPaused: boolean;
  isWinner: boolean;
  autoPlay: boolean;
  lineWinners: any[];
  fullHouseWinners: any[];
  lineWinConfirmed: boolean;
  fullHouseWinConfirmed: boolean;
  lineWinClaimed: boolean;
  showWinNotification: boolean;
  winNotificationType: 'line' | 'fullHouse';
  winnerName: string;
  onConfirmLineWin: () => void;
  onConfirmFullHouseWin: () => void;
  onCellClick: (index: number) => void;
  onToggleAutoPlay: () => void;
  onUnpauseGame: () => void;
  onCloseWinNotification: () => void;
  showGameOver: boolean;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  socket,
  gameState,
  playerName,
  isHost,
  isPaused,
  isWinner,
  autoPlay,
  lineWinners,
  fullHouseWinners,
  lineWinConfirmed,
  fullHouseWinConfirmed,
  lineWinClaimed,
  showWinNotification,
  winNotificationType,
  winnerName,
  onConfirmLineWin,
  onConfirmFullHouseWin,
  onCellClick,
  onToggleAutoPlay,
  onUnpauseGame,
  onCloseWinNotification,
  showGameOver,
}) => {
  const roomId = localStorage.getItem('roomId') || '';

  const handleDeclareLineWinners = () => {
    if (!roomId || !socket) return;
    socket.emit('declare_line_winners', { roomId });
  };

  const handleDeclareFullHouseWinners = () => {
    if (!roomId || !socket) return;
    socket.emit('declare_full_house_winners', { roomId });
  };

  return (
    <>
      <NumberCaller
        currentNumber={gameState.currentNumber}
        calledNumbers={gameState.calledNumbers}
        autoPlay={autoPlay}
      />

      {showGameOver && (
        <div className="text-center p-4 bg-green-100 rounded-lg mt-4">
          <p className="text-green-800 font-bold">[SUCCESS] Game Over! Waiting for prize distribution...</p>
        </div>
      )}

      {!showGameOver && isPaused && (
        <div className="text-center p-4 bg-yellow-100 rounded-lg">
          <p className="text-yellow-800 font-semibold">
            Game Paused: {isHost ? "Verify winners and continue the game" : "Waiting for host to continue"}
          </p>
        </div>
      )}

      {!showGameOver && isPaused && isHost && lineWinners.length > 0 && !lineWinConfirmed && !lineWinClaimed && (
        <WinConfirmation
          type="line"
          winnerName={lineWinners[lineWinners.length - 1]?.name || 'Player'}
          onConfirm={onConfirmLineWin}
        />
      )}

      {!showGameOver && isPaused && isHost && fullHouseWinners.length > 0 && !fullHouseWinConfirmed && lineWinClaimed && (
        <WinConfirmation
          type="fullHouse"
          winnerName={fullHouseWinners[fullHouseWinners.length - 1]?.name || 'Player'}
          onConfirm={onConfirmFullHouseWin}
        />
      )}

      <AnimatePresence>
        {showWinNotification && !showGameOver && (
          <WinEffects
            isWinner={isWinner}
            winnerName={winnerName}
            playerName={playerName}
            winNotificationType={winNotificationType}
            onClose={onCloseWinNotification}
          />
        )}
      </AnimatePresence>

      {!showGameOver && !isHost && (
        <BingoCard
          cells={gameState.card}
          onCellClick={onCellClick}
        />
      )}

      {!showGameOver && isHost && (
        <GameControls
          onToggleAutoPlay={onToggleAutoPlay}
          onUnpauseGame={onUnpauseGame}
          onDeclareLineWinners={handleDeclareLineWinners}
          onDeclareFullHouseWinners={handleDeclareFullHouseWinners}
          showDeclarationsButtons={true}
          lineWinners={lineWinners}
          fullHouseWinners={fullHouseWinners}
          lineWinClaimed={lineWinClaimed}
          hasWon={fullHouseWinners.length > 0}
          autoPlay={autoPlay}
          isPaused={isPaused}
        />
      )}
    </>
  );
};


