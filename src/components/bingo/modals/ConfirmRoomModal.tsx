// src/components/ConfirmRoomModal.tsx - Full Solana Integration
import type React from 'react';
import { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { checkServerHealth } from '@/utils/checkServerHealth';
import { createPoolRoom, solToLamports } from '@/lib/solana/program';

interface ConfirmRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (walletAddress: string, roomPDA?: string, signature?: string) => void;
  hostName: string;
  entryFee: string;
  roomId: string;
}

const InfoItem = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
  <div className={`bg-gray-50 p-2 rounded-lg ${className}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium break-all">{value}</p>
  </div>
);

const ConfirmRoomModal: React.FC<ConfirmRoomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hostName,
  entryFee,
  roomId,
}) => {
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [serverHealthy, setServerHealthy] = useState(true);

  const walletAddress = publicKey?.toBase58() || '';

  const handleConfirm = async () => {
    setError('');
    setStatus('');
    console.log('[LAUNCH] handleConfirm called', { roomId, hostName, entryFee });

    // Check server health
    const serverAlive = await checkServerHealth();
    console.log('[COMPLETE] Server health:', serverAlive);
    if (!serverAlive) {
      setError('[URGENT] Server unavailable. Try again later.');
      setServerHealthy(false);
      return;
    }
    setServerHealthy(true);

    if (!connected || !publicKey || !signTransaction || !signAllTransactions) {
      setError('Please connect wallet.');
      return;
    }

    setIsDeploying(true);
    setStatus('Creating Solana room on-chain...');

    try {
      // Create Anchor provider
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: 'confirmed' }
      );

      // Default charity wallet (you can make this configurable)
      const charityWallet = new PublicKey('DurTiNFFQK62B5nMimfhuvztJXsFyu8skMz6rNtp2Wmq'); // TODO: Replace with real charity

      // Convert entry fee to lamports
      const entryFeeLamports = solToLamports(parseFloat(entryFee));

      // Room parameters
      const roomArgs = {
        roomId,
        charityWallet,
        entryFee: entryFeeLamports,
        maxPlayers: 100, // Default max players
        hostFeeBps: 0, // 0% host fee (can be up to 5%)
        prizePoolBps: 3000, // 30% prize pool
        firstPlacePct: 100, // 100% to first place (can split 1st/2nd/3rd)
        secondPlacePct: null,
        thirdPlacePct: null,
        charityMemo: `Bingo for ${hostName}`,
        expirationSlots: null, // No expiration
      };

      console.log('[NOTE] Creating room with args:', roomArgs);
      setStatus('Sending transaction to Solana...');

      const { signature, roomPDA } = await createPoolRoom(provider, roomArgs);

      console.log('[COMPLETE] Room created!', {
        signature,
        roomPDA: roomPDA.toBase58(),
      });

      setStatus(`Room created! Tx: ${signature.slice(0, 8)}...`);

      // Wait a bit for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Call parent with wallet address and room PDA
      onConfirm(walletAddress, roomPDA.toBase58(), signature);

    } catch (err: any) {
      console.error('[ERROR] Room creation failed:', err);

      // Parse Anchor/Solana errors
      let errorMsg = 'Unknown error';
      if (err.message) {
        errorMsg = err.message;
      }
      if (err.logs) {
        console.error('Program logs:', err.logs);
      }

      setError(errorMsg);
      setStatus('');
    } finally {
      setIsDeploying(false);
    }
  };

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

          <h3 className="text-lg font-bold text-center mb-2">Confirm Fundraising Event</h3>

          <div className="space-y-2 mb-3">
            {error && (
              <div className="flex items-start gap-1 bg-red-50 p-2 rounded-lg text-red-500 text-xs">
                <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            <InfoItem label="Room ID" value={roomId} />
            <InfoItem label="Host Name" value={hostName} />
            <InfoItem label="Entry Fee" value={`${entryFee} SOL`} />
            <InfoItem label="Prize Pool" value="30% of entries" />
            <InfoItem label="Charity Donation" value="50% of entries" />
            <InfoItem label="Blockchain Network" value="Solana Devnet" />
            <InfoItem
              label="Wallet Address"
              value={connected ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
            />
            {status && <InfoItem label="Status" value={status} className="text-blue-500 bg-blue-50" />}
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
              onClick={handleConfirm}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!connected || isDeploying || !serverHealthy}
            >
              {isDeploying ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRoomModal;
