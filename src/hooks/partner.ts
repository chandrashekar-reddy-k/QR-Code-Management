import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllPartnerList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["partner"],
    queryFn: () =>
      fetchData("partners/list", "GET", {
        page: page,
        limit: limit,
      }),
  });
};

const useGetPartnerDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["partnerById"],
    queryFn: () =>
      fetchData(`partners/${id}`, "GET", {
        page: 1,
        limit: 20,
      }),

    enabled: !!id,
  });
};

interface createPartnerResponse {
  status: boolean;
  response: string;
  data: object;
}
const useCreatePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createPartnerResponse>("partners/create", "POST", payload),

    onSuccess: (data: createPartnerResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["partner"] });
    },
  });
};

const useUpdatePartner = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createPartnerResponse>(`partners/${id}`, "PUT", payload),

    onSuccess: (data: createPartnerResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["partner"] });
    },
  });
};

const useDeletePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`partners/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Partner deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["partner"] });
    },
  });
};

export {
  useGetAllPartnerList,
  useCreatePartner,
  useGetPartnerDetailsById,
  useUpdatePartner,
  useDeletePartner,
};
