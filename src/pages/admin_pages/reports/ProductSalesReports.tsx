import { useState, useEffect, useMemo } from "react";
import {
  Package,
  TrendingUp,
  DollarSign,
  Filter,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
 
import { formatCurrency } from "../../../utils/formatters";
import {
  StatCard,
  SearchInput,
  DataTable,
  SelectInput,
  Pagination,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
 
/* ---------------------- Mock product sales data ---------------------- */
const mockProductSales = [
  {
    id: 1,
    productName: "Bowling Pin",
    sellerName: "kolkatta seller",
    sellerId: 49,
    productVariantId: 373,
    uom: "1 Pack",
    totalUnitsSold: 2,
    totalSales: 15300,
    orderDate: "2025-01-15",
  },
  {
    id: 2,
    productName: "Cricket Ball",
    sellerName: "Mumbai Sports",
    sellerId: 12,
    productVariantId: 201,
    uom: "1 Piece",
    totalUnitsSold: 10,
    totalSales: 5000,
    orderDate: "2025-01-20",
  },
  {
    id: 3,
    productName: "Bowling Pin",
    sellerName: "Delhi Gear",
    sellerId: 77,
    productVariantId: 373,
    uom: "1 Pack",
    totalUnitsSold: 1,
    totalSales: 7650,
    orderDate: "2025-01-18",
  },
  {
    id: 4,
    productName: "Tennis Racket",
    sellerName: "kolkatta seller",
    sellerId: 49,
    productVariantId: 410,
    uom: "1 Piece",
    totalUnitsSold: 3,
    totalSales: 12000,
    orderDate: "2025-01-22",
  },
  {
    id: 5,
    productName: "Tennis Racket",
    sellerName: "kolkatta seller",
    sellerId: 49,
    productVariantId: 410,
    uom: "1 Piece",
    totalUnitsSold: 3,
    totalSales: 12000,
    orderDate: "2025-01-22",
  },
  {
    id: 6,
    productName: "Tennis Racket",
    sellerName: "kolkatta seller",
    sellerId: 49,
    productVariantId: 410,
    uom: "1 Piece",
    totalUnitsSold: 3,
    totalSales: 12000,
    orderDate: "2025-01-22",
  },
  {
    id: 7,
    productName: "Tennis Racket",
    sellerName: "kolkatta seller",
    sellerId: 49,
    productVariantId: 410,
    uom: "1 Piece",
    totalUnitsSold: 3,
    totalSales: 12000,
    orderDate: "2025-01-22",
  },
];
 
type SortKey =
  | "productName"
  | "sellerName"
  | "sellerId"
  | "productVariantId"
  | "uom"
  | "totalUnitsSold"
  | "totalSales";
 
const ProductSalesReports: React.FC = () => {
  const [data, setData] = useState(mockProductSales);
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
 
  // sorting
  const [sortKey, setSortKey] = useState<SortKey | null>("productName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("asc");
 
  useEffect(() => {
    // placeholder for API fetch if needed later
    setData(mockProductSales);
  }, []);
 
  const handleSort = (field: string) => {
    if (sortKey === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortKey(field as SortKey);
      setSortDirection("asc");
    }
  };
 
  const filteredAndSorted = useMemo(() => {
    const filtered = data.filter((item) => {
      // search across product name and seller name and ids
      const matchesSearch =
        searchTerm.trim() === "" ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sellerId.toString().includes(searchTerm) ||
        item.productVariantId.toString().includes(searchTerm);
 
      // date filter
      let matchesDate = true;
      if (dateFilter) {
        const now = new Date();
        const orderDate = new Date(item.orderDate);
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
 
        if (dateFilter === "today") {
          matchesDate =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === "week") {
          matchesDate = diffDays <= 7;
        } else if (dateFilter === "month") {
          matchesDate = diffDays <= 30;
        }
      }
 
      return matchesSearch && matchesDate;
    });
 
    if (!sortKey || !sortDirection) return filtered;
 
    const sorted = [...filtered].sort((a: any, b: any) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
 
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
 
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
        : String(bVal).localeCompare(String(aVal), undefined, {
            numeric: true,
          });
    });
 
    return sorted;
  }, [data, searchTerm, dateFilter, sortKey, sortDirection]);
 
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
 
  // reset to first page when filters / sort change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateFilter, sortKey, sortDirection]);
 
  const handleResetFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setPage(1);
  };
 
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSorted.length / pageSize)
  );
  const paginated = filteredAndSorted.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
 
  /* KPIs */
  const totalProducts = filteredAndSorted.length;
  const totalUnits = filteredAndSorted.reduce(
    (s, r) => s + r.totalUnitsSold,
    0
  );
  const totalRevenue = filteredAndSorted.reduce((s, r) => s + r.totalSales, 0);
 
  // Table columns
  const columns = [
    {
      key: "productName",
      label: "PRODUCT NAME",
      sortable: true,
      render: (row: typeof mockProductSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {row.productName}
          </span>
        </div>
      ),
    },
    {
      key: "sellerName",
      label: "SELLER NAME",
      sortable: true,
      render: (row: typeof mockProductSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {row.sellerName}
          </span>
        </div>
      ),
    },
    {
      key: "sellerId",
      label: "SELLER ID",
      sortable: true,
      render: (row: typeof mockProductSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">{row.sellerId}</span>
        </div>
      ),
    },
    {
      key: "productVariantId",
      label: "PRODUCT VARIANT ID",
      sortable: true,
      render: (row: typeof mockProductSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {row.productVariantId}
          </span>
        </div>
      ),
    },
    {
      key: "uom",
      label: "UNIT OF MEASURE",
      sortable: true,
      render: (row: typeof mockProductSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">{row.uom}</span>
        </div>
      ),
    },
    {
      key: "totalUnitsSold",
      label: "TOTAL UNITS SOLD",
      sortable: true,
      render: (row: typeof mockProductSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {row.totalUnitsSold}
          </span>
        </div>
      ),
    },
    {
      key: "totalSales",
      label: "TOTAL SALES",
      sortable: true,
      render: (row: typeof mockProductSales[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">
            {formatCurrency(row.totalSales)}
          </span>
        </div>
      ),
    },
  ];
 
  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
          Product Sales Reports
        </h1>
        <Breadcrumbs />
      </div>
 
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Products"
          value={totalProducts}
          icon={Package}
          variant="blue"
          size="md"
          valueSize="2xl"
        />
        <StatCard
          title="Total Units Sold"
          value={totalUnits}
          icon={TrendingUp}
          variant="green"
          size="md"
          valueSize="2xl"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          variant="purple"
          size="md"
          valueSize="2xl"
        />
      </div>
 
      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-[500px] overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>
 
          {/* Date Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: "", label: "From & to Date" },
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
 
          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>
 
        {/* Search */}
        <div className="w-full lg:w-auto lg:flex-shrink-0">
          <div className="w-full sm:w-auto lg:min-w-[200px]">
            <SearchInput
              placeholder="Search by product, seller or ids..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="h-10 w-full"
            />
          </div>
        </div>
      </div>
 
      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginated}
            columns={columns}
            sortField={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(row) => row.id.toString()}
            emptyMessage={
              searchTerm || dateFilter
                ? "No records found matching your search"
                : "No records found"
            }
          />
        </div>
 
        {/* Pagination */}
        {filteredAndSorted.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <SelectInput
                    value={pageSize.toString()}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                      { value: "100", label: "100" },
                    ]}
                    className="w-16 sm:w-20 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing results{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {pageSize}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSorted.length.toLocaleString()}
                  </span>
                </span>
              </div>
 
              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  itemsPerPage={pageSize}
                  totalItems={filteredAndSorted.length}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
 
export default ProductSalesReports;
 
 