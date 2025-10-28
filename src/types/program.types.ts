/**
 * Fundraisely Solana Program Type Definitions
 *
 * **Purpose:**
 * TypeScript type definitions mirroring the Rust structs, enums, and instruction parameters from
 * the deployed Fundraisely Anchor program. These types ensure type-safe interaction between the
 * React frontend and the Solana blockchain, matching the on-chain data structures exactly.
 *
 * **Source:**
 * Auto-generated from Anchor IDL (`fundraisely.json`), then manually refined for better TypeScript
 * ergonomics. When the Solana program is updated, regenerate IDL and update these types accordingly.
 *
 * **Type Categories:**
 * 1. **Program Constants**: PROGRAM_ID, SEEDS (PDA derivation)
 * 2. **Enums**: RoomStatus, PrizeMode
 * 3. **Account Structs**: GlobalConfig, Room, PlayerEntry, TokenRegistry, PrizeAsset
 * 4. **Event Structs**: RoomCreated, PlayerJoined, WinnersDeclared, RoomEnded
 * 5. **Instruction Args**: InitPoolRoomArgs, JoinRoomArgs, DeclareWinnersArgs, EndRoomArgs
 * 6. **Query Types**: RoomFilters (frontend-only, for filtering rooms)
 *
 * **Program Architecture:**
 * ```
 * Fundraisely Program: DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
 * │
 * ├─ GlobalConfig (singleton PDA)
 * │   ├─ admin: Program upgrade authority
 * │   ├─ platformWallet: Receives 20% platform fee
 * │   ├─ charityWallet: Default charity (if none specified)
 * │   ├─ platformFeeBps: Fixed 20% (2000 bps)
 * │   ├─ maxHostFeeBps: Max 5% (500 bps)
 * │   ├─ maxPrizePoolBps: Max 40% (4000 bps)
 * │   └─ minCharityBps: Min 40% (4000 bps)
 * │
 * ├─ TokenRegistry (singleton PDA)
 * │   └─ approvedTokens: Allowlist of SPL token mints (USDC, SOL, etc.)
 * │
 * └─ Room (per game, PDA derived from host + roomId)
 *     ├─ Basic Info: roomId, host, charityWallet, feeTokenMint
 *     ├─ Financial: entryFee, totalCollected, fee allocations (bps)
 *     ├─ Player Management: playerCount, maxPlayers
 *     ├─ Prize Config: prizeMode, prizeDistribution, winners
 *     ├─ Lifecycle: status, ended, creationSlot, expirationSlot
 *     │
 *     ├─ RoomVault (PDA, holds all funds until distribution)
 *     │
 *     └─ PlayerEntry[] (PDA per player)
 *         ├─ player: Player's public key
 *         ├─ room: Room PDA reference
 *         ├─ entryPaid: Entry fee amount
 *         ├─ extrasPaid: Fundraising extras amount
 *         └─ totalPaid: Sum of entry + extras
 * ```
 *
 * **Room Status Lifecycle:**
 * ```
 * AwaitingFunding → PartiallyFunded → Ready → Active → Ended
 *       ↓                  ↓             ↓        ↓       ↓
 *   Created          1+ players    Max players  Game   Winners
 *                      joined       reached    starts  declared
 * ```
 *
 * **Prize Modes:**
 * - **PoolSplit**: Prize pool divided by percentages (e.g., 60/30/10 for 1st/2nd/3rd)
 * - **AssetBased**: Specific NFTs/tokens as prizes (future feature)
 *
 * **Financial Distribution (Basis Points):**
 * Total collected = entry fees + extras
 * - Platform: 20% (2000 bps) - Fixed
 * - Host: 0-5% (0-500 bps) - Configurable
 * - Prizes: 0-40% (0-4000 bps) - Configurable
 * - Charity: 40%+ (4000+ bps) - Remainder (enforced minimum 40%)
 * - Extras: 100% to charity (on top of base allocation)
 *
 * **Events Emitted:**
 * The Solana program emits events that can be monitored off-chain:
 * - `RoomCreated`: When host creates a room
 * - `PlayerJoined`: When player pays entry fee
 * - `WinnersDeclared`: When host declares winners (new two-step flow)
 * - `RoomEnded`: When funds are distributed
 *
 * **Usage Examples:**
 *
 * **Fetching a Room:**
 * ```typescript
 * import { PROGRAM_ID, SEEDS, type Room } from '@/types/program.types';
 * import { PublicKey } from '@solana/web3.js';
 *
 * const [roomPDA] = PublicKey.findProgramAddressSync(
 *   [SEEDS.ROOM, hostPubkey.toBuffer(), Buffer.from(roomId)],
 *   PROGRAM_ID
 * );
 *
 * const roomAccount = await program.account.room.fetch(roomPDA);
 * console.log('Entry fee:', Number(roomAccount.entryFee) / 1e9, 'SOL');
 * console.log('Players:', roomAccount.playerCount, '/', roomAccount.maxPlayers);
 * console.log('Status:', roomAccount.status);
 * ```
 *
 * **Creating a Room:**
 * ```typescript
 * const args: InitPoolRoomArgs = {
 *   roomId: 'bingo-2024-01',
 *   charityWallet: new PublicKey('Char1ty...'),
 *   entryFee: BigInt(5_000_000), // 0.005 SOL
 *   maxPlayers: 50,
 *   hostFeeBps: 300, // 3%
 *   prizePoolBps: 3000, // 30%
 *   firstPlacePct: 60,
 *   secondPlacePct: 30,
 *   thirdPlacePct: 10,
 *   charityMemo: 'Fundraiser for XYZ',
 *   expirationSlots: BigInt(43200), // ~24 hours
 * };
 * ```
 *
 * **Type Safety Benefits:**
 * - Compile-time validation of instruction parameters
 * - IntelliSense for all on-chain account fields
 * - Type-safe event parsing
 * - Prevents serialization errors (bigint vs number, PublicKey vs string)
 *
 * **Regeneration Instructions:**
 * When Solana program is updated:
 * 1. `cd solana-program/fundraisely && anchor build`
 * 2. Copy `target/idl/fundraisely.json` to `src/idl/`
 * 3. Regenerate types: `anchor-client-gen src/idl/fundraisely.json`
 * 4. Manually merge with this file (preserve JSDoc comments)
 *
 * @module types/program
 * @category Blockchain Types
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Fundraisely Program ID (Devnet)
 *
 * Deployed program address on Solana devnet. This is the immutable program ID that all
 * PDAs are derived from and all instructions are sent to.
 *
 * **Networks:**
 * - Devnet: DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq
 * - Mainnet: TBD (not deployed yet)
 *
 * **Verification:**
 * Verify deployment: https://explorer.solana.com/address/DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq?cluster=devnet
 */
