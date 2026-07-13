import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Filter, RotateCcw, ChevronDown } from "lucide-react";
import { useInventory } from "../../../hooks/useInventory";
import {
  DataTable,
  Pagination,
  Badge,
  SearchInput,
  SelectInput,
  ViewIconButton,
} from "../../../components/ui";
import { useGetAllInventoryAlerts } from "../../../hooks/InventoryManagement/inventoryAlerts";

/* ================= TYPES ================= */

interface ApiAlert {
  productId: string;
  productName: string;
  warehouse: {
    id: string;
    name: string;
  };
  stock: number;
  threshold: number;
  alertType: "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE_STOCK";
  updatedAt: string;
}

interface ApiResponse {
  status: boolean;
  response: string;
  data: ApiAlert[];
}

const Alerts = () => {
  const navigate = useNavigate();
  // const { alerts, setAlerts, snapshots, updateAlerts, locations } =
  //   useInventory();
    const { locations } = useInventory();
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // useEffect(() => {
  //   updateAlerts();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [snapshots]);

   /* ================= API ================= */

  const { data, isLoading } = useGetAllInventoryAlerts(
    currentPage,
    itemsPerPage
  );

  const apiData = data as ApiResponse | undefined;
  const alerts = apiData?.data ?? [];


  const statusOptions = [
    { value: "All", label: "All" },
    { value: "Open", label: "Open" },
    { value: "Acknowledged", label: "Acknowledged" },
    { value: "Closed", label: "Closed" },
  ];

  const typeOptions = [
    { value: "All", label: "All Types" },
    { value: "LOW_STOCK", label: "Low Stock" },
    { value: "OUT_OF_STOCK", label: "Out of Stock" },
    { value: "NEGATIVE_STOCK", label: "Negative Stock" },
  ];

  const handleResetFilters = () => {
    setStatusFilter("All");
    setLocationFilter("All");
    setTypeFilter("All");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    // Ensure alerts is always an array
    if (!Array.isArray(alerts)) {
      return [];
    }

    let filtered = alerts;

    // Status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // Location filter
    if (locationFilter !== "All") {
      filtered = filtered.filter((a) => a.locationCode === locationFilter);
    }

    // Type filter
    if (typeFilter !== "All") {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.id.toLowerCase().includes(term) ||
          a.sku.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term) ||
          a.locationCode.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case "id":
            aValue = a.id.toLowerCase();
            bValue = b.id.toLowerCase();
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "sku":
            aValue = a.sku.toLowerCase();
            bValue = b.sku.toLowerCase();
            break;
          case "locationCode":
            aValue = a.locationCode.toLowerCase();
            bValue = b.locationCode.toLowerCase();
            break;
          case "description":
            aValue = a.description.toLowerCase();
            bValue = b.description.toLowerCase();
            break;
          case "status":
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case "createdAt":
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
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
    alerts,
    statusFilter,
    locationFilter,
    typeFilter,
    searchTerm,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedAlerts = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const displayHours = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${day}-${month}-${year}, ${displayHours}:${minutes} ${ampm}`;
  };

  const handleAcknowledge = (id: string) => {
    if (!Array.isArray(alerts)) {
      return;
    }
    setAlerts(
      alerts.map((a) =>
        a.id === id ? { ...a, status: "Acknowledged" as const } : a
      )
    );
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return "Low Stock";
      case "OUT_OF_STOCK":
        return "Out of Stock";
      case "NEGATIVE_STOCK":
        return "Negative Stock";
      default:
        return type;
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300";
      case "OUT_OF_STOCK":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
      case "NEGATIVE_STOCK":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
      case "Acknowledged":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      case "Closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  
  /* ================= LOADING ================= */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading Alerts...</p>
      </div>
    );
  }
  return (
    <>
      {/* Filters and Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-700 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={statusOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Type Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={typeOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Location Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "All", label: "All Locations" },
                  ...locations.map((loc) => ({
                    value: loc.code,
                    label: loc.name,
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
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-400 w-full sm:w-auto justify-center sm:justify-start"
            >
              <RotateCcw
                size={14}
                className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400"
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <DataTable
          data={filteredAndSorted}
          columns={[
            {
              key: "alterID",
              label: "ALERT ID",
              sortable: true,
              render: (alert: ApiAlert) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">
                    {alert.productName}
                  </span>
                </div>
              ),
            },
                {
              key: "warehouse",
              label: "WAREHOUSE",
              sortable: false,
              render: (a: ApiAlert) => a.warehouse.name,
            },
            {
              key: "alertType",
              label: "ALERT TYPE",
              sortable: true,
              render: (alert: ApiAlert) => (
                <div className="text-center">
                  <Badge
                    status={getAlertTypeLabel(alert.alertType)}
                    size="sm"
                    customColor={getAlertTypeColor(alert.alertType)}
                    className="rounded"
                  />
                </div>
              ),
            },
            {
              key: "sku",
              label: "SKU",
              sortable: true,
              render: (alert: ApiAlert) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">
                    {alert.stock}
                  </span>
                </div>
              ),
            },
            {
              key: "locationCode",
              label: "LOCATION",
              sortable: true,
              render: (alert: ApiAlert) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">
                    {alert.locationCode}
                  </span>
                </div>
              ),
            },
            {
              key: "description",
              label: "DESCRIPTION",
              sortable: true,
              render: (alert: ApiAlert) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">
                    {alert.description}
                  </span>
                </div>
              ),
            },
      {
  key: "createdAt",
  label: "CREATED AT",
  sortable: true,
  render: (alert: ApiAlert) => (
    <div className="text-center">
      <span className="text-xs sm:text-sm text-gray-800">
        {alert.updatedAt ? formatDate(alert.updatedAt) : "--"}
      </span>
    </div>
  ),
},

            {
              key: "status",
              label: "STATUS",
              sortable: true,
              render: (alert: ApiAlert) => (
                <div className="text-center">
                  <Badge
                    status={alert.status === "Open" ? "active" : "inactive"}
                    size="sm"
                    customColor={getStatusColor(alert.status)}
                    className="rounded"
                  >
                    {alert.status}
                  </Badge>
                </div>
              ),
            },
            {
              key: "actions",
              label: "ACTIONS",
              sortable: false,
              render: (alert: ApiAlert) => (
                <div className="flex items-center justify-center gap-1.5">
                  <ViewIconButton
                    onClick={() =>
                      navigate(`/inventory/sku/${alert.variantId}`)
                    }
                    size={12}
                  />
                  {alert.status === "Open" && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                      title="Acknowledge"
                    >
                      <CheckCircle size={12} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          keyExtractor={(alert) => alert.id}
          emptyMessage="No alerts found"
        />

        {/* Pagination */}
        {filteredAndSorted.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-400 [&_select]:font-medium">
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
                  Showing results{" "}
                  <strong className="text-gray-900">
                    {Math.min(
                      (currentPage - 1) * itemsPerPage + 1,
                      filteredAndSorted.length
                    )}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-gray-900">
                    {filteredAndSorted.length}
                  </strong>
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Alerts;
