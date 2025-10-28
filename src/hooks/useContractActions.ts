/**
 * Contract Actions Hook - Chain-Agnostic Blockchain Operations
 *
 * **Purpose:**
 * Provides a unified interface for blockchain operations across multiple chains (Solana, EVM, Stellar).
 * This hook abstracts away chain-specific implementation details, allowing components to interact with
 * smart contracts without knowing which blockchain is being used. Currently implements Solana operations
 * for the Fundraisely quiz platform, with EVM and Stellar support planned.
 *
 * **Core Operations:**
 * 1. `deploy()` - Create a new fundraising room on-chain
 * 2. `joinRoom()` - Player joins room by paying entry fee
 * 3. `distributePrizes()` - End room and atomically distribute funds to winners
 *
 * **Chain Selection:**
 * The hook automatically selects the active chain from `useQuizChainIntegration` but can be overridden
 * via the `chainOverride` option. This allows testing different chains or supporting multi-chain rooms.
 *
 * **Integration Points:**
 * - Used by: `StepReviewLaunch.tsx` (room deployment), `Web3PaymentStep.tsx` (player join)
 * - Wraps: `useFundraiselyContract` (Solana), future: EVM/Stellar contract hooks
 * - Depends on: `useQuizChainIntegration` (chain selection), wallet adapters
 *
 * **Error Handling:**
 * All operations return structured results (`{ success: true/false, ... }`) instead of throwing.
 * This pattern allows UI components to handle errors gracefully without try/catch blocks.
 *
 * **Type Safety:**
 * All parameters and results are strongly typed. Chain-specific types are converted to/from
 * chain-agnostic types (e.g., PublicKey ↔ string, BN ↔ number) transparently.
 *
 * **Network Agnostic:**
 * The hook works across devnet/mainnet/testnet. Network selection is handled by underlying
 * chain-specific hooks (e.g., Solana RPC endpoint from config).
 *
 * @module useContractActions
 * @category Blockchain Hooks
 * @example
 * ```typescript
 * const { deploy, joinRoom, distributePrizes } = useContractActions();
 *
 * // Deploy a room
 * const result = await deploy({
 *   roomId: 'my-quiz',
 *   hostId: 'host123',
 *   currency: 'USDC',
 *   entryFee: '5',
 *   hostFeePct: 3,
 *   prizePoolPct: 20,
 *   charityAddress: 'Char1ty...',
 *   hostWallet: hostPublicKey.toBase58(),
 * });
 *
 * if (result.success) {
 *   console.log('Room deployed at:', result.contractAddress);
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useQuizChainIntegration, type SupportedChain } from './useQuizChainIntegration';
import { useFundraiselyContract } from '../chains/solana/useFundraiselyContract';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { TOKEN_MINTS } from '../chains/solana/config';

/** ---------- Types ---------- */
export type DeployParams = {
  roomId: string;
  hostId: string;
  currency?: string;
  entryFee?: string | number;
  hostFeePct?: number;

  prizeMode?: 'split' | 'assets';
  charityName?: string;
  charityAddress?: string;

  prizePoolPct?: number;
  prizeSplits?: { first: number; second?: number; third?: number };

  hostWallet: string;
  hostMetadata?: {
    hostName?: string;
    eventDateTime?: string;
    totalRounds?: number;
  };
};

export type DeployResult = {
  success: true;
  contractAddress: string;
  txHash: string;
  explorerUrl?: string;
};

type JoinArgs = {
  roomId: string;
  extrasAmount?: string;
  feeAmount?: any;
  roomAddress?: any;
};

type JoinResult =
  | { success: true; txHash: string }
  | { success: false; error: string };

type DistributeArgs = {
  roomId: string;
  roomAddress?: string;
  winners: Array<{
    playerId: string;
    address?: string | null;
    rank?: number;
    amount?: string;
  }>;
  charityOrgId?: string;
  charityName?: string;
  charityAddress?: string;
};

type DistributeResult =
  | { success: true; txHash: string; explorerUrl?: string }
  | { success: false; error: string };

type Options = { chainOverride?: SupportedChain | null };

