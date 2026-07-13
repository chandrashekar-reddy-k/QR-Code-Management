import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Upload, X, Save } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  SelectInput,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { useSubCreateCategory, useGetSubCategoryDetailsById, useUpdateSubCategory } from "../../../hooks/subCategory";
import { useGetAllCategoryList } from "../../../hooks/category";

// Extended form type
type ExtendedSubCategoryFormData = {
  categoryId: string;
  name: string;
  slug: string;
  subtitle: string;
  image: File | null | string;
  metaTitle: string;
  metaKeyword: string;
  schemaMarkup: string;
  metaDescription: string;
  editingId?: string | null;
};

// Create a new schema with correct field names
const subCategorySchema = yup.object({
  categoryId: yup.string().required("Parent category is required"),
  name: yup.string().required("Sub category name is required"),
  slug: yup.string().required("Slug is required"),
  subtitle: yup.string().required("Subtitle is required"),
  image: yup
    .mixed<File | string | null>()
    .test("fileOrString", "Image is required", function (value) {
      const { path, parent } = this;
      const isEditMode = parent?.editingId;
      
      if (!isEditMode && !value) {
        return this.createError({
          path,
          message: "Image is required for new sub categories",
        });
      }
      
      if (value instanceof File) {
        // Check file type
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
        if (!validTypes.includes(value.type)) {
          return this.createError({
            path,
            message: "File must be an image (JPEG, PNG, JPG, GIF, WEBP)",
          });
        }
        
        // Check file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (value.size > maxSize) {
          return this.createError({
            path,
            message: "File size must be less than 10MB",
          });
        }
      }
      
      return true;
    }),
  metaTitle: yup.string(),
  metaKeyword: yup.string(),
  schemaMarkup: yup.string(),
  metaDescription: yup.string(),
});

// Interface for API payload
interface ApiSubCategoryPayload {
  name: string;
  slug: string;
  subtitle: string;
  image: string;
  categoryId: string;
  metaTitle?: string;
  metaKeyword?: string;
  schemaMarkup?: string | object;
  metaDescription?: string;
  id?: string;
}

// Interface for API response
interface ApiSubCategoryResponse {
  name: string;
  slug: string;
  subtitle: string;
  image?: string | null;
  categoryId: string;
  metaTitle?: string | null;
  metaKeyword?: string | null;
  schemaMarkup?: string | object | null;
  metaDescription?: string | null;
  [key: string]: any;
}

