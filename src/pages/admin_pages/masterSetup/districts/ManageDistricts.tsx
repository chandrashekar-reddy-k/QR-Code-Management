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
import {
  useDeleteDistrict,
  useGetAllDistrictList,
} from "../../../../hooks/district";

// Define the API response type
interface ApiDistrict {
  id: string;
  districtName: string;
  state: string;
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
    districts: ApiDistrict[];
  };
  pagination: ApiPagination;
}

// Table district type for internal use
interface TableDistrict {
  id: string;
  name: string;
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

type SortField = "id" | "name" | "stateName" | "status" | null;
type SortDirection = "asc" | "desc" | null;

const ManageDistricts = () => {
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

  const { data, isLoading, refetch } = useGetAllDistrictList(
    currentPage,
    itemsPerPage
  );
  const { mutate } = useDeleteDistrict();

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

  const districts: ApiDistrict[] = useMemo(
    () => apiData?.data?.districts || [],
    [apiData?.data?.districts]
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

  // Transform API districts to table format
  const tableDistricts: TableDistrict[] = useMemo(() => {
    return districts.map((district) => {
      // Normalize status: API returns "ACTIVE"/"INACTIVE" (uppercase), convert to lowercase
      const normalizedStatus =
        district.status?.toUpperCase() === "ACTIVE" ? "active" : "inactive";

      return {
        id: district.id || "",
        name: district.districtName || "",
        stateName: district.state || "",
        status: normalizedStatus as "active" | "inactive",
      };
    });
  }, [districts]);

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

  // Filter and sort districts
  const filteredAndSortedDistricts: TableDistrict[] = useMemo(() => {
    let filtered = tableDistricts.filter((district) => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        district.name.toLowerCase().includes(searchLower) ||
        district.stateName.toLowerCase().includes(searchLower) ||
        district.id.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableDistrict, b: TableDistrict) => {
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
  }, [tableDistricts, searchTerm, sortField, sortDirection]);

  // Pagination
  const paginatedDistricts = filteredAndSortedDistricts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export districts to CSV
  const handleExport = () => {
    const headers = ["ID", "District Name", "State", "Status"];
    const rows = districts.map((d: ApiDistrict) => [
      d.id,
      d.districtName || "",
      d.state || "",
      d.status?.toLowerCase() || "inactive",
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
      `districts_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import districts from CSV
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
            console.error("Error importing districts:", error);
            alert("Error importing districts. Please check the file format.");
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
      console.error("Error deleting district:", error);
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
  const totalDistricts = stats.total;
  const activeDistricts = stats.active;
  const inactiveDistricts = stats.inactive;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">
            Loading districts...
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
      render: (district: TableDistrict) => {
        const { display, full } = formatLongText(district.id, 8);
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
      label: "DISTRICT NAME",
      sortable: true,
      render: (district: TableDistrict) => {
        const { display, full } = formatLongText(district.name, 20);
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
      key: "stateName",
      label: "STATE",
      sortable: true,
      render: (district: TableDistrict) => {
        const { display, full } = formatLongText(district.stateName, 20);
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
      render: (district: TableDistrict) => (
        <div className="text-center">
          <Badge
            status={district.status}
            size="sm"
            customColor={
              district.status === "active"
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
      render: (district: TableDistrict) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() =>
                navigate(`/master-setup/districts/view/${district.id}`)
              }
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() =>
                navigate(`/master-setup/districts/edit/${district.id}`)
              }
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(district.id)}
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
          Manage Districts
        </h1>
        <PrimaryButton
          onClick={() => navigate("/master-setup/districts/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add District</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Districts"
          value={totalDistricts.toLocaleString()}
          icon={MapPin}
          variant="blue"
        />
        <StatCard
          title="Active Districts"
          value={activeDistricts.toLocaleString()}
          icon={MapPin}
          variant="green"
        />
        <StatCard
          title="Inactive Districts"
          value={inactiveDistricts.toLocaleString()}
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
            placeholder="Search districts..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Districts Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedDistricts}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(district) => district.id}
            emptyMessage="No districts found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedDistricts.length > 0 && (
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
                      filteredAndSortedDistricts.length
                    ).toLocaleString()}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSortedDistricts.length.toLocaleString()}
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
        title="Delete District"
        message="Are you sure you want to delete this district? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageDistricts;
