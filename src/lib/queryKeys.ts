/**
 * Query Key Factory
 *
 * Centralized query key definitions for TanStack Query.
 * This file provides a single source of truth for all query keys used throughout the application,
 * ensuring consistency and making it easy to invalidate related queries.
 *
 * Pattern:
 * - Hierarchical keys: ['rooms'] → ['rooms', roomId] → ['rooms', roomId, 'players']
 * - Use functions for dynamic keys
 * - Export as const for type safety
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy to invalidate related queries (queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }))
 * - Prevents typos and inconsistencies
 * - Self-documenting query structure
 *
 * Usage:
 * ```tsx
 * import { useQuery } from '@tanstack/react-query';
 * import { queryKeys } from '@/lib/queryKeys';
 *
 * function useRoom(roomId: string) {
 *   return useQuery({
 *     queryKey: queryKeys.rooms.detail(roomId),
 *     queryFn: () => fetchRoom(roomId),
 *   });
 * }
 * ```
 *
 * Invalidation Example:
 * ```tsx
 * // Invalidate all room queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
 *
 * // Invalidate specific room
 * queryClient.invalidateQueries({ queryKey: queryKeys.rooms.detail(roomId) });
 * ```
 *
 * Related Files:
 * - lib/queryClient.ts - QueryClient configuration
 * - features/*/hooks/*.ts - Query hooks using these keys
 */

export const queryKeys = {
  // Room queries
  rooms: {
    all: ['rooms'] as const,
    lists: () => [...queryKeys.rooms.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.rooms.lists(), { filters }] as const,
    details: () => [...queryKeys.rooms.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.rooms.details(), id] as const,
    players: (roomId: string) => [...queryKeys.rooms.detail(roomId), 'players'] as const,
  },

  // Player queries
  players: {
    all: ['players'] as const,
    current: () => [...queryKeys.players.all, 'current'] as const,
    detail: (wallet: string) => [...queryKeys.players.all, wallet] as const,
    entries: (wallet: string) => [...queryKeys.players.detail(wallet), 'entries'] as const,
  },

  // Charity queries
  charities: {
    all: ['charities'] as const,
    search: (query: string) => [...queryKeys.charities.all, 'search', query] as const,
    detail: (id: string) => [...queryKeys.charities.all, 'detail', id] as const,
  },

  // Blockchain queries
  blockchain: {
    all: ['blockchain'] as const,
    connection: () => [...queryKeys.blockchain.all, 'connection'] as const,
    balance: (wallet: string) => [...queryKeys.blockchain.all, 'balance', wallet] as const,
    transactions: (wallet: string) => [...queryKeys.blockchain.all, 'transactions', wallet] as const,
  },
} as const;
