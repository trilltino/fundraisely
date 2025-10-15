/**
 * Home Page Component - Room Listing
 *
 * Main entry point displaying all available fundraising rooms from the Solana blockchain.
 * Fetches room data using program.account.room.all(), provides filtering by status (Active/Ended),
 * search by room ID, and navigation to room details or creation flow. Implements real-time
 * blockchain queries with loading states and error handling. Features responsive room cards
 * showing entry fee, player count, charity info, and join/view actions.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { WalletButton } from '@/components/Wallet/WalletButton';
import { useFundraiselyContract } from '@/chains/solana/useFundraiselyContract';
import type { Room } from '@/types/program.types';
import { BN } from '@coral-xyz/anchor';

interface RoomWithPubkey {
  publicKey: PublicKey;
  account: Room;
}

type FilterType = 'all' | 'active' | 'ended';

export default function HomePage() {
  const { connected } = useWallet();
  const { program } = useFundraiselyContract();

  const [rooms, setRooms] = useState<RoomWithPubkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all rooms from blockchain
  useEffect(() => {
    if (!program) {
      setLoading(false);
      return;
    }

    async function fetchRooms() {
      try {
        setLoading(true);
        setError(null);

        console.log('[HomePage] Fetching all rooms from blockchain...');

        // TypeScript doesn't recognize the null check outside the async function
        if (!program) {
          throw new Error('Program not available');
        }

        // Use type assertion for Anchor program account access
        const allRooms = await (program.account as any).room.all();

        console.log(`[HomePage] Fetched ${allRooms.length} rooms`);
        setRooms(allRooms);
      } catch (err) {
        console.error('[HomePage] Failed to fetch rooms:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, [program]);

  // Filter and search rooms
  const filteredRooms = rooms.filter((room) => {
    // Filter by status
    if (filter === 'active' && room.account.ended) return false;
    if (filter === 'ended' && !room.account.ended) return false;

    // Search by room ID
    if (searchQuery.trim()) {
      return room.account.roomId.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white">Fundraisely</h1>
          <p className="text-gray-400 mt-2">Blockchain-Powered Fundraising Games</p>
        </div>
        <WalletButton />
      </header>

      {/* Actions Bar */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All Rooms
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'active'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'ended'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Ended
          </button>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by room ID..."
            className="flex-1 md:w-64 px-4 py-2 bg-white/20 border border-gray-300 rounded-lg text-white placeholder-gray-400"
          />
          <Link
            to="/create"
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition whitespace-nowrap"
          >
            Create Room
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Not Connected State */}
      {!connected && (
        <div className="mb-8 p-6 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-200 text-center">
          <p className="text-lg font-semibold mb-2">Connect your wallet to view rooms</p>
          <p className="text-sm">Click the "Select Wallet" button in the top right to get started</p>
        </div>
      )}

      {/* No Program State */}
      {connected && !program && !loading && (
        <div className="mb-8 p-6 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-200 text-center">
          <p className="text-lg font-semibold mb-2">Smart contract not available</p>
          <p className="text-sm">The Fundraisely program may not be deployed yet</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400">Loading rooms from blockchain...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && connected && program && filteredRooms.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-2xl font-semibold text-white mb-2">
            {searchQuery ? 'No rooms found' : 'No rooms yet'}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchQuery
              ? `No rooms match "${searchQuery}"`
              : 'Be the first to create a fundraising room!'}
          </p>
          {!searchQuery && (
            <Link
              to="/create"
              className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
            >
              Create First Room
            </Link>
          )}
        </div>
      )}

      {/* Room Grid */}
      {!loading && filteredRooms.length > 0 && (
        <>
          <div className="mb-4 text-gray-400">
            Showing {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.publicKey.toBase58()}
                room={room.account}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Room Card Component
 * Displays individual room information with join/view actions
 */
function RoomCard({ room }: { room: Room }) {
  const { publicKey } = useWallet();

  // Convert lamports to SOL for display
  const entryFeeSol = room.entryFee.toNumber() / 1_000_000_000;
  const totalCollectedSol = room.totalCollected.toNumber() / 1_000_000_000;

  // Check if current user is the host
  const isHost = publicKey && room.host.equals(publicKey);

  // Truncate public keys for display
  const truncateAddress = (address: PublicKey) => {
    const str = address.toBase58();
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition">
      {/* Room Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{room.roomId}</h3>
          <p className="text-sm text-gray-400">
            Host: {truncateAddress(room.host)}
            {isHost && <span className="ml-2 text-purple-400">(You)</span>}
          </p>
        </div>

        {/* Status Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            room.ended
              ? 'bg-gray-700 text-gray-300'
              : 'bg-green-600 text-white'
          }`}
        >
          {room.ended ? 'Ended' : 'Active'}
        </span>
      </div>

      {/* Room Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Entry Fee:</span>
          <span className="text-white font-semibold">{entryFeeSol.toFixed(3)} SOL</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Players:</span>
          <span className="text-white font-semibold">
            {room.playerCount} / {room.maxPlayers}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Prize Pool:</span>
          <span className="text-white font-semibold">{totalCollectedSol.toFixed(3)} SOL</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Charity:</span>
          <span className="text-green-400 font-semibold">{room.charityBps / 100}%</span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400">Charity Wallet:</div>
          <div className="text-xs text-gray-300 font-mono">
            {truncateAddress(room.charityWallet)}
          </div>
        </div>
      </div>

      {/* Extras Info */}
      {room.totalExtrasFees.gt(new BN(0)) && (
        <div className="mb-4 p-2 bg-yellow-500/20 border border-yellow-500 rounded text-xs text-yellow-200">
          + {(room.totalExtrasFees.toNumber() / 1_000_000_000).toFixed(3)} SOL extras to charity
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          to={`/room/${room.roomId}`}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-center font-semibold rounded-lg transition"
        >
          {isHost ? 'Manage' : 'View Details'}
        </Link>

        {!room.ended && room.playerCount < room.maxPlayers && !isHost && (
          <Link
            to={`/room/${room.roomId}?join=true`}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-center font-semibold rounded-lg transition"
          >
            Join Room
          </Link>
        )}

        {room.ended && (
          <div className="flex-1 px-4 py-2 bg-gray-700 text-gray-400 text-center font-semibold rounded-lg cursor-not-allowed">
            Game Over
          </div>
        )}
      </div>

      {/* Full Room Notice */}
      {!room.ended && room.playerCount >= room.maxPlayers && (
        <div className="mt-2 text-center text-xs text-gray-400">
          Room is full
        </div>
      )}
    </div>
  );
}
