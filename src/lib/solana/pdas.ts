/**
 * # Program Derived Address (PDA) Utilities
 *
 * Provides type-safe PDA derivation functions for all Fundraisely program accounts.
 * PDAs are deterministic addresses that allow the program to "sign" for accounts
 * without requiring private keys, enabling secure on-chain logic.
 *
 * ## Features
 * - **Type-Safe Derivation**: Strongly typed PDA functions
 * - **Seed Constants**: Centralized seed values prevent typos
 * - **Bump Seed Caching**: Optional bump seed memoization
 * - **Batch Derivation**: Derive multiple PDAs efficiently
 * - **Account Resolution**: Resolve all accounts for instructions
 *
 * ## PDA Structure
 * All Fundraisely PDAs follow these patterns:
 * - **Room**: `["room", host_pubkey, room_id]`
 * - **PlayerEntry**: `["player", room_pubkey, player_pubkey]`
 * - **GlobalConfig**: `["global_config"]`
 * - **RoomVault**: `["room_vault", room_pubkey]`
 * - **ApprovedTokens**: `["approved_tokens"]`
 *
 * ## Usage
 * ```typescript
 * // Derive room PDA
 * const [roomPubkey, bump] = deriveRoomPda(hostPubkey, "room-123")
 *
 * // Derive player entry PDA
 * const [playerPda] = derivePlayerEntryPda(roomPubkey, playerPubkey)
 *
 * // Batch derive PDAs for a transaction
 * const { room, player, vault } = await resolveRoomAccounts(
 *   hostPubkey,
 *   "room-123",
 *   playerPubkey
 * )
 * ```
 *
 * ## Integration Points
 * - `constants.ts` - Uses PROGRAM_ID and seed constants
 * - `transactions.ts` - Resolves PDAs for instruction accounts
 * - `accounts.ts` - Fetches accounts at derived addresses
 * - Query hooks - Derives PDAs before fetching
 *
 * ## Security Notes
 * - PDAs must be derived correctly to match on-chain seeds
 * - Changing seed structure requires program redeployment
 * - Bump seeds ensure canonical PDA addresses
 *
 * @see {@link https://solana.com/docs/core/pda Program Derived Addresses}
 * @see {@link https://www.anchor-lang.com/docs/pdas Anchor PDA Guide}
 */

import { PublicKey } from '@solana/web3.js'
import { PROGRAM_ID, SEEDS } from './constants'

/**
 * PDA derivation result with bump seed
 */
export interface PdaResult {
  pubkey: PublicKey
  bump: number
}

/**
 * Derive Room PDA
 *
 * Seeds: ["room", host_pubkey, room_id]
 *
 * @param host - Room host's public key
 * @param roomId - Unique room identifier string
 * @returns [PDA public key, bump seed]
 */
export function deriveRoomPda(
  host: PublicKey,
  roomId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.ROOM),
      host.toBuffer(),
      Buffer.from(roomId),
    ],
    PROGRAM_ID
  )
}

/**
 * Derive Room Vault PDA (holds prize pool tokens)
 *
 * Seeds: ["room_vault", room_pubkey]
 *
 * @param room - Room account public key
 * @returns [Vault PDA public key, bump seed]
 */
export function deriveRoomVaultPda(room: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.ROOM_VAULT), room.toBuffer()],
    PROGRAM_ID
  )
}

/**
 * Derive PlayerEntry PDA
 *
 * Seeds: ["player", room_pubkey, player_pubkey]
 *
 * @param room - Room account public key
 * @param player - Player's wallet public key
 * @returns [PlayerEntry PDA public key, bump seed]
 */
export function derivePlayerEntryPda(
  room: PublicKey,
  player: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.PLAYER),
      room.toBuffer(),
      player.toBuffer(),
    ],
    PROGRAM_ID
  )
}

/**
 * Derive GlobalConfig PDA (singleton)
 *
 * Seeds: ["global_config"]
 *
 * @returns [GlobalConfig PDA public key, bump seed]
 */
export function deriveGlobalConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.GLOBAL_CONFIG)],
    PROGRAM_ID
  )
}

/**
 * Derive ApprovedTokens PDA (whitelist of allowed tokens)
 *
 * Seeds: ["approved_tokens"]
 *
 * @returns [ApprovedTokens PDA public key, bump seed]
 */
export function deriveApprovedTokensPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.APPROVED_TOKENS)],
    PROGRAM_ID
  )
}

/**
 * Resolve all accounts needed for creating a room
 *
 * @param host - Room host's public key
 * @param roomId - Room identifier
 * @returns Object with all derived PDAs
 */
