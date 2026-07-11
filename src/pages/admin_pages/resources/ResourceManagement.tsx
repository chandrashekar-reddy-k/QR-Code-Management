import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter,
  RotateCcw,
  ChevronDown,
  Plus,
  Package,
  MapPin,
  Wrench,
} from "lucide-react";

import {
  StatCard,
  SearchInput,
  SelectInput,
  DataTable,
  Pagination,
  Badge,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  PrimaryButton,
  ConfirmModal,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

type ResourceStatus = "IN_USE" | "UNDER_MAINTENANCE" | "DAMAGED";

interface Resource {
  id: string;
  name: string;
  code: string;
  location: string;
  category: string;
  type: string;
  createdAt: string; // ISO date string
  status: ResourceStatus;
}

const mockResources: Resource[] = [
  {
    id: "1",
    name: "POS Machine",
    code: "POS-88923",
    location: "Warehouse 1",
    category: "Electronics",
    type: "Billing Device",
    createdAt: "2026-01-14T10:00:00Z",
    status: "IN_USE",
  },
  {
    id: "2",
    name: "Barcode Scanner",
    code: "BCS-2219",
    location: "Warehouse 1",
    category: "Equipment",
    type: "Scanner",
    createdAt: "2026-01-14T10:00:00Z",
    status: "UNDER_MAINTENANCE",
  },
  {
    id: "3",
    name: "Storage Rack",
    code: "SR-102",
    location: "Warehouse 3",
    category: "Furniture",
    type: "Rack",
    createdAt: "2026-01-14T10:00:00Z",
    status: "DAMAGED",
  },
];

const statusLabelMap: Record<ResourceStatus, string> = {
  IN_USE: "In Use",
  UNDER_MAINTENANCE: "Under Maintenance",
  DAMAGED: "Damaged",
};

const ResourceManagement: React.FC = () => {
  const navigate = useNavigate();

  const [resources, setResources] = useState<Resource[]>(mockResources);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<
    "id" | "name" | "code" | "location" | "category" | "type" | "createdAt" | "status" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  const totalResources = resources.length;
  const activeResources = resources.filter((r) => r.status === "IN_USE").length;
  const inactiveResources = totalResources - activeResources;

  const uniqueCategories = useMemo(() => {
    const set = new Set(resources.map((r) => r.category).filter(Boolean));
    return Array.from(set).sort();
  }, [resources]);

  const filteredAndSortedResources = useMemo(() => {
    let filtered = [...resources];

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter((r) => r.category === categoryFilter);
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      filtered = filtered.filter((r) => {
        const created = new Date(r.createdAt);
        const diffDays =
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

        if (dateFilter === "today") {
          return (
            created.getDate() === now.getDate() &&
            created.getMonth() === now.getMonth() &&
            created.getFullYear() === now.getFullYear()
          );
        }
        if (dateFilter === "week") {
          return diffDays <= 7;
        }
        if (dateFilter === "month") {
          return diffDays <= 30;
        }
        return true;
      });
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aVal: string | number = a[sortField!];
        let bVal: string | number = b[sortField!];

        if (sortField === "createdAt") {
          aVal = new Date(String(aVal)).getTime();
          bVal = new Date(String(bVal)).getTime();
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      });
    }

    return filtered;
  }, [
    resources,
    searchTerm,
    statusFilter,
    categoryFilter,
    dateFilter,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedResources.length / itemsPerPage)
  );
  const paginatedResources = filteredAndSortedResources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, statusFilter, categoryFilter]);

  const handleSort = (field: string) => {
    if (!field) return;
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
      setSortField(field as typeof sortField);
      setSortDirection("asc");
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setStatusFilter("");
    setCategoryFilter("");
    setCurrentPage(1);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm.id) return;
    setResources((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
    setDeleteConfirm({ isOpen: false, id: null });
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (r: Resource) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {r.id}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "RESOURCE NAME",
      sortable: true,
      render: (r: Resource) => (
        <div className="text-left">
          <span className="text-xs sm:text-sm font-semibold text-gray-900">
            {r.name}
          </span>
        </div>
      ),
    },
    {
      key: "code",
      label: "RESOURCE CODE",
      sortable: true,
      render: (r: Resource) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {r.code}
          </span>
        </div>
      ),
    },
    {
      key: "location",
      label: "LOCATION",
      sortable: true,
      render: (r: Resource) => (
        <div className="flex items-center justify-center gap-1">
          <MapPin size={12} className="text-gray-400" />
          <span className="text-xs sm:text-sm text-gray-800">
            {r.location}
          </span>
        </div>
      ),
    },
    {
      key: "category",
      label: "CATEGORY",
      sortable: true,
      render: (r: Resource) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {r.category}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "TYPE",
      sortable: true,
      render: (r: Resource) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {r.type}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "CREATED ON",
      sortable: true,
      render: (r: Resource) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {new Date(r.createdAt).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (r: Resource) => {
        const label = statusLabelMap[r.status];
        let color =
          "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400";
        if (r.status === "UNDER_MAINTENANCE") {
          color =
            "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400";
        } else if (r.status === "DAMAGED") {
          color =
            "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400";
        }
        return (
          <div className="text-center">
            <Badge
              status={label}
              size="sm"
              customColor={color}
              className="rounded whitespace-nowrap"
            />
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (r: Resource) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() =>
                navigate(`/resource-management/resources/${r.id}/view`)
              }
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() =>
                navigate(`/resource-management/resources/${r.id}/edit`)
              }
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(r.id)}
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
      {/* Header with title and Add Resource button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            Resources
          </h1>
          <Breadcrumbs />
        </div>
        <PrimaryButton
          onClick={() => navigate("/resource-management/resources/create")}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Add Resource</span>
        </PrimaryButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard
          title="Total Resources"
          value={totalResources.toLocaleString()}
          icon={Package}
          variant="purple"
        />
        <StatCard
          title="Active Resources"
          value={activeResources.toLocaleString()}
          icon={Wrench}
          variant="green"
        />
        <StatCard
          title="Inactive Resources"
          value={inactiveResources.toLocaleString()}
          icon={Package}
          variant="yellow"
        />
      </div>

      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-xl overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* Date Filter */}
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

          {/* Status Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ResourceStatus | "")
                }
                options={[
                  { value: "", label: "Status" },
                  { value: "IN_USE", label: "In Use" },
                  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
                  { value: "DAMAGED", label: "Damaged" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Category Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Category" },
                  ...uniqueCategories.map((c) => ({
                    value: c,
                    label: c,
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
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search */}
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
            data={paginatedResources}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(row: Resource) => row.id}
            emptyMessage="No resources found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedResources.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-400 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:text-gray-900 dark:[&_select]:text-gray-200 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
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
                    className="w-16 sm:w-20 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSortedResources.length
                  )}{" "}
                  of {filteredAndSortedResources.length}
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  pagination={{
                    page: currentPage,
                    limit: itemsPerPage,
                    total: filteredAndSortedResources.length,
                    totalPages,
                    hasNext: currentPage < totalPages,
                    hasPrev: currentPage > 1,
                  }}
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
        title="Delete Resource"
        message="Are you sure you want to delete this resource? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ResourceManagement;

