import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Tag, Filter, ChevronDown, RotateCcw } from "lucide-react";
// import { promoCodesAPI } from '../../../lib/api';
import { PromoCode } from "../../../types";
import { formatCurrency } from "../../../utils/formatters";
import {
  formatDateTime,
  formatCreatedDate,
} from "../../../utils/formatters/dateTimeFormatters";
import {
  useGetPromoCodes,
  useTogglePromoCodeStatus,
} from "../../../hooks/promoCodes";
import useDebounce from "../../../hooks/useDebounce";
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

type PromoCodeQuery = {
  search: string;
  status: string;
  discountType: string;
  page: number;
  limit: number;
};

type PromoCodeRow = PromoCode & {
  id: string;
  value?: number | null;
  maxDiscountAmount?: number | null;
  percentageOff?: number | null;
  appicableOn?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  noOfUsers?: number | null;
  approvalStatus?: string;
  status: "ACTIVE" | "INACTIVE";
  discountType: PromoCode["discountType"] | "RUPEES" | "PERCENTAGE" | "AMOUNT";
};

type PromoCodesApiResponse = {
  data?: {
    coupons?: PromoCodeRow[];
    promoCodes?: PromoCodeRow[];
    stats?: {
      totalRecords?: number;
      active?: number;
      inactive?: number;
    };
  };
  pagination?: {
    total?: number;
    totalPages?: number;
  };
};

const isFlatDiscountType = (discountType: string | undefined) =>
  discountType === "AMOUNT" ||
  discountType === "RUPEES" ||
  discountType === "amount";

const isPercentageDiscountType = (discountType: string | undefined) =>
  discountType === "PERCENTAGE" || discountType === "percentage";

const INITIAL_QUERY: PromoCodeQuery = {
  search: "",
  status: "",
  discountType: "",
  page: 1,
  limit: 10,
};

