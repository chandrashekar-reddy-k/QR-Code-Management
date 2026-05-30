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
import { useDeletePartner, useGetAllPartnerList } from "../../../hooks/partner";

// Define the API response type
interface ApiPartner {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  warehouseId?: string;
  status: string; // "Active" or "Inactive" from API
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
  data: ApiPartner[]; // API returns array directly, not nested object
  pagination: ApiPagination;
}

// Table partner type for internal use
interface TablePartner {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "active" | "inactive";
  createdAt: string; // Will be empty if not provided by API
}

// Helper function to truncate text and show full value on hover
const truncateText = (
  text: string | null | undefined,
  maxLength: number = 8
): string => {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const ManagePartners = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading, refetch } = useGetAllPartnerList(
    currentPage,
    itemsPerPage
  );
  const { mutate } = useDeletePartner();

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

  const partners: ApiPartner[] = useMemo(() => {
    return apiData?.data || [];
  }, [apiData?.data]);

  // Calculate stats from partners array since API doesn't provide stats object
  const stats = useMemo(() => {
    const total = partners.length;
    const active = partners.filter(
      (p) => p.status?.toLowerCase() === "active"
    ).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [partners]);

  const pagination: ApiPagination = useMemo(() => {
    return (
      apiData?.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }
    );
  }, [apiData?.pagination]);

  // Transform API partners to table format
  const tablePartners: TablePartner[] = useMemo(() => {
    return partners.map((partner) => ({
      id: partner.id || "",
      name: partner.name || "",
      email: partner.email || "",
      phone: partner.phone || "",
      company: partner.companyName || "", // Map companyName to company
      status: (partner.status?.toLowerCase() === "active"
        ? "active"
        : "inactive") as "active" | "inactive", // Normalize status to lowercase
      createdAt: "", // API doesn't provide createdAt, leave empty
    }));
  }, [partners]);

  // Calculate KPI stats
  const totalPartners = stats.total;
  const activePartners = stats.active;
  const inactivePartners = stats.inactive;

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

  // Filter and sort partners
  const filteredAndSortedPartners: TablePartner[] = useMemo(() => {
    let filtered = tablePartners.filter((partner) => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        (partner.id || "").toLowerCase().includes(searchLower) ||
        (partner.name || "").toLowerCase().includes(searchLower) ||
        (partner.email || "").toLowerCase().includes(searchLower) ||
        (partner.phone || "").includes(searchTerm) ||
        (partner.company || "").toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TablePartner, b: TablePartner) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id || "";
            bValue = b.id || "";
            break;
          case "name":
            aValue = (a.name || "").toLowerCase();
            bValue = (b.name || "").toLowerCase();
            break;
          case "email":
            aValue = (a.email || "").toLowerCase();
            bValue = (b.email || "").toLowerCase();
            break;
          case "company":
            aValue = (a.company || "").toLowerCase();
            bValue = (b.company || "").toLowerCase();
            break;
          case "status":
            aValue = a.status || "inactive";
            bValue = b.status || "inactive";
            break;
          case "createdAt":
            // API doesn't provide createdAt, so sorting is disabled
            return 0;
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
  }, [tablePartners, searchTerm, sortField, sortDirection]);

  // Pagination
  const paginatedPartners = filteredAndSortedPartners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      mutate(deleteConfirm.id);
    } catch (error: unknown) {
      console.error("Error deleting partner:", error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleEdit = (partner: TablePartner) => {
    navigate(`/user-management/partners/edit/${partner.id}`);
  };

  const handleView = (partner: TablePartner) => {
    navigate(`/user-management/partners/view/${partner.id}`);
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch();
    } else {
      window.location.reload();
    }
  };

  // Export partners to CSV
  const handleExport = () => {
    const headers = ["ID", "Name", "Email", "Phone", "Company", "Status"];
    const rows = partners.map((p: ApiPartner) => [
      p.id || "",
      p.name || "",
      p.email || "",
      p.phone || "",
      p.companyName || "",
      p.status || "Inactive",
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
      `partners_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import partners from CSV
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const lines = text.split("\n").filter((line) => line.trim());

            if (lines.length > 1) {
              alert(`Successfully imported ${lines.length - 1} partners!`);
            } else {
              alert("No valid partners found in the file.");
            }
          } catch (error) {
            console.error("Error importing partners:", error);
            alert("Error importing partners. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-400">
            Loading partners...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Manage Partners
        </h1>
        <PrimaryButton
          onClick={() => navigate("/user-management/partners/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Partner</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Partners"
          value={totalPartners.toLocaleString()}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Active Partners"
          value={activePartners.toLocaleString()}
          icon={Users}
          variant="yellow"
        />
        <StatCard
          title="Inactive Partners"
          value={inactivePartners.toLocaleString()}
          icon={Users}
          variant="green"
        />
      </div>

      {/* Action Buttons (Export, Import, Refresh) and Search Bar */}
      <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Export, Import, Refresh Buttons - Left */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleExport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800"
            title="Export to CSV"
          >
            <Download size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            onClick={handleImport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800"
            title="Import from CSV"
          >
            <FileUp size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 disabled:opacity-50"
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
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedPartners}
            columns={[
              {
                key: "id",
                label: "ID",
                sortable: true,
                render: (partner: TablePartner) => (
                  <div className="text-center">
                    <span
                      className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 cursor-help"
                      title={partner.id || ""}
                    >
                      {truncateText(partner.id, 8)}
                    </span>
                  </div>
                ),
              },
              {
                key: "name",
                label: "PARTNER NAME",
                sortable: true,
                render: (partner: TablePartner) => (
                  <div className="text-center">
                    <span
                      className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200"
                      title={partner.name || ""}
                    >
                      {partner.name || "N/A"}
                    </span>
                  </div>
                ),
              },
              {
                key: "company",
                label: "COMPANY",
                sortable: true,
                render: (partner: TablePartner) => (
                  <div className="text-center">
                    <span
                      className="text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                      title={partner.company || ""}
                    >
                      {partner.company || "No company"}
                    </span>
                  </div>
                ),
              },
              {
                key: "email",
                label: "EMAIL",
                sortable: true,
                render: (partner: TablePartner) => (
                  <div className="text-center">
                    <span
                      className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 break-words cursor-help"
                      title={partner.email || ""}
                    >
                      {partner.email || "N/A"}
                    </span>
                  </div>
                ),
              },
              {
                key: "phone",
                label: "PHONE",
                sortable: false,
                render: (partner: TablePartner) => (
                  <div className="text-center">
                    <span
                      className="text-xs sm:text-sm text-orange-600 dark:text-orange-500"
                      title={partner.phone || ""}
                    >
                      {partner.phone || "N/A"}
                    </span>
                  </div>
                ),
              },
              {
                key: "status",
                label: "STATUS",
                sortable: true,
                render: (partner: TablePartner) => (
                  <div className="text-center">
                    <Badge
                      status={partner.status || "inactive"}
                      size="sm"
                      customColor={
                        partner.status === "active"
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800"
                      }
                      className="rounded"
                    />
                  </div>
                ),
              },
              {
                key: "createdAt",
                label: "DATE",
                sortable: false, // Disable sorting since API doesn't provide this field
                render: () => {
                  // API doesn't provide createdAt, show N/A
                  return (
                    <div className="text-center">
                      <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        N/A
                      </span>
                    </div>
                  );
                },
              },
              {
                key: "actions",
                label: "ACTIONS",
                sortable: false,
                render: (partner: TablePartner) => (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <ViewIconButton
                        onClick={() => handleView(partner)}
                        size={12}
                        tooltip="View"
                      />
                      <EditIconButton
                        onClick={() => handleEdit(partner)}
                        size={12}
                        tooltip="Edit"
                      />
                      <DeleteIconButton
                        onClick={() => handleDeleteClick(partner.id)}
                        size={12}
                        tooltip="Delete"
                      />
                    </div>
                  </div>
                ),
              },
            ]}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(partner) => partner.id}
            emptyMessage="No partners found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedPartners.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSortedPartners.length
                  )}{" "}
                  of {filteredAndSortedPartners.length}
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                pagination={pagination}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Partner"
        message="Are you sure you want to delete this partner? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManagePartners;
