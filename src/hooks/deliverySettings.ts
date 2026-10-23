import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const DELIVERY_TYPES_ENDPOINT = "partner/delivery-settings/types";
const ROUTE_MAPS_BASE = "partner/delivery-settings/route-maps";
const PICKUP_SLOTS_BASE = "partner/delivery-settings/pickup-slots";

export interface DeliverySettingItem {
  isEnabled: boolean;
  label: string;
  deliveryCharge: number;
  freeDeliveryThreshold?: number | null;
}

export interface DeliveryTypesData {
  expressSettingsEnabled: boolean;
  expressSettingsCharge: number;
  expressFreeDeliveryThreshold?: number | null;
  selfPickupEnabled: boolean;
  scheduledDeliveryEnabled: boolean;
  scheduledDeliveryCharge: number;
  scheduledFreeDeliveryThreshold?: number | null;
}

interface GetDeliveryTypesResponse {
  status: boolean;
  response: string;
  data: {
    deliverySettings: DeliverySettingItem[];
  };
}

interface UpdateDeliveryTypesPayload {
  deliverySettings: DeliverySettingItem[];
}

interface UpdateDeliveryTypesResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useGetDeliveryTypes = () => {
  return useQuery({
    queryKey: ["deliveryTypes"],
    queryFn: async () => {
      const response = await fetchData<GetDeliveryTypesResponse>(
        DELIVERY_TYPES_ENDPOINT,
        "GET"
      );
      // Return API response directly with deliverySettings array
      return response;
    },
    retry: false,
  });
};

const useUpdateDeliveryTypes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      expressSettingsEnabled: boolean;
      expressSettingsCharge?: number;
      expressFreeDeliveryThreshold?: number | null;
      selfPickupEnabled: boolean;
      scheduledDeliveryEnabled: boolean;
      scheduledDeliveryCharge?: number;
      scheduledFreeDeliveryThreshold?: number | null;
    }) => {
      // Transform to API payload format matching the exact structure
      const apiPayload: UpdateDeliveryTypesPayload = {
        deliverySettings: [
          {
            isEnabled: payload.expressSettingsEnabled,
            label: "Express Settings",
            deliveryCharge: payload.expressSettingsCharge ?? 0,
            freeDeliveryThreshold:
              payload.expressFreeDeliveryThreshold !== undefined
                ? payload.expressFreeDeliveryThreshold
                : null,
          },
          {
            isEnabled: payload.scheduledDeliveryEnabled,
            label: "Scheduled Delivery",
            deliveryCharge: payload.scheduledDeliveryCharge ?? 0,
            freeDeliveryThreshold:
              payload.scheduledFreeDeliveryThreshold !== undefined
                ? payload.scheduledFreeDeliveryThreshold
                : null,
          },
          {
            isEnabled: payload.selfPickupEnabled,
            label: "Self Pickup",
            deliveryCharge: 0,
            freeDeliveryThreshold: null,
          },
        ],
      };
      return fetchData<UpdateDeliveryTypesResponse>(
        DELIVERY_TYPES_ENDPOINT,
        "PUT",
        apiPayload
      );
    },
    onSuccess: (data: UpdateDeliveryTypesResponse) => {
      toast.success(data.response || "Delivery types saved successfully");
      queryClient.invalidateQueries({ queryKey: ["deliveryTypes"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save delivery types");
    },
  });
};

export { useGetDeliveryTypes, useUpdateDeliveryTypes };

// --- Route Maps ---

export interface RouteMapItem {
  id: number;
  area: string;
  createdAt: string;
}

interface RouteMapsParams {
  page: number;
  limit: number;
  search?: string;
  enabled?: boolean;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

interface GetRouteMapsResponse {
  status: boolean;
  response: string;
  data: RouteMapItem[] | { routeMaps?: RouteMapItem[] };
  pagination?: PaginationMeta;
}

interface CreateRouteMapPayload {
  area: string;
}

interface CreateRouteMapResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

interface UpdateRouteMapResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useGetRouteMaps = ({ page, limit, search = "", enabled = true }: RouteMapsParams) => {
  return useQuery({
    queryKey: ["routeMaps", page, limit, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);
      const endpoint = `${ROUTE_MAPS_BASE}?${params.toString()}`;
      return fetchData<GetRouteMapsResponse>(endpoint, "GET");
    },
    enabled,
    retry: false,
  });
};

const useCreateRouteMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRouteMapPayload) =>
      fetchData<CreateRouteMapResponse>(ROUTE_MAPS_BASE, "POST", payload),
    onSuccess: (data: CreateRouteMapResponse) => {
      toast.success(data.response || "Route map created successfully");
      queryClient.invalidateQueries({ queryKey: ["routeMaps"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create route map");
    },
  });
};

const useUpdateRouteMap = (routeMapId: string | number | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRouteMapPayload) => {
      if (routeMapId == null) throw new Error("Route map ID is required");
      return fetchData<UpdateRouteMapResponse>(
        `${ROUTE_MAPS_BASE}/${routeMapId}`,
        "PUT",
        payload
      );
    },
    onSuccess: (data: UpdateRouteMapResponse) => {
      toast.success(data.response || "Route map updated successfully");
      queryClient.invalidateQueries({ queryKey: ["routeMaps"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update route map");
    },
  });
};

const useDeleteRouteMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeMapId: number | string) =>
      fetchData<UpdateRouteMapResponse>(
        `${ROUTE_MAPS_BASE}/${routeMapId}`,
        "DELETE"
      ),
    onSuccess: (data: UpdateRouteMapResponse) => {
      toast.success(data.response || "Route map deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["routeMaps"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete route map");
    },
  });
};

export {
  useGetRouteMaps,
  useCreateRouteMap,
  useUpdateRouteMap,
  useDeleteRouteMap,
};