// Interface for category data from API
interface Category {
  id: string;
  name: string;
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

const AddSubCategory = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { mutate, isPending } = useSubCreateCategory();
  const { mutate: updateSubCategory } = useUpdateSubCategory(id || '');
  const { data: editData, refetch, isLoading: isEditLoading } = useGetSubCategoryDetailsById(id ?? '');
  const { data: categoryData, isLoading: categoryLoading } = useGetAllCategoryList(1, 100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize React Hook Form
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExtendedSubCategoryFormData>({
    resolver: yupResolver(subCategorySchema),
    mode: "onChange",
    defaultValues: {
      categoryId: "",
      name: "",
      slug: "",
      subtitle: "",
      image: null,
      metaTitle: "",
      metaKeyword: "",
      schemaMarkup: "",
      metaDescription: "",
      editingId: null,
    }
  });

  const watchName = watch("name");
  const watchImage = watch("image");

  // Handle auto-generating slug when name changes (only in add mode)
  useEffect(() => {
    if (watchName && !isEditMode) {
      const autoSlug = generateSlug(watchName);
      setValue("slug", autoSlug);
    }
  }, [watchName, isEditMode, setValue]);

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
      const subCategoryEditData = editData?.data as ApiSubCategoryResponse;
      
      if (!subCategoryEditData) return;
      
      // Set all form values
      setValue("categoryId", subCategoryEditData?.categoryId || "");
      setValue("name", subCategoryEditData?.name || "");
      setValue("slug", subCategoryEditData?.slug || "");
      setValue("subtitle", subCategoryEditData?.subtitle || "");
      setValue("metaTitle", subCategoryEditData?.metaTitle || "");
      setValue("metaDescription", subCategoryEditData?.metaDescription || "");
      
      // Handle image
      if (subCategoryEditData?.image) {
        setValue("image", subCategoryEditData.image);
        setImagePreview(subCategoryEditData.image);
      } else {
        setValue("image", null);
        setImagePreview(null);
      }
      
      // Handle metaKeyword
      if (subCategoryEditData?.metaKeyword) {
        setValue("metaKeyword", subCategoryEditData.metaKeyword);
      } else {
        setValue("metaKeyword", "");
      }
      
      // Handle schemaMarkup
      if (subCategoryEditData?.schemaMarkup) {
        if (typeof subCategoryEditData.schemaMarkup === "object") {
          setValue("schemaMarkup", JSON.stringify(subCategoryEditData.schemaMarkup, null, 2));
        } else {
          setValue("schemaMarkup", String(subCategoryEditData.schemaMarkup));
        }
      } else {
        setValue("schemaMarkup", "");
      }
      
      // Set editingId for validation
      setValue("editingId", id);
    }
  }, [editData, isEditMode, setValue, id]);

  // Function to generate slug from text
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

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

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
  };

  const onSubmit = async (data: ExtendedSubCategoryFormData) => {
    try {
      setLoading(true);
      
      // Prepare payload for API
      const payload: ApiSubCategoryPayload = {
        name: data.name,
        slug: data.slug,
        subtitle: data.subtitle,
        categoryId: data.categoryId,
        image: "",
      };

      // Convert image to base64 if it's a File
      if (data.image instanceof File) {
        try {
          payload.image = await fileToBase64(data.image);
        } catch (error) {
          console.error("Error converting image to base64:", error);
          alert("Error processing image. Please try again.");
          setLoading(false);
          return;
        }
      } else if (typeof data.image === "string") {
        payload.image = data.image;
      }

      // Add optional fields
      if (data.metaTitle?.trim()) {
        payload.metaTitle = data.metaTitle.trim();
      }

      if (data.metaKeyword?.trim()) {
        payload.metaKeyword = data.metaKeyword.trim();
      }

      if (data.metaDescription?.trim()) {
        payload.metaDescription = data.metaDescription.trim();
      }

      if (data.schemaMarkup?.trim()) {
        try {
          const parsed = JSON.parse(data.schemaMarkup);
          payload.schemaMarkup = parsed;
        } catch {
          payload.schemaMarkup = data.schemaMarkup;
        }
      }
      
      // Call appropriate mutation
      if (isEditMode && id) {
        payload.id = id;
        updateSubCategory(payload as any);
      } else {
        mutate(payload as any);
      }
      
      navigate("/categories/sub-categories");
    } catch (error: any) {
      console.error("Error saving sub category:", error);
      alert(error.message || "Error saving sub category. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isEditLoading && isEditMode) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">
            Loading sub category...
          </p>
        </div>
      </div>
    );
  }

  if (categoryLoading) {
    return <p className="p-8 text-center">Loading categories...</p>;
  }

  const categoryApiData = categoryData?.data?.categories || [];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditMode ? "Edit Sub Category" : "Add Sub Category"}
        </h1>
        <BackButton to="/categories/sub-categories" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent Category */}
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Parent Category"
                    required
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.categoryId?.message}
                    options={[
                      { value: "", label: "Select Parent Category" },
                      ...categoryApiData.map((cat: Category) => ({
                        value: cat.id,
                        label: cat.name,
                      })),
                    ]}
                  />
                )}
              />

              {/* Sub Category Name */}
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Sub Category Name"
                    required
                    type="text"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter sub category name"
                    error={errors.name?.message}
                  />
                )}
              />

              {/* Slug */}
              <Controller
                name="slug"
                control={control}
                render={({ field }) => (
                  <div>
                    <TextInput
                      label="Slug"
                      required
                      type="text"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Auto-generated from sub category name"
                      className="bg-gray-50"
                      error={errors.slug?.message}
                    />
                  </div>
                )}
              />

              {/* Sub Category Subtitle */}
              <div className="md:col-span-2">
                <Controller
                  name="subtitle"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Sub Category Subtitle"
                      required
                      type="text"
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Enter sub category subtitle"
                      error={errors.subtitle?.message}
                    />
                  )}
                />
              </div>
            </div>
          </FormSectionWithDots>

          {/* Sub Category Image Section */}
          <FormSectionWithDots title="Sub Category Image">
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
                        id="image-upload"
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
                      {errors.image.message}
                    </p>
                  )}
                </div>
              )}
            />
          </FormSectionWithDots>

          {/* SEO & Meta Information Section */}
          <FormSectionWithDots title="SEO & Meta Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Meta Title */}
              <Controller
                name="metaTitle"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Meta Title"
                    type="text"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter meta title"
                    error={errors.metaTitle?.message}
                  />
                )}
              />

              {/* Meta Keyword */}
              <Controller
                name="metaKeyword"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Meta Keyword"
                    type="text"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter meta keyword"
                    error={errors.metaKeyword?.message}
                  />
                )}
              />

              {/* Schema Markup */}
              <Controller
                name="schemaMarkup"
                control={control}
                render={({ field }) => (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Schema Markup
                    </label>
                    <textarea
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Enter schema markup (JSON format)"
                      rows={3}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-300 dark:focus:border-gray-500 resize-none bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    {errors.schemaMarkup && (
                      <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                        {errors.schemaMarkup.message}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* Meta Description */}
              <Controller
                name="metaDescription"
                control={control}
                render={({ field }) => (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Meta Description
                    </label>
                    <textarea
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Enter meta description"
                      rows={3}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-300 dark:focus:border-gray-500 resize-none bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    {errors.metaDescription && (
                      <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                        {errors.metaDescription.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/categories/sub-categories")}
              className="px-4 py-2 text-xs font-medium"
              disabled={isPending}
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={isPending || loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              {isPending || loading ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>
                    {isEditMode ? "Update Sub Category" : "Add Sub Category"}
                  </span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddSubCategory;