import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

export type AppSection = {
  id: string;
  titleType: string;
  title: string;
  subTitle?: string;
  roleName?: string;
  icon?: string;
  linkPath?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAppSectionPayload = {
  titleType: string;
  title: string;
  subTitle?: string;
  roleName?: string;
  icon?: string;
  linkPath?: string;
  displayOrder?: number;
  isActive?: boolean;
};

export type UpdateAppSectionPayload = Partial<CreateAppSectionPayload>;

const APP_SECTIONS_ENDPOINT = "partner/promotions/app-sections";

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      message?: string;
      response?: string;
      data?: { message?: string; response?: string };
    };
    return (
      apiError.message ||
      apiError.response ||
      apiError.data?.message ||
      apiError.data?.response ||
      "Something went wrong"
    );
  }
  return "Something went wrong";
};

const getSuccessMessage = (result: unknown, fallbackMessage: string) => {
  if (typeof result === "object" && result !== null) {
    const apiResult = result as {
      message?: string;
      response?: string;
      data?: { message?: string; response?: string };
    };
    return (
      apiResult.message ||
      apiResult.response ||
      apiResult.data?.message ||
      apiResult.data?.response ||
      fallbackMessage
    );
  }
  return fallbackMessage;
};

export const useGetAppSections = (params?: { titleType?: string; isActive?: boolean; roleName?: string }) => {
  return useQuery({
    queryKey: ["app-sections", params],
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams();
      if (params?.titleType) searchParams.set("titleType", params.titleType);
      if (params?.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
      if (params?.roleName) searchParams.set("roleName", params.roleName);

      const qs = searchParams.toString();
      const endpoint = qs ? `${APP_SECTIONS_ENDPOINT}?${qs}` : APP_SECTIONS_ENDPOINT;
      const response = await fetchData(endpoint, "GET", undefined, signal);
      return response;
    },
    retry: false,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useGetAppSectionById = (id?: string, enabled = true) => {
  return useQuery({
    queryKey: ["app-section", id],
    queryFn: ({ signal }) => {
      if (!id) throw new Error("Section ID is required");
      return fetchData(`${APP_SECTIONS_ENDPOINT}/${id}`, "GET", undefined, signal);
    },
    enabled: enabled && !!id,
    retry: false,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useCreateAppSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAppSectionPayload) =>
      fetchData(APP_SECTIONS_ENDPOINT, "POST", payload),
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "App section created successfully"));
      queryClient.invalidateQueries({ queryKey: ["app-sections"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useUpdateAppSection = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAppSectionPayload) => {
      if (!id) throw new Error("Section ID is required");
      return fetchData(`${APP_SECTIONS_ENDPOINT}/${id}`, "PUT", payload);
    },
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "App section updated successfully"));
      queryClient.invalidateQueries({ queryKey: ["app-sections"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useDeleteAppSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchData(`${APP_SECTIONS_ENDPOINT}/${id}`, "DELETE"),
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "App section deleted successfully"));
      queryClient.invalidateQueries({ queryKey: ["app-sections"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