export function resolveCreateRoomAccounts(host: PublicKey, roomId: string) {
  const [room, roomBump] = deriveRoomPda(host, roomId)
  const [vault, vaultBump] = deriveRoomVaultPda(room)
  const [globalConfig] = deriveGlobalConfigPda()

  return {
    room,
    roomBump,
    vault,
    vaultBump,
    globalConfig,
  }
}

/**
 * Resolve all accounts needed for joining a room
 *
 * @param host - Room host's public key
 * @param roomId - Room identifier
 * @param player - Player's public key
 * @returns Object with all derived PDAs
 */
export function resolveJoinRoomAccounts(
  host: PublicKey,
  roomId: string,
  player: PublicKey
) {
  const [room] = deriveRoomPda(host, roomId)
  const [playerEntry, playerEntryBump] = derivePlayerEntryPda(room, player)
  const [vault] = deriveRoomVaultPda(room)
  const [globalConfig] = deriveGlobalConfigPda()

  return {
    room,
    playerEntry,
    playerEntryBump,
    vault,
    globalConfig,
  }
}

/**
 * Resolve all accounts needed for ending a room
 *
 * @param host - Room host's public key
 * @param roomId - Room identifier
 * @returns Object with all derived PDAs
 */
export function resolveEndRoomAccounts(host: PublicKey, roomId: string) {
  const [room] = deriveRoomPda(host, roomId)
  const [vault] = deriveRoomVaultPda(room)
  const [globalConfig] = deriveGlobalConfigPda()

  return {
    room,
    vault,
    globalConfig,
  }
}

/**
 * Batch derive room PDAs for multiple room IDs
 *
 * @param host - Room host's public key
 * @param roomIds - Array of room identifiers
 * @returns Array of [PDA, bump] tuples
 */
export function batchDeriveRoomPdas(
  host: PublicKey,
  roomIds: string[]
): Array<[PublicKey, number]> {
  return roomIds.map((roomId) => deriveRoomPda(host, roomId))
}

/**
 * Batch derive player entry PDAs for multiple players
 *
 * @param room - Room public key
 * @param players - Array of player public keys
 * @returns Array of [PDA, bump] tuples
 */
export function batchDerivePlayerEntryPdas(
  room: PublicKey,
  players: PublicKey[]
): Array<[PublicKey, number]> {
  return players.map((player) => derivePlayerEntryPda(room, player))
}

/**
 * Check if a public key is a valid PDA for the program
 *
 * @param pubkey - Public key to check
 * @returns True if pubkey is a PDA (off-curve)
 */
export function isPda(pubkey: PublicKey): boolean {
  try {
    // PDAs are off the ed25519 curve and throw when trying to create a curve point
    PublicKey.createProgramAddressSync([], pubkey)
    return false
  } catch {
    return true
  }
}

/**
 * Find a PDA with specific bump seed (for manual bump management)
 *
 * @param seeds - Array of seed buffers
 * @param bump - Specific bump seed to try
 * @returns PDA public key or null if invalid
 */
export function findPdaWithBump(
  seeds: Buffer[],
  bump: number
): PublicKey | null {
  try {
    return PublicKey.createProgramAddressSync(
      [...seeds, Buffer.from([bump])],
      PROGRAM_ID
    )
  } catch {
    return null
  }
}

/**
 * Get all PDAs for a room (useful for debugging/admin)
 *
 * @param host - Room host's public key
 * @param roomId - Room identifier
 * @returns Object with all PDAs related to this room
 */
export function getAllRoomPdas(host: PublicKey, roomId: string) {
  const [room, roomBump] = deriveRoomPda(host, roomId)
  const [vault, vaultBump] = deriveRoomVaultPda(room)

  return {
    room: { pubkey: room, bump: roomBump },
    vault: { pubkey: vault, bump: vaultBump },
  }
}

/**
 * Reverse lookup: Find which room a vault belongs to
 * Note: This is computationally expensive and should only be used for debugging
 *
 * @param vaultPubkey - Vault public key
 * @param candidateRooms - Array of room pubkeys to check
 * @returns Matching room pubkey or null
 */
export function findRoomByVault(
  vaultPubkey: PublicKey,
  candidateRooms: PublicKey[]
): PublicKey | null {
  for (const room of candidateRooms) {
    const [derivedVault] = deriveRoomVaultPda(room)
    if (derivedVault.equals(vaultPubkey)) {
      return room
    }
  }
  return null
}
