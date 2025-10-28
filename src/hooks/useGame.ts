/**
 * USE GAME HOOK - Client-Side Bingo Game State Management
 *
 * PURPOSE:
 * This React hook is the central state manager for the client-side Bingo game experience.
 * It orchestrates the complete lifecycle of a player's Bingo card, handles real-time updates
 * from the WebSocket server, manages player interactions (marking cells, claiming wins), and
 * coordinates between local component state and global game store state.
 *
 * ROLE IN REAL-TIME GAME COORDINATION:
 * - Maintains player's Bingo card state (25 cells with marked/unmarked status)
 * - Listens to Socket.io events from server for number calls, auto-play updates, winners
 * - Emits player actions to server (cell marks, win claims, card updates)
 * - Synchronizes local game state with global Zustand store for cross-component access
 * - Handles win detection logic (line wins, full house wins) in real-time
 * - Provides callback functions for game controls (auto-play, pause, number calling)
 *
 * INTEGRATION WITH FRONTEND & SOLANA PROGRAM:
 *
 * Frontend Integration:
 *   - Used by Game.tsx (main game page component) to manage gameplay
 *   - Provides gameState to BingoCard component for rendering and interaction
 *   - Supplies control callbacks to GameControls (auto-play, pause, unpause)
 *   - Coordinates with useGameStore (Zustand) for global state (winners, paused state)
 *   - Listens to NumberCaller component for displaying current/called numbers
 *
 * WebSocket Server Integration:
 *   - Receives from server: number_called, auto_play_update, game_paused, winner events
 *   - Sends to server: update_card, player_line_won, player_full_house_won, toggle_auto_play
 *   - All communication happens via Socket.io client passed as parameter
 *   - Server events trigger local state updates and UI re-renders
 *
 * Solana Program Coordination:
 *   - This hook handles ONLY game mechanics, NOT financial transactions
 *   - Win detection triggers socket events; prize distribution handled separately
 *   - When full house won: emits socket event, later triggers Solana transaction
 *   - Pattern: useGame (gameplay) -> socket event -> Solana transaction (prizes)
 *
 * KEY RESPONSIBILITIES:
 * 1. Card Management: Initialize, update, and persist player's Bingo card state
 * 2. Cell Interaction: Handle player clicks to mark/unmark numbers when called
 * 3. Win Detection: Check for line/full house wins after each cell mark
 * 4. Socket Listening: Subscribe to all game-related Socket.io events
 * 5. Socket Emission: Send player actions and state updates to server
 * 6. State Synchronization: Keep local state in sync with global store
 * 7. Game Controls: Provide functions for auto-play, pause, number calling
 * 8. Validation: Prevent marking uncalled numbers, marking after game over
 *
 * STATE STRUCTURE:
 * GameState (local):
 *   - card: BingoCell[] - 25 cells with {number, marked} for player's card
 *   - calledNumbers: number[] - All numbers called by server so far
 *   - currentNumber: number | null - Most recently called number
 *   - hasWonLine: boolean - Player has won at least one line
 *   - hasWonFullHouse: boolean - Player has won full house (all 25 cells)
 *
 * Global Store (Zustand):
 *   - autoPlay: boolean - Auto-play mode enabled/disabled
 *   - lineWinners: {id, name}[] - All players who won line prize
 *   - fullHouseWinners: {id, name}[] - All players who won full house
 *   - isPaused: boolean - Game paused state
 *   - lineWinClaimed: boolean - Line prize has been claimed (blocks future line wins)
 *
 * DATA FLOW:
 * 1. Server calls number -> 'number_called' event -> Update calledNumbers & currentNumber
 * 2. Player clicks cell -> Check if number was called -> Mark cell -> Check for win
 * 3. Win detected -> Emit 'player_line_won' or 'player_full_house_won' to server
 * 4. Server validates win -> Broadcasts winner to all players -> Update winners in store
 * 5. Auto-play toggle -> Emit 'toggle_auto_play' -> Server responds with 'auto_play_update'
 * 6. Pause/unpause -> Emit event -> Server broadcasts pause state to all players
 *
 * SOCKET.IO EVENTS:
 * Received from Server:
 *   - number_called: {currentNumber, calledNumbers} - New number called
 *   - auto_play_update: {autoPlay} - Auto-play state changed
 *   - game_paused: {} - Game paused by host
 *   - game_unpaused: {} - Game resumed by host
 *   - line_winners_proposed: {winners} - Pending line winner validation
 *   - line_winners_declared: {winners} - Confirmed line winners
 *   - full_house_winners_proposed: {winners} - Pending full house validation
 *   - full_house_winners_declared: {winners} - Confirmed full house winners
 *
 * Sent to Server:
 *   - update_card: {roomId, card} - Player's card state changed
 *   - player_line_won: {roomId} - Player claims line win
 *   - player_full_house_won: {roomId} - Player claims full house win
 *   - call_number: {roomId} - Manual number call request
 *   - toggle_auto_play: {roomId} - Toggle auto-play mode
 *   - unpause_game: {roomId} - Request to unpause game
 *   - new_game: {roomId} - Start new game after completion
 *
 * WIN DETECTION LOGIC:
 * - Handled by checkWin() from gameLogic.ts
 * - Line Win: Any complete row, column, or diagonal (first occurrence only)
 * - Full House: All 25 cells marked
 * - Validation: Only allows marking if number was called by server
 * - Debouncing: Prevents duplicate win claims via hasWonLine/hasWonFullHouse flags
 *
 * USAGE EXAMPLE:
 * ```tsx
 * function Game() {
 *   const socket = useSocket(WEBSOCKET_URL);
 *   const { roomId } = useParams();
 *   const {
 *     gameState,
 *     autoPlay,
 *     handleCellClick,
 *     callNumber,
 *     toggleAutoPlay,
 *     unpauseGame,
 *     startNewGame,
 *   } = useGame(socket, roomId);
 *
 *   return (
 *     <>
 *       <BingoCard cells={gameState.card} onCellClick={handleCellClick} />
 *       <NumberCaller
 *         currentNumber={gameState.currentNumber}
 *         calledNumbers={gameState.calledNumbers}
 *         autoPlay={autoPlay}
 *       />
 *       <GameControls
 *         onToggleAutoPlay={toggleAutoPlay}
 *         onUnpauseGame={unpauseGame}
 *         autoPlay={autoPlay}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * CLEANUP:
 * - Automatically unsubscribes from all socket events on unmount
 * - Prevents memory leaks and duplicate event handlers
 * - useEffect cleanup runs when socket instance changes or component unmounts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { generateBingoCard, checkWin } from '../utils/gameLogic';
import type { WinResult } from '../utils/gameLogic';
import type { GameState } from '../types/game';
import { useGameStore } from '../stores/gameStore';
import type { Socket } from 'socket.io-client';

interface NumberCalledPayload {
  currentNumber: number;
  calledNumbers: number[];
}

interface WinnersPayload {
  winners: { id: string; name: string }[];
}

interface AutoPlayPayload {
  autoPlay: boolean;
}

/**
 * Return type for useGame hook
 */
