/**
 * Fundraisely Smart Contract Integration Hook
 *
 * Primary interface for all Solana blockchain interactions in the Fundraisely platform. Provides
 * type-safe methods to create fundraising rooms, join as players, and distribute prizes via the
 * deployed Anchor program. Handles complex PDA derivation for Room, RoomVault, and PlayerEntry
 * accounts, manages SPL token transfers for entry fees, and simulates transactions before sending
 * to prevent failed transactions. Used by CreateRoomPage for room initialization and RoomPage for
 * player joins. Integrates with transactionHelpers.ts for validation and config.ts for network
 * settings. Exposes query methods (getRoomInfo, getPlayerEntry) for fetching on-chain state and
 * PDA derivation helpers for building custom transactions. Core blockchain layer of the application.
 */

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo } from 'react';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { PROGRAM_ID, PDA_SEEDS, TX_CONFIG } from './config';
import {
  simulateTransaction,
  validateTransactionInputs,
  formatTransactionError,
} from './transactionHelpers';

// Import IDL - This must be copied after: anchor build && cp target/idl/fundraisely.json src/idl/
// Temporarily disabled until full IDL is generated
// @ts-ignore - IDL type mismatch (Anchor generates its own types)
// import FundraiselyIDL from '@/idl/fundraisely.json';

// ============================================================================
// Types - Match Solana program structs exactly
// ============================================================================

export interface CreatePoolRoomParams {
  roomId: string; // Human-readable room identifier (max 32 chars)
  entryFee: BN; // Entry fee in token base units (e.g., lamports for SOL)
  maxPlayers: number; // Maximum players allowed (prevents DOS)
  hostFeeBps: number; // Host fee in basis points: 0-500 (0-5%)
  prizePoolBps: number; // Prize pool in basis points: 0-4000 (0-40%)
  firstPlacePct: number; // First place prize percentage: 0-100
  secondPlacePct?: number; // Second place prize percentage: 0-100 (optional)
  thirdPlacePct?: number; // Third place prize percentage: 0-100 (optional)
  charityMemo: string; // Memo for charity transfer (max 28 chars)
  expirationSlots?: BN; // Optional: slots until room expires (~43200 = 24 hours)
  feeTokenMint: PublicKey; // SPL token mint for entry fees
}

export interface JoinRoomParams {
  roomId: string; // Room identifier
  hostPubkey: PublicKey; // Room host's pubkey (needed for PDA derivation)
  extrasAmount: BN; // Additional donation beyond entry fee (optional)
  feeTokenMint: PublicKey; // SPL token mint (must match room's mint)
}

export interface EndRoomParams {
  roomId: string; // Room identifier
  hostPubkey: PublicKey; // Room host's pubkey (must match caller or room expired)
  winners: PublicKey[]; // Winner pubkeys (1-3 winners, host cannot be winner)
  feeTokenMint: PublicKey; // SPL token mint
}

export interface RoomInfo {
  roomId: string;
  host: PublicKey;
  feeTokenMint: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  playerCount: number;
  totalCollected: BN;
  status: any; // RoomStatus enum
  ended: boolean;
  expirationSlot: BN;
  hostFeeBps: number;
  prizePoolBps: number;
  charityBps: number;
}

