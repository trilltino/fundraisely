/**
 * Web3 Payment Step Component - Blockchain-Based Quiz Entry Payment
 *
 * **Purpose:**
 * Final step in the quiz join flow for Web3-enabled rooms. Handles wallet connection,
 * on-chain payment processing, and game room socket registration. This component bridges
 * blockchain payments (Solana) with real-time game coordination (Socket.io).
 *
 * **User Flow:**
 * ```
 * 1. View cost breakdown (entry fee + selected extras)
 * 2. Connect wallet (Phantom/Solflare via Solana wallet adapter)
 * 3. Click "Pay & Join" button
 * 4. Approve transaction in wallet (signing + funds transfer)
 * 5. Wait for blockchain confirmation (~1-2 seconds on devnet)
 * 6. Join game room via WebSocket with verified payment
 * 7. Auto-redirect to game page
 * ```
 *
 * **Payment Processing Flow:**
 * ```
 * ┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐       ┌──────────────┐
 * │   Wallet    │ ────► │ useFundraiselyContract│ ────► │  Solana Program │ ────► │ Socket Server│
 * │  (Phantom)  │ Sign  │   joinRoom()     │  RPC  │  (join_room)    │ Verify│ (join_quiz_  │
 * │             │       │                  │       │                 │       │  room event) │
 * └─────────────┘       └──────────────────┘       └─────────────────┘       └──────────────┘
 *   User approves       Hook calls Anchor         Smart contract:            Server validates:
 *   transaction         instruction builder        - Creates PlayerEntry     - txHash exists
 *                                                   - Transfers tokens        - User paid correct
 *                                                   - Increments player       - Not duplicate join
 *                                                     count
 * ```
 *
 * **On-Chain Operations:**
 * The `joinRoom()` call performs:
 * 1. **Account Derivation**: Derives Room PDA and PlayerEntry PDA from seeds
 * 2. **ATA Creation**: Creates Associated Token Account for fee token if needed (player pays ~0.002 SOL rent)
 * 3. **Token Transfer**: Transfers entry fee + extras from player to RoomVault (SPL token transfer)
 * 4. **Player Registration**: Creates PlayerEntry account recording payment amounts
 * 5. **Transaction Submission**: Sends signed transaction to Solana cluster
 *
 * **State Progression:**
 * ```
 * idle ──► connecting ──► paying ──► confirming ──► joining ──► success
 *   │          │             │           │            │           │
 *   │          │             │           │            │           └─► Navigate to /quiz/game/{roomId}/{playerId}
 *   │          │             │           │            └─► Socket emit 'join_quiz_room'
 *   │          │             │           └─► Wait 2s for blockchain confirmation
 *   │          │             └─► Call joinRoom() → sign transaction → submit to Solana
 *   │          └─► (Not used in current implementation - wallet already connected)
 *   └─► Initial state, wallet connected, ready to pay
 *
 * Error at any step → revert to 'idle' and display error message
 * ```
 *
 * **Cost Calculation:**
 * - **Entry Fee**: Base cost to join (from `roomConfig.entryFee`)
 * - **Extras**: Sum of selected fundraising extras (hints, lifelines, etc.)
 * - **Total**: `entryFee + sum(selectedExtras.map(e => fundraisingPrices[e]))`
 * - **Currency**: Displayed as `web3Currency` (e.g., "USDC", "SOL")
 *
 * **Security:**
 * - Wallet signature required for all transactions (user must approve in extension)
 * - Server validates txHash on-chain before allowing socket join (see socketHandler.js)
 * - Cannot join twice (PlayerEntry PDA prevents duplicate joins)
 * - Cannot manipulate payment amounts (enforced by Anchor program constraints)
 *
 * **Integration Points:**
 * - Parent: `JoinQuizModal.tsx` (multi-step join wizard)
 * - Hooks:
 *   - `useQuizSocket()` - WebSocket connection for game coordination
 *   - `useQuizChainIntegration()` - Chain detection and network info
 *   - `useWalletActions()` - Wallet connection management
 *   - `useContractActions()` - Blockchain operations (joinRoom)
 *   - `useWallet()` - Solana wallet adapter (raw access for publicKey)
 * - Backend: `server/handlers/socketHandler.js` - Validates txHash before adding player
 *
 * **Error Handling:**
 * Common errors and causes:
 * - "Please connect your Solana wallet first" - Wallet not connected
 * - "Room contract address not found" - Room not deployed on-chain yet
 * - "Insufficient funds" - Wallet doesn't have enough SOL or tokens
 * - "User rejected the request" - User declined transaction in wallet
 * - "Transaction simulation failed" - Invalid transaction (wrong params, account errors)
 *
 * **Network Support:**
 * - **Solana**: Fully implemented (devnet, testnet, mainnet)
 * - **EVM**: Planned (not implemented)
 * - **Stellar**: Planned (not implemented)
 *
 * **LocalStorage:**
 * Stores `quizPlayerId:{roomId}` after successful join for reconnection support.
 *
 * @component
 * @category Quiz Join Flow
 *
 * @example
 * ```tsx
 * // Used in JoinQuizModal.tsx
 * {step === 'payment' && roomConfig.paymentMethod === 'web3' && (
 *   <Web3PaymentStep
 *     roomId={roomId}
 *     playerName={playerName}
 *     roomConfig={roomConfig}
 *     selectedExtras={selectedExtras}
 *     onBack={() => setStep('extras')}
 *     onClose={onClose}
 *   />
 * )}
 * ```
 */

