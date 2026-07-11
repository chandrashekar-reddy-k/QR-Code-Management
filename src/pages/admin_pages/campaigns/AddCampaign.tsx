import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { Save, Calendar } from "lucide-react";
import {
  useGetCampaignById,
  useCreateCampaign,
  useUpdateCampaign,
} from "../../../hooks/campaigns";
import { useGetPromoCodes } from "../../../hooks/promoCodes";
import { useGetBanners } from "../../../hooks/banners";
import { Campaign, CampaignFormValues } from "../../../types";
import useDebounce from "../../../hooks/useDebounce";
import {
  FormSectionWithDots,
  TextInput,
  Button,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { campaignFormValidation } from "../../../validationSchema/campaigns/campaignFormValidation";
import { formatDateForInput } from "../../../utils/formatters/dateTimeFormatters";
import CustomSearchableSelect from "../../../components/ui/Input/CustomSearchableSelect";
import { toast } from "react-toastify";

type CampaignEditApi = Campaign & {
  name?: string;
  promoCodeId?: string | number;
  bannerId?: string | number;
  promoCode?: PromoCodeListItem;
  banner?: BannerListItem;
};

type PromoCodeListItem = {
  id: string | number;
  promoCode?: string;
  code?: string;
  status?: string;
  isActive?: boolean;
};

type BannerListItem = {
  id: string | number;
  title?: string;
  name?: string;
  status?: string;
  isActive?: boolean;
};

type PromoCodesResponse = {
  data?:
    | PromoCodeListItem[]
    | { coupons?: PromoCodeListItem[]; promoCodes?: PromoCodeListItem[] };
  pagination?: { totalPages?: number };
};

type BannersResponse = {
  data?: { banners?: BannerListItem[] };
  pagination?: { totalPages?: number };
};

const DEFAULT_VALUES: CampaignFormValues = {
  campaignName: "",
  promoCodes: "",
  banners: "",
  startDate: "",
  endDate: "",
};

const AddCampaign = () => {
  const [promoSearch, setPromoSearch] = useState("");
  const [bannerSearch, setBannerSearch] = useState("");
  const [promoPage, setPromoPage] = useState(1);
  const [bannerPage, setBannerPage] = useState(1);
  const [promoItems, setPromoItems] = useState<PromoCodeListItem[]>([]);
  const [bannerItems, setBannerItems] = useState<BannerListItem[]>([]);
  /** Loaded campaign’s promo/banner so the select shows a label even if not in list page 1 */
  const [editPromo, setEditPromo] = useState<PromoCodeListItem | null>(null);
  const [editBanner, setEditBanner] = useState<BannerListItem | null>(null);
  const debouncedPromoSearch = useDebounce(promoSearch.trim(), 400);
  const debouncedBannerSearch = useDebounce(bannerSearch.trim(), 400);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;
  const createCampaignMutation = useCreateCampaign();
  const updateCampaignMutation = useUpdateCampaign(id);
  const { data: campaignResponse, isLoading: isCampaignLoading } =
    useGetCampaignById(id, isEditing);
  const { data: promoCodesResponse, isLoading: isPromoCodesLoading } =
    useGetPromoCodes({
      page: promoPage,
      limit: 20,
      search: debouncedPromoSearch,
      status: "ACTIVE",
      enabled: true,
    });
  const { data: bannersResponse, isLoading: isBannersLoading } = useGetBanners({
    page: bannerPage,
    limit: 20,
    search: debouncedBannerSearch,
    status: "ACTIVE",
    enabled: true,
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });
  const today = new Date().toISOString().split("T")[0];
  const [startDate, endDate] = watch(["startDate", "endDate"]);

  const promoRes = promoCodesResponse as PromoCodesResponse | undefined;
  const promoCodes = useMemo((): PromoCodeListItem[] => {
    const d = promoRes?.data;
    return Array.isArray(d) ? d : (d?.coupons ?? d?.promoCodes ?? []);
  }, [promoRes]);
  const promoTotalPages = Number(promoRes?.pagination?.totalPages ?? 1);
  const banners = useMemo(
    () =>
      (bannersResponse as BannersResponse | undefined)?.data?.banners ?? [],
    [bannersResponse],
  );
  const bannerTotalPages = Number(
    (bannersResponse as BannersResponse | undefined)?.pagination?.totalPages ??
      1,
  );
  const isPending =
    createCampaignMutation.isPending || updateCampaignMutation.isPending;
  const loading = isCampaignLoading || isPromoCodesLoading || isBannersLoading;

  useEffect(() => {
    setPromoPage(1);
    setPromoItems([]);
  }, [debouncedPromoSearch]);

  useEffect(() => {
    setBannerPage(1);
    setBannerItems([]);
  }, [debouncedBannerSearch]);

  useEffect(() => {
    setPromoItems((prev) => {
      const next = new Map<string, PromoCodeListItem>();
      if (promoPage > 1) {
        prev.forEach((p) => next.set(String(p.id), p));
      }
      promoCodes.forEach((p) => next.set(String(p.id), p));
      return [...next.values()];
    });
  }, [promoCodes, promoPage]);

  useEffect(() => {
    setBannerItems((prev) => {
      const next = new Map<string, BannerListItem>();
      if (bannerPage > 1) {
        prev.forEach((b) => next.set(String(b.id), b));
      }
      banners.forEach((b) => next.set(String(b.id), b));
      return [...next.values()];
    });
  }, [banners, bannerPage]);

  const promoCodeOptions = useMemo(() => {
    const opts = promoItems
      .filter((p) => p.id != null && String(p.id).length > 0)
      .map((p) => ({
        value: String(p.id),
        label: (p.promoCode || p.code || String(p.id)).trim() || String(p.id),
      }));
    if (
      editPromo?.id != null &&
      !opts.some((o) => o.value === String(editPromo.id))
    ) {
      opts.unshift({
        value: String(editPromo.id),
        label:
          (editPromo.promoCode || editPromo.code || String(editPromo.id)).trim() ||
          String(editPromo.id),
      });
    }
    return opts;
  }, [promoItems, editPromo]);

  const bannerOptions = useMemo(() => {
    const opts = bannerItems
      .filter((b) => b.id && (b.title || b.name))
      .map((b) => ({
        value: String(b.id),
        label: b.title || b.name || "-",
      }));
    if (
      editBanner?.id != null &&
      !opts.some((o) => o.value === String(editBanner.id))
    ) {
      opts.unshift({
        value: String(editBanner.id),
        label: editBanner.title || editBanner.name || "-",
      });
    }
    return opts;
  }, [bannerItems, editBanner]);

  useEffect(() => {
    if (isEditing) return;
    reset(DEFAULT_VALUES);
    setEditPromo(null);
    setEditBanner(null);
  }, [isEditing, reset]);

  useEffect(() => {
    if (!isEditing) return;
    if (isCampaignLoading) return;

    const routeCampaign = (
      location.state as { campaign?: CampaignEditApi } | null
    )?.campaign;
    const campaignToEdit =
      (campaignResponse as { data?: CampaignEditApi } | undefined)?.data ??
      routeCampaign;

    if (!campaignToEdit) {
      toast.error("Campaign not found!");
      navigate("/campaigns");
      return;
    }

    reset({
      campaignName: campaignToEdit.name || campaignToEdit.campaignName || "",
      promoCodes: String(
        campaignToEdit.promoCodeId || campaignToEdit.promoCodes || "",
      ),
      banners: String(campaignToEdit.bannerId || campaignToEdit.banners || ""),
      startDate: formatDateForInput(campaignToEdit.startDate || ""),
      endDate: formatDateForInput(campaignToEdit.endDate || ""),
    });

    const pc = campaignToEdit.promoCode;
    setEditPromo(
      pc?.id != null
        ? {
            id: pc.id,
            promoCode: pc.promoCode ?? pc.code,
            code: pc.code,
            status: pc.status,
          }
        : null,
    );
    const bn = campaignToEdit.banner;
    setEditBanner(
      bn?.id != null
        ? {
            id: bn.id,
            title: bn.title ?? bn.name,
            name: bn.name ?? bn.title,
            status: bn.status,
          }
        : null,
    );
  }, [
    campaignResponse,
    isCampaignLoading,
    isEditing,
    location.state,
    navigate,
    reset,
  ]);

  const onSubmit = (values: CampaignFormValues) => {
    const done = () => navigate("/campaigns");
    const body = {
      name: values.campaignName.trim(),
      promoCodeId: values.promoCodes,
      bannerId: values.banners,
      startDate: `${values.startDate}T00:00:00.000Z`,
      endDate: `${values.endDate}T23:59:59.000Z`,
    };
    (isEditing ? updateCampaignMutation : createCampaignMutation).mutate(body, {
      onSuccess: done,
    });
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditing ? "Edit Campaign" : "Add Campaign"}
        </h1>
        <BackButton to="/campaigns" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          {/* Campaign Information Section */}
          <FormSectionWithDots title="Campaign Information">
            {/* Campaign Name */}
            <TextInput
              label="Campaign Name"
              required
              type="text"
              placeholder="Enter name"
              error={errors.campaignName?.message}
              {...register("campaignName", campaignFormValidation.campaignName)}
            />

            {/* Promo Codes and Banners - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Promo Codes */}
              <Controller
                name="promoCodes"
                control={control}
                rules={campaignFormValidation.promoCodes}
                render={({ field }) => (
                  <CustomSearchableSelect
                    label="Promo Codes"
                    required
                    value={String(field.value || "")}
                    options={promoCodeOptions}
                    onChange={field.onChange}
                    searchValue={promoSearch}
                    onSearchChange={setPromoSearch}
                    hasMore={promoPage < promoTotalPages}
                    isLoadingMore={isPromoCodesLoading}
                    onLoadMore={() =>
                      setPromoPage((prev) =>
                        prev < promoTotalPages ? prev + 1 : prev,
                      )
                    }
                    error={errors.promoCodes?.message}
                    placeholder="Select"
                  />
                )}
              />

              {/* Banners */}
              <Controller
                name="banners"
                control={control}
                rules={campaignFormValidation.banners}
                render={({ field }) => (
                  <CustomSearchableSelect
                    label="Banners"
                    required
                    value={String(field.value || "")}
                    options={bannerOptions}
                    onChange={field.onChange}
                    searchValue={bannerSearch}
                    onSearchChange={setBannerSearch}
                    hasMore={bannerPage < bannerTotalPages}
                    isLoadingMore={isBannersLoading}
                    onLoadMore={() =>
                      setBannerPage((prev) =>
                        prev < bannerTotalPages ? prev + 1 : prev,
                      )
                    }
                    error={errors.banners?.message}
                    placeholder="Select"
                  />
                )}
              />
            </div>

            {/* Start Date and End Date - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-[34px] -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                  size={16}
                />
                <TextInput
                  label="Start Date"
                  required
                  type="date"
                  min={today}
                  className="pl-9"
                  placeholder="Enter Discount"
                  error={errors.startDate?.message}
                  {...register("startDate", {
                    ...campaignFormValidation.startDate,
                    validate: (value) =>
                      !value ||
                      value >= today ||
                      "Start date cannot be in the past",
                    onChange: (e) => {
                      const nextStartDate = e.target.value;
                      if (endDate && nextStartDate && endDate < nextStartDate) {
                        setValue("endDate", "", { shouldValidate: true });
                      }
                    },
                  })}
                />
              </div>

              {/* End Date */}
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-[34px] -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                  size={16}
                />
                <TextInput
                  label="End Date"
                  required
                  type="date"
                  min={startDate || today}
                  className="pl-9"
                  placeholder="Select"
                  error={errors.endDate?.message}
                  {...register("endDate", {
                    ...campaignFormValidation.endDate,
                    validate: (value) => {
                      if (!value) return true;
                      if (value < today)
                        return "End date cannot be in the past";
                      if (startDate && value < startDate)
                        return "End date cannot be earlier than start date";
                      return true;
                    },
                  })}
                />
              </div>
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/campaigns")}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={loading || isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>{isEditing ? "Update Campaign" : "Add Campaign"}</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddCampaign;
