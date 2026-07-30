import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { URL as configURL } from '../config';

const API_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_URL || configURL || '';
const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/+$/, '');

export function useSocket(storeId?: number | string) {
  const [socket, setSocket] = useState<Socket | undefined>(undefined);

  useEffect(() => {
    const token = sessionStorage.getItem('staffToken') || localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token || !SOCKET_URL) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });
    
    const onConnect = () => {
      if (storeId) {
        newSocket.emit('join:store', { storeId });
      }
    };

    newSocket.on('connect', onConnect);
    if (newSocket.connected && storeId) {
      newSocket.emit('join:store', { storeId });
    }

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [storeId]);

  // Return an object that has a `current` property to maintain backwards compatibility
  // with components expecting a ref, while still triggering re-renders when the state changes.
  return { current: socket };
}
