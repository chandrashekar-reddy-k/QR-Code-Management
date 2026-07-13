import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Save, Calendar, Upload } from "lucide-react";
import {
  FormSectionWithDots,
  TextInput,
  SelectInput,
  Button,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { bannerFormValidation } from "../../../validationSchema/banners/bannerFormValidation";
import {
  useCreateBanner,
  useGetBannerById,
  useUpdateBanner,
} from "../../../hooks/banners";
import { Banner, BannerFormValues } from "../../../types/banner.types";
import { formatDateForInput } from "../../../utils/formatters/dateTimeFormatters";
import { uploadImageFile } from "../../../lib/uploadImage";
import {
  BANNER_POSITION_OPTIONS,
  BANNER_TYPE_OPTIONS,
} from "../../../config/banners/addBannerConfig";

const DEFAULT_VALUES: BannerFormValues = {
  bannerTitle: "",
  bannerType: "",
  position: "",
  whereToShow: "",
  startDate: "",
  endDate: "",
};

const AddBanner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;
  const createBannerMutation = useCreateBanner();
  const updateBannerMutation = useUpdateBanner(id);
  const { data: bannerResponse, isLoading: isBannerLoading } = useGetBannerById(
    id,
    isEditing,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<BannerFormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });
  const today = new Date().toISOString().split("T")[0];

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const isPending =
    createBannerMutation.isPending ||
    updateBannerMutation.isPending ||
    (isEditing && isBannerLoading);

  useEffect(() => {
    if (isEditing) return;
    reset(DEFAULT_VALUES);
  }, [isEditing, reset]);

  useEffect(() => {
    if (!isEditing) return;
    if (isBannerLoading) return;

    const routeBanner = (location.state as { banner?: Banner } | null)?.banner;
    const bannerToEdit =
      (bannerResponse as { data?: Banner } | undefined)?.data ?? routeBanner;
    if (bannerToEdit) {
      reset({
        bannerTitle: bannerToEdit.title || bannerToEdit.bannerName || "",
        bannerType: bannerToEdit.bannerType || bannerToEdit.whereToShow || "",
        position: bannerToEdit.position
          ? `Slide ${bannerToEdit.position}`
          : "",
        whereToShow: bannerToEdit.whereToShow || bannerToEdit.bannerType || "",
        startDate: formatDateForInput(
          bannerToEdit.startAt || bannerToEdit.startDate || "",
        ),
        endDate: formatDateForInput(
          bannerToEdit.endAt || bannerToEdit.endDate || "",
        ),
      });
      setImagePreview(bannerToEdit.imageUrl || bannerToEdit.image || null);
      return;
    }

    alert("Banner not found!");
    navigate("/banners");
  }, [
    bannerResponse,
    isBannerLoading,
    isEditing,
    location.state,
    navigate,
    reset,
  ]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (
      file &&
      (file.type.startsWith("image/") || file.type === "application/pdf")
    ) {
      handleFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    setImageFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
    clearErrors("root.image");
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    const input = document.getElementById("image-upload") as HTMLInputElement;
    if (input) input.value = "";
  };

  const onSubmit = async (values: BannerFormValues) => {
    if (!isEditing && !imageFile && !imagePreview) {
      setError("root.image", {
        type: "required",
        message: "Image is required",
      });
      return;
    }

    let imageUrl = imagePreview || "";
    if (imageFile) {
      try {
        imageUrl = await uploadImageFile(imageFile);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Image upload failed";
        setError("root.image", { type: "manual", message });
        return;
      }
    }

    const onSuccess = () => navigate("/banners");

    const basePayload = {
      title: values.bannerTitle.trim(),
      bannerType: values.bannerType,
      subtitle: "",
      imageUrl,
      redirectUrl: "",
      position: Number(values.position.replace("Slide ", "")) || 0,
      startAt: `${values.startDate}T00:00:00.000Z`,
      endAt: `${values.endDate}T23:59:59.000Z`,
    };

    if (isEditing) {
      // Do not override isActive/status on edit
      updateBannerMutation.mutate(basePayload, { onSuccess });
      return;
    }

    createBannerMutation.mutate(basePayload, { onSuccess });
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditing ? "Edit Banner" : "Add Banner"}
        </h1>
        <BackButton to="/banners" />
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
          {/* Banner Information Section */}
          <FormSectionWithDots title="Banner Information">
            {/* Banner Title and Banner Type - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Banner Title */}
              <TextInput
                label="Banner Title"
                required
                type="text"
                placeholder="Enter promo"
                error={errors.bannerTitle?.message}
                {...register("bannerTitle", bannerFormValidation.bannerTitle)}
              />

              {/* Banner Type */}
              <SelectInput
                label="Banner Type"
                required
                error={errors.bannerType?.message}
                {...register("bannerType", bannerFormValidation.bannerType)}
              >
                <option value="">Select</option>
                {BANNER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </div>

            {/* Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Position */}
              <SelectInput
                label="Position"
                required
                error={errors.position?.message}
                {...register("position", {
                  ...bannerFormValidation.position,
                  validate: (value) =>
                    /^Slide [1-4]$/.test(value) ||
                    "Please select a valid slide position",
                })}
              >
                <option value="">Select</option>
                {BANNER_POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
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
                  max={endDate || undefined}
                  className="pl-9"
                  error={errors.startDate?.message}
                  {...register("startDate", {
                    ...bannerFormValidation.startDate,
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
                  error={errors.endDate?.message}
                  {...register("endDate", {
                    ...bannerFormValidation.endDate,
                    validate: (value) =>
                      (!value || value >= today || "End date cannot be in the past") &&
                      (!startDate ||
                        !value ||
                        value >= startDate ||
                        "End date cannot be earlier than start date"),
                  })}
                />
              </div>
            </div>

            {/* Upload Image */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Upload Image
                {!isEditing && (
                  <span className="text-red-500 dark:text-red-400">*</span>
                )}
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                  isDragging
                    ? "border-gray-400 dark:border-gray-500 bg-gray-50"
                    : "border-gray-300 dark:border-gray-600 bg-gray-50 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".png,.jpeg,.jpg,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-upload"
                />
                {imagePreview ? (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <img
                        src={imagePreview}
                        alt="Banner Preview"
                        className="max-w-full max-h-64 object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <span className="text-xs">×</span>
                      </button>
                    </div>
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer text-xs text-gray-600 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Change Image
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer block"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                        <Upload size={24} className="text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 mb-1.5">
                        Drag and Drop or Choose file to upload
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600">
                        supported formats PNG, JPEG, PDF
                      </p>
                    </div>
                  </label>
                )}
              </div>
              {errors.root?.image?.message && (
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                  {errors.root.image.message}
                </p>
              )}
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/banners")}
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
              <span>{isEditing ? "Update Banner" : "Add Banner"}</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddBanner;
