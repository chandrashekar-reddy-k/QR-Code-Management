import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

export function useCashSocket({
  date,
  storeId,
  onUpdate
}: {
  date?: string;
  storeId?: string | null;
  onUpdate: (payload?: any) => void;
}) {
  const socketObj = useSocket(storeId || undefined);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const socket = socketObj?.current;
    if (!socket) return;

    const handleCashUpdate = (data: any) => {
      console.log('[CashSocket] Live Update event received:', data);
      if (!data?.date || !date || data.date === date) {
        if (onUpdateRef.current) {
          onUpdateRef.current(data);
        }
      }
    };

    socket.on('cash:update', handleCashUpdate);
    socket.on('cash:store_register_updated', handleCashUpdate);
    socket.on('cash:deposit_updated', handleCashUpdate);
    socket.on('cash:safe_updated', handleCashUpdate);
    socket.on('cash:bank_deposit_updated', handleCashUpdate);

    if (storeId) {
      socket.on(`cash:store:${storeId}`, handleCashUpdate);
    }

    return () => {
      socket.off('cash:update', handleCashUpdate);
      socket.off('cash:store_register_updated', handleCashUpdate);
      socket.off('cash:deposit_updated', handleCashUpdate);
      socket.off('cash:safe_updated', handleCashUpdate);
      socket.off('cash:bank_deposit_updated', handleCashUpdate);
      if (storeId) {
        socket.off(`cash:store:${storeId}`, handleCashUpdate);
      }
    };
  }, [socketObj?.current, date, storeId]);
}
