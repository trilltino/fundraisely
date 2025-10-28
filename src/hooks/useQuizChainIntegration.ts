// src/hooks/useQuizChainIntegration.ts
// Chain-agnostic quiz integration hook supporting Solana, EVM, and Stellar
// Based on reference bingo implementation

import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useQuizConfig } from '../components/Quiz/useQuizConfig';

export type SupportedChain = 'solana' | 'evm' | 'stellar';

const SOLANA_NAME_BY_CLUSTER: Record<string, string> = {
  mainnet: 'Solana',
  devnet: 'Solana (Devnet)',
  testnet: 'Solana (Testnet)',
};

const hasPositiveAmount = (value: unknown): boolean => {
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return !Number.isNaN(n) && n > 0;
  }
  return false;
};

type Options = { chainOverride?: SupportedChain | null };

export const useQuizChainIntegration = (opts?: Options) => {
  const { config } = useQuizConfig();

  // Solana wallet and connection
  const solanaWallet = useWallet();
  const { connection } = useConnection();

  // Determine selected chain from config or override
  const selectedChain: SupportedChain | null = useMemo(() => {
    if (opts?.chainOverride) return opts.chainOverride;

    const configChain = config?.web3Chain as SupportedChain | undefined;
    if (configChain === 'solana' || configChain === 'evm' || configChain === 'stellar') {
      return configChain;
    }

    return null;
  }, [opts?.chainOverride, config?.web3Chain]);

  // Get current wallet based on selected chain
  const currentWallet = useMemo(() => {
    switch (selectedChain) {
      case 'solana':
        return {
          isConnected: solanaWallet.connected,
          isConnecting: solanaWallet.connecting,
          error: null, // Solana adapter doesn't expose errors in same way
          address: solanaWallet.publicKey?.toBase58() || null,
        };
      case 'evm':
        // TODO: Add EVM wallet support when needed
        return undefined;
      case 'stellar':
        // TODO: Add Stellar wallet support when needed
        return undefined;
      default:
        return undefined;
    }
  }, [selectedChain, solanaWallet]);

  const isWalletConnected = !!currentWallet?.isConnected;
  const isWalletConnecting = !!currentWallet?.isConnecting;
  const walletError = currentWallet?.error;
  const walletAddress = currentWallet?.address;

  // Network-aware display name
  const getNetworkDisplayName = (chain?: SupportedChain | null): string => {
    const c = chain ?? selectedChain;
    if (!c) return 'No blockchain';

    if (c === 'solana') {
      const cluster = (config as any)?.solanaCluster || 'mainnet';
      return SOLANA_NAME_BY_CLUSTER[cluster] ?? 'Solana';
    }

    if (c === 'evm') {
      // TODO: Add EVM network display logic
      return 'EVM';
    }

    if (c === 'stellar') {
      return 'Stellar';
    }

    return 'Unknown';
  };

  // Chain family label only
  const getChainDisplayName = (chain?: SupportedChain | null): string => {
    const c = chain ?? selectedChain;
    if (!c) return 'No blockchain';
    return c === 'stellar' ? 'Stellar' : c === 'solana' ? 'Solana' : 'EVM';
  };

  // Check if wallet is required (has positive entry fee)
  const isWalletRequired = useMemo(() => {
    if (!selectedChain) return false;
    const fee = config?.entryFee;
    return hasPositiveAmount(fee);
  }, [selectedChain, config?.entryFee]);

  // Check if wallet setup is complete
  const isWalletSetupComplete = useMemo(() => {
    if (!isWalletRequired) return true;
    if (!selectedChain) return false;
    return isWalletConnected;
  }, [isWalletRequired, selectedChain, isWalletConnected]);

  // Wallet readiness status
  const walletReadiness = useMemo(() => {
    const net = getNetworkDisplayName();
    if (!isWalletRequired) {
      return { status: 'not-required' as const, message: 'No wallet required for this quiz', canProceed: true };
    }
    if (!selectedChain) {
      return { status: 'no-chain' as const, message: 'No blockchain selected', canProceed: false };
    }
    if (isWalletConnecting) {
      return { status: 'connecting' as const, message: `Connecting to ${net}…`, canProceed: false };
    }
    if (walletError) {
      return { status: 'error' as const, message: `Wallet error: ${walletError.message}`, canProceed: false };
    }
    if (!isWalletConnected) {
      return { status: 'disconnected' as const, message: `${net} wallet not connected`, canProceed: false };
    }
    return { status: 'ready' as const, message: `${net} wallet connected and ready`, canProceed: true };
  }, [isWalletRequired, selectedChain, isWalletConnecting, walletError, isWalletConnected, getNetworkDisplayName]);

  // Check if using specific chain
  const isUsingChain = (chain: SupportedChain): boolean => selectedChain === chain;

  // Format wallet address (short or full)
  const getFormattedAddress = (short = true): string | null => {
    if (!walletAddress) return null;
    if (!short) return walletAddress;
    return walletAddress.length > 10
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress;
  };

  return {
    // Selection
    selectedChain,

    // Wallet state
    isWalletConnected,
    isWalletConnecting,
    walletError,
    walletAddress,
    currentWallet,

    // Requirements
    isWalletRequired,
    isWalletSetupComplete,
    walletReadiness,

    // Helpers
    getNetworkDisplayName,
    getChainDisplayName,
    isUsingChain,
    getFormattedAddress,
  };
};
