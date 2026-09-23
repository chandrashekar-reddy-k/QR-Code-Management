import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

interface ReturnRequestsParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

import { ReturnRequest } from "../types";

interface ReturnRequestsResponse {
  status: boolean;
  response: string;
  data: {
    data: ReturnRequest[];
    pagination: {
      total: number;
      page: number;
      limit: number;
    };
  };
}

interface ReturnRequestDetailResponse {
  status: boolean;
  response: string;
  data: ReturnRequest;
}

export const useGetReturnRequests = ({
  page,
  limit,
  search = "",
  status = "",
}: ReturnRequestsParams) => {
  return useQuery({
    queryKey: ["returnRequests", page, limit, search, status],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) {
        params.append("search", search);
      }
      if (status) {
        params.append("status", status);
      }

      const endpoint = `partner/return-requests?${params.toString()}`;
      return fetchData<ReturnRequestsResponse>(endpoint, "GET");
    },
    retry: false,
  });
};

export const useGetReturnRequestById = (id: string | undefined) => {
  return useQuery({
    queryKey: ["returnRequest", id],
    queryFn: () => {
      if (!id) {
        throw new Error("Return request ID is required");
      }
      const endpoint = `partner/return-requests/${id}`;
      return fetchData<ReturnRequestDetailResponse>(endpoint, "GET");
    },
    enabled: !!id,
    retry: false,
  });
};

interface ApproveReturnItemPayload {
  orderItemId: string;
}

export const useApproveReturnItem = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApproveReturnItemPayload) => {
      if (!id) {
        throw new Error("Return request ID is required");
      }
      const endpoint = `partner/return-requests/${id}/approve`;
      return fetchData<{ status: boolean; response: string }>(endpoint, "POST", payload);
    },
    onSuccess: (data) => {
      toast.success(data.response || "Return item approved successfully");
      queryClient.invalidateQueries({ queryKey: ["returnRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["returnRequests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve return item");
    },
  });
};

interface RejectReturnItemPayload {
  orderItemId: string;
  reason: string;
}

export const useRejectReturnItem = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RejectReturnItemPayload) => {
      if (!id) {
        throw new Error("Return request ID is required");
      }
      const endpoint = `partner/return-requests/${id}/reject`;
      return fetchData<{ status: boolean; response: string }>(endpoint, "POST", payload);
    },
    onSuccess: (data) => {
      toast.success(data.response || "Return item rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["returnRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["returnRequests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject return item");
    },
  });
};

export const useReceiveReturnItem = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { items: Array<{ orderItemId: string, qcStatus: string, qcNotes?: string }> }) => {
      if (!id) {
        throw new Error("Return request ID is required");
      }
      const endpoint = `partner/return-requests/${id}/receive`;
      return fetchData<{ status: boolean; response: string }>(endpoint, "POST", payload);
    },
    onSuccess: (data) => {
      toast.success(data.response || "Return items received successfully");
      queryClient.invalidateQueries({ queryKey: ["returnRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["returnRequests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to receive return items");
    },
  });
};

export const useDeleteReturnRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => {
      const endpoint = `partner/return-requests/${id}`;
      return fetchData<{ status: boolean; response: string }>(endpoint, "DELETE");
    },
    onSuccess: (data) => {
      toast.success(data.response || "Return request deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["returnRequests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete return request");
    },
  });
};

export const useUpdateReturnPhase = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (phase: string) => {
      if (!id) {
        throw new Error("Return request ID is required");
      }
      const endpoint = `partner/return-requests/${id}/phase`;
      return fetchData<{ status: boolean; response: string }>(endpoint, "PATCH", { phase });
    },
    onSuccess: (data) => {
      toast.success(data?.response || "Return flow stage updated successfully");
      queryClient.invalidateQueries({ queryKey: ["returnRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["returnRequests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update return stage");
    },
  });
};

