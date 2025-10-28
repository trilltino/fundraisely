/**
 * Fundraisely Solana Program Integration Helpers
 *
 * **Purpose:**
 * Provides high-level wrapper functions for interacting with the Fundraisely Solana smart contract.
 * Abstracts complex PDA derivation, account preparation, and transaction construction into simple
 * async functions. Serves as the primary integration layer between frontend React code and the
 * deployed Anchor program.
 *
 * **Core Operations:**
 * 1. **PDA Derivation**: Deterministic address generation for Room, RoomVault, PlayerEntry, etc.
 * 2. **Room Management**: Create pool-based fundraising rooms
 * 3. **Player Actions**: Join rooms by paying entry fees
 * 4. **Prize Distribution**: End rooms and atomically distribute funds to winners
 * 5. **Admin Functions**: Token registry management, global config updates
 * 6. **Query Functions**: Fetch on-chain room data, check token approvals
 *
 * **PDA (Program Derived Address) Hierarchy:**
 * ```
 * Program: DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
 * │
 * ├─ GlobalConfig PDA
 * │   └─ Seeds: ["global_config"]
 * │   └─ Stores: platform_wallet, platform_fee_bps
 * │
 * ├─ TokenRegistry PDA
 * │   └─ Seeds: ["token_registry"]
 * │   └─ Stores: approved_tokens[] (allowlist of SPL tokens)
 * │
 * ├─ Room PDA (per game)
 * │   └─ Seeds: ["room", host_pubkey, room_id]
 * │   └─ Stores: entry_fee, max_players, prize_distribution, status
 * │   │
 * │   ├─ RoomVault PDA (token escrow)
 * │   │   └─ Seeds: ["room_vault", room_pda]
 * │   │   └─ Holds: All entry fees + extras until distribution
 * │   │
 * │   └─ PlayerEntry PDA[] (per player)
 * │       └─ Seeds: ["player", room_pda, player_pubkey]
 * │       └─ Stores: entry_paid, extras_paid, total_paid
 * ```
 *
 * **Integration with Frontend:**
 * - Used by: `useFundraiselyContract.ts` (React hook wrapper)
 * - Called from: Room creation flows, join flows, prize distribution
 * - Returns: Transaction signatures, PDA addresses, account data
 *
 * **Integration with Solana Program:**
 * - Calls: Deployed Fundraisely Anchor program
 * - Uses: IDL from `@/idl/fundraisely.json` (auto-generated from Rust code)
 * - Network: Configurable (devnet/mainnet-beta via RPC endpoint)
 *
 * **Transaction Flow:**
 * 1. **Room Creation (Host):**
 *    - Derive Room PDA + RoomVault PDA
 *    - Call `init_pool_room` instruction
 *    - Result: Room account created, vault initialized
 *
 * 2. **Player Join:**
 *    - Derive PlayerEntry PDA
 *    - Fetch room to get token mint
 *    - Get player's Associated Token Account (ATA)
 *    - Call `join_room` instruction
 *    - Result: Entry fee transferred to vault, PlayerEntry created
 *
 * 3. **Prize Distribution (Host):**
 *    - Fetch room + global config
 *    - Derive all token accounts (platform, charity, host, winners)
 *    - Call `end_room` instruction
 *    - Result: Vault funds distributed to all parties atomically
 *
 * **Error Handling:**
 * All functions may throw Anchor/Solana errors:
 * - `InsufficientFunds`: Player doesn't have enough tokens
 * - `RoomFull`: Max players reached
 * - `RoomNotActive`: Room already ended or not started
 * - `Unauthorized`: Only host can end room
 * - Account errors: PDA not found, invalid signer, etc.
 *
 * **Type Conversions:**
 * - BigInt ↔ BN (Anchor BigNumber): `toBN()`, `lamportsToSol()`, `solToLamports()`
 * - PublicKey ↔ string: `new PublicKey(string)`, `publicKey.toBase58()`
 * - Token amounts: Always in base units (lamports for SOL, smallest unit for SPL)
 *
 * **Usage Example:**
 * ```typescript
 * import { createPoolRoom, joinRoom, endRoom } from '@/lib/solana/program';
 * import { AnchorProvider } from '@coral-xyz/anchor';
 * import { PublicKey } from '@solana/web3.js';
 *
 * // Create a room (host)
 * const { signature, roomPDA } = await createPoolRoom(provider, {
 *   roomId: 'my-bingo-room',
 *   charityWallet: new PublicKey('Char1ty...'),
 *   entryFee: BigInt(5_000_000), // 0.005 SOL
 *   maxPlayers: 50,
 *   hostFeeBps: 300, // 3%
 *   prizePoolBps: 2000, // 20%
 *   firstPlacePct: 60,
 *   secondPlacePct: 30,
 *   thirdPlacePct: 10,
 *   charityMemo: 'Bingo for Good',
 *   expirationSlots: BigInt(43200), // ~24 hours
 * });
 *
 * // Join as player
 * const { signature: joinSig } = await joinRoom(provider, hostPubkey, {
 *   roomId: 'my-bingo-room',
 *   extrasAmount: BigInt(1_000_000), // Optional extra donation
 * });
 *
 * // Distribute prizes (host)
 * const { signature: endSig } = await endRoom(provider, {
 *   roomId: 'my-bingo-room',
 *   winners: [winner1Pubkey, winner2Pubkey, winner3Pubkey],
 * });
 * ```
 *
 * **Future Enhancements:**
 * - Add `declareWinners()` wrapper for new two-step distribution
 * - Add `simulateTransaction()` for pre-flight checks
 * - Add `estimateFees()` for gas estimation
 * - Add `cancelRoom()` for refunds if room doesn't fill
 *
 * @module lib/solana/program
 * @category Blockchain Integration
 */
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, NATIVE_MINT } from '@solana/spl-token';
import { PROGRAM_ID, SEEDS, InitPoolRoomArgs, JoinRoomArgs, EndRoomArgs } from '@/types/program.types';
import fundraiselyIDLJson from '@/idl/fundraisely.json';
import BN from 'bn.js';