export interface PlayerEntryInfo {
  player: PublicKey;
  room: PublicKey;
  entryPaid: BN;
  extrasPaid: BN;
  totalPaid: BN;
  joinSlot: BN;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useFundraiselyContract() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, signTransaction } = wallet;

  // Memoize provider - only recreate when wallet/connection changes
  const provider = useMemo(() => {
    if (!publicKey || !signTransaction) return null;

    return new AnchorProvider(
      connection,
      wallet as any, // Anchor expects its own Wallet type
      {
        commitment: TX_CONFIG.commitment,
        preflightCommitment: TX_CONFIG.preflightCommitment,
        skipPreflight: TX_CONFIG.skipPreflight,
      }
    );
  }, [connection, publicKey, signTransaction, wallet]);

  // Memoize program instance - only recreate when provider changes
  // TEMPORARILY DISABLED: Program initialization will work after deployment
  const program = useMemo(() => {
    if (!provider) return null;

    // TODO: Enable after deploying program and generating complete IDL
    // try {
    //   return new Program(FundraiselyIDL as Idl, PROGRAM_ID, provider);
    // } catch (error) {
    //   console.error('[useFundraiselyContract] Failed to create program:', error);
    //   return null;
    // }

    console.warn('[useFundraiselyContract] Program not initialized - deploy contract first');
    return null;
  }, [provider]);

  // ============================================================================
  // PDA Derivation Helpers
  // ============================================================================

  /**
   * Derive GlobalConfig PDA
   * Seeds: ["global-config"]
   */
  const deriveGlobalConfigPDA = useCallback((): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG)],
      PROGRAM_ID
    );
  }, []);

  /**
   * Derive Room PDA
   * Seeds: ["room", host_pubkey, room_id]
   */
  const deriveRoomPDA = useCallback((host: PublicKey, roomId: string): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.ROOM), host.toBuffer(), Buffer.from(roomId)],
      PROGRAM_ID
    );
  }, []);

  /**
   * Derive RoomVault PDA (token account owned by room)
   * Seeds: ["room-vault", room_pubkey]
   */
  const deriveRoomVaultPDA = useCallback((room: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('room-vault'), room.toBuffer()],
      PROGRAM_ID
    );
  }, []);

  /**
   * Derive PlayerEntry PDA
   * Seeds: ["player", room_pubkey, player_pubkey]
   */
  const derivePlayerEntryPDA = useCallback((room: PublicKey, player: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.PLAYER), room.toBuffer(), player.toBuffer()],
      PROGRAM_ID
    );
  }, []);

  // ============================================================================
  // Instruction: Create Pool Room
  // ============================================================================

  const createPoolRoom = useCallback(
    async (params: CreatePoolRoomParams) => {
      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not deployed yet. Run: cd solana-program/fundraisely && anchor deploy');
      }

      // Validate inputs before building transaction
      const validation = validateTransactionInputs({
        entryFee: params.entryFee.toNumber(),
        hostFeeBps: params.hostFeeBps,
        prizePoolBps: params.prizePoolBps,
        roomId: params.roomId,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join('. '));
      }

      // Derive all required PDAs
      const [globalConfig] = deriveGlobalConfigPDA();
      const [room] = deriveRoomPDA(publicKey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);

      console.log('[createPoolRoom] PDAs derived:', {
        globalConfig: globalConfig.toBase58(),
        room: room.toBase58(),
        roomVault: roomVault.toBase58(),
      });

      // Build instruction using Anchor's methods API
      const ix = await program.methods
        .initPoolRoom(
          params.roomId,
          params.entryFee,
          params.maxPlayers,
          params.hostFeeBps,
          params.prizePoolBps,
          params.firstPlacePct,
          params.secondPlacePct ?? null,
          params.thirdPlacePct ?? null,
          params.charityMemo,
          params.expirationSlots ?? null
        )
        .accounts({
          room,
          roomVault,
          feeTokenMint: params.feeTokenMint,
          globalConfig,
          host: publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      // Build transaction and simulate
      const tx = new Transaction().add(ix);
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        throw new Error(formatTransactionError(simResult.error));
      }

      // Send and confirm transaction
      const signature = await provider.sendAndConfirm(tx);

      console.log('✅ Room created successfully:', {
        signature,
        room: room.toBase58(),
        roomId: params.roomId,
      });

      return { signature, room: room.toBase58() };
    },
    [publicKey, program, provider, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA]
  );

  // ============================================================================
  // Instruction: Join Room
  // ============================================================================

  const joinRoom = useCallback(
    async (params: JoinRoomParams) => {
      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not deployed yet. Run: cd solana-program/fundraisely && anchor deploy');
      }

      // Derive PDAs
      const [globalConfig] = deriveGlobalConfigPDA();
      const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);
      const [playerEntry] = derivePlayerEntryPDA(room, publicKey);

      // Get player's Associated Token Account
      const playerTokenAccount = await getAssociatedTokenAddress(
        params.feeTokenMint,
        publicKey
      );

      console.log('[joinRoom] Accounts:', {
        room: room.toBase58(),
        playerEntry: playerEntry.toBase58(),
        playerTokenAccount: playerTokenAccount.toBase58(),
      });

      // Check if ATA exists, create if needed
      const accountInfo = await connection.getAccountInfo(playerTokenAccount);
      const instructions: TransactionInstruction[] = [];

      if (!accountInfo) {
        console.log('[joinRoom] Creating Associated Token Account');
        const createATAIx = createAssociatedTokenAccountInstruction(
          publicKey, // payer
          playerTokenAccount, // ata
          publicKey, // owner
          params.feeTokenMint // mint
        );
        instructions.push(createATAIx);
      }

      // Build join instruction
      const joinIx = await program.methods
        .joinRoom(params.roomId, params.extrasAmount)
        .accounts({
          room,
          playerEntry,
          roomVault,
          playerTokenAccount,
          globalConfig,
          player: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      instructions.push(joinIx);

      // Build transaction and simulate
      const tx = new Transaction().add(...instructions);
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        throw new Error(formatTransactionError(simResult.error));
      }

      // Send and confirm
      const signature = await provider.sendAndConfirm(tx);

      console.log('✅ Player joined room successfully:', {
        signature,
        player: publicKey.toBase58(),
        room: room.toBase58(),
      });

      return { signature, playerEntry: playerEntry.toBase58() };
    },
    [publicKey, program, provider, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA, derivePlayerEntryPDA]
  );

  // ============================================================================
  // Instruction: End Room
  // ============================================================================

  const endRoom = useCallback(
    async (params: EndRoomParams) => {
      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not deployed yet. Run: cd solana-program/fundraisely && anchor deploy');
      }

      // Derive PDAs
      const [globalConfig] = deriveGlobalConfigPDA();
      const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);
      const [roomVault] = deriveRoomVaultPDA(room);

      // Fetch global config to get platform and charity wallets
      const globalConfigAccount = await program.account.globalConfig.fetch(globalConfig);
      const platformWallet = globalConfigAccount.platformWallet as PublicKey;
      const charityWallet = globalConfigAccount.charityWallet as PublicKey;

      // Get token accounts for all recipients
      const platformTokenAccount = await getAssociatedTokenAddress(
        params.feeTokenMint,
        platformWallet
      );
      const charityTokenAccount = await getAssociatedTokenAddress(
        params.feeTokenMint,
        charityWallet
      );
      const hostTokenAccount = await getAssociatedTokenAddress(
        params.feeTokenMint,
        params.hostPubkey
      );

      // Get winner token accounts (must be passed as remaining accounts)
      const winnerTokenAccounts = await Promise.all(
        params.winners.map(winner =>
          getAssociatedTokenAddress(params.feeTokenMint, winner)
        )
      );

      console.log('[endRoom] Recipients:', {
        platform: platformTokenAccount.toBase58(),
        charity: charityTokenAccount.toBase58(),
        host: hostTokenAccount.toBase58(),
        winners: winnerTokenAccounts.map(w => w.toBase58()),
      });

      // Build instruction with remaining accounts for winners
      const ix = await program.methods
        .endRoom(params.roomId, params.winners)
        .accounts({
          room,
          roomVault,
          globalConfig,
          platformTokenAccount,
          charityTokenAccount,
          hostTokenAccount,
          host: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(
          winnerTokenAccounts.map(account => ({
            pubkey: account,
            isSigner: false,
            isWritable: true,
          }))
        )
        .instruction();

      // Build transaction and simulate
      const tx = new Transaction().add(ix);
      const simResult = await simulateTransaction(connection, tx);

      if (!simResult.success) {
        throw new Error(formatTransactionError(simResult.error));
      }

      // Send and confirm
      const signature = await provider.sendAndConfirm(tx);

      console.log('✅ Room ended successfully:', {
        signature,
        room: room.toBase58(),
        winners: params.winners.map(w => w.toBase58()),
      });

      return { signature };
    },
    [publicKey, program, provider, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA]
  );

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Fetch room information from on-chain account
   */
  const getRoomInfo = useCallback(
    async (roomPubkey: PublicKey): Promise<RoomInfo | null> => {
      if (!program) return null;

      try {
        const roomAccount = await program.account.room.fetch(roomPubkey);

        return {
          roomId: roomAccount.roomId as string,
          host: roomAccount.host as PublicKey,
          feeTokenMint: roomAccount.feeTokenMint as PublicKey,
          entryFee: roomAccount.entryFee as BN,
          maxPlayers: roomAccount.maxPlayers as number,
          playerCount: roomAccount.playerCount as number,
          totalCollected: roomAccount.totalCollected as BN,
          status: roomAccount.status,
          ended: roomAccount.ended as boolean,
          expirationSlot: roomAccount.expirationSlot as BN,
          hostFeeBps: roomAccount.hostFeeBps as number,
          prizePoolBps: roomAccount.prizePoolBps as number,
          charityBps: roomAccount.charityBps as number,
        };
      } catch (error) {
        console.error('[getRoomInfo] Failed:', error);
        return null;
      }
    },
    [program]
  );

  /**
   * Fetch player entry information
   */
  const getPlayerEntry = useCallback(
    async (playerEntryPubkey: PublicKey): Promise<PlayerEntryInfo | null> => {
      if (!program) return null;

      try {
        const entry = await program.account.playerEntry.fetch(playerEntryPubkey);

        return {
          player: entry.player as PublicKey,
          room: entry.room as PublicKey,
          entryPaid: entry.entryPaid as BN,
          extrasPaid: entry.extrasPaid as BN,
          totalPaid: entry.totalPaid as BN,
          joinSlot: entry.joinSlot as BN,
        };
      } catch (error) {
        console.error('[getPlayerEntry] Failed:', error);
        return null;
      }
    },
    [program]
  );

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    program,
    connected: !!publicKey,
    publicKey,
    // Instructions
    createPoolRoom,
    joinRoom,
    endRoom,
    // Queries
    getRoomInfo,
    getPlayerEntry,
    // PDA Helpers
    deriveRoomPDA,
    derivePlayerEntryPDA,
  };
}