// components/Quiz/joinroom/Web3PaymentStep.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { ChevronLeft, AlertCircle, CheckCircle, Loader, Wallet, PlugZap, Unplug, X, ExternalLink } from 'lucide-react';

import { useQuizSocket } from '../useQuizSocket';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { useWalletActions } from '../../../hooks/useWalletActions';
import { useContractActions } from '../../../hooks/useContractActions';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import type { QuizConfig } from '../../../types/quiz';

/**
 * Props for Web3PaymentStep component.
 *
 * @property roomId - Unique identifier for the quiz room
 * @property playerName - Display name entered by player in previous step
 * @property roomConfig - Full room configuration including blockchain settings
 * @property selectedExtras - Array of extra feature IDs selected by player (e.g., ['buyHint', 'lifeline'])
 * @property onBack - Callback to return to extras selection step
 * @property onClose - Callback to close the join modal entirely
 */
interface Web3PaymentStepProps {
  roomId: string;
  playerName: string;
  roomConfig: QuizConfig;
  selectedExtras: string[];
  onBack: () => void;
  onClose: () => void;
}

/**
 * Payment processing state machine.
 *
 * @type PaymentStatus
 * - `idle` - Ready to process payment (wallet connected, waiting for user action)
 * - `connecting` - Connecting wallet (not currently used, wallet pre-connected)
 * - `paying` - Submitting blockchain transaction (user approving in wallet + sending to RPC)
 * - `confirming` - Waiting for blockchain confirmation (2 second delay for finality)
 * - `joining` - Emitting socket event to join game room (verifying payment on server)
 * - `success` - Payment and join complete (redirecting to game page)
 */
type PaymentStatus = 'idle' | 'connecting' | 'paying' | 'confirming' | 'joining' | 'success';

/**
 * Web3 Payment Step - Handles blockchain payment processing for quiz entry.
 *
 * **Component Responsibilities:**
 * 1. Display cost breakdown (entry + extras)
 * 2. Show wallet connection status
 * 3. Process on-chain payment via `joinRoom()` contract call
 * 4. Register player with game server via socket
 * 5. Handle errors and display transaction status
 * 6. Redirect to game on success
 *
 * **Key State Variables:**
 * - `paymentStatus` - Current step in payment flow (see PaymentStatus type)
 * - `error` - Error message to display (empty string if no error)
 * - `txHash` - Blockchain transaction signature (for explorer link)
 *
 * **External Dependencies:**
 * - Requires `VITE_SOCKET_URL` environment variable for socket connection
 * - Requires Solana wallet adapter context (provided by SolanaWalletProvider)
 * - Requires active WebSocket connection (from useQuizSocket hook)
 *
 * @param props - Component props (see Web3PaymentStepProps)
 * @returns React component
 */
