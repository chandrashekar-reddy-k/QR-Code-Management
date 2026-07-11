import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Banknote,
  Filter,
  ChevronDown,
  RotateCcw,
  Plus,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/formatters";
import {
  SearchInput,
  SelectInput,
  DataTable,
  Pagination,
  StatCard,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

// Mock data for fund transfers
const mockFundTransfers = [
  {
    id: 1,
    deliveryBoyId: 1,
    name: "Agent 1",
    mobile: "9087636388",
    address: "123 Main Street, Andheri",
    openingBalance: 3456,
    closingBalance: 3456,
    amount: 3456,
    type: "Credit",
    message: "Order Item Commission",
    status: "Active",
    date: "2025-11-11T16:06:41Z",
  },
  {
    id: 2,
    deliveryBoyId: 2,
    name: "Agent 2",
    mobile: "9087636388",
    address: "456 Park Avenue, Connaught Place",
    openingBalance: 3456,
    closingBalance: 3456,
    amount: 3456,
    type: "Credit",
    message: "Order Item Commission",
    status: "Active",
    date: "2025-11-11T16:06:41Z",
  },
  {
    id: 3,
    deliveryBoyId: 3,
    name: "Agent 3",
    mobile: "9087636388",
    address: "789 MG Road, Koramangala",
    openingBalance: 3456,
    closingBalance: 3456,
    amount: 3456,
    type: "Debit",
    message: "Cash Withdrawal",
    status: "Inactive",
    date: "2025-11-13T14:20:00Z",
  },
  {
    id: 4,
    deliveryBoyId: 4,
    name: "Agent 4",
    mobile: "9087636388",
    address: "789 MG Road, Koramangala",
    openingBalance: 3456,
    closingBalance: 3456,
    amount: 3456,
    type: "Credit",
    message: "Order Item Commission",
    status: "Active",
    date: "2025-11-11T16:06:41Z",
  },
  {
    id: 5,
    deliveryBoyId: 5,
    name: "Agent 5",
    mobile: "9087636388",
    address: "321 Hitech City, Madhapur",
    openingBalance: 2000,
    closingBalance: 2500,
    amount: 500,
    type: "Credit",
    message: "Delivery Bonus",
    status: "Active",
    date: "2025-11-12T10:30:00Z",
  },
  {
    id: 6,
    deliveryBoyId: 6,
    name: "Agent 6",
    mobile: "9087636388",
    address: "654 Brigade Road, Bangalore",
    openingBalance: 5000,
    closingBalance: 4500,
    amount: 500,
    type: "Debit",
    message: "Penalty Deduction",
    status: "Active",
    date: "2025-11-15T11:45:00Z",
  },
  {
    id: 7,
    deliveryBoyId: 7,
    name: "Agent 7",
    mobile: "9087636388",
    address: "987 Commercial Street, Bangalore",
    openingBalance: 1000,
    closingBalance: 1500,
    amount: 500,
    type: "Credit",
    message: "Delivery Bonus",
    status: "Active",
    date: "2025-11-12T10:30:00Z",
  },
  {
    id: 8,
    deliveryBoyId: 8,
    name: "Agent 8",
    mobile: "9087636388",
    address: "147 Indira Nagar, Bangalore",
    openingBalance: 3000,
    closingBalance: 2800,
    amount: 200,
    type: "Debit",
    message: "Service Charge",
    status: "Active",
    date: "2025-11-14T09:15:00Z",
  },
  {
    id: 9,
    deliveryBoyId: 9,
    name: "Agent 9",
    mobile: "9087636388",
    address: "258 Whitefield, Bangalore",
    openingBalance: 4000,
    closingBalance: 4500,
    amount: 500,
    type: "Credit",
    message: "Delivery Bonus",
    status: "Active",
    date: "2025-11-12T10:30:00Z",
  },
  {
    id: 10,
    deliveryBoyId: 10,
    name: "Agent 10",
    mobile: "9087636388",
    address: "369 Marathahalli, Bangalore",
    openingBalance: 2500,
    closingBalance: 3000,
    amount: 500,
    type: "Credit",
    message: "Delivery Bonus",
    status: "Active",
    date: "2025-11-12T10:30:00Z",
  },
  {
    id: 11,
    deliveryBoyId: 11,
    name: "Agent 11",
    mobile: "9087636388",
    address: "741 Electronic City, Bangalore",
    openingBalance: 1500,
    closingBalance: 1200,
    amount: 300,
    type: "Debit",
    message: "Transaction Fee",
    status: "Active",
    date: "2025-11-16T08:20:00Z",
  },
  {
    id: 12,
    deliveryBoyId: 12,
    name: "Agent 12",
    mobile: "9087636388",
    address: "852 Banashankari, Bangalore",
    openingBalance: 6000,
    closingBalance: 6500,
    amount: 500,
    type: "Credit",
    message: "Delivery Bonus",
    status: "Active",
    date: "2025-11-12T10:30:00Z",
  },
  {
    id: 13,
    deliveryBoyId: 13,
    name: "Agent 13",
    mobile: "9087636388",
    address: "963 Jayanagar, Bangalore",
    openingBalance: 3500,
    closingBalance: 4000,
    amount: 500,
    type: "Credit",
    message: "Delivery Bonus",
    status: "Active",
    date: "2025-11-12T10:30:00Z",
  },
  {
    id: 14,
    deliveryBoyId: 14,
    name: "Agent 14",
    mobile: "9087636388",
    address: "159 Malleswaram, Bangalore",
    openingBalance: 2000,
    closingBalance: 1800,
    amount: 200,
    type: "Debit",
    message: "Service Charge",
    status: "Active",
    date: "2025-11-14T09:15:00Z",
  },
];

const ManageFundTransfers = () => {
  const navigate = useNavigate();
  const [fundTransfers] = useState(mockFundTransfers);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );

  // KPI metrics
  const kpiData = useMemo(() => {
    const totalTransactions = fundTransfers.length;
    const creditTransactions = fundTransfers.filter(
      (ft) => ft.type === "Credit"
    ).length;
    const debitTransactions = fundTransfers.filter(
      (ft) => ft.type === "Debit"
    ).length;
    const totalAmount = fundTransfers.reduce(
      (sum, ft) => sum + (ft.amount || 0),
      0
    );
    const activeTransactionsAmount = fundTransfers
      .filter((ft) => ft.status === "Active")
      .reduce((sum, ft) => sum + (ft.amount || 0), 0);

    return [
      {
        title: "Credit Transactions",
        value: creditTransactions.toString(),
        icon: Wallet,
        variant: "purple" as const,
      },
      {
        title: "Debit Transactions",
        value: debitTransactions.toString(),
        icon: Banknote,
        variant: "yellow" as const,
      },
      {
        title: "Total Amount",
        value: totalAmount.toString(),
        icon: Banknote,
        variant: "green" as const,
      },
      {
        title: "Active Transactions",
        value: formatCurrency(activeTransactionsAmount),
        icon: Wallet,
        variant: "yellow" as const,
      },
      {
        title: "Total Transactions",
        value: totalTransactions.toString(),
        icon: Wallet,
        variant: "purple" as const,
      },
    ];
  }, [fundTransfers]);

  // Filter + sort
  const filteredAndSortedFundTransfers = useMemo(() => {
    let filtered = [...fundTransfers];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ft) =>
          ft.id.toString().includes(term) ||
          ft.name.toLowerCase().includes(term) ||
          ft.mobile.toLowerCase().includes(term) ||
          ft.address.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((ft) => ft.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((ft) => ft.type === typeFilter);
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
          case "address":
            aValue = a.address.toLowerCase();
            bValue = b.address.toLowerCase();
            break;
          case "openingBalance":
            aValue = a.openingBalance;
            bValue = b.openingBalance;
            break;
          case "closingBalance":
            aValue = a.closingBalance;
            bValue = b.closingBalance;
            break;
          case "amount":
            aValue = a.amount;
            bValue = b.amount;
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "message":
            aValue = (a.message || "").toLowerCase();
            bValue = (b.message || "").toLowerCase();
            break;
          case "status":
            aValue = (a.status || "").toLowerCase();
            bValue = (b.status || "").toLowerCase();
            break;
          case "date":
            aValue = new Date(a.date || 0).getTime();
            bValue = new Date(b.date || 0).getTime();
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
  }, [fundTransfers, searchTerm, statusFilter, typeFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedFundTransfers.length / itemsPerPage)
  );
  const paginatedFundTransfers = filteredAndSortedFundTransfers.slice(
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
    setStatusFilter("");
    setTypeFilter("");
    setCurrentPage(1);
  };

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {transfer.id}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-left">
          <p className="text-xs sm:text-sm font-medium text-gray-900">
            {transfer.name}
          </p>
          <p className="text-[11px] sm:text-xs text-green-500 dark:text-green-400">
            {transfer.mobile}
          </p>
        </div>
      ),
    },
    {
      key: "address",
      label: "ADDRESS",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {transfer.address}
          </span>
        </div>
      ),
    },
    {
      key: "openingBalance",
      label: "OPENING BALANCE(₹)",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {formatCurrency(transfer.openingBalance)}
          </span>
        </div>
      ),
    },
    {
      key: "closingBalance",
      label: "CLOSING BALANCE(₹)",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {formatCurrency(transfer.closingBalance)}
          </span>
        </div>
      ),
    },
    {
      key: "amount",
      label: "AMOUNT(₹)",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {formatCurrency(transfer.amount)}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "TYPE",
      sortable: false,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-left">
          <span className="text-xs sm:text-sm text-gray-800">
            {transfer.type}
          </span>
        </div>
      ),
    },
    {
      key: "message",
      label: "MESSAGE",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-left">
          <span className="text-xs sm:text-sm text-gray-800">
            {transfer.message || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-center">
          <span
            className={`px-3 py-1 rounded text-xs sm:text-sm font-medium ${
              transfer.status === "Active"
                ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
            }`}
          >
            {transfer.status}
          </span>
        </div>
      ),
    },
    {
      key: "date",
      label: "DATE",
      sortable: true,
      render: (transfer: (typeof mockFundTransfers)[0]) => (
        <div className="text-left">
          <span className="text-xs sm:text-sm text-gray-800">
            {transfer.date ? formatDate(transfer.date) : "-"}
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
            Fund Transfers
          </h1>
          <button
            onClick={() => navigate("/delivery-boys/fund-transfers/add")}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Add Fund Transfer</span>
          </button>
        </div>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
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

          {/* Status Filter */}
          <div className="px-2 sm:px-3 py-2.5 sm:py-3 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Status" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Type Filter */}
          <div className="px-2 sm:px-3 py-2.5 sm:py-3 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: "", label: "Type" },
                  { value: "Credit", label: "Credit" },
                  { value: "Debit", label: "Debit" },
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
              className="flex items-center gap-1.5 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-500" />
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
          data={paginatedFundTransfers}
          columns={columns}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          keyExtractor={(transfer) => transfer.id.toString()}
          emptyMessage="No fund transfers found"
        />

        {/* Pagination */}
        {filteredAndSortedFundTransfers.length > 0 && (
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
                    {filteredAndSortedFundTransfers.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedFundTransfers.length}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageFundTransfers;
