/**
 * JOINROOMCARD.TSX - Bingo Room Joining Form Component
 *
 * This component provides the user interface for players to join existing Bingo game rooms. It handles
 * wallet connection, room verification, entry fee display, payment processing, and navigation to the
 * game room. It serves as the primary player onboarding interface, complementing the CreateRoomCard
 * for a complete game room setup flow.
 *
 * ROLE IN THE APPLICATION:
 * - Primary UI for joining existing Bingo rooms (player workflow)
 * - Handles Solana wallet connection for payment
 * - Collects player name and room code inputs
 * - Verifies room existence via backend API
 * - Displays room details (entry fee, contract address)
 * - Triggers VerifyRoomModal for payment confirmation
 * - Persists joining data to localStorage
 * - Navigates to game page upon successful join
 *
 * USER FLOW:
 * 1. Player visits TestCampaign page (Bingo Blitz)
 * 2. Sees JoinRoomCard with wallet connection prompt
 * 3. Clicks WalletMultiButton to connect Solana wallet
 * 4. Enters player name (max 20 characters)
 * 5. Enters 6-character room code (auto-uppercased)
 * 6. Clicks "Verify Room" button
 * 7. System checks room existence via useRoomVerification hook
 * 8. VerifyRoomModal appears showing room details and entry fee
 * 9. Player confirms payment via modal
 * 10. Room joining data saved to localStorage
 * 11. Navigates to /game/:roomId as player
 *
 * FORM FIELDS:
 * 1. Player Name Input:
 *    - Text input with Users icon
 *    - Max length 20 characters
 *    - Required field
 *    - Placeholder: "Enter Your Name"
 *
 * 2. Room Code Input:
 *    - Text input with Dices icon
 *    - Max length 6 characters
 *    - Auto-converts to uppercase
 *    - Required field
 *    - Placeholder: "Enter Event Code"
 *
 * WALLET INTEGRATION:
 * - Uses @solana/wallet-adapter-react
 * - WalletMultiButton for wallet selection and connection
 * - Displays connected status with truncated address
 * - Shows network (Solana Devnet)
 * - Blocks room joining until wallet connected
 * - Formats address as XXXX...XXXX for display
 *
 * ROOM VERIFICATION:
 * - Uses useRoomVerification custom hook
 * - Calls verifyRoom(roomCode) on button click
 * - Checks if room exists in backend database
 * - Retrieves: exists (boolean), contractAddress, entryFee
 * - Displays error if room not found or invalid
 * - Sets verifiedRoomData for VerifyRoomModal
 * - Opens modal upon successful verification
 *
 * VERIFICATION MODAL FLOW:
 * - VerifyRoomModal displays:
 *   - Host name (currently hardcoded as "Host")
 *   - Entry fee in SOL
 *   - Contract address (truncated)
 * - Player reviews details
 * - onConfirm: Triggers handleJoinRoom flow
 * - onClose: Dismisses modal without action
 *
 * JOIN CONFIRMATION FLOW:
 * Modal onConfirm callback:
 * 1. Close modal
 * 2. Call onJoinRoom({ playerName, roomCode }) to parent
 * 3. Save room joining data to localStorage
 * 4. Set hasJoined = true (hides verify button)
 * 5. Parent navigates to /game/:roomId
 *
 * LOCAL STORAGE PERSISTENCE:
 * Saved data structure (saveRoomJoiningData):
 * - isCreator: false (identifies as player, not host)
 * - playerName: Player's entered name
 * - roomId: Room code (uppercased)
 * - walletAddress: Formatted address (XXXX...XXXX)
 * - contractAddress: Solana program address
 * - chain: 0 (Solana identifier)
 * - namespace: 'solana'
 * - entryFee: Entry fee in SOL
 *
 * This enables:
 * - Page refresh resilience
 * - Reconnection to room after disconnect
 * - Player identification on rejoin
 *
 * ERROR HANDLING:
 * - Form validation: Checks name and room code not empty
 * - Wallet check: Ensures wallet connected before verification
 * - Room verification errors: Caught and displayed to user
 * - Payment errors: Displayed via paymentError prop
 * - Join errors: Displayed in red alert box
 *
 * ERROR MESSAGES:
 * - "Please enter a name and room code" (validation)
 * - "Please connect your wallet first" (wallet required)
 * - "Room not found or invalid" (verification failed)
 * - "Verification failed. Please try again." (catch-all error)
 *
 * BUTTON STATES:
 * - "Verify Room" (default): Blue gradient, ready to check room
 * - Loading (spinner): During paymentStatus === 'pending'
 * - Hidden: After hasJoined === true (player joined)
 *
 * UI DESIGN:
 * - Elevated card with shadow and hover effects
 * - Gradient accent bar (green-500 to teal-500)
 * - Users icon in green circle at top
 * - "Join Bingo Event" heading
 * - WalletMultiButton prominently displayed
 * - Connected status badge (green) when wallet connected
 * - Form inputs with left-aligned icons
 * - Blue-indigo gradient button (distinct from create card)
 * - Info footer with payment method note
 *
 * VISUAL FEEDBACK:
 * - Hover: Card lifts slightly (translateY -1)
 * - Hover: Shadow intensifies (shadow-2xl)
 * - Input focus: Border changes to green-500, ring appears
 * - Auto-uppercase: Room code auto-formats as user types
 * - Loading: Animated spinning icon during verification
 * - Connected: Green badge shows wallet address and network
 * - Error: Red alert box with error message
 *
 * RESPONSIVE DESIGN:
 * - Full width on mobile
 * - Centered with max-width on larger screens
 * - Touch-friendly button and input sizes
 * - Wallet button scales appropriately
 *
 * PROP INTERFACE:
 * - onJoinRoom: Async callback with player data when join confirmed
 * - paymentStatus: Status of payment transaction (idle/pending/success)
 * - roomVerificationStatus: Status of room check (used for loading states)
 * - paymentError: Error message from payment processing
 *
 * STATE MANAGEMENT:
 * - joinName: Player name input value
 * - roomCode: Room code input value (auto-uppercased)
 * - joinError: Local error messages
 * - entryFee: Retrieved from room verification
 * - hasJoined: Tracks if player successfully joined
 * - verifiedRoomData: Data from successful verification
 * - isModalOpen: Controls VerifyRoomModal visibility
 *
 * ACCESSIBILITY:
 * - Semantic form element
 * - Button type="button" for clarity
 * - Clear placeholder text
 * - Visual icons reinforce purpose
 * - Error messages announced via red alert
 * - Disabled states not applicable (button always clickable when shown)
 *
 * DEPENDENCIES:
 * - React useState for local state
 * - @solana/wallet-adapter-react for wallet
 * - @solana/wallet-adapter-react-ui for WalletMultiButton
 * - lucide-react icons
 * - useRoomVerification custom hook
 * - VerifyRoomModal component
 * - localStorage utilities
 *
 * INTEGRATION:
 * - Used in TestCampaign.tsx alongside CreateRoomCard
 * - Receives onJoinRoom callback from parent
 * - Receives payment/verification status from parent
 * - Triggers navigation to Game.tsx upon success
 *
 * BLOCKCHAIN INTERACTION:
 * - Verifies room exists on-chain or in backend
 * - Retrieves smart contract address
 * - Entry fee denominated in SOL
 * - Payment processed via VerifyRoomModal confirmation
 * - Full transaction handling in parent/backend
 *
 * TODO ITEMS (noted in comments):
 * - Replace hardcoded "Host" with actual host name from backend
 * - Implement actual Solana payment transaction
 * - Add transaction confirmation UI
 * - Show transaction hash and Solana Explorer link
 *
 * FUTURE ENHANCEMENTS:
 * - Show room player count and max capacity
 * - Display estimated start time
 * - Add room preview (charity, prize pool, etc.)
 * - Show recent rooms joined by user
 * - Add QR code scanner for room codes
 * - Display gas fee estimates
 * - Add "spectator mode" option (watch without playing)
 */

