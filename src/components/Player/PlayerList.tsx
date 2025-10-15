/**
 * # Player List Component
 *
 * Displays all players currently in a fundraising room with their entry amounts, extras
 * donations, and join timestamps. Shows real-time updates via WebSocket as new players join.
 * Provides visual indicators for the current user and displays total contributions per player.
 *
 * ## Features
 * - Real-time player list updates (WebSocket integration)
 * - Current player highlighting
 * - Entry fee and extras display
 * - Total contribution calculation
 * - Join timestamp display
 * - Empty state when no players
 * - Loading skeleton states
 * - Scrollable list for many players
 *
 * ## Props
 * - `roomId`: Room identifier
 * - `currentUser?`: Current user's public key (for highlighting)
 * - `maxHeight?`: Maximum height for scrollable list
 * - `className?`: Additional CSS classes
 *
 * ## State Management
 * - Uses usePlayers query hook for data fetching
 * - No local state (all server-driven)
 * - Real-time updates via query invalidation
 *
 * ## Integration Points
 * - `usePlayers` - Fetches player list from blockchain
 * - `playerSlice` - Tracks joined rooms and player data
 * - WebSocket - Real-time player join events
 * - `RoomPage` - Primary consumer
 *
 * ## Related Components
 * - `RoomPage` - Parent component
 * - `RoomCard` - Shows player count summary
 *
 * ## Usage
 * ```tsx
 * <PlayerList
 *   roomId="room-123"
 *   currentUser={wallet.publicKey}
 *   maxHeight="400px"
 * />
 * ```
 */

import { useMemo } from 'react'
import { PublicKey } from '@solana/web3.js'
import { usePlayers } from '@/hooks/queries/usePlayers'

interface PlayerListProps {
  roomId: string
  currentUser?: PublicKey
  maxHeight?: string
  className?: string
}

export function PlayerList({
  roomId,
  currentUser,
  maxHeight = '500px',
  className = '',
}: PlayerListProps) {
  const { data: players, isLoading, error } = usePlayers(roomId)

  // Sort players by join time (earliest first)
  const sortedPlayers = useMemo(() => {
    if (!players) return []
    return [...players].sort((a, b) => Number(a.joinSlot) - Number(b.joinSlot))
  }, [players])

  // Calculate totals
  const totals = useMemo(() => {
    if (!players || players.length === 0) {
      return { totalEntry: 0, totalExtras: 0, totalAmount: 0 }
    }

    return players.reduce(
      (acc, player) => {
        const entry = Number(player.entryPaid) / 1e9
        const extras = Number(player.extrasPaid) / 1e9
        return {
          totalEntry: acc.totalEntry + entry,
          totalExtras: acc.totalExtras + extras,
          totalAmount: acc.totalAmount + entry + extras,
        }
      },
      { totalEntry: 0, totalExtras: 0, totalAmount: 0 }
    )
  }, [players])

  // Format timestamp
  const formatJoinTime = (slot: bigint | number) => {
    // Rough estimation: 1 slot ≈ 400ms
    // For display purposes only, not precise
    const slotNum = typeof slot === 'bigint' ? Number(slot) : slot
    const slotsAgo = Date.now() / 1000 - slotNum * 0.4
    const minutesAgo = Math.floor(slotsAgo / 60)

    if (minutesAgo < 1) return 'Just now'
    if (minutesAgo < 60) return `${minutesAgo}m ago`
    const hoursAgo = Math.floor(minutesAgo / 60)
    if (hoursAgo < 24) return `${hoursAgo}h ago`
    const daysAgo = Math.floor(hoursAgo / 24)
    return `${daysAgo}d ago`
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
          />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 dark:text-red-400">
          Failed to load players: {error.message}
        </p>
      </div>
    )
  }

  // Empty state
  if (!players || players.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-5xl mb-4">👥</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Players Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Be the first to join this fundraising room!
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Totals */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Players ({players.length})
          </h3>
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            Total: {totals.totalAmount.toFixed(3)} SOL
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Entry Fees: </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {totals.totalEntry.toFixed(3)} SOL
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Extras: </span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {totals.totalExtras.toFixed(3)} SOL
            </span>
          </div>
        </div>
      </div>

      {/* Player List */}
      <div
        className="space-y-2 overflow-y-auto pr-2"
        style={{ maxHeight }}
      >
        {sortedPlayers.map((player, index) => {
          const isCurrentUser = currentUser && player.player.equals(currentUser)
          const entryAmount = Number(player.entryPaid) / 1e9
          const extrasAmount = Number(player.extrasPaid) / 1e9
          const totalAmount = entryAmount + extrasAmount

          return (
            <div
              key={player.player.toString()}
              className={`
                rounded-lg p-4 border-2 transition-all duration-200
                ${
                  isCurrentUser
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Player Number and Address */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold">
                      {index + 1}
                    </span>
                    <code className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                      {player.player.toString().slice(0, 8)}...
                      {player.player.toString().slice(-4)}
                    </code>
                    {isCurrentUser && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500 text-white">
                        You
                      </span>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Entry:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {entryAmount.toFixed(3)} SOL
                      </span>
                    </div>
                    {extrasAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Extras:</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          +{extrasAmount.toFixed(3)} SOL
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-1 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Total:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {totalAmount.toFixed(3)} SOL
                      </span>
                    </div>
                  </div>
                </div>

                {/* Join Time */}
                <div className="text-right ml-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatJoinTime(Number(player.joinSlot))}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
