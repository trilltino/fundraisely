/**
 * Multi-Chain Configuration Stub
 *
 * **Purpose:**
 * This is a stub file for multi-chain wallet configuration (EVM + Solana). Currently, the
 * Fundraisely application is Solana-only, so this file exports placeholder values to maintain
 * compatibility with code that expects multi-chain config.
 *
 * **Current State:**
 * - Solana integration: Active (via @solana/wallet-adapter-react)
 * - EVM integration: Disabled (wagmi/RainbowKit not configured)
 * - Stellar integration: Disabled (future support)
 *
 * **Why This Exists:**
 * During development, the codebase was designed to support multiple blockchains (Solana, EVM, Stellar).
 * The architecture separates chain-specific logic via adapters. This file would contain EVM-specific
 * configuration (wagmi, RainbowKit, WalletConnect projectId), but since we're currently Solana-only,
 * it exports null/empty values.
 *
 * **Actual Configuration Locations:**
 * - **Solana Config**: `src/chains/solana/config.ts` (RPC endpoints, program ID, network)
 * - **Solana Wallet Provider**: `src/chains/solana/SolanaWalletProvider.tsx` (wallet adapters)
 * - **Chain Selection**: `src/hooks/useQuizChainIntegration.ts` (active chain state)
 *
 * **Future Multi-Chain Support:**
 * When EVM support is added, this file will export:
 * ```typescript
 * import { createConfig } from 'wagmi';
 * import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
 *
 * export const projectId = process.env.VITE_WALLETCONNECT_PROJECT_ID;
 * export const config = createConfig({
 *   chains: [base, avalanche],
 *   transports: { ... },
 * });
 * export const wagmiAdapter = new WagmiAdapter(config);
 * ```
 *
 * **Dependencies:**
 * - Used by: Components that check for multi-chain support (currently none active)
 * - Imports from: None (stub file)
 *
 * **Metadata:**
 * - `projectId`: WalletConnect Cloud project ID (empty until EVM support added)
 * - `metadata`: App metadata for wallet connection modals
 * - `networks`: Supported blockchain networks (empty - Solana uses different provider)
 * - `wagmiAdapter`: EVM wallet adapter (null - not used)
 * - `solanaWeb3JsAdapter`: Solana adapter placeholder (null - actual adapter in SolanaWalletProvider)
 * - `config`: Wagmi config (null - not used)
 *
 * @module config
 * @category Configuration
 */

// Stub file - Multi-chain config not used in Solana-only version
export const projectId = '';
export const metadata = {
  name: 'Fundraisely',
  description: 'Fundraisely Solana',
  url: 'https://fundraisely.app',
  icons: [],
};
export const networks = [];
export const wagmiAdapter = null as any;
export const solanaWeb3JsAdapter = null as any;
export const config = null as any;
