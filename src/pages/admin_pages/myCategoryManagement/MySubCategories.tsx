import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Box,
  CheckCircle,
  XCircle,
  Filter,
  RotateCcw,
  ChevronDown,
  Upload,
  X,
  Save,
  PlusCircle,
} from "lucide-react";
import {
  SearchInput,
  DataTable,
  SelectInput,
  StatCard,
  PrimaryButton,
  Button,
  Modal,
  Pagination,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { useGetWarehouseCategories, useRequestNewSubCategory } from "../../../hooks/category";
import { uploadImageFile } from "../../../lib/uploadImage";

interface ApiSubCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  displayOrder?: number;
  categoryId?: string;
}

interface ApiCategory {
  id: string;
  categoryId?: string;
  categoryName?: string;
  name?: string;
  isActive?: boolean;
  image?: string;
  subCategories?: ApiSubCategory[];
}

interface FlatSubCategory extends ApiSubCategory {
  parentCategoryId: string;
  parentCategoryName: string;
}

const MySubCategories = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Request new subcategory modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedParentCatId, setSelectedParentCatId] = useState("");
  const [subCatName, setSubCatName] = useState("");
  const [subCatDescription, setSubCatDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch approved warehouse categories with subcategories
  const { data: categoriesData, isLoading } = useGetWarehouseCategories();
  const requestSubCatMutation = useRequestNewSubCategory();

  // Parse categories from API response
  const categories: ApiCategory[] = useMemo(() => {
    const res = categoriesData as { data?: ApiCategory[] } | undefined;
    const arr = Array.isArray(res?.data) ? res!.data! : Array.isArray(categoriesData) ? (categoriesData as ApiCategory[]) : [];
    return arr.map(c => ({
      ...c,
      id: c.categoryId || c.id,
      name: c.categoryName || c.name || "Unnamed Category"
    }));
  }, [categoriesData]);

  // Flatten all subcategories from all categories
  const allSubCategories: FlatSubCategory[] = useMemo(() => {
    const flat: FlatSubCategory[] = [];
    for (const cat of categories) {
      const subs: ApiSubCategory[] = Array.isArray(cat.subCategories)
        ? cat.subCategories
        : [];
      for (const sub of subs) {
        flat.push({
          ...sub,
          parentCategoryId: cat.id,
          parentCategoryName: cat.name,
        });
      }
    }
    return flat;
  }, [categories]);

  // Build category options for the filter dropdown
  const categoryOptions = useMemo(() => {
    return [
      { value: "", label: "All Categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [categories]);

  // Apply filters
  const filtered = useMemo(() => {
    return allSubCategories.filter((sc) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (sc.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        sc.parentCategoryName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active"
          ? sc.isActive !== false
          : sc.isActive === false);
      const matchesCategory =
        !categoryFilter || sc.parentCategoryId === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [allSubCategories, searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalCount = allSubCategories.length;
  const activeCount = allSubCategories.filter((sc) => sc.isActive !== false).length;
  const inactiveCount = allSubCategories.filter((sc) => sc.isActive === false).length;

  const kpiData = [
    {
      title: "Total Sub Categories",
      value: isLoading ? "..." : String(totalCount),
      icon: Box,
      variant: "purple" as const,
    },
    {
      title: "Active Sub Categories",
      value: isLoading ? "..." : String(activeCount),
      icon: CheckCircle,
      variant: "yellow" as const,
    },
    {
      title: "Inactive Sub Categories",
      value: isLoading ? "..." : String(inactiveCount),
      icon: XCircle,
      variant: "green" as const,
    },
  ];

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (item: FlatSubCategory) => (
        <div className="text-center">
          <span className="text-xs text-gray-500 font-mono">
            {item.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: "image",
      label: "IMAGE",
      render: (item: FlatSubCategory) => (
        <div className="flex items-center justify-center">
          {item.image ? (
            <img
              src={item.image}
              alt="subcategory"
              className="w-12 h-12 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
              <Box size={20} className="text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "parentCategoryName",
      label: "PARENT CATEGORY",
      render: (item: FlatSubCategory) => (
        <div className="text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {item.parentCategoryName}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      render: (item: FlatSubCategory) => (
        <div className="text-center">
          <span className="text-sm font-medium text-gray-800">
            {item.name}
          </span>
        </div>
      ),
    },
    {
      key: "description",
      label: "DESCRIPTION",
      render: (item: FlatSubCategory) => (
        <div className="text-center">
          <span className="text-sm text-gray-600">
            {item.description || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      render: (item: FlatSubCategory) => {
        const isActive = item.isActive !== false;
        return (
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        );
      },
    },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCreateSubCategoryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCatId) {
      alert("Please select a parent category");
      return;
    }
    if (!subCatName.trim()) {
      alert("Please enter a subcategory name");
      return;
    }

    try {
      setUploadingImage(true);
      let uploadedImageUrl: string | undefined = undefined;
      if (imageFile) {
        uploadedImageUrl = await uploadImageFile(imageFile);
      }

      await requestSubCatMutation.mutateAsync({
        categoryId: selectedParentCatId,
        name: subCatName.trim(),
        description: subCatDescription.trim() || undefined,
        image: uploadedImageUrl,
      });

      // Reset form
      setSubCatName("");
      setSubCatDescription("");
      setSelectedParentCatId("");
      setImageFile(null);
      setImagePreview(null);
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCategoryFilter("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full px-2 sm:px-4 pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 mb-3 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Sub Categories
          </h1>
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/my-sub-categories/requests")}
            className="flex items-center gap-1.5 text-xs font-semibold border border-gray-300"
          >
            Assign Existing
          </Button>

          <PrimaryButton
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-xs"
          >
            <PlusCircle size={16} />
            + Request New SubCategory
          </PrimaryButton>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
          />
        ))}
      </div>

      {/* FILTERS + SEARCH */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-2xl overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* STATUS DROPDOWN */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* CATEGORY DROPDOWN */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={categoryOptions}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* RESET */}
          <div className="px-4 py-3">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 text-orange-600 text-sm hover:opacity-80 transition-opacity"
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          </div>
        </div>

        {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search sub categories..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* TABLE */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500">
            Loading sub categories...
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <DataTable
            data={paginated}
            columns={columns}
            keyExtractor={(item) => (item as FlatSubCategory).id}
          />

          {/* PAGINATION */}
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* LEFT SIDE */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600">Show</span>
                <div className="[&_select]:text-orange-600 [&_select]:px-2 [&_select]:py-1 [&_select]:border [&_select]:rounded-lg [&_select]:w-16 [&_select]:h-7">
                  <SelectInput
                    value={String(itemsPerPage)}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                    ]}
                  />
                </div>
                <span className="text-gray-600">
                  Showing results{" "}
                  <span className="text-orange-600 font-medium">
                    {Math.min(paginated.length, itemsPerPage)}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 font-medium">
                    {filtered.length}
                  </span>
                </span>
              </div>

              {/* RIGHT SIDE */}
              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filtered.length}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SUBCATEGORY REQUEST MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Request New SubCategory"
        size="md"
      >
        <form onSubmit={handleCreateSubCategoryRequest} className="space-y-4 pt-2">
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            Note: SubCategory requests require Admin approval before appearing in your active subcategory list.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parent Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedParentCatId}
              onChange={(e) => setSelectedParentCatId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select Parent Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              SubCategory Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subCatName}
              onChange={(e) => setSubCatName(e.target.value)}
              placeholder="e.g. Organic Green Tea"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={subCatDescription}
              onChange={(e) => setSubCatDescription(e.target.value)}
              placeholder="Brief subcategory details..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              SubCategory Image (Optional)
            </label>
            {imagePreview ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full shadow hover:bg-red-700"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 transition-all">
                <div className="flex flex-col items-center justify-center pt-2 pb-3">
                  <Upload size={18} className="text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Click to upload image
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={uploadingImage || requestSubCatMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>
                {uploadingImage
                  ? "Uploading..."
                  : requestSubCatMutation.isPending
                  ? "Submitting..."
                  : "Submit for Approval"}
              </span>
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MySubCategories;