import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOfflineStore = create(
  persist(
    (set, get) => ({
      queue: [],

      addOrderToQueue: (payload) => {
        const tempId = `OFFLINE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const newOrder = {
          tempId,
          payload,
          createdAt: new Date().toISOString(),
          status: 'PENDING', // PENDING, FAILED
          error: null,
        };
        set((state) => ({
          queue: [...state.queue, newOrder],
        }));
        return tempId;
      },

      removeOrderFromQueue: (tempId) => {
        set((state) => ({
          queue: state.queue.filter((o) => o.tempId !== tempId),
        }));
      },

      markOrderFailed: (tempId, error) => {
        set((state) => ({
          queue: state.queue.map((o) =>
            o.tempId === tempId ? { ...o, status: 'FAILED', error } : o
          ),
        }));
      },
    }),
    {
      name: 'offline-orders-storage',
    }
  )
);
