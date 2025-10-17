/**
 * CREATEROOMCARD.TSX - Bingo Room Creation Form Component
 *
 * This component provides the user interface for hosts to create new Bingo game rooms on the Solana
 * blockchain. It handles wallet connection, collects room parameters (host name, entry fee), validates
 * inputs, and orchestrates the room creation flow including confirmation modal and localStorage
 * persistence. It serves as the primary host onboarding interface in the test campaign.
 *
 * ROLE IN THE APPLICATION:
 * - Primary UI for creating new Bingo rooms (host workflow)
 * - Handles Solana wallet connection requirement
 * - Collects and validates room creation parameters
 * - Displays generated room code to host
 * - Triggers ConfirmRoomModal for final confirmation
 * - Persists room data to localStorage for page refresh resilience
 * - Navigates to game page upon successful creation
 *
 * USER FLOW:
 * 1. Host visits TestCampaign page (Bingo Blitz)
 * 2. Sees CreateRoomCard with "Connect Wallet" prompt
 * 3. Clicks WalletMultiButton to connect Solana wallet (Phantom, Solflare, etc.)
 * 4. Enters host name (max 20 characters)
 * 5. Enters entry fee in SOL (e.g., 0.001, 0.01)
 * 6. Clicks "Create Bingo Event" button
 * 7. ConfirmRoomModal appears showing room details
 * 8. Host confirms, triggering onCreateRoom callback
 * 9. Room data saved to localStorage
 * 10. Navigates to /game/:roomId as host
 *
 * FORM FIELDS:
 * 1. Host Name Input:
 *    - Text input with Users icon
 *    - Max length 20 characters
 *    - Required field
 *    - Placeholder: "Enter your name"
 *
 * 2. Entry Fee Input:
 *    - Number input with Wallet icon
 *    - Type: number, min: 0, step: 0.001
 *    - Denominated in SOL
 *    - Required field
 *    - Placeholder: "Entry Fee (SOL)"
 *
 * WALLET INTEGRATION:
 * - Uses @solana/wallet-adapter-react for connection
 * - WalletMultiButton component for connection UI
 * - Detects connection state (connected, publicKey)
 * - Shows connection status badge when connected
 * - Blocks room creation until wallet connected
 * - Validates publicKey exists before proceeding
 *
 * VALIDATION LOGIC:
 * Button enabled when (formReady):
 * - createName.trim() !== '' (name provided)
 * - entryFee !== '' (fee specified)
 * - connected === true (wallet connected)
 * - publicKey exists (wallet public key available)
 *
 * BUTTON STATES:
 * - Disabled (gray, no pointer): Form not ready or generating
 * - Enabled (gradient, hover effect): Ready to create
 * - Loading (spinning icon): isGenerating === true
 * - Text: "Create Bingo Event" with ArrowRight icon
 *
 * CONFIRMATION MODAL:
 * - Triggered on button click (if form ready)
 * - Displays: hostName, entryFee, roomId
 * - Asks for final confirmation before blockchain interaction
 * - onConfirm: Calls handleConfirm with wallet address
 * - onClose: Dismisses modal without action
 *
 * LOCAL STORAGE PERSISTENCE:
 * Saved data structure (saveRoomCreationData):
 * - isCreator: true (identifies as host)
 * - playerName: Host's entered name
 * - entryFee: Entry fee in SOL
 * - chain: 0 (Solana identifier)
 * - roomId: Generated room code
 * - walletAddress: Solana public key
 * - contractAddress: '' (will be set by Solana program)
 * - namespace: 'solana'
 *
 * This enables:
 * - Page refresh resilience
 * - Reconnection to room after browser close
 * - Host identification on return
 *
 * CALLBACK FLOW:
 * handleConfirm(walletAddress) →
 *   onCreateRoom(roomData) →
 *   saveRoomCreationData(persistenceData) →
 *   setShowConfirmModal(false) →
 *   Parent (TestCampaign) navigates to /game/:roomId
 *
 * UI DESIGN:
 * - Elevated card with shadow and hover effects
 * - Gradient accent bar (indigo-500 to purple-500)
 * - Dice icon in indigo circle at top
 * - "Create Bingo Event" heading
 * - Form inputs with left-aligned icons
 * - Gradient button (indigo-600 to purple-600)
 * - Info footer with transaction fee note
 *
 * VISUAL FEEDBACK:
 * - Hover: Card lifts slightly (translateY -1)
 * - Hover: Shadow intensifies (shadow-2xl)
 * - Input focus: Border changes to indigo-500, ring appears
 * - Button hover: Gradient darkens
 * - Button disabled: Opacity 50%, cursor not-allowed
 * - Loading: Animated spinning icon
 * - Connected: Green badge with checkmark and address
 *
 * RESPONSIVE DESIGN:
 * - Full width on mobile
 * - Centered with max-width on larger screens
 * - Touch-friendly input sizes (py-3)
 * - Large button for easy tapping
 *
 * PROP INTERFACE:
 * - onCreateRoom: Callback with room data when creation confirmed
 * - isGenerating: Boolean flag for loading state during room creation
 * - roomId: Pre-generated room code (from parent)
 *
 * ACCESSIBILITY:
 * - Semantic button type="button"
 * - Clear placeholder text in inputs
 * - Visual icons reinforce input purpose
 * - Disabled state clearly communicated
 * - Error prevention via validation
 *
 * ERROR HANDLING:
 * - Early return if publicKey missing on confirm
 * - Form validation prevents submission without required fields
 * - Wallet connection required before proceeding
 * - Loading state prevents double-submission
 *
 * DEPENDENCIES:
 * - React useState for local form state
 * - @solana/wallet-adapter-react for wallet integration
 * - @solana/wallet-adapter-react-ui for WalletMultiButton
 * - lucide-react icons
 * - ConfirmRoomModal component
 * - localStorage utility functions
 *
 * INTEGRATION:
 * - Used in TestCampaign.tsx alongside JoinRoomCard
 * - Receives onCreateRoom callback from parent
 * - Receives pre-generated roomId from parent
 * - Triggers navigation to Game.tsx upon completion
 *
 * BLOCKCHAIN INTERACTION:
 * - Requires Solana wallet connection
 * - Connected to Devnet (as shown in status badge)
 * - Entry fee will be used in smart contract
 * - Transaction fees mentioned in info footer
 * - Full blockchain interaction happens in parent/backend
 *
 * FUTURE ENHANCEMENTS:
 * - Add charity selection for fundraising
 * - Show estimated gas fees before submission
 * - Add custom room settings (auto-play, time limits)
 * - Display recent rooms created by user
 * - Add room template functionality
 * - Show prize pool breakdown preview
 */

