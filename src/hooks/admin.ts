import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllAdminList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["admin"],
    queryFn: () =>
      fetchData("user/admin-list", "GET", {
        page: page,
        limit: limit,
      }),
  });
};

const useGetAdminDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["adminById"],
    queryFn: () =>
      fetchData(`users/${id}`, "GET", {
        page: 1,
        limit: 20,
      }),

    enabled: !!id,
  });
};

interface createAdminResponse {
  status: boolean;
  response: string;
  data: object;
}
const useCreateAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createAdminResponse>("user/admin", "POST", payload),

    onSuccess: (data: createAdminResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

const useUpdateAdmin = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createAdminResponse>(`users/${id}`, "PATCH", payload),

    onSuccess: (data: createAdminResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

const useDeleteAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`users/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Admin deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

export {
  useGetAllAdminList,
  useCreateAdmin,
  useGetAdminDetailsById,
  useUpdateAdmin,
  useDeleteAdmin,
};
