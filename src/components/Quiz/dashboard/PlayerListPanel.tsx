/**
 * Player List Panel - Player Registration and QR Code Sharing
 *
 * **Purpose:** Sub-panel of HostDashboard showing registered players with payment status,
 * QR code generation for easy mobile joining, and manual player addition for Web2 rooms.
 *
 * **Key Features:**
 * 1. **Manual Player Addition** (Web2 only): Host can add players without blockchain
 * 2. **Payment Status Display**: Shows paid/unpaid status for each player
 * 3. **QR Code Generation**: Per-player join links with embedded playerId
 * 4. **Socket Sync**: Automatically emits player list to server when updated
 * 5. **Payment Method Tracking**: Records how each player paid (cash/revolut/web3)
 *
 * **Web2 vs. Web3 Behavior:**
 *
 * **Web2 (cash/revolut):**
 * - **Manual add enabled**: Host fills name + payment method → Click "Add" button
 * - **Player ID**: Generated client-side with `nanoid()` (8-character unique ID)
 * - **Payment tracking**: Host manually marks paid in PaymentReconciliationPanel
 * - **Join flow**: Players can join via QR code with pre-assigned playerId
 *
 * **Web3 (blockchain):**
 * - **Manual add disabled**: Players must join via blockchain transaction
 * - **Player list read-only**: Shows players who joined on-chain
 * - **Payment verification**: Automatic via smart contract event listening
 * - **Join flow**: Players connect wallet → Pay entry fee → Auto-added to list
 *
 * **QR Code Join Links:**
 * Each player gets a unique join URL with embedded playerId:
 * ```
 * Format: {origin}/join/{roomId}?playerId={playerId}
 * Example: https://fundraisely.com/join/abc123?playerId=xyz789
 * ```
 *
 * **Why Embedded PlayerId:**
 * - **Pre-registered**: Player already in host's list before joining socket
 * - **Payment tracking**: Host knows who player is for payment reconciliation
 * - **Skip name entry**: Player doesn't re-enter name (host already added it)
 * - **Host control**: Host decides who can join (vs. open registration)
 *
 * **Player Addition Flow (Web2):**
 * ```
 * Host enters name "Alice" + selects "Cash"
 *   ↓
 * Click "Add" → addPlayer() called
 *   ↓
 * Player object created: { id: nanoid(), name: "Alice", paid: false, paymentMethod: "cash", credits: 0 }
 *   ↓
 * Saved to usePlayerStore (Zustand) + localStorage
 *   ↓
 * useEffect triggers → emitPlayersUpdate()
 *   ↓
 * Verify room exists → socket.emit('add_player', { roomId, players })
 *   ↓
 * Server updates room.players array
 * ```
 *
 * **Socket Sync Strategy:**
 * `emitPlayersUpdate()` fires whenever players array changes:
 * 1. Verify room exists (prevent sending to deleted rooms)
 * 2. Emit `add_player` event with full players array
 * 3. Server replaces its players list with this array (full sync, not append)
 *
 * **Why Full Sync Instead of Incremental:**
 * - **Simpler**: No need to track add/remove/update separately
 * - **Resilience**: Recovers from missed events (server always has latest full state)
 * - **Consistency**: Client is source of truth for player list (host controls)
 *
 * **QR Code UI:**
 * - Click "📝 Invite" button → Toggle QR code visibility for that player
 * - QR code displays: 128x128 canvas with join URL
 * - Shows URL text below QR code (for manual copy)
 * - "Copy Link" button → Copies URL to clipboard
 *
 * **Payment Method Options:**
 * - **cash**: Physical cash payment (offline)
 * - **revolut**: Revolut mobile payment (offline verification)
 * - **web3**: Blockchain payment (on-chain verification)
 * - **unknown**: Payment method not specified (default fallback)
 *
 * **Player List Display:**
 * For each player shows:
 * - **Name**: Player's display name
 * - **Payment method**: How they paid (cash/revolut/web3/unknown)
 * - **Status**: "[COMPLETE] Paid" or "[ERROR] Unpaid"
 * - **Actions**: "Mark Paid" toggle (Web2 only), "📝 Invite" (QR code)
 *
 * **State Management:**
 * - Local: `newName`, `paymentMethod`, `selectedPlayerId` (controlled inputs)
 * - Global: `usePlayerStore.players` (Zustand store)
 * - Persistence: `localStorage.players_{roomId}` (saved by usePlayerStore)
 *
 * **Integration:**
 * - Parent: HostDashboard
 * - State: usePlayerStore (player list), useQuizConfig (payment method check)
 * - WebSocket: useQuizSocket → emit 'add_player', 'verify_quiz_room'
 * - Related: PaymentReconciliationPanel (payment status toggle)
 *
 * **Validation:**
 * - Cannot add player without name (trimmed name must be non-empty)
 * - Cannot add player without roomId (should never happen, defensive check)
 * - Room verification before socket emit (prevents orphaned events)
 *
 * **Future Enhancements:**
 * - Bulk player import (CSV upload)
 * - Player removal (currently can only add)
 * - SMS/email invite directly from dashboard
 * - Player profile pictures
 * - Pre-registration form (players submit name before host approves)
 *
 * @component
 * @category Quiz Dashboard
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePlayerStore } from '../../../stores/quizPlayerStore';
import { useQuizConfig } from '../useQuizConfig';
import { QRCodeCanvas } from 'qrcode.react';
import { nanoid } from 'nanoid';
import { useQuizSocket } from '../useQuizSocket';

const PlayerListPanel: React.FC = () => {
  const { config } = useQuizConfig();
  const { roomId } = useParams();
  const { players, addPlayer, togglePaid } = usePlayerStore();
  const [newName, setNewName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'revolut' | 'web3' | 'unknown'>('cash');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const socket = useQuizSocket();
  const debug = true;

  const emitPlayersUpdate = () => {
    if (!roomId || !players.length || !socket?.connected) return;

    // Verify room exists before emitting
    socket.emit('verify_quiz_room', { roomId });
    socket.once('quiz_room_verification_result', ({ exists }) => {
      if (exists) {
        socket.emit('add_player', { roomId, players });
        if (debug) console.log('[Socket Emit] add_player', players);
      } else {
        if (debug) console.warn(`[Socket Emit] [ERROR] Cannot add_player - room ${roomId} not found`);
      }
    });
  };

  const handleAdd = () => {
    if (!newName.trim() || !roomId) return;
    addPlayer(
      {
        id: nanoid(),
        name: newName.trim(),
        paid: false,
        paymentMethod,
        credits: 0,
      },
      roomId
    );
    setNewName('');
  };

  useEffect(() => {
    if (players.length > 0 && socket?.connected && roomId) {
      emitPlayersUpdate();
    }
  }, [players, socket?.connected, roomId]);

  const isWeb3 = config.paymentMethod === 'web3';
  const baseJoinUrl = `${window.location.origin}/join/${roomId}`;

  return (
    <div className="bg-white p-8 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6"> Players</h2>

      {!isWeb3 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Player Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-indigo-500"
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-indigo-500"
          >
            <option value="cash">Cash</option>
            <option value="revolut">Revolut</option>
            <option value="web3">Web3</option>
            <option value="unknown">Unknown</option>
          </select>
          <button
            onClick={handleAdd}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition"
          >
            Add
          </button>
        </div>
      )}

      {players.length === 0 ? (
        <p className="text-gray-600">No players {isWeb3 ? 'have joined yet.' : 'added yet.'}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {players.map((player) => {
            const joinLink = `${baseJoinUrl}?playerId=${player.id}`;
            const isShowingQR = selectedPlayerId === player.id;

            return (
              <li key={player.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div>
                    {player.isReady ? (
                      <span className="text-green-500 text-xl">✓</span>
                    ) : (
                      <span className="text-gray-300 text-xl">○</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{player.name}</p>
                    <p className="text-sm text-gray-500">
                      Payment: {player.paymentMethod} | Status: {player.paid ? 'Paid' : 'Unpaid'} | {player.isReady ? 'Ready' : 'Not Ready'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {!isWeb3 && (
                    <button
                      onClick={() => togglePaid(player.id, roomId || '')}
                      className={`px-4 py-1 rounded-lg text-sm font-medium shadow ${
                        player.paid
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {player.paid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPlayerId(isShowingQR ? null : player.id)}
                    className="text-indigo-600 hover:underline text-sm"
                  >
                     Invite
                  </button>
                </div>

                {isShowingQR && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                    <QRCodeCanvas value={joinLink} size={128} />
                    <p className="mt-2 text-xs text-gray-500 break-all">{joinLink}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(joinLink);
                      }}
                      className="text-indigo-600 text-xs mt-1 hover:underline"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PlayerListPanel;



