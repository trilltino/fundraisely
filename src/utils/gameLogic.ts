/**
 * GAME LOGIC UTILITY - Core Bingo Game Mechanics & Algorithms
 *
 * PURPOSE:
 * This utility module implements the fundamental algorithms and logic for Bingo gameplay.
 * It handles card generation, win detection, and number-to-letter mapping following
 * traditional Bingo rules. This is a pure, stateless utility module with no side effects,
 * making it easily testable and reusable across the application.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Generates random, unique Bingo cards for each player at game start
 * - Validates win conditions (line and full house) based on marked cells
 * - Maps numbers to B-I-N-G-O letter prefixes for display
 * - Provides deterministic, testable game logic separate from UI/state
 * - Ensures fair play with proper randomization and validation
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Used by useGame hook to generate player's card on initialization
 *   - Called by BingoCard component to check wins after each cell mark
 *   - Used by NumberCaller component to display letter prefixes
 *   - Pure functions - no React hooks, no state, no side effects
 *   - Can be unit tested independently of React components
 *
 * WebSocket Server Integration (None):
 *   - This is client-side only logic
 *   - Server has its own game state management (GameManager.js)
 *   - Cards generated client-side, only marked state sent to server
 *
 * Solana Program (No Direct Relationship):
 *   - Game mechanics are ephemeral (not stored on blockchain)
 *   - Blockchain only involved in financial operations
 *   - Win detection happens client-side, validation server-side
 *
 * KEY RESPONSIBILITIES:
 * 1. Card Generation: Create random 5x5 Bingo cards with unique numbers
 * 2. Win Detection: Check for line wins (rows, columns, diagonals) and full house
 * 3. Letter Mapping: Map numbers 1-75 to B/I/N/G/O letters
 * 4. Randomization: Ensure fair, unique number selection within column ranges
 * 5. Validation: Verify win patterns match official Bingo rules
 *
 * BINGO COLUMN RULES:
 * - B: Numbers 1-15 (first column)
 * - I: Numbers 16-30 (second column)
 * - N: Numbers 31-45 (third column)
 * - G: Numbers 46-60 (fourth column)
 * - O: Numbers 61-75 (fifth column)
 * Each column contains exactly 5 numbers from its range
 *
 * CARD GENERATION ALGORITHM:
 * 1. For each column (B, I, N, G, O):
 *    a. Get available numbers in column range (e.g., 1-15 for B)
 *    b. Exclude already-used numbers to ensure uniqueness
 *    c. Randomly select 5 numbers from available pool
 *    d. Sort numbers in ascending order within column
 * 2. Arrange columns to create 5x5 grid (25 total cells)
 * 3. Card layout: [B1-B5, I1-I5, N1-N5, G1-G5, O1-O5]
 *
 * WIN PATTERNS:
 * The game supports 12 different winning patterns:
 * - 5 Rows: Horizontal lines (indices 0-4, 5-9, 10-14, 15-19, 20-24)
 * - 5 Columns: Vertical lines (indices 0,5,10,15,20 | 1,6,11,16,21 | etc.)
 * - 2 Diagonals: Top-left to bottom-right & top-right to bottom-left
 * - Full House: All 25 cells marked
 *
 * LINE WIN LOGIC:
 * - Checks all 12 patterns (rows, columns, diagonals)
 * - First pattern where ALL cells are marked = LINE WIN
 * - Only checks if lineWinClaimed is false (one line win per game)
 * - Returns winning pattern indices for visual highlighting
 *
 * FULL HOUSE LOGIC:
 * - Checks if ALL 25 cells are marked
 * - Only triggers after line win claimed (or if line not required)
 * - Represents game completion
 * - Triggers prize distribution on blockchain
 *
 * DATA STRUCTURES:
 *
 * BingoCell:
 *   - number: number (1-75) - The Bingo number
 *   - marked: boolean - Whether player has marked this cell
 *
 * WinResult:
 *   - type: 'none' | 'line' | 'full_house' - Type of win detected
 *   - pattern?: number[] - Indices of winning cells (for line wins)
 *
 * FUNCTIONS:
 *
 * generateBingoCard(): number[]
 *   - Generates array of 25 unique random numbers
 *   - Follows B-I-N-G-O column rules
 *   - Returns sorted columns, unsorted globally
 *   - Pure function - different output each call
 *
 * checkWin(card: BingoCell[], lineWinClaimed: boolean): WinResult
 *   - Checks current card state for wins
 *   - Returns first matching win pattern
 *   - Respects lineWinClaimed to prevent duplicate line wins
 *   - Pure function - same input = same output
 *
 * getLetterForNumber(num: number): string
 *   - Maps number to B/I/N/G/O letter
 *   - Returns empty string if number out of range
 *   - Used for display purposes only
 *   - Pure function - deterministic mapping
 *
 * getRandomNumberInRange(min, max, exclude): number
 *   - Private helper for random selection
 *   - Excludes already-used numbers
 *   - Ensures uniqueness across card
 *   - Uniform distribution within range
 *
 * USAGE EXAMPLES:
 *
 * ```typescript
 * // Generate new card
 * const cardNumbers = generateBingoCard();
 * const card = cardNumbers.map(num => ({ number: num, marked: false }));
 *
 * // Check for wins after marking
 * const winResult = checkWin(card, lineWinClaimed);
 * if (winResult.type === 'line') {
 *   console.log('Line win!', winResult.pattern);
 * } else if (winResult.type === 'full_house') {
 *   console.log('Full house!');
 * }
 *
 * // Get letter for number display
 * const letter = getLetterForNumber(42); // "N"
 * ```
 *
 * TESTING CONSIDERATIONS:
 * - All functions are pure (no side effects)
 * - Deterministic output for same inputs (except generateBingoCard)
 * - Easy to unit test with Jest or Vitest
 * - No mocking required (no dependencies)
 * - Test cases: valid wins, invalid patterns, edge cases
 *
 * PERFORMANCE NOTES:
 * - Card generation: O(75) - iterates through all possible numbers
 * - Win checking: O(12 * 5) = O(60) - checks 12 patterns of 5 cells
 * - Letter mapping: O(1) - constant time lookup
 * - All operations complete in < 1ms
 */

