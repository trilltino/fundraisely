/**
 * Transaction Status Modal - Blockchain Operation Progress Display
 *
 * **Purpose:**
 * Full-screen modal that displays real-time status of blockchain transactions with loading
 * animations, success/error states, and blockchain explorer integration. Provides critical
 * user feedback during async blockchain operations that can take seconds to minutes.
 *
 * **State Flow:**
 * ```
 * idle ──► connecting ──► deploying ──► confirming ──► success
 *                              │
 *                              └──────────────────────► error
 * ```
 *
 * **Visual States:**
 *
 * 1. **Connecting** (Blue spinner):
 *    - Title: "Connecting Wallet"
 *    - Message: "Connecting to wallet..."
 *    - Icon: Spinning loader
 *    - Close: Disabled (cannot interrupt wallet connection)
 *
 * 2. **Deploying** (Yellow spinner):
 *    - Title: "Deploying Contract"
 *    - Message: "Creating quiz room on blockchain..."
 *    - Badge: Shows blockchain network (e.g., "Solana Devnet")
 *    - Close: Disabled (transaction in flight)
 *
 * 3. **Confirming** (Orange spinner):
 *    - Title: "Confirming Transaction"
 *    - Message: "Waiting for transaction confirmation..."
 *    - Badge: Shows blockchain network
 *    - Close: Disabled (waiting for finality)
 *
 * 4. **Success** (Green checkmark):
 *    - Title: "Success!"
 *    - Message: Custom or "Transaction successful!"
 *    - Details: Transaction hash, contract address (copyable)
 *    - Explorer Link: "View on Explorer" button
 *    - Badge: Shows blockchain network
 *    - Close: Enabled
 *
 * 5. **Error** (Red alert):
 *    - Title: "Transaction Failed"
 *    - Message: Custom error or "Transaction failed"
 *    - Error Details: Red box with error message
 *    - Actions: "Retry Transaction" (if onRetry provided), "Close"
 *    - Close: Enabled
 *
 * **User Interactions:**
 * - **Copy Buttons**: Click transaction hash or contract address to copy to clipboard
 * - **Explorer Link**: Opens blockchain explorer in new tab
 * - **Retry Button**: Retries failed transaction (calls onRetry callback)
 * - **Close Button**: Dismisses modal (only enabled for success/error/idle states)
 *
 * **Integration Examples:**
 *
 * **Quiz Room Deployment:**
 * ```tsx
 * const [modalState, setModalState] = useState({
 *   isOpen: false,
 *   status: 'idle',
 *   txHash: '',
 *   contractAddress: '',
 * });
 *
 * // Start deployment
 * setModalState({ isOpen: true, status: 'deploying', ... });
 *
 * // After transaction sent
 * setModalState({ ...modalState, status: 'confirming', txHash: signature });
 *
 * // After confirmation
 * setModalState({ ...modalState, status: 'success', contractAddress: roomPDA });
 * ```
 *
 * **Player Payment:**
 * ```tsx
 * // During payment
 * setModalState({ isOpen: true, status: 'paying', ... });
 *
 * // On error
 * setModalState({ ...modalState, status: 'error', error: 'Insufficient funds' });
 * ```
 *
 * **Explorer URL Generation:**
 * - If `explorerUrl` prop provided, uses it directly
 * - Otherwise, component can generate URL from txHash/contractAddress based on network
 * - See BlockchainBadge component for URL generation logic
 *
 * **Security Considerations:**
 * - Modal blocks interactions during critical states (deploying, confirming)
 * - User can only close after success/error to prevent interrupting transactions
 * - Transaction details are displayed for user verification before proceeding
 *
 * **Accessibility:**
 * - Close button has aria-label for screen readers
 * - Loading states have descriptive text
 * - Keyboard navigation supported (Escape to close when enabled)
 *
 * @component
 * @category Quiz Modals
 *
 * @example
 * ```tsx
 * <TransactionStatusModal
 *   isOpen={isDeploying}
 *   status="deploying"
 *   title="Creating Quiz Room"
 *   message="Deploying smart contract to Solana..."
 *   onClose={() => setIsDeploying(false)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <TransactionStatusModal
 *   isOpen={showResult}
 *   status="success"
 *   txHash="5KHxC3..."
 *   contractAddress="7xKXt..."
 *   explorerUrl="https://explorer.solana.com/tx/5KHxC3..."
 *   onClose={() => setShowResult(false)}
 * />
 * ```
 */

// src/components/Quiz/modals/TransactionStatusModal.tsx
// Modal to show blockchain transaction status with loading states
// Based on reference bingo implementation

import React from 'react';
import { Loader, CheckCircle, AlertCircle, X, ExternalLink, Copy } from 'lucide-react';
import { BlockchainBadge } from '../common/BlockchainBadge';

