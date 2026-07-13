import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Users, Download, FileUp, RefreshCw } from "lucide-react";
import {
  StatCard,
  SearchInput,
  PrimaryButton,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  DataTable,
  Pagination,
  Badge,
  Button,
  ConfirmModal,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { formatDate } from "../../../utils/formatters";
import { useGetAllAdminList, useDeleteAdmin } from "../../../hooks/admin";

// Define the API response type
interface ApiAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
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
    admins: ApiAdmin[];
  };
  pagination: ApiPagination;
}

// Table admin type for internal use
interface TableAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
}

// Helper function to slice long text and show full on hover
const SlicedText = ({
  text,
  maxLength = 8,
}: {
  text: string;
  maxLength?: number;
}) => {
  if (!text) return <span>-</span>;
  const displayText =
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  return <span title={text}>{displayText}</span>;
};

const ManageAdmins = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
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

  const { data, isLoading, refetch } = useGetAllAdminList(
    currentPage,
    itemsPerPage
  );
  const { mutate: deleteAdmin } = useDeleteAdmin();

  useEffect(() => {
    if (refetch) {
      refetch();
    }
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

  const stats: ApiStats = apiData?.data?.stats || {
    total: 0,
    active: 0,
    inactive: 0,
  };
  const pagination: ApiPagination = apiData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  // Transform API admins to table format
  const tableAdmins: TableAdmin[] = useMemo(() => {
    return (apiData?.data?.admins || []).map((admin) => ({
      id: admin.id || "",
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      role: admin.role || "",
      status: admin.status || "inactive",
      createdAt: admin.createdAt || "",
    }));
  }, [apiData]);

  // Filter and sort admins
  const filteredAndSortedAdmins = useMemo(() => {
    let filtered = tableAdmins;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.id.toLowerCase().includes(searchLower) ||
          a.name.toLowerCase().includes(searchLower) ||
          a.email.toLowerCase().includes(searchLower) ||
          a.phone.includes(searchTerm) ||
          a.role.toLowerCase().includes(searchLower)
      );
    }

    // Sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id.toLowerCase();
            bValue = b.id.toLowerCase();
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "email":
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case "role":
            aValue = a.role.toLowerCase();
            bValue = b.role.toLowerCase();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
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
  }, [tableAdmins, searchTerm, sortField, sortDirection]);

  // Pagination (client-side for filtered results)
  const paginatedAdmins = filteredAndSortedAdmins.slice(
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

  // Export admins to CSV
  const handleExport = () => {
    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Role",
      "Status",
      "Created At",
    ];
    const rows = tableAdmins.map((a: TableAdmin) => [
      a.id,
      a.name,
      a.email,
      a.phone,
      a.role,
      a.status,
      a.createdAt,
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
      `admins_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import admins from CSV
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
            console.error("Error importing admins:", error);
            alert("Error importing admins. Please check the file format.");
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
      deleteAdmin(deleteConfirm.id);
    } catch (error: unknown) {
      console.error("Error deleting admin:", error);
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
  const totalAdmins = stats.total;
  const activeAdmins = stats.active;
  const inactiveAdmins = stats.inactive;

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading admins...</p>
        </div>
      </div>
    );
  }

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (admin: TableAdmin) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            <SlicedText text={admin.id} maxLength={8} />
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (admin: TableAdmin) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {admin.name || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      label: "EMAIL",
      sortable: true,
      render: (admin: TableAdmin) => (
        <div className="text-center">
          <span
            className="text-xs sm:text-sm text-gray-800 break-words"
            title={admin.email}
          >
            {admin.email || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "phone",
      label: "PHONE",
      sortable: false,
      render: (admin: TableAdmin) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-orange-600 dark:text-orange-500">
            {admin.phone || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "role",
      label: "ROLE",
      sortable: true,
      render: (admin: TableAdmin) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {admin.role || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (admin: TableAdmin) => {
        const statusColorMap: Record<string, string> = {
          active:
            "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400",
          inactive:
            "bg-gray-100 text-gray-800",
        };
        return (
          <div className="text-center">
            <Badge
              status={admin.status}
              size="sm"
              customColor={
                statusColorMap[admin.status] ||
                "bg-gray-100 text-gray-800"
              }
              className="rounded"
            />
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "DATE",
      sortable: true,
      render: (admin: TableAdmin) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 whitespace-nowrap">
            {admin.createdAt ? formatDate(admin.createdAt, "DD-MM-YYYY") : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (admin: TableAdmin) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() =>
                navigate(`/user-management/admins/view/${admin.id}`)
              }
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() =>
                navigate(`/user-management/admins/edit/${admin.id}`)
              }
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(admin.id)}
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
          Manage Admins
        </h1>
        <PrimaryButton
          onClick={() => navigate("/user-management/admins/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Admin</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Admins"
          value={totalAdmins.toLocaleString()}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Active Admins"
          value={activeAdmins.toLocaleString()}
          icon={Users}
          variant="yellow"
        />
        <StatCard
          title="Inactive Admins"
          value={inactiveAdmins.toLocaleString()}
          icon={Users}
          variant="green"
        />
      </div>

      {/* Export/Import/Refresh and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Export/Import/Refresh Buttons */}
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

        {/* Search - Beside Export/Import */}
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
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedAdmins}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(admin) => admin.id}
            emptyMessage="No admins found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedAdmins.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 bg-white text-gray-900"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {((currentPage - 1) * itemsPerPage + 1).toLocaleString()}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {filteredAndSortedAdmins.length.toLocaleString()}
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
        title="Delete Admin"
        message="Are you sure you want to delete this admin? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageAdmins;
