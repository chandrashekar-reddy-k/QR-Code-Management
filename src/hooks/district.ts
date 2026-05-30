import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllDistrictList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["district"],
    queryFn: () =>
      fetchData("district/getDistrictList", "GET", {
        page: page,
        limit: limit,
      }),
  });
};

const useGetDistrictDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["districtById"],
    queryFn: () =>
      fetchData(`district/${id}`, "GET", {
        page: 1,
        limit: 20,
      }),

    enabled: !!id,
  });
};

interface createDistrictResponse {
  status: boolean;
  response: string;
  data: object;
}
const useCreateDistrict = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createDistrictResponse>(
        "district/createDistrict",
        "POST",
        payload
      ),

    onSuccess: (data: createDistrictResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["district"] });
    },
  });
};

const useUpdateDistrict = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createDistrictResponse>(`district/${id}`, "PATCH", payload),

    onSuccess: (data: createDistrictResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["district"] });
    },
  });
};

const useDeleteDistrict = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`district/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("District deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["district"] });
    },
  });
};

export {
  useGetAllDistrictList,
  useCreateDistrict,
  useGetDistrictDetailsById,
  useUpdateDistrict,
  useDeleteDistrict,
};
