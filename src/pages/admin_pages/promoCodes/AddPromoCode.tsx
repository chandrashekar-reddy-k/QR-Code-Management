import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";
import {
  useCreatePromoCode,
  useGetPromoCodeById,
  useUpdatePromoCode,
} from "../../../hooks/promoCodes";
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
  appicableOn?: string;
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
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState("0");
  const today = new Date().toISOString().split("T")[0];
  const isPending =
    createPromoCodeMutation.isPending ||
    updatePromoCodeMutation.isPending ||
    (isEditing && isPromoCodesLoading);

  const promoCodes = useMemo(() => {
    const item = (promoCodeResponse as { data?: PromoCodeEditItem } | undefined)
      ?.data;
    return item ? [item] : [];
  }, [promoCodeResponse]);

  useEffect(() => {
    if (!isEditing) return;
    if (isPromoCodesLoading) return;

    const promoCodeToEdit = promoCodes.find(
      (p: PromoCodeEditItem) => String(p.id) === String(id),
    );
    if (!promoCodeToEdit) {
      alert("Promo code not found!");
      navigate("/promo-codes/manage");
      return;
    }

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
      // Keep max discount amount separate for percentage flow.
      // For AMOUNT type this is intentionally "0".
      startDate: (promoCodeToEdit.startDate || "").split("T")[0]
        ? formatDateForInput((promoCodeToEdit.startDate || "").split("T")[0])
        : "",
      startTime: promoCodeToEdit.startTime || "",
      endDate: (promoCodeToEdit.endDate || "").split("T")[0]
        ? formatDateForInput((promoCodeToEdit.endDate || "").split("T")[0])
        : "",
      endTime: promoCodeToEdit.endTime || "",
      usageLimit:
        String(promoCodeToEdit.repeatUsage || "").toUpperCase() === "MULTIPLE"
          ? "MULTIPLE"
          : "ONE",
      whereItApplies:
        String(promoCodeToEdit.appicableOn || "").toUpperCase() === "GLOBAL"
          ? "global"
          : "",
    });

    setMaximumDiscountAmount(
      String(
        String(promoCodeToEdit.discountType || "").toUpperCase() ===
          "PERCENTAGE"
          ? (promoCodeToEdit.maxDiscountAmount ?? "")
          : "0",
      ),
    );
  }, [id, isEditing, isPromoCodesLoading, navigate, promoCodes, reset]);

  useEffect(() => {
    if (!isEditing) {
      reset(DEFAULT_VALUES);
      setMaximumDiscountAmount("0");
    }
  }, [isEditing, reset]);

  const onSubmit = (values: PromoCodeFormValues) => {
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
      // noOfUsers: 0,
      minimumOrderAmount: Number(values.minimumOrderValue) || 0,
      discountType: selectedDiscountType,
      discount: selectedDiscountType === "AMOUNT" ? numericDiscount : null,
      percentageOff:
        selectedDiscountType === "PERCENTAGE" ? numericDiscount : null,
      maxDiscountAmount:
        selectedDiscountType === "PERCENTAGE" ? numericMaxDiscountAmount : null,
      appicableOn:
        values.whereItApplies === "global" ? "GLOBAL" : null,
      repeatUsage: selectedRepeatUsage,
      // image: "",
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

              {/* Where it applies (optional) */}
              <SelectInput
                label="Where it applies (optional)"
                error={errors.whereItApplies?.message}
                {...register("whereItApplies")}
              >
                <option value="">Select</option>
                <option value="global">Global</option>
              </SelectInput>
            </div>
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
