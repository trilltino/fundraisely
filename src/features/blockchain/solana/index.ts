/**
 * Solana blockchain integration module
 *
 * Public API for interacting with the Fundraisely Solana program.
 * This module provides:
 * - Wallet connection and management
 * - Program interaction hooks
 * - Transaction builders
 * - Network configuration
 *
 * @example
 * ```tsx
 * import { SolanaProvider, useFundraiselyProgram } from '@/features/blockchain/solana';
 *
 * function App() {
 *   return (
 *     <SolanaProvider>
 *       <MyComponent />
 *     </SolanaProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { program, createRoom } = useFundraiselyProgram();
 *   // ... use program
 * }
 * ```
 */

// Providers
export { SolanaProvider } from './providers/SolanaProvider';

// Hooks
export { useFundraiselyProgram } from './hooks/useFundraiselyProgram';

// Services
export * from './services/transactionBuilder';

// Configuration
export * from './config/constants';

// Types (to be created)
// export type * from './types/program.types';
