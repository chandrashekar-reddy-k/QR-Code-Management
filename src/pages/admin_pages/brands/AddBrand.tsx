import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Upload, X, Save } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { brandSchema, BrandFormData as BrandFormDataType } from "../../../validationSchema/brands";
import { useCreateBrands, useGetBrandsDetailsById, useUpdateBrands } from "../../../hooks/brands";
import { toast } from "react-toastify";

// Interface for API payload
interface ApiBrandPayload {
  name: string;
  image: string; // Base64 string
}

// Interface for API response
interface ApiBrandResponse {
  id: string;
  name: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interface for the hook response data structure
interface BrandResponseData {
  data: ApiBrandResponse;
  [key: string]: any;
}

// Function to convert File to base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const AddBrand = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { mutate: createBrand, isPending: isCreating } = useCreateBrands();
  const { mutate: updateBrand, isPending: isUpdating } = useUpdateBrands(id || '');
  const { data: editData, refetch, isLoading: isEditLoading } = useGetBrandsDetailsById(id ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize React Hook Form
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BrandFormDataType>({
    resolver: yupResolver(brandSchema) as any,
    mode: "onChange",
    defaultValues: {
      name: "",
      image: null,
      isEditMode: false,
    },
  });

  const watchImage = watch("image");

  // Handle image preview when image changes
  useEffect(() => {
    if (watchImage instanceof File) {
      const objectUrl = URL.createObjectURL(watchImage);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof watchImage === "string") {
      setImagePreview(watchImage);
    } else {
      setImagePreview(null);
    }
  }, [watchImage]);

  // Handle edit mode data binding
  useEffect(() => {
    if (isEditMode && id) {
      refetch();
    }
  }, [id, isEditMode, refetch]);

  // Set form values when edit data is available
  useEffect(() => {
    if (isEditMode && editData) {
      const brandResponseData = editData as BrandResponseData;
      const brandEditData = brandResponseData?.data as ApiBrandResponse;

      if (!brandEditData) return;

      // Set form values
      setValue("name", brandEditData?.name || "");
      setValue("isEditMode", true);

      // Handle image
      if (brandEditData?.image) {
        setValue("image", brandEditData?.image as any);
        setImagePreview(brandEditData.image);
      } else {
        setValue("image", null);
        setImagePreview(null);
      }
    }
  }, [editData, isEditMode, setValue]);

  const handleImageChange = (file: File | null) => {
    setValue("image", file, { shouldValidate: true });
  };

  const handleRemoveImage = () => {
    setValue("image", null, { shouldValidate: true });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageChange(file);
    }
  };

  const onSubmit = async (data: BrandFormDataType) => {
    try {
      setLoading(true);

      // Prepare payload for API
      const payload: ApiBrandPayload & { id?: string } = {
        name: data.name,
        image: "", // Will be set below
      };

      // Convert image to base64 if it's a File
      if (data.image instanceof File) {
        try {
          payload.image = await fileToBase64(data.image);
        } catch (error) {
          toast.error("Error processing image. Please try again.");
          setLoading(false);
          return;
        }
      } else if (typeof data.image === "string") {
        // If it's already a string (URL or base64), use it as is
        payload.image = data.image;
      } else {
        // If no image in edit mode, keep existing image
        if (isEditMode) {
          const brandResponseData = editData as BrandResponseData;
          const brandEditData = brandResponseData?.data as ApiBrandResponse;
          payload.image = brandEditData?.image || "";
        } else {
          toast.error("Image is required for creating a new brand");
          setLoading(false);
          return;
        }
      }

      // Add id for edit mode and call appropriate mutation
      if (isEditMode && id) {
        payload.id = id;
        updateBrand(payload as any, {
          onSuccess: () => {
            navigate("/products/brands");
          },
          onError: (error: any) => {
            toast.error(error.message || "Error updating brand. Please try again.");
          },
          onSettled: () => {
            setLoading(false);
          },
        });
      } else {
        createBrand(payload as any, {
          onSuccess: () => {
            navigate("/products/brands");
          },
          onError: (error: any) => {
            toast.error(error.message || "Error creating brand. Please try again.");
          },
          onSettled: () => {
            setLoading(false);
          },
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Error saving brand. Please try again.");
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
  };

  if (isEditLoading && isEditMode) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading brand...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditMode ? "Edit Brand" : "Add Brand"}
        </h1>
        <BackButton to="/products/brands" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          {/* Basic Information Section */}
          <FormSectionWithDots title="Basic Information">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Brand Name"
                  required
                  type="text"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                  placeholder="Enter brand name"
                />
              )}
            />
          </FormSectionWithDots>

          {/* Brand Image Section */}
          <FormSectionWithDots title="Brand Image">
            <Controller
              name="image"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Image {!isEditMode && <span className="text-red-500 dark:text-red-400">*</span>}
                  </label>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Supports: JPEG, PNG, JPG, GIF, WEBP (Max 10MB)
                  </p>
                  {!imagePreview ? (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mx-auto text-gray-400 mb-2" size={20} />
                      <p className="text-xs text-gray-600 mb-1">
                        Drop Files here or click to upload
                      </p>
                      <p className="text-[10px] text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                      <input
                        ref={fileInputRef}
                        id="brand-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          field.onChange(file);
                          handleImageChange(file);
                        }}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-gray-50">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-auto rounded-lg max-h-48 object-contain mx-auto"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange(null);
                          handleRemoveImage();
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {errors.image && (
                    <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                      {errors.image.message as string}
                    </p>
                  )}
                </div>
              )}
            />
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/products/brands")}
              className="px-4 py-2 text-xs font-medium"
              disabled={isCreating || isUpdating || loading}
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
              disabled={isCreating || isUpdating || loading}
            >
              {isCreating || isUpdating || loading ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{isEditMode ? "Update Brand" : "Add Brand"}</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddBrand;