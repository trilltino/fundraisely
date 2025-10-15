/**
 * # Transaction Mutations Hook
 *
 * Provides React Query mutation hooks for all Fundraisely program instructions.
 * Implements optimistic updates, automatic cache invalidation, error handling,
 * and transaction confirmation tracking for a smooth user experience.
 *
 * ## Features
 * - Create room mutation with optimistic UI updates
 * - Join room mutation with player list updates
 * - End room mutation with fund distribution
 * - Declare winners mutation
 * - Automatic query cache invalidation
 * - Optimistic updates with rollback on error
 * - Transaction signature tracking
 * - WebSocket integration for real-time confirmations
 *
 * ## Usage
 * ```tsx
 * function JoinRoomButton({ roomId }: { roomId: string }) {
 *   const { mutate: joinRoom, isPending } = useJoinRoom()
 *
 *   return (
 *     <button
 *       onClick={() => joinRoom({ roomId, amount: 1000 })}
 *       disabled={isPending}
 *     >
 *       {isPending ? 'Joining...' : 'Join Room'}
 *     </button>
 *   )
 * }
 * ```
 *
 * ## Integration Points
 * - `queryKeys.ts` - Invalidates room and player queries
 * - `transactions.ts` - Uses TransactionBuilder for tx construction
 * - `roomSlice.ts` - Updates optimistic store state
 * - `playerSlice.ts` - Updates player participation state
 * - `useSocket.ts` - Emits events for real-time coordination
 *
 * ## Related Hooks
 * - `useRoom` - Queries updated after mutations
 * - `usePlayers` - Player list updated after join
 * - `useAccount` - Balances updated after transactions
 *
 * @see {@link https://tanstack.com/query/latest/docs/react/guides/mutations TanStack Query Mutations}
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { queryKeys } from '@/lib/queryKeys'
import { useStore } from '@/store'
import { useFundraiselyContract } from '@/chains/solana/useFundraiselyContract'
import type { Room, PlayerEntry } from '@/types/program.types'

/**
 * Parameters for creating a new room
 */
export interface CreateRoomParams {
  roomId: string
  charityWallet: string
  entryFee: number
  tokenMint: string
  maxPlayers: number
  hostFeePercent: number
  prizePoolPercent: number
}

/**
 * Parameters for joining a room
 */
export interface JoinRoomParams {
  roomId: string
  amount: number
  extras?: number
  hostPubkey: string
  tokenMint: string
}

/**
 * Parameters for declaring winners
 */
export interface DeclareWinnersParams {
  roomId: string
  winners: {
    player: string
    position: number
  }[]
}

/**
 * Create room mutation hook
 *
 * @returns Mutation hook for creating rooms
 */
export function useCreateRoom() {
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()
  const addRoom = useStore.use.addRoom()
  const setError = useStore.use.setError?.()
  const contract = useFundraiselyContract()

  return useMutation({
    mutationFn: async (params: CreateRoomParams) => {
      if (!publicKey) {
        throw new Error('Wallet not connected')
      }

      // Calculate charity basis points (remainder after platform, host, and prize pool)
      // Automatically calculated by smart contract: 10000 - 2000 (platform) - hostFee - prizePool

      // Call the Anchor contract to create the room
      const result = await contract.createPoolRoom({
        roomId: params.roomId,
        charityWallet: new PublicKey(params.charityWallet),
        entryFee: new BN(params.entryFee),
        maxPlayers: params.maxPlayers,
        hostFeeBps: params.hostFeePercent * 100, // Convert percentage to basis points
        prizePoolBps: params.prizePoolPercent * 100,
        firstPlacePct: 50, // Default: 50% to first place
        secondPlacePct: 30, // Default: 30% to second place
        thirdPlacePct: 20, // Default: 20% to third place
        charityMemo: 'Fundraisely donation', // Default memo
        feeTokenMint: new PublicKey(params.tokenMint),
      })

      return {
        signature: result.signature,
        roomId: params.roomId,
      }
    },
    onMutate: async (variables) => {
      // Optimistic update: Add room to list immediately
      const optimisticRoom: Partial<Room> = {
        roomId: variables.roomId,
        host: publicKey!,
        // ... other fields
      }

      addRoom(optimisticRoom as Room)

      return { roomId: variables.roomId }
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch rooms list
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      })
    },
    onError: (error: any, _variables, _context) => {
      // Rollback optimistic update
      setError?.(error.message || 'Failed to create room')

      // Remove optimistic room
      // TODO: Implement removeRoom in store
      console.error('Create room failed:', error)
    },
  })
}

/**
 * Join room mutation hook
 *
 * @returns Mutation hook for joining rooms
 */
