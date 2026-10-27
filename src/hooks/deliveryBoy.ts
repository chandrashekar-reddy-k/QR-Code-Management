import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData, { type FetchError } from "../helper";
import { toast } from "react-toastify";

/** GET partner/deliveryagents/getall — lists all agents (no warehouse filter) */
async function fetchDeliveryAgentsGetAll(
  dateFilter?: string,
  search?: string,
  approvalStatus?: string
): Promise<unknown> {
  const qs = new URLSearchParams();

  if (dateFilter?.trim()) {
    qs.set("dateFilter", dateFilter.trim());
  }

  if (search?.trim()) {
    qs.set("search", search.trim());
  }

  if (approvalStatus?.trim()) {
    qs.set("approvalStatus", approvalStatus.trim());
  }

  const qStr = qs.toString();
  const paths = [
    `partner/deliveryagents/getall${qStr ? `?${qStr}` : ""}`,
    `partner/delivery-agents/getall${qStr ? `?${qStr}` : ""}`,
  ];

  let lastErr: unknown = null;

  for (let i = 0; i < paths.length; i++) {
    try {
      return await fetchData<unknown>(paths[i], "GET");
    } catch (e) {
      lastErr = e;
      const st = (e as FetchError)?.status;

      if (st === 404 && i < paths.length - 1) continue;

      throw e;
    }
  }

  throw lastErr;
}

/** Lists all delivery agents globally (no warehouse filter). */
const useGetAllDeliveryBoyList = (_page: number, _limit: number) => {
  return useQuery({
    queryKey: ["deliveryBoy"],
    queryFn: () => fetchDeliveryAgentsGetAll(),
  });
};

const useGetDeliveryBoyDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["deliveryBoyById", id],
    queryFn: () => fetchData(`partner/deliveryagents/get/${id}`, "GET"),
    enabled: !!id,
    refetchOnWindowFocus: false,  // ← ADD THIS — stops the 401 on tab switch
  });
};

interface createDeliveryBoyResponse {
  status: boolean;
  response: string;
  data: object;
}

interface ToggleDeliveryAgentStatusResponse {
  status: boolean;
  message?: string;
  response?: string;
  isActive?: boolean;
}
const useCreateDeliveryBoy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      fetchData("delivery-agents/create", "POST", payload),

    onSuccess: (data: createDeliveryBoyResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
  });
};

const useUpdateDeliveryBoy = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => fetchData(`delivery-agents/${id}`, "PUT", payload),

    onSuccess: (data: createDeliveryBoyResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
  });
};

const useToggleDeliveryBoyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchData<ToggleDeliveryAgentStatusResponse>(
        `partner/deliveryagents/toggle/${id}`,
        "DELETE"
      ),

    onSuccess: (data: ToggleDeliveryAgentStatusResponse, id: string) => {
      toast.success(data.message || data.response || "Agent status updated");
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoyById", id] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
  });
};

const useDeleteDeliveryBoy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`partner/deliveryagents/delete/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Delivery agent deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete delivery agent");
    }
  });
};

const useBulkDeleteDeliveryBoys = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      fetchData("partner/deliveryagents/bulk-delete", "POST", { ids }),

    onSuccess: (data: any) => {
      toast.success(data?.message || "Delivery agents deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete selected delivery agents");
    }
  });
};


/** Lists delivery agent requests with optional filters. */
const useGetDeliveryBoyRequests = (
  _page?: number,
  _limit?: number,
  dateFilter?: string,
  search?: string,
  approvalStatus?: string
) => {
  const df = dateFilter?.trim() || "";
  const q = search?.trim() || "";
  const status = approvalStatus?.trim() || "";

  return useQuery({
    queryKey: ["deliveryBoyRequests", df, q, status],
    queryFn: () => fetchDeliveryAgentsGetAll(df, q, status),
  });
};

/**
 * GET partner/deliveryagents/getall — lists all agents globally.
 * warehouseId param is kept for call-site compatibility but is no longer sent to the API.
 */
const useGetDeliveryAgentsByWarehouse = (
  _warehouseId: string | undefined,
  dateFilter?: string,
  search?: string,
  approvalStatus?: string
) => {
  const df = dateFilter?.trim() || "";
  const q = search?.trim() || "";
  const status = approvalStatus?.trim() || "";

  return useQuery({
    queryKey: [
      "deliveryAgentsByWarehouse",
      df,
      q,
      status,
    ],
    queryFn: () =>
      fetchDeliveryAgentsGetAll(
        df,
        q,
        status
      ),
  });
};

const useApproveDeliveryBoy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchData<createDeliveryBoyResponse>(
        `delivery-agents/${id}/approve`,
        "POST"
      ),

    onSuccess: (data: createDeliveryBoyResponse) => {
      toast.success(data.response || "Delivery boy approved successfully");
      queryClient.invalidateQueries({ queryKey: ["deliveryBoyRequests"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
  });
};

const useRejectDeliveryBoy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchData<createDeliveryBoyResponse>(
        `delivery-agents/${id}/reject`,
        "POST"
      ),

    onSuccess: (data: createDeliveryBoyResponse) => {
      toast.success(data.response || "Delivery boy rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["deliveryBoyRequests"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
  });
};

const useUpdateDeliveryAgentApprovalStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approvalStatus }: { id: string; approvalStatus: string }) =>
      fetchData<{ status: boolean; message?: string; response?: string }>(
        `partner/deliveryagents/update-status/${id}`,
        "PUT",
        { approvalStatus }
      ),

    onSuccess: (data, variables) => {
      toast.success(data?.message || data?.response || "Agent status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["deliveryBoyById", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryBoyRequests"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update agent status");
    },
  });
};

export {
  useGetAllDeliveryBoyList,
  useCreateDeliveryBoy,
  useGetDeliveryBoyDetailsById,
  useUpdateDeliveryBoy,
  useDeleteDeliveryBoy,
  useBulkDeleteDeliveryBoys,
  useGetDeliveryBoyRequests,
  useGetDeliveryAgentsByWarehouse,
  useApproveDeliveryBoy,
  useRejectDeliveryBoy,
  useToggleDeliveryBoyStatus,
  useUpdateDeliveryAgentApprovalStatus,
};