// --- Delivery Slots ---

const SLOTS_BASE = "partner/delivery-settings/slots";

export type SlotRepeatType = "MON_FRI" | "SUN" | "CUSTOM";

export interface SlotItem {
  id: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  routeMapId: string;
  routeMap?: { id: number; area: string };
  ordersPerSlot: number;
  isRepeat: boolean;
  repeatType?: SlotRepeatType;
  customDays?: string[];
  createdAt: string;
  [key: string]: unknown;
}

interface SlotsParams {
  page: number;
  limit: number;
  search?: string;
  enabled?: boolean;
}

interface GetSlotsResponse {
  status: boolean;
  response: string;
  data: SlotItem[] | { slots?: SlotItem[] };
  pagination?: PaginationMeta;
}

export interface CreateSlotPayload {
  slotDate: string;
  startTime: string;
  endTime: string;
  routeMapId: string;
  ordersPerSlot: number;
  isRepeat: boolean;
  repeatType: SlotRepeatType;
  customDays: string[];
}

interface SlotMutationResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useGetSlots = ({ page, limit, search = "", enabled = true }: SlotsParams) => {
  return useQuery({
    queryKey: ["deliverySlots", page, limit, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);
      const endpoint = `${SLOTS_BASE}?${params.toString()}`;
      return fetchData<GetSlotsResponse>(endpoint, "GET");
    },
    enabled,
    retry: false,
  });
};

const useCreateSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSlotPayload) =>
      fetchData<SlotMutationResponse>(SLOTS_BASE, "POST", payload),
    onSuccess: (data: SlotMutationResponse) => {
      toast.success(data.response || "Slot created successfully");
      queryClient.invalidateQueries({ queryKey: ["deliverySlots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create slot");
    },
  });
};

const useUpdateSlot = (slotId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSlotPayload) => {
      if (!slotId) throw new Error("Slot ID is required");
      return fetchData<SlotMutationResponse>(
        `${SLOTS_BASE}/${slotId}`,
        "PUT",
        payload
      );
    },
    onSuccess: (data: SlotMutationResponse) => {
      toast.success(data.response || "Slot updated successfully");
      queryClient.invalidateQueries({ queryKey: ["deliverySlots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update slot");
    },
  });
};

const useDeleteSlot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: number | string) =>
      fetchData<SlotMutationResponse>(`${SLOTS_BASE}/${slotId}`, "DELETE"),
    onSuccess: (data: SlotMutationResponse) => {
      toast.success(data.response || "Slot deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["deliverySlots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete slot");
    },
  });
};

export { useGetSlots, useCreateSlot, useUpdateSlot, useDeleteSlot };

// --- Store Pickup Slots ---

export type PickupRepeatType = "ONCE" | "MON_FRI" | "SUN" | "CUSTOM";

export interface PickupSlotItem {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  slot: string;
  capacity: number;
  repeat: boolean;
  repeatType: PickupRepeatType;
  customDays: string[];
  createdAt: string;
  [key: string]: unknown;
}

interface GetPickupSlotsResponse {
  status: boolean;
  response: string;
  data: PickupSlotItem[] | { pickupSlots?: PickupSlotItem[] };
  pagination?: PaginationMeta;
}

export interface CreatePickupSlotPayload {
  date: string;
  startTime: string;
  endTime: string;
  slot: string;
  capacity: number;
  repeat: boolean;
  repeatType: PickupRepeatType;
  customDays: string[];
}

interface PickupSlotMutationResponse {
  status: boolean;
  response: string;
  data?: unknown;
}


const useGetPickupSlots = ({
  page,
  limit,
  search = "",
  enabled = true,
}: SlotsParams) => {
  return useQuery({
    queryKey: ["pickupSlots", page, limit, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const endpoint = `${PICKUP_SLOTS_BASE}?${params.toString()}`;

      return fetchData<GetPickupSlotsResponse>(endpoint, "GET");
    },
    enabled,
    retry: false,
  });
};
const useCreatePickupSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePickupSlotPayload) =>
      fetchData<PickupSlotMutationResponse>(
        PICKUP_SLOTS_BASE,
        "POST",
        payload
      ),

    onSuccess: (data: PickupSlotMutationResponse) => {
      toast.success(data.response || "Pickup slot created successfully");
      queryClient.invalidateQueries({ queryKey: ["pickupSlots"] });
    },

    onError: (error: Error) => {
      toast.error(error.message || "Failed to create pickup slot");
    },
  });
};

const useUpdatePickupSlot = (pickupSlotId: string | number | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePickupSlotPayload) => {
      if (!pickupSlotId) throw new Error("Pickup Slot ID is required");

      return fetchData<PickupSlotMutationResponse>(
        `${PICKUP_SLOTS_BASE}/${pickupSlotId}`,
        "PUT",
        payload
      );
    },

    onSuccess: (data: PickupSlotMutationResponse) => {
      toast.success(data.response || "Pickup slot updated successfully");
      queryClient.invalidateQueries({ queryKey: ["pickupSlots"] });
    },

    onError: (error: Error) => {
      toast.error(error.message || "Failed to update pickup slot");
    },
  });
};

const useDeletePickupSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pickupSlotId: number | string) =>
      fetchData<PickupSlotMutationResponse>(
        `${PICKUP_SLOTS_BASE}/${pickupSlotId}`,
        "DELETE"
      ),

    onSuccess: (data: PickupSlotMutationResponse) => {
      toast.success(data.response || "Pickup slot deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["pickupSlots"] });
    },

    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete pickup slot");
    },
  });
};

export {
  useGetPickupSlots,
  useCreatePickupSlot,
  useUpdatePickupSlot,
  useDeletePickupSlot,
};