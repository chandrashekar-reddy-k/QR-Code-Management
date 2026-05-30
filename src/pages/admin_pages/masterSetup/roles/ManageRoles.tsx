import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Shield, RefreshCw, Download } from "lucide-react";
import {
  SearchInput,
  ConfirmModal,
  StatCard,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  DataTable,
  Pagination,
  Badge,
  PrimaryButton,
  Button,
  SelectInput,
} from "../../../../components/ui";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";
import { useDeleteRole, useGetAllRoleList } from "../../../../hooks/role";

// Define the API response type
interface ApiRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  status: "ACTIVE" | "INACTIVE";
  isActive?: boolean;
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
    roles: ApiRole[];
  };
  pagination: ApiPagination;
}

// Table role type for internal use
interface TableRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
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

type SortField = "id" | "name" | "status" | null;
type SortDirection = "asc" | "desc" | null;

const ManageRoles = () => {
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

  const { data, isLoading, refetch } = useGetAllRoleList(
    currentPage,
    itemsPerPage
  );
  const { mutate } = useDeleteRole();

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

  const roles: ApiRole[] = useMemo(
    () => apiData?.data?.roles || [],
    [apiData?.data?.roles]
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

  // Transform API roles to table format
  const tableRoles: TableRole[] = useMemo(() => {
    return roles.map((role) => ({
      id: role.id || "",
      name: role.name || "",
      description: role.description || "",
      permissions: role.permissions || [],
      status: (role.isActive !== undefined
        ? role.isActive
          ? "active"
          : "inactive"
        : role.status === "ACTIVE"
        ? "active"
        : "inactive") as "active" | "inactive",
    }));
  }, [roles]);

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

  // Filter and sort roles
  const filteredAndSortedRoles: TableRole[] = useMemo(() => {
    let filtered = tableRoles.filter((role) => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        role.name.toLowerCase().includes(searchLower) ||
        role.description.toLowerCase().includes(searchLower) ||
        role.id.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableRole, b: TableRole) => {
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
  }, [tableRoles, searchTerm, sortField, sortDirection]);

  // Pagination
  const paginatedRoles = filteredAndSortedRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export roles to CSV
  const handleExport = () => {
    const headers = [
      "ID",
      "Name",
      "Description",
      "Permissions Count",
      "Status",
    ];
    const rows = roles.map((role: ApiRole) => [
      role.id,
      role.name || "",
      role.description || "",
      (role.permissions?.length || 0).toString(),
      role.isActive !== undefined
        ? role.isActive
          ? "active"
          : "inactive"
        : role.status === "ACTIVE"
        ? "active"
        : "inactive",
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
      `roles_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      mutate(deleteConfirm.id);
    } catch (error: unknown) {
      console.error("Error deleting role:", error);
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
  const totalRoles = stats.total;
  const activeRoles = stats.active;
  const inactiveRoles = stats.inactive;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-400">Loading roles...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (role: TableRole) => {
        const { display, full } = formatLongText(role.id, 8);
        return (
          <div className="text-center">
            <span
              className="text-xs sm:text-sm text-gray-800 dark:text-gray-200"
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
      label: "ROLE NAME",
      sortable: true,
      render: (role: TableRole) => {
        const { display, full } = formatLongText(role.name, 20);
        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Shield
                size={14}
                className="text-green-600 dark:text-green-400"
              />
              <span
                className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200"
                title={full !== display ? full : undefined}
              >
                {display}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "description",
      label: "DESCRIPTION",
      sortable: false,
      render: (role: TableRole) => {
        const { display, full } = formatLongText(role.description, 30);
        return (
          <div className="text-center">
            <span
              className="text-xs sm:text-sm text-gray-600 dark:text-gray-300"
              title={full !== display ? full : undefined}
            >
              {display || "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "permissions",
      label: "PERMISSIONS",
      sortable: false,
      render: (role: TableRole) => (
        <div className="text-center">
          <span className="px-2 py-0.5 text-[10px] rounded-full font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {role.permissions.length} permissions
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (role: TableRole) => (
        <div className="text-center">
          <Badge
            status={role.status}
            size="sm"
            customColor={
              role.status === "active"
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
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
      render: (role: TableRole) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => navigate(`/master-setup/roles/view/${role.id}`)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => navigate(`/master-setup/roles/edit/${role.id}`)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(role.id)}
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Role Management
        </h1>
        <PrimaryButton
          onClick={() => navigate("/master-setup/roles/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Role</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Roles"
          value={totalRoles}
          icon={Shield}
          variant="blue"
        />
        <StatCard
          title="Active Roles"
          value={activeRoles}
          icon={Shield}
          variant="green"
        />
        <StatCard
          title="Inactive Roles"
          value={inactiveRoles}
          icon={Shield}
          variant="gray"
        />
      </div>

      {/* Search, Refresh, Export Bar */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
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
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span className="text-xs sm:text-sm">Refresh</span>
          </Button>
          <Button
            onClick={handleExport}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 bg-white dark:bg-gray-800"
          >
            <Download size={14} />
            <span className="text-xs sm:text-sm">Export</span>
          </Button>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedRoles}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(role) => role.id}
            emptyMessage="No roles found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedRoles.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
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
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {((currentPage - 1) * itemsPerPage + 1).toLocaleString()}
                  </span>{" "}
                  to{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredAndSortedRoles.length
                    ).toLocaleString()}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSortedRoles.length.toLocaleString()}
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
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageRoles;
