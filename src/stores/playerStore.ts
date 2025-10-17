/**
 * PLAYER STORE - Player and Room Management State
 *
 * PURPOSE:
 * Manages player list, ready states, room information, and join/create errors.
 * Separated from game mechanics to enable clearer state management and easier testing.
 *
 * ROLE IN APPLICATION:
 * - Tracks all players in current room
 * - Manages player ready states
 * - Stores current player's name
 * - Handles join/create error messages
 * - Enables player list sharing across components
 *
 * KEY FEATURES:
 * - Type-safe player management
 * - Idempotent updates
 * - Separate concern from game state
 * - Easy player queries
 *
 * USAGE:
 * ```typescript
 * import { usePlayerStore } from '@/stores/playerStore';
 *
 * function PlayerList() {
 *   const players = usePlayerStore(state => state.players);
 *   const currentPlayerName = usePlayerStore(state => state.playerName);
 *
 *   return (
 *     <div>
 *       {players.map(player => (
 *         <PlayerCard key={player.id} player={player} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { create } from 'zustand';
import type { Player } from '../types/game';

export interface PlayerStore {
  // Player data
  players: Player[];
  playerName: string;

  // Error state
  joinError: string;

  // Actions
  setPlayers: (players: Player[]) => void;
  setPlayerName: (name: string) => void;
  setJoinError: (error: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  clearPlayers: () => void;
  resetPlayerStore: () => void;

  // Selectors (computed)
  getCurrentPlayer: () => Player | undefined;
  getPlayerById: (id: string) => Player | undefined;
  getReadyPlayers: () => Player[];
  areAllPlayersReady: () => boolean;
}

// Initial state factory
const createInitialState = () => ({
  players: [],
  playerName: '',
  joinError: '',
});

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  ...createInitialState(),

  // Set entire player list
  setPlayers: (players) => {
    set({ players });
  },

  // Set current player name
  setPlayerName: (playerName) => {
    if (get().playerName !== playerName) {
      set({ playerName });
    }
  },

  // Set join error message
  setJoinError: (joinError) => {
    if (get().joinError !== joinError) {
      set({ joinError });
    }
  },

  // Add a single player
  addPlayer: (player) => {
    const { players } = get();
    if (!players.find(p => p.id === player.id)) {
      set({ players: [...players, player] });
    }
  },

  // Remove a player by ID
  removePlayer: (playerId) => {
    const { players } = get();
    const filtered = players.filter(p => p.id !== playerId);
    if (filtered.length !== players.length) {
      set({ players: filtered });
    }
  },

  // Update specific player properties
  updatePlayer: (playerId, updates) => {
    const { players } = get();
    const index = players.findIndex(p => p.id === playerId);

    if (index !== -1) {
      const updated = [...players];
      updated[index] = { ...updated[index], ...updates };
      set({ players: updated });
    }
  },

  // Clear all players
  clearPlayers: () => {
    if (get().players.length > 0) {
      set({ players: [] });
    }
  },

  // Reset to initial state
  resetPlayerStore: () => {
    set(createInitialState());
  },

  // Get current player (by stored playerName)
  getCurrentPlayer: () => {
    const { players, playerName } = get();
    return players.find(p => p.name === playerName);
  },

  // Get player by ID
  getPlayerById: (id) => {
    return get().players.find(p => p.id === id);
  },

  // Get all ready players
  getReadyPlayers: () => {
    return get().players.filter(p => p.ready);
  },

  // Check if all players are ready
  areAllPlayersReady: () => {
    const { players } = get();
    if (players.length === 0) return false;
    return players.every(p => p.ready);
  },
}));

export default usePlayerStore;
