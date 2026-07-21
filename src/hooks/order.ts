import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

interface DeliveryOrdersParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  dateFilter?: string;
  deliveryType?: string;
  cartType?: string;
  routeMapId?: string;
}

const useGetDeliveryOrders = ({
  page,
  limit,
  search = "",
  status = "",
  dateFilter = "",
  deliveryType = "",
  cartType = "",
  routeMapId = "",
}: DeliveryOrdersParams) => {
  return useQuery({
    queryKey: [
      "deliveryOrders",
      page,
      limit,
      search,
      status,
      dateFilter,
      deliveryType,
      cartType,
      routeMapId,
    ],
    queryFn: () => {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) {
        params.append("search", search);
      }
      if (status) {
        params.append("status", status);
      }
      if (dateFilter) {
        params.append("dateFilter", dateFilter);
      }
      if (deliveryType) {
        params.append("deliveryType", deliveryType);
      }
      if (cartType) {
        params.append("cartType", cartType);
      }
      if (routeMapId) {
        params.append("routeMapId", routeMapId);
      }

      const endpoint = `partner/orders/delivery?${params.toString()}`;
      return fetchData(endpoint, "GET");
    },
    retry: false,
  });
};

interface PickupOrdersParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  dateFilter?: string;
}

const useGetPickupOrders = ({
  page,
  limit,
  search = "",
  status = "",
  dateFilter = "",
}: PickupOrdersParams) => {
  return useQuery({
    queryKey: ["pickupOrders", page, limit, search, status, dateFilter],
    queryFn: () => {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) {
        params.append("search", search);
      }
      if (status) {
        params.append("status", status);
      }
      if (dateFilter) {
        params.append("dateFilter", dateFilter);
      }

      const endpoint = `partner/orders/pickup-store?${params.toString()}`;
      return fetchData(endpoint, "GET");
    },
    retry: false,
  });
};

const useGetOrderById = (orderId: string | undefined) => {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => {
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      const endpoint = `partner/orders/${orderId}`;
      return fetchData(endpoint, "GET");
    },
    enabled: !!orderId,
    retry: false,
  });
};

// Order Status Enum (align with consumer `OrderStatus` + partner API rules).
// Do not PUT `OUT_FOR_DELIVERY` / `ASSIGNED_TO_AGENT` / `DELIVERED` here — use assign-agent / delivery completion flows.
export enum OrderStatus {
  PENDING = "PENDING",
  PLACED = "PLACED",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  RETURN_INITIATED = "RETURN_INITIATED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
  RETURNED = "RETURNED",
}

/** Body values accepted by PUT partner/orders/:id/status (assignment uses assign-agent only). */
export type PartnerPutOrderStatus =
  | OrderStatus.PLACED
  | OrderStatus.CONFIRMED
  | OrderStatus.PROCESSING
  | OrderStatus.READY_FOR_PICKUP
  | OrderStatus.PICKED_UP
  | OrderStatus.IN_TRANSIT
  | OrderStatus.CANCELLED
  | OrderStatus.FAILED
  | OrderStatus.RETURNED
  | OrderStatus.DELIVERED;

interface UpdateOrderStatusPayload {
  status: PartnerPutOrderStatus;
  fulfillmentOrderId?: string;
}

interface UpdateOrderStatusResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useUpdateOrderStatus = (orderId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateOrderStatusPayload) => {
      const { status } = payload;
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      const endpoint = `partner/orders/${orderId}/status`;
      return fetchData<UpdateOrderStatusResponse>(endpoint, "PUT", { status });
    },
    onSuccess: (data: UpdateOrderStatusResponse) => {
      toast.success(data.response || "Order status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["pickupOrders"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update order status");
    },
  });
};

// Delivery Agent interfaces
export interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  email: string;
  isOnline: boolean;
  vehicleType: string;
  avatar: string | null;
}

interface DeliveryAgentsResponse {
  status: boolean;
  response: string;
  data: DeliveryAgent[];
}

