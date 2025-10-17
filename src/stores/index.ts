/**
 * STORES INDEX - Centralized Store Exports & Migration Utilities
 *
 * PURPOSE:
 * Provides centralized exports for all domain-specific stores and migration
 * utilities to help transition from the monolithic gameStore to the new
 * modular store architecture.
 *
 * MIGRATION GUIDE:
 * Old gameStore has been split into:
 * - walletStore: Wallet connection state
 * - playerStore: Player and room data
 * - gameStateStore: Game progress and mechanics
 * - uiStore: UI-only state (modals, notifications)
 * - socketStore: Socket connection state
 *
 * USAGE:
 * ```typescript
 * // Before (old monolithic store)
 * import { useGameStore } from '@/stores/gameStore';
 * const { players, gameStarted, socket } = useGameStore();
 *
 * // After (new modular stores)
 * import { usePlayerStore, useGameStateStore, useSocketStore } from '@/stores';
 * const players = usePlayerStore(state => state.players);
 * const gameStarted = useGameStateStore(state => state.gameStarted);
 * const socket = useSocketStore(state => state.socket);
 * ```
 */

// Import stores first
import { useWalletStore } from './walletStore';
import { usePlayerStore } from './playerStore';
import { useGameStateStore } from './gameStateStore';
import { useUIStore } from './uiStore';
import { useSocketStore, ConnectionState } from './socketStore';

// Re-export all stores
export { useWalletStore, usePlayerStore, useGameStateStore, useUIStore, useSocketStore, ConnectionState };

// Export types
export type { WalletState } from './walletStore';
export type { PlayerStore } from './playerStore';
export type { GameStateStore, Winner } from './gameStateStore';
export type { UIStore, Notification } from './uiStore';
export type { SocketStore } from './socketStore';

/**
 * Migration utility: Reset all stores
 * Use when navigating away from game or starting fresh
 */
export const resetAllStores = () => {
  const { resetWallet } = useWalletStore.getState();
  const { resetPlayerStore } = usePlayerStore.getState();
  const { resetGameState } = useGameStateStore.getState();
  const { resetUIStore } = useUIStore.getState();
  const { resetSocketStore } = useSocketStore.getState();

  resetWallet();
  resetPlayerStore();
  resetGameState();
  resetUIStore();
  resetSocketStore();
};

/**
 * Migration utility: Get combined state (for debugging)
 * Returns snapshot of all store states
 */
export const getAllStoreState = () => {
  return {
    wallet: useWalletStore.getState(),
    player: usePlayerStore.getState(),
    gameState: useGameStateStore.getState(),
    ui: useUIStore.getState(),
    socket: useSocketStore.getState(),
  };
};

/**
 * Migration mapping from old gameStore to new stores
 * Use this guide when refactoring components
 */
export const MIGRATION_MAP = {
  // Socket-related
  socket: 'socketStore.socket',
  setSocket: 'socketStore.setSocket',

  // Player-related
  players: 'playerStore.players',
  setPlayers: 'playerStore.setPlayers',
  playerName: 'playerStore.playerName',
  setPlayerName: 'playerStore.setPlayerName',
  joinError: 'playerStore.joinError',
  setJoinError: 'playerStore.setJoinError',

  // Game state
  gameStarted: 'gameStateStore.gameStarted',
  setGameStarted: 'gameStateStore.setGameStarted',
  currentNumber: 'gameStateStore.currentNumber',
  setCurrentNumber: 'gameStateStore.setCurrentNumber',
  calledNumbers: 'gameStateStore.calledNumbers',
  setCalledNumbers: 'gameStateStore.setCalledNumbers',
  autoPlay: 'gameStateStore.autoPlay',
  setAutoPlay: 'gameStateStore.setAutoPlay',
  isPaused: 'gameStateStore.isPaused',
  setIsPaused: 'gameStateStore.setIsPaused',
  lineWinners: 'gameStateStore.lineWinners',
  setLineWinners: 'gameStateStore.setLineWinners',
  fullHouseWinners: 'gameStateStore.fullHouseWinners',
  setFullHouseWinners: 'gameStateStore.setFullHouseWinners',
  lineWinClaimed: 'gameStateStore.lineWinClaimed',
  setLineWinClaimed: 'gameStateStore.setLineWinClaimed',
  hasWonLine: 'gameStateStore.hasWonLine',
  setHasWonLine: 'gameStateStore.setHasWonLine',
  hasWonFullHouse: 'gameStateStore.hasWonFullHouse',
  setHasWonFullHouse: 'gameStateStore.setHasWonFullHouse',
  paymentsFinalized: 'gameStateStore.paymentsFinalized',
  setPaymentsFinalized: 'gameStateStore.setPaymentsFinalized',

  // UI state
  showWinNotification: 'uiStore.showWinNotification',
  setShowWinNotification: 'uiStore.setShowWinNotification',
  winNotificationType: 'uiStore.winNotificationType',
  setWinNotificationType: 'uiStore.setWinNotificationType',
  winnerName: 'uiStore.winnerName',
  setWinnerName: 'uiStore.setWinnerName',

  // Legacy fields (kept for backwards compatibility)
  hasWon: 'gameStateStore.hasWon', // Deprecated: use hasWonLine or hasWonFullHouse
  winner: 'gameStateStore.winner', // Deprecated: use lineWinners or fullHouseWinners
} as const;

export default {
  useWalletStore,
  usePlayerStore,
  useGameStateStore,
  useUIStore,
  useSocketStore,
  resetAllStores,
  getAllStoreState,
  MIGRATION_MAP,
};
