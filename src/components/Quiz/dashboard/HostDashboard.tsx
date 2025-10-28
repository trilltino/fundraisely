/**
 * Host Dashboard - Central Control Panel for Quiz Management
 *
 * **Purpose:** Main control interface for quiz hosts after room creation. Displays quiz
 * configuration summary, player list, fundraising extras, payment tracking, and game controls.
 * Loaded after StepReviewLaunch successfully creates room.
 *
 * **Key Responsibilities:**
 * 1. **State Restoration**: Load quiz config & player list from localStorage on refresh
 * 2. **Room Management**: Display room ID, share join links, cancel quiz
 * 3. **Player Management**: View registered players, manually add players (Web2)
 * 4. **Payment Tracking**: Monitor entry fee payments, reconcile cash/Web3 payments
 * 5. **Game Control**: Start quiz, advance questions, declare winners
 *
 * **Route:**
 * - URL: `/host-dashboard/:roomId`
 * - Accessed from: StepReviewLaunch after room creation
 * - Required param: `roomId` from URL
 *
 * **State Restoration Strategy:**
 * On component mount or refresh:
 * ```
 * Check if Zustand config matches roomId
 *   ↓
 * If mismatch or empty → Load from localStorage `quiz_config_{roomId}`
 *   ↓
 * If localStorage empty → Redirect to home (room lost)
 *   ↓
 * Load players from localStorage `players_{roomId}` (always attempt, as Zustand resets on refresh)
 * ```
 *
 * **Why localStorage + Zustand:**
 * - **Zustand**: Fast in-memory access during session, reactive updates
 * - **localStorage**: Persistence across page refreshes, survives tab close/reopen
 * - **Pattern**: Zustand = working copy, localStorage = durable backup
 *
 * **Panel Composition:**
 * Dashboard renders 5 sub-panels in order:
 *
 * 1. **SetupSummaryPanel**: Quiz config summary (host name, game type, timing, prizes)
 * 2. **PlayerListPanel**: Player list with QR code, manual add (Web2), payment status
 * 3. **FundraisingExtrasPanel**: Enabled fundraising extras with pricing
 * 4. **PaymentReconciliationPanel**: Entry fee payment tracking (Web2: manual toggle, Web3: on-chain verification)
 * 5. **HostGameControls**: Quiz execution controls (start quiz, next question, declare winners)
 *
 * **User Flow:**
 *
 * **Scenario 1: Initial Dashboard Load**
 * ```
 * Host completes wizard → StepReviewLaunch creates room
 *   ↓
 * Navigate to /host-dashboard/{roomId}
 *   ↓
 * Dashboard loads config from Zustand (already populated by wizard)
 *   ↓
 * Display panels, wait for players to join
 * ```
 *
 * **Scenario 2: Refresh During Quiz**
 * ```
 * Host refreshes browser (Zustand state lost)
 *   ↓
 * Dashboard detects empty/mismatched Zustand config
 *   ↓
 * Load config from localStorage `quiz_config_{roomId}`
 *   ↓
 * Load players from localStorage `players_{roomId}`
 *   ↓
 * Restore full dashboard state
 * ```
 *
 * **Scenario 3: Cancel Quiz**
 * ```
 * Host clicks "[ERROR] Cancel Quiz" button
 *   ↓
 * Clear Zustand stores (resetConfig, resetPlayers)
 *   ↓
 * Clear localStorage (quiz_config_{roomId}, players_{roomId})
 *   ↓
 * Navigate to home page
 * ```
 *
 * **Cancel Quiz Warning:**
 * Button text "[ERROR] Cancel Quiz" intentionally alarming to prevent accidental clicks.
 * This is a destructive action that cannot be undone. Players will lose access to room.
 *
 * **Integration:**
 * - Parent: None (root route component)
 * - Previous: StepReviewLaunch (creates room, navigates here)
 * - Sub-components: SetupSummaryPanel, PlayerListPanel, FundraisingExtrasPanel, PaymentReconciliationPanel, HostGameControls
 * - State: useQuizConfig (quiz configuration), usePlayerStore (player list)
 * - WebSocket: Sub-panels emit events (add_player, start_quiz, etc.)
 *
 * **Payment Methods:**
 *
 * **Web2 (cash/revolut):**
 * - Host manually adds players in PlayerListPanel
 * - Host manually toggles "Paid" checkbox in PaymentReconciliationPanel
 * - No blockchain verification
 * - Honor system + manual reconciliation
 *
 * **Web3 (blockchain):**
 * - Players join by calling `join_room` on Solana
 * - Server listens for blockchain events
 * - Payment automatically verified on-chain
 * - No manual host intervention needed
 *
 * **Error Handling:**
 * - **Room not found**: If localStorage has no config for roomId → Navigate to home
 * - **Socket disconnection**: Sub-panels handle gracefully (queue events until reconnect)
 * - **State corruption**: User must recreate room (no recovery mechanism)
 *
 * **Persistence Pattern:**
 * Config and players saved to localStorage by:
 * - StepReviewLaunch: Saves initial config after room creation
 * - PlayerListPanel: Saves players array when updated
 * - useQuizConfig: Could auto-save config on updates (not currently implemented)
 *
 * **Future Enhancements:**
 * - Real-time player count badge
 * - Live payment status dashboard (X/Y players paid)
 * - Auto-save config on every wizard step
 * - Room recovery from server if localStorage lost
 * - Multi-host support (delegated control)
 *
 * @component
 * @category Quiz Dashboard
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizConfig } from '../useQuizConfig';
import { usePlayerStore } from '../../../stores/quizPlayerStore';

import SetupSummaryPanel from './SetupSummaryPanel';
import PlayerListPanel from './PlayerListPanel';
import FundraisingExtrasPanel from './FundraisingExtrasPanel';
import PaymentReconciliationPanel from './PaymentReconciliation';

import HostGameControls from '../game/GameControls';

const HostDashboard: React.FC = () => {
  const { config, updateConfig, resetConfig } = useQuizConfig();
  const { resetPlayers, loadPlayersFromStorage } = usePlayerStore(); // [COMPLETE] import load method
  const { roomId } = useParams();
  const navigate = useNavigate();

  // [COMPLETE] Load config and players from localStorage if Zustand is empty
useEffect(() => {
  if (!roomId) return;

  // Load config if Zustand is empty or mismatched
  if (!config.roomId || config.roomId !== roomId) {
    const storedConfig = localStorage.getItem(`quiz_config_${roomId}`);
    if (storedConfig) {
      updateConfig(JSON.parse(storedConfig));
    } else {
      console.warn('No quiz config found in localStorage for room:', roomId);
      navigate('/');
    }
  }

  // Always attempt to load players (Zustand resets on refresh)
  loadPlayersFromStorage(roomId);
}, [roomId]);


  const handleCancelQuiz = () => {
    resetConfig();
    resetPlayers();
    if (roomId) {
      localStorage.removeItem(`quiz_config_${roomId}`);
      localStorage.removeItem(`players_${roomId}`); // [COMPLETE] Clear players too
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-10">
        {/* Page Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">️ Host Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {config?.hostName || 'Host'} — manage your quiz event below.
          </p>
        </div>

        <SetupSummaryPanel />
        <PlayerListPanel />
        <FundraisingExtrasPanel />
        <PaymentReconciliationPanel />
        <HostGameControls />
    

        <div className="text-center pt-8">
          <button
            onClick={handleCancelQuiz}
            className="bg-red-100 text-red-700 px-6 py-2 rounded-xl font-medium hover:bg-red-200 transition"
          >
            [ERROR] Cancel Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;



