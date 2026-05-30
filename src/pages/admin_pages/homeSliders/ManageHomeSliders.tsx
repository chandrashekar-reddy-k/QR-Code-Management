import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Image as ImageIcon,
  Sliders,
  Filter,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
// import { homeSlidersAPI } from '../../../lib/api';
import { HomeSlider } from "../../../types";
import {
  SearchInput,
  Badge,
  ConfirmModal,
  DataTable,
  Pagination,
  SelectInput,
  StatCard,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  PrimaryButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

// Groceries home slider images
const sliderImages = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1340&h=740&fit=crop", // Fresh Vegetables Banner
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1340&h=740&fit=crop", // Fresh Fruits Banner
  "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1340&h=740&fit=crop", // Dairy Products Banner
  "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=1340&h=740&fit=crop", // Grains & Pulses Banner
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1340&h=740&fit=crop", // Spices & Condiments Banner
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1340&h=740&fit=crop", // Beverages Banner
  "https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=1340&h=740&fit=crop", // Snacks & Sweets Banner
  "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=1340&h=740&fit=crop", // Personal Care Banner
];

// Mock data for groceries home sliders
const mockSliders: HomeSlider[] = [
  {
    id: 1,
    type: "Default",
    name: "Fresh Vegetables Special",
    image: sliderImages[0],
    status: "active",
  },
  {
    id: 2,
    type: "Banner",
    name: "Fresh Fruits Collection",
    image: sliderImages[1],
    status: "active",
  },
  {
    id: 3,
    type: "Promotional",
    name: "Dairy Products Offer",
    image: sliderImages[2],
    status: "active",
  },
  {
    id: 4,
    type: "Default",
    name: "Grains & Pulses Sale",
    image: sliderImages[3],
    status: "inactive",
  },
  {
    id: 5,
    type: "Banner",
    name: "Spices & Condiments",
    image: sliderImages[4],
    status: "active",
  },
  {
    id: 6,
    type: "Promotional",
    name: "Beverages Discount",
    image: sliderImages[5],
    status: "active",
  },
  {
    id: 7,
    type: "Default",
    name: "Snacks & Sweets",
    image: sliderImages[6],
    status: "active",
  },
  {
    id: 8,
    type: "Banner",
    name: "Personal Care Products",
    image: sliderImages[7],
    status: "active",
  },
];

const ManageHomeSliders = () => {
  const navigate = useNavigate();
  const [sliders, setSliders] = useState<HomeSlider[]>(mockSliders);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

  useEffect(() => {
    fetchSliders();
  }, []);

  const fetchSliders = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await homeSlidersAPI.getAll();
      // setSliders(Array.isArray(data) ? data : data.sliders || []);
      setSliders(mockSliders);
    } catch (error) {
      console.error("Error fetching home sliders:", error);
      setSliders(mockSliders);
    } finally {
      setLoading(false);
    }
  };

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

  // Filter + sort
  const filteredAndSortedSliders = useMemo(() => {
    let filtered = [...sliders];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.id.toString().includes(term) ||
          s.type.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "id":
            aValue = a.id;
            bValue = b.id;
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "status":
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
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
  }, [sliders, searchTerm, statusFilter, typeFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSliders.length / itemsPerPage);
  const paginatedSliders = filteredAndSortedSliders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setTypeFilter("");
    setCurrentPage(1);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      // Using mock data for now - replace with API call when ready
      // await homeSlidersAPI.delete(deleteConfirm.id);
      setSliders(sliders.filter((s) => s.id !== deleteConfirm.id));
      alert("Home slider deleted successfully!");
    } catch (error: unknown) {
      console.error("Error deleting home slider:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Error deleting home slider. Please try again.";
      alert(message);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const totalSliders = sliders.length;
    const activeSliders = sliders.filter((s) => s.status === "active").length;
    const inactiveSliders = sliders.filter(
      (s) => s.status === "inactive"
    ).length;
    const defaultSliders = sliders.filter((s) => s.type === "Default").length;

    return [
      {
        title: "Total Sliders",
        value: totalSliders.toLocaleString(),
        icon: Sliders,
        variant: "purple" as const,
      },
      {
        title: "Active Sliders",
        value: activeSliders.toLocaleString(),
        icon: Sliders,
        variant: "yellow" as const,
      },
      {
        title: "Inactive Sliders",
        value: inactiveSliders.toLocaleString(),
        icon: Sliders,
        variant: "green" as const,
      },
      {
        title: "Default Sliders",
        value: defaultSliders.toLocaleString(),
        icon: Sliders,
        variant: "red" as const,
      },
    ];
  }, [sliders]);

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (slider: HomeSlider) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{slider.id}</span>
        </div>
      ),
    },
    {
      key: "type",
      label: "TYPE",
      sortable: true,
      render: (slider: HomeSlider) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {slider.type}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (slider: HomeSlider) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium">
            {slider.name}
          </span>
        </div>
      ),
    },
    {
      key: "image",
      label: "IMAGE",
      sortable: false,
      render: (slider: HomeSlider) => (
        <div className="flex items-center justify-center">
          {slider.image ? (
            <img
              src={slider.image}
              alt={slider.name}
              className="w-16 h-10 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center border border-gray-200 dark:border-gray-600">
              <ImageIcon size={14} className="text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (slider: HomeSlider) => (
        <div className="text-center">
          <Badge status={slider.status} size="sm" />
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (slider: HomeSlider) => (
        <div className="flex items-center justify-center gap-2">
          <ViewIconButton
            onClick={() => navigate(`/home-sliders/view/${slider.id}`)}
            size={14}
            tooltip="View"
          />
          <EditIconButton
            onClick={() => navigate(`/home-sliders/edit/${slider.id}`)}
            size={14}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() => handleDeleteClick(slider.id)}
            size={14}
            tooltip="Delete"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-2 mt-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Home Slider Images
          </h1>
          <PrimaryButton
            onClick={() => navigate("/home-sliders/create")}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add New</span>
          </PrimaryButton>
        </div>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
            size="md"
            valueSize="2xl"
          />
        ))}
      </div>

      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Status Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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

          {/* Type Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: "", label: "Type" },
                  { value: "Default", label: "Default" },
                  { value: "Banner", label: "Banner" },
                  { value: "Promotional", label: "Promotional" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-400 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search beside filters */}
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedSliders}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(slider) => slider.id.toString()}
            emptyMessage="No home sliders found"
            loading={loading}
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedSliders.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</span>
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
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing results{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {filteredAndSortedSliders.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedSliders.length}
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
        title="Delete Home Slider"
        message="Are you sure you want to delete this home slider? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageHomeSliders;
