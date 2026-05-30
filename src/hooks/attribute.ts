import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

const useGetAllAttributeList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["attribute", page, limit],
    queryFn: () =>
      fetchData(`attribute/getAttributeList?page=${page}&limit=${limit}`, "GET"),
  });
};

interface createAttributeResponse {
  status: boolean;
  response: string;
  data: object;
}

interface AttributeByIdResponse {
  status: boolean;
  response: string;
  data: {
    id: string;
    name: string;
    type: string;
    isRequired: boolean;
    isFilterable: boolean;
    isSearchable: boolean;
    status: string;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
  };
}

// GET attribute by ID
const useGetAttributeById = (id: string | undefined) => {
  return useQuery({
    queryKey: ["attribute", id],
    queryFn: () =>
      fetchData<AttributeByIdResponse>(`attribute/${id}`, "GET"),
    enabled: !!id,
  });
};

// CREATE attribute
const useCreateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createAttributeResponse>("attribute/createAttribute", "POST", payload),

    onSuccess: (data: createAttributeResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["attribute"] });
    },
  });
};

// UPDATE attribute
const useUpdateAttribute = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createAttributeResponse>(`attribute/${id}`, "PATCH", payload),

    onSuccess: (data: createAttributeResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["attribute"] });
      queryClient.invalidateQueries({ queryKey: ["attribute", id] });
    },
  });
};

// DELETE attribute
const useDeleteAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchData<createAttributeResponse>(`attribute/${id}`, "DELETE"),

    onSuccess: (data: createAttributeResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["attribute"] });
    },
  });
};

export { useGetAllAttributeList, useGetAttributeById, useCreateAttribute, useUpdateAttribute, useDeleteAttribute };

