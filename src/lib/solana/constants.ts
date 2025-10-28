/**
 * # Solana Constants
 *
 * Centralized constants for Solana program interactions including program IDs,
 * PDA seeds, and network configurations.
 */

import { PublicKey } from '@solana/web3.js'

// Program ID (update with your deployed program ID)
export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || 'DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq'
)

// PDA Seeds (centralized to prevent typos)
// IMPORTANT: These must match exactly with the seeds in the Solana program
export const SEEDS = {
  GLOBAL_CONFIG: 'global_config',
  ROOM: 'room',
  ROOM_VAULT: 'room_vault',
  PLAYER: 'player',
  APPROVED_TOKENS: 'approved_tokens',
} as const

// Network endpoints
export const NETWORKS = {
  MAINNET: 'https://api.mainnet-beta.solana.com',
  DEVNET: 'https://api.devnet.solana.com',
  TESTNET: 'https://api.testnet.solana.com',
} as const
