/**
 * Join Quiz Modal - Multi-Step Player Registration Wizard
 *
 * **Purpose:** Modal component allowing players to join existing quiz rooms. Handles room
 * verification, player name collection, and routes to appropriate payment flow (Web2/Web3).
 * Triggered from landing page "Join Quiz" button or `/join/:roomId` direct links.
 *
 * **Key Features:**
 * 1. **Room Verification**: Validates roomId exists before allowing join
 * 2. **Payment Method Detection**: Routes to Web3 payment or direct join based on room config
 * 3. **Player ID Generation**: Creates unique playerId for session tracking
 * 4. **Socket Integration**: Emits join events to server after verification
 * 5. **Navigation**: Redirects to game page after successful join
 *
 * **Join Flow:**
 *
 * **Web2 (cash/revolut):**
 * ```
 * Player enters roomId + name
 *   ↓
 * Click "Continue" → handleVerifyRoom()
 *   ↓
 * socket.emit('verify_quiz_room', { roomId })
 *   ↓
 * Server responds: { exists: true, config: {...} }
 *   ↓
 * Check config.paymentMethod === 'cash_or_revolut'
 *   ↓
 * handleDirectJoin() → socket.emit('join_quiz_room')
 *   ↓
 * Save playerId to localStorage
 *   ↓
 * Navigate to /quiz/game/{roomId}/{playerId}
 * ```
 *
 * **Web3 (blockchain):**
 * ```
 * Player enters roomId + name
 *   ↓
 * Click "Continue" → handleVerifyRoom()
 *   ↓
 * socket.emit('verify_quiz_room', { roomId })
 *   ↓
 * Server responds: { exists: true, config: { paymentMethod: 'web3', ... } }
 *   ↓
 * Check config.paymentMethod === 'web3'
 *   ↓
 * setCurrentStep('payment') → Show Web3PaymentStep
 *   ↓
 * Player connects wallet, pays entry fee on-chain
 *   ↓
 * After tx confirmed → Navigate to /quiz/game/{roomId}/{playerId}
 * ```
 *
 * **Multi-Step Navigation:**
 * Component manages 3 possible steps (though 'extras' not currently used):
 * - **'details'**: Room ID + player name entry (default step)
 * - **'extras'**: Fundraising extras selection (future feature, currently skipped)
 * - **'payment'**: Web3 payment processing (Web3PaymentStep component)
 *
 * **Room Verification:**
 * `verify_quiz_room` socket event checks:
 * - Room exists in server memory
 * - Room not ended/cancelled
 * - Returns room config (payment method, entry fee, extras, etc.)
 *
 * **Player ID Generation:**
 * ```typescript
 * const playerId = nanoid(); // 8-character unique ID (e.g., "v1StGXR8")
 * ```
 *
 * **Why nanoid:**
 * - **Collision-resistant**: Billions of IDs before 1% collision probability
 * - **URL-safe**: Only alphanumeric characters (no special chars)
 * - **Compact**: 8 chars vs. 36 chars for UUID
 * - **Fast**: 2x faster than UUID generation
 *
 * **State Management:**
 * - Local: `currentStep`, `roomId`, `playerName`, `roomConfig`, `selectedExtras`, `error`, `loading`
 * - Session: `localStorage.quizPlayerId:{roomId}` (for reconnection)
 *
 * **Error Handling:**
 * - **Empty fields**: "Please enter both room ID and name."
 * - **Socket disconnected**: "Socket not connected. Please refresh the page."
 * - **Room not found**: "Room not found."
 * - **Join failed**: "Failed to join room"
 *
 * **Direct Join (Web2) Details:**
 * ```typescript
 * socket.emit('join_quiz_room', {
 *   roomId,
 *   user: {
 *     id: playerId,
 *     name: playerName,
 *     paid: false, // Payment verified later by host
 *     paymentMethod: roomConfig?.paymentMethod || 'cash',
 *     extras: selectedExtras, // Fundraising extras player wants to buy
 *   },
 *   role: 'player',
 * });
 * ```
 *
 * **Web3 Payment Step:**
 * When `config.paymentMethod === 'web3'`, modal renders Web3PaymentStep with props:
 * - `roomId`: Room to join
 * - `playerName`: Player's display name
 * - `roomConfig`: Full room configuration (entry fee, charity address, etc.)
 * - `selectedExtras`: Fundraising extras to purchase
 * - `onBack`: Return to 'details' step
 * - `onClose`: Close entire modal
 *
 * **localStorage Persistence:**
 * After successful join:
 * ```typescript
 * localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
 * ```
 *
 * **Why Save PlayerId:**
 * - **Reconnection**: If player refreshes during quiz, can rejoin with same ID
 * - **Score tracking**: Server associates answers with playerId
 * - **Payment verification**: Links player to payment record
 *
 * **Integration:**
 * - Parent: Landing page, Join page (/join/:roomId)
 * - WebSocket: useQuizSocket → 'verify_quiz_room', 'join_quiz_room'
 * - Navigation: React Router → `/quiz/game/{roomId}/{playerId}`
 * - Sub-component: Web3PaymentStep (for blockchain payment)
 *
 * **Future Enhancements:**
 * - Step 2: Fundraising extras selection (allow players to pre-purchase extras)
 * - Email/SMS confirmation after join
 * - Team assignment (for team-based quizzes)
 * - Avatar selection
 * - Preview quiz info before joining
 *
 * @component
 * @category Quiz Join Flow
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useQuizSocket } from '../useQuizSocket';
import { Web3PaymentStep } from './Web3PaymentStep';
import type { QuizConfig } from '../../../types/quiz';

interface Props {
  onClose: () => void;
}

type JoinStep = 'details' | 'extras' | 'payment';

const JoinQuizModal: React.FC<Props> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState<JoinStep>('details');
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomConfig, setRoomConfig] = useState<QuizConfig | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const socket = useQuizSocket();
  const navigate = useNavigate();

  // Verify room and get config
  const handleVerifyRoom = () => {
    if (!roomId || !playerName) {
      setError('Please enter both room ID and name.');
      return;
    }

    if (!socket || !socket.connected) {
      setError('Socket not connected. Please refresh the page.');
      return;
    }

    setError('');
    setLoading(true);
    console.log('[JoinQuizModal] Verifying room ID:', roomId);

    socket.emit('verify_quiz_room', { roomId });

    socket.once('quiz_room_verification_result', (data: any) => {
      console.log('[JoinQuizModal] Received room verification:', data);

      if (!data.exists) {
        setError('Room not found.');
        setLoading(false);
        return;
      }

      // Store room config
      setRoomConfig(data.config || data);
      setLoading(false);

      // If web3 payment, show payment step
      if (data.config?.paymentMethod === 'web3' || data.paymentMethod === 'web3') {
        setCurrentStep('payment');
      } else {
        // For cash/revolut, join directly
        handleDirectJoin();
      }
    });

    socket.once('quiz_error', (errorData: any) => {
      console.error('[JoinQuizModal] Verification error:', errorData);
      setError(errorData.message || 'Failed to verify room');
      setLoading(false);
    });
  };

  // Direct join for cash/revolut payment
  const handleDirectJoin = () => {
    if (!socket || !roomId || !playerName) return;

    const playerId = nanoid();

    console.log('[JoinQuizModal] Joining room with player:', { roomId, playerId, playerName });

    socket.emit('join_quiz_room', {
      roomId,
      user: {
        id: playerId,
        name: playerName,
        paid: false,
        paymentMethod: roomConfig?.paymentMethod || 'cash',
        extras: selectedExtras,
      },
      role: 'player',
    });

    socket.once('quiz_player_joined', (joinData: any) => {
      console.log('[JoinQuizModal] Successfully joined room:', joinData);
      localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
      navigate(`/quiz/game/${roomId}/${playerId}`);
      onClose();
    });

    socket.once('quiz_error', (errorData: any) => {
      console.error('[JoinQuizModal] Join error:', errorData);
      setError(errorData.message || 'Failed to join room');
    });
  };

  const handleBack = () => {
    setCurrentStep('details');
    setError('');
  };


  // Show Web3 payment step if needed
  if (currentStep === 'payment' && roomConfig) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl overflow-hidden">
          <Web3PaymentStep
            roomId={roomId}
            playerName={playerName}
            roomConfig={roomConfig}
            selectedExtras={selectedExtras}
            onBack={handleBack}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  // Default step: enter room details
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl max-w-sm w-full shadow-xl relative">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Join a Quiz</h2>

        <label className="block mb-2 text-sm font-medium text-gray-700">Room ID</label>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.trim())}
          className="w-full mb-4 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          placeholder="Enter Room Code"
        />

        <label className="block mb-2 text-sm font-medium text-gray-700">Your Name</label>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full mb-4 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
          placeholder="Enter Your Name"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {loading && <p className="text-sm text-gray-600 mb-2">Checking room...</p>}

        <div className="flex justify-between mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleVerifyRoom}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
            disabled={loading || !roomId || !playerName}
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinQuizModal;
