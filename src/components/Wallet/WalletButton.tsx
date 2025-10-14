/**
 * Wallet Connection Button Component
 *
 * Provides user interface for Solana wallet connection/disconnection using Solana Wallet Adapter.
 * Wraps WalletMultiButton to display available wallet options (Phantom, Solflare) and manages
 * connection state. Shows truncated wallet address (first 4 and last 4 characters) when connected
 * for user confirmation. Used across all pages (HomePage, CreateRoomPage, RoomPage) in the header
 * to maintain persistent wallet connectivity. Inherits wallet configuration from SolanaWalletProvider
 * including network selection and auto-connect behavior. Essential for all blockchain transactions.
 */

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  const { publicKey, connected } = useWallet();

  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton />
      {connected && publicKey && (
        <div className="text-sm text-gray-300">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </div>
      )}
    </div>
  );
}
