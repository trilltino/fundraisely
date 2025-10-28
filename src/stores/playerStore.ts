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
 * - **Immer middleware for safe array mutations**
 *
 * **IMMER BENEFITS FOR ARRAY OPERATIONS:**
 * Player store has complex array operations that become much cleaner with Immer:
 *
 * **Before (manual spreading):**
 * ```typescript
 * addPlayer: (player) => {
 *   set({ players: [...get().players, player] }); // Spread entire array
 * };
 * updatePlayer: (id, updates) => {
 *   const updated = [...players];
 *   updated[index] = { ...updated[index], ...updates }; // Double spread
 *   set({ players: updated });
 * };
 * ```
 *
 * **After (Immer mutations):**
 * ```typescript
 * addPlayer: (player) => {
 *   set((state) => {
 *     state.players.push(player); // Direct push!
 *   });
 * };
 * updatePlayer: (id, updates) => {
 *   set((state) => {
 *     state.players[index] = { ...state.players[index], ...updates }; // Simpler
 *   });
 * };
 * ```
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
import { immer } from 'zustand/middleware/immer';
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

export const usePlayerStore = create<PlayerStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    // Set entire player list
    setPlayers: (players) => {
      set((state) => {
        state.players = players;
      });
    },

    // Set current player name
    setPlayerName: (playerName) => {
      set((state) => {
        if (state.playerName !== playerName) {
          state.playerName = playerName;
        }
      });
    },

    // Set join error message
    setJoinError: (joinError) => {
      set((state) => {
        if (state.joinError !== joinError) {
          state.joinError = joinError;
        }
      });
    },

    // Add a single player
    // With Immer: Direct push instead of array spreading
    addPlayer: (player) => {
      set((state) => {
        if (!state.players.find(p => p.id === player.id)) {
          state.players.push(player);
        }
      });
    },

    // Remove a player by ID
    // With Immer: Use splice or reassignment
    removePlayer: (playerId) => {
      set((state) => {
        const index = state.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
          state.players.splice(index, 1);
        }
      });
    },

    // Update specific player properties
    // With Immer: Direct index mutation (much cleaner!)
    updatePlayer: (playerId, updates) => {
      set((state) => {
        const index = state.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
          // Immer allows direct property assignment on draft objects
          Object.assign(state.players[index], updates);
        }
      });
    },

    // Clear all players
    clearPlayers: () => {
      set((state) => {
        if (state.players.length > 0) {
          state.players = [];
        }
      });
    },

    // Reset to initial state
    resetPlayerStore: () => {
      set((state) => {
        const initial = createInitialState();
        Object.assign(state, initial);
      });
    },

    // Get current player (by stored playerName)
    getCurrentPlayer: () => {
      const state = get();
      return state.players.find(p => p.name === state.playerName);
    },

    // Get player by ID
    getPlayerById: (id) => {
      return get().players.find(p => p.id === id);
    },

    // Get all ready players
    getReadyPlayers: () => {
      return get().players.filter(p => p.isReady);
    },

    // Check if all players are ready
    areAllPlayersReady: () => {
      const players = get().players;
      if (players.length === 0) return false;
      return players.every(p => p.isReady);
    },
  }))
);

export default usePlayerStore;
