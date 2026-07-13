import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Plus,
  Upload,
  Image as ImageIcon,
  Filter,
  RotateCcw,
  ChevronDown,
  Camera,
  X,
  Save,
} from "lucide-react";
import {
  SearchInput,
  ConfirmModal,
  StatCard,
  ViewIconButton,
  DeleteIconButton,
  DataTable,
  Pagination,
  SelectInput,
  PrimaryButton,
  TextInput,
  Button,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import {
  useDeleteMedia,
  useGetAllMediaList,
  useUploadMedia,
} from "../../../hooks/media";
import { mediaSchema } from "../../../validationSchema/media";

import type { MediaItem as Media } from "../../../hooks/media";

// Interface for form inputs
interface MediaFormInputs {
  file: File | null;
  sellerName?: string | null;
  subDirectory: string;
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

const Media = () => {
  const navigate = useNavigate();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API integration using react-query hooks (similar pattern to ManageCategories)
  const { data, isLoading } = useGetAllMediaList();
  const { mutate, isPending } = useUploadMedia();
  const { mutateAsync: deleteMedia, isPending: isDeleting } = useDeleteMedia();

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MediaFormInputs>({
    resolver: yupResolver(mediaSchema) as any,
    mode: "onChange",
    defaultValues: {
      file: null,
      sellerName: "",
      subDirectory: "products/media/",
    },
  });

  const watchFile = watch("file");

  // Normalize media list from API response
  const mediaList: Media[] = useMemo(() => {
    if (!data) return [];

    // If backend returns a plain array
    if (Array.isArray(data)) {
      return data as Media[];
    }

    // If backend wraps media in an object
    const dataObj = data as Record<string, unknown>;
    if (Array.isArray(dataObj.media)) {
      return dataObj.media as Media[];
    }
    if (
      dataObj.data &&
      typeof dataObj.data === "object" &&
      dataObj.data !== null
    ) {
      const dataProp = dataObj.data as Record<string, unknown>;
      if (Array.isArray(dataProp.media)) {
        return dataProp.media as Media[];
      }
    }

    return [];
  }, [data]);

  // Handle image preview when file changes
  useEffect(() => {
    if (watchFile instanceof File) {
      const objectUrl = URL.createObjectURL(watchFile);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setImagePreview(null);
    }
  }, [watchFile]);

  // Loading flag used by DataTable
  const tableLoading = isLoading || isDeleting;

  const handleResetFilters = () => {
    setSearchTerm("");
    setMediaTypeFilter("");
    setDateFilter("");
    setCurrentPage(1);
  };

  const handleFileChange = (file: File | null) => {
    setValue("file", file, { shouldValidate: true });
  };

  const handleRemoveFile = () => {
    setValue("file", null, { shouldValidate: true });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileChange(file);
    }
  };

  const onSubmit = async (data: MediaFormInputs) => {
    try {
      setLoading(true);

      if (!data.file) {
        alert("Please select a file to upload");
        setLoading(false);
        return;
      }

      // Extract file information
      const fileName =
        data.file.name.split(".").slice(0, -1).join(".") || data.file.name;
      const extension = data.file.name.split(".").pop()?.toUpperCase() || "JPG";
      const fileType = data.file.type.startsWith("image/") ? "Image" : "File";
      const sizeInKB = parseFloat((data.file.size / 1024).toFixed(1));

      // Convert file to base64 for URL
      let fileUrl = "";
      try {
        fileUrl = await fileToBase64(data.file);
      } catch (error) {
        console.error("Error converting file to base64:", error);
        alert("Error processing file. Please try again.");
        setLoading(false);
        return;
      }

      // Get userId from localStorage if available
      const userId = localStorage.getItem("userId") || undefined;

      // Prepare payload for API
      const payload: {
        fileName: string;
        extension: string;
        fileType: string;
        size: number;
        url: string;
        subDirectory: string;
        sellerName?: string;
        userId?: string;
      } = {
        fileName: fileName.trim(),
        extension: extension,
        fileType: fileType,
        size: sizeInKB,
        url: fileUrl,
        subDirectory: data.subDirectory.trim(),
      };

      // Add optional fields if they have values
      if (data.sellerName && data.sellerName.trim()) {
        payload.sellerName = data.sellerName.trim();
      }

      if (userId) {
        payload.userId = userId;
      }

      mutate(payload);

      // Reset form and close
      reset();
      setImagePreview(null);
      setShowUploadForm(false);
    } catch (error: unknown) {
      console.error("Error uploading media:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error uploading media. Please try again.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: Record<string, { message?: string }>) => {
    console.log("Form errors:", errors);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      await deleteMedia(deleteConfirm.id);
    } catch (error: unknown) {
      console.error("Error deleting media:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error deleting media. Please try again.";
      alert(errorMessage);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleView = (media: Media) => {
    navigate(`/products/media/view/${media.id}`);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort media
  const filteredAndSortedMedia = useMemo(() => {
    let filtered = mediaList;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((media) => {
        return (
          media.name.toLowerCase().includes(searchLower) ||
          media.extension.toLowerCase().includes(searchLower) ||
          media.type.toLowerCase().includes(searchLower) ||
          media.subDirectory.toLowerCase().includes(searchLower) ||
          media.id.toString().includes(searchLower) ||
          media.vendorName?.toLowerCase().includes(searchLower) ||
          ""
        );
      });
    }

    // Media type filter
    if (mediaTypeFilter) {
      filtered = filtered.filter((media) => media.type === mediaTypeFilter);
    }

    // Date filter (simplified - you can enhance this based on actual date fields)
    if (dateFilter) {
      // Add date filtering logic if needed
    }

    // Sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "extension":
            aValue = a.extension.toLowerCase();
            bValue = b.extension.toLowerCase();
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "size":
            aValue = parseFloat(a.size) || 0;
            bValue = parseFloat(b.size) || 0;
            break;
          default:
            return 0;
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [
    mediaList,
    searchTerm,
    mediaTypeFilter,
    dateFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMedia.length / itemsPerPage);
  const paginatedMedia = filteredAndSortedMedia.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pagination = {
    page: currentPage,
    limit: itemsPerPage,
    total: filteredAndSortedMedia.length,
    totalPages: totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };

  // Calculate KPI metrics
  const totalMedia = mediaList.length;
  const imageMedia = mediaList.filter((m) => m.type === "image").length;
  const videoMedia = mediaList.filter((m) => m.type === "video").length;
  const otherMedia = mediaList.filter(
    (m) => m.type !== "image" && m.type !== "video"
  ).length;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Media
        </h1>
        {showUploadForm ? (
          <BackButton
            onClick={() => {
              setShowUploadForm(false);
              reset();
              setImagePreview(null);
            }}
          />
        ) : (
          <PrimaryButton
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Upload
          </PrimaryButton>
        )}
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form
          onSubmit={handleSubmit(
            onSubmit as (data: MediaFormInputs) => void,
            onError
          )}
          className="mb-6 bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <ImageIcon
              size={18}
              className="text-green-600 dark:text-green-400"
            />
            <h3 className="text-sm font-semibold text-gray-800">
              Media Upload Form
            </h3>
          </div>

          <div className="space-y-4">
            {/* Drag and Drop Area */}
            <Controller
              name="file"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    File{" "}
                    <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Supports: JPEG, PNG, JPG, GIF, WEBP (Max 10MB)
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? "border-gray-400 dark:border-gray-500 bg-gray-50"
                        : "border-gray-300 dark:border-gray-600 bg-white hover:border-gray-400 dark:hover:border-gray-500"
                    } ${!imagePreview ? "cursor-pointer" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() =>
                      !imagePreview && fileInputRef.current?.click()
                    }
                  >
                    {!imagePreview ? (
                      <div>
                        <Upload
                          className="mx-auto text-gray-400 mb-3"
                          size={32}
                        />
                        <p className="text-sm text-gray-600 mb-2 font-medium">
                          Drag and drop to upload image!
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          ...or click to select a image from your device
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            field.onChange(file);
                            handleFileChange(file);
                          }}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium cursor-pointer"
                        >
                          Select Image
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-full max-h-64 mx-auto rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(null);
                            handleRemoveFile();
                          }}
                          className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white rounded-full p-1 hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {errors.file && (
                    <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                      {errors.file.message as string}
                    </p>
                  )}
                </div>
              )}
            />

            {/* Seller Name (Optional) */}
            <Controller
              name="sellerName"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Seller Name (Optional)"
                  type="text"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.sellerName?.message}
                  placeholder="Enter seller name"
                />
              )}
            />

            {/* Hidden subDirectory field */}
            <Controller
              name="subDirectory"
              control={control}
              render={({ field }) => <input type="hidden" {...field} />}
            />

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowUploadForm(false);
                  reset();
                  setImagePreview(null);
                }}
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
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Upload Media</span>
                  </>
                )}
              </PrimaryButton>
            </div>
          </div>
        </form>
      )}

      {/* Media List */}
      {!showUploadForm && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
            <StatCard
              title="Total Media"
              value={totalMedia}
              icon={Camera}
              variant="blue"
            />
            <StatCard
              title="Images"
              value={imageMedia}
              icon={Camera}
              variant="green"
            />
            <StatCard
              title="Videos"
              value={videoMedia}
              icon={Camera}
              variant="purple"
            />
            <StatCard
              title="Other Files"
              value={otherMedia}
              icon={Camera}
              variant="gray"
            />
          </div>

          {/* Filters and Search */}
          <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
              {/* Filter Icon */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
                <Filter
                  size={18}
                  className="text-gray-700"
                />
              </div>

              {/* Media Type Dropdown */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
                <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                  <SelectInput
                    value={mediaTypeFilter}
                    onChange={(e) => {
                      setMediaTypeFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "", label: "Media" },
                      { value: "image", label: "Image" },
                      { value: "video", label: "Video" },
                      { value: "document", label: "Document" },
                    ]}
                  />
                </div>
                <ChevronDown
                  size={16}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                />
              </div>

              {/* Date Dropdown */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
                <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
                  <SelectInput
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "", label: "Date" },
                      { value: "today", label: "Today" },
                      { value: "week", label: "This Week" },
                      { value: "month", label: "This Month" },
                    ]}
                  />
                </div>
                <ChevronDown
                  size={16}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                />
              </div>

              {/* Reset Filter Button */}
              <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center sm:justify-start"
                >
                  <RotateCcw
                    size={14}
                    className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-500"
                  />
                  <span>Reset Filter</span>
                </button>
              </div>
            </div>

            {/* Search - Beside filters */}
            <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
              <SearchInput
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 w-full"
              />
            </div>
          </div>

          {/* Media Table */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable
                data={paginatedMedia}
                columns={[
                  {
                    key: "id",
                    label: "ID",
                    sortable: true,
                    render: (media: Media) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800">
                          {media.id}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "image",
                    label: "IMAGE",
                    sortable: false,
                    render: (media: Media) => (
                      <div className="text-center">
                        {media.url ? (
                          <img
                            src={media.url}
                            alt={media.name}
                            className="w-10 h-10 object-cover rounded mx-auto"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            No image
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "name",
                    label: "NAME",
                    sortable: true,
                    render: (media: Media) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm font-semibold text-gray-800">
                          {media.name}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "extension",
                    label: "EXTENSION",
                    sortable: true,
                    render: (media: Media) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-700 uppercase">
                          {media.extension}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "type",
                    label: "TYPE",
                    sortable: true,
                    render: (media: Media) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-700 capitalize">
                          {media.type}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "size",
                    label: "SIZE",
                    sortable: true,
                    render: (media: Media) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-700">
                          {media.size}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "vendorName",
                    label: "SELLER NAME",
                    sortable: false,
                    render: (media: Media) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-700">
                          {media.vendorName || "-"}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "actions",
                    label: "ACTIONS",
                    sortable: false,
                    render: (media: Media) => (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <ViewIconButton
                            onClick={() => handleView(media)}
                            size={12}
                            tooltip="View"
                          />
                          <DeleteIconButton
                            onClick={() => handleDeleteClick(media.id)}
                            size={12}
                            tooltip="Delete"
                          />
                        </div>
                      </div>
                    ),
                  },
                ]}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                keyExtractor={(media) => media.id.toString()}
                emptyMessage="No media files found"
                loading={tableLoading}
              />
            </div>

            {/* Pagination */}
            {filteredAndSortedMedia.length > 0 && (
              <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="text-gray-600 whitespace-nowrap">
                      Show
                    </span>
                    <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                      <select
                        value={itemsPerPage.toString()}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900"
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                    <span className="text-gray-600 whitespace-nowrap">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredAndSortedMedia.length
                      )}{" "}
                      of {filteredAndSortedMedia.length}
                    </span>
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    pagination={pagination}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Media File"
        message="Are you sure you want to delete this media file? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Media;
