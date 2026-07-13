import { createContext, useContext } from "react";

interface SharedOrdersContextType {
  orders: any[];
  loading: boolean;
  refreshOrders: () => Promise<void>;
}

export const SharedOrdersContext = createContext<SharedOrdersContextType | undefined>(undefined);

export function useSharedOrders() {
  const context = useContext(SharedOrdersContext);
  if (!context) {
    throw new Error("useSharedOrders must be used within a SharedOrdersProvider");
  }
  return context;
}
