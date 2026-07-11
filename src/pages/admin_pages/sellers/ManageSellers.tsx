import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Banknote,
  User,
  Filter,
  RotateCcw,
  ChevronDown,
  Plus,
} from "lucide-react";
import {
  StatCard,
  SearchInput,
  SelectInput,
  DataTable,
  Pagination,
  Badge,
  ConfirmModal,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatCurrency } from "../../../utils/formatters";
// import {
//   useGetAllVendorList,
//   useDeleteVendor,
//   useUpdateVendorStatus,
// } from "../../../hooks/vendor";
// import { useGetAllCategoryList } from "../../../hooks/category";

// Interface for API response
interface ApiVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isOnline?: boolean;
  store?: {
    id?: string;
    name: string;
    categoryIds?: number[];
    commission?: number;
    logoUrl?: string;
    status?: string;
    [key: string]: any;
  };
  address?: {
    city: string;
    state: string;
    line1?: string;
    [key: string]: any;
  };
  status?: string;
  createdAt?: string;
  settings?: {
    requireProductApproval?: boolean;
    selfPickupMode?: boolean;
    [key: string]: any;
  };
  balance?: number;
  [key: string]: any;
}

interface ApiStats {
  total: number;
  active: number;
  inactive: number;
  pending?: number;
}

// interface ApiPagination {
//   page: number;
//   limit: number;
//   total: number;
//   totalPages: number;
//   hasNext: boolean;
//   hasPrev: boolean;
// }

// interface ApiResponse {
//   status: boolean;
//   response: string;
//   data: ApiVendor[]; // API returns array directly, not wrapped in object
//   pagination: ApiPagination;
// }

// Table vendor type for internal use
interface TableVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  storeName: string;
  city: string;
  state: string;
  status: string;
  isActive: boolean;
  commission: number;
  balance?: number;
  logo?: string;
  categoryIds?: number[];
  categoryName?: string; // Category name for display
  createdAt?: string;
  availability?: string;
}

// Mock data for vendors
const mockVendors: ApiVendor[] = [
  {
    id: "1",
    name: "Agent 1",
    email: "123@gmail.com",
    phone: "9087636388",
    isActive: false,
    isOnline: false,
    store: {
      id: "store1",
      name: "Company 1",
      categoryIds: [1],
      commission: 10,
      logoUrl: "https://i.pravatar.cc/150?img=1",
      status: "pending",
    },
    address: {
      city: "Mumbai",
      state: "Maharashtra",
      line1: "123 Main Street",
    },
    status: "pending",
    createdAt: "2024-01-15T10:30:00Z",
    balance: 5000,
  },
  {
    id: "2",
    name: "Agent 2",
    email: "123456@gmail.com",
    phone: "9087636388",
    isActive: false,
    isOnline: true,
    store: {
      id: "store2",
      name: "Company 1",
      categoryIds: [1],
      commission: 12,
      logoUrl: "https://i.pravatar.cc/150?img=2",
      status: "approved",
    },
    address: {
      city: "Delhi",
      state: "Delhi",
      line1: "456 Park Avenue",
    },
    status: "approved",
    createdAt: "2024-01-16T11:20:00Z",
    balance: 3200,
  },
  {
    id: "3",
    name: "Rajesh Kumar",
    email: "rajesh@example.com",
    phone: "9876543210",
    isActive: true,
    isOnline: true,
    store: {
      id: "store3",
      name: "Fresh Grocery Store",
      categoryIds: [2],
      commission: 15,
      logoUrl: "https://i.pravatar.cc/150?img=3",
      status: "approved",
    },
    address: {
      city: "Bangalore",
      state: "Karnataka",
      line1: "789 Market Road",
    },
    status: "approved",
    createdAt: "2024-01-10T09:15:00Z",
    balance: 8900,
  },
  {
    id: "4",
    name: "Priya Sharma",
    email: "priya@example.com",
    phone: "9876543211",
    isActive: true,
    isOnline: false,
    store: {
      id: "store4",
      name: "Organic Farm",
      categoryIds: [2, 3],
      commission: 18,
      logoUrl: "https://i.pravatar.cc/150?img=4",
      status: "approved",
    },
    address: {
      city: "Hyderabad",
      state: "Telangana",
      line1: "321 Garden Street",
    },
    status: "approved",
    createdAt: "2024-01-12T14:45:00Z",
    balance: 12000,
  },
  {
    id: "5",
    name: "Amit Patel",
    email: "amit@example.com",
    phone: "9876543212",
    isActive: false,
    isOnline: true,
    store: {
      id: "store5",
      name: "Dairy Delight",
      categoryIds: [3],
      commission: 20,
      logoUrl: "https://i.pravatar.cc/150?img=5",
      status: "pending",
    },
    address: {
      city: "Pune",
      state: "Maharashtra",
      line1: "654 Dairy Lane",
    },
    status: "pending",
    createdAt: "2024-01-18T16:30:00Z",
    balance: 7500,
  },
  {
    id: "6",
    name: "Sneha Reddy",
    email: "sneha@example.com",
    phone: "9876543213",
    isActive: true,
    isOnline: true,
    store: {
      id: "store6",
      name: "Grain Mart",
      categoryIds: [1, 3],
      commission: 14,
      logoUrl: "https://i.pravatar.cc/150?img=6",
      status: "approved",
    },
    address: {
      city: "Chennai",
      state: "Tamil Nadu",
      line1: "987 Grain Street",
    },
    status: "approved",
    createdAt: "2024-01-14T12:00:00Z",
    balance: 15600,
  },
  {
    id: "7",
    name: "Vikram Singh",
    email: "vikram@example.com",
    phone: "9876543214",
    isActive: true,
    isOnline: false,
    store: {
      id: "store7",
      name: "Spice World",
      categoryIds: [4],
      commission: 16,
      logoUrl: "https://i.pravatar.cc/150?img=7",
      status: "approved",
    },
    address: {
      city: "Jaipur",
      state: "Rajasthan",
      line1: "147 Spice Road",
    },
    status: "approved",
    createdAt: "2024-01-11T08:20:00Z",
    balance: 9800,
  },
  {
    id: "8",
    name: "Anjali Mehta",
    email: "anjali@example.com",
    phone: "9876543215",
    isActive: false,
    isOnline: true,
    store: {
      id: "store8",
      name: "Bakery Corner",
      categoryIds: [2],
      commission: 22,
      logoUrl: "https://i.pravatar.cc/150?img=8",
      status: "rejected",
    },
    address: {
      city: "Ahmedabad",
      state: "Gujarat",
      line1: "258 Bakery Street",
    },
    status: "rejected",
    createdAt: "2024-01-19T10:10:00Z",
    balance: 4200,
  },
];

