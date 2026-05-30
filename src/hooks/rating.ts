import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllRatingList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["rating"],
    queryFn: () =>
      fetchData("productmanagement/product/ratings", "GET", {
        page: page,
        limit: limit,
      }),
  });
};

const useGetRatingDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["ratingById"],
    queryFn: () =>
      fetchData(`productmanagement/product/ratings/${id}`, "GET", {
        page: 1,
        limit: 20,
      }),

    enabled: !!id,
  });
};

interface createRatingResponse {
  status: boolean;
  response: string;
  data: object;
}

const useCreateRating = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      fetchData("productRating/createRating", "POST", payload),

    onSuccess: (data: createRatingResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["rating"] });
    },
  });
};

const useUpdateRating = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => fetchData(`productRating/${id}`, "PATCH", payload),

    onSuccess: (data: createRatingResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["rating"] });
    },
  });
};

const useDeleteRating = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData(`productRating/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Rating deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["rating"] });
    },
  });
};

export {
  useGetAllRatingList,
  useCreateRating,
  useGetRatingDetailsById,
  useUpdateRating,
  useDeleteRating,
};