/**
 * Transaction status type representing different stages of blockchain operations.
 *
 * @type TransactionStatus
 * - `idle` - No transaction in progress
 * - `connecting` - Connecting to wallet (wallet popup opening)
 * - `deploying` - Transaction sent, waiting for blockchain processing
 * - `confirming` - Transaction processed, waiting for finality confirmation
 * - `success` - Transaction confirmed successfully
 * - `error` - Transaction failed or rejected
 */
type TransactionStatus = 'idle' | 'connecting' | 'deploying' | 'confirming' | 'success' | 'error';

/**
 * Props for TransactionStatusModal component.
 *
 * @property isOpen - Controls modal visibility
 * @property status - Current transaction status (determines UI state)
 * @property title - Custom modal title (defaults based on status if not provided)
 * @property message - Custom status message (defaults based on status if not provided)
 * @property error - Error message to display in error state
 * @property txHash - Blockchain transaction signature/hash for display and explorer link
 * @property contractAddress - Smart contract address for display and explorer link
 * @property explorerUrl - Direct URL to blockchain explorer (overrides auto-generation)
 * @property onClose - Callback when user closes modal (disabled during active transactions)
 * @property onRetry - Optional callback to retry failed transaction (shows "Retry" button)
 */
interface TransactionStatusModalProps {
  isOpen: boolean;
  status: TransactionStatus;
  title?: string;
  message?: string;
  error?: string;
  txHash?: string;
  contractAddress?: string;
  explorerUrl?: string;
  onClose: () => void;
  onRetry?: () => void;
}

/**
 * Renders a modal displaying blockchain transaction status with state-specific UI.
 *
 * **Component State Logic:**
 * - `canClose` is true only for success, error, or idle states
 * - Loading spinner shown for connecting, deploying, confirming states
 * - Explorer link shown only for success state with txHash or contractAddress
 * - Retry button shown only for error state when onRetry callback provided
 *
 * **Copy Functionality:**
 * Uses Clipboard API to copy transaction details. Shows "Copied!" feedback for 2 seconds.
 *
 * **Responsive Design:**
 * - Modal max-width: 28rem (md breakpoint)
 * - Full-width on mobile with padding
 * - Fixed positioning with backdrop overlay
 *
 * @param props - Component props (see TransactionStatusModalProps)
 * @returns React component or null if not open
 */
export const TransactionStatusModal: React.FC<TransactionStatusModalProps> = ({
  isOpen,
  status,
  title,
  message,
  error,
  txHash,
  contractAddress,
  explorerUrl,
  onClose,
  onRetry,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connecting':
      case 'deploying':
      case 'confirming':
        return <Loader className="w-12 h-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-12 h-12 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    if (message) return message;

    switch (status) {
      case 'connecting':
        return 'Connecting to wallet...';
      case 'deploying':
        return 'Creating quiz room on blockchain...';
      case 'confirming':
        return 'Waiting for transaction confirmation...';
      case 'success':
        return 'Transaction successful!';
      case 'error':
        return error || 'Transaction failed';
      default:
        return '';
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;

    switch (status) {
      case 'connecting':
        return 'Connecting Wallet';
      case 'deploying':
        return 'Deploying Contract';
      case 'confirming':
        return 'Confirming Transaction';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Transaction Failed';
      default:
        return 'Transaction';
    }
  };

  const canClose = status === 'success' || status === 'error' || status === 'idle';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{getDefaultTitle()}</h3>
          {canClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Icon */}
          <div className="flex justify-center">{getStatusIcon()}</div>

          {/* Status Message */}
          <div className="text-center">
            <p className="text-gray-700">{getStatusMessage()}</p>
          </div>

          {/* Blockchain Badge */}
          {(status === 'success' || status === 'deploying' || status === 'confirming') && (
            <div className="flex justify-center">
              <BlockchainBadge />
            </div>
          )}

          {/* Transaction Details */}
          {txHash && status === 'success' && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Transaction Hash</span>
                <button
                  onClick={() => copyToClipboard(txHash)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs font-mono text-gray-800 break-all">{txHash}</p>
            </div>
          )}

          {/* Contract Address */}
          {contractAddress && status === 'success' && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Room Address</span>
                <button
                  onClick={() => copyToClipboard(contractAddress)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs font-mono text-gray-800 break-all">{contractAddress}</p>
            </div>
          )}

          {/* Explorer Link */}
          {explorerUrl && status === 'success' && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium text-sm"
            >
              <span>View on Explorer</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Error Details */}
          {error && status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t flex gap-3">
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Retry Transaction
            </button>
          )}
          {canClose && (
            <button
              onClick={onClose}
              className={`${
                status === 'error' && onRetry ? 'flex-1' : 'w-full'
              } py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium`}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionStatusModal;
