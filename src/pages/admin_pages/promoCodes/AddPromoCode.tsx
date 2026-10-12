import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Save, Search, Check, X, Package } from "lucide-react";
import {
  useCreatePromoCode,
  useGetPromoCodeById,
  useUpdatePromoCode,
} from "../../../hooks/promoCodes";
import { useGetAllProductList } from "../../../hooks/product";
import { PromoCodeFormValues } from "../../../types/promoCode.types";
import {
  FormSectionWithDots,
  TextInput,
  SelectInput,
  Button,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { promoCodeFormValidation } from "../../../validationSchema/promoCodes/promoCodeFormValidation";
import { formatDateForInput } from "../../../utils/formatters/dateTimeFormatters";

const DEFAULT_VALUES: PromoCodeFormValues = {
  codeName: "",
  discountType: "",
  minimumOrderValue: "",
  maximumDiscount: "0",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  usageLimit: "",
  whereItApplies: "",
};

type PromoCodeEditItem = {
  id: string | number;
  promoCode?: string;
  discountType?: string;
  minimumOrderAmount?: number;
  discount?: number | null;
  maxDiscountAmount?: number | null;
  percentageOff?: number | null;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  repeatUsage?: string;
  usageLimit?: string;
  maxUsesPerUser?: number | string | null;
  appicableOn?: string;
  scope?: string;
  products?: Array<{ id: string; name?: string; sku?: string; images?: string[]; price?: number }>;
  productIds?: string[];
  mappedProductOffers?: Record<string, any>;
};

const AddPromoCode = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const createPromoCodeMutation = useCreatePromoCode();
  const updatePromoCodeMutation = useUpdatePromoCode(id);
  const { data: promoCodeResponse, isLoading: isPromoCodesLoading } =
    useGetPromoCodeById(id, isEditing);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PromoCodeFormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const startTime = watch("startTime");
  const selectedDiscountType = watch("discountType");
  const whereItApplies = watch("whereItApplies");
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState("0");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productOffers, setProductOffers] = useState<Record<string, any>>({});
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const isPending =
    createPromoCodeMutation.isPending ||
    updatePromoCodeMutation.isPending ||
    (isEditing && isPromoCodesLoading);

  // Fetch products list for mapping (only Online App channel products)
  const { data: productsData, isLoading: isProductsLoading } = useGetAllProductList(1, 1000, productSearchTerm);
  const allProducts: any[] = useMemo(() => {
    const raw = productsData?.data?.data || productsData?.data?.products || productsData?.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.filter((p: any) => {
      const hasOnlineChannel = Array.isArray(p.channelInventories) && p.channelInventories.some((ci: any) => ci.channel === 'ONLINE_APP' && (ci.isActive || Number(ci.quantity) > 0));
      const isPublished = p.onlineAppStock?.isPublished !== undefined
        ? Boolean(p.onlineAppStock.isPublished)
        : (p.isOnline === true || (Array.isArray(p.tags) && p.tags.includes('CH:ONLINE')) || hasOnlineChannel);
      const hasOnlineStock = Number(p.onlineStock ?? p.onlineAppStock?.onlineStock ?? p.stageStocks?.LIVE) > 0;

      return isPublished || hasOnlineStock;
    });
  }, [productsData]);

  const promoCodeToEdit = useMemo(() => {
    if (!promoCodeResponse) return null;
    const resData: any = (promoCodeResponse as any)?.data;
    if (!resData) return null;
    if (Array.isArray(resData)) {
      return resData.find((p: any) => String(p.id) === String(id)) || null;
    }
    return resData;
  }, [promoCodeResponse, id]);

  useEffect(() => {
    if (!isEditing) return;
    if (isPromoCodesLoading) return;
    if (!promoCodeToEdit) return;

    const isSpecific = String(promoCodeToEdit.scope || promoCodeToEdit.appicableOn || '').toUpperCase() === 'SPECIFIC_PRODUCTS';

    const rawUsage = String(
      promoCodeToEdit.repeatUsage ??
      promoCodeToEdit.usageLimit ??
      promoCodeToEdit.maxUsesPerUser ??
      ""
    ).trim().toUpperCase();

    const resolvedUsageLimit = (rawUsage === "ONE" || rawUsage === "1" || promoCodeToEdit.maxUsesPerUser === 1)
      ? "ONE"
      : "MULTIPLE";

    reset({
      codeName: promoCodeToEdit.promoCode || "",
      discountType:
        String(promoCodeToEdit.discountType || "").toUpperCase() ===
        "PERCENTAGE"
          ? "PERCENTAGE"
          : "AMOUNT",
      minimumOrderValue: promoCodeToEdit.minimumOrderAmount?.toString() || "",
      maximumDiscount:
        String(promoCodeToEdit.discountType || "").toUpperCase() ===
        "PERCENTAGE"
          ? String(promoCodeToEdit.percentageOff ?? "")
          : String(promoCodeToEdit.discount ?? ""),
      startDate: (promoCodeToEdit.startDate || "").split("T")[0]
        ? formatDateForInput((promoCodeToEdit.startDate || "").split("T")[0])
        : "",
      startTime: promoCodeToEdit.startTime || "",
      endDate: (promoCodeToEdit.endDate || "").split("T")[0]
        ? formatDateForInput((promoCodeToEdit.endDate || "").split("T")[0])
        : "",
      endTime: promoCodeToEdit.endTime || "",
      usageLimit: resolvedUsageLimit,
      whereItApplies: isSpecific
        ? "SPECIFIC_PRODUCTS"
        : (String(promoCodeToEdit.appicableOn || "").toUpperCase() === "GLOBAL" ? "global" : ""),
    });

    if (promoCodeToEdit.mappedProductOffers) {
      setProductOffers(promoCodeToEdit.mappedProductOffers);
    } else if (promoCodeToEdit.products && Array.isArray(promoCodeToEdit.products)) {
      const offers: Record<string, any> = {};
      promoCodeToEdit.products.forEach((p: any) => {
        const pid = String(p.id || p.productId);
        if (p.offerPrice !== undefined && p.offerPrice !== null) {
          offers[pid] = p.offerPrice;
        }
      });
      setProductOffers(offers);
    }

    if (promoCodeToEdit.productIds && Array.isArray(promoCodeToEdit.productIds)) {
      setSelectedProductIds(promoCodeToEdit.productIds.map(String));
    } else if (promoCodeToEdit.products && Array.isArray(promoCodeToEdit.products)) {
      setSelectedProductIds(promoCodeToEdit.products.map((p: any) => String(p.id || p.productId)));
    }

    setMaximumDiscountAmount(
      String(
        String(promoCodeToEdit.discountType || "").toUpperCase() ===
          "PERCENTAGE"
          ? (promoCodeToEdit.maxDiscountAmount ?? "")
          : "0",
      ),
    );
  }, [id, isEditing, isPromoCodesLoading, navigate, promoCodeToEdit, reset]);

  useEffect(() => {
    if (!isEditing) {
      reset(DEFAULT_VALUES);
      setMaximumDiscountAmount("0");
      setSelectedProductIds([]);
      setProductOffers({});
    }
  }, [isEditing, reset]);

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const onSubmit = (values: PromoCodeFormValues) => {
    if (values.whereItApplies === "SPECIFIC_PRODUCTS" && selectedProductIds.length === 0) {
      alert("Please select at least one product for product-mapped promo code.");
      return;
    }

    const numericDiscount = Number(values.maximumDiscount) || 0;
    const numericMaxDiscountAmount = Number(maximumDiscountAmount) || 0;
    const selectedDiscountType: "AMOUNT" | "PERCENTAGE" =
      values.discountType === "PERCENTAGE" ? "PERCENTAGE" : "AMOUNT";
    const selectedRepeatUsage: "ONE" | "MULTIPLE" =
      values.usageLimit === "MULTIPLE" ? "MULTIPLE" : "ONE";

    const onSuccess = () => {
      navigate("/promo-codes/manage");
    };

    const basePayload = {
      promoCode: values.codeName.trim(),
      message: values.codeName.trim(),
      startDate: `${values.startDate}T00:00:00.000Z`,
      startTime: values.startTime,
      endTime: values.endTime,
      endDate: `${values.endDate}T23:59:59.000Z`,
      minimumOrderAmount: Number(values.minimumOrderValue) || 0,
      discountType: selectedDiscountType,
      discount: selectedDiscountType === "AMOUNT" ? numericDiscount : null,
      percentageOff:
        selectedDiscountType === "PERCENTAGE" ? numericDiscount : null,
      maxDiscountAmount:
        selectedDiscountType === "PERCENTAGE" ? numericMaxDiscountAmount : null,
      appicableOn:
        values.whereItApplies === "SPECIFIC_PRODUCTS"
          ? "SPECIFIC_PRODUCTS"
          : values.whereItApplies === "global"
          ? "GLOBAL"
          : null,
      scope: values.whereItApplies || "GLOBAL",
      repeatUsage: selectedRepeatUsage,
      maxUsesPerUser: selectedRepeatUsage === "ONE" ? 1 : null,
      productIds: values.whereItApplies === "SPECIFIC_PRODUCTS" ? selectedProductIds : [],
      productOffers: values.whereItApplies === "SPECIFIC_PRODUCTS" ? productOffers : {},
    };

    if (isEditing) {
      updatePromoCodeMutation.mutate(basePayload, { onSuccess });
      return;
    }

    createPromoCodeMutation.mutate(basePayload, { onSuccess });
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditing ? "Edit Promo Code" : "Add Promo Code"}
        </h1>
        <BackButton to="/promo-codes/manage" />
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
          {/* Promo Code Information Section */}
          <FormSectionWithDots title="Promo Code Information">
            {/* Code Name */}
            <TextInput
              label="Code Name"
              required
              type="text"
              placeholder="Enter Name"
              error={errors.codeName?.message}
              {...register("codeName", promoCodeFormValidation.codeName)}
            />

            {/* Select Discount Type */}
            <SelectInput
              label="Select Discount Type"
              required
              error={errors.discountType?.message}
              {...register(
                "discountType",
                promoCodeFormValidation.discountType,
              )}
            >
              <option value="">Select</option>
              <option value="AMOUNT">Flat</option>
              <option value="PERCENTAGE">Percentage</option>
            </SelectInput>

            {/* Minimum order value and discount value - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Minimum order value */}
              <TextInput
                label="Minimum order value"
                required
                type="text"
                placeholder="Enter promo"
                error={errors.minimumOrderValue?.message}
                {...register(
                  "minimumOrderValue",
                  promoCodeFormValidation.minimumOrderValue,
                )}
              />

              {/* Discount value based on selected discount type */}
              {selectedDiscountType === "AMOUNT" && (
                <TextInput
                  label="Flat Amount (₹)"
                  type="text"
                  placeholder="0"
                  error={errors.maximumDiscount?.message}
                  {...register(
                    "maximumDiscount",
                    promoCodeFormValidation.maximumDiscount,
                  )}
                />
              )}
              {selectedDiscountType === "PERCENTAGE" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-1">
                  <TextInput
                    label="Percentage (%)"
                    type="text"
                    placeholder="0"
                    error={errors.maximumDiscount?.message}
                    {...register(
                      "maximumDiscount",
                      promoCodeFormValidation.maximumDiscount,
                    )}
                  />
                  <TextInput
                    label="Max Discount Amount (₹)"
                    type="text"
                    placeholder="0"
                    value={maximumDiscountAmount}
                    onChange={(e) => setMaximumDiscountAmount(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Start Date and Start Time - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <TextInput
                label="Start Date"
                required
                type="date"
                min={today}
                max={endDate || undefined}
                error={errors.startDate?.message}
                {...register("startDate", {
                  ...promoCodeFormValidation.startDate,
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

              {/* Start Time */}
              <TextInput
                label="Start Time"
                required
                type="time"
                error={errors.startTime?.message}
                {...register("startTime", promoCodeFormValidation.startTime)}
              />
            </div>

            {/* End Date and End Time - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* End Date */}
              <TextInput
                label="End Date"
                required
                type="date"
                min={startDate || today}
                error={errors.endDate?.message}
                {...register("endDate", {
                  ...promoCodeFormValidation.endDate,
                  validate: (value) => {
                    if (value && value < today) {
                      return "End date cannot be in the past";
                    }
                    if (startDate && value && value < startDate) {
                      return "End date cannot be earlier than start date";
                    }
                    return true;
                  },
                })}
              />

              {/* End Time */}
              <TextInput
                label="End Time"
                required
                type="time"
                error={errors.endTime?.message}
                {...register("endTime", {
                  ...promoCodeFormValidation.endTime,
                  validate: (value) =>
                    startDate !== endDate ||
                    !startTime ||
                    !value ||
                    value > startTime ||
                    "End time must be later than start time",
                })}
              />
            </div>

            {/* Usage Limit and Where it applies - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Usage Limit */}
              <SelectInput
                label="Usage Limit"
                required
                error={errors.usageLimit?.message}
                {...register("usageLimit", promoCodeFormValidation.usageLimit)}
              >
                <option value="">Select</option>
                <option value="ONE">One</option>
                <option value="MULTIPLE">Multiple</option>
              </SelectInput>

              {/* Where it applies */}
              <SelectInput
                label="Where it applies"
                error={errors.whereItApplies?.message}
                {...register("whereItApplies")}
              >
                <option value="">Select</option>
                <option value="global">Global (Entire Order)</option>
                <option value="SPECIFIC_PRODUCTS">Specific Products (Product Offer)</option>
              </SelectInput>
            </div>

            {/* Specific Products Selector */}
            {whereItApplies === "SPECIFIC_PRODUCTS" && (
              <div className="mt-4 p-4 border border-emerald-200 bg-emerald-50/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Package size={15} className="text-emerald-700" />
                    Map Eligible Products ({selectedProductIds.length} selected)
                  </label>
                  {selectedProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedProductIds([])}
                      className="text-[11px] font-semibold text-red-600 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Search bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-900 outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Selected Products Chips */}
                {selectedProductIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedProductIds.map((id) => {
                      const prod = allProducts.find((p: any) => String(p.id) === String(id));
                      const name = prod?.name || (typeof prod?.name === 'object' ? prod?.name?.name : id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-medium border border-emerald-300"
                        >
                          <span className="truncate max-w-[150px]">{name}</span>
                          <button
                            type="button"
                            onClick={() => toggleProductSelection(id)}
                            className="text-emerald-700 hover:text-red-600"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Product List Grid */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 bg-white border border-gray-200 rounded-lg p-2">
                  {isProductsLoading ? (
                    <p className="text-xs text-gray-400 text-center py-4">Loading products...</p>
                  ) : allProducts.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No products found</p>
                  ) : (
                    allProducts.map((product: any) => {
                      const pid = String(product.id);
                      const isSelected = selectedProductIds.includes(pid);
                      const prodName = typeof product.name === 'object' && product.name !== null ? product.name.name : (product.name || 'Item');
                      const basePrice = product.price || product.sellingPrice || 0;
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/70 border border-emerald-300 font-semibold text-emerald-950'
                              : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                          }`}
                        >
                          <div
                            onClick={() => toggleProductSelection(pid)}
                            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="truncate">{prodName}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] font-bold text-gray-400">Regular: ₹{basePrice}</span>
                            {isSelected && (
                              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-emerald-300 shadow-xs">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase">Offer ₹:</span>
                                <input
                                  type="number"
                                  placeholder={String(basePrice)}
                                  value={productOffers[pid] ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProductOffers(prev => ({
                                      ...prev,
                                      [pid]: val
                                    }));
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-16 text-center text-xs font-bold text-emerald-800 bg-transparent outline-none border-b border-emerald-400 focus:border-emerald-600"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/promo-codes/manage")}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>{isEditing ? "Update Promo Code" : "Add Promo Code"}</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddPromoCode;

