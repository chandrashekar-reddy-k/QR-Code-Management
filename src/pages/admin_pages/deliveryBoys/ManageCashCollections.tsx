import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Filter,
  ChevronDown,
  RotateCcw,
  Plus,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "../../../utils/formatters";
import {
  SearchInput,
  SelectInput,
  DataTable,
  Pagination,
  StatCard,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

// Mock data for cash collections
const mockCashCollections = [
  {
    id: 1,
    deliveryBoyId: 1,
    name: "Agent 1",
    mobile: "9087636388",
    orderId: "ORD-1234",
    finalTotal: 2500.0,
    amount: 2500.0,
    type: "Collection",
    bonusAmount: 50.0,
    message: "Cash collected for order ORD-1234",
    dateTime: "2025-11-17T10:39:00Z",
  },
  {
    id: 2,
    deliveryBoyId: 2,
    name: "Agent 2",
    mobile: "9087636388",
    orderId: "ORD-1235",
    finalTotal: 1800.0,
    amount: 1800.0,
    type: "Collection",
    bonusAmount: 36.0,
    message: "Cash collected for order ORD-1235",
    dateTime: "2025-11-17T11:20:00Z",
  },
  {
    id: 3,
    deliveryBoyId: 1,
    name: "Agent 1",
    mobile: "9087636388",
    orderId: null,
    finalTotal: 0,
    amount: 500.0,
    type: "Transfer",
    bonusAmount: 0,
    message: "Direct cash transfer",
    dateTime: "2025-11-17T14:15:00Z",
  },
  {
    id: 4,
    deliveryBoyId: 3,
    name: "Agent 3",
    mobile: "9087636388",
    orderId: "ORD-1236",
    finalTotal: 3200.0,
    amount: 3200.0,
    type: "Collection",
    bonusAmount: 64.0,
    message: "Cash collected for order ORD-1236",
    dateTime: "2025-11-17T15:30:00Z",
  },
  {
    id: 5,
    deliveryBoyId: 4,
    name: "Agent 4",
    mobile: "9087636388",
    orderId: null,
    finalTotal: 0,
    amount: 200.0,
    type: "Bonus",
    bonusAmount: 200.0,
    message: "Monthly performance bonus",
    dateTime: "2025-11-17T16:00:00Z",
  },
  {
    id: 6,
    deliveryBoyId: 2,
    name: "Agent 2",
    mobile: "9087636388",
    orderId: "ORD-1237",
    finalTotal: 1500.0,
    amount: 1500.0,
    type: "Collection",
    bonusAmount: 30.0,
    message: "Cash collected for order ORD-1237",
    dateTime: "2025-11-18T09:45:00Z",
  },
  {
    id: 7,
    deliveryBoyId: 1,
    name: "Agent 1",
    mobile: "9087636388",
    orderId: "ORD-1238",
    finalTotal: 4200.0,
    amount: 4200.0,
    type: "Collection",
    bonusAmount: 84.0,
    message: "Cash collected for order ORD-1238",
    dateTime: "2025-11-18T10:20:00Z",
  },
  {
    id: 8,
    deliveryBoyId: 6,
    name: "Agent 6",
    mobile: "9087636388",
    orderId: null,
    finalTotal: 0,
    amount: 300.0,
    type: "Transfer",
    bonusAmount: 0,
    message: "Advance payment",
    dateTime: "2025-11-18T11:10:00Z",
  },
];

const ManageCashCollections = () => {
  const navigate = useNavigate();
  const [cashCollections] = useState(mockCashCollections);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );

  // KPI metrics
  const kpiData = useMemo(() => {
    const totalCollections = cashCollections.length;
    const totalAmount = cashCollections.reduce(
      (sum, cc) => sum + (cc.amount || 0),
      0
    );
    const totalBonus = cashCollections.reduce(
      (sum, cc) => sum + (cc.bonusAmount || 0),
      0
    );
    const collectionTypeCount = cashCollections.filter(
      (cc) => cc.type === "Collection"
    ).length;

    return [
      {
        title: "Total Collection",
        value: totalCollections.toString(),
        icon: Wallet,
        variant: "purple" as const,
      },
      {
        title: "Total Amount",
        value: totalAmount.toString(),
        icon: Wallet,
        variant: "yellow" as const,
      },
      {
        title: "Total Bonus",
        value: formatCurrency(totalBonus),
        icon: Wallet,
        variant: "green" as const,
      },
      {
        title: "Collections",
        value: collectionTypeCount.toString(),
        icon: Wallet,
        variant: "red" as const,
      },
    ];
  }, [cashCollections]);

  // Filter + sort
  const filteredAndSortedCashCollections = useMemo(() => {
    let filtered = [...cashCollections];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (cc) =>
          cc.id.toString().includes(term) ||
          cc.name.toLowerCase().includes(term) ||
          cc.mobile.toLowerCase().includes(term) ||
          (cc.orderId && cc.orderId.toLowerCase().includes(term))
      );
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((cc) => cc.type === typeFilter);
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      filtered = filtered.filter((cc) => {
        const collectionDate = new Date(cc.dateTime);
        const diffDays = (now.getTime() - collectionDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dateFilter === "today") {
          return (
            collectionDate.getDate() === now.getDate() &&
            collectionDate.getMonth() === now.getMonth() &&
            collectionDate.getFullYear() === now.getFullYear()
          );
        } else if (dateFilter === "week") {
          return diffDays <= 7;
        } else if (dateFilter === "month") {
          return diffDays <= 30;
        }
        return true;
      });
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
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
          case "mobile":
            aValue = a.mobile.toLowerCase();
            bValue = b.mobile.toLowerCase();
            break;
          case "orderId":
            aValue = (a.orderId || "").toLowerCase();
            bValue = (b.orderId || "").toLowerCase();
            break;
          case "finalTotal":
            aValue = a.finalTotal;
            bValue = b.finalTotal;
            break;
          case "amount":
            aValue = a.amount;
            bValue = b.amount;
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "bonusAmount":
            aValue = a.bonusAmount;
            bValue = b.bonusAmount;
            break;
          case "message":
            aValue = (a.message || "").toLowerCase();
            bValue = (b.message || "").toLowerCase();
            break;
          case "dateTime":
            aValue = new Date(a.dateTime).getTime();
            bValue = new Date(b.dateTime).getTime();
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
  }, [cashCollections, searchTerm, typeFilter, dateFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedCashCollections.length / itemsPerPage)
  );
  const paginatedCashCollections = filteredAndSortedCashCollections.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  const handleResetFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setDateFilter("");
    setCurrentPage(1);
  };

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {collection.id}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-left">
          <p className="text-xs sm:text-sm font-medium text-gray-900">
            {collection.name}
          </p>
          <p className="text-[11px] sm:text-xs text-green-500 dark:text-green-400">
            {collection.mobile}
          </p>
        </div>
      ),
    },
    {
      key: "orderId",
      label: "ORDER ID",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {collection.orderId || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "finalTotal",
      label: "FINAL TOTAL(₹)",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {formatCurrency(collection.finalTotal || 0)}
          </span>
        </div>
      ),
    },
    {
      key: "amount",
      label: "AMOUNT(₹)",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {formatCurrency(collection.amount || 0)}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "TYPE",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-center">
          <span
            className={`px-3 py-1 rounded text-xs sm:text-sm font-medium ${
              collection.type === "Collection"
                ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                : collection.type === "Bonus"
                ? "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400"
                : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
            }`}
          >
            {collection.type}
          </span>
        </div>
      ),
    },
    {
      key: "bonusAmount",
      label: "BONUS AMOUNT(₹)",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {formatCurrency(collection.bonusAmount || 0)}
          </span>
        </div>
      ),
    },
    {
      key: "message",
      label: "MESSAGE",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-left">
          <span className="text-xs sm:text-sm text-gray-800">
            {collection.message || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "dateTime",
      label: "DATE & TIME",
      sortable: true,
      render: (collection: (typeof mockCashCollections)[0]) => (
        <div className="text-left">
          <span className="text-xs sm:text-sm text-gray-800">
            {formatDateTime(collection.dateTime)}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            Cash Collection
          </h1>
          <button
            onClick={() => navigate("/delivery-boys/cash-collections/add")}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Add Cash Collection</span>
          </button>
        </div>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
            size="md"
            valueSize="2xl"
          />
        ))}
      </div>

      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter icon */}
          <div className="px-2 sm:px-3 py-2.5 sm:py-3 flex items-center justify-center flex-shrink-0">
            <Filter size={16} className="text-gray-700" />
          </div>

          {/* Type Filter */}
          <div className="px-2 sm:px-3 py-2.5 sm:py-3 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: "", label: "Type" },
                  { value: "Collection", label: "Collection" },
                  { value: "Transfer", label: "Transfer" },
                  { value: "Bonus", label: "Bonus" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Date Filter */}
          <div className="px-2 sm:px-3 py-2.5 sm:py-3 flex-1 min-w-0 relative">
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
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Reset button */}
          <div className="px-2 py-2.5 sm:py-3 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-400"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <DataTable
          data={paginatedCashCollections}
          columns={columns}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          keyExtractor={(collection) => collection.id.toString()}
          emptyMessage="No cash collections found"
        />

        {/* Pagination */}
        {filteredAndSortedCashCollections.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-400 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:text-gray-900 dark:[&_select]:text-gray-200 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <SelectInput
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
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
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {filteredAndSortedCashCollections.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedCashCollections.length}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCashCollections;
