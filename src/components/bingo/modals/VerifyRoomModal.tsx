// src/components/VerifyRoomModal.tsx - Solana-only version
import { CheckCircle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

interface VerifyRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hostName: string;
  entryFee: string;
  contractAddress: string;
}

const InfoItem = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
  <div className={`bg-gray-50 p-2 rounded-lg ${className}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium break-all">{value}</p>
  </div>
);

const VerifyRoomModal: React.FC<VerifyRoomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hostName,
  entryFee,
  contractAddress,
}) => {
  const { publicKey, connected } = useWallet();

  const walletAddress = publicKey?.toBase58() || '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-sm mx-4 shadow-lg overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-center mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-center mb-2">Verify Bingo Room</h3>

          <div className="space-y-2 mb-3">
            <InfoItem label="Host Name" value={hostName} />
            <InfoItem label="Entry Fee" value={`${entryFee} SOL`} />
            <InfoItem label="Blockchain Network" value="Solana Devnet" />
            <InfoItem
              label="Wallet Address"
              value={connected ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
            />
            {contractAddress && (
              <InfoItem label="Room ID" value={contractAddress} />
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 text-sm rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!connected}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-green-600 to-teal-600 text-white text-sm rounded-lg font-medium hover:from-green-700 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pay & Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyRoomModal;
