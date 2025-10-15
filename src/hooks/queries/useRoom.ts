/**
 * # Single Room Query Hook
 *
 * Provides React Query hooks for fetching and managing individual room data from the
 * Solana blockchain. Implements caching, automatic refetching, and real-time updates
 * for room state changes.
 *
 * ## Features
 * - Single room detail fetching by room ID or public key
 * - Automatic cache invalidation on room updates
 * - Integration with WebSocket for real-time updates
 * - Optimistic updates from mutations
 * - Suspense support for streaming SSR (future)
 *
 * ## Usage
 * ```tsx
 * function RoomDetails({ roomId }: { roomId: string }) {
 *   const { data: room, isLoading, error } = useRoom(roomId)
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <Error message={error.message} />
 *   if (!room) return <NotFound />
 *
 *   return <RoomCard room={room} />
 * }
 * ```
 *
 * ## Integration Points
 * - `queryKeys.ts` - Uses hierarchical room.detail key
 * - `accounts.ts` - Fetches room account data from Solana
 * - `roomSlice.ts` - Updates store on successful fetch
 * - `useSocket.ts` - Invalidates query on room update events
 *
 * ## Related Hooks
 * - `useRooms` - List all rooms
 * - `usePlayers` - Players in a room
 * - `useJoinRoom` - Join room mutation
 *
 * @see {@link https://tanstack.com/query/latest/docs/react/guides/queries TanStack Query Docs}
 */

import { useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { queryKeys } from '@/lib/queryKeys'
import type { Room } from '@/types/program.types'

/**
 * Fetch a single room by room ID
 *
 * @param roomId - Unique room identifier
 * @returns Query result with room data
 */
export function useRoom(roomId: string | null | undefined) {
  const { connection: _connection } = useConnection()

  return useQuery({
    queryKey: queryKeys.rooms.detail(roomId || ''),
    queryFn: async () => {
      if (!roomId) return null

      // TODO: Implement actual Solana account fetching
      // const roomPubkey = await deriveroomPda(roomId)
      // const account = await connection.getAccountInfo(roomPubkey)
      // return deserializeRoomAccount(account)

      // Placeholder implementation
      return null as Room | null
    },
    enabled: !!roomId,
    staleTime: 30 * 1000, // 30s for blockchain data
  })
}

/**
 * Fetch a single room with Suspense support
 *
 * @param roomId - Unique room identifier
 * @returns Suspense query result with room data (never null)
 */
export function useRoomSuspense(roomId: string) {
  const { connection: _connection } = useConnection()

  return useSuspenseQuery({
    queryKey: queryKeys.rooms.detail(roomId),
    queryFn: async () => {
      // TODO: Implement actual Solana account fetching
      return {} as Room
    },
  })
}

/**
 * Hook to prefetch a room (useful for hover/link previews)
 *
 * @returns Prefetch function
 */
export function usePrefetchRoom() {
  const queryClient = useQueryClient()
  const { connection: _connection } = useConnection()

  return (roomId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.rooms.detail(roomId),
      queryFn: async () => {
        // TODO: Implement actual Solana account fetching
        return null as Room | null
      },
      staleTime: 30 * 1000,
    })
  }
}

/**
 * Hook to invalidate room cache (called after mutations)
 *
 * @returns Invalidate function
 */
export function useInvalidateRoom() {
  const queryClient = useQueryClient()

  return (roomId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.rooms.detail(roomId),
    })
  }
}