// Mock categories
const mockCategories = [
  { id: 1, name: "Category 1" },
  { id: 2, name: "Category 2" },
  { id: 3, name: "Category 3" },
  { id: 4, name: "Category 4" },
];

const ManageSellers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  // Mock data state
  const [vendors, setVendors] = useState<ApiVendor[]>(mockVendors);
  const [isLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Use mock categories
  const categories = mockCategories;

  // Calculate stats from vendors array
  const stats: ApiStats = useMemo(() => {
    if (!vendors || vendors.length === 0) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
      };
    }

    const active = vendors.filter((v) => v.isActive === true).length;
    const inactive = vendors.filter((v) => v.isActive === false).length;
    const pending = vendors.filter(
      (v) =>
        v.store?.status === "pending" ||
        v.store?.status === "PENDING" ||
        v.status === "pending" ||
        v.status === "PENDING"
    ).length;

    return {
      total: vendors.length,
      active,
      inactive,
      pending,
    };
  }, [vendors]);

  // Transform API vendors to table format
  const tableVendors: TableVendor[] = useMemo(() => {
    return vendors.map((vendor: ApiVendor) => {
      // Get first category name if available
      const categoryIds = vendor.store?.categoryIds || [];
      let categoryName = "";
      if (categoryIds.length > 0 && categories.length > 0) {
        const firstCategory = categories.find(
          (cat: any) =>
            cat.id === categoryIds[0]?.toString() || cat.id === categoryIds[0]
        );
        categoryName =
          firstCategory?.name || `Category ${categoryIds[0]}` || "";
      }

      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone || "",
        storeName: vendor.store?.name || "",
        city: vendor.address?.city || "",
        state: vendor.address?.state || "",
        status: vendor.store?.status || vendor.status || "pending",
        isActive: vendor.isActive,
        commission: vendor.store?.commission || 0,
        balance: vendor.balance,
        logo: vendor.store?.logoUrl,
        categoryIds: categoryIds,
        categoryName: categoryName,
        createdAt: vendor.createdAt,
        availability: vendor.isOnline ? "available" : "unavailable",
      };
    });
  }, [vendors, categories]);

  // Calculate KPI metrics
  // Use stats from API
  const totalVendors = stats.total;
  const activeVendors = stats.active;
  const inactiveVendors = stats.inactive;
  const totalBalance = tableVendors.reduce(
    (sum, v) => sum + (v.balance || 0),
    0
  );

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const categoryNames = tableVendors
      .map((v) => v.categoryName)
      .filter(Boolean) as string[];
    return Array.from(new Set(categoryNames)).sort();
  }, [tableVendors]);

  // Filter and sort vendors
  const filteredAndSortedVendors = useMemo(() => {
    let filtered = [...tableVendors];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.id.toString().includes(searchTerm) ||
          v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.phone.includes(searchTerm) ||
          v.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(
        (v) => v.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter((v) => v.categoryName === categoryFilter);
    }

    // Date filter (simplified - you can enhance this)
    if (dateFilter) {
      // Add date filtering logic if needed
    }

    // Sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
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
          case "email":
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case "storeName":
            aValue = a.storeName.toLowerCase();
            bValue = b.storeName.toLowerCase();
            break;
          case "categoryName":
            aValue = (a.categoryName || "").toLowerCase();
            bValue = (b.categoryName || "").toLowerCase();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "availability":
            aValue = a.availability || "";
            bValue = b.availability || "";
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
    tableVendors,
    searchTerm,
    statusFilter,
    categoryFilter,
    dateFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination (client-side like categories)
  const totalPages = Math.ceil(filteredAndSortedVendors.length / itemsPerPage);
  const paginatedVendors = filteredAndSortedVendors.slice(
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
    setDateFilter("");
    setStatusFilter("");
    setCategoryFilter("");
    setCurrentPage(1);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    // Mock delete - remove vendor from state
    setVendors((prev) => prev.filter((v) => v.id !== deleteConfirm.id));
    setDeleteConfirm({ isOpen: false, id: null });
  };

  // Handle status toggle
  const handleStatusToggle = (vendorId: string, currentStatus: boolean) => {
    setIsUpdatingStatus(true);
    // Mock status update
    setTimeout(() => {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendorId ? { ...v, isActive: !currentStatus } : v
        )
      );
      setIsUpdatingStatus(false);
    }, 300);
  };

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {vendor.id}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "USER NAME",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            {vendor.logo ? (
              <img
                src={vendor.logo}
                alt={vendor.name}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  (
                    e.target as HTMLImageElement
                  ).src = `https://i.pravatar.cc/150?img=${vendor.id}`;
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={14} className="text-gray-500" />
              </div>
            )}
            <div className="flex flex-col items-start">
              <span className="text-xs sm:text-sm font-semibold text-gray-800">
                {vendor.name}
              </span>
              {vendor.phone && (
                <span className="text-[10px] text-green-600 dark:text-green-400">
                  {vendor.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "EMAIL ID",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 break-words">
            {vendor.email}
          </span>
        </div>
      ),
    },
    {
      key: "storeName",
      label: "STORE NAME",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 break-words">
            {vendor.storeName || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "categoryName",
      label: "CATEGORY",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {vendor.categoryName || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (vendor: TableVendor) => {
        const isActive = vendor.isActive;
        return (
          <div className="text-center flex items-center justify-center">
            <button
              onClick={() => handleStatusToggle(vendor.id, isActive)}
              disabled={isUpdatingStatus}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                ${
                  isActive
                    ? "bg-gray-400 dark:bg-gray-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }
                ${
                  isUpdatingStatus
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }
              `}
              title={isActive ? "Click to deactivate" : "Click to activate"}
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
    {
      key: "availability",
      label: "AVAILABILITY",
      sortable: true,
      render: (vendor: TableVendor) => {
        const availability = vendor.availability;
        const isAvailable =
          availability === "available" || availability === "Available";
        return (
          <div className="text-center">
            <Badge
              status={isAvailable ? "Yes" : "No"}
              size="sm"
              customColor={
                isAvailable
                  ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
              }
              className="rounded"
            />
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => navigate(`/vendors/view/${vendor.id}`)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(vendor.id)}
              size={12}
              tooltip="Delete"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Vendors
        </h1>
        <PrimaryButton
          onClick={() => navigate("/vendors/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Vendor</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Vendors"
          value={totalVendors.toLocaleString()}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Active Vendors"
          value={activeVendors.toLocaleString()}
          icon={Users}
          variant="green"
        />
        <StatCard
          title="Inactive Vendors"
          value={inactiveVendors.toLocaleString()}
          icon={Users}
          variant="yellow"
        />
        <StatCard
          title="Total Balance"
          value={formatCurrency(totalBalance)}
          icon={Banknote}
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

          {/* Date Dropdown */}
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
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Category" },
                  ...uniqueCategories.map((category) => ({
                    value: category,
                    label: category,
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
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 w-full sm:w-auto justify-center sm:justify-start"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search - Beside filters */}
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
        {!isLoading && (
          <div className="overflow-x-auto">
            <DataTable
              data={paginatedVendors}
              columns={columns}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              keyExtractor={(vendor) => vendor.id}
              emptyMessage="No vendors found"
            />
          </div>
        )}

        {/* Pagination */}
        {filteredAndSortedVendors.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSortedVendors.length
                  )}{" "}
                  of {filteredAndSortedVendors.length}
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  pagination={{
                    page: currentPage,
                    limit: itemsPerPage,
                    total: filteredAndSortedVendors.length,
                    totalPages: totalPages,
                    hasNext: currentPage < totalPages,
                    hasPrev: currentPage > 1,
                  }}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-600">
              Loading vendors...
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageSellers;