const useGetDeliveryAgents = () => {
  return useQuery<DeliveryAgentsResponse, Error>({
    queryKey: ["deliveryAgents"],
    queryFn: () => {
      const endpoint = `partner/orders/delivery-agents`;
      return fetchData<DeliveryAgentsResponse>(endpoint, "GET");
    },
    retry: false,
  });
};

interface AssignAgentPayload {
  agentId: string;
}

interface AssignAgentResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useAssignDeliveryAgent = (orderId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<AssignAgentResponse, Error, AssignAgentPayload>({
    mutationFn: (payload: AssignAgentPayload) => {
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      const endpoint = `partner/orders/${orderId}/assign-agent`;
      return fetchData<AssignAgentResponse>(endpoint, "PUT", payload);
    },
    onSuccess: (data) => {
      toast.success(data.response || "Delivery agent assigned successfully");
      // Only invalidate order and delivery orders - don't touch status
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      // Don't invalidate status-related queries
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign delivery agent");
    },
  });
};

interface RequestDeliveryOtpResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useRequestDeliveryOtp = (orderId: string | undefined) => {
  return useMutation<RequestDeliveryOtpResponse, Error>({
    mutationFn: () => {
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      const endpoint = `partner/orders/${orderId}/request-delivery-otp`;
      return fetchData<RequestDeliveryOtpResponse>(endpoint, "POST");
    },
    onSuccess: (data) => {
      toast.success(data.response || "OTP sent successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send OTP");
    },
  });
};

interface VerifyDeliveryPayload {
  otp: string;
}

interface VerifyDeliveryResponse {
  status: boolean;
  response: string;
  data?: unknown;
}

const useVerifyDelivery = (orderId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<VerifyDeliveryResponse, Error, VerifyDeliveryPayload>({
    mutationFn: (payload: VerifyDeliveryPayload) => {
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      const endpoint = `partner/orders/${orderId}/verify-delivery`;
      return fetchData<VerifyDeliveryResponse>(endpoint, "POST", payload);
    },
    onSuccess: (data) => {
      toast.success(data.response || "Delivery verified successfully");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to verify delivery");
    },
  });
};

export {
  useGetDeliveryOrders,
  useGetPickupOrders,
  useGetOrderById,
  useUpdateOrderStatus,
  useGetDeliveryAgents,
  useAssignDeliveryAgent,
  useRequestDeliveryOtp,
  useVerifyDelivery,
  useGetOrderTimeline,
  useGetOrderAuditHistory,
  useBulkTransitionOrders,
  useGeneratePickingList,
};

const useGetOrderTimeline = (id: string | undefined) => {
  return useQuery({
    queryKey: ["orderTimeline", id],
    queryFn: () => {
      const endpoint = `partner/orders/${id}/timeline`;
      return fetchData<any>(endpoint, "GET", undefined, undefined, false, false);
    },
    enabled: !!id,
  });
};

const useGetOrderAuditHistory = (id: string | undefined) => {
  return useQuery({
    queryKey: ["orderAuditHistory", id],
    queryFn: () => {
      const endpoint = `partner/orders/${id}/audit-history`;
      return fetchData<any>(endpoint, "GET", undefined, undefined, false, false);
    },
    enabled: !!id,
  });
};

const useBulkTransitionOrders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { orderIds: string[]; status: string }) => {
      const endpoint = `partner/orders/bulk-transition`;
      return fetchData<any>(endpoint, "POST", payload);
    },
    onSuccess: (data: any) => {
      toast.success(data.response || "Bulk transitions executed successfully");
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["pickupOrders"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to execute bulk transitions");
    }
  });
};

const useGeneratePickingList = () => {
  return useMutation({
    mutationFn: (payload: { orderIds: string[] }) => {
      const endpoint = `partner/orders/picking-list`;
      return fetchData<any>(endpoint, "POST", payload);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to compile picking list");
    }
  });
};

