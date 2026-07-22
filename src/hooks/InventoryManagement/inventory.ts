import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "../../helper";
import { toast } from "react-toastify";

/* ---------- GET ALL INVENTORY BALANCES ---------- */
export const useGetInventoryBalances = (params: { locationId?: string; productId?: string; productVariantId?: string } = {}) => {
  const searchParams = new URLSearchParams();
  if (params.locationId && params.locationId !== "All") searchParams.append("locationId", params.locationId);
  if (params.productId && params.productId !== "All") searchParams.append("productId", params.productId);
  if (params.productVariantId && params.productVariantId !== "All") searchParams.append("productVariantId", params.productVariantId);

  return useQuery({
    queryKey: ["inventoryBalances", params.locationId, params.productId, params.productVariantId],
    queryFn: () => fetchData(`inventorymanagement/inventory/balances?${searchParams.toString()}`, "GET"),
  });
};

/* ---------- GET ALL INVENTORY LOCATIONS ---------- */
export const useGetInventoryLocations = () => {
  return useQuery({
    queryKey: ["inventoryLocations"],
    queryFn: () => fetchData("inventorymanagement/inventory/locations", "GET"),
  });
};

/* ---------- GET STOCK LEDGER ---------- */
export const useGetStockLedger = (page = 1, limit = 50, locationId?: string, productId?: string) => {
  const searchParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (locationId && locationId !== "All") searchParams.append("locationId", locationId);
  if (productId && productId !== "All") searchParams.append("productId", productId);

  return useQuery({
    queryKey: ["stockLedger", page, limit, locationId, productId],
    queryFn: () => fetchData(`inventorymanagement/inventory/ledger?${searchParams.toString()}`, "GET"),
  });
};

/* ---------- GET BATCHES ---------- */
export const useGetInventoryBatches = (locationId?: string, productId?: string) => {
  const searchParams = new URLSearchParams();
  if (locationId && locationId !== "All") searchParams.append("locationId", locationId);
  if (productId && productId !== "All") searchParams.append("productId", productId);

  return useQuery({
    queryKey: ["inventoryBatches", locationId, productId],
    queryFn: () => fetchData(`inventorymanagement/inventory/batches?${searchParams.toString()}`, "GET"),
  });
};

/* ---------- CREATE INVENTORY LOCATION ---------- */
export const useCreateInventoryLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      type: string;
      name: string;
      code: string;
      parentId?: string | null;
      warehouseId?: string | null;
      storeId?: string | null;
      vehicleId?: string | null;
      userId?: string | null;
    }) => fetchData("inventorymanagement/inventory/locations", "POST", payload),
    onSuccess: (data: any) => {
      toast.success(data.message || "Location created successfully");
      queryClient.invalidateQueries({ queryKey: ["inventoryLocations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create location");
    }
  });
};

/* ---------- UPDATE INVENTORY LOCATION ---------- */
export const useUpdateInventoryLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {
      id: string;
      payload: {
        type?: string;
        name?: string;
        code?: string;
        isActive?: boolean;
        parentId?: string | null;
      }
    }) => fetchData(`inventorymanagement/inventory/locations/${id}`, "PUT", payload),
    onSuccess: (data: any) => {
      toast.success(data.message || "Location updated successfully");
      queryClient.invalidateQueries({ queryKey: ["inventoryLocations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update location");
    }
  });
};

/* ---------- CREATE BATCH ---------- */
export const useCreateInventoryBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      batchNumber: string;
      lotNumber?: string;
      productId: string;
      productVariantId?: string;
      locationId: string;
      quantity: number;
      manufacturingDate?: string | Date;
      expiryDate?: string | Date;
    }) => fetchData("inventorymanagement/inventory/batches", "POST", payload),
    onSuccess: (data: any) => {
      toast.success(data.message || "Batch created successfully");
      queryClient.invalidateQueries({ queryKey: ["inventoryBatches"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryBalances"] });
      queryClient.invalidateQueries({ queryKey: ["stockLedger"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create batch");
    }
  });
};

/* ---------- CREATE INVENTORY MOVEMENT (ADJUST) ---------- */
export const useCreateInventoryMovement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      type: string;
      productId: string;
      productVariantId?: string;
      locationId: string;
      quantity: number;
      referenceType?: string;
      referenceId?: string;
      userId?: string;
    }) => fetchData("inventorymanagement/inventory/movements", "POST", payload),
    onSuccess: (data: any) => {
      toast.success(data.message || "Stock adjusted successfully");
      queryClient.invalidateQueries({ queryKey: ["inventoryBalances"] });
      queryClient.invalidateQueries({ queryKey: ["stockLedger"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to adjust stock");
    }
  });
};

/* ---------- GET INVENTORY RESERVATIONS ---------- */
export const useGetInventoryReservations = (filters: { productId?: string; variantId?: string; warehouseId?: string } = {}) => {
  const searchParams = new URLSearchParams();
  if (filters.productId) searchParams.append("productId", filters.productId);
  if (filters.variantId) searchParams.append("variantId", filters.variantId);
  if (filters.warehouseId && filters.warehouseId !== "All") searchParams.append("warehouseId", filters.warehouseId);

  return useQuery({
    queryKey: ["inventoryReservations", filters.productId, filters.variantId, filters.warehouseId],
    queryFn: () => fetchData(`inventorymanagement/inventory/reservations?${searchParams.toString()}`, "GET"),
  });
};

/* ---------- RELEASE INVENTORY RESERVATION ---------- */
export const useReleaseInventoryReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchData(`inventorymanagement/inventory/reservations/${id}/release`, "POST"),
    onSuccess: (data: any) => {
      toast.success(data.message || "Reservation released successfully");
      queryClient.invalidateQueries({ queryKey: ["inventoryReservations"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryBalances"] });
      queryClient.invalidateQueries({ queryKey: ["stockLedger"] });
      queryClient.invalidateQueries({ queryKey: ["inventorySummary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to release reservation");
    }
  });
};
