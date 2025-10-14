/**
 * Solana Program Type Definitions
 *
 * TypeScript type definitions mirroring the Rust smart contract state structures.
 * These types ensure type safety when interacting with the Fundraisely Solana program,
 * providing autocomplete and compile-time validation for all on-chain data structures.
 *
 * Purpose:
 * - Type-safe program interaction
 * - IDE autocomplete for on-chain data
 * - Runtime validation helpers
 * - Documentation of on-chain structures
 *
 * Usage:
 * ```tsx
 * import { Room, GlobalConfig, PlayerEntry } from '@/types/program.types';
 *
 * const room: Room = await program.account.room.fetch(roomPDA);
 * console.log(room.entryFee.toString()); // Type-safe access
 * ```
 *
 * Note: These types are automatically generated from the Anchor IDL via `anchor idl parse`.
 * Manual updates should match the Rust definitions in `programs/fundraisely/src/state/`.
 *
 * Related Files:
 * - src/idl/fundraisely.json - Anchor IDL defining program structure
 * - programs/fundraisely/src/state/ - Rust source of truth for these types
 * - features/blockchain/solana/hooks/useFundraiselyProgram.ts - Uses these types
 */

import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Prize distribution mode
 */
export enum PrizeMode {
  /** Prizes allocated from percentage of collected entry fees */
  PoolSplit = 'PoolSplit',
  /** Pre-deposited prize assets (future feature) */
  AssetBased = 'AssetBased',
}

/**
 * Room lifecycle state
 */
export enum RoomStatus {
  /** Asset room waiting for prize deposits (future feature) */
  AwaitingFunding = 'AwaitingFunding',
  /** Some prizes deposited (future feature) */
  PartiallyFunded = 'PartiallyFunded',
  /** Ready to accept players */
  Ready = 'Ready',
  /** Players have joined, game is active */
  Active = 'Active',
  /** Game completed, funds distributed */
  Ended = 'Ended',
}

/**
 * Global platform configuration (singleton)
 */
export interface GlobalConfig {
  /** Admin public key (can update config) */
  admin: PublicKey;
  /** Platform wallet (receives platform fees) */
  platformWallet: PublicKey;
  /** Charity wallet (receives charity donations) */
  charityWallet: PublicKey;
  /** Platform fee in basis points (2000 = 20%) */
  platformFeeBps: number;
  /** Maximum host fee in basis points (500 = 5%) */
  maxHostFeeBps: number;
  /** Maximum prize pool in basis points (3500 = 35%) */
  maxPrizePoolBps: number;
  /** Minimum charity allocation in basis points (4000 = 40%) */
  minCharityBps: number;
  /** Emergency pause flag */
  emergencyPause: boolean;
  /** PDA bump seed */
  bump: number;
}

/**
 * Individual game room state and configuration
 */
export interface Room {
  /** Unique room identifier (max 32 chars) */
  roomId: string;
  /** Host's public key */
  host: PublicKey;
  /** Charity wallet address (per-room, from TGB or custom) */
  charityWallet: PublicKey;
  /** Token mint for entry fees */
  feeTokenMint: PublicKey;
  /** Entry fee amount in token base units */
  entryFee: BN;
  /** Host fee in basis points (0-500 = 0-5%) */
  hostFeeBps: number;
  /** Prize pool in basis points (0-3500 = 0-35%) */
  prizePoolBps: number;
  /** Charity percentage in basis points (calculated) */
  charityBps: number;
  /** Prize distribution mode */
  prizeMode: PrizeMode;
  /** Prize distribution percentages [1st, 2nd, 3rd] */
  prizeDistribution: number[];
  /** Room status */
  status: RoomStatus;
  /** Number of players joined */
  playerCount: number;
  /** Maximum number of players allowed */
  maxPlayers: number;
  /** Total amount collected from all players */
  totalCollected: BN;
  /** Total from entry fees only */
  totalEntryFees: BN;
  /** Total from extras payments */
  totalExtrasFees: BN;
  /** Game ended flag */
  ended: boolean;
  /** Slot when room was created */
  creationSlot: BN;
  /** Slot when room expires (0 = no expiration) */
  expirationSlot: BN;
  /** Charity memo for transfers */
  charityMemo: string;
  /** Declared winners (up to 3, set by declare_winners) */
  winners: [PublicKey | null, PublicKey | null, PublicKey | null];
  /** PDA bump seed */
  bump: number;
}

/**
 * Individual player participation record
 */
export interface PlayerEntry {
  /** Player's public key */
  player: PublicKey;
  /** Room public key */
  room: PublicKey;
  /** Entry fee paid */
  entryPaid: BN;
  /** Extra amount paid */
  extrasPaid: BN;
  /** Total amount paid (entry + extras) */
  totalPaid: BN;
  /** Slot when player joined */
  joinSlot: BN;
  /** PDA bump seed */
  bump: number;
}

/**
 * Room creation parameters
 */
export interface CreateRoomParams {
  roomId: string;
  charityWallet: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  hostFeeBps: number;
  prizePoolBps: number;
  firstPlacePct: number;
  secondPlacePct?: number;
  thirdPlacePct?: number;
  charityMemo: string;
  expirationSlots?: BN;
}

/**
 * Join room parameters
 */
export interface JoinRoomParams {
  roomId: string;
  extrasAmount: BN;
}

/**
 * Declare winners parameters
 */
export interface DeclareWinnersParams {
  roomId: string;
  winners: PublicKey[];
}

/**
 * End room parameters
 */
export interface EndRoomParams {
  roomId: string;
  winners: PublicKey[];
}
