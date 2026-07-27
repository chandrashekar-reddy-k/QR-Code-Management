import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Image as ImageIcon,
  Filter,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  SearchInput,
  ConfirmModal,
  DataTable,
  Pagination,
  SelectInput,
  StatCard,
  PrimaryButton,
  EditIconButton,
  DeleteIconButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  formatSlotDate,
  formatCreatedDate,
} from "../../../utils/formatters/dateTimeFormatters";
import useDebounce from "../../../hooks/useDebounce";
import { useGetBanners, useToggleBannerStatus, useDeleteBanner } from "../../../hooks/banners";
import {
  Banner,
  BannersApiResponse,
  BannersQuery,
} from "../../../types/banner.types";

const INITIAL_QUERY: BannersQuery = {
  search: "",
  status: "",
  isActive: "",
  bannerType: "",
  page: 1,
  limit: 10,
};

const STATUS_OPTIONS = [
  { value: "", label: "Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ITEMS_PER_PAGE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

const isActiveStatus = (banner: Banner) =>
  typeof banner.isActive === "boolean"
    ? banner.isActive
    : String(banner.status ?? "").toUpperCase() === "ACTIVE";

const ManageBanners = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState<BannersQuery>(INITIAL_QUERY);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 400);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });
  const toggleBannerStatusMutation = useToggleBannerStatus();
  const deleteBannerMutation = useDeleteBanner();

  useEffect(() => {
    setQuery((prev) =>
      prev.search === debouncedSearchTerm && prev.page === 1
        ? prev
        : { ...prev, search: debouncedSearchTerm, page: 1 },
    );
  }, [debouncedSearchTerm]);

  const { data, isLoading, isFetching } = useGetBanners({
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    bannerType: query.bannerType,
    enabled: true,
  });

  const apiResponse = data as BannersApiResponse | undefined;
  const banners = apiResponse?.data?.banners ?? [];
  const bannersWithSerial = useMemo(
    () =>
      banners.map((banner, index) => ({
        ...banner,
        serialNumber: (query.page - 1) * query.limit + index + 1,
      })),
    [banners, query.page, query.limit],
  );
  const totalCount = Number(apiResponse?.pagination?.total ?? 0);
  const totalPages = Number(apiResponse?.pagination?.totalPages ?? 1);

  const handleResetFilters = () => {
    setSearchTerm("");
    setQuery(INITIAL_QUERY);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      await deleteBannerMutation.mutateAsync(String(deleteConfirm.id));
    } catch (error: unknown) {
      console.error("Error deleting banner:", error);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleStatusToggle = (id: number) => {
    setUpdatingStatusId(id);
    toggleBannerStatusMutation.mutate(id, {
      onSettled: () => setUpdatingStatusId(null),
      onError: (error) => {
        console.error("Error updating status:", error);
      },
    });
  };

  const kpiData = useMemo(() => {
    const stats = apiResponse?.data?.stats;
    const totalBanners = Number(stats?.totalRecords ?? totalCount);
    const activeBanners = Number(
      stats?.active ?? banners.filter((b) => isActiveStatus(b)).length,
    );
    const inactiveBanners = Number(
      stats?.inactive ?? banners.filter((b) => !isActiveStatus(b)).length,
    );

    return [
      {
        title: "Total Banners",
        value: totalBanners.toLocaleString(),
        icon: ImageIcon,
        variant: "purple" as const,
      },
      {
        title: "Active Banners",
        value: activeBanners.toLocaleString(),
        icon: ImageIcon,
        variant: "yellow" as const,
      },
      {
        title: "Inactive Banners",
        value: inactiveBanners.toLocaleString(),
        icon: ImageIcon,
        variant: "green" as const,
      },
    ];
  }, [apiResponse?.data?.stats, banners, totalCount]);

  const columns = [
    {
      key: "serialNumber",
      label: "ID",
      sortable: false,
      render: (banner: Banner & { serialNumber: number }) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {banner.serialNumber}
          </span>
        </div>
      ),
    },
    {
      key: "title",
      label: "BANNER NAME",
      sortable: true,
      sortValue: (banner: Banner) =>
        (banner.title || banner.bannerName || "").toLowerCase(),
      render: (banner: Banner) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {banner.title || banner.bannerName || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "image",
      label: "IMAGE",
      sortable: false,
      render: (banner: Banner) => (
        <div className="flex items-center justify-center">
          {banner.imageUrl || banner.image ? (
            <img
              src={banner.imageUrl || banner.image}
              alt={banner.title || banner.bannerName || "Banner"}
              className="w-12 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
              <ImageIcon
                size={12}
                className="text-gray-400"
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "bannerType",
      label: "BANNER TYPE",
      sortable: true,
      sortValue: (banner: Banner) =>
        (banner.bannerType || banner.whereToShow || "").toLowerCase(),
      render: (banner: Banner) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {banner.bannerType || banner.whereToShow || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "position",
      label: "POSITION",
      sortable: true,
      render: (banner: Banner) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {banner.position}
          </span>
        </div>
      ),
    },
    {
      key: "startAt",
      label: "START DATE",
      sortable: true,
      sortValue: (banner: Banner) => {
        const rawDate = banner.startAt || banner.startDate;
        if (!rawDate) return null;
        const time = new Date(rawDate).getTime();
        return Number.isNaN(time) ? null : time;
      },
      render: (banner: Banner) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {formatSlotDate(banner.startAt || banner.startDate || "") || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "endAt",
      label: "END DATE",
      sortable: true,
      sortValue: (banner: Banner) => {
        const rawDate = banner.endAt || banner.endDate;
        if (!rawDate) return null;
        const time = new Date(rawDate).getTime();
        return Number.isNaN(time) ? null : time;
      },
      render: (banner: Banner) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {formatSlotDate(banner.endAt || banner.endDate || "") || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (banner: Banner) => {
        const isActive = isActiveStatus(banner);
        const isUpdating = updatingStatusId === banner.id;
        return (
          <div className="text-center flex items-center justify-center">
            <button
              onClick={() => handleStatusToggle(banner.id)}
              disabled={isUpdating}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                ${
                  isActive
                    ? "bg-green-500 dark:bg-green-600"
                    : "bg-gray-300 dark:bg-gray-600"
                }
                ${
                  isUpdating
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }
              `}
              title={isActive ? "Click to deactivate" : "Click to activate"}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${isActive ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "CREATED ON",
      sortable: true,
      render: (banner: Banner) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {banner.createdAt ? formatCreatedDate(banner.createdAt) : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (banner: Banner) => (
        <div className="flex items-center justify-end gap-2">
          <EditIconButton
            onClick={() =>
              navigate(`/banners/edit/${banner.id}`, { state: { banner } })
            }
            size={14}
            tooltip="Edit"
          />
          <DeleteIconButton
            onClick={() => handleDeleteClick(banner.id)}
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
            Banners
          </h1>
          <PrimaryButton
            onClick={() => navigate("/banners/create")}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add Banner</span>
          </PrimaryButton>
        </div>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
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
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:w-auto lg:flex-none lg:max-w-none overflow-hidden">
          {/* Filter icon */}
          <div className="px-3 py-3 sm:py-4 flex items-center justify-center flex-shrink-0 sm:w-12">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* Status Filter */}
          <div className="px-3 py-3 sm:py-4 flex-1 min-w-0 sm:min-w-[150px] relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={query.status}
                onChange={(e) =>
                  setQuery((prev) => ({
                    ...prev,
                    status: e.target.value,
                    page: 1,
                  }))
                }
                options={STATUS_OPTIONS}
                className="bg-transparent dark:bg-transparent"
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 py-3 sm:py-4 flex-shrink-0 sm:min-w-[120px]">
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
        <div className="w-full lg:w-auto lg:min-w-[220px] lg:flex-shrink-0">
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
            data={bannersWithSerial}
            columns={columns}
            keyExtractor={(banner) => banner.id.toString()}
            emptyMessage="No banners found"
            loading={isLoading || isFetching}
          />
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                  <SelectInput
                    value={query.limit.toString()}
                    onChange={(e) => {
                      setQuery((prev) => ({
                        ...prev,
                        limit: Number(e.target.value),
                        page: 1,
                      }));
                    }}
                    options={ITEMS_PER_PAGE_OPTIONS}
                    className="w-16 sm:w-20 h-7 text-xs"
                  />
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {Math.min((query.page - 1) * query.limit + 1, totalCount)}
                  </span>{" "}
                  to{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {Math.min(query.page * query.limit, totalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="text-orange-600 dark:text-orange-500 font-medium">
                    {totalCount.toLocaleString()}
                  </span>
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={query.page}
                  pagination={{
                    page: query.page,
                    limit: query.limit,
                    total: totalCount,
                    totalPages,
                    hasNext: query.page < totalPages,
                    hasPrev: query.page > 1,
                  }}
                  onPageChange={(page) =>
                    setQuery((prev) => ({ ...prev, page }))
                  }
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
        title="Delete Banner"
        message="Are you sure you want to delete this banner? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManageBanners;
