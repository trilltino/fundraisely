/**
 * # Solana Account Fetching Utilities
 *
 * Provides efficient, type-safe utilities for fetching and deserializing Solana accounts.
 * Implements batch fetching, caching strategies, and automatic account parsing for
 * Fundraisely program accounts (Rooms, Players, GlobalConfig).
 *
 * ## Features
 * - **Batch Fetching**: Fetch multiple accounts in a single RPC call
 * - **Type-Safe Deserialization**: Anchor account parsing with full TypeScript types
 * - **Filtering**: getProgramAccounts with discriminator and memcmp filters
 * - **Caching**: Integration with TanStack Query for efficient caching
 * - **Error Handling**: Graceful handling of missing accounts and RPC errors
 * - **Account Watchers**: Subscribe to account changes via WebSocket
 *
 * ## Usage
 * ```typescript
 * // Fetch a single room account
 * const room = await fetchRoomAccount(connection, roomPubkey)
 *
 * // Fetch all active rooms
 * const rooms = await fetchAllRooms(connection, { isActive: true })
 *
 * // Batch fetch multiple accounts
 * const accounts = await batchFetchAccounts(connection, pubkeys)
 *
 * // Watch for account changes
 * const unsubscribe = watchAccount(connection, pubkey, (account) => {
 *   console.log('Account updated:', account)
 * })
 * ```
 *
 * ## Integration Points
 * - `connection.ts` - Uses connection pool for RPC calls
 * - `pdas.ts` - Derives PDAs before fetching
 * - `constants.ts` - Uses PROGRAM_ID for filtering
 * - Query hooks - Provides data for React Query
 *
 * ## Account Types
 * - **Room**: Main game room account
 * - **PlayerEntry**: Individual player participation
 * - **GlobalConfig**: Platform configuration
 *
 * @see {@link https://solana.com/docs/rpc/http/getAccountInfo Solana getAccountInfo}
 * @see {@link https://solana.com/docs/rpc/http/getProgramAccounts getProgramAccounts}
 */

import {
  Connection,
  PublicKey,
  AccountInfo,
  GetProgramAccountsFilter,
  Commitment,
} from '@solana/web3.js'
import { PROGRAM_ID } from './constants'
import { connectionPool } from './connection'
import type { Room, PlayerEntry, GlobalConfig } from '@/types/program.types'

/**
 * Account discriminators (first 8 bytes of account data)
 * Used for filtering accounts by type
 * TODO: Populate with actual discriminators after program deployment
 *
 * Example usage after deployment:
 * const DISCRIMINATORS = {
 *   ROOM: Buffer.from([...]),
 *   PLAYER_ENTRY: Buffer.from([...]),
 *   GLOBAL_CONFIG: Buffer.from([...]),
 * }
 */

/**
 * Fetch a single account with error handling
 *
 * @param _connection - Solana connection (uses connectionPool internally)
 * @param pubkey - Account public key
 * @param commitment - Commitment level
 * @returns Account info or null if not found
 */
export async function fetchAccount(
  _connection: Connection,
  pubkey: PublicKey,
  commitment: Commitment = 'confirmed'
): Promise<AccountInfo<Buffer> | null> {
  try {
    return await connectionPool.withFallback((conn) =>
      conn.getAccountInfo(pubkey, commitment)
    )
  } catch (error) {
    console.error(`Failed to fetch account ${pubkey.toString()}:`, error)
    return null
  }
}

/**
 * Batch fetch multiple accounts efficiently
 *
 * @param _connection - Solana connection (uses connectionPool internally)
 * @param pubkeys - Array of public keys
 * @param commitment - Commitment level
 * @returns Array of account infos (null for missing accounts)
 */
export async function batchFetchAccounts(
  _connection: Connection,
  pubkeys: PublicKey[],
  commitment: Commitment = 'confirmed'
): Promise<(AccountInfo<Buffer> | null)[]> {
  if (pubkeys.length === 0) return []

  try {
    const accounts = await connectionPool.withFallback((conn) =>
      conn.getMultipleAccountsInfo(pubkeys, commitment)
    )
    return accounts
  } catch (error) {
    console.error('Batch fetch failed:', error)
    return pubkeys.map(() => null)
  }
}

/**
 * Fetch and deserialize a Room account
 *
 * @param _connection - Solana connection (TODO: Use after program deployment)
 * @param _roomPubkey - Room account public key
 * @returns Deserialized Room or null
 */
export async function fetchRoomAccount(
  _connection: Connection,
  _roomPubkey: PublicKey
): Promise<Room | null> {
  // TODO: Implement actual Anchor deserialization after program deployment
  // const account = await fetchAccount(connection, roomPubkey)
  // if (!account) return null
  // return deserializeRoom(account.data)

  return null
}

/**
 * Fetch and deserialize a PlayerEntry account
 *
 * @param _connection - Solana connection (TODO: Use after program deployment)
 * @param _playerEntryPubkey - PlayerEntry account public key
 * @returns Deserialized PlayerEntry or null
 */
export async function fetchPlayerEntryAccount(
  _connection: Connection,
  _playerEntryPubkey: PublicKey
): Promise<PlayerEntry | null> {
  // TODO: Implement actual Anchor deserialization after program deployment
  // const account = await fetchAccount(connection, playerEntryPubkey)
  // if (!account) return null
  // return deserializePlayerEntry(account.data)

  return null
}

