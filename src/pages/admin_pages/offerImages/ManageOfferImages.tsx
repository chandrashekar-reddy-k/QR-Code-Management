import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Image as ImageIcon,
  Camera,
  Filter,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
// import { offerImagesAPI } from '../../../lib/api';
import { OfferImage } from "../../../types";
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

// Groceries offer image URLs (banner format: 1340x740)
const offerImageUrls = [
  "https://images.unsplash.com/photo-1556910103-2c027eb7efd4?w=1340&h=740&fit=crop", // Grocery shopping banner
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1340&h=740&fit=crop", // Fresh produce banner
  "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1340&h=740&fit=crop", // Fresh fruits banner
  "https://images.unsplash.com/photo-1597362925123-77860d3edb7c?w=1340&h=740&fit=crop", // Fresh vegetables banner
  "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1340&h=740&fit=crop", // Dairy products banner
];

// Mock data for offer images
const mockOfferImages: OfferImage[] = [
  {
    id: 1,
    type: "Default",
    name: "Special Offer Banner",
    image: offerImageUrls[0],
    status: "active",
  },
  {
    id: 2,
    type: "Banner",
    name: "Flash Sale Offer",
    image: offerImageUrls[1],
    status: "active",
  },
  {
    id: 3,
    type: "Promotional",
    name: "Festival Discount",
    image: offerImageUrls[2],
    status: "active",
  },
  {
    id: 4,
    type: "Default",
    name: "Weekend Deal",
    image: offerImageUrls[3],
    status: "inactive",
  },
  {
    id: 5,
    type: "Banner",
    name: "New Year Sale",
    image: offerImageUrls[4],
    status: "active",
  },
];

const ManageOfferImages = () => {
  const navigate = useNavigate();
  const [offerImages, setOfferImages] = useState<OfferImage[]>(mockOfferImages);
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

  useEffect(() => {
    fetchOfferImages();
  }, []);

  const fetchOfferImages = async () => {
    try {
      setLoading(true);
      // Using mock data for now - replace with API call when ready
      // const data = await offerImagesAPI.getAll();
      // setOfferImages(Array.isArray(data) ? data : data.offerImages || []);
      setOfferImages(mockOfferImages);
    } catch (error) {
      console.error("Error fetching offer images:", error);
      setOfferImages(mockOfferImages);
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
  const filteredAndSortedOfferImages = useMemo(() => {
    let filtered = [...offerImages];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toString().includes(term) ||
          o.type.toLowerCase().includes(term) ||
          o.name.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((o) => o.type === typeFilter);
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
  }, [
    offerImages,
    searchTerm,
    statusFilter,
    typeFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(
    filteredAndSortedOfferImages.length / itemsPerPage
  );
  const paginatedOfferImages = filteredAndSortedOfferImages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setTypeFilter("");
    setCurrentPage(1);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      // Using mock data for now - replace with API call when ready
      // await offerImagesAPI.delete(deleteConfirm.id);
      setOfferImages(offerImages.filter((oi) => oi.id !== deleteConfirm.id));
      alert("Offer image deleted successfully!");
    } catch (error: unknown) {
      console.error("Error deleting offer image:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Error deleting offer image. Please try again.";
      alert(message);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const totalOfferImages = offerImages.length;
    const activeOfferImages = offerImages.filter(
      (oi) => oi.status === "active"
    ).length;
    const inactiveOfferImages = offerImages.filter(
      (oi) => oi.status === "inactive"
    ).length;
    const bannerOfferImages = offerImages.filter(
      (oi) => oi.type === "Banner"
    ).length;

    return [
      {
        title: "Total Offer Images",
        value: totalOfferImages.toLocaleString(),
        icon: Camera,
        variant: "purple" as const,
      },
      {
        title: "Active Offer Images",
        value: activeOfferImages.toLocaleString(),
        icon: Camera,
        variant: "yellow" as const,
      },
      {
        title: "Inactive Offer Images",
        value: inactiveOfferImages.toLocaleString(),
        icon: Camera,
        variant: "green" as const,
      },
      {
        title: "Banner Offer Images",
        value: bannerOfferImages.toLocaleString(),
        icon: Camera,
        variant: "purple" as const,
      },
    ];
  }, [offerImages]);

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (offerImage: OfferImage) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {offerImage.id}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "TYPE",
      sortable: true,
      render: (offerImage: OfferImage) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {offerImage.type}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "NAME",
      sortable: true,
      render: (offerImage: OfferImage) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {offerImage.name}
          </span>
        </div>
      ),
    },
    {
      key: "image",
      label: "IMAGE",
      sortable: false,
      render: (offerImage: OfferImage) => (
        <div className="flex items-center justify-center">
          {offerImage.image ? (
            <img
              src={offerImage.image}
              alt={offerImage.name}
              className="w-16 h-10 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center">
              <ImageIcon size={14} className="text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (offerImage: OfferImage) => (
        <div className="text-center">
          <Badge status={offerImage.status} size="sm" />
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (offerImage: OfferImage) => (
        <div className="flex items-center justify-center gap-2">
          <ViewIconButton
            onClick={() => navigate(`/offer-images/view/${offerImage.id}`)}
            size={14}
            tooltip="View"
          />
          <EditIconButton
            onClick={() => navigate(`/offer-images/edit/${offerImage.id}`)}
            size={14}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() => handleDeleteClick(offerImage.id)}
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
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            Offer Images
          </h1>
          <PrimaryButton
            onClick={() => navigate("/offer-images/create")}
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
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
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
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
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
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4" />
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
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedOfferImages}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(offerImage) => offerImage.id.toString()}
            emptyMessage="No offer images found"
            loading={loading}
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedOfferImages.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
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
                  Showing results{" "}
                  <span className="text-orange-600 font-medium">
                    {itemsPerPage}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 font-medium">
                    {filteredAndSortedOfferImages.length.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedOfferImages.length}
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
        title="Delete Offer Image"
        message="Are you sure you want to delete this offer image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageOfferImages;
