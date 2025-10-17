/**
 * GAME STORE - Global State Management with Zustand
 *
 * PURPOSE:
 * This module implements the global state management for the entire Fundraisely Bingo game
 * using Zustand. It provides a centralized, reactive state store that's accessible from any
 * component in the application. This store holds all game-related state including players,
 * socket connection, game progress, winners, and UI states.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Centralized state accessible across all React components
 * - Socket instance storage for WebSocket communication
 * - Real-time player list synchronization
 * - Game state tracking (started, paused, winners, numbers called)
 * - Winner management (line winners, full house winners)
 * - Payment finalization tracking
 * - Win notification UI state
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Used by ALL game-related components (Game.tsx, GameControls, etc.)
 *   - useSocket hook stores socket instance in this store
 *   - useGame hook reads/writes game state from/to this store
 *   - Components subscribe to specific slices to minimize re-renders
 *   - Provides reset function to clear state between games
 *
 * WebSocket Server Integration:
 *   - Stores socket instance for emit/listen operations
 *   - Updates state based on 'room_update' events from server
 *   - Syncs players, game status, winners from server broadcasts
 *   - Handles reconnection state management
 *
 * Solana Program Coordination:
 *   - Tracks payment finalization status (when prizes distributed)
 *   - Stores player wallet addresses for transaction signing
 *   - Doesn't interact with blockchain directly (UI state only)
 *   - paymentsFinalized flag indicates Solana transaction complete
 *
 * KEY RESPONSIBILITIES:
 * 1. Socket Management: Store and access Socket.io client instance
 * 2. Player State: Track all players in room (names, wallets, ready status)
 * 3. Game State: Track game started, current number, called numbers, auto-play
 * 4. Winner Management: Store line winners and full house winners
 * 5. Pause State: Track when game is paused by host
 * 6. Payment Tracking: Know when Solana prize distribution complete
 * 7. UI State: Manage win notifications and other ephemeral UI states
 * 8. State Reset: Clean slate for new games
 *
 * STATE STRUCTURE:
 *
 * Socket & Connection:
 *   - socket: Socket | null - Socket.io client instance
 *   - joinError: string - Error message from join/create attempts
 *
 * Player Management:
 *   - players: Player[] - Array of all players in room
 *   - playerName: string - Current user's display name
 *
 * Game Progress:
 *   - gameStarted: boolean - Whether game has begun
 *   - currentNumber: number | null - Most recently called number
 *   - calledNumbers: number[] - All numbers called so far
 *   - autoPlay: boolean - Auto-play mode enabled
 *   - isPaused: boolean - Game paused by host
 *
 * Win State:
 *   - hasWon: boolean - Current player has won (legacy, use hasWonLine/FullHouse)
 *   - winner: string | null - Winner name (legacy)
 *   - hasWonLine: boolean - Current player won line prize
 *   - hasWonFullHouse: boolean - Current player won full house
 *   - lineWinClaimed: boolean - Line prize already awarded
 *   - lineWinners: {id, name}[] - All line winners
 *   - fullHouseWinners: {id, name}[] - All full house winners
 *
 * Payment State:
 *   - paymentsFinalized: boolean - Solana transaction complete
 *
 * UI State (Win Notifications):
 *   - showWinNotification: boolean - Display win toast/modal
 *   - winNotificationType: 'line' | 'fullHouse' | '' - Type of win to show
 *   - winnerName: string - Name of winner to display
 *
 * ZUSTAND PATTERN:
 * - create() function from zustand creates React hook
 * - Store holds state + setter functions
 * - Components call useGameStore() to access state
 * - Automatically triggers re-renders when subscribed state changes
 * - Can select specific slices: useGameStore(state => state.players)
 *
 * STATE UPDATE PATTERN:
 * ```typescript
 * // Direct update
 * const setPlayers = useGameStore(state => state.setPlayers);
 * setPlayers([...newPlayers]);
 *
 * // Or destructure
 * const { players, setPlayers } = useGameStore();
 *
 * // Direct store access (outside components)
 * useGameStore.getState().setPlayers([...newPlayers]);
 * ```
 *
 * RESET FUNCTIONALITY:
 * - resetGameState() clears all state except socket connection
 * - Called when navigating to new game or returning to lobby
 * - Preserves socket to allow reconnection
 * - Prevents stale state bleeding into new games
 *
 * USAGE EXAMPLES:
 *
 * ```typescript
 * // In a component
 * import { useGameStore } from '../stores/gameStore';
 *
 * function MyComponent() {
 *   // Subscribe to entire store (causes re-render on any change)
 *   const { players, gameStarted, setPlayers } = useGameStore();
 *
 *   // Subscribe to specific slice (more efficient)
 *   const players = useGameStore(state => state.players);
 *
 *   // Update state
 *   const handleJoin = () => {
 *     setPlayers([...players, newPlayer]);
 *   };
 *
 *   return <div>{players.length} players</div>;
 * }
 *
 * // Outside components (e.g., in hooks)
 * useGameStore.getState().setGameStarted(true);
 * const currentPlayers = useGameStore.getState().players;
 * ```
 *
 * INTEGRATION WITH LOCAL STORAGE:
 * - This store holds ephemeral state (lost on refresh)
 * - useSocket hook persists some data to localStorage (roomId, playerName)
 * - Payment finalization persisted to localStorage for verification
 * - Pattern: Zustand (runtime) + localStorage (persistence)
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Use slice selectors to prevent unnecessary re-renders
 * - Zustand uses shallow equality check by default
 * - Avoid subscribing to entire store if only need one field
 * - resetGameState() is cheap (simple object assignment)
 *
 * MIGRATION NOTES:
 * - Some legacy fields (hasWon, winner) maintained for backwards compatibility
 * - New code should use hasWonLine/hasWonFullHouse instead
 * - Win notification state added later for enhanced UX
 *
 * RELATED FILES:
 * - src/hooks/useSocket.ts - Updates this store with server data
 * - src/hooks/useGame.ts - Reads/writes game state
 * - src/pages/Game.tsx - Main consumer of this store
 * - src/components/* - Various components read slices of this store
 */

