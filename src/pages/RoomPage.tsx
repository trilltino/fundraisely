import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/Wallet/WalletButton';
import { useSocket } from '@/hooks/useSocket';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { connected, publicKey } = useWallet();
  const { roomState, joinRoom, toggleReady, startGame } = useSocket(roomId);

  useEffect(() => {
    if (connected && publicKey && roomId) {
      // Auto-join room when wallet is connected
      joinRoom({
        roomId,
        playerName: 'Player',
        walletAddress: publicKey.toString(),
      });
    }
  }, [connected, publicKey, roomId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold text-white">Room: {roomId}</h1>
        <WalletButton />
      </header>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Players</h2>
          {roomState ? (
            <div className="space-y-2">
              {roomState.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-white/10 rounded-lg"
                >
                  <div>
                    <span className="text-white font-semibold">{player.name}</span>
                    {player.isHost && (
                      <span className="ml-2 text-xs bg-purple-600 px-2 py-1 rounded">HOST</span>
                    )}
                  </div>
                  <div>
                    {player.isReady ? (
                      <span className="text-green-400">Ready</span>
                    ) : (
                      <span className="text-gray-400">Not Ready</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Loading...</p>
          )}
        </div>

        {roomState && (
          <div className="flex gap-4">
            <button
              onClick={() => toggleReady(roomId!)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Toggle Ready
            </button>
            {roomState.players.find((p) => p.wallet === publicKey?.toString())?.isHost && (
              <button
                onClick={() => startGame(roomId!)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
              >
                Start Game
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
