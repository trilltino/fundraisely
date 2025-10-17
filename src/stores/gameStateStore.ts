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

export const useGameStateStore = create<GameStateStore>()((set, get) => ({
  ...createInitialState(),

  // Set game started
  setGameStarted: (gameStarted) => {
    if (get().gameStarted !== gameStarted) {
      set({ gameStarted });
    }
  },

  // Set paused state
  setIsPaused: (isPaused) => {
    if (get().isPaused !== isPaused) {
      set({ isPaused });
    }
  },

  // Set auto-play mode
  setAutoPlay: (autoPlay) => {
    if (get().autoPlay !== autoPlay) {
      set({ autoPlay });
    }
  },

  // Set current number
  setCurrentNumber: (currentNumber) => {
    if (get().currentNumber !== currentNumber) {
      set({ currentNumber });
    }
  },

  // Set all called numbers
  setCalledNumbers: (calledNumbers) => {
    set({ calledNumbers });
  },

  // Add a single called number
  addCalledNumber: (number) => {
    const { calledNumbers } = get();
    if (!calledNumbers.includes(number)) {
      set({
        calledNumbers: [...calledNumbers, number],
        currentNumber: number,
      });
    }
  },

  // Set line winners
  setLineWinners: (lineWinners) => {
    set({ lineWinners });
  },

  // Set full house winners
  setFullHouseWinners: (fullHouseWinners) => {
    set({ fullHouseWinners });
  },

  // Set line win claimed
  setLineWinClaimed: (lineWinClaimed) => {
    if (get().lineWinClaimed !== lineWinClaimed) {
      set({ lineWinClaimed });
    }
  },

  // Set current player's line win
  setHasWonLine: (hasWonLine) => {
    if (get().hasWonLine !== hasWonLine) {
      set({ hasWonLine });
    }
  },

  // Set current player's full house win
  setHasWonFullHouse: (hasWonFullHouse) => {
    if (get().hasWonFullHouse !== hasWonFullHouse) {
      set({ hasWonFullHouse });
    }
  },

  // Set payments finalized
  setPaymentsFinalized: (paymentsFinalized) => {
    if (get().paymentsFinalized !== paymentsFinalized) {
      set({ paymentsFinalized });
    }
  },

  // Reset to initial state
  resetGameState: () => {
    set(createInitialState());
  },

  // Check if number was called
  isNumberCalled: (number) => {
    return get().calledNumbers.includes(number);
  },

  // Check if there's any winner
  hasWinner: () => {
    const { lineWinners, fullHouseWinners } = get();
    return lineWinners.length > 0 || fullHouseWinners.length > 0;
  },
}));

export default useGameStateStore;
