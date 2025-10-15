/**
 * # Player State Slice
 *
 * Manages player participation state including joined rooms, player entries, and
 * current player information. Tracks which rooms the connected wallet has joined
 * and provides helpers for checking participation status.
 *
 * ## State Management
 * - `joinedRooms`: Set of room IDs the current player has joined
 * - `playerEntries`: Map of room ID to PlayerEntry data
 * - `currentPlayer`: Connected wallet's public key
 *
 * ## Actions
 * - `addJoinedRoom`: Mark room as joined by current player
 * - `removeJoinedRoom`: Remove room from joined list
 * - `setPlayerEntry`: Store player entry data for a room
 * - `setCurrentPlayer`: Set connected wallet public key
 * - `clearPlayerData`: Reset all player state (on wallet disconnect)
 *
 * ## Integration Points
 * - **Wallet Adapter**: Sets currentPlayer on wallet connect/disconnect
 * - **Join Room Mutation**: Calls addJoinedRoom after successful join
 * - **Room Components**: Use hasJoinedRoom to show correct UI state
 *
 * ## Related Files
 * - `hooks/queries/useTransaction.ts` - Join room mutation
 * - `components/WalletButton.tsx` - Sets currentPlayer
 * - `pages/RoomPage.tsx` - Shows different UI based on join status
 * - `types/program.types.ts` - PlayerEntry interface
 */

import { StateCreator } from 'zustand'
import type { PlayerEntry } from '@/types/program.types'
import type { PublicKey } from '@solana/web3.js'

export interface PlayerSlice {
  // State
  joinedRooms: Set<string>
  playerEntries: Map<string, PlayerEntry>
  currentPlayer: PublicKey | null

  // Actions
  addJoinedRoom: (roomId: string) => void
  removeJoinedRoom: (roomId: string) => void
  setPlayerEntry: (roomId: string, entry: PlayerEntry) => void
  setCurrentPlayer: (publicKey: PublicKey | null) => void
  clearPlayerData: () => void

  // Helpers
  hasJoinedRoom: (roomId: string) => boolean
  getPlayerEntry: (roomId: string) => PlayerEntry | null
}

export const createPlayerSlice: StateCreator<
  PlayerSlice,
  [],
  [],
  PlayerSlice
> = (set, get) => ({
  // Initial state
  joinedRooms: new Set<string>(),
  playerEntries: new Map<string, PlayerEntry>(),
  currentPlayer: null,

  // Actions
  addJoinedRoom: (roomId) => set((state) => {
    const newJoinedRooms = new Set(state.joinedRooms)
    newJoinedRooms.add(roomId)
    return { joinedRooms: newJoinedRooms }
  }),

  removeJoinedRoom: (roomId) => set((state) => {
    const newJoinedRooms = new Set(state.joinedRooms)
    newJoinedRooms.delete(roomId)
    const newPlayerEntries = new Map(state.playerEntries)
    newPlayerEntries.delete(roomId)
    return { joinedRooms: newJoinedRooms, playerEntries: newPlayerEntries }
  }),

  setPlayerEntry: (roomId, entry) => set((state) => {
    const newPlayerEntries = new Map(state.playerEntries)
    newPlayerEntries.set(roomId, entry)
    return { playerEntries: newPlayerEntries }
  }),

  setCurrentPlayer: (publicKey) => set(() => {
    if (!publicKey) {
      return {
        currentPlayer: null,
        joinedRooms: new Set(),
        playerEntries: new Map(),
      }
    }
    return { currentPlayer: publicKey }
  }),

  clearPlayerData: () => set({
    joinedRooms: new Set(),
    playerEntries: new Map(),
    currentPlayer: null,
  }),

  // Helpers
  hasJoinedRoom: (roomId) => {
    return get().joinedRooms.has(roomId)
  },

  getPlayerEntry: (roomId) => {
    return get().playerEntries.get(roomId) || null
  },
})
