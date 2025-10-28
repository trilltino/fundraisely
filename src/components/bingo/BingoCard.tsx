/**
 * BINGO CARD COMPONENT - Interactive 5x5 Bingo Grid Display
 *
 * PURPOSE:
 * This component renders the interactive Bingo card that players use during gameplay.
 * It displays a 5x5 grid of numbers with the classic "B-I-N-G-O" header, handles cell
 * click interactions for marking numbers, and provides visual feedback for marked cells
 * with smooth animations.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Displays player's unique Bingo card (generated at game start)
 * - Provides tactile interface for marking numbers as they're called
 * - Shows real-time visual state (marked vs unmarked cells)
 * - Emits click events to parent component (useGame hook) for game logic
 * - Updates immediately when player marks/unmarks cells
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Used by Game.tsx and GameScreen.tsx as primary gameplay interface
 *   - Receives cells array from useGame hook (25 BingoCell objects)
 *   - Calls onCellClick callback when player clicks a cell
 *   - Parent handles validation (was number called?), win detection, socket emission
 *   - Pure presentation component - no game logic, just UI and interaction
 *
 * WebSocket Server Integration (Indirect):
 *   - Component itself doesn't interact with sockets
 *   - Parent (useGame) handles socket communication after cell clicks
 *   - Pattern: Click -> onCellClick -> useGame -> socket.emit('update_card')
 *
 * Solana Program (No Direct Relationship):
 *   - This is a pure UI component for gameplay
 *   - Card state is ephemeral (not stored on blockchain)
 *   - Blockchain only involved in financial operations (entry fees, prizes)
 *
 * KEY RESPONSIBILITIES:
 * 1. Rendering: Display 5x5 grid with "B-I-N-G-O" header
 * 2. Interaction: Handle cell clicks and pass to parent via callback
 * 3. Visual Feedback: Animate cell clicks and show marked/unmarked states
 * 4. Responsiveness: Scale appropriately for mobile, tablet, desktop
 * 5. Accessibility: Interactive buttons with proper hover/tap states
 *
 * COMPONENT STRUCTURE:
 * ```
 * <div> (outer container)
 *   ├─ "B" "I" "N" "G" "O" headers (5 divs)
 *   └─ 25 cell buttons arranged by column
 *      ├─ Column 0: B1-B15 (indices 0, 5, 10, 15, 20)
 *      ├─ Column 1: I16-I30 (indices 1, 6, 11, 16, 21)
 *      ├─ Column 2: N31-N45 (indices 2, 7, 12, 17, 22)
 *      ├─ Column 3: G46-G60 (indices 3, 8, 13, 18, 23)
 *      └─ Column 4: O61-O75 (indices 4, 9, 14, 19, 24)
 * ```
 *
 * PROPS:
 * - cells: BingoCell[] - Array of 25 cells with {number, marked} properties
 * - onCellClick: (index: number) => void - Callback when player clicks a cell
 *
 * CELL STATE:
 * BingoCell interface:
 *   - number: number (1-75) - The Bingo number in this cell
 *   - marked: boolean - Whether player has marked this cell
 *
 * VISUAL STATES:
 * - Unmarked: Gray background (bg-gray-100), hover effect
 * - Marked: Green gradient (from-green-500 to-teal-500), white text
 * - Hover: Scale up slightly (1.05x) for feedback
 * - Click: Scale down slightly (0.95x) for tactile feel
 *
 * ANIMATIONS:
 * - Framer Motion for smooth interactions
 * - whileHover: Scales button to 1.05
 * - whileTap: Scales button to 0.95
 * - Transition: 200ms color change for mark/unmark
 *
 * LAYOUT ALGORITHM:
 * - getColumnCells(colIndex): Returns 5 cells for given column
 * - Cells arranged by COLUMN first (not row), matching Bingo card standard
 * - Index calculation: row * 5 + col (e.g., center cell = 2*5+2 = 12)
 *
 * RESPONSIVE DESIGN:
 * - Mobile (default): h-10, text-base, gap-1, p-4
 * - Tablet (sm): h-12, text-lg, gap-2, p-6
 * - Desktop (md): h-16, text-xl, gap-2, p-6
 * - Max width: 2xl (672px), centered with mx-auto
 *
 * ACCESSIBILITY:
 * - Semantic HTML: button elements for interactive cells
 * - Keyboard navigable: Tab through cells, Space/Enter to activate
 * - Clear visual states: Color contrast for marked vs unmarked
 * - Touch targets: Minimum 40x40px (h-10 = 2.5rem = 40px)
 *
 * USAGE EXAMPLE:
 * ```tsx
 * function Game() {
 *   const { gameState, handleCellClick } = useGame(socket, roomId);
 *
 *   return (
 *     <BingoCard
 *       cells={gameState.card}
 *       onCellClick={handleCellClick}
 *     />
 *   );
 * }
 * ```
 *
 * PERFORMANCE NOTES:
 * - Re-renders when cells array reference changes
 * - Optimize with React.memo if parent re-renders frequently
 * - Motion animations run on GPU (transform/scale) for smoothness
 */

import { motion } from 'framer-motion';
import { memo } from 'react';
import type { BingoCell } from '../../types/game';
import { cn } from '../../utils/cn';

interface BingoCardProps {
  cells: BingoCell[];
  onCellClick: (index: number) => void;
}

/**
 * BingoCard Component
 *
 * ✅ OPTIMIZED: Wrapped with React.memo to prevent unnecessary re-renders
 * This component re-renders frequently during gameplay, so memoization is critical.
 */
export const BingoCard = memo(function BingoCard({ cells, onCellClick }: BingoCardProps) {
  const getColumnCells = (colIndex: number) =>
    Array.from({ length: 5 }, (_, row) => cells[row * 5 + colIndex]);
  
  return (
    <div className="grid grid-cols-5 gap-1 sm:gap-2 p-4 sm:p-6 bg-white rounded-2xl shadow-xl max-w-2xl mx-auto">
      {['B', 'I', 'N', 'G', 'O'].map((letter) => (
        <div
          key={letter}
          className="flex items-center justify-center h-10 sm:h-12 md:h-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg sm:text-xl md:text-2xl font-bold rounded-lg"
        >
          {letter}
        </div>
      ))}
      {['B', 'I', 'N', 'G', 'O'].map((_, colIndex) =>
        getColumnCells(colIndex).map((cell, rowIndex) => {
          const index = rowIndex * 5 + colIndex;
          return (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCellClick(index)}
              className={cn(
                "h-10 sm:h-12 md:h-16 rounded-lg text-base sm:text-lg md:text-xl font-semibold transition-colors duration-200 shadow",
                cell.marked
                  ? "bg-gradient-to-r from-green-500 to-teal-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              )}
            >
              {cell.number}
            </motion.button>
          );
        })
      )}
    </div>
  );
});