// src/components/JoinRoomCard.tsx
import type React from 'react';
import { useState } from 'react';
import { Users, Dices, ArrowRight, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { saveRoomJoiningData } from '@/utils/localStorageUtils';
import VerifyRoomModal from '../modals/VerifyRoomModal';
import { useRoomVerification } from '@/hooks/useRoomVerification';

interface JoinRoomCardProps {
  onJoinRoom: (roomData: { playerName: string; roomCode: string }) => Promise<void>;
  paymentStatus: 'idle' | 'pending' | 'success';
  roomVerificationStatus: 'idle' | 'checking' | 'exists' | 'not_exists' | 'error';
  paymentError: string;
}

const JoinRoomCard: React.FC<JoinRoomCardProps> = ({
  onJoinRoom,
  paymentStatus,
  paymentError,
}) => {
  const [joinName, setJoinName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [entryFee, setEntryFee] = useState<string>('0');
  const [hasJoined, setHasJoined] = useState(false);
  const [verifiedRoomData, setVerifiedRoomData] = useState<{
    hostName: string;
    entryFee: string;
    contractAddress: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { publicKey, connected } = useWallet();
  const { verifyRoom } = useRoomVerification();

  const formattedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const handleVerifyRoom = async () => {
    console.log('[SEARCH] Verifying room:', roomCode);
    setJoinError('');

    if (!roomCode.trim() || !joinName.trim()) {
      setJoinError('Please enter a name and room code');
      return;
    }

    if (!connected) {
      setJoinError('Please connect your wallet first');
      return;
    }

    try {
      const { exists, contractAddress, entryFee } = await verifyRoom(roomCode.toUpperCase());

      if (!exists || !contractAddress) {
        setJoinError('Room not found or invalid');
        return;
      }

      setEntryFee(entryFee || '0');

      setVerifiedRoomData({
        hostName: 'Host',
        entryFee: entryFee || '0',
        contractAddress,
      });

      setIsModalOpen(true);
    } catch (err) {
      console.error('[ERROR] Room verification failed:', err);
      setJoinError('Verification failed. Please try again.');
    }
  };

  const getJoinButtonText = () => {
    if (paymentStatus === 'pending') {
      return <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />;
    }
    return (
      <>
        Verify Room
        <ArrowRight className="w-5 h-5" />
      </>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition hover:shadow-2xl hover:-translate-y-1">
      <div className="h-2 bg-gradient-to-r from-green-500 to-teal-500" />
      <div className="p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 mx-auto">
          <Users className="h-8 w-8 text-green-600" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Join Bingo Event</h2>

        <div className="mb-6">
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>

          {connected && publicKey && (
            <div className="bg-green-100 text-green-800 p-3 rounded-lg text-center mt-4">
              <p className="font-medium">Connected: {formattedAddress}</p>
              <p className="text-sm mt-1">Network: Solana Devnet</p>
            </div>
          )}
        </div>

        <form className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Enter Your Name"
              className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
              maxLength={20}
            />
            <Users className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter Event Code"
              className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
              maxLength={6}
            />
            <Dices className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          {(paymentError || joinError) && (
            <div className="bg-red-100 text-red-800 p-3 rounded-lg">
              {paymentError || joinError}
            </div>
          )}

          {!hasJoined && (
            <button
              type="button"
              onClick={handleVerifyRoom}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold transform transition hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 shadow-md"
            >
              {getJoinButtonText()}
            </button>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Wallet className="h-4 w-4" />
            <p>Pay with SOL - Entry fee determined by event</p>
          </div>
        </form>
      </div>

      {verifiedRoomData && (
        <VerifyRoomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={async () => {
            setIsModalOpen(false);
            await onJoinRoom({ playerName: joinName, roomCode: roomCode.toUpperCase() });

            const contractAddress = verifiedRoomData.contractAddress;

            saveRoomJoiningData({
              isCreator: false,
              playerName: joinName,
              roomId: roomCode.toUpperCase(),
              walletAddress: formattedAddress,
              contractAddress,
              chain: 0, // Solana
              namespace: 'solana',
              entryFee,
            });

            setHasJoined(true);
          }}
          hostName={verifiedRoomData.hostName}
          entryFee={verifiedRoomData.entryFee}
          contractAddress={verifiedRoomData.contractAddress}
        />
      )}
    </div>
  );
};

export default JoinRoomCard;
