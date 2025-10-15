/**
 * # Charity State Slice
 *
 * Manages charity selection state for room creation. Handles charity search results,
 * selected charity for the next room, and search UI state. Integrates with The Giving
 * Block API (when implemented) for charity discovery.
 *
 * ## State Management
 * - `selectedCharity`: Charity chosen for next room creation
 * - `charities`: List of available charities from search/API
 * - `searchQuery`: Current charity search query
 * - `loading`: Loading state for charity operations
 *
 * ## Actions
 * - `setSelectedCharity`: Select charity for room creation
 * - `setCharities`: Update available charity list
 * - `setSearchQuery`: Update search query
 * - `clearSelection`: Clear selected charity
 *
 * ## Integration Points
 * - **Create Room Page**: Uses selectedCharity for room creation
 * - **TGB API** (future): Fetches charities from The Giving Block
 * - **Axum Backend** (future): Proxies TGB charity search
 *
 * ## Related Files
 * - `pages/CreateRoomPage.tsx` - Charity selection UI
 * - `hooks/queries/useCharities.ts` (future) - Charity search query
 * - `types/api.types.ts` - Charity interface
 */

import { StateCreator } from 'zustand'
import type { Charity } from '@/types/api.types'

export interface CharitySlice {
  // State
  selectedCharity: Charity | null
  charities: Charity[]
  searchQuery: string
  loading: boolean

  // Actions
  setSelectedCharity: (charity: Charity | null) => void
  setCharities: (charities: Charity[]) => void
  setSearchQuery: (query: string) => void
  setLoading: (loading: boolean) => void
  clearSelection: () => void
}

export const createCharitySlice: StateCreator<
  CharitySlice,
  [],
  [],
  CharitySlice
> = (set) => ({
  // Initial state
  selectedCharity: null,
  charities: [],
  searchQuery: '',
  loading: false,

  // Actions
  setSelectedCharity: (charity) => set({ selectedCharity: charity }),

  setCharities: (charities) => set({ charities }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setLoading: (loading) => set({ loading }),

  clearSelection: () => set({ selectedCharity: null }),
})
