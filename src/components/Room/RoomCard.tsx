/**
 * # Room Card Component
 *
 * Displays a single fundraising room as a card with key information including entry fee,
 * current player count, prize pool, charity allocation, and room status. Provides visual
 * feedback for active, full, and ended rooms with color-coded status indicators.
 *
 * ## Features
 * - Room identifier and host display
 * - Entry fee display with token symbol
 * - Player count with progress bar (current/max players)
 * - Total prize pool calculation and display
 * - Charity allocation percentage
 * - Status badge (Active, Full, Ended)
 * - Click to navigate to room details page
 * - Hover effects for better UX
 *
 * ## Props
 * - `room`: Room object from program.types.ts
 * - `onClick?`: Optional click handler (defaults to navigation)
 * - `className?`: Additional CSS classes
 *
 * ## State Management
 * - Reads room data from props (passed by parent)
 * - No local state management
 *
 * ## Integration Points
 * - Used by RoomList component to display rooms grid
 * - Navigates to RoomPage on click
 * - Displays data from Room account (program.types.ts)
 *
 * ## Related Components
 * - `RoomList` - Parent component that renders grid of RoomCards
 * - `RoomPage` - Destination when card is clicked
 *
 * ## Usage
 * ```tsx
 * <RoomCard
 *   room={roomData}
 *   onClick={() => navigate(`/room/${roomData.roomId}`)}
 * />
 * ```
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Room } from '@/types/program.types'

interface RoomCardProps {
  room: Room
  onClick?: () => void
  className?: string
}

export function RoomCard({ room, onClick, className = '' }: RoomCardProps) {
  const navigate = useNavigate()

  // Calculate derived values
  const derived = useMemo(() => {
    const entryFeeDisplay = Number(room.entryFee) / 1e9 // Convert lamports to SOL
    const playerProgress = (room.playerCount / room.maxPlayers) * 100
    const totalPool = Number(room.totalCollected) / 1e9

    // Calculate charity percentage (remainder after platform + host + prize pool)
    const platformBps = 2000 // 20% fixed
    const charityBps = 10000 - platformBps - room.hostFeeBps - room.prizePoolBps
    const charityPercent = charityBps / 100

    // Determine status
    let status: 'active' | 'full' | 'ended' = 'active'
    let statusColor = 'bg-green-500'
    let statusText = 'Active'

    if (room.ended || room.status !== "Active") {
      status = 'ended'
      statusColor = 'bg-gray-500'
      statusText = 'Ended'
    } else if (room.playerCount >= room.maxPlayers) {
      status = 'full'
      statusColor = 'bg-yellow-500'
      statusText = 'Full'
    }

    return {
      entryFeeDisplay,
      playerProgress,
      totalPool,
      charityPercent,
      status,
      statusColor,
      statusText,
    }
  }, [room])

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(`/room/${room.roomId}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl
        transition-all duration-200 cursor-pointer border border-gray-200
        dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400
        ${className}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {room.roomId}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              Host: {room.host.toString().slice(0, 8)}...
            </p>
          </div>
          {/* Status Badge */}
          <span
            className={`
              px-3 py-1 rounded-full text-xs font-semibold text-white
              ${derived.statusColor}
            `}
          >
            {derived.statusText}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Entry Fee */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Entry Fee</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {derived.entryFeeDisplay.toFixed(3)} SOL
          </span>
        </div>

        {/* Player Count */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">Players</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {room.playerCount} / {room.maxPlayers}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(derived.playerProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Total Pool */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Prize Pool</span>
          <span className="text-base font-semibold text-green-600 dark:text-green-400">
            {derived.totalPool.toFixed(3)} SOL
          </span>
        </div>

        {/* Charity Allocation */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">To Charity</span>
          <span className="text-base font-semibold text-purple-600 dark:text-purple-400">
            {derived.charityPercent.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleClick()
          }}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white
                     font-semibold rounded-lg transition-colors duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={derived.status === 'ended'}
        >
          {derived.status === 'ended' ? 'Room Ended' : 'View Room'}
        </button>
      </div>
    </div>
  )
}
