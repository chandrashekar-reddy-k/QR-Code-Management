import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

type CampaignsQueryParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  isActive?: boolean;
  enabled?: boolean;
};

const CAMPAIGNS_ENDPOINT = "partner/promotions/campaigns/getall";
const GET_CAMPAIGN_BY_ID_ENDPOINT = "partner/promotions/campaigns/get";
const CREATE_CAMPAIGN_ENDPOINT = "partner/promotions/campaigns/create";
const UPDATE_CAMPAIGN_ENDPOINT = "partner/promotions/campaigns/update";
const TOGGLE_CAMPAIGN_ENDPOINT = "partner/promotions/campaigns/toggle";

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

type CreateCampaignPayload = {
  name: string;
  promoCodeId: string | number;
  bannerId: string | number;
  startDate: string;
  endDate: string;
};

type UpdateCampaignPayload = {
  name: string;
  promoCodeId?: string | number;
  bannerId?: string | number;
  startDate?: string;
  endDate?: string;
};

const useGetCampaigns = ({
  page,
  limit,
  search = "",
  status = "",
  isActive,
  enabled = true,
}: CampaignsQueryParams) => {
  return useQuery({
    queryKey: ["campaigns", page, limit, search, status, isActive],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
      });
      if (status) params.set("status", status.toUpperCase());
      if (typeof isActive === "boolean") {
        params.set("isActive", String(isActive));
      }

      const response = await fetchData(
        `${CAMPAIGNS_ENDPOINT}?${params.toString()}`,
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

const useGetCampaignById = (campaignId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: ({ signal }) => {
      if (!campaignId) throw new Error("Campaign id is required");
      return fetchData(
        `${GET_CAMPAIGN_BY_ID_ENDPOINT}/${campaignId}`,
        "GET",
        undefined,
        signal,
      );
    },
    enabled: enabled && !!campaignId,
    retry: false,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) =>
      fetchData(CREATE_CAMPAIGN_ENDPOINT, "POST", payload),
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "Campaign created successfully"));
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useUpdateCampaign = (campaignId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCampaignPayload) => {
      if (!campaignId) throw new Error("Campaign id is required");
      return fetchData(`${UPDATE_CAMPAIGN_ENDPOINT}/${campaignId}`, "PUT", payload);
    },
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "Campaign updated successfully"));
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useToggleCampaignStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: number | string) =>
      fetchData(`${TOGGLE_CAMPAIGN_ENDPOINT}/${campaignId}`, "PATCH"),
    onSuccess: (result) => {
      toast.success(getSuccessMessage(result, "Campaign status updated successfully"));
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export {
  useGetCampaigns,
  useGetCampaignById,
  useCreateCampaign,
  useUpdateCampaign,
  useToggleCampaignStatus,
};
