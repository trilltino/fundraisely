/**
 * Wallet Actions Hook - Chain-Agnostic Wallet Operations
 *
 * **Purpose:**
 * Provides a unified interface for wallet connection, disconnection, and state queries across
 * multiple blockchain networks (Solana, EVM, Stellar). Abstracts wallet adapter differences so
 * components can interact with wallets without knowing which blockchain is active.
 *
 * **Supported Operations:**
 * - `connect()` - Connect user's wallet with auto-selection (Phantom preferred for Solana)
 * - `disconnect()` - Disconnect active wallet
 * - `isConnected()` - Check connection status
 * - `getAddress()` - Get wallet address (base58 for Solana, hex for EVM)
 * - `getChainId()` - Get network identifier (devnet/mainnet for Solana, chain ID for EVM)
 * - `getBalance()` - Get native token balance (SOL, ETH, XLM)
 *
 * **Chain Selection:**
 * Automatically detects active chain from `useQuizChainIntegration` or accepts `chainOverride`.
 * This allows testing different chains or overriding for specific components.
 *
 * **Solana Implementation:**
 * Uses `@solana/wallet-adapter-react` with multi-wallet support:
 * - Phantom (prioritized)
 * - Solflare
 * - Ledger
 * - Other adapters configured in SolanaWalletProvider
 *
 * **Auto-Selection Logic (Solana):**
 * 1. If wallet already connected, return success immediately
 * 2. If no wallet selected, search for Phantom adapter
 * 3. If Phantom found, select it automatically
 * 4. If Phantom not found, select first available adapter
 * 5. Call `connect()` on selected adapter
 *
 * **Error Handling:**
 * All operations return structured results (`{ success: true/false }`) or null values.
 * Never throws exceptions - safe for use in UI components without try/catch.
 *
 * **Integration Points:**
 * - Used by: `Web3PaymentStep.tsx`, `StepReviewLaunch.tsx`, wallet UI components
 * - Wraps: Solana wallet adapter, future: EVM (wagmi/viem), Stellar (Freighter)
 * - Depends on: `useQuizChainIntegration`, wallet provider context
 *
 * **Type Safety:**
 * - All return types are explicitly defined
 * - Chain-specific types converted to chain-agnostic strings
 * - Null-safe operations (returns null instead of undefined for consistency)
 *
 * **Future Expansion:**
 * EVM and Stellar implementations marked with TODO. Structure is ready for:
 * - EVM: wagmi hooks or window.ethereum directly
 * - Stellar: Freighter wallet API
 *
 * @module useWalletActions
 * @category Wallet Hooks
 * @example
 * ```typescript
 * const { connect, disconnect, isConnected, getAddress, getBalance } = useWalletActions();
 *
 * // Connect wallet
 * const result = await connect();
 * if (result.success) {
 *   const address = getAddress();
 *   const balance = await getBalance();
 *   console.log(`Connected: ${address}, Balance: ${balance} SOL`);
 * } else {
 *   console.error('Connection failed:', result.error.message);
 * }
 *
 * // Check connection status
 * if (isConnected()) {
 *   console.log('Wallet is connected!');
 * }
 *
 * // Disconnect
 * await disconnect();
 * ```
 *
 * @example
 * // Override chain for testing
 * ```typescript
 * const { connect } = useWalletActions({ chainOverride: 'solana' });
 * await connect(); // Forces Solana even if quiz configured for EVM
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQuizChainIntegration, type SupportedChain } from './useQuizChainIntegration';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

type Options = { chainOverride?: SupportedChain | null };

export type WalletConnectResult =
  | { success: true }
  | { success: false; error: { message: string } };

export type WalletDisconnectResult = void;

export function useWalletActions(opts?: Options) {
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // Solana wallet hooks
  const solanaWallet = useWallet();
  const { connection } = useConnection();

  /**
   * Connects the user's wallet for the active blockchain.
   *
   * **Solana Behavior:**
   * - If already connected, returns success immediately (no-op)
   * - If no wallet selected, auto-selects Phantom (or first available)
   * - Calls wallet adapter's `connect()` method
   * - Waits for user approval in wallet extension
   *
   * **User Experience:**
   * - Opens wallet extension popup for approval
   * - User can reject connection (returns error)
   * - User can select different account in wallet
   *
   * **Error Cases:**
   * - User rejects connection → error.message: "User rejected the request"
   * - No wallet installed → error.message: "Wallet not found"
   * - Network mismatch → (not applicable for Solana, relevant for EVM)
   *
   * @returns Promise resolving to connection result
   * @returns result.success - True if connected, false if error
   * @returns result.error - Error object with message if failed
   *
   * @example
   * ```typescript
   * const { connect } = useWalletActions();
   * const result = await connect();
   *
   * if (result.success) {
   *   console.log('Wallet connected!');
   * } else {
   *   alert(`Failed: ${result.error.message}`);
   * }
   * ```
   */
  const connect = useCallback(async (): Promise<WalletConnectResult> => {
    if (effectiveChain === 'solana') {
      try {
        if (solanaWallet.connected) {
          return { success: true };
        }

        if (!solanaWallet.wallet) {
          // No wallet selected, try to select Phantom by default
          const { select, wallets } = solanaWallet;
          if (select && wallets.length > 0) {
            // Try to find Phantom
            const phantom = wallets.find(w => w.adapter.name === 'Phantom');
            if (phantom) {
              select(phantom.adapter.name);
            } else {
              // Select first available wallet
              select(wallets[0].adapter.name);
            }
          }
        }

        await solanaWallet.connect();
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: { message: error?.message || 'Failed to connect Solana wallet' },
        };
      }
    }

    if (effectiveChain === 'evm') {
      // TODO: Implement EVM wallet connection when needed
      return {
        success: false,
        error: { message: 'EVM wallet connection not implemented yet' },
      };
    }

    if (effectiveChain === 'stellar') {
      // TODO: Implement Stellar wallet connection when needed
      return {
        success: false,
        error: { message: 'Stellar wallet connection not implemented yet' },
      };
    }

    return {
      success: false,
      error: { message: `Wallet connection not implemented for ${effectiveChain || 'unknown'} chain` },
    };
  }, [effectiveChain, solanaWallet]);

  /**
   * Disconnects the active wallet.
   *
   * **Solana Behavior:**
   * - Calls wallet adapter's `disconnect()` method
   * - Clears wallet state in React context
   * - No user confirmation required
   *
   * **Error Handling:**
   * - Errors are logged but not thrown (graceful degradation)
   * - Always returns void (even if disconnect fails)
   *
   * @returns Promise resolving to void
   *
   * @example
   * ```typescript
   * const { disconnect } = useWalletActions();
   * await disconnect();
   * console.log('Wallet disconnected');
   * ```
   */
  const disconnect = useCallback(async (): Promise<WalletDisconnectResult> => {
    if (effectiveChain === 'solana') {
      try {
        await solanaWallet.disconnect();
      } catch (error) {
        console.error('Failed to disconnect Solana wallet:', error);
      }
      return;
    }

    if (effectiveChain === 'evm') {
      // TODO: Implement EVM wallet disconnection
      return;
    }

    if (effectiveChain === 'stellar') {
      // TODO: Implement Stellar wallet disconnection
      return;
    }
  }, [effectiveChain, solanaWallet]);

  /**
   * Checks if a wallet is currently connected.
   *
   * **Solana:**
   * Returns `solanaWallet.connected` (boolean from wallet adapter)
   *
   * **EVM/Stellar:**
   * Returns false (not implemented yet)
   *
   * @returns True if wallet connected, false otherwise
   *
   * @example
   * ```typescript
   * const { isConnected } = useWalletActions();
   *
   * if (isConnected()) {
   *   console.log('Can proceed with transaction');
   * } else {
   *   console.log('Please connect wallet first');
   * }
   * ```
   */
  const isConnected = useCallback((): boolean => {
    if (effectiveChain === 'solana') {
      return solanaWallet.connected;
    }

    if (effectiveChain === 'evm') {
      // TODO: Check EVM wallet connection
      return false;
    }

    if (effectiveChain === 'stellar') {
      // TODO: Check Stellar wallet connection
      return false;
    }

    return false;
  }, [effectiveChain, solanaWallet]);

  /**
   * Gets the connected wallet's address.
   *
   * **Solana:**
   * Returns base58-encoded public key (e.g., "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp...")
   *
   * **EVM:**
   * Would return hex-encoded address (e.g., "0x742d35Cc6634C0532...")
   *
   * **Stellar:**
   * Would return G-address (e.g., "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO...")
   *
   * @returns Wallet address as string, or null if not connected
   *
   * @example
   * ```typescript
   * const { getAddress } = useWalletActions();
   * const address = getAddress();
   *
   * if (address) {
   *   console.log('Wallet:', address.slice(0, 8) + '...');
   * }
   * ```
   */
  const getAddress = useCallback((): string | null => {
    if (effectiveChain === 'solana') {
      return solanaWallet.publicKey?.toBase58() || null;
    }

    if (effectiveChain === 'evm') {
      // TODO: Get EVM address
      return null;
    }

    if (effectiveChain === 'stellar') {
      // TODO: Get Stellar address
      return null;
    }

    return null;
  }, [effectiveChain, solanaWallet]);

  /**
   * Gets the current blockchain network identifier.
   *
   * **Solana:**
   * Returns cluster name derived from RPC endpoint URL:
   * - "devnet" - Development network for testing
   * - "testnet" - Public test network
   * - "mainnet" - Production network
   *
   * **EVM:**
   * Would return numeric chain ID:
   * - "1" - Ethereum Mainnet
   * - "5" - Goerli Testnet
   * - "137" - Polygon Mainnet
   * - "80001" - Mumbai Testnet
   *
   * **Stellar:**
   * Would return network name:
   * - "public" - Public production network
   * - "testnet" - Test network
   *
   * **Detection Logic:**
   * Parses the connection RPC endpoint URL for network keywords.
   * This is a best-effort approach - defaults to "mainnet" if no match.
   *
   * @returns Network identifier as string
   * @returns "unknown" if chain not supported or not connected
   *
   * @example
   * ```typescript
   * const { getChainId } = useWalletActions();
   * const chainId = getChainId();
   *
   * if (chainId === 'devnet') {
   *   console.log('Using Solana Devnet - test funds only!');
   * } else if (chainId === 'mainnet') {
   *   console.warn('MAINNET - real funds at risk!');
   * }
   * ```
   */
  const getChainId = useCallback((): string => {
    if (effectiveChain === 'solana') {
      // Return cluster from connection endpoint
      const endpoint = connection.rpcEndpoint;
      if (endpoint.includes('devnet')) return 'devnet';
      if (endpoint.includes('testnet')) return 'testnet';
      return 'mainnet';
    }

    if (effectiveChain === 'evm') {
      // TODO: Get EVM chain ID
      return 'unknown';
    }

    if (effectiveChain === 'stellar') {
      // TODO: Get Stellar network
      return 'unknown';
    }

    return 'unknown';
  }, [effectiveChain, connection]);

  /**
   * Gets the wallet's native token balance.
   *
   * **Solana:**
   * Returns SOL balance fetched via `connection.getBalance()`:
   * - Converts lamports to SOL (1 SOL = 1,000,000,000 lamports)
   * - Formatted to 4 decimal places (e.g., "1.2345")
   * - Uses connected wallet's public key
   *
   * **EVM:**
   * Would return ETH (or native chain token) balance:
   * - Converts wei to ETH (1 ETH = 10^18 wei)
   * - Formatted to 4 decimal places
   * - Uses connected wallet address
   *
   * **Stellar:**
   * Would return XLM balance:
   * - Fetches from Horizon API
   * - Formatted to 4 decimal places
   * - Uses connected wallet G-address
   *
   * **Async Operation:**
   * This method makes an RPC call to the blockchain, which can take 100-500ms.
   * Always check `isConnected()` before calling to avoid null returns.
   *
   * **Error Handling:**
   * - Returns null if wallet not connected
   * - Returns null if RPC call fails (logged to console)
   * - Never throws exceptions
   *
   * @returns Promise resolving to balance string (4 decimals), or null if error
   *
   * @example
   * ```typescript
   * const { getBalance, isConnected } = useWalletActions();
   *
   * if (isConnected()) {
   *   const balance = await getBalance();
   *   if (balance) {
   *     console.log(`Balance: ${balance} SOL`);
   *     if (parseFloat(balance) < 0.01) {
   *       alert('Insufficient funds! Please add SOL to your wallet.');
   *     }
   *   }
   * }
   * ```
   *
   * @example
   * // Display balance in UI
   * ```typescript
   * const { getBalance } = useWalletActions();
   * const [balance, setBalance] = useState<string | null>(null);
   *
   * useEffect(() => {
   *   getBalance().then(setBalance);
   * }, [getBalance]);
   *
   * return <div>Balance: {balance ?? 'Loading...'} SOL</div>;
   * ```
   */
  const getBalance = useCallback(async (): Promise<string | null> => {
    if (effectiveChain === 'solana') {
      try {
        if (!solanaWallet.publicKey) return null;
        const balance = await connection.getBalance(solanaWallet.publicKey);
        return (balance / LAMPORTS_PER_SOL).toFixed(4);
      } catch (error) {
        console.error('Failed to get Solana balance:', error);
        return null;
      }
    }

    if (effectiveChain === 'evm') {
      // TODO: Get EVM balance
      return null;
    }

    if (effectiveChain === 'stellar') {
      // TODO: Get Stellar balance
      return null;
    }

    return null;
  }, [effectiveChain, solanaWallet, connection]);

  return {
    connect,
    disconnect,
    isConnected,
    getAddress,
    getChainId,
    getBalance,
  };
}