export const Web3PaymentStep: React.FC<Web3PaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  onBack,
  onClose,
}) => {
  const socket = useQuizSocket();
  const navigate = useNavigate();

  const { selectedChain, getNetworkDisplayName, isWalletConnected, walletAddress } = useQuizChainIntegration({
    chainOverride: roomConfig.web3Chain as any,
  });

  const walletActions = useWalletActions({ chainOverride: roomConfig.web3Chain as any });
  const { joinRoom } = useContractActions({ chainOverride: roomConfig.web3Chain as any });
  const { publicKey, connected } = useWallet();

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Calculate costs
  const extrasTotal = selectedExtras.reduce(
    (sum, id) => sum + (roomConfig.fundraisingPrices?.[id] || 0),
    0
  );
  const totalAmount = parseFloat(roomConfig.entryFee || '0') + extrasTotal;

  const networkName = getNetworkDisplayName();

  // Format address for display
  const formatAddr = (addr: string | null, short = true) => {
    if (!addr) return null;
    return short && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
  };

  // Get explorer URL for transaction
  const getExplorerUrl = (signature: string): string | null => {
    if (selectedChain === 'solana') {
      const cluster = roomConfig.solanaCluster || 'devnet';
      return cluster === 'mainnet'
        ? `https://explorer.solana.com/tx/${signature}`
        : `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
    }
    return null;
  };

  // Debug logging
  useEffect(() => {
    console.log('[JOIN][Web3PaymentStep] State:', {
      selectedChain,
      networkName,
      connected,
      publicKey: publicKey?.toBase58(),
      walletAddress,
      isWalletConnected,
      roomConfig: {
        web3Chain: roomConfig.web3Chain,
        solanaCluster: roomConfig.solanaCluster,
        web3Currency: roomConfig.web3Currency,
        roomContractAddress: roomConfig.roomContractAddress,
        entryFee: roomConfig.entryFee,
      },
      amounts: {
        entryFee: roomConfig.entryFee,
        extrasTotal,
        totalAmount,
        currency: roomConfig.web3Currency || roomConfig.currencySymbol,
      },
    });
  }, [selectedChain, networkName, connected, publicKey, walletAddress, isWalletConnected, roomConfig, extrasTotal, totalAmount]);

  // Handle Web3 join with on-chain payment
  const handleWeb3Join = async () => {
    try {
      setError('');

      // Check wallet connection
      if (!connected || !publicKey) {
        throw new Error('Please connect your Solana wallet first');
      }

      const address = publicKey.toBase58();
      console.log('[JOIN] Starting Web3 join with address:', address);

      // Pay / join on-chain
      setPaymentStatus('paying');
      const roomAddress = roomConfig.roomContractAddress;

      if (!roomAddress) {
        throw new Error('Room contract address not found. Room may not be deployed yet.');
      }

      console.log('[JOIN] Calling joinRoom with:', {
        roomId,
        roomAddress,
        feeAmount: roomConfig.entryFee,
        extrasAmount: extrasTotal > 0 ? extrasTotal.toString() : undefined,
      });

      const result = await joinRoom({
        roomId,
        feeAmount: parseFloat(roomConfig.entryFee || '0'),
        extrasAmount: extrasTotal > 0 ? extrasTotal.toString() : undefined,
        roomAddress,
      });

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      console.log('[JOIN] Payment successful:', result.txHash);
      setTxHash(result.txHash || '');
      setPaymentStatus('confirming');

      // Wait for confirmation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Join via socket
      setPaymentStatus('joining');
      const playerId = nanoid();

      socket?.emit('join_quiz_room', {
        roomId,
        user: {
          id: playerId,
          name: playerName,
          paid: true,
          paymentMethod: 'web3',
          web3TxHash: result.txHash,
          web3Address: address,
          web3Chain: selectedChain,
          extras: selectedExtras,
          extraPayments: Object.fromEntries(
            selectedExtras.map((key) => [
              key,
              {
                method: 'web3',
                amount: roomConfig.fundraisingPrices?.[key] || 0,
                txHash: result.txHash
              },
            ])
          ),
        },
        role: 'player',
      });

      localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
      setPaymentStatus('success');

      setTimeout(() => {
        navigate(`/quiz/game/${roomId}/${playerId}`);
      }, 1500);
    } catch (e: any) {
      console.error('[JOIN] Web3 join failed:', e);
      setError(e.message || 'Failed to join game');
      setPaymentStatus('idle');
    }
  };

  // Get status display
  const status = (() => {
    switch (paymentStatus) {
      case 'connecting':
        return {
          icon: <Loader className="h-5 w-5 animate-spin" />,
          text: `Connecting ${networkName} wallet...`,
          color: 'text-blue-600'
        };
      case 'paying':
        return {
          icon: <Loader className="h-5 w-5 animate-spin" />,
          text: 'Processing payment on-chain...',
          color: 'text-yellow-600'
        };
      case 'confirming':
        return {
          icon: <Loader className="h-5 w-5 animate-spin" />,
          text: 'Confirming transaction...',
          color: 'text-orange-600'
        };
      case 'joining':
        return {
          icon: <Loader className="h-5 w-5 animate-spin" />,
          text: 'Joining game room...',
          color: 'text-green-600'
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          text: 'Success! Redirecting to game...',
          color: 'text-green-600'
        };
      default:
        return null;
    }
  })();

  const explorerUrl = txHash ? getExplorerUrl(txHash) : null;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
            🌐
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">Web3 Payment</h2>
            <p className="text-sm text-gray-600 sm:text-base">Pay with {networkName} to join</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center space-x-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          title="Close"
        >
          <X className="h-4 w-4" />
          <span>Close</span>
        </button>
      </div>

      {/* Cost Summary */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">Total Cost</div>
            <div className="text-sm text-gray-600">
              Entry: {roomConfig.web3Currency || roomConfig.currencySymbol}
              {parseFloat(roomConfig.entryFee || '0').toFixed(2)}
              {extrasTotal > 0 && ` + Extras: ${roomConfig.web3Currency || roomConfig.currencySymbol}${extrasTotal.toFixed(2)}`}
            </div>
          </div>
          <div className="text-xl font-bold text-blue-900">
            {roomConfig.web3Currency || roomConfig.currencySymbol}
            {totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Wallet Status */}
      <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-800">{networkName} Wallet Status</span>
          </div>
          <div className={`flex items-center space-x-2 ${connected ? 'text-green-600' : 'text-yellow-600'}`}>
            <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm font-medium">{connected ? 'Connected' : 'Not Connected'}</span>
          </div>
        </div>

        {!connected ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Connect your Solana wallet to pay the entry fee and join the quiz.
            </p>
            <WalletMultiButton className="!w-full !bg-purple-600 !text-white hover:!bg-purple-700" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div>
                    <div className="text-sm font-medium text-green-800">{networkName} Wallet Connected</div>
                    <div className="font-mono text-xs text-green-600">{formatAddr(publicKey?.toBase58() || null)}</div>
                  </div>
                </div>
                <WalletMultiButton className="!bg-red-50 !text-red-700 !border !border-red-200 hover:!bg-red-100 !px-2 !py-1 !text-xs !h-auto" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Display */}
      {status && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center space-x-3">
            <div className={status.color}>{status.icon}</div>
            <span className={`font-medium ${status.color}`}>{status.text}</span>
          </div>
          {txHash && (
            <div className="mt-3 space-y-1">
              <div className="text-xs text-gray-600">
                Transaction: <span className="font-mono">{txHash.slice(0, 16)}...</span>
              </div>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700 sm:text-base">{error}</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-6 flex flex-col justify-end space-y-3 border-t border-gray-200 pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button
          onClick={onBack}
          disabled={paymentStatus !== 'idle'}
          className="flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200 disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        {connected && (
          <button
            onClick={handleWeb3Join}
            disabled={paymentStatus !== 'idle'}
            className="flex items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
          >
            <span>Pay {roomConfig.web3Currency || roomConfig.currencySymbol}{totalAmount.toFixed(2)} & Join</span>
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
