import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, MapPin, RefreshCw, Download, FileUp } from "lucide-react";
import {
  SearchInput,
  Button,
  ConfirmModal,
  StatCard,
  DataTable,
  Pagination,
  Badge,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  PrimaryButton,
  SelectInput,
} from "../../../../components/ui";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";
import { useDeleteArea, useGetAllAreaList } from "../../../../hooks/area";

// Define the API response type
interface ApiCity {
  id: string;
  district: string | null;
  cityName: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
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

interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    stats: ApiStats;
    cities: ApiCity[];
  };
  pagination: ApiPagination;
}

// Table area type for internal use
interface TableArea {
  id: string;
  name: string;
  districtId: string | number;
  districtName: string;
  stateName: string;
  status: "active" | "inactive";
}

// Helper function to format long text with tooltip
const formatLongText = (
  text: string | number | null | undefined,
  maxLength: number = 8
): { display: string; full: string } => {
  const str = text?.toString() || "";
  return {
    display: str.length > maxLength ? `${str.slice(0, maxLength)}...` : str,
    full: str,
  };
};

type SortField = "id" | "name" | "districtName" | "stateName" | "status" | null;
type SortDirection = "asc" | "desc" | null;

const ManageAreas = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  const { data, isLoading, refetch } = useGetAllAreaList(
    currentPage,
    itemsPerPage
  );
  const { mutate } = useDeleteArea();

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    // Optionally, add tab focus as well:
    const onFocus = () => {
      if (refetch) {
        refetch();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location, refetch]);

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;

  const cities: ApiCity[] = useMemo(
    () => apiData?.data?.cities || [],
    [apiData?.data?.cities]
  );
  const stats: ApiStats = useMemo(
    () => apiData?.data?.stats || { total: 0, active: 0, inactive: 0 },
    [apiData?.data?.stats]
  );
  const pagination: ApiPagination = useMemo(
    () =>
      apiData?.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    [apiData?.pagination]
  );

  // Transform API cities to table format
  const tableAreas: TableArea[] = useMemo(() => {
    return cities.map((city) => ({
      id: city.id || "",
      name: city.cityName || "",
      districtId: "", // Not available in API response
      districtName: city.district || "",
      stateName: "", // Not available in API response
      status: (city.status === "ACTIVE" ? "active" : "inactive") as
        | "active"
        | "inactive",
    }));
  }, [cities]);

  const handleSort = (field: string | null) => {
    const sortFieldTyped = field as SortField;
    if (sortField === sortFieldTyped) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(sortFieldTyped);
      setSortDirection("asc");
    }
  };

  // Filter and sort areas
  const filteredAndSortedAreas: TableArea[] = useMemo(() => {
    let filtered = tableAreas.filter((area) => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        area.name.toLowerCase().includes(searchLower) ||
        area.districtName.toLowerCase().includes(searchLower) ||
        area.stateName.toLowerCase().includes(searchLower) ||
        area.id.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableArea, b: TableArea) => {
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
          case "districtName":
            aValue = a.districtName.toLowerCase();
            bValue = b.districtName.toLowerCase();
            break;
          case "stateName":
            aValue = a.stateName.toLowerCase();
            bValue = b.stateName.toLowerCase();
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
  }, [tableAreas, searchTerm, sortField, sortDirection]);

  // Pagination
  const paginatedAreas = filteredAndSortedAreas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export areas to CSV
  const handleExport = () => {
    const headers = [
      "ID",
      "Name",
      "District ID",
      "District Name",
      "State Name",
      "Status",
    ];
    const rows = cities.map((city: ApiCity) => [
      city.id,
      city.cityName || "",
      "",
      city.district || "",
      "",
      city.status === "ACTIVE" ? "active" : "inactive",
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
      `areas_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import areas from CSV
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            alert("Import functionality needs to be connected to API");
          } catch (error) {
            console.error("Error importing areas:", error);
            alert("Error importing areas. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      mutate(deleteConfirm.id);
    } catch (error: unknown) {
      console.error("Error deleting area:", error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch();
    } else {
      window.location.reload();
    }
  };

  // Calculate KPI stats
  const totalAreas = stats.total;
  const activeAreas = stats.active;
  const inactiveAreas = stats.inactive;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">
            Loading areas/cities...
          </p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (area: TableArea) => {
        const { display, full } = formatLongText(area.id, 8);
        return (
          <div className="text-center">
            <span
              className="text-xs sm:text-sm text-gray-800"
              title={full}
            >
              {display}
            </span>
          </div>
        );
      },
    },
    {
      key: "name",
      label: "AREA/CITY NAME",
      sortable: true,
      render: (area: TableArea) => {
        const { display, full } = formatLongText(area.name, 20);
        return (
          <div className="text-center">
            <span
              className="text-xs sm:text-sm text-gray-800"
              title={full !== display ? full : undefined}
            >
              {display}
            </span>
          </div>
        );
      },
    },
    {
      key: "districtName",
      label: "DISTRICT",
      sortable: true,
      render: (area: TableArea) => {
        const { display, full } = formatLongText(area.districtName, 20);
        return (
          <div className="text-center">
            <span
              className="text-xs sm:text-sm text-gray-800"
              title={full !== display ? full : undefined}
            >
              {display || "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "stateName",
      label: "STATE",
      sortable: true,
      render: (area: TableArea) => {
        const { display, full } = formatLongText(area.stateName, 20);
        return (
          <div className="text-center">
            <span
              className="text-xs sm:text-sm text-gray-800"
              title={full !== display ? full : undefined}
            >
              {display || "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (area: TableArea) => (
        <div className="text-center">
          <Badge
            status={area.status}
            size="sm"
            customColor={
              area.status === "active"
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                : "bg-gray-100 text-gray-800"
            }
            className="rounded"
          />
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (area: TableArea) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => navigate(`/master-setup/areas/view/${area.id}`)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => navigate(`/master-setup/areas/edit/${area.id}`)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(area.id)}
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
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Manage Areas/Cities
        </h1>
        <PrimaryButton
          onClick={() => navigate("/master-setup/areas/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Area/City</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Areas/Cities"
          value={totalAreas.toLocaleString()}
          icon={MapPin}
          variant="blue"
        />
        <StatCard
          title="Active Areas/Cities"
          value={activeAreas.toLocaleString()}
          icon={MapPin}
          variant="green"
        />
        <StatCard
          title="Inactive Areas/Cities"
          value={inactiveAreas.toLocaleString()}
          icon={MapPin}
          variant="gray"
        />
      </div>

      {/* Action Buttons (Export, Import, Refresh) and Search Bar */}
      <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Export, Import, Refresh Buttons - Left */}
        <div className="flex items-center gap-2 flex-wrap">
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

        {/* Search Bar - Right */}
        <div className="w-full sm:w-auto sm:ml-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search areas/cities..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Areas Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedAreas}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(area) => area.id}
            emptyMessage="No areas/cities found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedAreas.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
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
                  to{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredAndSortedAreas.length
                    ).toLocaleString()}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSortedAreas.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  pagination={pagination}
                  onPageChange={setCurrentPage}
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
        title="Delete Area/City"
        message="Are you sure you want to delete this area/city? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageAreas;
