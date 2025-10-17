/**
 * WALLET STORE - Solana Wallet Connection State
 *
 * PURPOSE:
 * Manages Solana wallet connection state including address, connection status,
 * and error states. Separated from game logic to enable reusability and better
 * state management patterns.
 *
 * ROLE IN APPLICATION:
 * - Tracks wallet connection state
 * - Stores wallet address and public key
 * - Manages connection/disconnection states
 * - Handles wallet-related errors
 * - Enables wallet state sharing across components
 *
 * KEY FEATURES:
 * - Idempotent updates (only update if changed)
 * - Type-safe state management
 * - Clean separation from game logic
 * - Shallow equality checks for performance
 *
 * USAGE:
 * ```typescript
 * import { useWalletStore } from '@/stores/walletStore';
 *
 * function MyComponent() {
 *   const { address, isConnected } = useWalletStore();
 *   const updateWallet = useWalletStore(state => state.updateWallet);
 *
 *   const handleConnect = async () => {
 *     updateWallet({ isConnecting: true });
 *     // ... connect logic
 *     updateWallet({
 *       isConnecting: false,
 *       isConnected: true,
 *       address: walletAddress,
 *     });
 *   };
 * }
 * ```
 */

import { create } from 'zustand';

export interface WalletState {
  // Connection state
  address: string | null;
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;

  // Error state
  error: string | null;

  // Actions
  updateWallet: (updates: Partial<Omit<WalletState, 'updateWallet' | 'resetWallet'>>) => void;
  resetWallet: () => void;
}

// Shallow equality helper
const shallowEqual = <T extends object>(a: T, b: T): boolean => {
  if (a === b) return true;
  const aKeys = Object.keys(a) as (keyof T)[];
  const bKeys = Object.keys(b) as (keyof T)[];
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
};

// Initial state factory
const createInitialState = (): Omit<WalletState, 'updateWallet' | 'resetWallet'> => ({
  address: null,
  publicKey: null,
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  error: null,
});

export const useWalletStore = create<WalletState>()((set, get) => ({
  ...createInitialState(),

  // Idempotent update: only set if values actually changed
  updateWallet: (updates) => {
    const current = get();
    const next = { ...current, ...updates };

    // Remove action methods from comparison
    const { updateWallet: _, resetWallet: __, ...currentData } = current;
    const { updateWallet: ___, resetWallet: ____, ...nextData } = next;

    if (!shallowEqual(currentData, nextData)) {
      set(updates);
    }
  },

  // Reset to initial state (idempotent)
  resetWallet: () => {
    const current = get();
    const initial = createInitialState();

    // Remove action methods from comparison
    const { updateWallet: _, resetWallet: __, ...currentData } = current;

    if (!shallowEqual(currentData, initial)) {
      set(initial);
    }
  },
}));

export default useWalletStore;
