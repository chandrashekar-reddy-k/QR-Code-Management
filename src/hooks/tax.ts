import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";


const useGetAllTaxList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["tax", page, limit],
    queryFn: () =>
      fetchData(`taxes/getTaxList?page=${page}&limit=${limit}`, "GET"),
  });
};

const useGetTaxDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["taxById", id],
    queryFn: () => fetchData(`taxes/${id}`, "GET"),
    enabled: !!id,
  });
};

interface createTaxResponse {
  status: boolean;
  response: string;
  data: object;
}

const useCreateTax = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createTaxResponse>("taxes/createTax", "POST", payload),
    onSuccess: (data: createTaxResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["tax"] });
    },
  });
};

const useUpdateTax = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createTaxResponse>(`taxes/${id}`, "PATCH", payload),
    onSuccess: (data: createTaxResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["tax"] });
    },
  });
};

const useDeleteTax = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`taxes/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Tax deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["tax"] });
    },
  });
};

export {
  useGetAllTaxList,
  useCreateTax,
  useGetTaxDetailsById,
  useUpdateTax,
  useDeleteTax,
};