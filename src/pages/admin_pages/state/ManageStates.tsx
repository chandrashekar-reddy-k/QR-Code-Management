import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, MapPin, RefreshCw, Download, FileUp } from "lucide-react";
import {
  StatCard,
  SearchInput,
  SelectInput,
  PrimaryButton,
  DataTable,
  Pagination,
  Badge,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  ConfirmModal,
  Button,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  useGetAllStateList,
  useDeleteState,
} from "../../../hooks/state";

/* ================= API TYPES ================= */

interface ApiState {
  id: string;
  stateName: string;
   country: {
    name: string;   // ✅ ONLY what you need
  };
  status: "ACTIVE" | "INACTIVE";
  stateIcon: string;
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
    states: ApiState[];
  };
  pagination: ApiPagination;
}

/* ================= TABLE TYPE ================= */

interface TableState {
  id: string;
  name: string;
  country: string;
  status: "active" | "inactive";
}

/* ================= COMPONENT ================= */

const ManageStates = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  /* ================= API ================= */

  const { data, isLoading, refetch } = useGetAllStateList(
    currentPage,
    itemsPerPage
  );
  const { mutate } = useDeleteState();

  useEffect(() => {
    refetch && refetch();
    const onFocus = () => refetch && refetch();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location, refetch]);

  const apiData = data as ApiResponse | undefined;

  const states: ApiState[] = apiData?.data?.states || [];
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

  /* ================= TRANSFORM ================= */

  const tableStates: TableState[] = useMemo(() => {
  return states.map((s) => ({
    id: s.id,
    name: s.stateName, // ✅ FIXED
    country: s.country?.name ?? "",
    status: s.status === "ACTIVE" ? "active" : "inactive", // ✅ FIXED
  }));
}, [states]);


  /* ================= FILTER + SORT ================= */

  const filteredAndSortedStates = useMemo(() => {
    let filtered = tableStates;

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.country.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortField) {
      filtered = [...filtered].sort((a: any, b: any) => {
        const aValue = a[sortField] ?? "";
        const bValue = b[sortField] ?? "";

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : -1;
        }
        return aValue < bValue ? 1 : -1;
      });
    }

    return filtered;
  }, [tableStates, searchTerm, sortField, sortDirection]);

  const paginatedStates = filteredAndSortedStates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ================= HANDLERS ================= */

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    try {
      mutate(deleteConfirm.id);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleRefresh = () => {
    refetch && refetch();
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ["ID", "Name", "Country", "Status"];
   const rows = states.map((s) => [
  s.id,
  s.stateName,
  s.country?.name ?? "", // ✅ FIX
  s.status === "ACTIVE" ? "active" : "inactive",
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
      `states_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = () => {
      alert("Import functionality needs to be connected to API");
    };
    input.click();
  };

  /* ================= KPI ================= */

  const totalStates = stats.total;
  const activeStates = stats.active;
  const inactiveStates = stats.inactive;

  /* ================= TABLE COLUMNS ================= */

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (s: TableState) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {s.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "STATE NAME",
      sortable: true,
      render: (s: TableState) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <MapPin size={12} className="text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-800">
              {s.name}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "country",
      label: "COUNTRY",
      sortable: true,
      render: (s: TableState) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {s.country}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (s: TableState) => (
        <div className="text-center">
          <Badge
            status={s.status}
            size="sm"
            customColor={
              s.status === "active"
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
      render: (s: TableState) => (
        <div className="flex items-center justify-center gap-1.5">
          <ViewIconButton
            onClick={() => navigate(`/master-setup/states/view/${s.id}`)}
            tooltip="View"
          />
          <EditIconButton
            onClick={() => navigate(`/master-setup/states/edit/${s.id}`)}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() =>
              setDeleteConfirm({ isOpen: true, id: s.id })
            }
            tooltip="Delete"
          />
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading states...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Manage States</h1>
        <PrimaryButton
          onClick={() => navigate('/master-setup/states/create')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add State</span>
        </PrimaryButton>
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total States"
          value={totalStates.toLocaleString()}
          icon={MapPin}
          variant="blue"
        />
        <StatCard
          title="Active States"
          value={activeStates.toLocaleString()}
          icon={MapPin}
          variant="green"
        />
        <StatCard
          title="Inactive States"
          value={inactiveStates.toLocaleString()}
          icon={MapPin}
          variant="gray"
        />
      </div>

      {/* Export/Import/Refresh Buttons and Search Bar */}
      <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Export, Import, and Refresh Buttons - Left */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleExport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
          >
            <Download size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            onClick={handleImport}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white"
          >
            <FileUp size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={`sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Search Bar - Right */}
        <div className="flex-1 w-full sm:max-w-md sm:ml-auto">
          <SearchInput
            placeholder="Search states..."
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
            data={paginatedStates}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(state) => state.id.toString()}
            emptyMessage="No states found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedStates.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <SelectInput
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '10', label: '10' },
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' },
                    ]}
                    className="w-14 sm:w-16 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing <span className="text-orange-600 dark:text-orange-500 font-medium">{((currentPage - 1) * itemsPerPage + 1).toLocaleString()}</span> of{' '}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">{filteredAndSortedStates.length.toLocaleString()}</span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                     currentPage={currentPage}
        pagination={pagination}
        onPageChange={setCurrentPage}
                  // currentPage={currentPage}
                  // totalPages={totalPages}
                  // onPageChange={setCurrentPage}
                  // itemsPerPage={itemsPerPage}
                  // totalItems={filteredAndSortedStates.length}
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
        title="Delete State"
        message="Are you sure you want to delete this state? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageStates;
