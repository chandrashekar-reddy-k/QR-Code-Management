import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllRoleList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["role"],
    queryFn: () =>
      fetchData("roles/list", "GET", {
        page: page,
        limit: limit,
      }),
  });
};

const useGetRoleDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["roleById"],
    queryFn: () =>
      fetchData(`roles/${id}`, "GET", {
        page: 1,
        limit: 20,
      }),

    enabled: !!id,
  });
};

interface createRoleResponse {
  status: boolean;
  response: string;
  data: object;
}
const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createRoleResponse>("roles/create", "POST", payload),

    onSuccess: (data: createRoleResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["role"] });
    },
  });
};

const useUpdateRole = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createRoleResponse>(`roles/${id}`, "PATCH", payload),

    onSuccess: (data: createRoleResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["role"] });
    },
  });
};

const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`roles/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Role deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["role"] });
    },
  });
};

export {
  useGetAllRoleList,
  useCreateRole,
  useGetRoleDetailsById,
  useUpdateRole,
  useDeleteRole,
};
