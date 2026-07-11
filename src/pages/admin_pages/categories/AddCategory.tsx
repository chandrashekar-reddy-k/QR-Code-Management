import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Upload, X, Save } from 'lucide-react';
import { PrimaryButton, Button, TextInput, FormSectionWithDots } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { categorySchema } from '../../../validationSchema/category';
import { useCreateCategory, useGetCategoryDetailsById, useUpdateCategory } from '../../../hooks/category';

interface CategoryFormInputs {
  name: string;
  slug: string;
  categorySubtitle: string;
  image: File | null | string;
  metaTitle: string;
  metaKeywords: string; // String for form input (comma separated)
  schemaMarkup: string;
  metaDescription: string;
}

// Interface for API payload
interface ApiCategoryPayload {
  name: string;
  slug: string;
  categorySubtitle: string;
  image: string; // Base64 string
  metaTitle?: string;
  metaKeywords?: string[]; // Array for API
  schemaMarkup?: string | object;
  metaDescription?: string;
}

// Interface for API response
interface ApiCategoryResponse {
  name: string;
  slug: string;
  categorySubtitle: string;
  image?: string | null;
  metaTitle?: string | null;
  metaKeywords?: string[] | null;
  schemaMarkup?: string | object | null;
  metaDescription?: string | null;
  [key: string]: any;
}

// Interface for the hook response data structure
interface CategoryResponseData {
  data: ApiCategoryResponse;
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

const AddCategory = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { mutate, isPending } = useCreateCategory();
  const { mutate: updateCategory } = useUpdateCategory(id || '');
  const { data: editData, refetch, isLoading: isEditLoading } = useGetCategoryDetailsById(id ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CategoryFormInputs>({
    resolver: yupResolver(categorySchema) as any,
    mode: 'onChange',
    defaultValues: {
      name: '',
      slug: '',
      categorySubtitle: '',
      image: null,
      metaTitle: '',
      metaKeywords: '',
      schemaMarkup: '',
      metaDescription: '',
    }
  });

  const watchImage = watch('image');

  // Handle image preview when image changes
  useEffect(() => {
    if (watchImage instanceof File) {
      const objectUrl = URL.createObjectURL(watchImage);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof watchImage === 'string') {
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
      const categoryResponseData = editData as CategoryResponseData;
      const categoryEditData = categoryResponseData?.data as ApiCategoryResponse;
      
      if (!categoryEditData) return;
      
      // Set all form values
      setValue('name', categoryEditData?.name || '');
      setValue('slug', categoryEditData?.slug || '');
      setValue('categorySubtitle', categoryEditData?.categorySubtitle || '');
      setValue('metaTitle', categoryEditData?.metaTitle || '');
      setValue('metaDescription', categoryEditData?.metaDescription || '');
      
      // Handle image
      if (categoryEditData?.image) {
        setValue('image', categoryEditData.image);
        setImagePreview(categoryEditData.image);
      } else {
        setValue('image', null);
        setImagePreview(null);
      }
      
      // Handle metaKeywords - convert array to comma-separated string
      if (categoryEditData?.metaKeywords && Array.isArray(categoryEditData.metaKeywords)) {
        setValue('metaKeywords', categoryEditData.metaKeywords.join(', '));
      } else {
        setValue('metaKeywords', '');
      }
      
      // Handle schemaMarkup
      if (categoryEditData?.schemaMarkup) {
        if (typeof categoryEditData.schemaMarkup === 'object') {
          setValue('schemaMarkup', JSON.stringify(categoryEditData.schemaMarkup, null, 2));
        } else {
          setValue('schemaMarkup', String(categoryEditData.schemaMarkup));
        }
      } else {
        setValue('schemaMarkup', '');
      }
    }
  }, [editData, isEditMode, setValue]);

  const handleImageChange = (file: File | null) => {
    setValue('image', file, { shouldValidate: true });
  };

  const handleRemoveImage = () => {
    setValue('image', null, { shouldValidate: true });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageChange(file);
    }
  };

