import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Derive the socket server URL from VITE_API_URL (strip /api suffix if present)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

export function useSocket(storeId: number) {
  const socket = useRef<Socket | undefined>(undefined);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('partnerToken') || sessionStorage.getItem('staffToken');
    socket.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });
    socket.current.emit('join:store', { storeId });

    return () => {
      socket.current?.disconnect();
    };
  }, [storeId]);

  return socket;
}
