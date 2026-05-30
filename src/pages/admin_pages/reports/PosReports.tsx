import { useState, useEffect, useMemo } from "react";
import {
  Filter,
  ChevronDown,
  RotateCcw,
  Download,
  FileText,
  DollarSign,
  CreditCard,
} from "lucide-react";

import {
  StatCard,
  DataTable,
  SearchInput,
  SelectInput,
  Pagination,
} from "../../../components/ui";
import { formatCurrency } from "../../../utils/formatters";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

/* --------------------------- Mock POS report data --------------------------- */
const mockPosReports = [
  {
    id: 1,
    customerName: "User",
    customerPhone: "9087636388",
    dateTime: "2025-11-12T10:00:00Z",
    totalPrice: 250,
    paymentMethod: "UPI",
  },
  {
    id: 2,
    customerName: "User",
    customerPhone: "9087636388",
    dateTime: "2025-11-12T10:00:00Z",
    totalPrice: 250,
    paymentMethod: "UPI",
  },
  {
    id: 3,
    customerName: "User",
    customerPhone: "9087636388",
    dateTime: "2025-11-12T10:00:00Z",
    totalPrice: 250,
    paymentMethod: "UPI",
  },
  {
    id: 4,
    customerName: "User",
    customerPhone: "9087636388",
    dateTime: "2025-11-12T10:00:00Z",
    totalPrice: 250,
    paymentMethod: "UPI",
  },
];

type SortKey = "id" | "customerName" | "dateTime" | "totalPrice" | "paymentMethod";

const PAYMENT_METHODS = ["All", "UPI", "Card", "Cash"] as const;

const PosReports: React.FC = () => {
  const [data, setData] = useState(mockPosReports);

  const [dateFilter, setDateFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [sortKey, setSortKey] = useState<SortKey | null>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    "asc"
  );

  useEffect(() => {
    // placeholder for API fetch in future
    setData(mockPosReports);
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
      const q = searchTerm.trim().toLowerCase();

      const matchesSearch =
        q === "" ||
        item.id.toString().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.includes(q) ||
        item.paymentMethod.toLowerCase().includes(q);

      const matchesPayment =
        paymentFilter === "All" || item.paymentMethod === paymentFilter;

      let matchesDate = true;
      if (dateFilter) {
        const now = new Date();
        const orderDate = new Date(item.dateTime);
        const diffDays =
          (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);

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

      return matchesSearch && matchesDate && matchesPayment;
    });

    if (!sortKey || !sortDirection) return filtered;

    const sorted = [...filtered].sort((a: any, b: any) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (sortKey === "dateTime") {
        const da = new Date(aVal).getTime();
        const db = new Date(bVal).getTime();
        return sortDirection === "asc" ? da - db : db - da;
      }

      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal), undefined, {
            numeric: true,
          })
        : String(bVal).localeCompare(String(aVal), undefined, {
            numeric: true,
          });
    });

    return sorted;
  }, [data, searchTerm, dateFilter, paymentFilter, sortKey, sortDirection]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateFilter, paymentFilter, sortKey, sortDirection]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setPaymentFilter("All");
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

  const totalAmount = filteredAndSorted.reduce(
    (sum, row) => sum + row.totalPrice,
    0
  );
  const totalBills = filteredAndSorted.length;
  const averageBill = totalBills > 0 ? totalAmount / totalBills : 0;

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (row: typeof mockPosReports[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
            {row.id}
          </span>
        </div>
      ),
    },
    {
      key: "customerName",
      label: "CUSTOMER",
      sortable: true,
      render: (row: typeof mockPosReports[0]) => (
        <div className="text-left">
          <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
            {row.customerName}
          </div>
          <button
            type="button"
            className="text-[11px] sm:text-xs text-green-600 dark:text-green-400 underline-offset-2 hover:underline"
          >
            {row.customerPhone}
          </button>
        </div>
      ),
    },
    {
      key: "dateTime",
      label: "DATE AND TIME",
      sortable: true,
      render: (row: typeof mockPosReports[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {new Date(row.dateTime).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "totalPrice",
      label: "TOTAL PRICE",
      sortable: true,
      render: (row: typeof mockPosReports[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(row.totalPrice)}
          </span>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: "PAYMENT METHOD",
      sortable: true,
      render: (row: typeof mockPosReports[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {row.paymentMethod}
          </span>
        </div>
      ),
    },
    {
      key: "invoice",
      label: "INVOICE",
      sortable: false,
      render: () => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300"
          >
            <FileText size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          POS Reports
        </h1>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total Bills"
          value={totalBills}
          icon={FileText}
          variant="blue"
          size="md"
          valueSize="2xl"
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(totalAmount)}
          icon={DollarSign}
          variant="green"
          size="md"
          valueSize="2xl"
        />
        <StatCard
          title="Average Bill Value"
          value={formatCurrency(averageBill)}
          icon={CreditCard}
          variant="purple"
          size="md"
          valueSize="2xl"
        />
      </div>

      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-[520px] overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Date Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
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
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                options={PAYMENT_METHODS.map((pm) => ({
                  value: pm,
                  label: pm === "All" ? "Payment Method" : pm,
                }))}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
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
              placeholder="Search customer, mobile, payment, id..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="h-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginated}
            columns={columns}
            sortField={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(row) => row.id.toString()}
            emptyMessage={
              searchTerm || dateFilter || paymentFilter !== "All"
                ? "No records found matching your search"
                : "No records found"
            }
          />
        </div>

        {/* Pagination */}
        {filteredAndSorted.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  Show
                </span>
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
                <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
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

export default PosReports;

