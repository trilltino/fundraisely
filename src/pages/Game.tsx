/**
 * GAME.TSX - Main Bingo Game Room Page
 *
 * This is the primary game page where live Bingo games are played. It coordinates real-time multiplayer
 * functionality through WebSocket connections, manages game state, handles win conditions, and processes
 * blockchain transactions for entry fees and prize distributions on the Solana network.
 *
 * ROLE IN THE APPLICATION:
 * This page serves as the game room where players participate in live Bingo games. It is the most complex
 * component in the application, integrating WebSocket real-time communication, Zustand state management,
 * blockchain transaction handling, and React Query for server data fetching. The component manages the
 * complete game lifecycle from player entry through game completion and prize distribution.
 *
 * KEY RESPONSIBILITIES:
 * - Establish and maintain WebSocket connection to game server
 * - Manage player list with ready states and host controls
 * - Display and update Bingo cards with called numbers
 * - Handle win detection (line wins and full house)
 * - Process win declarations and prize distributions
 * - Calculate dynamic prize pools based on player count and entry fees
 * - Implement access control and navigation guards
 * - Handle real-time game events (number calls, player joins/leaves, wins)
 * - Manage game UI state (loading, errors, modals, notifications)
 *
 * GAME FLOW:
 * 1. Player enters room via URL (roomId parameter)
 * 2. Component validates player name and wallet connection
 * 3. WebSocket connection established using new useSocketV2 architecture
 * 4. Player sees waiting room with other players
 * 5. Host starts game when ready
 * 6. Numbers are called automatically or manually by host
 * 7. Players mark numbers on their Bingo cards
 * 8. Win detection triggers on complete line or full house
 * 9. Winners confirmed and blockchain transactions initiated
 * 10. Game ends and prize distribution occurs
 *
 * STATE MANAGEMENT:
 * - Uses new modular store architecture (useGameStore, useSocketStore)
 * - Migrated from monolithic useSocket to useSocketV2
 * - Local component state for UI concerns (modals, notifications)
 * - React Query for blockchain data fetching
 *
 * BLOCKCHAIN INTEGRATION:
 * - Entry fee validation from Solana smart contract
 * - Dynamic prize pool calculation (25% host, 60% prizes, 15% platform)
 * - Prize distribution (30% line win, 70% full house)
 * - Transaction verification and finalization
 *
 * DEPENDENCIES:
 * - useSocketV2 and useSocketStore for real-time communication (new architecture)
 * - useGameStore for shared game state
 * - useGame hook for game mechanics
 * - React Router for navigation and roomId parameter
 * - Framer Motion for animations
 */

import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayerList } from '../components/bingo/PlayerList';
import { GameAccessAlert } from '../components/bingo/alerts/GameAccessAlert';
import GameOverScreen from '../components/bingo/GameOverScreen';
import { useGame } from '../hooks/useGame';
import { useSocketV2 } from '../hooks/useSocketV2';
import { useGameStore } from '../stores/gameStore';
import { useSocketStore } from '../stores/socketStore';
import { WinnerDisplay } from '../components/landing/WinnerDisplay';
import { GameHeader } from '../components/bingo/GameHeader';
import { GameLoader } from '../components/bingo/GameLoader';

import { GameScreen } from '../components/bingo/GameScreen';
import { getRoomCreationData } from '../utils/localStorageUtils';