// Cast IDL to proper type
const fundraiselyIDL = fundraiselyIDLJson as Idl;

/**
 * Convert bigint to BN (BigNumber) for Anchor
 * Anchor expects BN instances, not native bigint
 */
function toBN(value: bigint | number): BN {
  if (typeof value === 'bigint') {
    return new BN(value.toString());
  }
  return new BN(value);
}

/**
 * Get the Program instance
 */
export function getFundraiselyProgram(provider: AnchorProvider) {
  return new Program(fundraiselyIDL, provider);
}

/**
 * Derive Room PDA
 */
export function getRoomPDA(host: PublicKey, roomId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.ROOM, host.toBuffer(), Buffer.from(roomId)],
    PROGRAM_ID
  );
}

/**
 * Derive Room Vault PDA
 */
export function getRoomVaultPDA(roomPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.ROOM_VAULT, roomPDA.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Player Entry PDA
 */
export function getPlayerEntryPDA(roomPDA: PublicKey, player: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.PLAYER, roomPDA.toBuffer(), player.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Global Config PDA
 */
export function getGlobalConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.GLOBAL_CONFIG],
    PROGRAM_ID
  );
}

/**
 * Derive Token Registry PDA
 */
export function getTokenRegistryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.TOKEN_REGISTRY],
    PROGRAM_ID
  );
}

/**
 * Create a pool-based room (most common for Bingo)
 *
 * @param provider Anchor provider
 * @param args Room creation arguments
 * @returns Transaction signature
 */
