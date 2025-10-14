/**
 * TanStack Query Configuration
 *
 * Centralized configuration for React Query (TanStack Query) used for server state management.
 * This file sets up the QueryClient with optimized defaults for caching, retries, and stale time.
 * The query client is used throughout the app to fetch, cache, and synchronize blockchain data.
 *
 * Features:
 * - Aggressive caching for blockchain data (5-minute stale time)
 * - Automatic retry with exponential backoff
 * - DevTools integration for debugging queries
 * - Query key factories for consistent cache keys
 *
 * Usage:
 * ```tsx
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { queryClient } from '@/lib/queryClient';
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <YourApp />
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * Query Key Factories:
 * - Use consistent naming: ['rooms'], ['rooms', roomId], ['rooms', roomId, 'players']
 * - Enables easy invalidation and prefetching
 * - Documented in queryKeys.ts
 *
 * Related Files:
 * - lib/queryKeys.ts - Query key factory functions
 * - features/*/api/*.ts - API layer using these queries
 * - App.tsx - QueryClientProvider wrapper
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Blockchain data doesn't change frequently, so we can cache aggressively
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)

      // Retry failed queries with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Don't retry mutations by default (blockchain transactions are idempotent)
      retry: false,
    },
  },
});
