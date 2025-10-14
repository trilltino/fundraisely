/**
 * Solana Wallet Provider Component
 *
 * Configures and initializes the Solana Wallet Adapter ecosystem for the entire application.
 * Wraps the app with ConnectionProvider (RPC connection), WalletProvider (wallet integration),
 * and WalletModalProvider (connection UI) to enable blockchain interactions across all components.
 * Supports Phantom and Solflare wallets with auto-connect enabled for better UX. Reads network
 * configuration from environment variables (VITE_SOLANA_RPC_URL) or defaults to devnet cluster.
 * Used in App.tsx to provide wallet context to all routes, enabling components like WalletButton,
 * CreateRoomPage, and useFundraiselyContract to access connected wallet state and signing capabilities.
 */

import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  // Use devnet for development, mainnet for production
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => {
    if (import.meta.env.VITE_SOLANA_RPC_URL) {
      return import.meta.env.VITE_SOLANA_RPC_URL;
    }
    return clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
