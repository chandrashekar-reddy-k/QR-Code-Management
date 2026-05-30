import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

// GET all vendors with pagination
const useGetAllVendorList = (page: number, limit: number) => {
  return useQuery({
    queryKey: ["vendor"],
    queryFn: () =>
      fetchData("venders/list", "GET", {
        page: page,
        limit: limit,
      }),
  });
};

// GET vendor by ID
const useGetVendorDetailsById = (id: string) => {
  return useQuery({
    queryKey: ["vendorById", id],
    queryFn: () => fetchData(`venders/${id}`, "GET"),
    enabled: !!id,
  });
};

interface createVendorResponse {
  status: boolean;
  response: string;
  data: object;
}

// CREATE vendor
const useCreateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createVendorResponse>("venders/create", "POST", payload),

    onSuccess: (data: createVendorResponse) => {
      toast.success(data.response);
      queryClient.invalidateQueries({ queryKey: ["vendor"] });
    },
  });
};

// UPDATE vendor
const useUpdateVendor = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: unknown) =>
      fetchData<createVendorResponse>(`venders/${id}`, "PUT", payload),

    onSuccess: (data: createVendorResponse) => {
      toast.success(data.response || "Vendor updated successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor"] });
      queryClient.invalidateQueries({ queryKey: ["vendorById"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update vendor");
    },
  });
};

// DELETE vendor
const useDeleteVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fetchData<createVendorResponse>(`venders/${id}`, "DELETE"),

    onSuccess: (data: createVendorResponse) => {
      toast.success(data.response || "Vendor deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete vendor");
    },
  });
};

// UPDATE vendor status (active/inactive)
const useUpdateVendorStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetchData<createVendorResponse>(`venders/${id}`, "PATCH", { isActive }),

    onSuccess: (data: createVendorResponse) => {
      toast.success(data.response || "Vendor status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update vendor status");
    },
  });
};

// APPROVE vendor request
const useApproveVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchData<createVendorResponse>(`venders/${id}/approve`, "POST"),

    onSuccess: (data: createVendorResponse) => {
      toast.success(data.response || "Vendor approved successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve vendor");
    },
  });
};

// REJECT vendor request
const useRejectVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchData<createVendorResponse>(`venders/${id}/reject`, "POST"),

    onSuccess: (data: createVendorResponse) => {
      toast.success(data.response || "Vendor rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject vendor");
    },
  });
};

export {
  useGetAllVendorList,
  useGetVendorDetailsById,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useUpdateVendorStatus,
  useApproveVendor,
  useRejectVendor,
};