  const onSubmit = async (data: CategoryFormInputs) => {
    try {
      setLoading(true);
      
      // Prepare payload for API
      const payload: ApiCategoryPayload & { id?: string } = {
        name: data.name,
        slug: data.slug,
        categorySubtitle: data.categorySubtitle,
        image: '', // Will be set below
      };

      // Convert image to base64 if it's a File
      if (data.image instanceof File) {
        try {
          payload.image = await fileToBase64(data.image);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          alert('Error processing image. Please try again.');
          setLoading(false);
          return;
        }
      } else if (typeof data.image === 'string') {
        // If it's already a string (URL or base64), use it as is
        payload.image = data.image;
      }

      // Add optional fields if they have values
      if (data.metaTitle && data.metaTitle.trim()) {
        payload.metaTitle = data.metaTitle;
      }

      if (data.metaKeywords && data.metaKeywords.trim()) {
        // Convert comma-separated string to array
        payload.metaKeywords = data.metaKeywords
          .split(',')
          .map(keyword => keyword.trim())
          .filter(keyword => keyword !== '');
      }

      if (data.metaDescription && data.metaDescription.trim()) {
        payload.metaDescription = data.metaDescription;
      }

      if (data.schemaMarkup && data.schemaMarkup.trim()) {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(data.schemaMarkup);
          payload.schemaMarkup = parsed;
        } catch {
          // If not valid JSON, send as string
          payload.schemaMarkup = data.schemaMarkup;
        }
      }
      
      // Add id for edit mode and call appropriate mutation
      if (isEditMode && id) {
        payload.id = id;
        updateCategory(payload as any);
      } else {
        mutate(payload as any);
      }
      
      navigate('/categories/manage');
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert(error.message || 'Error saving category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.log('Form errors:', errors);
  };

  if (isEditLoading && isEditMode) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading category...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Category' : 'Add Category'}
        </h1>
        <BackButton to="/categories/manage" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit, onError)} className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="max-w-4xl">
          {/* Basic Information Section */}
          <FormSectionWithDots title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Category Name"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.name?.message}
                    placeholder="Enter category name"
                  />
                )}
              />

              <Controller
                name="slug"
                control={control}
                render={({ field }) => (
                  <div>
                    <TextInput
                      label="Slug"
                      required
                      type="text"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      error={errors.slug?.message}
                      placeholder="Enter slug"
                      className="bg-gray-50"
                    />
                  </div>
                )}
              />

              <div className="md:col-span-2">
                <Controller
                  name="categorySubtitle"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Category Subtitle"
                      required
                      type="text"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      error={errors.categorySubtitle?.message}
                      placeholder="Enter category subtitle"
                    />
                  )}
                />
              </div>
            </div>
          </FormSectionWithDots>

          {/* Category Image Section */}
          <FormSectionWithDots title="Category Image">
            <Controller
              name="image"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Image <span className="text-red-500 dark:text-red-400">*</span>
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
                      <p className="text-xs text-gray-600 mb-1">Drop Files here or click to upload</p>
                      <p className="text-[10px] text-gray-500">PNG, JPG, GIF up to 10MB</p>
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
                      {errors.image.message as string}
                    </p>
                  )}
                </div>
              )}
            />
          </FormSectionWithDots>

          {/* SEO & Meta Information Section */}
          <FormSectionWithDots title="SEO & Meta Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="metaTitle"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Meta Title"
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.metaTitle?.message}
                    placeholder="Enter meta title"
                  />
                )}
              />

              <Controller
                name="metaKeywords"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Meta Keywords"
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.metaKeywords?.message}
                    placeholder="Enter meta keywords (comma separated)"
                  />
                )}
              />

              <div className="md:col-span-2">
                <Controller
                  name="schemaMarkup"
                  control={control}
                  render={({ field }) => (
                    <>
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
                    </>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <Controller
                  name="metaDescription"
                  control={control}
                  render={({ field }) => (
                    <>
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
                    </>
                  )}
                />
              </div>
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/categories/manage')}
              className="px-4 py-2 text-xs font-medium"
              disabled={isPending}
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
              disabled={isPending || loading}
            >
              {isPending || loading ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{isEditMode ? 'Update Category' : 'Add Category'}</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddCategory;