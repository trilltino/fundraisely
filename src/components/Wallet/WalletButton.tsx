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
