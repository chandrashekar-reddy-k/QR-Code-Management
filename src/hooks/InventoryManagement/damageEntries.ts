import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchData from "../../helper";
import { toast } from "react-toastify";

/* ---------- GET ALL DAMAGE ENTRIES ---------- */
export const useGetDamageEntries = (page: number, limit: number, locationId?: string, status?: string) => {
  return useQuery({
    queryKey: ["damageEntries", page, limit, locationId, status],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (locationId && locationId !== "All") params.set("locationId", locationId);
      if (status && status !== "All") params.set("status", status);
      return fetchData(`inventorymanagement/damage?${params.toString()}`, "GET");
    },
  });
};

/* ---------- CREATE DAMAGE ENTRY ---------- */
export const useCreateDamageEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => fetchData("inventorymanagement/damage", "POST", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["damageEntries"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryBalances"] });
      toast.success(data.message || "Damage entry reported successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to report damage entry");
    },
  });
};

/* ---------- UPDATE DAMAGE ENTRY STATUS ---------- */
export const useUpdateDamageStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "APPROVED" | "DISPOSED" | "RECOVERED" | "REJECTED";
    }) => fetchData(`inventorymanagement/damage/${id}/status`, "PATCH", { status }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["damageEntries"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryBalances"] });
      queryClient.invalidateQueries({ queryKey: ["stockLedger"] });
      toast.success(data.message || "Damage status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update damage status");
    },
  });
};
