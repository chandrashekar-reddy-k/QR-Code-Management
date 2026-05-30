import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

type BannersQueryParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  isActive?: string;
  bannerType?: string;
  enabled?: boolean;
};

const BANNERS_ENDPOINT = "partner/promotions/banners/getall";
const GET_BANNER_BY_ID_ENDPOINT = "partner/promotions/banners/get";
const CREATE_BANNER_ENDPOINT = "partner/promotions/banners/create";
const UPDATE_BANNER_ENDPOINT = "partner/promotions/banners/update";
const TOGGLE_BANNER_ENDPOINT = "partner/promotions/banners/toggle";

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

type CreateBannerPayload = {
  title: string;
  bannerType: string;
  subtitle: string;
  imageUrl: string;
  redirectUrl: string;
  position: number;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE";
  startAt: string;
  endAt: string;
};

type UpdateBannerPayload = {
  title: string;
  subtitle: string;
  position: number;
  status: "ACTIVE" | "INACTIVE";
};

const useGetBanners = ({
  page,
  limit,
  search = "",
  status = "",
  isActive = "",
  bannerType = "",
  enabled = true,
}: BannersQueryParams) => {
  return useQuery({
    queryKey: ["banners", page, limit, search, status, isActive, bannerType],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
      });
      if (status) params.set("status", status.toUpperCase());
      if (isActive) params.set("isActive", isActive);
      if (bannerType) params.set("bannerType", bannerType);

      const response = await fetchData(
        `${BANNERS_ENDPOINT}?${params.toString()}`,
        "GET",
        undefined,
        signal,
      );
      return response;
    },
    enabled,
    retry: false,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useGetBannerById = (bannerId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["banner", bannerId],
    queryFn: ({ signal }) => {
      if (!bannerId) throw new Error("Banner id is required");
      return fetchData(
        `${GET_BANNER_BY_ID_ENDPOINT}/${bannerId}`,
        "GET",
        undefined,
        signal,
      );
    },
    enabled: enabled && !!bannerId,
    retry: false,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useCreateBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBannerPayload) =>
      fetchData(CREATE_BANNER_ENDPOINT, "POST", payload),
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "Banner created successfully"));
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useUpdateBanner = (bannerId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBannerPayload) => {
      if (!bannerId) throw new Error("Banner id is required");
      return fetchData(`${UPDATE_BANNER_ENDPOINT}/${bannerId}`, "PUT", payload);
    },
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "Banner updated successfully"));
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useToggleBannerStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bannerId: number) =>
      fetchData(`${TOGGLE_BANNER_ENDPOINT}/${bannerId}`, "PATCH"),
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "Banner status updated successfully"));
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export {
  useGetBanners,
  useGetBannerById,
  useCreateBanner,
  useUpdateBanner,
  useToggleBannerStatus,
};
