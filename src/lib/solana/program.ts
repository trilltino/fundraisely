// Fundraisely Program Integration Helpers
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