// gameLogic.ts
import type { BingoCell } from '../types/game';

const BINGO_COLUMNS = [
  { letter: 'B', range: [1, 15] },
  { letter: 'I', range: [16, 30] },
  { letter: 'N', range: [31, 45] },
  { letter: 'G', range: [46, 60] },
  { letter: 'O', range: [61, 75] },
] as const;

function getRandomNumberInRange(min: number, max: number, exclude: Set<number>): number {
  const available = Array.from(
    { length: max - min + 1 },
    (_, i) => min + i
  ).filter(num => !exclude.has(num));

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

export function generateBingoCard(): number[] {
  const usedNumbers = new Set<number>();
  const card: number[] = [];

  for (const { range } of BINGO_COLUMNS) {
    const [min, max] = range;
    const columnNumbers: number[] = [];

    while (columnNumbers.length < 5) {
      const num = getRandomNumberInRange(min, max, usedNumbers);
      usedNumbers.add(num);
      columnNumbers.push(num);
    }

    columnNumbers.sort((a, b) => a - b);
    card.push(...columnNumbers);
  }

  return card;
}

export function getLetterForNumber(num: number): string {
  const column = BINGO_COLUMNS.find(({ range }) => {
    const [min, max] = range;
    return num >= min && num <= max;
  });
  return column?.letter || '';
}

export interface WinResult {
  type: 'none' | 'line' | 'full_house';
  pattern?: number[];
}

export function checkWin(card: BingoCell[], lineWinClaimed: boolean): WinResult {
  const winningPatterns = [
    // Rows
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    // Columns
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    // Diagonals
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
  ];

  if (!lineWinClaimed) {
    for (const pattern of winningPatterns) {
      if (pattern.every(index => card[index].marked)) {
        return { type: 'line', pattern };
      }
    }
  }

  if (card.every(cell => cell.marked)) {
    return { type: 'full_house' };
  }

  return { type: 'none' };
}