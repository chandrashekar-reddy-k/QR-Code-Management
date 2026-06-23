import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

interface ReturnRequestsParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export interface ReturnRequest {
  id: string | number;
  userId: string | number;
  name: string;
  productName: string;
  quantity: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
  date: string;
  notes?: string;
  orderNumber?: string;
  items?: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      id: string;
      name: string;
      images: string[];
    };
  }>;
}

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

interface UpdateReturnRequestStatusPayload {
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
}

export const useUpdateReturnRequestStatus = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateReturnRequestStatusPayload) => {
      if (!id) {
        throw new Error("Return request ID is required");
      }
      const endpoint = `partner/return-requests/${id}/status`;
      return fetchData<{ status: boolean; response: string }>(endpoint, "PUT", payload);
    },
    onSuccess: (data) => {
      toast.success(data.response || "Return request status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["returnRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["returnRequests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update return request status");
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
