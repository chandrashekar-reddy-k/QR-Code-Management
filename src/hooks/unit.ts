import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllUnitList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["unit", page, limit],
    queryFn: () =>
      fetchData(`unit/getUnitList?page=${page}&limit=${limit}`, "GET"),
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};

const useGetUnitDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["unitById", id],
    queryFn: () =>
      fetchData(`unit/${id}`, "GET"),

    enabled: !!id,
  });
};

interface createUnitResponse {
  status: boolean;
  response: string;
  data: object;
}
const useCreateUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createUnitResponse>("unit/createUnit", "POST", payload),

    onSuccess: (data: createUnitResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["unit"] });
    },
  });
};

const useUpdateUnit = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createUnitResponse>(`unit/${id}`, "PATCH", payload),

    onSuccess: (data: createUnitResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["unit"] });
    },
  });
};

const useDeleteUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`unit/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Unit deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["unit"] });
    },
  });
};

export {
  useGetAllUnitList,
  useCreateUnit,
  useGetUnitDetailsById,
  useUpdateUnit,
  useDeleteUnit,
};
