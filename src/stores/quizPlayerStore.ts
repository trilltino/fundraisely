/**
 * QUIZ PLAYER STORE - Quiz Mode Player State Management
 *
 * PURPOSE:
 * This Zustand store manages player state for the Quiz game mode. Unlike the Bingo
 * playerStore which handles Bingo-specific player data, this store is dedicated to
 * Quiz mode player management including payment tracking, credits, and fundraising extras.
 *
 * KEY RESPONSIBILITIES:
 * - Track quiz players (name, ID, payment status)
 * - Manage payment methods (cash, Revolut, web3)
 * - Handle player credits for quiz gameplay
 * - Track fundraising extras purchased by players
 * - Persist player data to localStorage per quiz room
 * - Load players from localStorage on room rejoin
 *
 * ROLE IN APPLICATION:
 * - Used exclusively by Quiz game mode components
 * - Separate from Bingo playerStore to avoid state conflicts
 * - Integrates with Quiz dashboard for host management
 * - Syncs with localStorage for persistence across page refreshes
 *
 * PLAYER DATA STRUCTURE:
 * - id: Unique player identifier (socket ID or generated)
 * - name: Player's display name
 * - paid: Boolean payment status flag
 * - paymentMethod: 'cash' | 'revolut' | 'web3' | 'unknown'
 * - credits: Number of credits for quiz participation
 * - extras: Array of extra items purchased (e.g., 'snacks', 'merch')
 * - extraPayments: Map of extra items to payment details
 *
 * LOCALSTORAGE INTEGRATION:
 * - Stores players array per room: players_{roomId}
 * - Auto-saves on every state change (add, toggle, update)
 * - Loads on demand via loadPlayersFromStorage(roomId)
 * - Enables persistence across page refreshes and reconnects
 *
 * STATE ACTIONS:
 * - addPlayer(player, roomId): Add new player and persist
 * - togglePaid(id, roomId): Toggle payment status
 * - adjustCredits(id, delta): Add/subtract credits
 * - resetPlayers(): Clear all players (new game)
 * - toggleExtraForPlayer(id, extra, roomId): Add/remove extra item
 * - updateExtraPayment(playerId, extra, method, amount, roomId): Record extra payment
 * - loadPlayersFromStorage(roomId): Restore players from localStorage
 *
 * USAGE EXAMPLE:
 * ```typescript
 * import { usePlayerStore } from '@/stores/quizPlayerStore';
 *
 * function QuizDashboard({ roomId }) {
 *   const { players, addPlayer, togglePaid } = usePlayerStore();
 *
 *   useEffect(() => {
 *     loadPlayersFromStorage(roomId);
 *   }, [roomId]);
 *
 *   return (
 *     <div>
 *       {players.map(player => (
 *         <div key={player.id}>
 *           {player.name} - {player.paid ? 'Paid' : 'Unpaid'}
 *           <button onClick={() => togglePaid(player.id, roomId)}>
 *             Toggle
 *           </button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * RELATED FILES:
 * - src/components/Quiz/dashboard/HostDashboard.tsx - Main consumer
 * - src/components/Quiz/dashboard/PlayerListPanel.tsx - Player list display
 * - src/components/Quiz/dashboard/PaymentReconciliation.tsx - Payment tracking
 * - src/components/Quiz/dashboard/FundraisingExtrasPanel.tsx - Extras management
 * - src/stores/playerStore.ts - Bingo player store (separate concern)
 */

import { create } from 'zustand';

export interface Player {
  id: string;
  name: string;
  paid: boolean;
  paymentMethod: 'cash' | 'revolut' | 'web3' | 'unknown';
  credits: number;
  isReady?: boolean;
  isHost?: boolean;
  extras?: string[];
  extraPayments?: {
    [extraKey: string]: {
      method: 'cash' | 'revolut' | 'other';
      amount: number;
    };
  };
}


interface PlayerState {
  players: Player[];
  addPlayer: (player: Player, roomId?: string) => void;
  togglePaid: (id: string, roomId?: string) => void;
  adjustCredits: (id: string, delta: number) => void;
  resetPlayers: () => void;
  toggleExtraForPlayer: (id: string, extra: string, roomId?: string) => void;

  updateExtraPayment: (
    playerId: string,
    extraKey: string,
    method: 'cash' | 'revolut' | 'other',
    amount: number,
    roomId: string
  ) => void;
  loadPlayersFromStorage: (roomId: string) => void; // [COMPLETE] NEW
}


export const usePlayerStore = create<PlayerState>((set) => ({
  players: [],

  addPlayer: (player, roomId) =>
    set((state) => {
      const updatedPlayers = [...state.players, player];
      if (roomId) {
        localStorage.setItem(`players_${roomId}`, JSON.stringify(updatedPlayers));
      }
      return { players: updatedPlayers };
    }),

 togglePaid: (id, roomId) =>
  set((state) => {
    const updatedPlayers = state.players.map((p) =>
      p.id === id ? { ...p, paid: !p.paid } : p
    );

    if (roomId) {
      localStorage.setItem(`players_${roomId}`, JSON.stringify(updatedPlayers));
    }

    return { players: updatedPlayers };
  }),


  adjustCredits: (id, delta) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === id ? { ...p, credits: Math.max(0, p.credits + delta) } : p
      ),
    })),

  resetPlayers: () => set({ players: [] }),

  toggleExtraForPlayer: (id, extra, roomId) =>
  set((state) => {
    const updatedPlayers = state.players.map((p) => {
      if (p.id !== id) return p;
      const extras = new Set(p.extras || []);
      if (extras.has(extra)) {
        extras.delete(extra);
      } else {
        extras.add(extra);
      }
      return { ...p, extras: Array.from(extras) };
    });

    if (roomId) {
      localStorage.setItem(`players_${roomId}`, JSON.stringify(updatedPlayers));
    }

    return { players: updatedPlayers };
  }),

updateExtraPayment: (playerId, extraKey, method, amount, roomId) =>
  set((state) => {
    const updatedPlayers = state.players.map((p) => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        extraPayments: {
          ...p.extraPayments,
          [extraKey]: { method, amount },
        },
      };
    });

    if (roomId) {
      localStorage.setItem(`players_${roomId}`, JSON.stringify(updatedPlayers));
    }

    return { players: updatedPlayers };
  }),


 loadPlayersFromStorage: (roomId) => {
  console.log(' Loading players from localStorage for:', roomId);
  const stored = localStorage.getItem(`players_${roomId}`);
  if (stored) {
    const parsed: Player[] = JSON.parse(stored);
    console.log('[COMPLETE] Loaded players:', parsed);
    set({ players: parsed });
  } else {
    console.log('️ No players found for room:', roomId);
  }
}
,
}));