interface UseGameReturn {
  gameState: GameState;
  autoPlay: boolean;
  handleCellClick: (index: number) => void;
  callNumber: () => void;
  startNewGame: () => void;
  toggleAutoPlay: () => void;
  unpauseGame: () => void;
}

/**
 * Custom hook for managing Bingo game state and interactions
 * @param socket - Socket.io client instance
 * @param roomId - Current game room ID
 * @returns Game state and interaction handlers
 */
export function useGame(socket: Socket | null, roomId: string): UseGameReturn {
  const [gameState, setGameState] = useState<GameState>(() => {
    const numbers = generateBingoCard();
    return {
      card: numbers.map((number) => ({ number, marked: false })),
      calledNumbers: [],
      currentNumber: null,
      hasWonLine: false,
      hasWonFullHouse: false,
    };
  });

  const {
    autoPlay,
    setAutoPlay,
    calledNumbers: storeCalledNumbers,
    currentNumber: storeCurrentNumber,
    lineWinClaimed,
    setHasWonLine,
    setHasWonFullHouse,
    isPaused,
    lineWinners,
    fullHouseWinners,
    socket: storeSocket,
  } = useGameStore();

  // ✅ OPTIMIZED: Use useMemo instead of useEffect for derived state
  // (from React docs: "You Might Not Need an Effect")
  // This avoids unnecessary state updates and re-renders
  const derivedGameState = useMemo(
    () => ({
      ...gameState,
      calledNumbers: storeCalledNumbers,
      currentNumber: storeCurrentNumber,
      hasWonLine: lineWinners.some((w) => w.id === storeSocket?.id),
      hasWonFullHouse: fullHouseWinners.some((w) => w.id === storeSocket?.id),
    }),
    [gameState, storeCalledNumbers, storeCurrentNumber, lineWinners, fullHouseWinners, storeSocket]
  );

  useEffect(() => {
    if (socket && gameState.card) {
      socket.emit('update_card', { roomId, card: gameState.card });
    }
  }, [socket, gameState.card, roomId]);

  // ✅ OPTIMIZED: Removed gameState.hasWonFullHouse from dependencies
  // Use derivedGameState instead to avoid unnecessary callback re-creations
  const handleCellClick = useCallback(
    (index: number) => {
      if (isPaused) return;

      setGameState((prev) => {
        // Check hasWonFullHouse from prev state (current state at time of click)
        if (prev.hasWonFullHouse) return prev;
        if (!prev.calledNumbers.includes(prev.card[index].number)) return prev;

        const newCard = [...prev.card];
        newCard[index] = { ...newCard[index], marked: !newCard[index].marked };
        const winResult: WinResult = checkWin(newCard, lineWinClaimed);

        const newState = {
          ...prev,
          card: newCard,
          hasWonLine: prev.hasWonLine || winResult.type === 'line',
          hasWonFullHouse: winResult.type === 'full_house',
        };

        if (winResult.type === 'line' && !prev.hasWonLine && !lineWinClaimed) {
          socket?.emit('player_line_won', { roomId });
          setHasWonLine(true);
        } else if (winResult.type === 'full_house' && !prev.hasWonFullHouse) {
          socket?.emit('player_full_house_won', { roomId });
          setHasWonFullHouse(true);
        }

        return newState;
      });
    },
    [lineWinClaimed, socket, roomId, setHasWonLine, setHasWonFullHouse, isPaused]
  );

  const unpauseGame = useCallback(() => {
    socket?.emit('unpause_game', { roomId });
  }, [socket, roomId]);

  const callNumber = useCallback(() => {
    socket?.emit('call_number', { roomId });
  }, [socket, roomId]);

  const startNewGame = useCallback(() => {
    socket?.emit('new_game', { roomId });
    const numbers = generateBingoCard();
    setGameState({
      card: numbers.map((number) => ({ number, marked: false })),
      calledNumbers: [],
      currentNumber: null,
      hasWonLine: false,
      hasWonFullHouse: false,
    });
    useGameStore.setState({
      calledNumbers: [],
      currentNumber: null,
      lineWinners: [],
      fullHouseWinners: [],
      lineWinClaimed: false,
      isPaused: false,
      gameStarted: false,
    });
  }, [socket, roomId]);

  const toggleAutoPlay = useCallback(() => {
    socket?.emit('toggle_auto_play', { roomId });
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('number_called', ({ currentNumber, calledNumbers }: NumberCalledPayload) => {
      setGameState((prev) => ({ ...prev, currentNumber, calledNumbers }));
      useGameStore.getState().setCalledNumbers(calledNumbers);
      useGameStore.getState().setCurrentNumber(currentNumber);
    });

    socket.on('auto_play_update', ({ autoPlay }: AutoPlayPayload) => {
      setAutoPlay(autoPlay);
    });

    socket.on('game_paused', () => {
      useGameStore.getState().setIsPaused(true);
    });

    socket.on('game_unpaused', () => {
      useGameStore.getState().setIsPaused(false);
    });

    socket.on('line_winners_proposed', ({ winners }: WinnersPayload) => {
      useGameStore.getState().setLineWinners(winners);
    });

    socket.on('line_winners_declared', ({ winners }: WinnersPayload) => {
      useGameStore.getState().setLineWinners(winners);
      useGameStore.getState().setLineWinClaimed(true);
    });

    socket.on('full_house_winners_proposed', ({ winners }: WinnersPayload) => {
      useGameStore.getState().setFullHouseWinners(winners);
    });

    socket.on('full_house_winners_declared', ({ winners }: WinnersPayload) => {
      useGameStore.getState().setFullHouseWinners(winners);
    });

    return () => {
      socket.off('number_called');
      socket.off('auto_play_update');
      socket.off('game_paused');
      socket.off('game_unpaused');
      socket.off('line_winners_proposed');
      socket.off('line_winners_declared');
      socket.off('full_house_winners_proposed');
      socket.off('full_house_winners_declared');
    };
  }, [socket, setAutoPlay]);

  return {
    gameState: derivedGameState,
    autoPlay,
    handleCellClick,
    callNumber,
    startNewGame,
    toggleAutoPlay,
    unpauseGame,
  };
}
