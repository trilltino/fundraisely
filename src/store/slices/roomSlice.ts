/**
 * # Room State Slice
 *
 * Manages all room-related state including the list of available rooms, currently
 * selected room, and room-specific UI state like loading indicators. This slice follows
 * the Zustand slice pattern for modular state management with proper TypeScript typing.
 *
 * ## State Management
 * - `rooms`: Array of all fetched rooms (cached from blockchain)
 * - `selectedRoomId`: Currently viewing/interacting with this room
 * - `loading`: Loading state for room operations
 * - `error`: Error messages from failed room operations
 *
 * ## Actions
 * - `setRooms`: Replace entire room list (used after fetch)
 * - `addRoom`: Add single room to list (used after creation)
 * - `updateRoom`: Partial update to specific room (used for real-time updates)
 * - `removeRoom`: Remove room from list
 * - `setSelectedRoom`: Set the currently active room
 * - `clearError`: Clear error state
 *
 * ## Integration Points
 * - **TanStack Query**: Populates `rooms` from blockchain queries
 * - **WebSocket**: Updates individual rooms via `updateRoom` on events
 * - **Pages**: CreateRoomPage adds rooms, RoomPage views selected room
 *
 * ## Related Files
 * - `hooks/queries/useRooms.ts` - Fetches rooms from blockchain
 * - `hooks/useSocket.ts` - Listens for room updates
 * - `pages/RoomPage.tsx` - Displays selected room
 * - `types/program.types.ts` - Room interface definition
 *
 * @see {@link https://docs.pmnd.rs/zustand/guides/typescript Zustand TypeScript Guide}
 */

import { StateCreator } from 'zustand'
import type { Room } from '@/types/program.types'

export interface RoomSlice {
  // State
  rooms: Room[]
  selectedRoomId: string | null
  loading: boolean
  error: string | null

  // Actions
  setRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  removeRoom: (roomId: string) => void
  setSelectedRoom: (roomId: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Computed helpers
  getSelectedRoom: () => Room | null
  getRoomById: (roomId: string) => Room | null
}

/**
 * Creates the room slice with proper typing for combined store
 *
 * The type parameters are:
 * 1. Combined state type (all slices merged) - set to RoomSlice for now, will be StoreState in index.ts
 * 2. Middleware types (devtools, persist, immer)
 * 3. More middleware (empty array if none)
 * 4. This slice's specific type
 *
 * This typing pattern allows slices to access each other's state while
 * maintaining full type safety.
 */
export const createRoomSlice: StateCreator<
  RoomSlice,
  [],
  [],
  RoomSlice
> = (set, get) => ({
  // Initial state
  rooms: [],
  selectedRoomId: null,
  loading: false,
  error: null,

  // Actions
  setRooms: (rooms) => set({ rooms, error: null }),

  addRoom: (room) => set((state) => {
    const exists = state.rooms.some(r => r.roomId === room.roomId)
    return exists ? {} : { rooms: [...state.rooms, room] }
  }),

  updateRoom: (roomId, updates) => set((state) => ({
    rooms: state.rooms.map(r =>
      r.roomId === roomId ? { ...r, ...updates } : r
    )
  })),

  removeRoom: (roomId) => set((state) => ({
    rooms: state.rooms.filter(r => r.roomId !== roomId),
    selectedRoomId: state.selectedRoomId === roomId ? null : state.selectedRoomId
  })),

  setSelectedRoom: (roomId) => set({ selectedRoomId: roomId }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  clearError: () => set({ error: null }),

  // Computed getters - access current state directly
  getSelectedRoom: () => {
    const { rooms, selectedRoomId } = get()
    return rooms.find(r => r.roomId === selectedRoomId) || null
  },

  getRoomById: (roomId) => {
    const { rooms } = get()
    return rooms.find(r => r.roomId === roomId) || null
  },
})