export async function createPoolRoom(
  provider: AnchorProvider,
  args: InitPoolRoomArgs
) {
  const program = getFundraiselyProgram(provider);
  const host = provider.wallet.publicKey;

  const [roomPDA] = getRoomPDA(host, args.roomId);
  const [roomVaultPDA] = getRoomVaultPDA(roomPDA);
  const [globalConfigPDA] = getGlobalConfigPDA();
  const [tokenRegistryPDA] = getTokenRegistryPDA();

  // Use Wrapped SOL (wSOL) mint for native SOL payments
  // NATIVE_MINT = So11111111111111111111111111111111111111112
  const feeTokenMint = NATIVE_MINT;

  const tx = await program.methods
    .initPoolRoom(
      args.roomId,
      args.charityWallet,
      toBN(args.entryFee), // Convert bigint to BN
      args.maxPlayers,
      args.hostFeeBps,
      args.prizePoolBps,
      args.firstPlacePct,
      args.secondPlacePct,
      args.thirdPlacePct,
      args.charityMemo,
      args.expirationSlots ? toBN(args.expirationSlots) : null // Convert optional bigint to BN
    )
    .accounts({
      room: roomPDA,
      roomVault: roomVaultPDA,
      feeTokenMint,
      tokenRegistry: tokenRegistryPDA,
      globalConfig: globalConfigPDA,
      host,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return { signature: tx, roomPDA, roomVaultPDA };
}

/**
 * Join a room by paying entry fee
 *
 * @param provider Anchor provider
 * @param hostPublicKey Host's public key
 * @param args Join room arguments
 * @returns Transaction signature
 */
export async function joinRoom(
  provider: AnchorProvider,
  hostPublicKey: PublicKey,
  args: JoinRoomArgs
) {
  const program = getFundraiselyProgram(provider);
  const player = provider.wallet.publicKey;

  const [roomPDA] = getRoomPDA(hostPublicKey, args.roomId);
  const [roomVaultPDA] = getRoomVaultPDA(roomPDA);
  const [playerEntryPDA] = getPlayerEntryPDA(roomPDA, player);
  const [globalConfigPDA] = getGlobalConfigPDA();

  // Fetch room to get token mint
  const roomAccount = await program.account.room.fetch(roomPDA);
  const playerTokenAccount = await getAssociatedTokenAddress(
    roomAccount.feeTokenMint as PublicKey,
    player
  );

  const tx = await program.methods
    .joinRoom(args.roomId, args.extrasAmount)
    .accounts({
      room: roomPDA,
      playerEntry: playerEntryPDA,
      roomVault: roomVaultPDA,
      playerTokenAccount,
      globalConfig: globalConfigPDA,
      player,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature: tx, playerEntryPDA };
}

/**
 * End room and distribute prizes to winners
 *
 * @param provider Anchor provider
 * @param args End room arguments
 * @returns Transaction signature
 */
export async function endRoom(
  provider: AnchorProvider,
  args: EndRoomArgs
) {
  const program = getFundraiselyProgram(provider);
  const host = provider.wallet.publicKey;

  const [roomPDA] = getRoomPDA(host, args.roomId);
  const [roomVaultPDA] = getRoomVaultPDA(roomPDA);
  const [globalConfigPDA] = getGlobalConfigPDA();

  // Fetch room and global config to get token accounts
  const roomAccount = await program.account.room.fetch(roomPDA);
  const globalConfig = await program.account.globalConfig.fetch(globalConfigPDA);

  const platformTokenAccount = await getAssociatedTokenAddress(
    roomAccount.feeTokenMint as PublicKey,
    globalConfig.platformWallet as PublicKey
  );

  const charityTokenAccount = await getAssociatedTokenAddress(
    roomAccount.feeTokenMint as PublicKey,
    roomAccount.charityWallet as PublicKey
  );

  const hostTokenAccount = await getAssociatedTokenAddress(
    roomAccount.feeTokenMint as PublicKey,
    host
  );

  const tx = await program.methods
    .endRoom(args.roomId, args.winners)
    .accounts({
      room: roomPDA,
      roomVault: roomVaultPDA,
      globalConfig: globalConfigPDA,
      platformTokenAccount,
      charityTokenAccount,
      hostTokenAccount,
      host,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return { signature: tx };
}

/**
 * Initialize the token registry (one-time setup, admin only)
 *
 * @param provider Anchor provider (must be admin)
 * @returns Transaction signature
 */
export async function initializeTokenRegistry(provider: AnchorProvider) {
  const program = getFundraiselyProgram(provider);
  const admin = provider.wallet.publicKey;
  const [tokenRegistryPDA] = getTokenRegistryPDA();

  const tx = await program.methods
    .initializeTokenRegistry()
    .accounts({
      tokenRegistry: tokenRegistryPDA,
      admin,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature: tx, tokenRegistryPDA };
}

/**
 * Add a token to the approved list (admin only)
 *
 * @param provider Anchor provider (must be admin)
 * @param tokenMint Token mint address to approve
 * @returns Transaction signature
 */
export async function addApprovedToken(
  provider: AnchorProvider,
  tokenMint: PublicKey
) {
  const program = getFundraiselyProgram(provider);
  const admin = provider.wallet.publicKey;
  const [tokenRegistryPDA] = getTokenRegistryPDA();

  const tx = await program.methods
    .addApprovedToken(tokenMint)
    .accounts({
      tokenRegistry: tokenRegistryPDA,
      admin,
    })
    .rpc();

  return { signature: tx };
}

/**
 * Check if token registry is initialized and if a token is approved
 *
 * @param connection Solana connection
 * @param tokenMint Token mint to check (optional)
 * @returns Token registry status
 */
export async function checkTokenRegistry(
  connection: Connection,
  tokenMint?: PublicKey
) {
  const provider = new AnchorProvider(
    connection,
    {} as any,
    { commitment: 'confirmed' }
  );

  const program = new Program(fundraiselyIDL, provider);
  const [tokenRegistryPDA] = getTokenRegistryPDA();

  try {
    const tokenRegistry = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
    const isApproved = tokenMint
      ? tokenRegistry.approvedTokens.some((t: any) => t.equals(tokenMint))
      : false;

    return {
      initialized: true,
      tokenRegistryPDA,
      approvedTokens: tokenRegistry.approvedTokens,
      isApproved,
    };
  } catch (err) {
    return {
      initialized: false,
      tokenRegistryPDA,
      approvedTokens: [],
      isApproved: false,
    };
  }
}

/**
 * Fetch a room by ID
 */
export async function fetchRoom(
  connection: Connection,
  hostPublicKey: PublicKey,
  roomId: string
) {
  const provider = new AnchorProvider(
    connection,
    {} as any,
    { commitment: 'confirmed' }
  );

  const program = new Program(fundraiselyIDL, provider);
  const [roomPDA] = getRoomPDA(hostPublicKey, roomId);

  try {
    const room = await program.account.room.fetch(roomPDA);
    return { room, roomPDA };
  } catch (err) {
    console.error('Room not found:', err);
    return null;
  }
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1_000_000_000;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000));
}
