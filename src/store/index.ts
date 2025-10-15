/**
 * # Fundraisely Global Application Store
 *
 * Centralized state management using Zustand with modular slice pattern. Combines
 * all application state (rooms, players, charity, wallet, UI) into a single, type-safe
 * store with proper middleware stacking for performance, persistence, and debugging.
 *
 * ## Architecture
 * This store uses the **slice pattern** recommended by Zustand for large applications.
 * Each domain (room, player, charity, wallet, UI) has its own slice file with dedicated
 * state and actions, then all slices are composed into one store here.
 *
 * ## Middleware Stack (Order Matters!)
 * 1. **DevTools** (outermost) - Redux DevTools integration for debugging
 * 2. **Persist** - LocalStorage persistence for selected state
 * 3. **Immer** (innermost) - Mutable-style state updates (converted to immutable)
 *
 * ## Features
 * - **Type Safety**: Full TypeScript inference for all state and actions
 * - **Performance**: Atomic selectors via createSelectors utility
 * - **Persistence**: Saves selectedRoomId, joinedRooms, theme to localStorage
 * - **DevTools**: Time-travel debugging in development mode
 * - **Named Actions**: All actions have identifiers for DevTools (e.g., 'room/setRooms')
 *
 * ## Usage with Auto-Selectors
 * ```tsx
 * import { useStore } from '@/store'
 *
 * function MyComponent() {
 *   // Atomic selector - only re-renders when rooms change
 *   const rooms = useStore.use.rooms()
 *   const addRoom = useStore.use.addRoom()
 *
 *   // Or traditional selector
 *   const selectedRoom = useStore(state => state.getSelectedRoom())
 * }
 * ```
 *
 * ## Integration Points
 * - **TanStack Query**: Mutations call store actions to update cached data
 * - **Wallet Adapter**: Syncs wallet state to walletSlice
 * - **WebSocket**: Real-time updates call updateRoom action
 * - **Components**: All use atomic selectors for optimal performance
 *
 * ## Related Files
 * - `slices/roomSlice.ts` - Room state management
 * - `slices/playerSlice.ts` - Player participation tracking
 * - `slices/charitySlice.ts` - Charity selection
 * - `slices/walletSlice.ts` - Wallet connection state
 * - `slices/uiSlice.ts` - UI state (modals, toasts, theme)
 * - `utils/createSelectors.ts` - Auto-selector utility
 *
 * @see {@link https://docs.pmnd.rs/zustand/guides/slices-pattern Zustand Slice Pattern}
 * @see {@link https://docs.pmnd.rs/zustand/guides/auto-generating-selectors Auto Selectors}
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { createRoomSlice, type RoomSlice } from './slices/roomSlice'
import { createPlayerSlice, type PlayerSlice } from './slices/playerSlice'
import { createCharitySlice, type CharitySlice } from './slices/charitySlice'
import { createWalletSlice, type WalletSlice } from './slices/walletSlice'
import { createUISlice, type UISlice } from './slices/uiSlice'
import { createSelectors } from './utils/createSelectors'

/**
 * Combined store state type - intersection of all slices
 */
export type StoreState = RoomSlice & PlayerSlice & CharitySlice & WalletSlice & UISlice

/**
 * Base store without auto-selectors
 * Use `useStore` (with selectors) in components instead
 */
const useStoreBase = create<StoreState>()(
  devtools(
    persist(
      immer((...a) => ({
        ...createRoomSlice(...a),
        ...createPlayerSlice(...a),
        ...createCharitySlice(...a),
        ...createWalletSlice(...a),
        ...createUISlice(...a),
      })),
      {
        name: 'fundraisely-storage',
        version: 1,

        // Only persist specific fields to localStorage
        partialize: (state) => ({
          selectedRoomId: state.selectedRoomId,
          joinedRooms: Array.from(state.joinedRooms),
          selectedCharity: state.selectedCharity,
          network: state.network,
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),

        // Custom storage to handle Set/Map serialization
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name)
            if (!str) return null
            const { state } = JSON.parse(str)
            // Convert arrays back to Sets
            if (state.joinedRooms && Array.isArray(state.joinedRooms)) {
              state.joinedRooms = new Set(state.joinedRooms)
            }
            return { state }
          },
          setItem: (name, value) => {
            const str = JSON.stringify({
              state: {
                ...value.state,
                joinedRooms: Array.from(value.state.joinedRooms || []),
              },
            })
            localStorage.setItem(name, str)
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
      }
    ),
    {
      name: 'FundraiselyStore',
      enabled: import.meta.env.DEV, // Only enable DevTools in development
    }
  )
)

/**
 * Main store export with auto-selectors
 *
 * Use this in components for optimal performance:
 * ```tsx
 * const rooms = useStore.use.rooms() // Atomic selector
 * const addRoom = useStore.use.addRoom() // Function selector
 * ```
 */
export const useStore = createSelectors(useStoreBase)

/**
 * Export base store for cases where you need the full store instance
 * (e.g., outside React components, testing)
 */
export { useStoreBase }
