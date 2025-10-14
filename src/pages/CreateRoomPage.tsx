import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/Wallet/WalletButton';
import { useFundraiselyContract } from '@/chains/solana/useFundraiselyContract';

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const { connected } = useWallet();
  const { createPoolRoom } = useFundraiselyContract();

  const [formData, setFormData] = useState({
    roomId: '',
    entryFee: '',
    hostFeePercent: '0',  // Store as percentage for display
    prizePoolPercent: '30', // Store as percentage for display (30% = 3000 bps)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Convert percentages to basis points (1% = 100 bps)
      const hostFeeBps = Math.floor(parseFloat(formData.hostFeePercent) * 100);
      const prizePoolBps = Math.floor(parseFloat(formData.prizePoolPercent) * 100);
      const entryFeeLamports = Math.floor(parseFloat(formData.entryFee) * 1_000_000_000); // Convert SOL to lamports

      // Validation
      if (hostFeeBps > 500) {
        alert('Host fee cannot exceed 5%');
        return;
      }

      if (hostFeeBps + prizePoolBps > 4000) {
        alert('Host fee + Prize pool cannot exceed 40%');
        return;
      }

      // TODO: Implement actual room creation
      // await createPoolRoom({
      //   roomId: formData.roomId,
      //   entryFee: entryFeeLamports,
      //   hostFeeBps,
      //   prizePoolBps,
      //   firstPlacePct: 50,  // Example: 50% to 1st place
      //   secondPlacePct: 30, // 30% to 2nd place
      //   thirdPlacePct: 20,  // 20% to 3rd place
      //   charityMemo: 'Fundraisely donation'
      // });

      console.log('Creating room with:', {
        roomId: formData.roomId,
        entryFee: entryFeeLamports,
        hostFeeBps,
        prizePoolBps,
      });

      alert('Room creation not yet implemented. Check console for details.');
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error creating room: ' + (error as Error).message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold text-white">Create Room</h1>
        <WalletButton />
      </header>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Room ID</label>
            <input
              type="text"
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white"
              placeholder="my-quiz-room"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Entry Fee (SOL)</label>
            <input
              type="number"
              step="0.01"
              value={formData.entryFee}
              onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white"
              placeholder="0.1"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Host Fee (%)</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={formData.hostFeePercent}
              onChange={(e) => setFormData({ ...formData, hostFeePercent: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white"
            />
            <p className="text-sm text-gray-400 mt-1">Maximum 5% (Platform fee is 20%, charity gets remainder)</p>
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Prize Pool (%)</label>
            <input
              type="number"
              min="0"
              max="40"
              step="1"
              value={formData.prizePoolPercent}
              onChange={(e) => setFormData({ ...formData, prizePoolPercent: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white"
            />
            <p className="text-sm text-gray-400 mt-1">Maximum 40% combined with host fee</p>
          </div>

          <button
            type="submit"
            disabled={!connected}
            className="w-full px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
          >
            {connected ? 'Create Room' : 'Connect Wallet First'}
          </button>
        </form>
      </div>
    </div>
  );
}
