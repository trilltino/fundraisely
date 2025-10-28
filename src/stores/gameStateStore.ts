/**
 * GAME STATE STORE - Game Progress and Mechanics State
 *
 * PURPOSE:
 * Manages active game state including numbers called, winners, auto-play mode,
 * and game status. Separated from player management and UI state for clarity.
 *
 * ROLE IN APPLICATION:
 * - Tracks game started/paused state
 * - Manages called numbers and current number
 * - Stores auto-play mode
 * - Tracks line and full house winners
 * - Manages payment finalization status
 * - Handles win claim states
 *
 * KEY FEATURES:
 * - Clean game state management
 * - Separate from player and UI concerns
 * - Type-safe winner tracking
 * - Computed selectors for common queries
 * - **Immer middleware for immutable updates** (prevents accidental mutations)
 *
 * **IMMER INTEGRATION:**
 * This store uses Zustand's immer middleware to enable mutable-style updates
 * while maintaining immutability under the hood. This pattern:
 * 1. Simplifies complex nested state updates (no manual spreading)
 * 2. Prevents accidental mutations (Immer freezes draft objects in dev mode)
 * 3. Improves performance (Immer uses structural sharing)
 * 4. Follows Zustand best practices (recommended in official docs)
 *
 * **Before (manual immutability):**
 * ```typescript
 * set({
 *   calledNumbers: [...get().calledNumbers, number],
 *   currentNumber: number,
 * });
 * ```
 *
 * **After (Immer draft mutations):**
 * ```typescript
 * set((state) => {
 *   state.calledNumbers.push(number); // Looks mutable, but Immer makes it immutable!
 *   state.currentNumber = number;
 * });
 * ```
 *
 * USAGE:
 * ```typescript
 * import { useGameStateStore } from '@/stores/gameStateStore';
 *
 * function GameStatus() {
 *   const gameStarted = useGameStateStore(state => state.gameStarted);
 *   const currentNumber = useGameStateStore(state => state.currentNumber);
 *   const autoPlay = useGameStateStore(state => state.autoPlay);
 *
 *   return (
 *     <div>
 *       Status: {gameStarted ? 'Playing' : 'Waiting'}
 *       Current: {currentNumber || 'None'}
 *       Auto: {autoPlay ? 'ON' : 'OFF'}
 *     </div>
 *   );
 * }
 * ```
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface Winner {
  id: string;
  name: string;
}

export interface GameStateStore {
  // Game status
  gameStarted: boolean;
  isPaused: boolean;
  autoPlay: boolean;

  // Numbers
  currentNumber: number | null;
  calledNumbers: number[];

  // Winners
  lineWinners: Winner[];
  fullHouseWinners: Winner[];
  lineWinClaimed: boolean;

  // Win tracking (for current player)
  hasWonLine: boolean;
  hasWonFullHouse: boolean;

  // Legacy (for backwards compatibility)
  hasWon: boolean;
  winner: string | null;

  // Payment
  paymentsFinalized: boolean;

  // Actions
  setGameStarted: (started: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setAutoPlay: (autoPlay: boolean) => void;
  setCurrentNumber: (number: number | null) => void;
  setCalledNumbers: (numbers: number[]) => void;
  addCalledNumber: (number: number) => void;
  setLineWinners: (winners: Winner[]) => void;
  setFullHouseWinners: (winners: Winner[]) => void;
  setLineWinClaimed: (claimed: boolean) => void;
  setHasWonLine: (hasWon: boolean) => void;
  setHasWonFullHouse: (hasWon: boolean) => void;
  setPaymentsFinalized: (finalized: boolean) => void;
  resetGameState: () => void;

  // Selectors
  isNumberCalled: (number: number) => boolean;
  hasWinner: () => boolean;
}

// Initial state factory
const createInitialState = () => ({
  gameStarted: false,
  isPaused: false,
  autoPlay: false,
  currentNumber: null,
  calledNumbers: [],
  lineWinners: [],
  fullHouseWinners: [],
  lineWinClaimed: false,
  hasWonLine: false,
  hasWonFullHouse: false,
  hasWon: false,
  winner: null,
  paymentsFinalized: false,
});

export const useGameStateStore = create<GameStateStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    // Set game started
    // With Immer: Direct property assignment, Immer handles immutability
    setGameStarted: (gameStarted) => {
      set((state) => {
        if (state.gameStarted !== gameStarted) {
          state.gameStarted = gameStarted;
        }
      });
    },

    // Set paused state
    setIsPaused: (isPaused) => {
      set((state) => {
        if (state.isPaused !== isPaused) {
          state.isPaused = isPaused;
        }
      });
    },

    // Set auto-play mode
    setAutoPlay: (autoPlay) => {
      set((state) => {
        if (state.autoPlay !== autoPlay) {
          state.autoPlay = autoPlay;
        }
      });
    },

    // Set current number
    setCurrentNumber: (currentNumber) => {
      set((state) => {
        if (state.currentNumber !== currentNumber) {
          state.currentNumber = currentNumber;
        }
      });
    },

    // Set all called numbers
    setCalledNumbers: (calledNumbers) => {
      set((state) => {
        state.calledNumbers = calledNumbers;
      });
    },

    // Add a single called number
    // With Immer: Use array.push() instead of spreading [...arr, item]
    addCalledNumber: (number) => {
      set((state) => {
        if (!state.calledNumbers.includes(number)) {
          state.calledNumbers.push(number); // Immer makes this immutable!
          state.currentNumber = number;
        }
      });
    },

    // Set line winners
    setLineWinners: (lineWinners) => {
      set((state) => {
        state.lineWinners = lineWinners;
      });
    },

    // Set full house winners
    setFullHouseWinners: (fullHouseWinners) => {
      set((state) => {
        state.fullHouseWinners = fullHouseWinners;
      });
    },

    // Set line win claimed
    setLineWinClaimed: (lineWinClaimed) => {
      set((state) => {
        if (state.lineWinClaimed !== lineWinClaimed) {
          state.lineWinClaimed = lineWinClaimed;
        }
      });
    },

    // Set current player's line win
    setHasWonLine: (hasWonLine) => {
      set((state) => {
        if (state.hasWonLine !== hasWonLine) {
          state.hasWonLine = hasWonLine;
        }
      });
    },

    // Set current player's full house win
    setHasWonFullHouse: (hasWonFullHouse) => {
      set((state) => {
        if (state.hasWonFullHouse !== hasWonFullHouse) {
          state.hasWonFullHouse = hasWonFullHouse;
        }
      });
    },

    // Set payments finalized
    setPaymentsFinalized: (paymentsFinalized) => {
      set((state) => {
        if (state.paymentsFinalized !== paymentsFinalized) {
          state.paymentsFinalized = paymentsFinalized;
        }
      });
    },

    // Reset to initial state
    // With Immer: Assign all properties from initial state
    resetGameState: () => {
      set((state) => {
        const initial = createInitialState();
        Object.assign(state, initial);
      });
    },

    // Check if number was called
    isNumberCalled: (number) => {
      return get().calledNumbers.includes(number);
    },

    // Check if there's any winner
    hasWinner: () => {
      const state = get();
      return state.lineWinners.length > 0 || state.fullHouseWinners.length > 0;
    },
  }))
);

export default useGameStateStore;
