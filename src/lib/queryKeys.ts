/**
 * # Query Key Factory
 *
 * Centralized query key management for TanStack Query. Provides a hierarchical,
 * type-safe factory for generating cache keys used throughout the application.
 */

import type { RoomFilters } from '@/types/program.types'

export const queryKeys = {
  rooms: {
    all: ['rooms'] as const,
    lists: () => [...queryKeys.rooms.all, 'list'] as const,
    list: (filters?: RoomFilters) => [...queryKeys.rooms.lists(), { filters }] as const,
    details: () => [...queryKeys.rooms.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.rooms.details(), id] as const,
    players: (roomId: string) => [...queryKeys.rooms.detail(roomId), 'players'] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    detail: (pubkey: string) => [...queryKeys.accounts.all, pubkey] as const,
    balance: (pubkey: string) => [...queryKeys.accounts.detail(pubkey), 'balance'] as const,
    tokenAccounts: (owner: string) => [...queryKeys.accounts.detail(owner), 'tokens'] as const,
  },
  program: {
    all: ['program'] as const,
    globalConfig: ['program', 'config'] as const,
    stats: ['program', 'stats'] as const,
  },
} as const
