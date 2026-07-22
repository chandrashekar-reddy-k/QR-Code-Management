import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Box,
  CheckCircle,
  XCircle,
  Filter,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  SearchInput,
  DataTable,
  SelectInput,
  StatCard,
  PrimaryButton,
  Pagination,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { useGetWarehouseCategories, useToggleWarehouseCategory } from "../../../hooks/category";

interface ApiCategory {
  id: string;
  categoryId?: string;
  categoryName?: string;
  name?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  displayOrder?: number;
  slug?: string;
  subCategories?: unknown[];
}

const MyCategories = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: categoriesData, isLoading } = useGetWarehouseCategories();

  // Parse API response
  const allCategories: ApiCategory[] = useMemo(() => {
    const res = categoriesData as { data?: ApiCategory[] } | undefined;
    const arr = Array.isArray(res?.data) ? res!.data! : Array.isArray(categoriesData) ? (categoriesData as ApiCategory[]) : [];
    return arr.map(c => ({
      ...c,
      id: c.categoryId || c.id,
      name: c.categoryName || c.name || "Unnamed Category"
    }));
  }, [categoriesData]);

  // Filter by search and status
  const filtered = useMemo(() => {
    return allCategories.filter((c) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" ? c.isEnabled !== false : c.isEnabled === false);
      return matchesSearch && matchesStatus;
    });
  }, [allCategories, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalCount = allCategories.length;
  const activeCount = allCategories.filter((c) => c.isEnabled !== false).length;
  const inactiveCount = allCategories.filter((c) => c.isEnabled === false).length;

  const kpiData = [
    {
      title: "Total Categories",
      value: isLoading ? "..." : String(totalCount),
      icon: Box,
      variant: "purple" as const,
    },
    {
      title: "Active Categories",
      value: isLoading ? "..." : String(activeCount),
      icon: CheckCircle,
      variant: "yellow" as const,
    },
    {
      title: "Inactive Categories",
      value: isLoading ? "..." : String(inactiveCount),
      icon: XCircle,
      variant: "green" as const,
    },
  ];

  const toggleMutation = useToggleWarehouseCategory();

  const handleToggle = async (id: string) => {
    try {
      await toggleMutation.mutateAsync(id);
    } catch {
      // Error handled by hook toast
    }
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (item: ApiCategory) => (
        <div className="text-center">
          <span className="text-xs text-gray-500 font-mono">
            {item.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: "image",
      label: "IMAGE",
      render: (item: ApiCategory) => (
        <div className="flex items-center justify-center">
          {item.image ? (
            <img
              src={item.image}
              alt="category"
              className="w-12 h-12 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
              <Box size={20} className="text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (item: ApiCategory) => (
        <div className="text-center">
          <span className="text-sm font-medium text-gray-800">
            {item.name}
          </span>
        </div>
      ),
    },
    {
      key: "description",
      label: "DESCRIPTION",
      render: (item: ApiCategory) => (
        <div className="text-center">
          <span className="text-sm text-gray-600">
            {item.description || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "subCategories",
      label: "SUB-CATEGORIES",
      render: (item: ApiCategory) => (
        <div className="text-center">
          <span className="text-sm text-gray-700 font-medium">
            {Array.isArray(item.subCategories) ? item.subCategories.length : 0}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      render: (item: ApiCategory) => {
        const isActive = item.isEnabled !== false;
        const isToggling = toggleMutation.isPending && toggleMutation.variables === item.id;

        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleToggle(item.id)}
              disabled={isToggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? "bg-green-600" : "bg-gray-300"
              } ${isToggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              title={isActive ? "Click to disable category" : "Click to enable category"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        );
      },
    },
  ];

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full px-2 sm:px-4 pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 mb-3 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Categories
          </h1>
          <Breadcrumbs />
        </div>

        <PrimaryButton
          onClick={() => navigate("/my-categories/requests")}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Request Category
        </PrimaryButton>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
          />
        ))}
      </div>

      {/* FILTERS + SEARCH */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-xl overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* STATUS DROPDOWN */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* RESET */}
          <div className="px-4 py-3">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 text-orange-600 text-sm hover:opacity-80 transition-opacity"
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          </div>
        </div>

        {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* TABLE */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500">Loading categories...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <DataTable
            data={paginated}
            columns={columns}
            keyExtractor={(item) => (item as ApiCategory).id}
          />

          {/* PAGINATION */}
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* LEFT SIDE */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600">Show</span>
                <div className="[&_select]:text-orange-600 [&_select]:px-2 [&_select]:py-1 [&_select]:border [&_select]:rounded-lg [&_select]:w-16 [&_select]:h-7">
                  <SelectInput
                    value={String(itemsPerPage)}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                    ]}
                  />
                </div>
                <span className="text-gray-600">
                  Showing results{" "}
                  <span className="text-orange-600 font-medium">
                    {Math.min(paginated.length, itemsPerPage)}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 font-medium">
                    {filtered.length}
                  </span>
                </span>
              </div>

              {/* RIGHT SIDE */}
              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filtered.length}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCategories;