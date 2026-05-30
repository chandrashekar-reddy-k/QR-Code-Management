import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Filter,
  ChevronDown,
  IndianRupee,
  Users,
  Package,
  TrendingUp,
  Banknote,
} from "lucide-react";
// import { returnRequestsAPI } from '../../../lib/api';
import { ReturnRequest } from "../../../types";
import { formatDate, formatCurrency } from "../../../utils/formatters";
import {
  SearchInput,
  Badge,
  Button,
  ConfirmModal,
  DataTable,
  Pagination,
  SelectInput,
  StatCard,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

// Mock data for return requests
const mockReturnRequests: ReturnRequest[] = [
  {
    id: 1,
    userId: 201,
    name: "Rajesh Kumar",
    productName: "iPhone 15 Pro",
    quantity: 1,
    total: 75000.0,
    status: "pending",
    reason: "Product damaged on delivery",
    date: "2025-01-15T10:30:00Z",
  },
  {
    id: 2,
    userId: 202,
    name: "Priya Sharma",
    productName: "Cotton T-Shirt",
    quantity: 2,
    total: 1200.0,
    status: "approved",
    reason: "Wrong size received",
    date: "2025-01-16T14:20:00Z",
  },
  {
    id: 3,
    userId: 203,
    name: "Amit Patel",
    productName: "Samsung Galaxy S24",
    quantity: 1,
    total: 65000.0,
    status: "rejected",
    reason: "Changed my mind",
    date: "2025-01-17T09:15:00Z",
  },
  {
    id: 4,
    userId: 204,
    name: "Sneha Reddy",
    productName: "Denim Jeans",
    quantity: 1,
    total: 1800.0,
    status: "completed",
    reason: "Product quality not as expected",
    date: "2025-01-18T16:45:00Z",
  },
  {
    id: 5,
    userId: 205,
    name: "Vikram Singh",
    productName: "Wireless Headphones",
    quantity: 1,
    total: 2500.0,
    status: "pending",
    reason: "Product not working properly",
    date: "2025-01-19T11:30:00Z",
  },
  {
    id: 6,
    userId: 206,
    name: "Anjali Mehta",
    productName: "Running Shoes",
    quantity: 1,
    total: 3200.0,
    status: "approved",
    reason: "Wrong color received",
    date: "2025-01-20T13:20:00Z",
  },
];

const ManageReturnRequests = () => {
  const navigate = useNavigate();
  const [returnRequests, setReturnRequests] =
    useState<ReturnRequest[]>(mockReturnRequests);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchReturnRequests();
  }, []);

  const fetchReturnRequests = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await returnRequestsAPI.getAll();
      // setReturnRequests(Array.isArray(data) ? data : data.returnRequests || []);
      setReturnRequests(mockReturnRequests);
      // Small delay so loading spinner is visible when using mock data
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (error) {
      console.error("Error fetching return requests:", error);
      setReturnRequests(mockReturnRequests);
    } finally {
      setLoading(false);
    }
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

  // Filter + sort
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = [...returnRequests];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.id.toString().includes(term) ||
          r.userId.toString().includes(term) ||
          r.name.toLowerCase().includes(term) ||
          r.productName.toLowerCase().includes(term) ||
          r.reason.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(
        (r) => r.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      filtered = filtered.filter((r) => {
        const requestDate = new Date(r.date);
        const diffDays =
          (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dateFilter === "today") {
          return (
            requestDate.getDate() === now.getDate() &&
            requestDate.getMonth() === now.getMonth() &&
            requestDate.getFullYear() === now.getFullYear()
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
          case "userId":
            aValue = a.userId;
            bValue = b.userId;
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "productName":
            aValue = a.productName.toLowerCase();
            bValue = b.productName.toLowerCase();
            break;
          case "quantity":
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case "total":
            aValue = a.total;
            bValue = b.total;
            break;
          case "status":
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case "reason":
            aValue = a.reason.toLowerCase();
            bValue = b.reason.toLowerCase();
            break;
          case "date":
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
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
    returnRequests,
    searchTerm,
    statusFilter,
    dateFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRequests.length / itemsPerPage);
  const paginatedRequests = filteredAndSortedRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDateFilter("");
    setCurrentPage(1);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      // Using mock data for now - replace with API call when ready
      // await returnRequestsAPI.delete(deleteConfirm.id);
      setReturnRequests(
        returnRequests.filter((rr) => rr.id !== deleteConfirm.id)
      );
      alert("Return request deleted successfully!");
    } catch (error: unknown) {
      console.error("Error deleting return request:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Error deleting return request. Please try again.";
      alert(message);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleRefresh = () => {
    // Only reload data; keep all filters, search, sort and pagination as-is
    fetchReturnRequests();
  };

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const totalRequests = returnRequests.length;
    const pendingRequests = returnRequests.filter(
      (rr) => rr.status === "pending"
    ).length;
    const approvedRequests = returnRequests.filter(
      (rr) => rr.status === "approved"
    ).length;
    const rejectedRequests = returnRequests.filter(
      (rr) => rr.status === "rejected"
    ).length;
    const totalReturnValue = returnRequests.reduce(
      (sum, rr) => sum + rr.total,
      0
    );

    return [
      {
        title: "Total Requests",
        value: totalRequests.toLocaleString(),
        icon: Users,
        variant: "purple" as const,
      },
      {
        title: "Pending Requests",
        value: pendingRequests.toLocaleString(),
        icon: Package,
        variant: "yellow" as const,
      },
      {
        title: "Approved Requests",
        value: approvedRequests.toLocaleString(),
        icon: TrendingUp,
        variant: "green" as const,
      },
      {
        title: "Rejected Requests",
        value: rejectedRequests.toLocaleString(),
        icon: Package,
        variant: "red" as const,
      },
      {
        title: "Total Return Value",
        value: formatCurrency(totalReturnValue).replace(/\.00$/, ""),
        icon: Banknote,
        variant: "green" as const,
      },
    ];
  }, [returnRequests]);

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
            {request.id}
          </span>
        </div>
      ),
    },
    {
      key: "userId",
      label: "U.ID",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {request.userId}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-semibold">
            {request.name}
          </span>
        </div>
      ),
    },
    {
      key: "productName",
      label: "PRODUCT NAME",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="text-center">
          <span
            className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate block"
            title={request.productName}
          >
            {request.productName}
          </span>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "QUANTITY",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {request.quantity}
          </span>
        </div>
      ),
    },
    {
      key: "total",
      label: "TOTAL (₹)",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="flex items-center justify-center gap-1.5">
          <IndianRupee size={12} className="text-gray-400 dark:text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {formatCurrency(request.total)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="text-center">
          <Badge status={request.status} size="sm" />
        </div>
      ),
    },
    {
      key: "reason",
      label: "REASON",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="text-center">
          <span
            className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 max-w-xs truncate block"
            title={request.reason}
          >
            {request.reason}
          </span>
        </div>
      ),
    },
    {
      key: "date",
      label: "DATE",
      sortable: true,
      render: (request: ReturnRequest) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {formatDate(request.date)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (request: ReturnRequest) => (
        <div className="flex items-center justify-center gap-2">
          <ViewIconButton
            onClick={() => navigate(`/return-requests/view/${request.id}`)}
            size={14}
            tooltip="View"
          />
          <EditIconButton
            onClick={() => navigate(`/return-requests/edit/${request.id}`)}
            size={14}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() => handleDeleteClick(request.id)}
            size={14}
            tooltip="Delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Return Requests
        </h1>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 overflow-hidden">
        {kpiData.map((kpi, index) => (
          <div key={index} className="min-w-0 overflow-hidden">
            <StatCard
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              variant={kpi.variant}
              size="md"
              valueSize="2xl"
            />
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-700 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Status Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Status" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "completed", label: "Completed" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* From & to Date Filter */}
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
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-400 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search + Refresh */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-shrink-0">
          <div className="w-full sm:w-auto lg:min-w-[200px]">
            <SearchInput
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <Button
            onClick={fetchReturnRequests}
            disabled={loading}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={`sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedRequests}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(request) => request.id.toString()}
            emptyMessage="No return requests found"
            loading={loading}
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedRequests.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</span>
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
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing results{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {filteredAndSortedRequests.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedRequests.length}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Return Request"
        message="Are you sure you want to delete this return request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageReturnRequests;
