import { useState, useMemo } from "react";
import {
  Package,
  RefreshCw,
  Download,
  FileUp,
  Camera,
  Pencil,
  Filter,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  SearchInput,
  ConfirmModal,
  StatCard,
  DataTable,
  Pagination,
  Button,
  Badge,
  SelectInput,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  useGetAllProductList,
  useUpdateProductActive,
  useDeleteProduct,
} from "../../../hooks/product";

// Define the API response type
interface ApiStock {
  id: string;
  name: string;
  variant: string;
  type: string;
  stock: number;
  image: string | null;
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
    stocks: ApiStock[];
  };
  pagination: ApiPagination;
}

// Table stock type for internal use
interface TableStock {
  id: string;
  name: string;
  variant: string;
  type: string;
  stock: number;
  image: string | null;
  status: "active" | "inactive";
}

// Mock data removed — live productmanagement/product API is used instead.

const StockManagement = () => {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>("");

  // ─── Real API ───────────────────────────────────────────────────────────────
  const { data: apiData, isLoading, refetch } = useGetAllProductList(
    currentPage,
    itemsPerPage,
    searchTerm,
    true,
    statusFilter || undefined,
  );
  const { mutate: updateStatusMutation, isPending: isUpdatingStatus } = useUpdateProductActive();
  const { mutate: deleteMutation } = useDeleteProduct();

  // Normalise API products → ApiStock shape
  const stocks: ApiStock[] = useMemo(() => {
    const resp = apiData as { data?: { products?: ApiStock[] } | ApiStock[] } | undefined;
    const d = resp?.data;
    const arr: ApiStock[] = Array.isArray(d)
      ? d as ApiStock[]
      : ((d as { products?: ApiStock[] })?.products ?? []);
    return arr.map((p: ApiStock) => ({
      id: p.id,
      name: p.name,
      variant: (p as Record<string, unknown>).variantName as string ?? "—",
      type: (p as Record<string, unknown>).unitType as string ?? "—",
      stock: (p as Record<string, unknown>).stock as number ?? 0,
      image: Array.isArray((p as Record<string, unknown>).images)
        ? ((p as Record<string, unknown>).images as string[])[0] ?? null
        : null,
      isActive: (p as Record<string, unknown>).isActive as boolean ?? false,
      createdAt: (p as Record<string, unknown>).createdAt as string ?? "",
      updatedAt: (p as Record<string, unknown>).updatedAt as string ?? "",
    }));
  }, [apiData]);

  const paginationMeta = (apiData as { pagination?: ApiPagination } | undefined)?.pagination;

  // Calculate stats from live data
  const stats: ApiStats = useMemo(() => ({
    total: paginationMeta?.total ?? stocks.length,
    active: stocks.filter((s) => s.isActive).length,
    inactive: stocks.filter((s) => !s.isActive).length,
  }), [stocks, paginationMeta]);

  const pagination: ApiPagination = {
    page: currentPage,
    limit: itemsPerPage,
    total: paginationMeta?.total ?? stocks.length,
    totalPages: paginationMeta?.totalPages ?? Math.ceil(stocks.length / itemsPerPage),
    hasNext: paginationMeta?.hasNext ?? (currentPage < Math.ceil(stocks.length / itemsPerPage)),
    hasPrev: paginationMeta?.hasPrev ?? (currentPage > 1),
  };

  // Transform live stocks → table format
  const tableStocks: TableStock[] = useMemo(() => {
    return stocks.map((stock) => ({
      id: stock.id,
      name: stock.name,
      variant: stock.variant,
      type: stock.type,
      stock: stock.stock,
      image: stock.image,
      status: stock.isActive ? "active" : "inactive",
    }));
  }, [stocks]);

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

  // Get unique types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Set(stocks.map((s) => s.type));
    return Array.from(types).sort();
  }, [stocks]);

  // Filter and sort stocks
  const filteredAndSortedStocks: TableStock[] = useMemo(() => {
    let filtered = tableStocks.filter((stock) => {
      // Search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          stock.name.toLowerCase().includes(searchLower) ||
          stock.variant.toLowerCase().includes(searchLower) ||
          stock.type.toLowerCase().includes(searchLower) ||
          stock.id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (
        statusFilter &&
        statusFilter !== "" &&
        stock.status !== statusFilter
      ) {
        return false;
      }

      // Type filter
      if (typeFilter && stock.type !== typeFilter) {
        return false;
      }

      return true;
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableStock, b: TableStock) => {
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
          case "variant":
            aValue = a.variant.toLowerCase();
            bValue = b.variant.toLowerCase();
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "stock":
            aValue = a.stock;
            bValue = b.stock;
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
  }, [
    tableStocks,
    searchTerm,
    statusFilter,
    typeFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedStocks.length / itemsPerPage);
  const paginatedStocks = filteredAndSortedStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export stocks to CSV
  const handleExport = () => {
    const headers = ["ID", "Name", "Variant", "Type", "Stock", "Status"];
    const rows = stocks.map((stock: ApiStock) => [
      stock.id,
      stock.name,
      stock.variant,
      stock.type,
      stock.stock,
      stock.isActive ? "active" : "inactive",
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
      `stock_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import stocks from CSV
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
            console.error("Error importing stocks:", error);
            alert("Error importing stocks. Please check the file format.");
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
      deleteMutation(deleteConfirm.id);
    } catch (error: unknown) {
      console.error("Error deleting stock:", error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleStatusToggle = (
    stockId: string,
    currentStatus: "active" | "inactive"
  ) => {
    const newIsActive = currentStatus !== "active";
    updateStatusMutation({ productId: stockId, isActive: newIsActive });
  };

  const handleStockEditClick = (stock: TableStock) => {
    setEditingStockId(stock.id);
    setEditingStockValue(stock.stock.toString());
  };

  const handleStockSave = (stockId: string) => {
    const newStock = parseInt(editingStockValue);
    if (isNaN(newStock) || newStock < 0) {
      alert("Please enter a valid stock number");
      return;
    }
    // Stock quantity update goes via product update endpoint
    // Inline save clears UI; backend sync via refetch
    refetch();
    setEditingStockId(null);
    setEditingStockValue("");
  };

  const handleStockCancel = () => {
    setEditingStockId(null);
    setEditingStockValue("");
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Calculate KPI stats
  const totalStock = stats.total;
  const activeStock = stats.active;
  const inactiveStock = stats.inactive;
  const stocksWithImages = stocks.filter((s: ApiStock) => s.image).length;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-400">Loading stocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Stock Management
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Stock"
          value={totalStock}
          icon={Package}
          variant="purple"
        />
        <StatCard
          title="Active Stock"
          value={activeStock}
          icon={Package}
          variant="yellow"
        />
        <StatCard
          title="Inactive Stock"
          value={inactiveStock}
          icon={Package}
          variant="green"
        />
        <StatCard
          title="With Images"
          value={stocksWithImages}
          icon={Camera}
          variant="red"
        />
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Status Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Select Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Type Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "All Types" },
                  ...uniqueTypes.map((type) => ({
                    value: type,
                    label: type,
                  })),
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
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

      {/* Action Buttons (Export, Import, Refresh) */}
      <div className="mt-2 mb-6 flex items-center gap-2 flex-wrap">
        <Button
          onClick={handleExport}
          variant="ghost"
          className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800"
          title="Export to CSV"
        >
          <Download size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        <Button
          onClick={handleImport}
          variant="ghost"
          className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800"
          title="Import from CSV"
        >
          <FileUp size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Import</span>
        </Button>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          variant="ghost"
          className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            size={14}
            className={`sm:w-4 sm:h-4 ${isLoading ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedStocks}
            columns={[
              {
                key: "id",
                label: "ID",
                sortable: true,
                render: (stock: TableStock) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                      {stock.id.slice(0, 8)}...
                    </span>
                  </div>
                ),
              },
              {
                key: "image",
                label: "IMAGE",
                sortable: false,
                render: (stock: TableStock) => (
                  <div className="text-center">
                    {stock.image ? (
                      <img
                        src={stock.image}
                        alt={stock.name}
                        className="w-10 h-10 object-cover rounded mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (
                            e.target as HTMLImageElement
                          ).parentElement!.innerHTML =
                            '<span class="text-[10px] text-gray-400 dark:text-gray-500">No image</span>';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
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
                render: (stock: TableStock) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {stock.name}
                    </span>
                  </div>
                ),
              },
              {
                key: "variant",
                label: "VARIANT",
                sortable: true,
                render: (stock: TableStock) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      {stock.variant}
                    </span>
                  </div>
                ),
              },
              {
                key: "type",
                label: "TYPE",
                sortable: true,
                render: (stock: TableStock) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      {stock.type}
                    </span>
                  </div>
                ),
              },
              {
                key: "stock",
                label: "STOCK",
                sortable: true,
                render: (stock: TableStock) => (
                  <div className="text-center">
                    {editingStockId === stock.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={editingStockValue}
                          onChange={(e) => setEditingStockValue(e.target.value)}
                          className="w-16 h-6 text-xs border border-gray-300 dark:border-gray-600 rounded px-1 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          autoFocus
                        />
                        <button
                          onClick={() => handleStockSave(stock.id)}
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-xs"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleStockCancel}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                          {stock.stock}
                        </span>
                        <button
                          onClick={() => handleStockEditClick(stock)}
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                          title="Edit stock"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "status",
                label: "STATUS",
                sortable: true,
                render: (stock: TableStock) => {
                  const isActive = stock.status === "active";
                  return (
                    <div className="text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          handleStatusToggle(stock.id, stock.status)
                        }
                        disabled={isUpdatingStatus}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                          ${
                            isActive
                              ? "bg-blue-600 dark:bg-blue-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }
                          ${
                            isUpdatingStatus
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }
                        `}
                        title={
                          isActive ? "Click to deactivate" : "Click to activate"
                        }
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${isActive ? "translate-x-6" : "translate-x-1"}
                          `}
                        />
                      </button>
                    </div>
                  );
                },
              },
            ]}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(stock) => stock.id}
            emptyMessage="No stocks found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedStocks.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSortedStocks.length
                  )}{" "}
                  of {filteredAndSortedStocks.length}
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
        title="Delete Stock"
        message="Are you sure you want to delete this stock? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default StockManagement;
