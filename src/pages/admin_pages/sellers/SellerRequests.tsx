import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Users,
  Package,
  TrendingUp,
  Filter,
  RotateCcw,
  User,
  Store,
  MapPin,
  Image as ImageIcon,
  Calendar,
  Percent,
  ChevronDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  StatCard,
  SearchInput,
  SelectInput,
  PrimaryButton,
  ViewIconButton,
  DataTable,
  Pagination,
  Badge,
  ConfirmModal,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatDate } from "../../../utils/formatters";
import { useGetAllVendorList, useApproveVendor, useRejectVendor } from "../../../hooks/vendor";

// Define the API response type
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
  pending: number;
  approved: number;
  rejected: number;
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
    stats?: ApiStats;
    vendors?: ApiVendor[];
  };
  pagination?: ApiPagination;
}

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
  commission: number;
  logo?: string;
  createdAt?: string;
}

const SellerRequests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [approveConfirm, setApproveConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [rejectConfirm, setRejectConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  const { data, isLoading, refetch } = useGetAllVendorList(currentPage, itemsPerPage);
  const { mutate: approveMutate } = useApproveVendor();
  const { mutate: rejectMutate } = useRejectVendor();

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    const onFocus = () => {
      if (refetch) refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location, refetch]);

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;

  // Handle both possible API response structures
  const apiVendors: ApiVendor[] = Array.isArray(apiData?.data)
    ? apiData.data
    : apiData?.data?.vendors || [];
  
  const stats: ApiStats = Array.isArray(apiData?.data)
    ? { total: 0, pending: 0, approved: 0, rejected: 0 }
    : apiData?.data?.stats || {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };
  
  const pagination: ApiPagination = apiData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  // Transform API vendors to table format
  const vendors: TableVendor[] = useMemo(() => {
    return apiVendors.map((v) => ({
      id: v.id,
      name: v.name,
      email: v.email || '',
      phone: v.phone || '',
      storeName: v.store?.name || 'N/A',
      city: v.address?.city || 'N/A',
      state: v.address?.state || 'N/A',
      status: v.store?.status || (v.isActive ? 'approved' : 'pending'),
      commission: v.store?.commission || 0,
      logo: v.store?.logoUrl,
      createdAt: v.createdAt,
    }));
  }, [apiVendors]);

  // Calculate KPI metrics
  const totalRequests = stats.total || vendors.length;
  const pendingRequests = stats.pending || vendors.filter((v) => v.status === "pending").length;
  const approvedRequests = stats.approved || vendors.filter((v) => v.status === "approved").length;
  const rejectedRequests = stats.rejected || vendors.filter((v) => v.status === "rejected").length;

  // Get unique cities for filter
  const cities = useMemo(() => {
    const uniqueCities = Array.from(new Set(vendors.map((v) => v.city).filter(Boolean)));
    return uniqueCities.sort();
  }, [vendors]);

  // Filter and sort vendors
  const filteredAndSortedVendors = useMemo(() => {
    let filtered = vendors;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.id.toString().includes(searchTerm) ||
          v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.phone.includes(searchTerm) ||
          v.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter((v) => v.city === cityFilter);
    }

    // Date filter (simplified - you can enhance this)
    if (dateFilter) {
      // Add date filtering logic if needed
    }

    // Sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
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
          case "storeName":
            aValue = a.storeName.toLowerCase();
            bValue = b.storeName.toLowerCase();
            break;
          case "email":
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case "city":
            aValue = a.city.toLowerCase();
            bValue = b.city.toLowerCase();
            break;
          case "commission":
            aValue = a.commission;
            bValue = b.commission;
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "date":
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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
    vendors,
    searchTerm,
    statusFilter,
    cityFilter,
    dateFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
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
    setCityFilter("");
    setCurrentPage(1);
  };

  const handleApproveClick = (id: string) => {
    setApproveConfirm({ isOpen: true, id });
  };

  const handleApproveConfirm = () => {
    if (approveConfirm.id === null) return;
    approveMutate(approveConfirm.id);
    setApproveConfirm({ isOpen: false, id: null });
  };

  const handleRejectClick = (id: string) => {
    setRejectConfirm({ isOpen: true, id });
  };

  const handleRejectConfirm = () => {
    if (rejectConfirm.id === null) return;
    rejectMutate(rejectConfirm.id);
    setRejectConfirm({ isOpen: false, id: null });
  };

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">{vendor.id.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      key: "name",
      label: "VENDOR INFO",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-center gap-1.5">
              <User size={12} className="text-gray-400" />
              <span className="text-xs sm:text-sm font-semibold text-gray-800">
                {vendor.name}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-500">
              {vendor.phone}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "EMAIL",
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
      label: "STORE INFO",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-center gap-1.5">
              <Store size={12} className="text-gray-400" />
              <span className="text-xs sm:text-sm font-semibold text-gray-800">
                {vendor.storeName}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "city",
      label: "CITY",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <MapPin size={12} className="text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-800">
              {vendor.city}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "logo",
      label: "LOGO",
      sortable: false,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          {vendor.logo ? (
            <img
              src={vendor.logo}
              alt={vendor.storeName}
              className="w-10 h-10 object-cover rounded mx-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = 
                  '<div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mx-auto"><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mx-auto">
              <ImageIcon size={14} className="text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "commission",
      label: "COMMISSION (%)",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Percent size={12} className="text-gray-400" />
            <span className="text-xs sm:text-sm font-medium text-gray-800">
              {vendor.commission}%
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "DATE",
      sortable: true,
      render: (vendor: TableVendor) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Calendar size={12} className="text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-800 whitespace-nowrap">
              {vendor.createdAt ? formatDate(vendor.createdAt, "DD-MM-YYYY, HH:mm A") : 'N/A'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (vendor: TableVendor) => {
        const statusColorMap: Record<string, string> = {
          pending: "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400",
          approved: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400",
          rejected: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400",
        };
        return (
          <div className="text-center">
            <Badge
              status={vendor.status}
              size="sm"
              customColor={
                statusColorMap[vendor.status] || "bg-gray-100 text-gray-800"
              }
              className="rounded font-semibold"
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
        <div className="text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => navigate(`/vendors/view/${vendor.id}`)}
              size={12}
              tooltip="View"
            />
            <button
              onClick={() => handleApproveClick(vendor.id)}
              className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
              title="Approve"
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              onClick={() => handleRejectClick(vendor.id)}
              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Reject"
            >
              <XCircle size={14} />
            </button>
          </div>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">
            Loading vendor requests...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          New Registered Vendors
        </h1>
        <PrimaryButton
          onClick={() => navigate("/vendors/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Create Vendor</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests.toLocaleString()}
          icon={Package}
          variant="yellow"
        />
        <StatCard
          title="Approved Requests"
          value={approvedRequests.toLocaleString()}
          icon={TrendingUp}
          variant="green"
        />
        <StatCard
          title="Rejected Requests"
          value={rejectedRequests.toLocaleString()}
          icon={Package}
          variant="red"
        />
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-2xl overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* Date Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-[100px] sm:min-w-[120px] relative">
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
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-[100px] sm:min-w-[120px] relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Status" },
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

          {/* City Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-[100px] sm:min-w-[120px] relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                options={[
                  { value: "", label: "City" },
                  ...cities.map((city) => ({ value: city, label: city })),
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
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-500" />
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
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedVendors}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(vendor) => vendor.id.toString()}
            emptyMessage="No vendors found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedVendors.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-14 [&_select]:sm:w-16 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
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
                    className="w-14 sm:w-16 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {((currentPage - 1) * itemsPerPage + 1).toLocaleString()}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSortedVendors.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  pagination={pagination}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={approveConfirm.isOpen}
        onClose={() => setApproveConfirm({ isOpen: false, id: null })}
        onConfirm={handleApproveConfirm}
        title="Approve Vendor"
        message="Are you sure you want to approve this vendor?"
        confirmText="Approve"
        cancelText="Cancel"
        variant="info"
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={rejectConfirm.isOpen}
        onClose={() => setRejectConfirm({ isOpen: false, id: null })}
        onConfirm={handleRejectConfirm}
        title="Reject Vendor"
        message="Are you sure you want to reject this vendor? This action cannot be undone."
        confirmText="Reject"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default SellerRequests;