export const PROGRAM_ID = new PublicKey('DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq');

// Enums
export enum RoomStatus {
  AwaitingFunding = 'AwaitingFunding',
  PartiallyFunded = 'PartiallyFunded',
  Ready = 'Ready',
  Active = 'Active',
  Ended = 'Ended',
}

export enum PrizeMode {
  PoolSplit = 'PoolSplit',
  AssetBased = 'AssetBased',
}

// Account Types
export interface GlobalConfig {
  admin: PublicKey;
  platformWallet: PublicKey;
  charityWallet: PublicKey;
  platformFeeBps: number;
  maxHostFeeBps: number;
  maxPrizePoolBps: number;
  minCharityBps: number;
  emergencyPause: boolean;
  bump: number;
}

export interface Room {
  roomId: string;
  host: PublicKey;
  charityWallet: PublicKey;
  feeTokenMint: PublicKey;
  entryFee: bigint;
  hostFeeBps: number;
  prizePoolBps: number;
  charityBps: number;
  prizeMode: PrizeMode;
  prizeDistribution: number[];
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  totalCollected: bigint;
  totalEntryFees: bigint;
  totalExtrasFees: bigint;
  ended: boolean;
  creationSlot: bigint;
  expirationSlot: bigint;
  charityMemo: string;
  winners: (PublicKey | null)[];
  prizeAssets: (PrizeAsset | null)[];
  bump: number;
}

export interface PlayerEntry {
  player: PublicKey;
  room: PublicKey;
  entryPaid: bigint;
  extrasPaid: bigint;
  totalPaid: bigint;
  joinSlot: bigint;
  bump: number;
}

export interface PrizeAsset {
  mint: PublicKey;
  amount: bigint;
  deposited: boolean;
}

export interface TokenRegistry {
  admin: PublicKey;
  approvedTokens: PublicKey[];
  bump: number;
}

// Event Types
export interface RoomCreated {
  room: PublicKey;
  roomId: string;
  host: PublicKey;
  entryFee: bigint;
  maxPlayers: number;
  expirationSlot: bigint;
  timestamp: bigint;
}

export interface PlayerJoined {
  room: PublicKey;
  player: PublicKey;
  amountPaid: bigint;
  extrasPaid: bigint;
  playerCount: number;
  timestamp: bigint;
}

export interface WinnersDeclared {
  room: PublicKey;
  winners: (PublicKey | null)[];
  timestamp: bigint;
}

export interface RoomEnded {
  room: PublicKey;
  winners: PublicKey[];
  platformAmount: bigint;
  hostAmount: bigint;
  charityAmount: bigint;
  prizeAmount: bigint;
  totalPlayers: number;
  timestamp: bigint;
}

// Instruction Args Types
export interface InitPoolRoomArgs {
  roomId: string;
  charityWallet: PublicKey;
  entryFee: bigint;
  maxPlayers: number;
  hostFeeBps: number;
  prizePoolBps: number;
  firstPlacePct: number;
  secondPlacePct: number | null;
  thirdPlacePct: number | null;
  charityMemo: string;
  expirationSlots: bigint | null;
}

export interface JoinRoomArgs {
  roomId: string;
  extrasAmount: bigint;
}

export interface DeclareWinnersArgs {
  roomId: string;
  winners: PublicKey[];
}

export interface EndRoomArgs {
  roomId: string;
  winners: PublicKey[];
}

// Aliases for compatibility
export type PoolRoom = Room;
export interface Player {
  wallet: PublicKey;
  name: string;
  hasPaid: boolean;
}

export interface RoomFilters {
  status?: RoomStatus;
  host?: PublicKey;
  charity?: PublicKey;
}

// PDA Seeds
export const SEEDS = {
  GLOBAL_CONFIG: Buffer.from('global-config'),
  TOKEN_REGISTRY: Buffer.from('token-registry'),
  ROOM: Buffer.from('room'),
  ROOM_VAULT: Buffer.from('room-vault'),
  PLAYER: Buffer.from('player'),
} as const;
