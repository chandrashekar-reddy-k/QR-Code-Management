import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllStockList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["stock"],
    queryFn: () =>
      fetchData("stockmanagement/getStockList", "PUT", {
        page: page,
        limit: limit,
      }),
  });
};

const useGetStockDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["stockById"],
    queryFn: () =>
      fetchData(`stockmanagement/${id}`, "GET", {
        page: 1,
        limit: 20,
      }),
    enabled: !!id,
  });
};

interface createStockResponse {
  status: boolean;
  response: string;
  data: object;
}

const useUpdateStock = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { stock: number }) =>
      fetchData(`stockmanagement/${id}`, "PATCH", payload),
    onSuccess: (data: createStockResponse) => {
      toast.success(data.response || "Stock updated successfully");
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
};

const useUpdateStockStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetchData(`stockmanagement/${id}/status`, "PATCH", { isActive }),
    onSuccess: (data: createStockResponse) => {
      toast.success(data.response || "Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
};

const useDeleteStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`stockmanagement/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Stock deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
};

export {
  useGetAllStockList,
  useGetStockDetailsById,
  useUpdateStock,
  useUpdateStockStatus,
  useDeleteStock,
};