import { create } from 'zustand';
import { Player } from '../types/game';

interface GameStore {
  socket: any;
  setSocket: (socket: any) => void;
  players: Player[];
  setPlayers: (players: Player[]) => void;
  gameStarted: boolean;
  setGameStarted: (started: boolean) => void;
  currentNumber: number | null;
  setCurrentNumber: (number: number | null) => void;
  calledNumbers: number[];
  setCalledNumbers: (numbers: number[]) => void;
  autoPlay: boolean;
  setAutoPlay: (autoPlay: boolean) => void;
  hasWon: boolean;
  setHasWon: (hasWon: boolean) => void;
  winner: string | null;
  setWinner: (winner: string | null) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  joinError: string;
  setJoinError: (error: string) => void;
  hasWonLine: boolean;
  setHasWonLine: (hasWon: boolean) => void;
  hasWonFullHouse: boolean;
  setHasWonFullHouse: (hasWon: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  lineWinClaimed: boolean;
  setLineWinClaimed: (claimed: boolean) => void;
  lineWinners: { id: string; name: string }[];
  setLineWinners: (winners: { id: string; name: string }[]) => void;
  fullHouseWinners: { id: string; name: string }[];
  setFullHouseWinners: (winners: { id: string; name: string }[]) => void;
  paymentsFinalized: boolean;
  setPaymentsFinalized: (status: boolean) => void;

  // [COMPLETE] NEW WIN EFFECTS STATE
  showWinNotification: boolean;
  setShowWinNotification: (show: boolean) => void;
  winNotificationType: 'line' | 'fullHouse' | '';
  setWinNotificationType: (type: 'line' | 'fullHouse' | '') => void;
  winnerName: string;
  setWinnerName: (name: string) => void;

  resetGameState: () => void;
}

// [COMPLETE] Define the store logic separately
const store = (set: any, get: () => GameStore): GameStore => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
  players: [],
  setPlayers: (players) => set({ players }),
  gameStarted: false,
  setGameStarted: (started) => set({ gameStarted: started }),
  currentNumber: null,
  setCurrentNumber: (number) => set({ currentNumber: number }),
  calledNumbers: [],
  setCalledNumbers: (numbers) => set({ calledNumbers: numbers }),
  autoPlay: false,
  setAutoPlay: (autoPlay) => set({ autoPlay }),
  hasWon: false,
  setHasWon: (hasWon) => set({ hasWon }),
  winner: null,
  setWinner: (winner) => set({ winner }),
  playerName: '',
  setPlayerName: (name) => set({ playerName: name }),
  joinError: '',
  setJoinError: (error) => set({ joinError: error }),
  hasWonLine: false,
  setHasWonLine: (hasWon) => set({ hasWonLine: hasWon }),
  hasWonFullHouse: false,
  setHasWonFullHouse: (hasWon) => set({ hasWonFullHouse: hasWon }),
  isPaused: false,
  setIsPaused: (paused) => set({ isPaused: paused }),
  lineWinClaimed: false,
  setLineWinClaimed: (claimed) => set({ lineWinClaimed: claimed }),
  lineWinners: [],
  setLineWinners: (winners) => set({ lineWinners: winners }),
  fullHouseWinners: [],
  setFullHouseWinners: (winners) => set({ fullHouseWinners: winners }),
  paymentsFinalized: false,
  setPaymentsFinalized: (status) => set({ paymentsFinalized: status }),
  showWinNotification: false,
  setShowWinNotification: (show) => set({ showWinNotification: show }),
  winNotificationType: '',
  setWinNotificationType: (type) => set({ winNotificationType: type }),
  winnerName: '',
  setWinnerName: (name) => set({ winnerName: name }),

  resetGameState: () => {
    const currentSocket = get().socket;
    set({
      socket: currentSocket,
      players: [],
      gameStarted: false,
      currentNumber: null,
      calledNumbers: [],
      autoPlay: false,
      hasWon: false,
      winner: null,
      playerName: '',
      joinError: '',
      hasWonLine: false,
      hasWonFullHouse: false,
      isPaused: false,
      lineWinClaimed: false,
      lineWinners: [],
      fullHouseWinners: [],
      paymentsFinalized: false,
      showWinNotification: false,
      winNotificationType: '',
      winnerName: '',
    });
  },
});

// [COMPLETE] Export the hook
export const useGameStore = create<GameStore>(store);
