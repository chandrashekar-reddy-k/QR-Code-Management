import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Package,
  RefreshCw,
  Download,
  FileUp,
  Camera,
  PlusCircle,
} from "lucide-react";
import {
  SearchInput,
  ConfirmModal,
  StatCard,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  DataTable,
  Pagination,
  PrimaryButton,
  Button,
  Modal,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { toast } from "react-toastify";
import { 
  useDeleteCategory, 
  useGetAllCategoriesForManage, 
  useToggleCategory,
  useRequestNewCategory,
  useRequestNewSubCategory,
  useGetActiveCategoriesList
} from "../../../hooks/category";

// Define the API response type
interface ApiCategory {
  id: string;
  name: string;
  slug: string | null;
  categorySubtitle: string | null;
  description: string | null;
  image: string | null;
  icon: string | null;
  colorCode: string | null;
  metaTitle: string | null;
  metaKeywords: string[];
  schemaMarkup: any;
  metaDescription: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiStats {
  total: number;
  active: number;
  inactive: number;
}

interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    stats: ApiStats;
    categories: ApiCategory[];
  };
  pagination: ApiPagination;
}

// Table category type for internal use
interface TableCategory {
  id: string;
  name: string;
  subtitle: string;
  image: string | null;
  status: "active" | "inactive";
  slug: string;
}

