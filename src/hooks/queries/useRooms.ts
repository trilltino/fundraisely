/**
 * # Room Queries Hook
 * 
 * TanStack Query hooks for fetching room data from Solana blockchain.
 * Provides cached, auto-updating room lists and details with proper error handling.
 */

import { useQuery } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { queryKeys } from '@/lib/queryKeys'
import type { Room, RoomFilters } from '@/types/program.types'

export function useRooms(filters?: RoomFilters) {
  const { connection: _connection } = useConnection()

  return useQuery<Room[]>({
    queryKey: queryKeys.rooms.list(filters),
    queryFn: async (): Promise<Room[]> => {
      // TODO: Implement actual room fetching from blockchain
      return []
    },
    staleTime: 30 * 1000,
  })
}

export function useRoom(roomId: string | null) {
  const { connection: _connection } = useConnection()

  return useQuery({
    queryKey: queryKeys.rooms.detail(roomId || ''),
    queryFn: async () => {
      if (!roomId) return null
      // TODO: Implement actual room fetching
      return null
    },
    enabled: !!roomId,
  })
}
