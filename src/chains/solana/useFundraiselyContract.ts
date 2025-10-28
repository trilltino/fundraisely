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
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
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

// Import IDL - Generated from deployed Solana program
import FundraiselyIDL from '@/idl/fundraisely.json';
import type { Idl } from '@coral-xyz/anchor';

// ============================================================================
// Types - Match Solana program structs exactly
// ============================================================================

export interface CreatePoolRoomParams {
  roomId: string; // Human-readable room identifier (max 32 chars)
  charityWallet: PublicKey; // Charity's Solana wallet address (from TGB or custom)
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

export interface DeclareWinnersParams {
  roomId: string; // Room identifier
  hostPubkey: PublicKey; // Room host's pubkey (must match caller)
  winners: PublicKey[]; // Winner pubkeys (1-3 winners, host cannot be winner)
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
  const program = useMemo((): Program | null => {
    if (!provider) return null;

    try {
      return new Program(FundraiselyIDL as Idl, provider);
    } catch (error) {
      console.error('[useFundraiselyContract] Failed to create program:', error);
      return null;
    }
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

  /**
   * Creates a new fundraising room on-chain with configurable fee structure.
   *
   * **Transaction Flow:**
   * 1. Validates input parameters (room ID, fees, prize splits)
   * 2. Derives Program Derived Addresses (PDAs) for room and vault
   * 3. Builds and simulates transaction before submission
   * 4. Submits `init_pool_room` instruction to Solana program
   * 5. Returns room PDA and transaction signature
   *
   * **Account Structure Created:**
   * - Room PDA: Stores room configuration, fee structure, player count
   * - RoomVault PDA: SPL token account that holds all collected fees
   *
   * **Fee Distribution Model:**
   * - Platform: 20% (fixed, enforced on-chain)
   * - Host: 0-5% (configurable via hostFeeBps)
   * - Prize Pool: 0-40% (configurable via prizePoolBps)
   * - Charity: Remainder (minimum 40%, enforced: 100% - platform - host - prize)
   *
   * **Prize Split Configuration:**
   * - First place: Required (0-100%)
   * - Second place: Optional (0-100%)
   * - Third place: Optional (0-100%)
   * - Must sum to 100% if multiple winners declared
   *
   * @param params - Room creation parameters
   * @param params.roomId - Unique identifier for room (max 32 chars, used in PDA seed)
   * @param params.charityWallet - Solana public key of charity recipient
   * @param params.entryFee - Fee amount in token base units (e.g., 1 USDC = 1,000,000)
   * @param params.maxPlayers - Maximum allowed players (prevents spam, typical: 100)
   * @param params.hostFeeBps - Host fee in basis points (0-500 = 0-5%)
   * @param params.prizePoolBps - Prize pool in basis points (0-4000 = 0-40%)
   * @param params.firstPlacePct - First place prize percentage (0-100)
   * @param params.secondPlacePct - Optional second place percentage (0-100)
   * @param params.thirdPlacePct - Optional third place percentage (0-100)
   * @param params.charityMemo - Memo attached to charity transfer (max 28 chars)
   * @param params.expirationSlots - Optional expiration in slots (~43200 = 24 hours)
   * @param params.feeTokenMint - SPL token mint address (USDC, SOL, etc.)
   *
   * @returns Promise resolving to creation result
   * @returns result.signature - Solana transaction signature
   * @returns result.room - Room PDA address (base58 string)
   *
   * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
   * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
   * @throws {Error} Validation errors - If fee structure invalid (charity < 40%)
   * @throws {Error} Transaction simulation errors - If on-chain execution would fail
   *
   * @example
   * ```typescript
   * const { createPoolRoom } = useFundraiselyContract();
   *
   * const result = await createPoolRoom({
   *   roomId: 'bingo-night-2024',
   *   charityWallet: new PublicKey('Char1ty...'),
   *   entryFee: new BN(5_000_000), // 5 USDC
   *   maxPlayers: 100,
   *   hostFeeBps: 300, // 3%
   *   prizePoolBps: 2000, // 20%
   *   firstPlacePct: 60,
   *   secondPlacePct: 30,
   *   thirdPlacePct: 10,
   *   charityMemo: 'Bingo Night Charity',
   *   feeTokenMint: USDC_MINT,
   * });
   *
   * console.log('Room created:', result.room);
   * console.log('Transaction:', result.signature);
   * ```
   *
   * @see {@link https://explorer.solana.com} - View transaction on explorer
   */
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

      // Check wallet has enough SOL for rent
      // With the security fix, we now initialize both Room AND RoomVault token account
      // Both require rent-exempt balance to be paid by the host
      const hostBalance = await connection.getBalance(publicKey);

      // Room PDA rent (~0.002 SOL for account data)
      const ROOM_ACCOUNT_SIZE = 8 + 32 + 32 + 32 + 32 + 8 + 2 + 2 + 2 + 1 + 128 + 4 + 8 + 8 + 8 + 1 + 128 + 8 + 8 + 1; // ~300 bytes
      const roomRent = await connection.getMinimumBalanceForRentExemption(ROOM_ACCOUNT_SIZE);

      // Token Account rent (~0.00204 SOL for 165 bytes)
      const TOKEN_ACCOUNT_SIZE = 165;
      const vaultRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);

      const totalRentRequired = roomRent + vaultRent;
      const TRANSACTION_FEE_BUFFER = 0.001 * 1e9; // 0.001 SOL buffer for transaction fees

      if (hostBalance < totalRentRequired + TRANSACTION_FEE_BUFFER) {
        const requiredSOL = (totalRentRequired + TRANSACTION_FEE_BUFFER) / 1e9;
        const currentSOL = hostBalance / 1e9;
        throw new Error(
          `Insufficient SOL for room creation. ` +
          `Required: ${requiredSOL.toFixed(4)} SOL (${roomRent / 1e9} for room + ${vaultRent / 1e9} for vault + fees). ` +
          `Current balance: ${currentSOL.toFixed(4)} SOL. ` +
          `Please add ${(requiredSOL - currentSOL).toFixed(4)} SOL to your wallet.`
        );
      }

      console.log('[createPoolRoom] Rent validation passed:', {
        hostBalance: (hostBalance / 1e9).toFixed(4),
        roomRent: (roomRent / 1e9).toFixed(6),
        vaultRent: (vaultRent / 1e9).toFixed(6),
        totalRequired: ((totalRentRequired + TRANSACTION_FEE_BUFFER) / 1e9).toFixed(4),
      });

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
          params.charityWallet,
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

      console.log('Room created successfully:', {
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

  /**
   * Joins an existing fundraising room by paying the entry fee and optional extras.
   *
   * **Transaction Flow:**
   * 1. Derives Room PDA from host and room ID
   * 2. Derives PlayerEntry PDA for current wallet
   * 3. Checks if Associated Token Account (ATA) exists for fee token
   * 4. Creates ATA if needed (player pays rent ~0.002 SOL)
   * 5. Transfers entry fee + extras from player to RoomVault
   * 6. Creates PlayerEntry account recording payment amounts
   * 7. Increments room player count
   *
   * **Payment Breakdown:**
   * - Entry Fee: Goes to prize pool (distributed at end)
   * - Extras: 100% to charity (immediate or at distribution)
   *
   * **Account Structure Created:**
   * - PlayerEntry PDA: Records player wallet, fees paid, join timestamp
   * - If missing: Associated Token Account for player (rent-exempt, ~0.002 SOL)
   *
   * **Security:**
   * - Cannot join twice (PlayerEntry PDA prevents duplicate joins)
   * - Cannot join after game started (enforced on-chain)
   * - Cannot join if room full (maxPlayers check on-chain)
   *
   * @param params - Join room parameters
   * @param params.roomId - Room identifier (must match room creation)
   * @param params.hostPubkey - Host's Solana public key (needed for Room PDA derivation)
   * @param params.extrasAmount - Additional donation beyond entry fee (in token base units)
   * @param params.feeTokenMint - SPL token mint (must match room's configured token)
   *
   * @returns Promise resolving to join result
   * @returns result.signature - Solana transaction signature
   * @returns result.playerEntry - PlayerEntry PDA address (base58 string)
   *
   * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
   * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
   * @throws {Error} 'Room not found' - If Room PDA doesn't exist
   * @throws {Error} 'Room full' - If maxPlayers reached
   * @throws {Error} 'Already joined' - If PlayerEntry already exists
   * @throws {Error} 'Insufficient balance' - If player doesn't have enough tokens
   * @throws {Error} Transaction simulation errors - If on-chain execution would fail
   *
   * @example
   * ```typescript
   * const { joinRoom } = useFundraiselyContract();
   *
   * // Join with just entry fee
   * const result = await joinRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   extrasAmount: new BN(0),
   *   feeTokenMint: USDC_MINT,
   * });
   *
   * // Join with extra donation
   * const result2 = await joinRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   extrasAmount: new BN(10_000_000), // +10 USDC donation
   *   feeTokenMint: USDC_MINT,
   * });
   *
   * console.log('Joined room:', result.playerEntry);
   * ```
   *
   * @see {@link https://spl.solana.com/associated-token-account} - ATA spec
   */
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

      console.log('Player joined room successfully:', {
        signature,
        player: publicKey.toBase58(),
        room: room.toBase58(),
      });

      return { signature, playerEntry: playerEntry.toBase58() };
    },
    [publicKey, program, provider, connection, deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA, derivePlayerEntryPDA]
  );

  // ============================================================================
  // Instruction: Declare Winners
  // ============================================================================

  /**
   * Declares the winners of a fundraising room (must be called before endRoom).
   *
   * **Purpose:**
   * This is a TWO-STEP process for prize distribution:
   * 1. `declareWinners()` - Host declares who won (this function)
   * 2. `endRoom()` - Actually distributes funds based on declared winners
   *
   * **Transaction Flow:**
   * 1. Validates 1-3 winners provided
   * 2. Derives Room PDA and PlayerEntry PDAs for each winner
   * 3. Verifies all winners actually joined the room (PlayerEntry exists)
   * 4. Stores winner list in Room account
   * 5. Marks room as ready for distribution
   *
   * **Security:**
   * - Only host can declare winners (enforced on-chain via `has_one = host`)
   * - Host cannot be a winner (enforced on-chain)
   * - All winners must have joined room (PlayerEntry PDA check)
   * - Cannot change winners once declared (idempotent)
   * - Cannot declare after room ended
   *
   * **Prize Distribution:**
   * Prize percentages are set during room creation (firstPlacePct, secondPlacePct, thirdPlacePct).
   * This function does NOT transfer funds - it only records winners.
   * Actual distribution happens in `endRoom()`.
   *
   * @param params - Declare winners parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Host's Solana public key (must match caller)
   * @param params.winners - Array of winner public keys (1-3 players)
   *
   * @returns Promise resolving to declaration result
   * @returns result.signature - Solana transaction signature
   *
   * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
   * @throws {Error} 'Must declare 1-3 winners' - If winners array invalid
   * @throws {Error} 'Not room host' - If caller is not the room host
   * @throws {Error} 'Winner did not join room' - If PlayerEntry doesn't exist
   * @throws {Error} 'Host cannot be winner' - If host in winners array
   * @throws {Error} 'Room already ended' - If room.ended is true
   *
   * @example
   * ```typescript
   * const { declareWinners, endRoom } = useFundraiselyContract();
   *
   * // Step 1: Declare winners
   * await declareWinners({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   winners: [
   *     new PublicKey('Winner1...'), // First place
   *     new PublicKey('Winner2...'), // Second place (optional)
   *     new PublicKey('Winner3...'), // Third place (optional)
   *   ],
   * });
   *
   * // Step 2: Distribute prizes
   * await endRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   winners: [...], // Same array
   *   feeTokenMint: USDC_MINT,
   * });
   * ```
   *
   * @see {@link endRoom} - Second step to actually distribute funds
   */
  const declareWinners = useCallback(
    async (params: DeclareWinnersParams) => {
      if (!publicKey || !provider) {
        throw new Error('Wallet not connected');
      }

      if (!program) {
        throw new Error('Program not deployed yet. Run: cd solana-program/fundraisely && anchor deploy');
      }

      // Validate winners
      if (params.winners.length < 1 || params.winners.length > 3) {
        throw new Error('Must declare 1-3 winners');
      }

      // Derive room PDA
      const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);

      // Derive PlayerEntry PDAs for each winner (to verify they actually joined)
      const playerEntryPDAs = params.winners.map(winner => {
        const [playerEntry] = derivePlayerEntryPDA(room, winner);
        return playerEntry;
      });

      console.log('[declareWinners] Declaring winners:', {
        room: room.toBase58(),
        winners: params.winners.map(w => w.toBase58()),
        playerEntries: playerEntryPDAs.map(p => p.toBase58()),
      });

      // Build instruction with PlayerEntry PDAs as remaining_accounts
      const ix = await program.methods
        .declareWinners(params.roomId, params.winners)
        .accounts({
          room,
          host: publicKey,
        })
        .remainingAccounts(
          playerEntryPDAs.map(playerEntry => ({
            pubkey: playerEntry,
            isSigner: false,
            isWritable: false, // Read-only, just verifying they exist
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

      console.log('Winners declared successfully:', {
        signature,
        room: room.toBase58(),
        winners: params.winners.map(w => w.toBase58()),
      });

      return { signature };
    },
    [publicKey, program, provider, connection, deriveRoomPDA, derivePlayerEntryPDA]
  );

  // ============================================================================
  // Instruction: End Room
  // ============================================================================

  /**
   * Ends a fundraising room and atomically distributes all collected funds.
   *
   * **This is the FINAL and CRITICAL transaction** that distributes all funds in a single atomic operation.
   *
   * **Transaction Flow:**
   * 1. Fetches GlobalConfig to get platform and charity wallet addresses
   * 2. Resolves Associated Token Accounts for all recipients (platform, charity, host, winners)
   * 3. Calculates exact distribution amounts based on room fee structure
   * 4. Executes atomic SPL token transfers from RoomVault to all recipients
   * 5. Marks room as ended, preventing further operations
   *
   * **Fund Distribution Breakdown:**
   * ```
   * Total Collected = (entryFee * playerCount) + sum(allExtras)
   *
   * Platform Fee = (entryFee * playerCount) * platformBps / 10000
   * Host Fee = (entryFee * playerCount) * hostBps / 10000
   * Prize Pool = (entryFee * playerCount) * prizeBps / 10000
   * Charity = Remainder + ALL extras (100% of extras to charity)
   *
   * Prize distribution (from Prize Pool):
   * - First place: Prize Pool * firstPlacePct / 100
   * - Second place: Prize Pool * secondPlacePct / 100
   * - Third place: Prize Pool * thirdPlacePct / 100
   * ```
   *
   * **Atomicity Guarantee:**
   * ALL transfers happen in a single transaction. Either:
   * - All succeed (platform, charity, host, all winners get paid)
   * - All fail (transaction reverts, funds stay in RoomVault)
   *
   * No partial distributions possible. This prevents fund loss or disputes.
   *
   * **Prerequisites:**
   * 1. `declareWinners()` must be called first
   * 2. All recipients must have Associated Token Accounts (auto-created if missing)
   * 3. Only host can call (or anyone after expiration)
   * 4. Room must not be already ended
   *
   * **Security:**
   * - Only host can end before expiration (enforced on-chain)
   * - Anyone can end after expiration (allows fund recovery)
   * - Cannot end twice (room.ended flag prevents re-entry)
   * - All math uses checked arithmetic (no overflow/underflow)
   * - Winner validation enforced (must have declared winners)
   *
   * @param params - End room parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Host's Solana public key (for PDA derivation)
   * @param params.winners - Same winners array from declareWinners (1-3 players)
   * @param params.feeTokenMint - SPL token mint used for fees
   *
   * @returns Promise resolving to distribution result
   * @returns result.signature - Solana transaction signature
   *
   * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
   * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
   * @throws {Error} 'Room already ended' - If room.ended is true
   * @throws {Error} 'Winners not declared' - If declareWinners not called
   * @throws {Error} 'Not authorized' - If caller is not host and room not expired
   * @throws {Error} 'Insufficient funds' - If RoomVault balance too low (should not happen)
   * @throws {Error} Transaction simulation errors - If on-chain execution would fail
   *
   * @example
   * ```typescript
   * const { endRoom } = useFundraiselyContract();
   *
   * // End room and distribute funds atomically
   * const result = await endRoom({
   *   roomId: 'bingo-night-2024',
   *   hostPubkey: new PublicKey('Host...'),
   *   winners: [
   *     new PublicKey('Winner1...'),
   *     new PublicKey('Winner2...'),
   *   ],
   *   feeTokenMint: USDC_MINT,
   * });
   *
   * console.log('Funds distributed:', result.signature);
   * // Check Solana Explorer to verify all transfers
   * ```
   *
   * @see {@link declareWinners} - Must be called before this function
   * @see {@link https://explorer.solana.com} - Verify distribution on explorer
   */
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
      // @ts-ignore - Account types available after program deployment
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

      console.log('Room ended successfully:', {
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
        // @ts-ignore - Account types available after program deployment
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
        // @ts-ignore - Account types available after program deployment
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
    declareWinners,
    endRoom,
    // Queries
    getRoomInfo,
    getPlayerEntry,
    // PDA Helpers
    deriveRoomPDA,
    derivePlayerEntryPDA,
  };
}
