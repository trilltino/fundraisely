/**
 * Join Quiz Web3 Page - Alternative Web3 Player Entry (Deprecated)
 *
 * **Purpose:** Alternative entry point for Web3 players who have already paid on-chain.
 * This component is largely **deprecated** in favor of Web3PaymentStep within JoinQuizModal.
 * Kept for legacy route support but rarely used in current flow.
 *
 * **Route:**
 * - URL: `/join-web3/:roomId`
 * - Accessed from: Legacy links, possibly old QR codes
 *
 * **Current Web3 Join Flow (Preferred):**
 * ```
 * Player clicks "Join Quiz" → JoinQuizModal
 *   ↓
 * Enter roomId + name → Verify room
 *   ↓
 * Room uses web3 payment → Show Web3PaymentStep
 *   ↓
 * Connect wallet → Pay entry fee on-chain
 *   ↓
 * After tx confirmed → Navigate to game page
 * ```
 *
 * **This Component's Flow (Legacy):**
 * ```
 * Player navigates to /join-web3/{roomId}
 *   ↓
 * Hardcoded player: { id: socket.id, name: "Alice" }
 *   ↓
 * joinQuizRoom(socket, roomId, player)
 *   ↓
 * Display "Waiting for smart contract payment confirmation..."
 *   ↓
 * (No actual blockchain interaction in this component)
 * ```
 *
 * **Critical Issues:**
 *
 * **1. Hardcoded Player Name:**
 * ```typescript
 * const player = { id: socket.id, name: 'Alice' };
 * ```
 * All Web3 players joining via this route appear as "Alice" - clearly a placeholder.
 *
 * **2. No Actual Payment Processing:**
 * Component says "Waiting for smart contract payment confirmation" but doesn't:
 * - Connect wallet
 * - Call smart contract
 * - Verify transaction
 * - Handle payment errors
 *
 * **3. Uses socket.id as playerId:**
 * ```typescript
 * id: socket.id
 * ```
 * This is fragile - if socket disconnects, playerId changes, breaking session continuity.
 * Preferred approach: Generate stable playerId (nanoid) and save to localStorage.
 *
 * **Why This Component Exists:**
 * - **Historical artifact**: Early prototype before Web3PaymentStep was built
 * - **Route preserved**: Avoid breaking old bookmarks/QR codes
 * - **Minimal functionality**: Does basic socket join without actual Web3 integration
 *
 * **Modern Web3 Join:**
 * See `Web3PaymentStep.tsx` for proper Web3 flow:
 * 1. Connect wallet
 * 2. Derive Room PDA
 * 3. Call `join_room` instruction on Solana
 * 4. Pay entry fee in USDC/SOL
 * 5. Wait for transaction confirmation
 * 6. Server detects on-chain event → Adds player to room
 * 7. Navigate to game page
 *
 * **Integration:**
 * - Parent: None (root route component)
 * - WebSocket: useQuizSocket → `join_quiz_room`
 * - Blockchain: None (despite name, no Web3 integration)
 * - Helper: `joinQuizSocket.ts` (socket utility)
 *
 * **UI:**
 * Minimal display:
 * - "🔗 Joining Quiz Room"
 * - Room ID
 * - "Waiting for smart contract payment confirmation (if required)..."
 *
 * **Recommendation:**
 * - **Deprecate route**: Redirect `/join-web3/:roomId` to `/join/:roomId`
 * - **Remove component**: All Web3 joins should use JoinQuizModal → Web3PaymentStep
 * - **Update old QR codes**: Regenerate with `/join/:roomId` format
 *
 * **Future Action:**
 * If keeping this component:
 * 1. Replace hardcoded "Alice" with actual name input
 * 2. Generate stable playerId (nanoid, not socket.id)
 * 3. Add actual Web3 payment flow (like Web3PaymentStep)
 * 4. Or just remove and redirect to modern flow
 *
 * @component
 * @category Quiz Join Flow
 * @deprecated Use JoinQuizModal with Web3PaymentStep instead
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../useQuizSocket';
import { joinQuizRoom } from '../joinQuizSocket';

const JoinQuizWeb3Page = () => {
  const { roomId } = useParams();
  const socket = useQuizSocket();

  useEffect(() => {
    if (socket && roomId) {
      const player = {
        id: socket.id,
        name: 'Alice', // TODO: Replace with actual name from user session or wallet
      };

      joinQuizRoom(socket, roomId, player);
    }
  }, [socket, roomId]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold"> Joining Quiz Room</h2>
      <p>Room ID: {roomId}</p>
      <p>Waiting for smart contract payment confirmation (if required)...</p>
    </div>
  );
};

export default JoinQuizWeb3Page;