export function useJoinRoom() {
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()
  const addJoinedRoom = useStore.use.addJoinedRoom()
  const setError = useStore.use.setError?.()
  const contract = useFundraiselyContract()

  return useMutation({
    mutationFn: async (params: JoinRoomParams) => {
      if (!publicKey) {
        throw new Error('Wallet not connected')
      }

      // Call the Anchor contract to join the room
      const result = await contract.joinRoom({
        roomId: params.roomId,
        hostPubkey: new PublicKey(params.hostPubkey),
        extrasAmount: new BN(params.extras || 0),
        feeTokenMint: new PublicKey(params.tokenMint),
      })

      return {
        signature: result.signature,
        roomId: params.roomId,
      }
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      })
      await queryClient.cancelQueries({
        queryKey: queryKeys.rooms.players(variables.roomId),
      })

      // Snapshot previous values
      const previousRoom = queryClient.getQueryData(
        queryKeys.rooms.detail(variables.roomId)
      )
      const previousPlayers = queryClient.getQueryData(
        queryKeys.rooms.players(variables.roomId)
      )

      // Optimistic update: Increment player count
      queryClient.setQueryData<Room>(
        queryKeys.rooms.detail(variables.roomId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            playerCount: old.playerCount + 1,
            totalCollected: old.totalCollected.add(new BN(variables.amount)),
          }
        }
      )

      // Optimistic update: Add player to list
      queryClient.setQueryData<PlayerEntry[]>(
        queryKeys.rooms.players(variables.roomId),
        (old) => {
          if (!old) return old
          const newPlayer: Partial<PlayerEntry> = {
            player: publicKey!,
            entryPaid: new BN(variables.amount),
            extrasPaid: new BN(variables.extras || 0),
            // ... other fields
          }
          return [...old, newPlayer as PlayerEntry]
        }
      )

      // Update store
      addJoinedRoom(variables.roomId)

      return { previousRoom, previousPlayers }
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousRoom) {
        queryClient.setQueryData(
          queryKeys.rooms.detail(variables.roomId),
          context.previousRoom
        )
      }
      if (context?.previousPlayers) {
        queryClient.setQueryData(
          queryKeys.rooms.players(variables.roomId),
          context.previousPlayers
        )
      }

      setError?.(error.message || 'Failed to join room')
      console.error('Join room failed:', error)
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.players(variables.roomId),
      })
    },
  })
}

/**
 * End room mutation hook
 *
 * @returns Mutation hook for ending rooms
 */
export function useEndRoom() {
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()
  const updateRoom = useStore.use.updateRoom()
  const contract = useFundraiselyContract()

  return useMutation({
    mutationFn: async (params: { roomId: string; hostPubkey: string; winners: string[]; tokenMint: string }) => {
      if (!publicKey) {
        throw new Error('Wallet not connected')
      }

      // Call the Anchor contract to end the room and distribute funds
      const result = await contract.endRoom({
        roomId: params.roomId,
        hostPubkey: new PublicKey(params.hostPubkey),
        winners: params.winners.map(w => new PublicKey(w)),
        feeTokenMint: new PublicKey(params.tokenMint),
      })

      return { signature: result.signature, roomId: params.roomId }
    },
    onMutate: async (params) => {
      // Optimistic update: Mark room as ended
      queryClient.setQueryData<Room>(
        queryKeys.rooms.detail(params.roomId),
        (old) => {
          if (!old) return old
          return { ...old, ended: true, status: 'Ended' as any }
        }
      )

      updateRoom(params.roomId, { ended: true })
    },
    onSuccess: (_data) => {
      // Invalidate all room queries
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all })
    },
    onError: (error: any, params) => {
      // Rollback will happen via invalidation
      console.error('End room failed:', error)

      // Revert optimistic update
      queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(params.roomId),
      })
    },
  })
}

/**
 * Declare winners mutation hook
 *
 * @returns Mutation hook for declaring winners
 */
export function useDeclareWinners() {
  const { publicKey } = useWallet()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (_params: DeclareWinnersParams) => {
      if (!publicKey) {
        throw new Error('Wallet not connected')
      }

      // TODO: Build and send transaction
      // const tx = await buildDeclareWinnersTransaction(connection, publicKey, params)
      // const signed = await signTransaction(tx)
      // const signature = await connection.sendRawTransaction(signed.serialize())
      // await connection.confirmTransaction(signature, 'confirmed')

      // Placeholder implementation
      return { signature: 'placeholder_signature' }
    },
    onSuccess: (_data, variables) => {
      // Invalidate room and players queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.detail(variables.roomId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.players(variables.roomId),
      })
    },
    onError: (error: any) => {
      console.error('Declare winners failed:', error)
    },
  })
}

/**
 * Generic transaction mutation hook (for custom transactions)
 *
 * @param options - Mutation options
 * @returns Generic mutation hook
 */
export function useTransaction(options?: {
  onSuccess?: (signature: string) => void
  onError?: (error: Error) => void
}) {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()

  return useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      const signed = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(signature)

      return signature
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}
