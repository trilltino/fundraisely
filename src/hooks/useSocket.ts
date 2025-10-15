/**
 * WebSocket Connection Hook
 *
 * Manages real-time bidirectional communication with the Node.js backend server for multiplayer
 * room synchronization. Establishes Socket.io connection with automatic reconnection on disconnect,
 * and provides methods for room lifecycle: create_room, join_room, toggle_ready, start_game.
 * Listens for server events (room_update, game_started, number_called) and maintains local
 * RoomState reflecting current players, host, ready status, and game progress. Used by RoomPage
 * to display live room state and enable player interactions. Integrates with backend server in
 * server/ directory and coordinates with useFundraiselyContract for on-chain payment verification.
 */

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface RoomState {
  roomId: string;
  host: string;
  players: Player[];
  gameStarted: boolean;
  gameOver: boolean;
  currentNumber: number | null;
  calledNumbers: number[];
  winners: string[];
}

export interface Player {
  id: string;
  wallet: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export function useSocket(_roomId?: string) { // TODO: Auto-join room on connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('room_update', (state: RoomState) => {
      console.log('Room update:', state);
      setRoomState(state);
    });

    newSocket.on('game_started', (data) => {
      console.log('Game started:', data);
    });

    newSocket.on('number_called', (data) => {
      console.log('Number called:', data);
    });

    newSocket.on('create_error', (error) => {
      console.error('Create error:', error);
    });

    newSocket.on('join_error', (error) => {
      console.error('Join error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = useCallback(
    (data: {
      roomId: string;
      playerName: string;
      walletAddress: string;
      contractAddress: string;
      entryFee: string;
    }) => {
      if (!socket) return;
      socket.emit('create_room', data);
    },
    [socket]
  );

  const joinRoom = useCallback(
    (data: { roomId: string; playerName: string; walletAddress: string }) => {
      if (!socket) return;
      socket.emit('join_room', data);
    },
    [socket]
  );

  const toggleReady = useCallback(
    (roomId: string) => {
      if (!socket) return;
      socket.emit('toggle_ready', { roomId });
    },
    [socket]
  );

  const startGame = useCallback(
    (roomId: string) => {
      if (!socket) return;
      socket.emit('start_game', { roomId });
    },
    [socket]
  );

  return {
    socket,
    connected,
    roomState,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
  };
}
