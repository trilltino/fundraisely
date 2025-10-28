/**
 * TESTCAMPAIGN.TSX - Bingo Blitz Test Campaign Page
 *
 * This is the dedicated test campaign page for "Bingo Blitz: Solana Edition", serving as a
 * demonstration environment where users can create or join Bingo game rooms powered by Solana
 * blockchain. This page provides a simplified, focused experience separate from the main landing
 * page, specifically designed for testing and showcasing the platform's core Bingo functionality.
 *
 * ROLE IN THE APPLICATION:
 * - Serves as the entry point for the Bingo Blitz test campaign (/BingoBlitz route)
 * - Provides dual functionality: hosts can create rooms, players can join existing rooms
 * - Acts as a production-ready demo environment for potential investors and early adopters
 * - Bridges the gap between marketing (landing page) and actual gameplay (game page)
 * - Demonstrates Solana blockchain integration in a real-world use case
 *
 * KEY FEATURES:
 * 1. Room Creation (Host Flow):
 *    - Auto-generates 6-character alphanumeric room codes
 *    - Accepts entry fee configuration in SOL
 *    - Requires Solana wallet connection
 *    - Stores room creation data to localStorage for persistence
 *    - Navigates to /game/:roomId with host privileges
 *
 * 2. Room Joining (Player Flow):
 *    - Verifies room existence via WebSocket backend
 *    - Validates smart contract address from blockchain
 *    - Currently uses demo transaction mode (TODO: full payment integration)
 *    - Stores room joining data to localStorage
 *    - Navigates to /game/:roomId as participant
 *
 * 3. Real-Time Socket Integration:
 *    - Establishes Socket.IO connection on component mount
 *    - Listens for connection, disconnection, and error events
 *    - Maintains socket connection throughout room setup
 *    - Disconnects socket on component unmount to prevent memory leaks
 *
 * 4. State Management:
 *    - Manages room creation/joining UI states (loading, errors)
 *    - Syncs with Zustand gameStore for player name persistence
 *    - Performs aggressive localStorage cleanup on mount
 *    - Handles wallet connection state via Solana wallet adapter
 *
 * BLOCKCHAIN INTEGRATION:
 * - Uses Solana blockchain exclusively (chain ID: 0)
 * - Namespace: 'solana' for all transactions
 * - Room verification checks on-chain contract existence
 * - Payment proof stored as JSON with roomId, wallet address, and transaction hash
 * - TODO: Full Solana transaction integration for entry fee payment
 *
 * PAGE STRUCTURE:
 * 1. SimpleHeader - Minimal navigation for focused experience
 * 2. Action Cards Section:
 *    - CreateRoomCard - Host setup with entry fee and room ID
 *    - JoinRoomCard - Player join with room code verification
 * 3. Campaign Info Section - Educational content about the platform
 * 4. Hfooter - Footer with additional links
 *
 * ERROR HANDLING:
 * - Validates localStorage availability before room operations
 * - Displays user-friendly error messages for room verification failures
 * - Handles socket connection errors gracefully
 * - Prevents navigation if data persistence fails
 *
 * DEPENDENCIES:
 * - Socket.IO client for real-time communication
 * - React Router for navigation
 * - Zustand gameStore for state management
 * - Solana wallet adapter for blockchain connectivity
 * - Custom hooks (useRoomVerification) for blockchain validation
 * - localStorage utilities for data persistence
 *
 * USAGE:
 * Accessed via /BingoBlitz route, typically from the landing page's featured campaign section.
 * Users must connect their Solana wallet (Phantom, Solflare) before creating or joining rooms.
 */

// src/pages/TestCampaign.tsx - Solana-only version
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRoomVerification } from '../hooks/useRoomVerification';
import { storageService } from '../services/storageService';
import {
  isLocalStorageAvailable,
  saveRoomCreationData,
  saveRoomJoiningData,
  clearAllRoomData,
} from '../utils/localStorageUtils';
import SimpleHeader from '../components/layout/SimpleHeader';
import CreateRoomCard from '../components/bingo/cards/CreateRoomCard';
import JoinRoomCard from '../components/bingo/cards/JoinRoomCard';
import Hfooter from '../components/layout/Footer';

// Initialize Socket.IO client
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL, { autoConnect: false });

