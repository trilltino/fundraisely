/**
 * Global Application Store
 *
 * Centralized state management using Zustand with feature-based slices.
 * This store combines all application state into a single, type-safe store
 * that can be accessed from any component. Each feature (room, player, charity, blockchain)
 * has its own slice with dedicated actions and state.
 *
 * Architecture:
 * - Feature slices (room, player, charity, blockchain) for organized state
 * - Immer middleware for immutable state updates
 * - DevTools integration for debugging
 * - Persist middleware for localStorage caching
 *
 * Usage:
 * ```tsx
 * import { useStore } from '@/store';
 *
 * function MyComponent() {
 *   const { rooms, createRoom } = useStore();
 *   // ... use state and actions
 * }
 * ```
 *
 * Related Files:
 * - store/slices/roomSlice.ts - Room management state
 * - store/slices/playerSlice.ts - Player participation state
 * - store/slices/charitySlice.ts - Charity selection state
 * - store/slices/blockchainSlice.ts - Wallet and connection state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Placeholder slices - to be implemented
interface RoomState {
  rooms: any[];
  selectedRoomId: string | null;
  setSelectedRoom: (roomId: string | null) => void;
}

interface PlayerState {
  currentPlayer: any | null;
  joinedRooms: string[];
}

interface CharityState {
  selectedCharity: any | null;
  charitySearchQuery: string;
  setSelectedCharity: (charity: any) => void;
}

interface BlockchainState {
  connected: boolean;
  wallet: string | null;
}

type StoreState = RoomState & PlayerState & CharityState & BlockchainState;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      immer((set) => ({
        // Room slice
        rooms: [],
        selectedRoomId: null,
        setSelectedRoom: (roomId) => set((state) => {
          state.selectedRoomId = roomId;
        }),

        // Player slice
        currentPlayer: null,
        joinedRooms: [],

        // Charity slice
        selectedCharity: null,
        charitySearchQuery: '',
        setSelectedCharity: (charity) => set((state) => {
          state.selectedCharity = charity;
        }),

        // Blockchain slice
        connected: false,
        wallet: null,
      })),
      {
        name: 'fundraisely-storage',
        partialize: (state) => ({
          selectedRoomId: state.selectedRoomId,
          joinedRooms: state.joinedRooms,
        }),
      }
    ),
    { name: 'FundraiselyStore' }
  )
);
