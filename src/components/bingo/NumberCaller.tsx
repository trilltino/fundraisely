/**
 * NUMBER CALLER COMPONENT - Real-Time Number Display & Game Status
 *
 * PURPOSE:
 * This component displays the current Bingo number being called, maintains a history
 * of recently called numbers, and shows the auto-play status. It serves as the central
 * "caller" interface that all players watch during gameplay, similar to the traditional
 * Bingo caller at a live game.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Displays the most recent number called by the server
 * - Shows Bingo letter prefix (B/I/N/G/O) based on number range
 * - Maintains scrolling history of last 10 called numbers
 * - Indicates auto-play mode status (ON/OFF with visual indicator)
 * - Provides real-time synchronization of game state across all players
 * - Updates immediately when server broadcasts new number via Socket.io
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Used by Game.tsx and GameScreen.tsx as central game status display
 *   - Receives currentNumber from useGame hook (via Socket.io event)
 *   - Receives calledNumbers array for history display
 *   - Receives autoPlay boolean for status indicator
 *   - Pure presentation component - receives all data as props
 *
 * WebSocket Server Integration (Indirect):
 *   - Does not emit any socket events (read-only display)
 *   - Data comes from useGame hook which listens to 'number_called' event
 *   - Auto-play status from 'auto_play_update' socket event
 *   - Pattern: Server emits -> useGame receives -> NumberCaller renders
 *
 * Solana Program (No Direct Relationship):
 *   - Pure UI component for game status display
 *   - Number calling is ephemeral game state (not on blockchain)
 *   - Blockchain only tracks financial state (prizes, entry fees)
 *
 * KEY RESPONSIBILITIES:
 * 1. Current Number Display: Large, animated display of most recent number
 * 2. Letter Prefix: Show B/I/N/G/O based on number range (B:1-15, I:16-30, etc.)
 * 3. Number History: Display last 10 called numbers in chronological order
 * 4. Auto-Play Indicator: Visual status (ON with green dot, OFF with red dot)
 * 5. Empty State: Show placeholder when no numbers called yet
 * 6. Animations: Smooth transitions when new number appears
 *
 * PROPS:
 * - currentNumber: number | null - Most recently called number (1-75) or null
 * - calledNumbers: number[] - Complete history of all called numbers
 * - autoPlay: boolean - Whether auto-play mode is currently active
 *
 * LETTER MAPPING (from gameLogic.ts):
 * - B: 1-15
 * - I: 16-30
 * - N: 31-45
 * - G: 46-60
 * - O: 61-75
 *
 * COMPONENT STRUCTURE:
 * ```
 * <div> (main container with white background)
 *   ├─ <h2> "Current Number" heading
 *   ├─ <div> Current number display area
 *   │   ├─ AnimatePresence wrapper
 *   │   └─ If currentNumber exists:
 *   │       ├─ Letter (e.g., "B")
 *   │       └─ Number (e.g., "7")
 *   │   └─ Else: "Waiting for numbers..."
 *   ├─ <div> Auto-play status indicator
 *   │   ├─ "Auto-Play:" label
 *   │   └─ ON (green) or OFF (red) with dot
 *   └─ <div> Last 10 numbers section
 *       ├─ <h3> "Last 10 Numbers" heading
 *       └─ Grid of number cards or "No numbers called yet"
 * ```
 *
 * ANIMATIONS:
 * - Framer Motion AnimatePresence for enter/exit
 * - Current number: Scales from 0 to 1 when new number appears
 * - Exit animation: Scales back to 0 when number changes
 * - Smooth opacity transitions (0 to 1)
 * - Animation duration: ~300ms for polished feel
 *
 * VISUAL STATES:
 * - Current Number Present: Large gradient text with letter prefix
 * - No Number Yet: Gray italic placeholder text
 * - Auto-Play ON: Green dot + "ON" text in green
 * - Auto-Play OFF: Red dot + "OFF" text in red
 * - Number History: Small cards with letter + number
 * - Empty History: Gray italic placeholder
 *
 * RESPONSIVE DESIGN:
 * - Mobile: text-4xl for number, text-xl for letter
 * - Tablet (sm): text-5xl for number, text-2xl for letter
 * - Desktop (md): text-6xl for number, text-2xl for letter
 * - Number cards: w-10 h-10 on mobile, w-12 h-12 on tablet+
 * - Flexible wrapping for number history grid
 *
 * NUMBER HISTORY LOGIC:
 * - Shows last 10 numbers only (calledNumbers.slice(-10))
 * - Displays in chronological order (oldest to newest)
 * - Updates dynamically as new numbers are called
 * - Automatically scrolls out oldest when 11th number appears
 *
 * ACCESSIBILITY:
 * - Semantic HTML headings (h2, h3) for structure
 * - Clear visual hierarchy (large current number, smaller history)
 * - High contrast colors for readability
 * - Status indicators with both color and text ("ON"/"OFF")
 *
 * USAGE EXAMPLE:
 * ```tsx
 * function Game() {
 *   const { gameState, autoPlay } = useGame(socket, roomId);
 *
 *   return (
 *     <NumberCaller
 *       currentNumber={gameState.currentNumber}
 *       calledNumbers={gameState.calledNumbers}
 *       autoPlay={autoPlay}
 *     />
 *   );
 * }
 * ```
 *
 * PERFORMANCE NOTES:
 * - Re-renders on any prop change (currentNumber, calledNumbers, autoPlay)
 * - Consider React.memo if parent re-renders frequently
 * - AnimatePresence uses exit animations - may briefly show two numbers
 * - slice(-10) creates new array each render - acceptable for small size
 */

import { motion, AnimatePresence } from 'framer-motion';
import { getLetterForNumber } from '@/utils/gameLogic';


interface NumberCallerProps {
  currentNumber: number | null;
  calledNumbers: number[];
  autoPlay: boolean;
}

export function NumberCaller({ currentNumber, calledNumbers, autoPlay }: NumberCallerProps) {
  return (
    <div className="text-center space-y-4 bg-white p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent mb-2">Current Number</h2>
      
      <div className="min-h-24 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {currentNumber ? (
            <motion.div
              key={currentNumber}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="text-xl sm:text-2xl text-indigo-600 font-medium">
                {getLetterForNumber(currentNumber)}
              </div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {currentNumber}
              </div>
            </motion.div>
          ) : (
            <div className="text-gray-400 italic">Waiting for numbers...</div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-center">
        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-100">
          <span className="text-sm font-medium mr-2 text-indigo-800">Auto-Play:</span>
          <div className="flex items-center gap-1">
            {autoPlay ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs text-green-600 font-medium">ON</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-red-600 font-medium">OFF</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Last 10 Numbers</h3>
        <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
          {calledNumbers.length > 0 ? (
            calledNumbers.slice(-10).map((number) => (
              <div
                key={number}
                className="w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center bg-indigo-50 rounded-lg text-sm shadow-sm"
              >
                <span className="text-xs text-indigo-600">{getLetterForNumber(number)}</span>
                <span className="font-medium text-indigo-900">{number}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400 italic">No numbers called yet</div>
          )}
        </div>
      </div>
    </div>
  );
}