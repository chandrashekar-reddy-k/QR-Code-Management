import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllAreaList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["area"],
    queryFn: () =>
      fetchData("city/getCityList", "GET", {
        page: page,
        limit: limit,
      }),
  });
};

const useGetAreaDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["areaById"],
    queryFn: () =>
      fetchData(`city/${id}`, "GET", {
        page: 1,
        limit: 20,
      }),

    enabled: !!id,
  });
};

interface createAreaResponse {
  status: boolean;
  response: string;
  data: object;
}
const useCreateArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createAreaResponse>("city/createCity", "POST", payload),

    onSuccess: (data: createAreaResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["area"] });
    },
  });
};

const useUpdateArea = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createAreaResponse>(`city/${id}`, "PATCH", payload),

    onSuccess: (data: createAreaResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["area"] });
    },
  });
};

const useDeleteArea = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`city/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Area deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["area"] });
    },
  });
};

export {
  useGetAllAreaList,
  useCreateArea,
  useGetAreaDetailsById,
  useUpdateArea,
  useDeleteArea,
};