/**
 * Fetch and deserialize GlobalConfig account
 *
 * @param _connection - Solana connection (TODO: Use after program deployment)
 * @returns Deserialized GlobalConfig or null
 */
export async function fetchGlobalConfig(
  _connection: Connection
): Promise<GlobalConfig | null> {
  // TODO: Implement after program deployment
  // const [configPubkey] = PublicKey.findProgramAddressSync(
  //   [Buffer.from('global_config')],
  //   PROGRAM_ID
  // )
  // const account = await fetchAccount(connection, configPubkey)
  // if (!account) return null
  // return deserializeGlobalConfig(account.data)

  return null
}

/**
 * Fetch all rooms with optional filtering
 *
 * @param _connection - Solana connection (uses connectionPool internally)
 * @param filters - Optional filters (isActive, host, etc.)
 * @returns Array of Room accounts
 */
export async function fetchAllRooms(
  _connection: Connection,
  filters?: {
    isActive?: boolean
    host?: PublicKey
  }
): Promise<Room[]> {
  try {
    const programFilters: GetProgramAccountsFilter[] = [
      // Filter by account discriminator (first 8 bytes)
      {
        memcmp: {
          offset: 0,
          bytes: '', // TODO: Add room discriminator
        },
      },
    ]

    // Add host filter if specified
    if (filters?.host) {
      programFilters.push({
        memcmp: {
          offset: 8, // After discriminator
          bytes: filters.host.toBase58(),
        },
      })
    }

    // TODO: Implement after program deployment
    // const accounts = await connectionPool.withFallback((conn) =>
    //   conn.getProgramAccounts(PROGRAM_ID, {
    //     filters: programFilters,
    //     commitment: 'confirmed',
    //   })
    // )
    // const rooms: Room[] = []
    // for (const { account, pubkey } of accounts) {
    //   try {
    //     const room = deserializeRoom(account.data)
    //     if (filters?.isActive !== undefined && room.isActive !== filters.isActive) {
    //       continue
    //     }
    //     rooms.push(room)
    //   } catch (error) {
    //     console.warn(`Failed to deserialize room ${pubkey.toString()}:`, error)
    //   }
    // }

    return []
  } catch (error) {
    console.error('Failed to fetch all rooms:', error)
    return []
  }
}

/**
 * Fetch all players in a room
 *
 * @param _connection - Solana connection (uses connectionPool internally)
 * @param _roomPubkey - Room public key
 * @returns Array of PlayerEntry accounts
 */
export async function fetchPlayersInRoom(
  _connection: Connection,
  _roomPubkey: PublicKey
): Promise<PlayerEntry[]> {
  // TODO: Implement after program deployment
  // const accounts = await connectionPool.withFallback((conn) =>
  //   conn.getProgramAccounts(PROGRAM_ID, {
  //     filters: [
  //       {
  //         memcmp: {
  //           offset: 0,
  //           bytes: '', // Player entry discriminator
  //         },
  //       },
  //       {
  //         memcmp: {
  //           offset: 8,
  //           bytes: roomPubkey.toBase58(),
  //         },
  //       },
  //     ],
  //     commitment: 'confirmed',
  //   })
  // )
  // const players: PlayerEntry[] = []
  // for (const { account } of accounts) {
  //   try {
  //     const player = deserializePlayerEntry(account.data)
  //     players.push(player)
  //   } catch (error) {
  //     console.warn('Failed to deserialize player entry:', error)
  //   }
  // }
  return []
}

/**
 * Watch an account for changes via WebSocket
 *
 * @param connection - Solana connection
 * @param pubkey - Account to watch
 * @param callback - Called when account changes
 * @returns Unsubscribe function
 */
export function watchAccount(
  connection: Connection,
  pubkey: PublicKey,
  callback: (account: AccountInfo<Buffer> | null) => void,
  commitment: Commitment = 'confirmed'
): () => void {
  const subscriptionId = connection.onAccountChange(
    pubkey,
    callback,
    commitment
  )

  return () => {
    connection.removeAccountChangeListener(subscriptionId)
  }
}

/**
 * Watch for new program accounts (e.g., new rooms created)
 *
 * @param connection - Solana connection
 * @param filters - Program account filters
 * @param callback - Called for each new account
 * @returns Unsubscribe function
 */
export function watchProgramAccounts(
  connection: Connection,
  filters: GetProgramAccountsFilter[],
  callback: (pubkey: PublicKey, account: AccountInfo<Buffer>) => void,
  commitment: Commitment = 'confirmed'
): () => void {
  const subscriptionId = connection.onProgramAccountChange(
    PROGRAM_ID,
    (keyedAccountInfo) => {
      callback(keyedAccountInfo.accountId, keyedAccountInfo.accountInfo)
    },
    commitment,
    filters
  )

  return () => {
    connection.removeProgramAccountChangeListener(subscriptionId)
  }
}

/**
 * Helper to check if an account exists
 *
 * @param connection - Solana connection
 * @param pubkey - Account public key
 * @returns True if account exists
 */
export async function accountExists(
  connection: Connection,
  pubkey: PublicKey
): Promise<boolean> {
  const account = await fetchAccount(connection, pubkey)
  return account !== null
}

/**
 * Helper to get account size (useful for rent calculations)
 *
 * @param connection - Solana connection
 * @param pubkey - Account public key
 * @returns Account data length or 0 if not found
 */
export async function getAccountSize(
  connection: Connection,
  pubkey: PublicKey
): Promise<number> {
  const account = await fetchAccount(connection, pubkey)
  return account?.data.length || 0
}
