import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { URL as configURL } from '../config';

const API_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_URL || configURL || '';
const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/+$/, '');

export function useSocket(storeId?: number | string) {
  const socket = useRef<Socket | undefined>(undefined);

  useEffect(() => {
<<<<<<< HEAD
    const token = sessionStorage.getItem('staffToken') || localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token || !SOCKET_URL) return;

    socket.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
=======
    const token = localStorage.getItem('token') || localStorage.getItem('partnerToken') || sessionStorage.getItem('staffToken');
    socket.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token }
>>>>>>> erp/shopweb
    });
    if (storeId) {
      socket.current.emit('join:store', { storeId });
    }

    return () => {
      socket.current?.disconnect();
    };
  }, [storeId]);

  return socket;
}