export function Game() {
  console.log('[Game] [LAUNCH] Mounting Game component', { roomId: useParams().roomId });

  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const [showAccessError, setShowAccessError] = useState(false);
  const [accessErrorMessage, setAccessErrorMessage] = useState('');
  const [showGameOver, setShowGameOver] = useState(false);
  const [lineWinConfirmed, setLineWinConfirmed] = useState(false);
  const [fullHouseWinConfirmed, setFullHouseWinConfirmed] = useState(false);
  const [showWinNotification, setShowWinNotification] = useState(false);
  const [winNotificationType, setWinNotificationType] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [entryFee, setEntryFee] = useState<number | null>(null);

  console.log('[Game]  Initial state', {
    showAccessError,
    showGameOver,
    lineWinConfirmed,
    fullHouseWinConfirmed,
    showWinNotification,
    winNotificationType,
    winnerName,
    entryFee,
  });

  const {
    players,
    playerName,
    lineWinners,
    fullHouseWinners,
    setFullHouseWinners,
    gameStarted,
    isPaused,
    joinError,
    setJoinError,
    lineWinClaimed,
  } = useGameStore();

  console.log('[Game]  Game store state', {
    players,
    playerName,
    lineWinners,
    fullHouseWinners,
    gameStarted,
    isPaused,
    joinError,
    lineWinClaimed,
  });

  // Initialize socket connection using new architecture
  useSocketV2(roomId);

  // Get socket instance from store
  const socket = useSocketStore(state => state.socket);

  const {
    gameState,
    autoPlay,
    handleCellClick,
    toggleAutoPlay,
    unpauseGame,
  } = useGame(socket, roomId);

  console.log('[Game]  Socket and game state', {
    socketId: socket?.id,
    gameState,
    autoPlay,
  });

  // 🆕 Step 1: Load entryFee initially from localStorage
  useEffect(() => {
    console.log('[Game]  useEffect for localStorage entryFee', { roomId, socketId: socket?.id });
    const data = getRoomCreationData();
    if (data?.entryFee) {
      const fee = Number.parseFloat(data.entryFee);
      setEntryFee(fee);
      console.log('[Game] [COMPLETE] Set entryFee from localStorage', { entryFee: fee });
    } else {
      console.log('[Game]  No entryFee in localStorage');
    }
  }, []);

  //  Step 2: Update entryFee from server 'room_update'
  useEffect(() => {
    console.log('[Game]  useEffect for room_update', { socketId: socket?.id });
    const handleRoomUpdate = (data: any) => {
      console.log('[Game]  Received room_update for entryFee', data);
      if (data.entryFee) {
        const fee = Number.parseFloat(data.entryFee);
        setEntryFee(fee);
        console.log('[Game]  Updated entryFee from server', { entryFee: fee });
      }
    };

    if (socket) {
      socket.on('room_update', handleRoomUpdate);
      return () => {
        console.log('[Game]  Cleaning up room_update listener');
        socket.off('room_update', handleRoomUpdate);
      };
    } else {
      console.log('[Game]  No socket for room_update listener');
    }
  }, [socket]);

  console.log('[Game] [MONEY] Entry Fee:', entryFee);

  useEffect(() => {
    if (!socket) return;
  
    const handleFullHouseDeclared = (data: { winners: any[] }) => {
      console.log('[Game] [SUCCESS] Received full_house_winners_declared:', data);
      setFullHouseWinners(data.winners); // update the Zustand store
    };
  
    socket.on('full_house_winners_declared', handleFullHouseDeclared);
  
    return () => {
      socket.off('full_house_winners_declared', handleFullHouseDeclared);
    };
  }, [socket]);
  

  // ️ Access control
  useEffect(() => {
    console.log('[Game]  useEffect for access control', { playerName });
    if (!playerName) {
      setAccessErrorMessage('Please enter your name first.');
      setShowAccessError(true);
      console.log('[Game]  No playerName, showing access error and navigating to /');
      setTimeout(() => {
        console.log('[Game] ️ Navigating to /');
        navigate('/');
      }, 2000);
    }
  }, [playerName, navigate]);

  useEffect(() => {
    console.log('[Game]  useEffect for joinError', { joinError });
    if (joinError) {
      setAccessErrorMessage(joinError);
      setShowAccessError(true);
      setJoinError('');
      console.log('[Game]  Join error, showing access error and navigating to /', { joinError });
      setTimeout(() => {
        console.log('[Game] ️ Navigating to /');
        navigate('/');
      }, 3000);
    }
  }, [joinError, navigate, setJoinError]);

  // [TARGET] Socket event listeners for debugging
  useEffect(() => {
    if (!socket) {
      console.log('[Game]  No socket for event listeners');
      return;
    }

    console.log('[Game]  useEffect for socket events', { socketId: socket.id });
    const handleConnect = () => {
      console.log('[Game] [COMPLETE] Socket connected', { socketId: socket.id });
    };

    const handleDisconnect = (reason: string) => {
      console.error('[Game]  Socket disconnected', { reason, roomId, playerName, socketId: socket.id });
    };

    const handleRoomUpdate = (data: any) => {
      console.log('[Game]  Received room_update', { data });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room_update', handleRoomUpdate);

    return () => {
      console.log('[Game]  Cleaning up socket event listeners', { socketId: socket.id });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room_update', handleRoomUpdate);
    };
  }, [socket, roomId, playerName]);

  // [TARGET] Handlers
  const handleConfirmLineWin = useCallback(() => {
    console.log('[Game]  Emitting declare_line_winners', { roomId });
    socket?.emit('declare_line_winners', { roomId });
    setLineWinConfirmed(true);
    console.log('[Game] [COMPLETE] Set lineWinConfirmed', { lineWinConfirmed: true });
  }, [socket, roomId]);

  const handleConfirmFullHouseWin = useCallback(() => {
    console.log('[Game]  Emitting declare_full_house_winners', { roomId });
    socket?.emit('declare_full_house_winners', { roomId });
    setFullHouseWinConfirmed(true);
    setShowGameOver(true);
    console.log('[Game] [COMPLETE] Set fullHouseWinConfirmed and showGameOver', {
      fullHouseWinConfirmed: true,
      showGameOver: true,
    });
  }, [socket, roomId]);

  const handleToggleReady = useCallback(() => {
    console.log('[Game]  Emitting toggle_ready', { roomId });
    socket?.emit('toggle_ready', { roomId });
  }, [socket, roomId]);

  const handleStartGame = useCallback(() => {
    console.log('[Game]  Emitting start_game', { roomId, playerName, socketId: socket?.id });
    socket?.emit('start_game', { roomId });
    console.log('[Game] [COMPLETE] Start game emitted');
  }, [socket, roomId, playerName]);

  const closeWinNotification = useCallback(() => {
    console.log('[Game]  Closing win notification');
    setShowWinNotification(false);
  }, []);

  // [WINNER] Win notifications
  useEffect(() => {
    console.log('[Game] [SEARCH] Checking lineWinners for notification', { lineWinners, showWinNotification });
    if (lineWinners.length > 0 && !showWinNotification) {
      const winner = lineWinners[lineWinners.length - 1];
      setWinnerName(winner.name);
      setWinNotificationType('line');
      setShowWinNotification(true);
      console.log('[Game] [COMPLETE] Showing line win notification', { winnerName: winner.name });
    }
  }, [lineWinners, showWinNotification]);

  useEffect(() => {
    console.log('[Game] [SEARCH] Checking fullHouseWinners for notification', { fullHouseWinners, showWinNotification });
    if (fullHouseWinners.length > 0 && !showWinNotification) {
      const winner = fullHouseWinners[fullHouseWinners.length - 1];
      setWinnerName(winner.name);
      setWinNotificationType('fullHouse');
      setShowWinNotification(true);
      console.log('[Game] [COMPLETE] Showing full house win notification', { winnerName: winner.name });
    }
  }, [fullHouseWinners, showWinNotification]);

  useEffect(() => {
    console.log('[Game] [SEARCH] Checking lineWinConfirmed for notification', { lineWinConfirmed, winNotificationType });
    if (lineWinConfirmed && winNotificationType === 'line') {
      setShowWinNotification(false);
      console.log('[Game] [COMPLETE] Closed line win notification');
    }
  }, [lineWinConfirmed, winNotificationType]);

  useEffect(() => {
    console.log('[Game] [SEARCH] Checking fullHouseWinConfirmed for notification', { fullHouseWinConfirmed, winNotificationType });
    if (fullHouseWinConfirmed && winNotificationType === 'fullHouse') {
      setShowWinNotification(false);
      console.log('[Game] [COMPLETE] Closed full house win notification');
    }
  }, [fullHouseWinConfirmed, winNotificationType]);

  // [TARGET] Handle game over from server
  useEffect(() => {
    if (!socket) {
      console.log('[Game]  No socket for game_over listener');
      return;
    }

    console.log('[Game]  useEffect for game_over', { socketId: socket.id });
    const handleGameOver = () => {
      console.log('[Game] [FINISH] Game Over event received');
      setShowGameOver(true);
    };

    socket.on('game_over', handleGameOver);

    return () => {
      console.log('[Game]  Cleaning up game_over listener');
      socket.off('game_over', handleGameOver);
    };
  }, [socket]);

  const currentPlayer = Array.isArray(players)
    ? players.find((p) => p.name === playerName)
    : undefined;

  const isHost = currentPlayer?.isHost || false;
  const isWinner = lineWinners.some((w) => w.id === socket?.id) || fullHouseWinners.some((w) => w.id === socket?.id);

  console.log('[Game]  Current player and host status', {
    currentPlayer,
    isHost,
    isWinner,
  });

  // [TARGET] Calculate dynamic stats
  const realPlayersCount = Math.max(0, (Array.isArray(players) ? players.length : 0) - 1);
  const totalIntake = entryFee ? realPlayersCount * entryFee : 0;
  const hostReward = totalIntake * 0.25;
  const playerPrizePool = totalIntake * 0.60;
  const linePrize = playerPrizePool * 0.30;
  const fullHousePrize = playerPrizePool * 0.70;
  const maxPlayersAllowed = entryFee ? Math.floor(1000 / entryFee) : 0;
  const isRoomFull = maxPlayersAllowed > 0 && realPlayersCount >= maxPlayersAllowed;

  console.log('[Game] [STATS] Game stats', {
    realPlayersCount,
    totalIntake,
    hostReward,
    playerPrizePool,
    linePrize,
    fullHousePrize,
    maxPlayersAllowed,
    isRoomFull,
  });

  console.log('[Game] ↩️ Rendering component', { roomId, socketId: socket?.id });

  return (
    <div className="container mx-auto px-4 py-20 min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <AnimatePresence>
        {showAccessError && (
          <GameAccessAlert
            message={accessErrorMessage}
            onClose={() => setShowAccessError(false)}
          />
        )}
      </AnimatePresence>

      {/* [WINNER] Game Header */}
      <GameHeader roomId={roomId} />

      {entryFee && (
        <motion.div
          key={realPlayersCount}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-indigo-100 rounded-xl p-6 mb-8 text-center text-indigo-900 shadow-md"
        >
          <h2 className="text-lg font-bold mb-2">[TARGET] Game Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold">Players</p>
              <p>
                {realPlayersCount} / {maxPlayersAllowed}
              </p>
            </div>
            <div>
              <p className="font-semibold">Total Intake</p>
              <p>{totalIntake.toFixed(2)} USDC</p>
            </div>
            <div>
              <p className="font-semibold">Host Reward</p>
              <p>{hostReward.toFixed(2)} USDC</p>
            </div>
            <div>
              <p className="font-semibold">Line Prize</p>
              <p>{linePrize.toFixed(2)} USDC</p>
            </div>
            <div>
              <p className="font-semibold">Full House Prize</p>
              <p>{fullHousePrize.toFixed(2)} USDC</p>
            </div>
          </div>
        </motion.div>
      )}

      {isRoomFull && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-xl p-4 mb-6 text-center shadow-md">
          [URGENT] Room Full! No more players can join this event.
        </div>
      )}

      {/*  Winner Display */}
      <WinnerDisplay
        lineWinners={lineWinners}
        fullHouseWinners={fullHouseWinners}
      />

      {/* [TARGET] Main Game Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <div className="lg:col-span-3 space-y-6">
          {!gameStarted ? (
            <GameLoader isHost={isHost} />
          ) : (
            <GameScreen
              socket={socket}
              gameState={gameState}
              playerName={playerName}
              isHost={isHost}
              isPaused={isPaused}
              isWinner={isWinner}
              autoPlay={autoPlay}
              lineWinners={lineWinners}
              fullHouseWinners={fullHouseWinners}
              lineWinConfirmed={lineWinConfirmed}
              fullHouseWinConfirmed={fullHouseWinConfirmed}
              lineWinClaimed={lineWinClaimed}
              showWinNotification={showWinNotification}
              winNotificationType={winNotificationType as 'line' | 'fullHouse'}
              winnerName={winnerName}
              onConfirmLineWin={handleConfirmLineWin}
              onConfirmFullHouseWin={handleConfirmFullHouseWin}
              onCellClick={handleCellClick}
              onToggleAutoPlay={toggleAutoPlay}
              onUnpauseGame={unpauseGame}
              onCloseWinNotification={closeWinNotification}
              showGameOver={showGameOver}
            />
          )}
        </div>

        {/* [GAME] Player List */}
        <div className="lg:col-span-1">
          <PlayerList
            players={Array.isArray(players) ? players : []}
            currentPlayerId={socket?.id || ''}
            onToggleReady={handleToggleReady}
            onStartGame={handleStartGame}
            gameStarted={gameStarted}
          />
        </div>
      </div>

      {/*  Game Over Screen */}
      {showGameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <GameOverScreen
            lineWinners={lineWinners}
            fullHouseWinners={fullHouseWinners}
            roomId={roomId}
          />
        </div>
      )}
    </div>
  );
}