const STATUS_OPTIONS = [
  { value: "", label: "Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "", label: "Discount Type" },
  { value: "amount", label: "Flat" },
  { value: "percentage", label: "Percentage" },
];

const ITEMS_PER_PAGE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

const ManagePromoCodes = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState<PromoCodeQuery>(INITIAL_QUERY);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm.trim(), 400);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const togglePromoCodeStatusMutation = useTogglePromoCodeStatus();

  useEffect(() => {
    setQuery((prev) => {
      if (prev.search === debouncedSearchTerm && prev.page === 1) return prev;
      return {
        ...prev,
        search: debouncedSearchTerm,
        page: 1,
      };
    });
  }, [debouncedSearchTerm]);

  const { data, isLoading, isFetching } = useGetPromoCodes({
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    discountType: query.discountType,
    enabled: true,
  });
  const apiResponse = data as PromoCodesApiResponse | undefined;
  const promoCodes =
    apiResponse?.data?.coupons ?? apiResponse?.data?.promoCodes ?? [];
  const promoCodesWithSerial = useMemo(
    () =>
      promoCodes.map((promoCode, index) => ({
        ...promoCode,
        serialNumber: (query.page - 1) * query.limit + index + 1,
      })),
    [promoCodes, query.page, query.limit],
  );
  const totalCount = Number(
    apiResponse?.pagination?.total ??
      apiResponse?.data?.stats?.totalRecords ??
      promoCodes.length,
  );
  const totalPagesRaw = apiResponse?.pagination?.totalPages;
  const totalPages =
    totalPagesRaw != null && totalPagesRaw > 0
      ? Number(totalPagesRaw)
      : Math.max(1, Math.ceil(totalCount / query.limit) || 1);

  const handleResetFilters = () => {
    setSearchTerm("");
    setQuery(INITIAL_QUERY);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    try {
      // TODO: wire delete promo code API endpoint.
    } catch (error: unknown) {
      console.error("Error deleting promo code:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Error deleting promo code. Please try again.";
      alert(message);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleStatusToggle = (id: string) => {
    setUpdatingStatusId(id);
    togglePromoCodeStatusMutation.mutate(id, {
      onSettled: () => setUpdatingStatusId(null),
      onError: (error) => {
        console.error("Error updating status:", error);
      },
    });
  };

  // Calculate KPI metrics
  const kpiData = useMemo(() => {
    const stats = apiResponse?.data?.stats;
    const totalPromoCodes = Number(stats?.totalRecords ?? totalCount);
    const activePromoCodes = Number(stats?.active ?? 0);
    const inactivePromoCodes = Number(stats?.inactive ?? 0);
    const totalUsers = promoCodes.reduce(
      (sum, pc) => sum + (pc.noOfUsers ?? 0),
      0,
    );

    return [
      {
        title: "Total Promo Codes",
        value: totalPromoCodes.toLocaleString(),
        icon: Tag,
        variant: "purple" as const,
      },
      {
        title: "Active Promo Codes",
        value: activePromoCodes.toLocaleString(),
        icon: Tag,
        variant: "yellow" as const,
      },
      {
        title: "Inactive Promo Codes",
        value: inactivePromoCodes.toLocaleString(),
        icon: Tag,
        variant: "green" as const,
      },
      {
        title: "Total Promo Codes (Page)",
        value: promoCodes.length.toLocaleString(),
        icon: Tag,
        variant: "red" as const,
      },
      {
        title: "Total Users",
        value: formatCurrency(totalUsers),
        icon: Tag,
        variant: "purple" as const,
      },
    ];
  }, [apiResponse?.data?.stats, promoCodes, totalCount]);

  // Table columns
  const columns = [
    {
      key: "serialNumber",
      label: "ID",
      sortable: false,
      render: (promoCode: PromoCodeRow & { serialNumber: number }) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {promoCode.serialNumber}
          </span>
        </div>
      ),
    },
    {
      key: "promoCode",
      label: "CODE NAME",
      sortable: true,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 font-medium">
            {promoCode.promoCode}
          </span>
        </div>
      ),
    },
    {
      key: "discountType",
      label: "DISCOUNT TYPE",
      sortable: true,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 capitalize">
            {isFlatDiscountType(promoCode.discountType)
              ? "Flat"
              : isPercentageDiscountType(promoCode.discountType)
                ? "Percentage"
                : promoCode.discountType}
          </span>
        </div>
      ),
    },
    {
      key: "flatAmount",
      label: "FLAT AMOUNT",
      sortable: true,
      sortValue: (promoCode: PromoCodeRow) =>
        isFlatDiscountType(promoCode.discountType)
          ? Number(promoCode.discount ?? promoCode.value ?? 0)
          : null,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {isFlatDiscountType(promoCode.discountType)
              ? (promoCode.discount ?? promoCode.value ?? "-")
              : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "percentage",
      label: "PERCENTAGE",
      sortable: true,
      sortValue: (promoCode: PromoCodeRow) =>
        isPercentageDiscountType(promoCode.discountType)
          ? Number(promoCode.percentageOff ?? promoCode.value ?? 0)
          : null,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {isPercentageDiscountType(promoCode.discountType)
              ? (promoCode.percentageOff ?? promoCode.value ?? "-")
              : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "minimumOrderAmount",
      label: "MINIMUM ORDER VALUE",
      sortable: false,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {promoCode.minimumOrderAmount}
          </span>
        </div>
      ),
    },
    {
      key: "maxDiscount",
      label: "MAX. DISCOUNT",
      sortable: false,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {promoCode.maxDiscountAmount ?? "-"}
          </span>
        </div>
      ),
    },
    {
      key: "startDateTime",
      label: "START DATE/TIME",
      sortable: false,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {promoCode.startDate
              ? formatDateTime(
                  `${promoCode.startDate.split("T")[0]}T${promoCode.startTime || "00:00"}:00`,
                )
              : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "endDateTime",
      label: "END DATE/TIME",
      sortable: false,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {promoCode.endDate
              ? formatDateTime(
                  `${promoCode.endDate.split("T")[0]}T${promoCode.endTime || "00:00"}:00`,
                )
              : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "repeatUsage",
      label: "REPEAT USAGE",
      sortable: false,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {promoCode.repeatUsage ?? "-"}
          </span>
        </div>
      ),
    },
    {
      key: "appicableOn",
      label: "APPLICABLE ON",
      sortable: true,
      render: (promoCode: PromoCodeRow) => (
        <div className="text-left">
          <span className="text-xs sm:text-sm text-gray-800">
            {promoCode.appicableOn ?? "-"}
          </span>
        </div>
      ),
    },
    {
      key: "approvalStatus",
      label: "APPROVAL STATUS",
      sortable: true,
      render: (promoCode: PromoCodeRow) => {
        const rawStatus = (
          promoCode.approvalStatus ||
          (promoCode.status === "ACTIVE" ? "APPROVED" : "PENDING")
        ).toUpperCase();

        if (rawStatus === "APPROVED" || rawStatus === "COMPLETED") {
          return (
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Completed
              </span>
            </div>
          );
        }

        if (rawStatus === "REJECTED") {
          return (
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Rejected
              </span>
            </div>
          );
        }

        return (
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Pending
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "ACTIVE STATUS",
      sortable: true,
      render: (promoCode: PromoCodeRow) => {
        const isActive = promoCode.status === "ACTIVE";
        const isUpdating = updatingStatusId === promoCode.id;
        return (
          <div className="text-center flex items-center justify-center">
            <button
              onClick={() => {
                if (!isActive) {
                  alert("Activating a promo code requires Admin approval");
                  return;
                }
                handleStatusToggle(promoCode.id);
              }}
              disabled={isUpdating || !isActive}
              title={!isActive ? "Activating requires Admin approval" : "Deactivate promo code"}
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
      render: (promoCode: PromoCodeRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {promoCode.createdAt ? formatCreatedDate(promoCode.createdAt) : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (promoCode: PromoCodeRow) => (
        <div className="flex items-center justify-end gap-2">
          <EditIconButton
            onClick={() => navigate(`/promo-codes/edit/${promoCode.id}`)}
            size={14}
            tooltip="Edit"
          />
          {/* <DeleteIconButton
            onClick={() => handleDeleteClick(promoCode.id)}
            size={14}
            tooltip="Delete"
          /> */}
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
            Promo Codes
          </h1>
          <PrimaryButton
            onClick={() => navigate("/promo-codes/create")}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add Promo Code</span>
          </PrimaryButton>
        </div>
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
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

          {/* Discount Type Filter */}
          <div className="px-3 py-3 sm:py-4 flex-1 min-w-0 sm:min-w-[150px] relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={query.discountType}
                onChange={(e) =>
                  setQuery((prev) => ({
                    ...prev,
                    discountType: e.target.value,
                    page: 1,
                  }))
                }
                options={DISCOUNT_TYPE_OPTIONS}
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
            data={promoCodesWithSerial}
            columns={columns}
            keyExtractor={(promoCode) => promoCode.id.toString()}
            emptyMessage="No promo codes found"
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
        title="Delete Promo Code"
        message="Are you sure you want to delete this promo code? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ManagePromoCodes;