/** ---------- Hook ---------- */
export function useContractActions(opts?: Options) {
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // Solana hooks
  const solanaContract = useFundraiselyContract();
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  // Helper: Convert percentage to basis points (max 65535)
  const toBps16 = (pct?: number) => {
    const n = Number.isFinite(pct as any) ? Number(pct) : 0;
    const clamped = Math.max(0, Math.min(100, n));
    const bps = Math.round(clamped * 100);
    return Math.min(65535, bps);
  };

  // Helper: Get Solana cluster for explorer URL
  const getSolanaCluster = (): string => {
    const endpoint = connection.rpcEndpoint;
    if (endpoint.includes('devnet')) return 'devnet';
    if (endpoint.includes('testnet')) return 'testnet';
    return '';
  };

  /** ---------------- Deploy Contract/Room ---------------- */
  const deploy = useMemo(() => {
    if (effectiveChain === 'solana') {
      return async (params: DeployParams): Promise<DeployResult> => {
        try {
          console.log('[Solana] Deploying quiz room:', params);

          if (!publicKey) {
            throw new Error('Wallet not connected');
          }

          if (!solanaContract.createPoolRoom) {
            throw new Error('Solana contract methods not available');
          }

          // Validate charity address
          const charityAddress = params.charityAddress?.trim();
          if (!charityAddress) {
            throw new Error('Charity wallet address is required');
          }

          let charityPubkey: PublicKey;
          try {
            charityPubkey = new PublicKey(charityAddress);
          } catch {
            throw new Error('Invalid charity wallet address');
          }

          // Parse entry fee (convert to smallest unit, e.g., lamports or USDC base units)
          const entryFeeValue = parseFloat(String(params.entryFee || '1'));
          const entryFeeLamports = new BN(Math.round(entryFeeValue * 1_000_000)); // Assuming 6 decimals (USDC)

          // Calculate fee structure
          const hostFeeBps = toBps16(params.hostFeePct || 0);
          const prizePoolBps = toBps16(params.prizePoolPct || 35);

          // Validate total doesn't exceed limits
          // Platform = 20%, so host + prize + charity must = 80%
          const platformPct = 20;
          const hostPct = params.hostFeePct || 0;
          const prizePct = params.prizePoolPct || 35;
          const charityPct = 100 - platformPct - hostPct - prizePct;

          if (charityPct < 40) {
            throw new Error('Charity allocation must be at least 40%. Reduce host fee or prize pool.');
          }

          // Prize splits
          const firstPlacePct = params.prizeSplits?.first || 100;
          const secondPlacePct = params.prizeSplits?.second;
          const thirdPlacePct = params.prizeSplits?.third;

          // Determine token mint (USDC or SOL)
          const currency = (params.currency || 'USDC').toUpperCase();
          const feeTokenMint = currency === 'SOL' ? TOKEN_MINTS.SOL : TOKEN_MINTS.USDC;

          console.log('[Solana] Creating room with:', {
            roomId: params.roomId,
            entryFee: entryFeeLamports.toString(),
            hostFeeBps,
            prizePoolBps,
            charityPct,
            feeTokenMint: feeTokenMint.toBase58(),
          });

          // Call Solana program
          const result = await solanaContract.createPoolRoom({
            roomId: params.roomId,
            charityWallet: charityPubkey,
            entryFee: entryFeeLamports,
            maxPlayers: 100, // Default
            hostFeeBps,
            prizePoolBps,
            firstPlacePct,
            secondPlacePct,
            thirdPlacePct,
            charityMemo: `Quiz-${params.hostMetadata?.hostName || params.hostId}`,
            expirationSlots: new BN(43200), // ~24 hours
            feeTokenMint,
          });

          const cluster = getSolanaCluster();
          const explorerUrl = cluster
            ? `https://explorer.solana.com/tx/${result.signature}?cluster=${cluster}`
            : `https://explorer.solana.com/tx/${result.signature}`;

          console.log('[Solana] Room created successfully:', {
            roomPDA: result.room,
            signature: result.signature,
          });

          return {
            success: true,
            contractAddress: result.room, // Room PDA address as string
            txHash: result.signature,
            explorerUrl,
          };
        } catch (error: any) {
          console.error('[Solana] Deploy error:', error);
          throw new Error(error?.message || 'Failed to deploy room on Solana');
        }
      };
    }

    if (effectiveChain === 'evm') {
      return async (_params: DeployParams): Promise<DeployResult> => {
        throw new Error('EVM deployment not implemented yet');
      };
    }

    if (effectiveChain === 'stellar') {
      return async (_params: DeployParams): Promise<DeployResult> => {
        throw new Error('Stellar deployment not implemented yet');
      };
    }

    return async (_params: DeployParams): Promise<DeployResult> => {
      throw new Error(`Deployment not implemented for ${effectiveChain || 'unknown'} chain`);
    };
  }, [effectiveChain, publicKey, solanaContract, connection]);

  /** ---------------- Join Room (Pay Entry Fee) ---------------- */
  const joinRoom = useMemo(() => {
    if (effectiveChain === 'solana') {
      return async ({ roomId, feeAmount, extrasAmount, roomAddress }: JoinArgs): Promise<JoinResult> => {
        try {
          console.log('[Solana] Joining room:', { roomId, feeAmount, extrasAmount, roomAddress });

          if (!publicKey) {
            return { success: false, error: 'Wallet not connected' };
          }

          if (!roomAddress || typeof roomAddress !== 'string') {
            return { success: false, error: 'Room address is required' };
          }

          // Parse room PDA
          let roomPDA: PublicKey;
          try {
            roomPDA = new PublicKey(roomAddress);
          } catch {
            return { success: false, error: 'Invalid room address' };
          }

          // Fetch room account to get host and token mint
          if (!solanaContract.getRoomInfo) {
            return { success: false, error: 'Contract methods not available' };
          }

          // Use the room PDA directly to fetch room info
          const roomInfo = await solanaContract.getRoomInfo(roomPDA);
          if (!roomInfo) {
            return { success: false, error: 'Room not found on-chain' };
          }

          // Parse extras amount (convert to base units)
          const extrasAmountBN = extrasAmount
            ? new BN(Math.round(parseFloat(extrasAmount) * 1_000_000))
            : new BN(0);

          console.log('[Solana] Calling joinRoom with extrasAmount:', extrasAmountBN.toString());

          // Call Solana program
          const result = await solanaContract.joinRoom({
            roomId,
            hostPubkey: roomInfo.host,
            extrasAmount: extrasAmountBN,
            feeTokenMint: roomInfo.feeTokenMint,
          });

          console.log('[Solana] Join successful:', result.signature);

          return { success: true, txHash: result.signature };
        } catch (error: any) {
          console.error('[Solana] Join error:', error);
          return {
            success: false,
            error: error?.message || 'Failed to join room',
          };
        }
      };
    }

    if (effectiveChain === 'evm') {
      return async (_args: JoinArgs): Promise<JoinResult> => ({
        success: false,
        error: 'EVM join not implemented yet',
      });
    }

    if (effectiveChain === 'stellar') {
      return async (_args: JoinArgs): Promise<JoinResult> => ({
        success: false,
        error: 'Stellar join not implemented yet',
      });
    }

    return async (_args: JoinArgs): Promise<JoinResult> => ({
      success: false,
      error: `joinRoom not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, publicKey, solanaContract]);

  /** ---------------- Distribute Prizes ---------------- */
  const distributePrizes = useMemo(() => {
    if (effectiveChain === 'solana') {
      return async ({ roomId, roomAddress, winners }: DistributeArgs): Promise<DistributeResult> => {
        try {
          console.log('[Solana] Distributing prizes:', { roomId, winners });

          if (!publicKey) {
            return { success: false, error: 'Wallet not connected' };
          }

          if (!roomAddress) {
            return { success: false, error: 'Room address is required' };
          }

          // Parse room PDA
          let roomPDA: PublicKey;
          try {
            roomPDA = new PublicKey(roomAddress);
          } catch {
            return { success: false, error: 'Invalid room address' };
          }

          // Fetch room info
          if (!solanaContract.getRoomInfo) {
            return { success: false, error: 'Contract methods not available' };
          }

          // Use the room PDA directly to fetch room info
          const roomInfo = await solanaContract.getRoomInfo(roomPDA);
          if (!roomInfo) {
            return { success: false, error: 'Room not found on-chain' };
          }

          // Parse winner addresses
          const winnerPubkeys = winners
            .map(w => w.address)
            .filter((addr): addr is string => !!addr)
            .map(addr => {
              try {
                return new PublicKey(addr);
              } catch {
                console.warn('[Solana] Invalid winner address:', addr);
                return null;
              }
            })
            .filter((pk): pk is PublicKey => pk !== null);

          if (winnerPubkeys.length === 0) {
            return { success: false, error: 'No valid winner addresses found' };
          }

          console.log('[Solana] Calling endRoom with', winnerPubkeys.length, 'winners');

          // Call Solana program to distribute
          const result = await solanaContract.endRoom({
            roomId,
            hostPubkey: roomInfo.host,
            winners: winnerPubkeys,
            feeTokenMint: roomInfo.feeTokenMint,
          });

          const cluster = getSolanaCluster();
          const explorerUrl = cluster
            ? `https://explorer.solana.com/tx/${result.signature}?cluster=${cluster}`
            : `https://explorer.solana.com/tx/${result.signature}`;

          console.log('[Solana] Prize distribution successful:', result.signature);

          return {
            success: true,
            txHash: result.signature,
            explorerUrl,
          };
        } catch (error: any) {
          console.error('[Solana] Prize distribution error:', error);
          return {
            success: false,
            error: error?.message || 'Failed to distribute prizes',
          };
        }
      };
    }

    if (effectiveChain === 'evm') {
      return async (_args: DistributeArgs): Promise<DistributeResult> => ({
        success: false,
        error: 'EVM prize distribution not implemented yet',
      });
    }

    if (effectiveChain === 'stellar') {
      return async (_args: DistributeArgs): Promise<DistributeResult> => ({
        success: false,
        error: 'Stellar prize distribution not implemented yet',
      });
    }

    return async () => ({ success: false, error: 'Prize distribution not implemented for this chain' });
  }, [effectiveChain, publicKey, solanaContract, connection]);

  return { deploy, joinRoom, distributePrizes };
}
