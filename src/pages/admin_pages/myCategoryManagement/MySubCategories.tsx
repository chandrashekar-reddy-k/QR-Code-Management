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
import { useGetProductCategoriesList } from "../../../hooks/product";

interface ApiSubCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  displayOrder?: number;
  categoryId?: string;
}

interface ApiCategory {
  id: string;
  name: string;
  isActive?: boolean;
  image?: string;
  subCategories?: ApiSubCategory[];
}

interface FlatSubCategory extends ApiSubCategory {
  parentCategoryId: string;
  parentCategoryName: string;
}

const MySubCategories = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch all categories — each includes their subCategories array
  const { data: categoriesData, isLoading } = useGetProductCategoriesList();

  // Parse categories from API response
  const categories: ApiCategory[] = useMemo(() => {
    const res = categoriesData as { data?: ApiCategory[] } | undefined;
    return Array.isArray(res?.data) ? res!.data! : [];
  }, [categoriesData]);

  // Flatten all subcategories from all categories
  const allSubCategories: FlatSubCategory[] = useMemo(() => {
    const flat: FlatSubCategory[] = [];
    for (const cat of categories) {
      const subs: ApiSubCategory[] = Array.isArray(cat.subCategories)
        ? cat.subCategories
        : [];
      for (const sub of subs) {
        flat.push({
          ...sub,
          parentCategoryId: cat.id,
          parentCategoryName: cat.name,
        });
      }
    }
    return flat;
  }, [categories]);

  // Build category options for the filter dropdown
  const categoryOptions = useMemo(() => {
    return [
      { value: "", label: "All Categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [categories]);

  // Apply filters
  const filtered = useMemo(() => {
    return allSubCategories.filter((sc) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (sc.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        sc.parentCategoryName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active"
          ? sc.isActive !== false
          : sc.isActive === false);
      const matchesCategory =
        !categoryFilter || sc.parentCategoryId === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [allSubCategories, searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalCount = allSubCategories.length;
  const activeCount = allSubCategories.filter((sc) => sc.isActive !== false).length;
  const inactiveCount = allSubCategories.filter((sc) => sc.isActive === false).length;

  const kpiData = [
    {
      title: "Total Sub Categories",
      value: isLoading ? "..." : String(totalCount),
      icon: Box,
      variant: "purple" as const,
    },
    {
      title: "Active Sub Categories",
      value: isLoading ? "..." : String(activeCount),
      icon: CheckCircle,
      variant: "yellow" as const,
    },
    {
      title: "Inactive Sub Categories",
      value: isLoading ? "..." : String(inactiveCount),
      icon: XCircle,
      variant: "green" as const,
    },
  ];

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (item: FlatSubCategory) => (
        <div className="text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {item.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      key: "image",
      label: "IMAGE",
      render: (item: FlatSubCategory) => (
        <div className="flex items-center justify-center">
          {item.image ? (
            <img
              src={item.image}
              alt="subcategory"
              className="w-12 h-12 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Box size={20} className="text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "parentCategoryName",
      label: "PARENT CATEGORY",
      render: (item: FlatSubCategory) => (
        <div className="text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {item.parentCategoryName}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      render: (item: FlatSubCategory) => (
        <div className="text-center">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {item.name}
          </span>
        </div>
      ),
    },
    {
      key: "description",
      label: "DESCRIPTION",
      render: (item: FlatSubCategory) => (
        <div className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {item.description || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      render: (item: FlatSubCategory) => {
        const isActive = item.isActive !== false;
        return (
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        );
      },
    },
  ];

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCategoryFilter("");
    setCurrentPage(1);
  };

  return (
    <div className="w-full px-2 sm:px-4 pb-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 mb-3 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            My Sub Categories
          </h1>
          <Breadcrumbs />
        </div>

        <PrimaryButton
          onClick={() => navigate("/my-sub-categories/requests")}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Request Sub Category
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-2xl overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
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
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* CATEGORY DROPDOWN */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={categoryOptions}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
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
            placeholder="Search sub categories..."
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
          <p className="text-gray-500 dark:text-gray-400">
            Loading sub categories...
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border overflow-hidden">
          <DataTable
            data={paginated}
            columns={columns}
            keyExtractor={(item) => (item as FlatSubCategory).id}
          />

          {/* PAGINATION */}
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              {/* LEFT SIDE */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400">Show</span>
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
                <span className="text-gray-600 dark:text-gray-400">
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

export default MySubCategories;