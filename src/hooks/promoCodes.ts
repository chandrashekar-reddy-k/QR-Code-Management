import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

type PromoCodesQueryParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  discountType?: string;
  enabled?: boolean;
};

const PROMO_CODES_ENDPOINT = "partner/promotions/promocodes/getall";
const GET_PROMO_CODE_BY_ID_ENDPOINT = "partner/promotions/promocodes/get";
const CREATE_PROMO_CODE_ENDPOINT = "partner/promotions/promocodes/create";
const UPDATE_PROMO_CODE_ENDPOINT = "partner/promotions/promocodes/update";
const TOGGLE_PROMO_CODE_ENDPOINT = "partner/promotions/promocodes/toggle";

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

type CreatePromoCodePayload = {
  promoCode: string;
  message: string;
  startDate: string;
  startTime: string;
  endTime: string;
  endDate: string;
  noOfUsers?: number;
  minimumOrderAmount: number;
  discountType: "AMOUNT" | "PERCENTAGE";
  discount: number | null;
  maxDiscountAmount: number | null;
  percentageOff: number | null;
  appicableOn: string | null;
  repeatUsage: "ONE" | "MULTIPLE";
  image?: string;
  status?: "ACTIVE" | "INACTIVE";
};

type UpdatePromoCodePayload = CreatePromoCodePayload;

const useGetPromoCodes = ({
  page,
  limit,
  search = "",
  status = "",
  discountType = "",
  enabled = true,
}: PromoCodesQueryParams) => {
  return useQuery({
    queryKey: ["promoCodes", page, limit, search, status, discountType],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
      });
      if (status) params.set("status", status.toUpperCase());
      if (discountType) params.set("discountType", discountType.toUpperCase());

      const response = await fetchData(
        `${PROMO_CODES_ENDPOINT}?${params.toString()}`,
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

const useGetPromoCodeById = (promoCodeId?: string, enabled = true) => {
  return useQuery({
    queryKey: ["promoCode", promoCodeId],
    queryFn: ({ signal }) => {
      if (!promoCodeId) throw new Error("Promo code id is required");
      return fetchData(
        `${GET_PROMO_CODE_BY_ID_ENDPOINT}/${promoCodeId}`,
        "GET",
        undefined,
        signal,
      );
    },
    enabled: enabled && !!promoCodeId,
    retry: false,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useCreatePromoCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePromoCodePayload) =>
      fetchData(CREATE_PROMO_CODE_ENDPOINT, "POST", payload),
    onSuccess: (result) => {
      toast.success(
        getSuccessMessage(result, "Promo code created successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useUpdatePromoCode = (promoCodeId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePromoCodePayload) => {
      if (!promoCodeId) throw new Error("Promo code id is required");
      return fetchData(
        `${UPDATE_PROMO_CODE_ENDPOINT}/${promoCodeId}`,
        "PUT",
        payload,
      );
    },
    onSuccess: (result) => {
      toast.success(
        getSuccessMessage(result, "Promo code updated successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

const useTogglePromoCodeStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (promoCodeId: string | number) =>
      fetchData(`${TOGGLE_PROMO_CODE_ENDPOINT}/${promoCodeId}`, "PATCH"),
    onSuccess: (result) => {
      toast.success(
        getSuccessMessage(result, "Promo code status updated successfully"),
      );
      queryClient.invalidateQueries({ queryKey: ["promoCodes"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export {
  useGetPromoCodes,
  useGetPromoCodeById,
  useCreatePromoCode,
  useUpdatePromoCode,
  useTogglePromoCodeStatus,
};