// src/components/CreateRoomCard.tsx
import { useState, type FC } from 'react';
import { Dices, Users, Wallet, Info, ArrowRight } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import ConfirmRoomModal from '../modals/ConfirmRoomModal';
import { saveRoomCreationData } from '@/utils/localStorageUtils';

interface CreateRoomCardProps {
  onCreateRoom: (roomData: {
    playerName: string;
    entryFee: string;
    walletAddress: string;
    roomId: string;
  }) => void;
  isGenerating: boolean;
  roomId: string;
}

const CreateRoomCard: FC<CreateRoomCardProps> = ({ onCreateRoom, isGenerating, roomId }) => {
  const [createName, setCreateName] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { publicKey, connected } = useWallet();

  const formReady = createName.trim() !== '' && entryFee !== '' && connected && publicKey;

  const handleConfirm = async (walletAddress: string) => {
    if (!publicKey) return;

    onCreateRoom({
      playerName: createName,
      entryFee,
      walletAddress,
      roomId,
    });

    saveRoomCreationData({
      isCreator: true,
      playerName: createName,
      entryFee,
      chain: 0, // Solana (no chain ID concept)
      roomId,
      walletAddress,
      contractAddress: '', // Will be set by Solana program
      namespace: 'solana',
    });

    setShowConfirmModal(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition hover:shadow-2xl hover:-translate-y-1">
      <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
      <div className="p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-6 mx-auto">
          <Dices className="h-8 w-8 text-indigo-600" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Create Bingo Event</h2>

        <div className="space-y-4">
          {!connected ? (
            <div className="text-center">
              <WalletMultiButton />
              <p className="text-sm text-red-500 mt-2">Wallet required to create an event</p>
            </div>
          ) : (
            <div className="text-center">
              <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                [COMPLETE] Connected to Solana Devnet
              </span>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              maxLength={20}
            />
            <Users className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <input
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              placeholder="Entry Fee (SOL)"
              className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              min="0"
              step="0.001"
            />
            <Wallet className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isGenerating || !formReady}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold
                       hover:from-indigo-700 hover:to-purple-700 transform transition
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            {isGenerating ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Create Bingo Event
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Info className="h-4 w-4" />
            <p>Free setup & hosting - Just a few cents in SOL transaction fees required</p>
          </div>
        </div>
      </div>

      <ConfirmRoomModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        hostName={createName}
        entryFee={entryFee}
        roomId={roomId}
      />
    </div>
  );
};

export default CreateRoomCard;
