/**
 * # Wallet State Slice
 *
 * Manages Solana wallet connection state including connected wallet info, network,
 * and connection status. Works alongside @solana/wallet-adapter-react but provides
 * centralized state for wallet-related UI and business logic.
 *
 * ## State Management
 * - `connected`: Whether wallet is currently connected
 * - `connecting`: Loading state during wallet connection
 * - `publicKey`: Connected wallet's public key
 * - `walletName`: Name of connected wallet (Phantom, Solflare, etc.)
 * - `network`: Current Solana network (mainnet-beta, devnet, testnet)
 *
 * ## Actions
 * - `setConnected`: Update connection status
 * - `setConnecting`: Update connecting state
 * - `setWallet`: Set wallet info after connection
 * - `setNetwork`: Change Solana network
 * - `disconnect`: Clear wallet state
 *
 * ## Integration Points
 * - **Wallet Adapter**: Syncs state from @solana/wallet-adapter-react
 * - **All Transactions**: Requires connected = true
 * - **Network Switcher** (future): Uses setNetwork
 *
 * ## Related Files
 * - `components/WalletButton.tsx` - Wallet connection UI
 * - `lib/solana/connection.ts` - RPC connection management
 * - `hooks/queries/useTransaction.ts` - Transaction mutations
 */

import { StateCreator } from 'zustand'
import type { PublicKey } from '@solana/web3.js'

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'

export interface WalletSlice {
  // State
  connected: boolean
  connecting: boolean
  publicKey: PublicKey | null
  walletName: string | null
  network: SolanaNetwork

  // Actions
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setWallet: (publicKey: PublicKey | null, walletName: string | null) => void
  setNetwork: (network: SolanaNetwork) => void
  disconnect: () => void
}

export const createWalletSlice: StateCreator<
  WalletSlice,
  [],
  [],
  WalletSlice
> = (set) => ({
  // Initial state
  connected: false,
  connecting: false,
  publicKey: null,
  walletName: null,
  network: (import.meta.env.VITE_SOLANA_NETWORK as SolanaNetwork) || 'devnet',

  // Actions
  setConnected: (connected) => set({ connected, connecting: false }),

  setConnecting: (connecting) => set({ connecting }),

  setWallet: (publicKey, walletName) => set({
    publicKey,
    walletName,
    connected: !!publicKey,
    connecting: false,
  }),

  setNetwork: (network) => set({ network }),

  disconnect: () => set({
    connected: false,
    connecting: false,
    publicKey: null,
    walletName: null,
  }),
})
