/**
 * Step Review & Launch - Final Wizard Step for Quiz Deployment
 *
 * **Purpose:**
 * Final step in the Quiz creation wizard. Reviews all configured settings, deploys the quiz room
 * to the Solana blockchain (if Web3 selected), creates the room on the WebSocket server, and
 * navigates the host to the dashboard. This is the most complex wizard step, orchestrating both
 * blockchain and server-side operations.
 *
 * **Critical Operations:**
 * 1. **Config Review**: Display all settings from previous 7 wizard steps for final verification
 * 2. **Blockchain Deployment** (Web3 only): Deploy room smart contract to Solana devnet/mainnet
 * 3. **Server Room Creation**: Emit Socket.io event to create room on WebSocket server
 * 4. **Navigation**: Redirect host to `/host-dashboard/{roomId}` upon success
 *
 * **Deployment Flow (Web3):**
 * ```
 * User clicks "Launch Quiz"
 *   ↓
 * Check wallet connected (abort if not)
 *   ↓
 * Call deploy() from useContractActions
 *   ↓
 * ┌─────────────────────────────────────────────────────┐
 * │ 1. Derive Room PDA (host + roomId seeds)            │
 * │ 2. Call init_pool_room instruction on Solana        │
 * │ 3. Create Room account + RoomVault on-chain         │
 * │ 4. Store config: entryFee, charity, prize splits    │
 * │ 5. Get transaction signature                        │
 * └─────────────────────────────────────────────────────┘
 *   ↓
 * Save contractAddress + txHash to config
 *   ↓
 * Emit 'create_quiz_room' socket event with full config
 *   ↓
 * Server creates room, stores in memory/DB
 *   ↓
 * Server emits 'quiz_room_created' event back
 *   ↓
 * Navigate to /host-dashboard/{roomId}
 * ```
 *
 * **Deployment Flow (Web2/Cash):**
 * ```
 * User clicks "Launch Quiz"
 *   ↓
 * Skip blockchain deployment
 *   ↓
 * Emit 'create_quiz_room' socket event immediately
 *   ↓
 * Server creates room (no blockchain validation needed)
 *   ↓
 * Navigate to /host-dashboard/{roomId}
 * ```
 *
 * **Transaction Status States:**
 * - `idle`: Initial state, review UI shown
 * - `deploying`: Blockchain deployment in progress (wallet signing)
 * - `success`: Deployment successful, contract created
 * - `error`: Deployment failed (display error message)
 *
 * **Config Passed to Blockchain:**
 * ```typescript
 * await deploy({
 *   roomId: nanoid(10),                  // Unique room identifier
 *   hostId: nanoid(),                    // Host user ID
 *   currency: config.web3Currency,       // 'USDC' or 'SOL'
 *   entryFee: config.entryFee,           // e.g., '10'
 *   hostFeePct: config.hostFeeBps / 100, // e.g., 3 (from 300 bps)
 *   prizeMode: 'split',                  // Pool-based distribution
 *   charityName: config.charityName,     // e.g., 'Red Cross'
 *   charityAddress: config.web3CharityAddress, // Solana wallet address
 *   prizePoolPct: config.prizePoolBps / 100,   // e.g., 35 (from 3500 bps)
 *   prizeSplits: { first: 100 },         // 100% to 1st place (customizable)
 *   hostWallet: publicKey.toBase58(),    // Host's Solana wallet
 *   hostMetadata: { ... },               // Quiz settings for display
 * });
 * ```
 *
 * **Displayed Review Sections:**
 * 1. **Game Details**: Type (Pub Quiz, Speed Quiz), rounds, time per question
 * 2. **Payment**: Method (Web2/Web3), entry fee, currency
 * 3. **Fundraising Extras**: Which extras enabled (buyHint, extraTime, lifeline) + prices
 * 4. **Prizes**: Prize mode (split/assets), distribution percentages
 * 5. **Blockchain** (Web3 only): Chain (Solana), network (devnet), charity address
 *
 * **Error Handling:**
 * Common deployment errors:
 * - "Please connect your wallet" - No Solana wallet connected
 * - "Deployment failed" - Transaction simulation error (insufficient funds, invalid params)
 * - "User rejected the request" - User declined transaction in wallet
 * - Network errors from RPC endpoint (timeout, rate limit)
 *
 * **Integration Points:**
 * - Parent: `QuizWizard.tsx` (step 8 of 8)
 * - State: `useQuizConfig()` - Reads accumulated config from all previous steps
 * - Blockchain: `useContractActions().deploy()` - Deploys to Solana
 * - Socket: `useQuizSocket()` - Creates room on server
 * - Wallet: `useWallet()` from @solana/wallet-adapter-react - Wallet connection status
 *
 * **LocalStorage:**
 * Saves `quiz_config_{roomId}` for host to restore session if page refreshes.
 *
 * **Future Enhancements:**
 * - Add deployment preview (gas estimation, total cost)
 * - Add "Save Draft" option (deploy later)
 * - Add multi-sig support (multiple hosts)
 * - Add scheduled deployment (deploy at specific time)
 * - Add testnet/mainnet toggle UI
 *
 * @component
 * @category Quiz Wizard
 */

