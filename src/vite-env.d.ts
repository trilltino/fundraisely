/**
 * Vite Environment Type Definitions
 *
 * Extends TypeScript types for Vite's import.meta.env with Fundraisely-specific environment variables.
 * Defines required configuration for Solana network connectivity (network name, RPC endpoint, deployed
 * program ID) and WebSocket server URL for real-time room synchronization. These typed environment
 * variables are consumed throughout the application by config.ts, SolanaWalletProvider.tsx, and useSocket.ts
 * to establish blockchain and real-time communication connections.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_NETWORK: string
  readonly VITE_SOLANA_RPC_URL: string
  readonly VITE_PROGRAM_ID: string
  readonly VITE_SOCKET_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