export function TestCampaign() {
  console.log('[TestCampaign] [LAUNCH] Rendering TestCampaign component');

  const [isGenerating, setIsGenerating] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [roomId, setRoomId] = useState('');

  const navigate = useNavigate();
  const { setPlayerName, resetGameState } = useGameStore((state) => ({
    setPlayerName: state.setPlayerName,
    resetGameState: state.resetGameState,
  }));

  const { publicKey } = useWallet();

  const {
    verifyRoom,
    status: roomVerificationStatus,
    error: roomVerificationError,
  } = useRoomVerification();

  // Socket event listeners
  useEffect(() => {
    console.log('[TestCampaign]  Setting up socket event listeners');

    const handleConnect = () => {
      console.log('[TestCampaign] [COMPLETE] Socket connected');
    };

    const handleDisconnect = (reason: string) => {
      console.error('[TestCampaign]  Socket disconnected', { reason });
    };

    const handleError = (error: any) => {
      console.error('[TestCampaign] [ERROR] Socket error', { error });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);

    return () => {
      console.log('[TestCampaign]  Cleaning up socket event listeners');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
    };
  }, []);

  useEffect(() => {
    console.log('[TestCampaign]  Initializing component');
    resetGameState();
    clearAllRoomData();

    try {
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('@appkit/portfolio_cache');
      console.log('[TestCampaign] [COMPLETE] Cleared localStorage items');
    } catch (e) {
      console.error('[TestCampaign] [ERROR] Error cleaning up storage', e);
    }

    // Generate random roomId
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(result);
    console.log('[TestCampaign] 🆕 Generated roomId', { roomId: result });

    socket.connect();
    console.log('[TestCampaign]  Socket connecting');

    return () => {
      console.log('[TestCampaign]  Disconnecting socket on cleanup');
      socket.disconnect();
    };
  }, [resetGameState]);

  const handleCreateRoom = async (roomData: {
    playerName: string;
    entryFee: string;
    walletAddress: string;
    roomId: string;
  }) => {
    console.log('[TestCampaign] [LAUNCH] handleCreateRoom called', { roomData });

    if (!isLocalStorageAvailable()) {
      console.error('[TestCampaign]  Local storage unavailable');
      alert("Your browser's local storage is not available. Please enable cookies or try a different browser.");
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    setPlayerName(roomData.playerName);
    clearAllRoomData();

    const roomCreationData = {
      isCreator: true as const,
      playerName: roomData.playerName,
      roomId: roomData.roomId,
      entryFee: roomData.entryFee,
      chain: 0, // Solana
      contractAddress: '', // Will be set by backend
      walletAddress: roomData.walletAddress,
      namespace: 'solana' as const,
    };

    console.log('[TestCampaign]  Saving roomCreationData', roomCreationData);
    const saved = saveRoomCreationData(roomCreationData);
    if (!saved) {
      console.error('[TestCampaign] [ERROR] Failed to save roomCreationData');
      alert('There was a problem storing room creation data.');
      setIsGenerating(false);
      return;
    }

    // Store playerName and walletAddress for rejoin using storageService
    storageService.setPlayerName(roomData.playerName);
    storageService.setWalletAddress(roomData.walletAddress);

    console.log('[TestCampaign] ️ Navigating to game', { roomId: roomData.roomId });
    navigate(`/game/${roomData.roomId}`);
  };

  const handleJoinRoom = async (roomData: { playerName: string; roomCode: string }) => {
    console.log('[TestCampaign] [LAUNCH] handleJoinRoom called', { roomData });
    setJoinError('');

    try {
      console.log('[TestCampaign] [SEARCH] Verifying room', { roomCode: roomData.roomCode });
      setJoinError('Verifying room exists...');
      const { exists, contractAddress } = await verifyRoom(roomData.roomCode.toUpperCase());

      if (!exists) {
        console.error('[TestCampaign]  Room does not exist', { roomCode: roomData.roomCode });
        setJoinError(roomVerificationError || 'Room does not exist. Please check the room code.');
        return;
      }

      if (!contractAddress) {
        console.error('[TestCampaign]  Invalid room configuration', { contractAddress });
        setJoinError('Room configuration invalid.');
        return;
      }

      console.log('[TestCampaign] [COMPLETE] Room verified', { contractAddress });

      // For demo purposes, we'll skip actual Solana payment and just join
      // TODO: Add actual Solana payment integration here
      proceedToJoinRoom(roomData, 'demo-tx', contractAddress);
    } catch (error) {
      console.error('[TestCampaign] [ERROR] Join error', error);
      setJoinError(error instanceof Error ? error.message : 'Failed to join room');
    }
  };

  const proceedToJoinRoom = (
    roomData: { playerName: string; roomCode: string },
    txHash: string,
    contractAddress: string
  ) => {
    console.log('[TestCampaign] [LAUNCH] proceedToJoinRoom called', {
      roomData,
      txHash,
      contractAddress,
    });
    setPlayerName(roomData.playerName);
    clearAllRoomData();

    const walletAddress = publicKey?.toBase58() || '';

    const roomJoiningData = {
      isCreator: false,
      playerName: roomData.playerName,
      roomId: roomData.roomCode.toUpperCase(),
      walletAddress,
      contractAddress,
      chain: 0, // Solana
      namespace: 'solana' as const,
      entryFee: '0', // TODO: Get from room data
    };

    console.log('[TestCampaign]  Saving roomJoiningData', roomJoiningData);
    saveRoomJoiningData(roomJoiningData);

    // Store playerName for socket initialization using storageService
    storageService.setPlayerName(roomData.playerName);

    console.log('[TestCampaign]  Saving paymentProof', {
      roomId: roomData.roomCode.toUpperCase(),
      walletAddress,
      txHash,
    });
    localStorage.setItem(
      'paymentProof',
      JSON.stringify({
        roomId: roomData.roomCode.toUpperCase(),
        address: walletAddress,
        txHash: txHash,
      })
    );

    console.log('[TestCampaign] ️ Navigating to game', { roomId: roomData.roomCode.toUpperCase() });
    navigate(`/game/${roomData.roomCode.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <SimpleHeader />

      {/* Action Cards Section */}
      <section className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-8 text-indigo-900">Bingo Blitz: Solana Edition</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Create Room Card */}
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-indigo-800">Create Bingo Blitz Room</h3>
              <CreateRoomCard
                onCreateRoom={handleCreateRoom}
                isGenerating={isGenerating}
                roomId={roomId}
              />
            </div>

            {/* Join Room Card */}
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-indigo-800">Join Bingo Blitz Room</h3>
              <JoinRoomCard
                onJoinRoom={handleJoinRoom}
                paymentStatus="idle"
                roomVerificationStatus={roomVerificationStatus}
                paymentError={joinError}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Campaign Info Section */}
      <section id="about-campaign" className="py-12 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-8 text-indigo-900">About This Campaign</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-6">
              <p className="text-xl font-semibold text-indigo-800 mb-4">
                Welcome to the <span className="font-bold">Fundraisely Test Drive!</span> [LAUNCH][SUCCESS]
              </p>
              <p className="text-lg text-gray-700 mb-4">
                We've built a Web3 bingo game where <em>anyone</em> can host, <em>everyone</em> can play, and fundraising meets fun on Solana blockchain.
              </p>
            </div>

            <div className="mb-6">
              <p className="text-lg font-semibold text-indigo-700 mb-2">Here's the deal:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Built on Solana for fast, cheap transactions.</li>
                <li>Every game = one bingo card, one shot at winning, tons of fun.</li>
                <li>Transparent, fair, and blockchain-verified.</li>
              </ul>
            </div>

            <div className="mb-6">
              <p className="text-lg font-semibold text-indigo-700 mb-2">When you host a game:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Set your own card price in SOL </li>
                <li>Connect your Solana wallet </li>
                <li>Confirm the transaction [COMPLETE]</li>
                <li>Get a room number to share with players.</li>
              </ul>
              <p className="text-lg text-indigo-600 font-medium mt-2">
                [FAST] Rooms are created instantly — no waiting around.
              </p>
            </div>

            <div className="mb-4">
              <p className="text-lg font-semibold text-indigo-700 mb-2">
                <span className="font-bold">Zero cheating. Zero shady stuff.</span>
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Numbers are drawn by the system.</li>
                <li>The host <em>calls out</em> numbers, but the system auto-checks wins behind the scenes.</li>
                <li>Payouts happen automatically when the game's done.</li>
              </ul>
            </div>

            <p className="text-lg text-indigo-800 font-medium mt-6">
              All you need is a little SOL and a Phantom or Solflare wallet. Let's go! [FINISH]
            </p>
          </div>
        </div>
      </section>

      <Hfooter />
    </div>
  );
}
