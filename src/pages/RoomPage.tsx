/**
 * Room Page Component - Complete Room Management
 *
 * Comprehensive room management interface integrating blockchain state with real-time game coordination.
 * For players: view room details, join with entry fee + optional extras, see live player list.
 * For hosts: declare winners after game ends, distribute funds via end_room instruction.
 * Fetches Room PDA data for configuration, PlayerEntry PDAs for participant tracking, and maintains
 * WebSocket connection for quiz game coordination. Supports full lifecycle: join → play → declare → distribute.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { WalletButton } from '@/components/Wallet/WalletButton';
import { useFundraiselyContract } from '@/chains/solana/useFundraiselyContract';
import { useSocket } from '@/hooks/useSocket';
import type { Room, PlayerEntry } from '@/types/program.types';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const {
    program,
    joinRoom: joinRoomBlockchain,
    declareWinners,
    endRoom: endRoomBlockchain,
  } = useFundraiselyContract();
  const { roomState, joinRoom: joinRoomSocket, toggleReady, startGame } = useSocket(roomId);

  // State
  const [room, setRoom] = useState<Room | null>(null);
  const [roomPDA, setRoomPDA] = useState<PublicKey | null>(null);
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [extrasAmount, setExtrasAmount] = useState('0');
  const [selectedWinners, setSelectedWinners] = useState<PublicKey[]>([]);
  const [declaring, setDeclaring] = useState(false);
  const [ending, setEnding] = useState(false);

  // Fetch room and players from blockchain
  useEffect(() => {
    if (!program || !roomId) {
      setLoading(false);
      return;
    }

    async function fetchRoomData() {
      try {
        setLoading(true);
        setError(null);

        console.log(`[RoomPage] Fetching room data for: ${roomId}`);

        // TypeScript null check
        if (!program) {
          throw new Error('Program not available');
        }

        // Fetch all rooms and find ours
        const allRooms = await (program.account as any).room.all();
        const roomData = allRooms.find((r: any) => r.account.roomId === roomId);

        if (!roomData) {
          throw new Error('Room not found');
        }

        setRoom(roomData.account);
        setRoomPDA(roomData.publicKey);

        console.log('[RoomPage] Room data:', roomData.account);

        // Fetch all player entries for this room
        const allPlayers = await (program.account as any).playerEntry.all();
        const roomPlayers = allPlayers
          .filter((p: any) => p.account.room.equals(roomData.publicKey))
          .map((p: any) => p.account);

        setPlayers(roomPlayers);

        console.log(`[RoomPage] Found ${roomPlayers.length} players`);
      } catch (err) {
        console.error('[RoomPage] Error fetching room:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchRoomData();
  }, [program, roomId]);

  // Auto-join WebSocket room for game coordination
  useEffect(() => {
    if (connected && publicKey && roomId && room) {
      joinRoomSocket({
        roomId,
        playerName: publicKey.toBase58().slice(0, 8),
        walletAddress: publicKey.toString(),
      });
    }
  }, [connected, publicKey, roomId, room]);

  // Handle join room on blockchain
  const handleJoinRoom = async () => {
    if (!connected || !publicKey || !room || !roomPDA) {
      setError('Please connect your wallet');
      return;
    }

    if (room.ended) {
      setError('Room has ended');
      return;
    }

    if (room.playerCount >= room.maxPlayers) {
      setError('Room is full');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const extrasLamports = Math.floor(parseFloat(extrasAmount || '0') * 1_000_000_000);

      console.log('[RoomPage] Joining room:', {
        roomId,
        hostPubkey: room.host.toBase58(),
        extrasAmount: extrasLamports,
      });

      const result = await joinRoomBlockchain({
        roomId: roomId!,
        hostPubkey: room.host,
        extrasAmount: new BN(extrasLamports),
        feeTokenMint: room.feeTokenMint,
      });

      console.log('[RoomPage] Joined successfully:', result);
      alert(`Successfully joined room! Transaction: ${result.signature}`);

      // Refresh room data
      window.location.reload();
    } catch (err) {
      console.error('[RoomPage] Join failed:', err);
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  // Handle declare winners
  const handleDeclareWinners = async () => {
    if (!connected || !publicKey || !room || !roomPDA) {
      setError('Please connect your wallet');
      return;
    }

    if (!room.host.equals(publicKey)) {
      setError('Only the host can declare winners');
      return;
    }

    if (selectedWinners.length < 1 || selectedWinners.length > 3) {
      setError('Please select 1-3 winners');
      return;
    }

    setDeclaring(true);
    setError(null);

    try {
      console.log('[RoomPage] Declaring winners:', selectedWinners.map(w => w.toBase58()));

      const result = await declareWinners({
        roomId: roomId!,
        hostPubkey: room.host,
        winners: selectedWinners,
      });

      console.log('[RoomPage] Winners declared:', result);
      alert(`Winners declared! Transaction: ${result.signature}`);

      // Refresh room data
      window.location.reload();
    } catch (err) {
      console.error('[RoomPage] Declare winners failed:', err);
      setError((err as Error).message);
    } finally {
      setDeclaring(false);
    }
  };

  // Handle end room
  const handleEndRoom = async () => {
    if (!connected || !publicKey || !room || !roomPDA) {
      setError('Please connect your wallet');
      return;
    }

    if (!room.host.equals(publicKey)) {
      setError('Only the host can end the room');
      return;
    }

    // Check if winners are declared
    const declaredWinners = room.winners.filter((w): w is PublicKey => w !== null);
    if (declaredWinners.length === 0) {
      setError('Please declare winners before ending the room');
      return;
    }

    setEnding(true);
    setError(null);

    try {
      console.log('[RoomPage] Ending room and distributing funds...');

      const result = await endRoomBlockchain({
        roomId: roomId!,
        hostPubkey: room.host,
        winners: declaredWinners,
        feeTokenMint: room.feeTokenMint,
      });

      console.log('[RoomPage] Room ended successfully:', result);
      alert(`Room ended and funds distributed! Transaction: ${result.signature}`);

      // Navigate back to home
      navigate('/');
    } catch (err) {
      console.error('[RoomPage] End room failed:', err);
      setError((err as Error).message);
    } finally {
      setEnding(false);
    }
  };

  // Toggle winner selection
  const toggleWinnerSelection = (playerPubkey: PublicKey) => {
    setSelectedWinners((prev) => {
      const isSelected = prev.some(w => w.equals(playerPubkey));
      if (isSelected) {
        return prev.filter(w => !w.equals(playerPubkey));
      } else {
        if (prev.length >= 3) {
          setError('You can only select up to 3 winners');
          return prev;
        }
        return [...prev, playerPubkey];
      }
    });
  };

  // Check if current user is host
  const isHost = publicKey && room && room.host.equals(publicKey);

  // Check if current user has joined
  const hasJoined = players.some(p => publicKey && p.player.equals(publicKey));

  // Calculate distribution amounts
  const calculateDistribution = () => {
    if (!room) return null;

    const entryFeesLamports = room.totalEntryFees.toNumber();
    const extrasLamports = room.totalExtrasFees.toNumber();

    const platformAmount = (entryFeesLamports * 2000) / 10000; // 20%
    const hostAmount = (entryFeesLamports * room.hostFeeBps) / 10000;
    const prizeAmount = (entryFeesLamports * room.prizePoolBps) / 10000;
    const charityFromFees = (entryFeesLamports * room.charityBps) / 10000;
    const charityTotal = charityFromFees + extrasLamports;

    return {
      platform: platformAmount / 1_000_000_000,
      host: hostAmount / 1_000_000_000,
      prize: prizeAmount / 1_000_000_000,
      charityFromFees: charityFromFees / 1_000_000_000,
      extras: extrasLamports / 1_000_000_000,
      charityTotal: charityTotal / 1_000_000_000,
    };
  };

  const distribution = calculateDistribution();

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400">Loading room data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold text-white mb-4">Room Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The room you are looking for does not exist'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">{room.roomId}</h1>
          <p className="text-gray-400 mt-2">
            {room.ended ? 'Game Ended' : `${room.playerCount} / ${room.maxPlayers} Players`}
          </p>
        </div>
        <WalletButton />
      </header>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Room Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column: Room Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Room Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Host</p>
                <p className="text-white font-mono text-sm">
                  {room.host.toBase58().slice(0, 8)}...{room.host.toBase58().slice(-8)}
                  {isHost && <span className="ml-2 text-purple-400">(You)</span>}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className={`font-semibold ${room.ended ? 'text-gray-400' : 'text-green-400'}`}>
                  {room.ended ? 'Ended' : 'Active'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Entry Fee</p>
                <p className="text-white font-semibold">
                  {(room.entryFee.toNumber() / 1_000_000_000).toFixed(3)} SOL
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Collected</p>
                <p className="text-white font-semibold">
                  {(room.totalCollected.toNumber() / 1_000_000_000).toFixed(3)} SOL
                </p>
              </div>
            </div>
          </div>

          {/* Fee Distribution */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Fee Distribution</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Platform (20%):</span>
                <span className="text-white font-semibold">{distribution?.platform.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Host ({room.hostFeeBps / 100}%):</span>
                <span className="text-white font-semibold">{distribution?.host.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Prize Pool ({room.prizePoolBps / 100}%):</span>
                <span className="text-white font-semibold">{distribution?.prize.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                <span className="text-green-400">Charity ({room.charityBps / 100}%):</span>
                <span className="text-green-400 font-semibold">{distribution?.charityFromFees.toFixed(3)} SOL</span>
              </div>
              {distribution && distribution.extras > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-400">+ Player Extras:</span>
                  <span className="text-yellow-400 font-semibold">{distribution.extras.toFixed(3)} SOL</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
                <span className="text-green-400 font-bold">Total to Charity:</span>
                <span className="text-green-400 font-bold">{distribution?.charityTotal.toFixed(3)} SOL</span>
              </div>
            </div>
          </div>

          {/* Charity Info */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Charity</h3>
            <p className="text-gray-400 text-sm">Wallet Address:</p>
            <p className="text-white font-mono text-sm break-all">{room.charityWallet.toBase58()}</p>
            {room.charityMemo && (
              <>
                <p className="text-gray-400 text-sm mt-3">Memo:</p>
                <p className="text-white text-sm">{room.charityMemo}</p>
              </>
            )}
          </div>

          {/* Player List */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Players ({players.length})
            </h3>
            {players.length === 0 ? (
              <p className="text-gray-400">No players yet. Be the first to join!</p>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => {
                  const isCurrentUser = publicKey && player.player.equals(publicKey);
                  const isWinner = room.winners.some(w => w && w.equals(player.player));
                  const isSelected = selectedWinners.some(w => w.equals(player.player));

                  return (
                    <div
                      key={player.player.toBase58()}
                      className={`p-4 rounded-lg border ${
                        isCurrentUser
                          ? 'bg-purple-600/20 border-purple-500'
                          : isWinner
                          ? 'bg-green-600/20 border-green-500'
                          : isSelected
                          ? 'bg-yellow-600/20 border-yellow-500'
                          : 'bg-white/10 border-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-semibold">
                            Player {index + 1}
                            {isCurrentUser && <span className="ml-2 text-purple-400">(You)</span>}
                            {isWinner && <span className="ml-2 text-green-400">(Winner)</span>}
                          </p>
                          <p className="text-gray-400 text-sm font-mono">
                            {player.player.toBase58().slice(0, 8)}...{player.player.toBase58().slice(-8)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm">
                            {(player.totalPaid.toNumber() / 1_000_000_000).toFixed(3)} SOL
                          </p>
                          {player.extrasPaid.gt(new BN(0)) && (
                            <p className="text-yellow-400 text-xs">
                              +{(player.extrasPaid.toNumber() / 1_000_000_000).toFixed(3)} extras
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Winner Selection (host only, game ended, winners not declared yet) */}
                      {isHost && room.ended && room.winners.every(w => w === null) && (
                        <button
                          onClick={() => toggleWinnerSelection(player.player)}
                          className={`mt-2 w-full px-4 py-2 rounded-lg font-semibold transition ${
                            isSelected
                              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          {isSelected ? `Selected (#${selectedWinners.findIndex(w => w.equals(player.player)) + 1})` : 'Select as Winner'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="space-y-6">
          {/* Join Room (non-host, not joined, not ended) */}
          {!isHost && !hasJoined && !room.ended && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Join Room</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Entry Fee</label>
                  <input
                    type="text"
                    value={(room.entryFee.toNumber() / 1_000_000_000).toFixed(3) + ' SOL'}
                    disabled
                    className="w-full px-4 py-2 bg-white/20 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Extra Tip (optional)
                    <span className="text-yellow-400 ml-1">→ 100% to charity</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={extrasAmount}
                    onChange={(e) => setExtrasAmount(e.target.value)}
                    placeholder="0.000"
                    className="w-full px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={joining || !connected || room.playerCount >= room.maxPlayers}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
                >
                  {joining ? 'Joining...' : !connected ? 'Connect Wallet' : room.playerCount >= room.maxPlayers ? 'Room Full' : 'Join Room'}
                </button>
              </div>
            </div>
          )}

          {/* Already Joined */}
          {hasJoined && !room.ended && (
            <div className="bg-green-600/20 border border-green-500 rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-400 mb-2">You're In!</h3>
              <p className="text-gray-300 text-sm">Waiting for the game to start...</p>
            </div>
          )}

          {/* Declare Winners (host only, ended, not declared) */}
          {isHost && room.ended && room.winners.every(w => w === null) && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Declare Winners</h3>
              <p className="text-gray-400 text-sm mb-4">
                Select 1-3 winners from the player list below. Selected: {selectedWinners.length}/3
              </p>
              <button
                onClick={handleDeclareWinners}
                disabled={declaring || selectedWinners.length === 0}
                className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                {declaring ? 'Declaring...' : `Declare ${selectedWinners.length} Winner${selectedWinners.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* Winners Declared */}
          {room.winners.some(w => w !== null) && (
            <div className="bg-green-600/20 border border-green-500 rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-400 mb-4">Winners</h3>
              <div className="space-y-2">
                {room.winners
                  .filter((w): w is PublicKey => w !== null)
                  .map((winner, index) => (
                    <div key={winner.toBase58()} className="text-white text-sm">
                      <span className="font-bold">#{index + 1}:</span>{' '}
                      <span className="font-mono">
                        {winner.toBase58().slice(0, 8)}...{winner.toBase58().slice(-8)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* End Room (host only, winners declared, not ended) */}
          {isHost && room.winners.some(w => w !== null) && !room.ended && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">End Room</h3>
              <p className="text-gray-400 text-sm mb-4">
                Distribute funds to winners, charity, platform, and host according to the fee structure.
              </p>
              <button
                onClick={handleEndRoom}
                disabled={ending}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                {ending ? 'Ending...' : 'End Room & Distribute Funds'}
              </button>
            </div>
          )}

          {/* Game Ended */}
          {room.ended && (
            <div className="bg-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-300 mb-2">Game Over</h3>
              <p className="text-gray-400 text-sm">This room has ended and funds have been distributed.</p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
              >
                Back to Home
              </button>
            </div>
          )}

          {/* WebSocket Game Status */}
          {roomState && !room.ended && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Game Lobby</h3>
              <p className="text-gray-400 text-sm mb-4">
                {roomState.players.length} players in lobby
              </p>
              <button
                onClick={() => toggleReady(roomId!)}
                className="w-full mb-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Toggle Ready
              </button>
              {isHost && (
                <button
                  onClick={() => startGame(roomId!)}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                >
                  Start Game
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
