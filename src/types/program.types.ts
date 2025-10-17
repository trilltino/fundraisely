// Auto-generated types from Anchor IDL
import { PublicKey } from '@solana/web3.js';

// Program ID
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
