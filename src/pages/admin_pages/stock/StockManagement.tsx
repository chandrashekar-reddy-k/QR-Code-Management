import { useState, useMemo } from "react";
import {
  Package,
  RefreshCw,
  Download,
  FileUp,
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
  productId: string;
  name: string;
  variant: string;
  type: string;
  stock: number;
  vehicleStock: number;
  totalStock: number;
  image: string | null;
  isActive: boolean;
  isOnline: boolean;
  isPos: boolean;
  lifecycleStage: string;
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


// Table stock type for internal use
interface TableStock {
  id: string;
  productId: string;
  name: string;
  variant: string;
  type: string;
  stock: number;
  vehicleStock: number;
  totalStock: number;
  image: string | null;
  status: "active" | "inactive";
  isOnline: boolean;
  isPos: boolean;
  lifecycleStage: string;
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


  const isUuid = (val: any) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

  const KNOWN_UNIT_TYPE_MAP: Record<string, string> = {
    "541eee62-334f-475d-b2bc-3bc953edb2a0": "Weight",
    "2d8a8cb8-a847-40e4-bf07-89cd284d954d": "Pack",
    "2d014ffc-7cd1-404b-90ed-1b9569d33a97": "Volume",
    "66f022cb-26e1-4b7b-bb14-3c8ae0868a8a": "gm",
    "e5e6d1b6-5754-4967-a393-0c5d56c0fd1d": "kg",
    "4eb90754-8726-4c76-8df8-abd734b39278": "kgs",
    "9351f2cc-5597-4bed-9d7e-8af0fb7fdc58": "Gms",
    "465c261c-d865-4574-8eda-52d0463753e7": "Weight",
  };

  const resolveDisplayUnitType = (p: any): string => {
    if (p.unitTypeName && !isUuid(p.unitTypeName)) return p.unitTypeName;
    if (p.unitType) {
      if (KNOWN_UNIT_TYPE_MAP[p.unitType]) return KNOWN_UNIT_TYPE_MAP[p.unitType];
      if (!isUuid(p.unitType)) return p.unitType;
    }
    if (p.unitObj?.unitType?.name) return p.unitObj.unitType.name;
    if (p.unit) {
      if (KNOWN_UNIT_TYPE_MAP[p.unit]) return KNOWN_UNIT_TYPE_MAP[p.unit];
      const unitStr = String(p.unit).toLowerCase();
      if (unitStr.includes("kg") || unitStr.includes("gram") || unitStr.includes("gm") || unitStr.includes("weight")) return "Weight";
      if (unitStr.includes("litre") || unitStr.includes("liter") || unitStr.includes("ml") || unitStr.includes("volume")) return "Volume";
      if (unitStr.includes("pack") || unitStr.includes("piece") || unitStr.includes("pc") || unitStr.includes("box")) return "Pack";
    }
    if (p.productType && !isUuid(p.productType)) {
      return p.productType.replace(/_/g, " ");
    }
    return "Pack";
  };

  // Normalise API products → ApiStock shape
  const stocks: ApiStock[] = useMemo(() => {
    const resp = apiData as { data?: { products?: ApiStock[] } | ApiStock[] } | undefined;
    const d = resp?.data;
    const arr: any[] = Array.isArray(d)
      ? d as any[]
      : ((d as { products?: any[] })?.products ?? []);
    return arr.map((p: any) => {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const tagStage = tags.find((t: string) => t.startsWith('LIFECYCLE:'))?.split(':')[1];
      const stage = p.lifecycleStage || tagStage || 'STORE_ROOM';
      const prodId = p.productId || String(p.id ?? '').slice(0, 8).toUpperCase();
      const variantName = p.variantName || (Array.isArray(p.variants) && p.variants[0]?.variantName) || p.unit || "—";
      const unitType = resolveDisplayUnitType(p);

      const hasChTag = tags.some((t: string) => t.startsWith('CH:'));
      const isOnline = hasChTag ? tags.includes('CH:ONLINE') : (p.isOnline !== false);
      const isPos = hasChTag ? tags.includes('CH:POS') : (p.isPos !== false);

      return {
        id: p.id,
        productId: prodId,
        name: p.name || "",
        variant: variantName,
        type: unitType,
        stock: Number(p.stock ?? 0),
        vehicleStock: Number(p.vehicleStock ?? 0),
        totalStock: Number(p.totalStock ?? (Number(p.stock ?? 0) + Number(p.vehicleStock ?? 0))),
        image: p.image || (Array.isArray(p.images) ? p.images[0] : null),
        isActive: Boolean(p.isActive ?? (p.status === 'ACTIVE' || p.status === 'APPROVED')),
        isOnline,
        isPos,
        lifecycleStage: stage,
        createdAt: p.createdAt ?? "",
        updatedAt: p.updatedAt ?? "",
      };
    });
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
      productId: stock.productId,
      name: stock.name,
      variant: stock.variant,
      type: stock.type,
      stock: stock.stock,
      vehicleStock: stock.vehicleStock,
      totalStock: stock.totalStock,
      image: stock.image,
      status: stock.isActive ? "active" : "inactive",
      isOnline: stock.isOnline,
      isPos: stock.isPos,
      lifecycleStage: stock.lifecycleStage,
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
          case "vehicleStock":
            aValue = a.vehicleStock;
            bValue = b.vehicleStock;
            break;
          case "totalStock":
            aValue = a.totalStock;
            bValue = b.totalStock;
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
  const paginatedStocks = filteredAndSortedStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export stocks to CSV
  const handleExport = () => {
    const headers = ["ID", "Name", "Variant", "Type", "In Store", "In Vehicle", "Total Stock", "Status"];
    const rows = stocks.map((stock: ApiStock) => [
      stock.id,
      stock.name,
      stock.variant,
      stock.type,
      stock.stock,
      stock.vehicleStock,
      stock.totalStock,
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



  const posCount = useMemo(() => {
    return stocks.filter((s) => s.isPos).length;
  }, [stocks]);

  const onlineCount = useMemo(() => {
    return stocks.filter((s) => s.isOnline).length;
  }, [stocks]);

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading stocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Stock Management
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Catalog"
          value={totalStock}
          icon={Package}
          variant="purple"
        />

        <StatCard
          title="POS Count"
          value={posCount}
          icon={Package}
          variant="blue"
        />
        <StatCard
          title="Online Count"
          value={onlineCount}
          icon={Package}
          variant="green"
        />
        <StatCard
          title="Active Stock"
          value={activeStock}
          icon={Package}
          variant="green"
        />
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
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
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
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

      {/* Action Buttons (Export, Import, Refresh) */}
      <div className="mt-2 mb-6 flex items-center gap-2 flex-wrap">
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

      {/* Stock Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedStocks}
            columns={[
              {
                key: "id",
                label: "ID",
                sortable: true,
                render: (stock: TableStock) => (
                  <div className="text-center font-mono font-bold text-xs text-gray-800 dark:text-gray-200">
                    {stock.productId || stock.id.slice(0, 8)}
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
                        className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (
                            e.target as HTMLImageElement
                          ).parentElement!.innerHTML =
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
                render: (stock: TableStock) => (
                  <div className="text-left font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 max-w-[180px] truncate" title={stock.name}>
                    {stock.name}
                  </div>
                ),
              },
              {
                key: "variant",
                label: "VARIANT",
                sortable: true,
                render: (stock: TableStock) => (
                  <div className="text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    {stock.variant}
                  </div>
                ),
              },
              {
                key: "type",
                label: "TYPE",
                sortable: true,
                render: (stock: TableStock) => (
                  <div className="text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {stock.type}
                    </span>
                  </div>
                ),
              },

              {
                key: "vehicleStock",
                label: "IN VEHICLE",
                sortable: true,
                render: (stock: TableStock) => (
                  <div className="text-center font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    {stock.vehicleStock}
                  </div>
                ),
              },
              {
                key: "posChannel",
                label: "POS",
                sortable: false,
                render: (stock: TableStock) => {
                  const val = stock.isPos ? stock.stock : 0;
                  return (
                    <div className="text-center">
                      <span className={`text-xs font-semibold ${stock.isPos ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-400'}`}>
                        {val}
                      </span>
                    </div>
                  );
                },
              },
              {
                key: "onlineChannel",
                label: "ONLINE",
                sortable: false,
                render: (stock: TableStock) => {
                  const val = stock.isOnline ? stock.stock : 0;
                  return (
                    <div className="text-center">
                      <span className={`text-xs font-semibold ${stock.isOnline ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-400'}`}>
                        {val}
                      </span>
                    </div>
                  );
                },
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
                              ? "bg-emerald-600 dark:bg-emerald-500"
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