import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Shield, AlertCircle, ExternalLink } from 'lucide-react';
import { useQuizConfig } from '../useQuizConfig';
import { useQuizSocket } from '../useQuizSocket';
import { useContractActions } from '../../../hooks/useContractActions';
import { useWallet } from '@solana/wallet-adapter-react';
import { quizGameTypes } from '../../../constants/quiztypeconstants';
import { TransactionStatusModal } from '../modals/TransactionStatusModal';
import { BlockchainBadge } from '../common/BlockchainBadge';
import type { WizardStepProps } from './WizardStepProps';

type TransactionStatus = 'idle' | 'connecting' | 'deploying' | 'confirming' | 'success' | 'error';

const StepReviewLaunch: FC<WizardStepProps> = ({ onBack }) => {
  const { config, updateConfig } = useQuizConfig();
  const navigate = useNavigate();
  const socket = useQuizSocket();
  const { deploy } = useContractActions();
  const { publicKey, connected } = useWallet();
  const debug = true;

  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedGameType = quizGameTypes.find((type) => type.id === config.gameType);
  const fundraisingEnabled = Object.entries(config.fundraisingOptions || {}).filter(
    ([_, enabled]) => enabled
  );

  useEffect(() => {
    if (!socket) {
      if (debug) console.log('[DEBUG] useQuizSocket returned: null');
      return;
    }

    if (debug) console.log('[DEBUG] useQuizSocket returned:', socket);

    const handleCreated = ({ roomId }: { roomId: string }) => {
      if (debug) console.log('[Socket Received] [COMPLETE] quiz_room_created:', roomId);
      navigate(`/host-dashboard/${roomId}`);
    };

    const handleError = ({ message }: { message: string }) => {
      console.error('[Socket Error]', message);
    };

    socket.on('quiz_room_created', handleCreated);
    socket.on('quiz_error', handleError);

    return () => {
      socket.off('quiz_room_created', handleCreated);
      socket.off('quiz_error', handleError);
    };
  }, [socket, navigate]);

  const handleLaunch = async () => {
    if (!socket || !socket.connected) {
      console.warn('[Socket] [ERROR] Socket not connected — cannot emit yet.');
      return;
    }

    const roomId = config.roomId || nanoid(10);
    const hostId = nanoid(); // Replace with real host ID if available

    try {
      let updatedConfig = { ...config, roomId };

      // If web3 payment method is selected, deploy to blockchain first
      if (config.paymentMethod === 'web3') {
        // Check wallet connection
        if (!connected || !publicKey) {
          setError('Please connect your wallet before launching a Web3 quiz');
          setTxStatus('error');
          return;
        }

        console.log('[Blockchain] Starting deployment...');
        setTxStatus('deploying');
        setError(null);

        const deployResult = await deploy({
          roomId,
          hostId,
          currency: config.web3Currency || 'USDC',
          entryFee: config.entryFee || '1',
          hostFeePct: config.hostFeeBps ? config.hostFeeBps / 100 : 0,
          prizeMode: 'split',
          charityName: config.charityName,
          charityAddress: config.web3CharityAddress,
          prizePoolPct: config.prizePoolBps ? config.prizePoolBps / 100 : 35,
          prizeSplits: {
            first: 100, // 100% to first place by default
          },
          hostWallet: publicKey.toBase58(),
          hostMetadata: {
            hostName: config.hostName,
            eventDateTime: config.startTime,
            totalRounds: config.roundCount,
          },
        });

        if (!deployResult.success) {
          throw new Error('Deployment failed');
        }

        console.log('[Blockchain] Deployment successful:', deployResult);
        setTxStatus('success');
        setTxHash(deployResult.txHash);
        setContractAddress(deployResult.contractAddress);
        setExplorerUrl(deployResult.explorerUrl || null);

        // Update config with blockchain details
        updatedConfig = {
          ...updatedConfig,
          roomContractAddress: deployResult.contractAddress,
          deploymentTxHash: deployResult.txHash,
        };
      }

      // Save config and emit socket event
      updateConfig({ roomId, ...updatedConfig });
      localStorage.setItem(`quiz_config_${roomId}`, JSON.stringify(updatedConfig));

      socket.emit('create_quiz_room', {
        roomId,
        hostId,
        config: updatedConfig,
      });

      if (debug) {
        console.log('[Socket Emit] [LAUNCH] create_quiz_room', {
          roomId,
          hostId,
          config: updatedConfig,
        });
      }

      // Navigation happens in the socket event listener ('quiz_room_created')
    } catch (err: any) {
      console.error('[Launch Error]', err);
      setError(err?.message || 'Failed to launch quiz');
      setTxStatus('error');
    }
  };

  const handleRetryDeploy = () => {
    setTxStatus('idle');
    setError(null);
    setTxHash(null);
    setContractAddress(null);
    setExplorerUrl(null);
  };

  const handleCloseModal = () => {
    if (txStatus === 'success') {
      // Continue with launch after successful deployment
      setTxStatus('idle');
    } else {
      // Just close the modal on error
      setTxStatus('idle');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-indigo-800">Final Step: Review & Launch</h2>
      <p className="text-sm text-gray-600 mb-4">
        Here's a summary of your quiz setup. Go back to edit anything before launching.
      </p>

      <div className="bg-white rounded-xl shadow-md p-6 space-y-5">
        <div>
          <h3 className="font-medium text-gray-700 mb-1">Host Name</h3>
          <p className="text-gray-900">{config.hostName || '—'}</p>
        </div>

        <div>
          <h3 className="font-medium text-gray-700 mb-1">Quiz Format</h3>
          <p className="text-gray-900">{selectedGameType?.name || config.gameType}</p>
          <p className="text-sm text-gray-500">{selectedGameType?.description}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Rounds</h4>
            <p className="text-gray-900">{config.roundCount ?? '—'}</p>
          </div>
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Time Per Question</h4>
            <p className="text-gray-900">{config.timePerQuestion} seconds</p>
          </div>
          {config.questionsPerRound !== undefined && (
            <div>
              <h4 className="text-gray-700 font-medium mb-1">Questions Per Round</h4>
              <p className="text-gray-900">{config.questionsPerRound}</p>
            </div>
          )}
          {config.startTime && (
            <div>
              <h4 className="text-gray-700 font-medium mb-1">Start Time</h4>
              <p className="text-gray-900">{new Date(config.startTime).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Entry Fee</h4>
            <p className="text-gray-900">
              {config.entryFee
                ? `${config.currencySymbol || '€'}${config.entryFee} to join`
                : 'Free'}
            </p>
          </div>
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Payment Method</h4>
            <p className="text-gray-900">
              {config.paymentMethod === 'web3'
                ? `Web3 Wallet (${config.web3Currency || 'USDC'})`
                : 'Cash or Debit (Revolut)'}
            </p>
          </div>
        </div>

        {/* Blockchain configuration summary */}
        {config.paymentMethod === 'web3' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-5 border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-indigo-700" />
              <h3 className="font-semibold text-indigo-900">Blockchain Configuration</h3>
            </div>
            <div className="space-y-3">
              <div>
                <BlockchainBadge className="mb-2" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Charity</p>
                  <p className="text-gray-900">{config.charityName || '—'}</p>
                  {config.web3CharityAddress && (
                    <p className="text-xs text-gray-600 font-mono break-all">
                      {config.web3CharityAddress.slice(0, 8)}...{config.web3CharityAddress.slice(-6)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Fee Structure</p>
                  <div className="text-gray-900 space-y-0.5">
                    <p className="text-xs">Platform: 20%</p>
                    <p className="text-xs">
                      Host: {config.hostFeeBps ? (config.hostFeeBps / 100).toFixed(1) : '0'}%
                    </p>
                    <p className="text-xs">
                      Prize Pool: {config.prizePoolBps ? (config.prizePoolBps / 100).toFixed(1) : '35'}%
                    </p>
                    <p className="text-xs font-semibold text-green-700">
                      Charity: {config.charityBps ? (config.charityBps / 100).toFixed(1) : '45'}%
                    </p>
                  </div>
                </div>
              </div>
              {!connected && (
                <div className="flex items-start gap-2 bg-amber-50 text-amber-800 px-3 py-2 rounded-lg text-sm border border-amber-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>You'll need to connect your wallet to deploy the quiz room on-chain</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-gray-700 font-medium mb-2">Fundraising Extras</h4>
          {fundraisingEnabled.length > 0 ? (
            <ul className="space-y-1">
              {fundraisingEnabled.map(([key]) => (
                <li key={key} className="text-gray-800">
                  • {key.replace(/([A-Z])/g, ' $1')} —{' '}
                  {config.fundraisingPrices?.[key]
                    ? `${config.currencySymbol || '€'}${config.fundraisingPrices[key]}`
                    : 'No price set'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">None selected</p>
          )}
        </div>

        {config.roomId && (
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Room ID</h4>
            <p className="text-gray-800">{config.roomId}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-5 rounded-xl transition"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleLaunch}
          disabled={txStatus === 'deploying' || txStatus === 'confirming'}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {txStatus === 'deploying' || txStatus === 'confirming'
            ? 'Deploying...'
            : 'Launch Dashboard'}
        </button>
      </div>

      {/* Transaction Status Modal */}
      <TransactionStatusModal
        isOpen={txStatus !== 'idle'}
        status={txStatus}
        txHash={txHash || undefined}
        contractAddress={contractAddress || undefined}
        explorerUrl={explorerUrl || undefined}
        errorMessage={error || undefined}
        onClose={handleCloseModal}
        onRetry={handleRetryDeploy}
      />
    </div>
  );
};

export default StepReviewLaunch;



