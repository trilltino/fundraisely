/**
 * Winner Display - Bingo Game Winner Announcement Component
 *
 * **Purpose:** Displays line and full house winners during/after Bingo game. Shows winner
 * names in colored badges differentiating line winners (indigo) from full house winners (purple).
 *
 * **Winner Types:**
 * - **Line Winners**: Players who completed any valid line (horizontal/vertical/diagonal)
 * - **Full House Winners**: Players who marked all 25 cells on their card
 *
 * **Display:** Line winners in indigo badges, full house winners in purple badges.
 * **Empty state:** Returns null if no winners.
 *
 * @component
 * @category Bingo Components
 */

// src/components/WinnerDisplay.tsx
import type React from 'react';

interface Winner {
  id: string;
  name: string;
}

interface WinnerDisplayProps {
  lineWinners: Winner[];
  fullHouseWinners: Winner[];
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ lineWinners, fullHouseWinners }) => {
  if (lineWinners.length === 0 && fullHouseWinners.length === 0) return null;

  return (
    <div className="mb-6 text-center">
      <h2 className="text-xl font-semibold text-indigo-800">Winners</h2>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {lineWinners.map(winner => (
          <span key={winner.id} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full">
            {winner.name} (Line)
          </span>
        ))}
        {fullHouseWinners.map(winner => (
          <span key={winner.id} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
            {winner.name} (Full House)
          </span>
        ))}
      </div>
    </div>
  );
};
