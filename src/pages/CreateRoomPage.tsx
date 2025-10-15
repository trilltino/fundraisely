/**
 * Room Creation Page Component
 *
 * Provides form interface for hosts to configure and create fundraising quiz rooms on Solana.
 * Integrates with The Giving Block charity selection, validates fee structures per platform
 * constraints (platform 20%, host 0-5%, prize 0-35%, charity 40%+ minimum), and executes
 * init_pool_room instruction on the deployed Anchor program. Supports native SOL as entry fee
 * token with configurable max players, prize distribution, and 24-hour room expiration.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { WalletButton } from '@/components/Wallet/WalletButton';
import { CharitySelector } from '@/components/Charity';
import { useFundraiselyContract } from '@/chains/solana/useFundraiselyContract';

export default function CreateRoomPage() {
  const { connected } = useWallet();
  const { createPoolRoom } = useFundraiselyContract();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    roomId: '',
    entryFee: '',
    maxPlayers: '10',
    hostFeePercent: '0',  // Store as percentage for display
    prizePoolPercent: '30', // Store as percentage for display (30% = 3000 bps)
  });

  const [charityWallet, setCharityWallet] = useState<PublicKey | null>(null);
  const [charityName, setCharityName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateCharityPercent = () => {
    const hostFee = parseFloat(formData.hostFeePercent) || 0;
    const prizePool = parseFloat(formData.prizePoolPercent) || 0;
    const platform = 20; // Fixed 20%
    return 100 - platform - hostFee - prizePool;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!connected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!charityWallet) {
      setError('Please select a charity');
      return;
    }

    if (!formData.roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    if (!formData.entryFee || parseFloat(formData.entryFee) <= 0) {
      setError('Please enter a valid entry fee');
      return;
    }

    setLoading(true);

    try {
      // Convert to proper types
      const hostFeeBps = Math.floor(parseFloat(formData.hostFeePercent) * 100);
      const prizePoolBps = Math.floor(parseFloat(formData.prizePoolPercent) * 100);
      const entryFeeLamports = Math.floor(parseFloat(formData.entryFee) * 1_000_000_000);
      const maxPlayersNum = parseInt(formData.maxPlayers);

      // Validation
      if (hostFeeBps > 500) {
        throw new Error('Host fee cannot exceed 5%');
      }

      if (prizePoolBps > 3500) {
        throw new Error('Prize pool cannot exceed 35%');
      }

      if (hostFeeBps + prizePoolBps > 4000) {
        throw new Error('Host fee + Prize pool cannot exceed 40% (charity must get at least 40%)');
      }

      const charityPercent = calculateCharityPercent();
      if (charityPercent < 40) {
        throw new Error('Charity must receive at least 40% of entry fees');
      }

      if (maxPlayersNum < 1 || maxPlayersNum > 1000) {
        throw new Error('Max players must be between 1 and 1000');
      }

      // Native SOL mint (wrapped SOL)
      const feeTokenMint = new PublicKey('So11111111111111111111111111111111111111112');

      console.log('[CreateRoom] Creating room with params:', {
        roomId: formData.roomId,
        charityWallet: charityWallet.toBase58(),
        charityName,
        entryFee: entryFeeLamports,
        maxPlayers: maxPlayersNum,
        hostFeeBps,
        prizePoolBps,
        charityPercent,
      });

      // Create room on-chain
      const result = await createPoolRoom({
        roomId: formData.roomId,
        charityWallet,
        entryFee: new BN(entryFeeLamports),
        maxPlayers: maxPlayersNum,
        hostFeeBps,
        prizePoolBps,
        firstPlacePct: 50,  // 50% to 1st place
        secondPlacePct: 30, // 30% to 2nd place
        thirdPlacePct: 20,  // 20% to 3rd place
        charityMemo: `Donation to ${charityName}`,
        expirationSlots: new BN(43200), // ~24 hours (assuming 400ms slots)
        feeTokenMint,
      });

      console.log('[CreateRoom] Room created successfully:', result);
      alert(`Room created successfully! Transaction: ${result.signature}`);

      // Navigate to the room page
      navigate(`/room/${formData.roomId}`);
    } catch (err) {
      console.error('[CreateRoom] Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white">Create Fundraising Room</h1>
          <p className="text-gray-400 mt-2">Set up a new quiz room for charity fundraising</p>
        </div>
        <WalletButton />
      </header>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Charity Selector */}
          <CharitySelector
            onSelect={(wallet, name) => {
              setCharityWallet(wallet);
              setCharityName(name);
              setError(null);
            }}
            selectedCharity={charityName}
          />

          {/* Room ID */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Room ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white placeholder-gray-400"
              placeholder="my-quiz-room"
              required
              maxLength={32}
            />
            <p className="text-sm text-gray-400 mt-1">Unique identifier (max 32 characters, alphanumeric + dashes)</p>
          </div>

          {/* Entry Fee */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Entry Fee (SOL) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={formData.entryFee}
              onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white placeholder-gray-400"
              placeholder="0.1"
              required
            />
            <p className="text-sm text-gray-400 mt-1">Amount each player pays to join (minimum 0.001 SOL)</p>
          </div>

          {/* Max Players */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Max Players <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={formData.maxPlayers}
              onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white placeholder-gray-400"
              required
            />
            <p className="text-sm text-gray-400 mt-1">Maximum number of players allowed (1-1000)</p>
          </div>

          {/* Host Fee */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Host Fee (%)</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={formData.hostFeePercent}
              onChange={(e) => setFormData({ ...formData, hostFeePercent: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white placeholder-gray-400"
            />
            <p className="text-sm text-gray-400 mt-1">Your fee for hosting (0-5%)</p>
          </div>

          {/* Prize Pool */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Prize Pool (%)</label>
            <input
              type="number"
              min="0"
              max="35"
              step="1"
              value={formData.prizePoolPercent}
              onChange={(e) => setFormData({ ...formData, prizePoolPercent: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white placeholder-gray-400"
            />
            <p className="text-sm text-gray-400 mt-1">Percentage for winner prizes (0-35%)</p>
          </div>

          {/* Fee Breakdown Display */}
          <div className="mb-6 p-4 bg-purple-600/20 border border-purple-500 rounded-lg">
            <h3 className="text-white font-semibold mb-2">Fee Distribution Breakdown</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Platform Fee (fixed):</span>
                <span className="font-semibold">20%</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Host Fee:</span>
                <span className="font-semibold">{formData.hostFeePercent || '0'}%</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Prize Pool:</span>
                <span className="font-semibold">{formData.prizePoolPercent || '0'}%</span>
              </div>
              <div className="flex justify-between text-green-300 pt-2 border-t border-gray-600">
                <span>Charity Gets:</span>
                <span className="font-bold">{calculateCharityPercent()}%</span>
              </div>
              <div className="flex justify-between text-yellow-300 mt-2">
                <span>+ All Player "Extras" (tips):</span>
                <span className="font-bold">100% to Charity</span>
              </div>
            </div>
          </div>

          {/* Prize Distribution Info */}
          <div className="mb-6 p-4 bg-blue-600/20 border border-blue-500 rounded-lg">
            <h3 className="text-white font-semibold mb-2">Prize Distribution</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>1st Place:</span>
                <span className="font-semibold">50% of prize pool</span>
              </div>
              <div className="flex justify-between">
                <span>2nd Place:</span>
                <span className="font-semibold">30% of prize pool</span>
              </div>
              <div className="flex justify-between">
                <span>3rd Place:</span>
                <span className="font-semibold">20% of prize pool</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!connected || loading || !charityWallet}
            className="w-full px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
          >
            {loading ? (
              <span>Creating Room...</span>
            ) : !connected ? (
              <span>Connect Wallet First</span>
            ) : !charityWallet ? (
              <span>Select Charity First</span>
            ) : (
              <span>Create Room</span>
            )}
          </button>

          {loading && (
            <p className="text-center text-gray-400 mt-4">
              Please confirm the transaction in your wallet...
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
