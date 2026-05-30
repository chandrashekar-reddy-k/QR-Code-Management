import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData, { type FetchError } from "../helper";
import { toast } from "react-toastify";
import { getPartnerWarehouseId } from "../utils/partnerWarehouse";

/** GET partner/deliveryagents/getall?warehouseId=… — tries hyphenated path on 404 */
async function fetchDeliveryAgentsGetAll(
  warehouseId: string,
  dateFilter?: string,
  search?: string,
  approvalStatus?: string
): Promise<unknown> {
  const qs = new URLSearchParams({ warehouseId });

  if (dateFilter?.trim()) {
    qs.set("dateFilter", dateFilter.trim());
  }

  if (search?.trim()) {
    qs.set("search", search.trim());
  }

  if (approvalStatus?.trim()) {
    qs.set("approvalStatus", approvalStatus.trim());
  }

  const paths = [
    `partner/deliveryagents/getall?${qs.toString()}`,
    `partner/delivery-agents/getall?${qs.toString()}`,
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

/** page/limit ignored; list is warehouse-scoped. Warehouse id comes from login (localStorage). */
const useGetAllDeliveryBoyList = (_page: number, _limit: number) => {
  const wid = getPartnerWarehouseId();
  return useQuery({
    queryKey: ["deliveryBoy", wid],
    queryFn: () => {
      if (!wid?.trim()) throw new Error("warehouseId is required");
      return fetchDeliveryAgentsGetAll(wid.trim());
    },
    enabled: !!wid?.trim(),
  });
};

const useGetDeliveryBoyDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["deliveryBoyById", id],
    queryFn: () => fetchData(`partner/deliveryagents/get/${id}`, "GET"),

    enabled: !!id,
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
    mutationFn: (id: string) => fetchData(`delivery-agents/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Delivery boy deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["deliveryBoy"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryAgentsByWarehouse"] });
    },
  });
};

/** page/limit kept for call-site compatibility; API returns full list for warehouse */
const useGetDeliveryBoyRequests = (_page: number, _limit: number) => {
  const wid = getPartnerWarehouseId();
  return useQuery({
    queryKey: ["deliveryBoyRequests", wid],
    queryFn: () => {
      if (!wid?.trim()) throw new Error("warehouseId is required");
      return fetchDeliveryAgentsGetAll(wid.trim());
    },
    enabled: !!wid?.trim(),
  });
};

/**
 * GET partner/deliveryagents/getall?warehouseId=...
 * Used on /delivery-boys/manage (partner warehouse–scoped list).
 */
const useGetDeliveryAgentsByWarehouse = (
  warehouseId: string | undefined,
  dateFilter?: string,
  search?: string,
  approvalStatus?: string
) => {
  const id = warehouseId?.trim();
  const df = dateFilter?.trim() || "";
  const q = search?.trim() || "";
  const status = approvalStatus?.trim() || "";

  return useQuery({
    queryKey: [
      "deliveryAgentsByWarehouse",
      id,
      df,
      q,
      status,
    ],
    queryFn: () => {
      if (!id) throw new Error("warehouseId is required");

      return fetchDeliveryAgentsGetAll(
        id,
        df,
        q,
        status
      );
    },
    enabled: !!id,
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

export {
  useGetAllDeliveryBoyList,
  useCreateDeliveryBoy,
  useGetDeliveryBoyDetailsById,
  useUpdateDeliveryBoy,
  useDeleteDeliveryBoy,
  useGetDeliveryBoyRequests,
  useGetDeliveryAgentsByWarehouse,
  useApproveDeliveryBoy,
  useRejectDeliveryBoy,
  useToggleDeliveryBoyStatus,
};
