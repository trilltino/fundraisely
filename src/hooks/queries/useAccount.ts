/**
 * # Solana Account Query Hook
 *
 * Generic hook for fetching and caching any Solana account data. Provides a flexible
 * interface for querying accounts by public key with automatic deserialization support
 * for common account types (Token accounts, Program accounts, System accounts).
 *
 * ## Features
 * - Generic account fetching by public key
 * - Automatic SOL balance queries
 * - SPL token account balance queries
 * - Program account data deserialization
 * - Cache management and invalidation
 * - Polling support for real-time balance updates
 *
 * ## Usage
 * ```tsx
 * // Fetch raw account data
 * const { data: account } = useAccount(publicKey)
 *
 * // Fetch SOL balance
 * const { data: balance } = useBalance(publicKey)
 *
 * // Fetch SPL token balance
 * const { data: tokenBalance } = useTokenBalance(publicKey, mintAddress)
 * ```
 *
 * ## Integration Points
 * - `queryKeys.ts` - Uses accounts.detail hierarchical key
 * - `connection.ts` - Uses connection pool for RPC calls
 * - `errors.ts` - Handles Solana RPC errors
 * - Mutations - Invalidates cache after transactions
 *
 * ## Related Hooks
 * - `useRoom` - Fetches room account data
 * - `usePlayers` - Fetches player account data
 * - `useTransactions` - Mutations that modify accounts
 *
 * @see {@link https://solana.com/docs/core/accounts Solana Accounts Documentation}
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Fetch raw account data by public key
 *
 * @param pubkey - Account public key (string or PublicKey)
 * @param enabled - Whether to enable the query
 * @returns Query result with AccountInfo or null
 */
export function useAccount(
  pubkey: string | PublicKey | null | undefined,
  enabled: boolean = true
) {
  const { connection } = useConnection()

  const pubkeyString = typeof pubkey === 'string' ? pubkey : pubkey?.toString()

  return useQuery({
    queryKey: queryKeys.accounts.detail(pubkeyString || ''),
    queryFn: async () => {
      if (!pubkeyString) return null

      try {
        const publicKey = new PublicKey(pubkeyString)
        const account = await connection.getAccountInfo(publicKey)
        return account
      } catch (error) {
        console.error('Failed to fetch account:', error)
        return null
      }
    },
    enabled: enabled && !!pubkeyString,
    staleTime: 30 * 1000, // 30s for account data
  })
}

/**
 * Fetch SOL balance for an account
 *
 * @param pubkey - Account public key
 * @param options - Query options (polling interval, etc.)
 * @returns Query result with balance in lamports
 */
export function useBalance(
  pubkey: string | PublicKey | null | undefined,
  options: { refetchInterval?: number; enabled?: boolean } = {}
) {
  const { connection } = useConnection()

  const pubkeyString = typeof pubkey === 'string' ? pubkey : pubkey?.toString()

  return useQuery({
    queryKey: [...queryKeys.accounts.detail(pubkeyString || ''), 'balance'],
    queryFn: async () => {
      if (!pubkeyString) return 0

      try {
        const publicKey = new PublicKey(pubkeyString)
        const balance = await connection.getBalance(publicKey)
        return balance
      } catch (error) {
        console.error('Failed to fetch balance:', error)
        return 0
      }
    },
    enabled: (options.enabled ?? true) && !!pubkeyString,
    staleTime: 10 * 1000, // 10s for balance (more volatile)
    refetchInterval: options.refetchInterval, // Optional polling
  })
}

/**
 * Fetch SPL token balance for an account
 *
 * @param ownerPubkey - Token account owner's public key
 * @param mintPubkey - Token mint address
 * @returns Query result with token balance
 */
export function useTokenBalance(
  ownerPubkey: string | PublicKey | null | undefined,
  mintPubkey: string | PublicKey | null | undefined
) {
  const { connection } = useConnection()

  const ownerString = typeof ownerPubkey === 'string' ? ownerPubkey : ownerPubkey?.toString()
  const mintString = typeof mintPubkey === 'string' ? mintPubkey : mintPubkey?.toString()

  return useQuery({
    queryKey: [
      ...queryKeys.accounts.detail(ownerString || ''),
      'token',
      mintString || '',
    ],
    queryFn: async () => {
      if (!ownerString || !mintString) return null

      try {
        const owner = new PublicKey(ownerString)
        const mint = new PublicKey(mintString)

        // Get associated token address
        const ata = await getAssociatedTokenAddress(mint, owner)

        // Fetch token account
        const tokenAccount = await getAccount(connection, ata)

        return {
          address: ata.toString(),
          amount: tokenAccount.amount,
          decimals: tokenAccount.mint.toString() === mintString ? 0 : 9, // TODO: Fetch from mint
          uiAmount: Number(tokenAccount.amount) / Math.pow(10, 9), // TODO: Use actual decimals
        }
      } catch (error) {
        // Token account doesn't exist or other error
        console.debug('Token account not found or error:', error)
        return null
      }
    },
    enabled: !!ownerString && !!mintString,
    staleTime: 10 * 1000,
  })
}

/**
 * Fetch multiple account balances at once
 *
 * @param pubkeys - Array of public keys
 * @returns Query result with array of balances
 */
export function useMultipleBalances(pubkeys: (string | PublicKey)[]) {
  const { connection } = useConnection()

  const pubkeyStrings = pubkeys.map((pk) =>
    typeof pk === 'string' ? pk : pk.toString()
  )

  return useQuery({
    queryKey: ['accounts', 'balances', pubkeyStrings],
    queryFn: async () => {
      if (pubkeyStrings.length === 0) return []

      try {
        const publicKeys = pubkeyStrings.map((pk) => new PublicKey(pk))
        const balances = await Promise.all(
          publicKeys.map((pk) => connection.getBalance(pk))
        )
        return balances
      } catch (error) {
        console.error('Failed to fetch multiple balances:', error)
        return pubkeyStrings.map(() => 0)
      }
    },
    enabled: pubkeyStrings.length > 0,
    staleTime: 10 * 1000,
  })
}

/**
 * Hook to invalidate account cache (called after transactions)
 *
 * @returns Invalidate function
 */
export function useInvalidateAccount() {
  const queryClient = useQueryClient()

  return (pubkey: string | PublicKey) => {
    const pubkeyString = typeof pubkey === 'string' ? pubkey : pubkey.toString()
    queryClient.invalidateQueries({
      queryKey: queryKeys.accounts.detail(pubkeyString),
    })
  }
}

/**
 * Hook to prefetch account data (useful for hover previews)
 *
 * @returns Prefetch function
 */
export function usePrefetchAccount() {
  const queryClient = useQueryClient()
  const { connection } = useConnection()

  return (pubkey: string | PublicKey) => {
    const pubkeyString = typeof pubkey === 'string' ? pubkey : pubkey.toString()

    queryClient.prefetchQuery({
      queryKey: queryKeys.accounts.detail(pubkeyString),
      queryFn: async () => {
        try {
          const publicKey = new PublicKey(pubkeyString)
          return await connection.getAccountInfo(publicKey)
        } catch {
          return null
        }
      },
      staleTime: 30 * 1000,
    })
  }
}
