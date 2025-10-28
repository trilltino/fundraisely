/**
 * PLAYERLIST.TSX - Game Room Player List Component
 *
 * This component displays the list of all players currently in a Bingo game room, showing their
 * ready status, host designation, and providing interactive controls for readying up (players) or
 * starting the game (host). It serves as the primary pre-game lobby interface, coordinating player
 * synchronization before gameplay begins.
 *
 * ROLE IN THE APPLICATION:
 * - Displays all players in the game room with visual status indicators
 * - Shows ready/waiting status for each player with color-coded icons
 * - Distinguishes the host with a crown icon and special styling
 * - Highlights the current user's player card for easy identification
 * - Provides "Ready Up" button for non-host players
 * - Provides "Start Game" button for host with validation
 * - Shows ready count progress (X/Y Ready)
 * - Animated player entries for smooth visual experience
 *
 * PLAYER STATES:
 * 1. Host (isHost: true):
 *    - Crown icon in yellow background
 *    - Cannot ready up (hosts are automatically ready)
 *    - Can start game when conditions met
 *    - Special styling and privileges
 *
 * 2. Non-Host Player:
 *    - User icon in gray background
 *    - Can toggle ready status
 *    - Waiting for host to start game
 *    - Must ready up before game can start
 *
 * 3. Ready Status (isReady: true):
 *    - Green checkmark icon (CheckCircle2)
 *    - "Ready" text in green
 *    - Counted in ready progress indicator
 *
 * 4. Waiting Status (isReady: false):
 *    - Gray circle outline icon
 *    - "Waiting" text in gray
 *    - Blocks game start until ready
 *
 * GAME START CONDITIONS:
 * Host can start the game when:
 * - Solo Play Mode: Only 1 player (host) in room → Allows testing/demo
 * - Multiplayer Mode: All players have readied up
 * Button disabled otherwise with helpful title tooltip
 *
 * UI LAYOUT:
 * 1. Header Section:
 *    - "Players" title with gradient styling
 *    - Ready count badge (X/Y Ready) in indigo pill
 *
 * 2. Player List (scrollable):
 *    - Max height 256px with overflow-y-auto
 *    - Each player card shows:
 *      - Host crown or user icon
 *      - Player name + "(You)" for current player
 *      - Ready/Waiting status with icon
 *    - Current player highlighted with indigo background
 *    - Other players on gray background
 *    - Staggered animation on entry (index * 0.1s delay)
 *
 * 3. Action Buttons (pre-game only):
 *    - Non-Host: "Ready Up" / "Cancel Ready" toggle button
 *      - Green gradient when not ready (encouraging action)
 *      - Red when ready (can cancel)
 *    - Host: "Start Game" / "Start Solo Game" button
 *      - Disabled with tooltip when conditions not met
 *      - Indigo-purple gradient when enabled
 *
 * ANIMATIONS:
 * - framer-motion for smooth player entry animations
 * - Staggered appearance based on player index
 * - Initial state: opacity 0, x offset 20px
 * - Animate to: opacity 1, x offset 0
 * - 0.1 second delay per player for cascading effect
 *
 * RESPONSIVE DESIGN:
 * - Text sizing adjusts for mobile (sm: breakpoint)
 * - Icon sizing scales down on mobile (w-4 → w-5)
 * - Padding adjusts for screen size (p-5 vs sm:p-6)
 * - Buttons remain full-width for mobile accessibility
 *
 * PROP INTERFACE:
 * - players: Array of Player objects with id, name, isHost, isReady
 * - currentPlayerId: String identifying the current user
 * - onToggleReady: Optional callback for ready toggle (non-hosts)
 * - onStartGame: Optional callback for game start (host)
 * - gameStarted: Boolean to hide controls once game begins
 *
 * VISUAL HIERARCHY:
 * - Host player stands out with crown and yellow accent
 * - Current player clearly identified with indigo highlight
 * - Ready status immediately visible with color coding
 * - Progress indicator draws eye to completion status
 * - Action buttons prominent at bottom
 *
 * ACCESSIBILITY:
 * - Clear visual distinctions between states
 * - Title tooltips on disabled buttons explain why
 * - High contrast colors for status indicators
 * - Semantic button types specified
 * - Keyboard navigable (native button elements)
 *
 * EDGE CASES HANDLED:
 * - Solo play mode (isSinglePlayer check)
 * - Missing current player (optional chaining)
 * - Game already started (hides action buttons)
 * - Empty player list (renders empty space-y container)
 * - Optional callbacks (safe to call with ?)
 *
 * DEPENDENCIES:
 * - lucide-react for icons (Crown, User, CheckCircle2, Circle)
 * - framer-motion for animations (motion.div, AnimatePresence)
 * - Player type from game types
 *
 * INTEGRATION:
 * - Used in Game.tsx during pre-game waiting phase
 * - Receives player list from WebSocket room state
 * - Emits ready toggle and start game events via callbacks
 * - Hidden once gameStarted flag is true
 *
 * FUTURE ENHANCEMENTS:
 * - Add player avatars or profile pictures
 * - Show player statistics or badges
 * - Add kick player functionality for host
 * - Show connection quality indicators
 * - Add player chat or reactions
 * - Display player wallet balances
 */

import { Crown, User, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Player } from '@/types/game';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  onToggleReady?: () => void;
  onStartGame?: () => void;
  gameStarted: boolean;
}

export function PlayerList({
  players,
  currentPlayerId,
  onToggleReady,
  onStartGame,
  gameStarted
}: PlayerListProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const allPlayersReady = players.every(p => p.isReady);
  const readyCount = players.filter(p => p.isReady).length;
  const isSinglePlayer = players.length === 1;

  console.log('[PlayerList] State:', {
    playersCount: players.length,
    currentPlayerId,
    currentPlayerFound: !!currentPlayer,
    currentPlayerIsHost: currentPlayer?.isHost,
    isSinglePlayer,
    allPlayersReady,
    gameStarted,
    players: players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost, isReady: p.isReady }))
  });

  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
          Players
        </h2>
        <div className="inline-flex items-center px-2 py-1 rounded-full bg-indigo-100">
          <span className="text-sm text-indigo-800 font-medium">
            {readyCount}/{players.length} Ready
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-5 sm:mb-6 max-h-64 overflow-y-auto pr-1">
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-xl ${
              player.id === currentPlayerId ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {player.isHost ? (
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-100">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                </div>
              ) : (
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </div>
              )}
              <span className="text-sm sm:text-base font-medium text-gray-800">
                {player.name}
                {player.id === currentPlayerId && ' (You)'}
              </span>
            </div>

            {player.isReady ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                <span className="text-xs text-gray-400">Waiting</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {!gameStarted && (
        <div className="space-y-3">
          {/* Players who are NOT host can ready up */}
          {currentPlayer && !currentPlayer.isHost && (
            <button
              type="button"
              onClick={onToggleReady}
              className={`w-full py-2.5 px-4 rounded-xl text-sm sm:text-base font-medium transition-all shadow-md ${
                currentPlayer.isReady
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700'
              }`}
            >
              {currentPlayer.isReady ? 'Cancel Ready' : 'Ready Up'}
            </button>
          )}

          {/* Host can start the game - solo play allowed for testing */}
          {currentPlayer?.isHost && (
            <button
              type="button"
              onClick={onStartGame}
              disabled={!isSinglePlayer && !allPlayersReady}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-medium
                         hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              title={isSinglePlayer ? "Start solo game" : allPlayersReady ? "Start game" : "Waiting for all players to ready up"}
            >
              {isSinglePlayer ? 'Start Solo Game' : 'Start Game'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

