/**
 * Room Query Hooks
 *
 * TanStack Query hooks for room data fetching with optimistic updates.
 * Following patterns from: tanstack-query-reference/examples/react/optimistic-updates-cache
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { queryKeys, invalidateRoomQueries } from '@/lib/queryKeys';
import { fetchRoom } from '@/lib/solana/accounts';
import { createPoolRoom, joinRoom, type InitPoolRoomArgs } from '@/lib/solana/program';

/**
 * Fetch room data with automatic caching
 * Uses query key factory for proper invalidation
 */
export function useRoomQuery(roomId: string | null, hostPublicKey?: string) {
  return useQuery({
    queryKey: queryKeys.rooms.detail(roomId || ''),
    queryFn: async () => {
      if (!roomId || !hostPublicKey) {
        throw new Error('Room ID and host public key required');
      }
      const host = new PublicKey(hostPublicKey);
      const result = await fetchRoom(host, roomId);
      if (!result) {
        throw new Error('Room not found');
      }
      return result;
    },
    enabled: !!roomId && !!hostPublicKey,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

/**
 * Create a new room with optimistic update
 * Pattern: Optimistic mutations with rollback
 */
export function useCreateRoomMutation() {
  const queryClient = useQueryClient();
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  return useMutation({
    mutationFn: async (args: InitPoolRoomArgs) => {
      if (!publicKey || !signTransaction || !signAllTransactions) {
        throw new Error('Wallet not connected');
      }

      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: 'confirmed' }
      );

      return await createPoolRoom(provider, args);
    },

    // Optimistic update: Add room to cache immediately
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.rooms.all,
      });

      // Snapshot previous value
      const previousRooms = queryClient.getQueryData(queryKeys.rooms.lists());

      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.rooms.lists(),
        (old: any) => {
          const newRoom = {
            roomId: variables.roomId,
            host: publicKey?.toBase58(),
            status: 'AwaitingFunding',
            entryFee: variables.entryFee,
            maxPlayers: variables.maxPlayers,
            currentPlayers: 0,
          };
          return old ? [...old, newRoom] : [newRoom];
        }
      );

      return { previousRooms };
    },

    // Rollback on error
    onError: (error, variables, context) => {
      console.error('Room creation failed:', error);
      if (context?.previousRooms) {
        queryClient.setQueryData(
          queryKeys.rooms.lists(),
          context.previousRooms
        );
      }
    },

    // Refetch on success
    onSuccess: (data, variables) => {
      // Invalidate room lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.rooms.all,
      });

      // Invalidate account balance (reduced after paying fees)
      queryClient.invalidateQueries({
        queryKey: queryKeys.account.balance(publicKey?.toBase58()),
      });

      console.log('[COMPLETE] Room created successfully:', data.roomPDA.toBase58());
    },
  });
}

/**
 * Join a room with optimistic player list update
 * Pattern: Optimistic updates with cache rollback
 */
export function useJoinRoomMutation() {
  const queryClient = useQueryClient();
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  return useMutation({
    mutationFn: async (args: {
      roomId: string;
      hostPublicKey: string;
      extrasAmount?: bigint;
    }) => {
      if (!publicKey || !signTransaction || !signAllTransactions) {
        throw new Error('Wallet not connected');
      }

      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: 'confirmed' }
      );

      const host = new PublicKey(args.hostPublicKey);
      return await joinRoom(provider, host, {
        roomId: args.roomId,
        extrasAmount: args.extrasAmount,
      });
    },

    // Optimistic update: Add player to room immediately
    onMutate: async (variables) => {
      const roomKey = queryKeys.rooms.detail(variables.roomId);

      await queryClient.cancelQueries({ queryKey: roomKey });

      const previousRoom = queryClient.getQueryData(roomKey);

      // Optimistically update player count
      queryClient.setQueryData(roomKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          room: {
            ...old.room,
            currentPlayers: old.room.currentPlayers + 1,
          },
        };
      });

      return { previousRoom };
    },

    // Rollback on error
    onError: (error, variables, context) => {
      console.error('Join room failed:', error);
      if (context?.previousRoom) {
        queryClient.setQueryData(
          queryKeys.rooms.detail(variables.roomId),
          context.previousRoom
        );
      }
    },

    // Refetch on success
    onSuccess: (data, variables) => {
      // Invalidate room data
      invalidateRoomQueries(queryClient, variables.roomId);

      // Invalidate player list
      queryClient.invalidateQueries({
        queryKey: queryKeys.players.byRoom(variables.roomId),
      });

      // Invalidate account balance
      queryClient.invalidateQueries({
        queryKey: queryKeys.account.balance(publicKey?.toBase58()),
      });

      console.log('[COMPLETE] Joined room successfully:', data.playerEntryPDA.toBase58());
    },
  });
}

/**
 * Prefetch room data for faster navigation
 * Call this before navigating to a room page
 */
export function usePrefetchRoom() {
  const queryClient = useQueryClient();

  return async (roomId: string, hostPublicKey: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.rooms.detail(roomId),
      queryFn: async () => {
        const host = new PublicKey(hostPublicKey);
        const result = await fetchRoom(host, roomId);
        if (!result) throw new Error('Room not found');
        return result;
      },
      staleTime: 30 * 1000,
    });
  };
}
