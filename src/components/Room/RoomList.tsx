/**
 * # Room List Component
 *
 * Displays a responsive grid of RoomCard components with filtering, sorting, and loading states.
 * Fetches active rooms from Solana blockchain via TanStack Query and renders them in a
 * masonry-style grid layout.
 *
 * ## Features
 * - Responsive grid layout (1-3 columns based on screen size)
 * - Loading skeleton states
 * - Empty state with call-to-action
 * - Error state with retry button
 * - Filter by room status (all, active, ended)
 * - Sort by entry fee, player count, total pool
 * - Search by room ID or host
 * - Real-time updates via WebSocket integration
 *
 * ## Props
 * - `filters?`: Optional RoomFilters object
 * - `onRoomClick?`: Optional click handler for room cards
 * - `className?`: Additional CSS classes
 *
 * ## State Management
 * - Uses useRooms query hook for data fetching
 * - Local state for filters and search query
 * - Integration with roomSlice for real-time updates
 *
 * ## Integration Points
 * - `useRooms` - Fetches room list from blockchain
 * - `RoomCard` - Renders individual room cards
 * - `roomSlice` - Receives real-time updates from WebSocket
 * - `HomePage` - Primary consumer of this component
 *
 * ## Related Components
 * - `RoomCard` - Child component for individual rooms
 * - `HomePage` - Parent page component
 *
 * ## Usage
 * ```tsx
 * <RoomList
 *   filters={{ isActive: true }}
 *   onRoomClick={(room) => navigate(`/room/${room.roomId}`)}
 * />
 * ```
 */

import { useState, useMemo } from 'react'
import { useRooms } from '@/hooks/queries/useRooms'
import { RoomCard } from './RoomCard'
import type { Room, RoomFilters } from '@/types/program.types'

interface RoomListProps {
  filters?: RoomFilters
  onRoomClick?: (room: Room) => void
  className?: string
}

type SortOption = 'entryFee' | 'players' | 'totalCollected' | 'creationSlot'

export function RoomList({ filters, onRoomClick, className = '' }: RoomListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('creationSlot')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all')

  // Fetch rooms from blockchain
  const { data: rooms, isLoading, error, refetch } = useRooms(filters)

  // Filter and sort rooms
  const filteredRooms = useMemo(() => {
    if (!rooms) return []

    let filtered = [...rooms]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (room) =>
          room.roomId.toLowerCase().includes(query) ||
          room.host.toString().toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((room) => {
        if (filterStatus === 'active') return room.status === 'Active' && !room.ended
        if (filterStatus === 'ended') return room.ended || room.status === 'Ended'
        return true
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'entryFee':
          return Number(b.entryFee) - Number(a.entryFee)
        case 'players':
          return b.playerCount - a.playerCount
        case 'totalCollected':
          return Number(b.totalCollected) - Number(a.totalCollected)
        case 'creationSlot':
        default:
          return Number(b.creationSlot) - Number(a.creationSlot)
      }
    })

    return filtered
  }, [rooms, searchQuery, sortBy, filterStatus])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Failed to Load Rooms
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            {error.message || 'Unable to fetch rooms from the blockchain.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white
                     font-semibold rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (!rooms || rooms.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-6xl">🎮</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            No Rooms Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Be the first to create a fundraising room and start raising money for charity!
          </p>
          <button
            onClick={() => window.location.href = '/create'}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white
                     font-semibold rounded-lg transition-colors duration-200"
          >
            Create Room
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by room ID or host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'ended')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600
                   rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Rooms</option>
          <option value="active">Active Only</option>
          <option value="ended">Ended Only</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600
                   rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="creationSlot">Most Recent</option>
          <option value="entryFee">Highest Entry Fee</option>
          <option value="players">Most Players</option>
          <option value="totalCollected">Largest Prize Pool</option>
        </select>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredRooms.length} of {rooms.length} rooms
      </div>

      {/* Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No rooms match your filters. Try adjusting your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.roomId}
              room={room}
              onClick={onRoomClick ? () => onRoomClick(room) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
