/**
 * Blockchain Badge Component - Network Identifier Display
 *
 * **Purpose:**
 * Displays a visual badge showing the current blockchain network with optional explorer link.
 * Provides immediate visual feedback about which network the quiz is running on, critical for
 * preventing user confusion between test networks (devnet) and production (mainnet).
 *
 * **Visual Design:**
 * - **Badge**: Rounded pill with chain-specific color scheme
 * - **Icon**: Shield icon indicating security/blockchain
 * - **Text**: Network display name (e.g., "Solana Devnet", "Ethereum Mainnet")
 * - **Link**: Optional "View on Explorer" link for transaction/contract verification
 *
 * **Network Color Schemes:**
 * ```
 * Solana Devnet:  Purple background, purple text (testing indicator)
 * Solana Mainnet: Dark purple with white text (production warning)
 * EVM Networks:   Blue background, blue text
 * Stellar:        Indigo background, indigo text
 * Unknown:        Gray background, gray text
 * ```
 *
 * **Explorer Links:**
 * Generates blockchain explorer URLs based on network and provided identifiers:
 *
 * **Solana:**
 * - Transaction: `https://explorer.solana.com/tx/{txHash}?cluster={cluster}`
 * - Address: `https://explorer.solana.com/address/{contractAddress}?cluster={cluster}`
 * - Mainnet omits cluster parameter
 *
 * **EVM (TODO):**
 * - Etherscan, Basescan, Polygonscan depending on network
 *
 * **Stellar (TODO):**
 * - Stellar Explorer or StellarChain
 *
 * **Use Cases:**
 * 1. **Quiz Creation**: Show network in review step before deployment
 * 2. **Transaction Confirmation**: Display alongside txHash after successful deployment
 * 3. **Player Join**: Show network on payment screen for verification
 * 4. **Game Lobby**: Display in room details for transparency
 *
 * **Integration Points:**
 * - Used by: `StepReviewLaunch.tsx`, `TransactionStatusModal.tsx`, quiz lobby components
 * - Depends on: `useQuizChainIntegration()` for network detection
 *
 * @component
 * @category Quiz Common Components
 *
 * @example
 * ```tsx
 * // Simple badge with no link
 * <BlockchainBadge />
 * ```
 *
 * @example
 * ```tsx
 * // Badge with transaction explorer link
 * <BlockchainBadge
 *   showExplorerLink={true}
 *   txHash="5KHxC..."
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Badge with contract address link
 * <BlockchainBadge
 *   showExplorerLink={true}
 *   contractAddress="7xKXt..."
 * />
 * ```
 */

// src/components/Quiz/common/BlockchainBadge.tsx
// Displays blockchain network badge (e.g., "Solana Devnet", "Base Sepolia")
// Based on reference bingo implementation

import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';

/**
 * Props for BlockchainBadge component.
 *
 * @property className - Additional CSS classes to apply to container div
 * @property showExplorerLink - If true, displays "View on Explorer" link (requires txHash or contractAddress)
 * @property txHash - Blockchain transaction signature/hash for explorer link
 * @property contractAddress - Smart contract address for explorer link
 *
 * @remarks
 * Either `txHash` or `contractAddress` can be provided, but not both required.
 * If both provided, `txHash` takes precedence in explorer URL generation.
 */
interface BlockchainBadgeProps {
  className?: string;
  showExplorerLink?: boolean;
  txHash?: string;
  contractAddress?: string;
}

/**
 * Renders a blockchain network badge with optional explorer link.
 *
 * **Behavior:**
 * - Returns null if no chain selected (prevents rendering in cash-only quizzes)
 * - Displays network name via `getNetworkDisplayName()`
 * - Applies chain-specific color scheme via `getChainColor()`
 * - Generates explorer URL if `showExplorerLink` and identifier provided
 *
 * **Color Logic:**
 * Devnet networks use lighter, more subdued colors to visually distinguish from mainnet,
 * reducing risk of users confusing test transactions with real money operations.
 *
 * @param props - Component props (see BlockchainBadgeProps)
 * @returns React component or null if no chain selected
 */
export const BlockchainBadge: React.FC<BlockchainBadgeProps> = ({
  className = '',
  showExplorerLink = false,
  txHash,
  contractAddress,
}) => {
  const { selectedChain, getNetworkDisplayName } = useQuizChainIntegration();

  if (!selectedChain) {
    return null;
  }

  const networkName = getNetworkDisplayName();

  // Generate explorer URL based on chain
  const getExplorerUrl = (): string | null => {
    if (!txHash && !contractAddress) return null;

    if (selectedChain === 'solana') {
      const cluster = networkName.toLowerCase().includes('devnet') ? 'devnet' : '';
      const path = txHash ? `tx/${txHash}` : `address/${contractAddress}`;
      return cluster
        ? `https://explorer.solana.com/${path}?cluster=${cluster}`
        : `https://explorer.solana.com/${path}`;
    }

    if (selectedChain === 'evm') {
      // TODO: Add EVM explorer URLs based on network
      return null;
    }

    if (selectedChain === 'stellar') {
      // TODO: Add Stellar explorer URLs
      return null;
    }

    return null;
  };

  const explorerUrl = showExplorerLink ? getExplorerUrl() : null;

  // Chain-specific colors
  const getChainColor = (): string => {
    switch (selectedChain) {
      case 'solana':
        return networkName.includes('Devnet')
          ? 'bg-purple-100 text-purple-700 border-purple-300'
          : 'bg-purple-600 text-white border-purple-700';
      case 'evm':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'stellar':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${getChainColor()}`}
      >
        <Shield className="w-3.5 h-3.5" />
        <span>{networkName}</span>
      </div>

      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
        >
          <span>View on Explorer</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
};

export default BlockchainBadge;
