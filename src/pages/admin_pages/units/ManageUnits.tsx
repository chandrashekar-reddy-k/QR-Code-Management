import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Ruler, RefreshCw, Download, FileUp } from "lucide-react";
import {
  SearchInput,
  ConfirmModal,
  StatCard,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  DataTable,
  Pagination,
  PrimaryButton,
  Button,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { useDeleteUnit, useGetAllUnitList } from "../../../hooks/unit";

// Define the API response type
interface ApiUnit {
  id: string;
  name: string;
  shortCode: string;
  parent: string | null;
  conversion: number;
  status?: string;
  displayOrder?: number;
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
    units: ApiUnit[];
  };
  pagination: ApiPagination;
}

// Table unit type for internal use
interface TableUnit {
  id: string;
  name: string;
  shortCode: string;
  parentId: string | null;
  conversion: number;
}

const ManageUnits = () => {
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

  const { data, isLoading, refetch } = useGetAllUnitList(
    currentPage,
    itemsPerPage
  );
  const { mutate } = useDeleteUnit();

  useEffect(() => {
    if (refetch) {
      refetch();
    }
    // Optionally, add tab focus as well:
    const onFocus = () => {
      refetch && refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location, refetch]);

  // Type assertion for the data
  const apiData = data as ApiResponse | undefined;

  const units: ApiUnit[] = apiData?.data?.units || [];
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

  // Transform API units to table format
  const tableUnits: TableUnit[] = useMemo(() => {
    return units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      shortCode: unit.shortCode,
      parentId: unit.parent || null,
      conversion: unit.conversion || 0,
    }));
  }, [units]);

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

  // Filter and sort units
  const filteredAndSortedUnits: TableUnit[] = useMemo(() => {
    let filtered = tableUnits.filter((unit) => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        unit.name.toLowerCase().includes(searchLower) ||
        unit.shortCode.toLowerCase().includes(searchLower) ||
        unit.id.toLowerCase().includes(searchLower)
      );
    });

    if (sortField) {
      filtered = [...filtered].sort((a: TableUnit, b: TableUnit) => {
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
          case "shortCode":
            aValue = a.shortCode.toLowerCase();
            bValue = b.shortCode.toLowerCase();
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
  }, [tableUnits, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUnits.length / itemsPerPage);
  const paginatedUnits = filteredAndSortedUnits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export units to CSV
  const handleExport = () => {
    const headers = ["ID", "Name", "Short Code", "Parent ID", "Conversion"];
    const rows = units.map((u: ApiUnit) => [
      u.id,
      u.name,
      u.shortCode,
      u.parent || "",
      u.conversion || 0,
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
      `units_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import units from CSV
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
            alert("Import functionality needs to be connected to API");
          } catch (error) {
            console.error("Error importing units:", error);
            alert("Error importing units. Please check the file format.");
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
    } catch (error: any) {
      console.error("Error deleting unit:", error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleEdit = (unit: TableUnit) => {
    navigate(`/products/units/${unit.id}/edit`);
  };

  const handleView = (unit: TableUnit) => {
    navigate(`/products/units/view/${unit.id}`);
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch();
    } else {
      window.location.reload();
    }
  };

  // Calculate KPI stats
  const totalUnits = stats.total;
  const parentUnits = useMemo(() => {
    return units.filter((unit) => unit.parent === null).length;
  }, [units]);
  const childUnits = useMemo(() => {
    return units.filter((unit) => unit.parent !== null).length;
  }, [units]);

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-400">Loading units...</p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (unit: TableUnit) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {unit.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (unit: TableUnit) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
            {unit.name}
          </span>
        </div>
      ),
    },
    {
      key: "shortCode",
      label: "SHORT CODE",
      sortable: true,
      render: (unit: TableUnit) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {unit.shortCode}
          </span>
        </div>
      ),
    },
    {
      key: "parentId",
      label: "PARENT ID",
      sortable: false,
      render: (unit: TableUnit) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {unit.parentId ? unit.parentId : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "conversion",
      label: "CONVERSION",
      sortable: false,
      render: (unit: TableUnit) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {unit.conversion || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (unit: TableUnit) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => handleView(unit)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => handleEdit(unit)}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(unit.id)}
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
          Manage Units
        </h1>
        <PrimaryButton
          onClick={() => navigate("/products/units/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Unit</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Units"
          value={totalUnits}
          icon={Ruler}
          variant="purple"
        />
        <StatCard
          title="Parent Units"
          value={parentUnits}
          icon={Ruler}
          variant="yellow"
        />
        <StatCard
          title="Child Units"
          value={childUnits}
          icon={Ruler}
          variant="green"
        />
      </div>

      {/* Search, Refresh, Import/Export Bar */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
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
          <Button
            onClick={handleImport}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 bg-white dark:bg-gray-800"
          >
            <FileUp size={14} />
            <span className="text-xs sm:text-sm">Import</span>
          </Button>
        </div>
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

      {/* Units Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedUnits}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            keyExtractor={(unit) => unit.id}
            emptyMessage="No units found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedUnits.length > 0 && (
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
                    filteredAndSortedUnits.length
                  )}{" "}
                  of {filteredAndSortedUnits.length}
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
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageUnits;
