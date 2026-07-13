import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Users,
  Package,
  TrendingUp,
  Filter,
  RotateCcw,
  ChevronDown,
  FileText,
  Percent,
  Calendar,
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
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatDate } from "../../../utils/formatters";
import { useGetDeliveryBoyRequests } from "../../../hooks/deliveryBoy";
import { getPartnerWarehouseId } from "../../../utils/partnerWarehouse";
import { extractAgentsFromGetAllResponse } from "../../../utils/deliveryAgentsGetAll";

// Define the API response type
interface ApiDeliveryAgent {
  id: string | number;
  name: string;
  phone: string;
  email: string;
  city: string;
  status: "New" | "Pending" | "Accepted" | "Rejected";
  date: string;
  avatar?: string;
  bonus?: number;
  documents?: string[];
  dateOfBirth?: string;
}

interface ApiStats {
  total: number;
  pending: number;
  accepted: number;
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

const DeliveryBoyRequests = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const warehouseId = useMemo(
    () => getPartnerWarehouseId(),
    [location.key, location.pathname]
  );

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

  const { data, isLoading, isFetching, refetch, error } = useGetDeliveryBoyRequests(
    currentPage,
    itemsPerPage
  );

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    // Optionally, add tab focus as well:
    const onFocus = () => {
      if (refetch) refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location, refetch]);

  const agents: ApiDeliveryAgent[] = useMemo(() => {
    const rows = extractAgentsFromGetAllResponse(data);
    return rows.map((r) => {
      const addr = r.address as { city?: string } | null | undefined;
      const idRaw = r.id;
      const idVal: string | number =
        typeof idRaw === "number"
          ? idRaw
          : typeof idRaw === "string" && /^\d+$/.test(idRaw)
            ? parseInt(idRaw, 10)
            : String(idRaw ?? "");

      let status: ApiDeliveryAgent["status"] = "New";
      if (r.isActive === true) status = "Accepted";
      else if (Array.isArray(r.documents) && r.documents.length > 0)
        status = "Pending";

      return {
        id: idVal,
        name: String(r.name ?? ""),
        phone: String(r.phone ?? r.mobile ?? ""),
        email: String(r.email ?? ""),
        city: String(addr?.city ?? r.city ?? ""),
        status,
        date: String(r.createdAt ?? ""),
        avatar: undefined,
        bonus: undefined,
        documents: undefined,
        dateOfBirth: r.dob ? String(r.dob) : undefined,
      };
    });
  }, [data]);

  const stats: ApiStats = useMemo(
    () => ({
      total: agents.length,
      pending: agents.filter(
        (a) => a.status === "Pending" || a.status === "New"
      ).length,
      accepted: agents.filter((a) => a.status === "Accepted").length,
      rejected: agents.filter((a) => a.status === "Rejected").length,
    }),
    [agents]
  );

  const totalRequests = stats.total;
  const pendingRequests = stats.pending;
  const acceptedRequests = stats.accepted;
  const rejectedRequests = stats.rejected;

  // Get unique cities for filter
  const cities = useMemo(() => {
    const uniqueCities = Array.from(
      new Set(agents.map((a) => a.city || "").filter(Boolean))
    );
    return uniqueCities.sort();
  }, [agents]);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = [...agents] as ApiDeliveryAgent[];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.id.toString().includes(searchTerm) ||
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.phone.includes(searchTerm) ||
          a.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter((a) => a.city === cityFilter);
    }

    // Date filter (simplified - you can enhance this)
    if (dateFilter) {
      // Add date filtering logic if needed
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a: ApiDeliveryAgent, b: ApiDeliveryAgent) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = String(a.id).toLowerCase();
            bValue = String(b.id).toLowerCase();
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "email":
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case "bonus":
            aValue = a.bonus || 0;
            bValue = b.bonus || 0;
            break;
          case "dateOfBirth":
            aValue = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : 0;
            bValue = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : 0;
            break;
          case "city":
            aValue = a.city.toLowerCase();
            bValue = b.city.toLowerCase();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
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
    agents,
    searchTerm,
    statusFilter,
    cityFilter,
    dateFilter,
    sortField,
    sortDirection,
  ]);

  const pagination: ApiPagination = useMemo(() => {
    const total = filteredAndSortedAgents.length;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage) || 1);
    const page = Math.min(currentPage, totalPages);
    return {
      page,
      limit: itemsPerPage,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }, [filteredAndSortedAgents.length, itemsPerPage, currentPage]);

  // Pagination
  const paginatedAgents = filteredAndSortedAgents.slice(
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

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {agent.id}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={
                  agent.avatar || `https://i.pravatar.cc/150?img=${agent.id}`
                }
                alt={agent.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to a default avatar if image fails to load
                  (
                    e.target as HTMLImageElement
                  ).src = `https://i.pravatar.cc/150?img=${agent.id}`;
                }}
              />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm text-gray-800 truncate">
                {agent.name}
              </div>
              <div className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-500 truncate">
                {agent.phone}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "EMAIL ID",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 break-words">
            {agent.email}
          </span>
        </div>
      ),
    },
    {
      key: "bonus",
      label: "BONUS(%)",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Percent size={12} className="text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-800">
              {agent.bonus || 0}%
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "documents",
      label: "DOCUMENTS",
      sortable: false,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <FileText size={12} className="text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-800">
              {agent.documents?.length || 0}{" "}
              {agent.documents?.length === 1 ? "doc" : "docs"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "dateOfBirth",
      label: "DATE OF BIRTH",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Calendar size={12} className="text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-800 whitespace-nowrap">
              {agent.dateOfBirth
                ? formatDate(agent.dateOfBirth, "DD-MM-YYYY")
                : "N/A"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "city",
      label: "CITY",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {agent.city}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => {
        const statusColorMap: Record<string, string> = {
          New: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400",
          Pending:
            "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400",
          Accepted:
            "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400",
          Rejected:
            "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400",
        };
        return (
          <div className="text-center">
            <Badge
              status={agent.status}
              size="sm"
              customColor={
                statusColorMap[agent.status] ||
                "bg-gray-100 text-gray-800"
              }
              className="rounded"
            />
          </div>
        );
      },
    },
    {
      key: "date",
      label: "DATE",
      sortable: true,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 whitespace-nowrap">
            {formatDate(agent.date, "DD-MM-YYYY, HH:mm A")}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (agent: ApiDeliveryAgent) => (
        <div className="text-center" onClick={(e) => e.stopPropagation()}>
          <ViewIconButton
            onClick={() => navigate(`/delivery-boys/view/${String(agent.id)}`)}
            size={12}
            tooltip="View"
          />
        </div>
      ),
    },
  ];

  if (!warehouseId) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-medium mb-2">Warehouse ID is required</p>
          <p className="text-xs">
            Log in again. We use your partner <code className="px-1 rounded bg-white/50">user.id</code> (or an
            explicit warehouse field if present) for delivery-agent requests.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || isFetching) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">
            Loading delivery agent requests...
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
          Delivery Agents
        </h1>
        <PrimaryButton
          onClick={() => navigate("/delivery-boys/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Agent</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {error != null && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {(error as { message?: string }).message ||
            "Failed to load delivery agents."}
        </div>
      )}

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
          title="Accepted"
          value={acceptedRequests.toLocaleString()}
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
                  { value: "New", label: "New" },
                  { value: "Pending", label: "Pending" },
                  { value: "Accepted", label: "Accepted" },
                  { value: "Rejected", label: "Rejected" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* City Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedAgents}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(agent) => agent.id.toString()}
            emptyMessage="No delivery agents found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedAgents.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
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
                    {filteredAndSortedAgents.length.toLocaleString()}
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
    </div>
  );
};

export default DeliveryBoyRequests;
