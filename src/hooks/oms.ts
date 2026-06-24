import { useQuery } from "@tanstack/react-query";
import fetchData from "../helper";

// Fetch warehouse metrics
export const useWarehouseStats = () => {
  return useQuery({
    queryKey: ["warehouseStats"],
    queryFn: () => fetchData<any>("partner/orders/warehouse-stats", "GET"),
    refetchInterval: 30000, // Refresh every 30s
  });
};

// Fetch ATP Inventory details
export const useAtpInventory = () => {
  return useQuery({
    queryKey: ["atpInventory"],
    queryFn: () => fetchData<any>("partner/orders/atp-inventory", "GET"),
  });
};

// Fetch Escalated Orders
export const useEscalatedOrders = () => {
  return useQuery({
    queryKey: ["escalatedOrders"],
    queryFn: () => fetchData<any>("partner/orders/escalated", "GET"),
    refetchInterval: 30000,
  });
};