const ManageCategories = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Request Category / Subcategory modals state
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubCatModal, setShowSubCatModal] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  const [selectedParentCatId, setSelectedParentCatId] = useState("");
  const [newSubCatName, setNewSubCatName] = useState("");
  const [newSubCatDesc, setNewSubCatDesc] = useState("");

  const requestCatMutation = useRequestNewCategory();
  const requestSubCatMutation = useRequestNewSubCategory();
  const { data: activeCategoriesData } = useGetActiveCategoriesList();

  const activeCategoriesList = useMemo(() => {
    const res = activeCategoriesData as any;
    return res?.data?.categories || res?.data || [];
  }, [activeCategoriesData]);
  
  const { data, isLoading, refetch } = useGetAllCategoriesForManage(currentPage, itemsPerPage);
  const { mutate } = useDeleteCategory();
  const { mutate: toggleCategory, isPending: isTogglingCategory } = useToggleCategory();

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    const onFocus = () => { refetch && refetch(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [location, refetch]);

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;
  
  const categories: ApiCategory[] = apiData?.data?.categories || [];
  const stats: ApiStats = apiData?.data?.stats || { total: 0, active: 0, inactive: 0 };
  const pagination: ApiPagination = apiData?.pagination || { 
    page: 1, 
    limit: 10, 
    total: 0, 
    totalPages: 1,
    hasNext: false,
    hasPrev: false 
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await requestCatMutation.mutateAsync({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined
      });
      setNewCatName("");
      setNewCatDesc("");
      setShowCatModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentCatId || !newSubCatName.trim()) return;
    try {
      await requestSubCatMutation.mutateAsync({
        categoryId: selectedParentCatId,
        name: newSubCatName.trim(),
        description: newSubCatDesc.trim() || undefined
      });
      setSelectedParentCatId("");
      setNewSubCatName("");
      setNewSubCatDesc("");
      setShowSubCatModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Transform API categories to table format
  const tableCategories: TableCategory[] = useMemo(() => {
    return categories.map(category => ({
      id: category.id,
      name: category.name,
      subtitle: category.categorySubtitle || "",
      image: category.image,
      status: category.isActive ? "active" : "inactive",
      slug: category.slug || ""
    }));
  }, [categories]);

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

  // Filter and sort categories
  const filteredAndSortedCategories: TableCategory[] = useMemo(() => {
    let filtered = tableCategories.filter((category) => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        category.name.toLowerCase().includes(searchLower) ||
        category.subtitle.toLowerCase().includes(searchLower) ||
        category.id.toLowerCase().includes(searchLower) ||
        category.slug.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableCategory, b: TableCategory) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "subtitle":
            aValue = a.subtitle.toLowerCase();
            bValue = b.subtitle.toLowerCase();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
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
  }, [tableCategories, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCategories.length / itemsPerPage);
  const paginatedCategories = filteredAndSortedCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export categories to CSV
  const handleExport = () => {
    const headers = ["ID", "Name", "Subtitle", "Slug", "Status"];
    const rows = categories.map((cat: ApiCategory) => [
      cat.id,
      cat.name,
      cat.categorySubtitle || "",
      cat.slug || "",
      cat.isActive ? "active" : "inactive",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `categories_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import categories from CSV
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const lines = text.split("\n").filter((line) => line.trim());
            alert("Import functionality needs to be connected to API");
          } catch (error) {
            console.error("Error importing categories:", error);
            alert("Error importing categories. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      mutate(deleteConfirm.id)
    } catch (error: any) {
      console.error("Error deleting category:", error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleEdit = (category: TableCategory) => {
    navigate(`/categories/${category.id}/edit`);
  };

  const handleView = (category: TableCategory) => {
    navigate(`/categories/view/${category.id}`);
  };

  const handleToggleStatus = (id: string, currentStatus: "active" | "inactive") => {
    const isActive = currentStatus === "inactive"; // new state after toggle
    const message = isActive ? "Status updated to Active" : "Status updated to Inactive";
    toggleCategory(
      { id, isActive },
      {
        onSuccess: () => {
          toast.success(message);
          refetch?.();
        },
      }
    );
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch();
    } else {
      window.location.reload();
    }
  };

  // Calculate KPI stats
  const totalCategories = stats.total;
  const activeCategories = stats.active;
  const inactiveCategories = stats.inactive;
  const categoriesWithImages = categories.filter((c: ApiCategory) => c.image).length;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Manage Categories
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1.5 h-9 sm:h-10 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-colors text-xs sm:text-sm"
          >
            <PlusCircle size={15} />
            <span>Request New Category</span>
          </button>
          <button
            onClick={() => setShowSubCatModal(true)}
            className="flex items-center gap-1.5 h-9 sm:h-10 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors text-xs sm:text-sm"
          >
            <PlusCircle size={15} />
            <span>Request New SubCategory</span>
          </button>
          <PrimaryButton
            onClick={() => navigate("/categories/create")}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add Category</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Categories"
          value={totalCategories}
          icon={Package}
          variant="purple"
        />
        <StatCard
          title="Active Categories"
          value={activeCategories}
          icon={Package}
          variant="yellow"
        />
        <StatCard
          title="Inactive Categories"
          value={inactiveCategories}
          icon={Package}
          variant="green"
        />
        <StatCard
          title="With Images"
          value={categoriesWithImages}
          icon={Camera}
          variant="red"
        />
      </div>

      {/* Action Buttons (Export, Import, Refresh) and Search Bar */}
      <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Export, Import, Refresh Buttons - Left */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleExport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
            title="Export to CSV"
          >
            <Download size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            onClick={handleImport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
            title="Import from CSV"
          >
            <FileUp size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={`sm:w-4 sm:h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Search Bar - Right */}
        <div className="w-full sm:w-auto sm:ml-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedCategories}
            columns={[
              {
                key: "id",
                label: "ID",
                sortable: true,
                render: (category: TableCategory) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800">
                      {category.id.slice(0, 8)}...
                    </span>
                  </div>
                ),
              },
              {
                key: "image",
                label: "IMAGE",
                sortable: false,
                render: (category: TableCategory) => (
                  <div className="text-center">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-10 h-10 object-cover rounded mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = 
                            '<span class="text-[10px] text-gray-400">No image</span>';
                        }}
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
                render: (category: TableCategory) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">
                      {category.name}
                    </span>
                  </div>
                ),
              },
              {
                key: "subtitle",
                label: "SUBTITLE",
                sortable: true,
                render: (category: TableCategory) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700">
                      {category.subtitle || "No subtitle"}
                    </span>
                  </div>
                ),
              },
              {
                key: "status",
                label: "STATUS",
                sortable: true,
                render: (category: TableCategory) => {
                  const isActive = category.status === "active";
                  return (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(category.id, category.status)}
                        disabled={isTogglingCategory}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isActive ? "bg-green-600 dark:bg-green-500" : "bg-gray-300 dark:bg-gray-600"} ${isTogglingCategory ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        title={isActive ? "Click to make inactive" : "Click to make active"}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                  );
                },
              },
              {
                key: "actions",
                label: "ACTIONS",
                sortable: false,
                render: (category: TableCategory) => (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <ViewIconButton
                        onClick={() => handleView(category)}
                        size={12}
                        tooltip="View"
                      />
                      <EditIconButton
                        onClick={() => handleEdit(category)}
                        size={12}
                        tooltip="Edit"
                      />
                      <DeleteIconButton
                        onClick={() => handleDeleteClick(category.id)}
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
            loading={isLoading}
            keyExtractor={(category) => category.id}
            emptyMessage="No categories found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedCategories.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
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
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedCategories.length)}{" "}
                  of {filteredAndSortedCategories.length}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Request New Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="Request New Category" size="sm">
        <form onSubmit={handleCreateCategorySubmit} className="space-y-4 pt-2">
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            Note: Requested categories require Admin approval before appearing in your store or active categories list.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Organic Produce"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Brief description of the category..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCatModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requestCatMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm shadow disabled:opacity-50"
            >
              {requestCatMutation.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request New SubCategory Modal */}
      <Modal isOpen={showSubCatModal} onClose={() => setShowSubCatModal(false)} title="Request New SubCategory" size="sm">
        <form onSubmit={handleCreateSubCategorySubmit} className="space-y-4 pt-2">
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            Note: Requested subcategories require Admin approval before appearing in your store.
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
              {activeCategoriesList.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SubCategory Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newSubCatName}
              onChange={(e) => setNewSubCatName(e.target.value)}
              placeholder="e.g. Leafy Greens"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={newSubCatDesc}
              onChange={(e) => setNewSubCatDesc(e.target.value)}
              placeholder="Brief description of the subcategory..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSubCatModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requestSubCatMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow disabled:opacity-50"
            >
              {requestSubCatMutation.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageCategories;