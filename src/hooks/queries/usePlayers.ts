/**
 * # Player Queries Hook
 *
 * Provides React Query hooks for fetching player data within rooms. Manages player
 * lists, individual player entries, and real-time updates for player actions like
 * joining, leaving, and score changes.
 *
 * ## Features
 * - Fetch all players in a room
 * - Fetch individual player entry data
 * - Real-time updates via WebSocket integration
 * - Optimistic updates for player actions
 * - Automatic cache invalidation
 *
 * ## Usage
 * ```tsx
 * function PlayerList({ roomId }: { roomId: string }) {
 *   const { data: players, isLoading } = usePlayers(roomId)
 *
 *   return (
 *     <div>
 *       {players?.map(player => (
 *         <PlayerCard key={player.pubkey} player={player} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * ## Integration Points
 * - `queryKeys.ts` - Uses rooms.players hierarchical key
 * - `accounts.ts` - Fetches player account data from Solana
 * - `playerSlice.ts` - Updates store on successful fetch
 * - `useSocket.ts` - Invalidates on player join/leave events
 *
 * ## Related Hooks
 * - `useRoom` - Parent room data
 * - `useJoinRoom` - Join room mutation
 * - `useAccount` - Generic account fetching
 *
 * @see {@link https://tanstack.com/query/latest/docs/react/guides/queries TanStack Query Docs}
 */

import { useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { queryKeys } from '@/lib/queryKeys'
import type { PlayerEntry } from '@/types/program.types'

/**
 * Fetch all players in a room
 *
 * @param roomId - Room identifier
 * @returns Query result with array of player entries
 */
export function usePlayers(roomId: string | null | undefined) {
  const { connection: _connection } = useConnection()

  return useQuery({
    queryKey: queryKeys.rooms.players(roomId || ''),
    queryFn: async () => {
      if (!roomId) return []

      // TODO: Implement actual Solana account fetching
      // const roomPubkey = await deriveRoomPda(roomId)
      // const playerAccounts = await connection.getProgramAccounts(programId, {
      //   filters: [{ memcmp: { offset: 8, bytes: roomPubkey.toBase58() } }]
      // })
      // return playerAccounts.map(deserializePlayerAccount)

      // Placeholder implementation
      return [] as PlayerEntry[]
    },
    enabled: !!roomId,
    staleTime: 10 * 1000, // 10s for player data (more volatile than rooms)
    refetchInterval: 15 * 1000, // Poll every 15s when focused
  })
}

/**
 * Fetch all players with Suspense support
 *
 * @param roomId - Room identifier
 * @returns Suspense query result with player array
 */
export function usePlayersSuspense(roomId: string) {
  const { connection: _connection } = useConnection()

  return useSuspenseQuery({
    queryKey: queryKeys.rooms.players(roomId),
    queryFn: async () => {
      // TODO: Implement actual Solana account fetching
      return [] as PlayerEntry[]
    },
  })
}

/**
 * Fetch a single player entry
 *
 * @param roomId - Room identifier
 * @param playerPubkey - Player's public key
 * @returns Query result with player entry data
 */
export function usePlayerEntry(
  roomId: string | null | undefined,
  playerPubkey: string | null | undefined
) {
  const { connection: _connection } = useConnection()

  return useQuery({
    queryKey: [...queryKeys.rooms.players(roomId || ''), playerPubkey || ''],
    queryFn: async () => {
      if (!roomId || !playerPubkey) return null

      // TODO: Implement actual Solana account fetching
      // const playerEntryPda = await derivePlayerEntryPda(roomId, playerPubkey)
      // const account = await connection.getAccountInfo(playerEntryPda)
      // return deserializePlayerEntryAccount(account)

      // Placeholder implementation
      return null as PlayerEntry | null
    },
    enabled: !!roomId && !!playerPubkey,
    staleTime: 10 * 1000,
  })
}

/**
 * Hook to invalidate players cache (called after player actions)
 *
 * @returns Invalidate function
 */
export function useInvalidatePlayers() {
  const queryClient = useQueryClient()

  return (roomId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.rooms.players(roomId),
    })
  }
}

/**
 * Hook to optimistically add a player (before blockchain confirmation)
 *
 * @returns Optimistic add function with rollback support
 */
export function useOptimisticAddPlayer() {
  const queryClient = useQueryClient()

  return {
    add: (roomId: string, player: PlayerEntry) => {
      queryClient.setQueryData<PlayerEntry[]>(
        queryKeys.rooms.players(roomId),
        (old) => (old ? [...old, player] : [player])
      )
    },
    remove: (roomId: string, playerPubkey: string) => {
      queryClient.setQueryData<PlayerEntry[]>(
        queryKeys.rooms.players(roomId),
        (old) => old?.filter((p) => p.player.toString() !== playerPubkey) || []
      )
    },
  }
}
