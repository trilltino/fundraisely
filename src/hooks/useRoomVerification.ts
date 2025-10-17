// src/hooks/useRoomVerification.ts
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

type VerificationStatus = 'idle' | 'checking' | 'exists' | 'not_exists' | 'error';

interface UseRoomVerificationReturn {
  verifyRoom: (roomId: string) => Promise<{
    exists: boolean;
    chainId?: string | number;
    contractAddress?: string;
    namespace?: string;
    entryFee?: string;
  }>;
  status: VerificationStatus;
  error: string;
}

export function useRoomVerification(): UseRoomVerificationReturn {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string>('');
  const [verificationSocket, setVerificationSocket] = useState<Socket | null>(null);

  useEffect(() => {
    console.log('🔌 Initializing verification socket with URL:', SOCKET_URL);
    const socket = io(SOCKET_URL, { autoConnect: false });

    socket.on('connect', () => {
      console.log('✅ Verification socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Verification socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('🚫 Verification socket connection error:', error);
    });

    setVerificationSocket(socket);

    return () => {
      if (socket?.connected) {
        console.log('🔌 Cleaning up verification socket');
        socket.disconnect();
      }
    };
  }, []);

  const verifyRoom = useCallback(
    async (roomId: string): Promise<{
      exists: boolean;
      chainId?: string | number;
      contractAddress?: string;
      namespace?: string;
      entryFee?: string;
    }> => {
      if (!verificationSocket) {
        setError('Verification service not available');
        setStatus('error');
        return { exists: false };
      }

      return new Promise((resolve) => {
        console.log('🔍 Starting room verification for:', roomId);
        setStatus('checking');
        setError('');

        if (!verificationSocket.connected) {
          console.log('🔌 Socket not connected, connecting now...');
          verificationSocket.connect();
        } else {
          console.log('✅ Socket already connected');
        }

        const timeoutId = setTimeout(() => {
          console.error('⏱️ Verification timed out for room:', roomId);
          setError('Verification timed out');
          setStatus('error');
          resolve({ exists: false });
        }, 5000);

        const handleVerificationResult = (data: {
          roomId: string;
          exists: boolean;
          chainId?: string | number;
          contractAddress?: string;
          namespace?: string;
          entryFee?: string;
        }) => {
          console.log('📨 Received verification result:', data);
          if (data.roomId === roomId) {
            clearTimeout(timeoutId);

            if (data.exists) {
              console.log('✅ Room exists!', data);
              setStatus('exists');
              resolve({
                exists: true,
                chainId: data.chainId,
                contractAddress: data.contractAddress,
                namespace: data.namespace,
                entryFee: data.entryFee,
              });
            } else {
              console.log('❌ Room does not exist:', roomId);
              setStatus('not_exists');
              setError('Room does not exist');
              resolve({ exists: false });
            }

            verificationSocket.off('room_verification_result', handleVerificationResult);
          }
        };

        verificationSocket.on('room_verification_result', handleVerificationResult);
        console.log('📤 Emitting verify_room_exists event for:', roomId);
        verificationSocket.emit('verify_room_exists', { roomId });
      });
    },
    [verificationSocket]
  );

  return {
    verifyRoom,
    status,
    error,
  };
}

