import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  SearchInput,
  DataTable,
  Pagination,
  ConfirmModal,
  EditIconButton,
  DeleteIconButton,
  PrimaryButton,
  SelectInput,
  Button,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  useGetRouteMaps,
  useDeleteRouteMap,
  useGetSlots,
  useDeleteSlot,
  type RouteMapItem,
  type SlotItem,
} from "../../../hooks/deliverySettings";

// Use shared type for Route Map (alias for table)
type RouteMap = RouteMapItem;

// Table display type for delivery slot (mapped from API SlotItem)
interface DeliverySlot {
  id: number;
  slotDate: string;
  slotTime: string;
  routeArea: string;
  orderPerSlot: number;
  repeat: string;
  createdAt: string;
}

const formatSlotDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day.toString().padStart(2, "0")}-${month.toString().padStart(2, "0")}-${year}`;
};

const formatSlotTime = (start: string, end: string): string => {
  if (!start || !end) return "";
  const toDisplay = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };
  return `${toDisplay(start)} - ${toDisplay(end)}`;
};

const formatRepeat = (slot: SlotItem): string => {
  if (!slot.isRepeat) return "Once";
  const rt = slot.repeatType;
  if (rt === "MON_FRI") return "Mon - Fri";
  if (rt === "SUN") return "Sun";
  if (rt === "CUSTOM" && slot.customDays?.length) return slot.customDays.join(", ");
  return rt ?? "Once";
};

// Format date and time
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${day}-${month}-${year}, ${displayHours}:${displayMinutes} ${ampm}`;
};


const ScheduledDelivery = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as { activeTab?: "route-map" | "delivery-slots" } | null) || null;
  const [activeTab, setActiveTab] = useState<"route-map" | "delivery-slots">(
    locationState?.activeTab === "delivery-slots" ? "delivery-slots" : "route-map"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

  // Route maps from API (only fetch when on route map tab)
  const { data: routeMapsData, isLoading: routeMapsLoading,  isFetching: routeMapsFetching, refetch: refetchRouteMaps } = useGetRouteMaps({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    enabled: activeTab === "route-map",
  });
  const deleteRouteMapMutation = useDeleteRouteMap();

  // Normalize route maps list from API (data may be array or { routeMaps: [] })
  const routeMaps: RouteMap[] = useMemo(() => {
    const raw = routeMapsData?.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "routeMaps" in raw) return (raw as { routeMaps: RouteMap[] }).routeMaps ?? [];
    return [];
  }, [routeMapsData?.data]);

  const routeMapsPagination = routeMapsData?.pagination;
  const routeMapsTotal = routeMapsPagination?.total ?? routeMaps.length;
  const routeMapsTotalPages = routeMapsPagination?.totalPages ?? Math.max(1, Math.ceil(routeMapsTotal / itemsPerPage));

  // Delivery slots from API (only fetch when on delivery-slots tab)
  const { data: slotsData, isLoading: slotsLoading,isFetching, refetch: refetchSlots } = useGetSlots({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    enabled: activeTab === "delivery-slots",
  });
  const deleteSlotMutation = useDeleteSlot();

  const rawSlots: SlotItem[] = useMemo(() => {
    const raw = slotsData?.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "slots" in raw) return (raw as { slots: SlotItem[] }).slots ?? [];
    return [];
  }, [slotsData?.data]);

  const deliverySlots: DeliverySlot[] = useMemo(
    () =>
      rawSlots.map((s) => ({
        id: s.id,
        slotDate: formatSlotDate(s.slotDate),
        slotTime: formatSlotTime(s.startTime, s.endTime),
        routeArea: (s as any).routeArea ?? s.routeMap?.area ?? s.routeMapId ?? "",
        orderPerSlot: s.ordersPerSlot ?? 0,
        repeat: formatRepeat(s),
        createdAt: s.createdAt,
      })),
    [rawSlots]
  );

  const slotsPagination = slotsData?.pagination;
  const slotsTotal = slotsPagination?.total ?? deliverySlots.length;
  const slotsTotalPages = slotsPagination?.totalPages ?? Math.max(1, Math.ceil(slotsTotal / itemsPerPage));

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setSortField(null);
    setSortDirection(null);
  }, [activeTab]);

  // Sort route maps (client-side sort on current page; search is server-side)
  const filteredAndSortedRouteMaps = useMemo(() => {
    if (!sortField) return routeMaps;
    return [...routeMaps].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      switch (sortField) {
        case "id":
          aValue = a.id;
          bValue = b.id;
          break;
        case "area":
          aValue = a.area.toLowerCase();
          bValue = b.area.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      if (sortDirection === "asc") return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });
  }, [routeMaps, sortField, sortDirection]);

  // Sort delivery slots (client-side sort on current page; search is server-side)
  const filteredAndSortedDeliverySlots = useMemo(() => {
    if (!sortField) return deliverySlots;
    return [...deliverySlots].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      switch (sortField) {
        case "id":
          aValue = a.id;
          bValue = b.id;
          break;
        case "slotDate":
          aValue = new Date(a.slotDate.split("-").reverse().join("-")).getTime();
          bValue = new Date(b.slotDate.split("-").reverse().join("-")).getTime();
          break;
        case "routeArea":
          aValue = a.routeArea.toLowerCase();
          bValue = b.routeArea.toLowerCase();
          break;
        case "orderPerSlot":
          aValue = a.orderPerSlot;
          bValue = b.orderPerSlot;
          break;
        case "repeat":
          aValue = a.repeat.toLowerCase();
          bValue = b.repeat.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      if (sortDirection === "asc") return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });
  }, [deliverySlots, sortField, sortDirection]);

  // Get current data and pagination based on active tab (route maps = API; delivery slots = client-side)
  const currentData = activeTab === "route-map" ? filteredAndSortedRouteMaps : filteredAndSortedDeliverySlots;
  const totalPages = activeTab === "route-map" ? routeMapsTotalPages : slotsTotalPages;
  const paginatedData = activeTab === "route-map"
    ? filteredAndSortedRouteMaps
    : filteredAndSortedDeliverySlots;
  const totalCount = activeTab === "route-map" ? routeMapsTotal : slotsTotal;

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

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id === null) return;

    if (activeTab === "route-map") {
      deleteRouteMapMutation.mutate(deleteConfirm.id, {
        onSettled: () => setDeleteConfirm({ isOpen: false, id: null }),
      });
    } else {
      deleteSlotMutation.mutate(deleteConfirm.id, {
        onSettled: () => setDeleteConfirm({ isOpen: false, id: null }),
      });
    }
  };

  const handleRefresh = () => {
    if (activeTab === "route-map") refetchRouteMaps();
    else refetchSlots();
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Table columns for Route Map
  const routeMapColumns = [
    {
      key: "id",
      label: "ID",
      sortable: false,
      render: (routeMap: RouteMap) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {routeMap.id}
          </span>
        </div>
      ),
    },
    {
      key: "area",
      label: "AREA",
      sortable: true,
      render: (routeMap: RouteMap) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {routeMap.area}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "CREATED ON",
      sortable: true,
      render: (routeMap: RouteMap) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {formatDateTime(routeMap.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (routeMap: RouteMap) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <EditIconButton
              onClick={() =>
                navigate(`/delivery-settings/scheduled-delivery/edit/${routeMap.id}`, {
                  state: { routeMap: { id: routeMap.id, area: routeMap.area } },
                })
              }
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(routeMap.id)}
              size={12}
              tooltip="Delete"
            />
          </div>
        </div>
      ),
    },
  ];

  // Table columns for Delivery Slots
  const deliverySlotColumns = [
    {
      key: "id",
      label: "ID",
      sortable: false,
      render: (slot: DeliverySlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.id}
          </span>
        </div>
      ),
    },
    {
      key: "slotDate",
      label: "SLOT DATE",
      sortable: true,
      render: (slot: DeliverySlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.slotDate}
          </span>
        </div>
      ),
    },
    {
      key: "slotTime",
      label: "SLOT Time",
      sortable: false,
      render: (slot: DeliverySlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.slotTime}
          </span>
        </div>
      ),
    },
    {
      key: "routeArea",
      label: "ROUTE/AREA",
      sortable: true,
      render: (slot: DeliverySlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.routeArea}
          </span>
        </div>
      ),
    },
    {
      key: "orderPerSlot",
      label: "ORDER PER SLOT",
      sortable: true,
      render: (slot: DeliverySlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.orderPerSlot.toString().padStart(2, "0")}
          </span>
        </div>
      ),
    },
    {
      key: "repeat",
      label: "REPEAT",
      sortable: true,
      render: (slot: DeliverySlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.repeat}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "CREATED ON",
      sortable: true,
      render: (slot: DeliverySlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {formatDateTime(slot.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (slot: DeliverySlot) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <EditIconButton
              onClick={() => {
                const raw = rawSlots.find((s) => s.id === slot.id);
                navigate(`/delivery-settings/scheduled-delivery/edit-slot/${slot.id}`, {
                  state: raw ? { slot: raw } : undefined,
                });
              }}
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(slot.id)}
              size={12}
              tooltip="Delete"
            />
          </div>
        </div>
      ),
    },
  ];


  const isRefreshing =
  activeTab === "route-map"
    ? routeMapsFetching
    : isFetching;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Scheduled Delivery
        </h1>
        <PrimaryButton
          onClick={() => {
            if (activeTab === "delivery-slots") {
              navigate("/delivery-settings/scheduled-delivery/create-slot");
            } else {
              navigate("/delivery-settings/scheduled-delivery/create-route-map");
            }
          }}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">
            {activeTab === "delivery-slots" ? "Create Slot" : "Create Route Map"}
          </span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto tabs-scrollbar">
          <button
            onClick={() => setActiveTab("route-map")}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "route-map"
          ? 'text-gray-900 border-b-2 border-orange-500 dark:border-orange-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Route Map
            {activeTab === "route-map" && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-600 dark:bg-orange-400"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("delivery-slots")}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === "delivery-slots"
                ? "text-gray-900 border-b-2 border-orange-500 dark:border-orange-400"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Delivery Slots
            {activeTab === "delivery-slots" && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-600 dark:bg-orange-400"></div>
            )}
          </button>
        </div>
      </div>

      {/* Refresh and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Refresh Button */}
        <div className="w-full sm:w-auto">
           <Button
            onClick={handleRefresh}
           disabled={isRefreshing}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              size={14}
              className={`sm:w-4 sm:h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-auto sm:min-w-[200px] sm:flex-shrink-0">
          <SearchInput
            placeholder="Search area"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "route-map" ? (
            routeMapsLoading ? (
              <div className="flex items-center justify-center min-h-[200px] text-gray-500">
                Loading...
              </div>
            ) : (
              <DataTable
                data={paginatedData as RouteMap[]}
                columns={routeMapColumns}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                loading={routeMapsFetching}
                keyExtractor={(item) => item.id.toString()}
                emptyMessage="No route maps found"
              />
            )
          ) : slotsLoading ? (
            <div className="flex items-center justify-center min-h-[200px] text-gray-500">
              Loading...
            </div>
          ) : (
            <DataTable
              data={paginatedData as DeliverySlot[]}
              columns={deliverySlotColumns}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              loading={isFetching}
              keyExtractor={(item) => item.id.toString()}
              emptyMessage="No delivery slots found"
            />
          )}
        </div>

        {/* Pagination */}
        {(totalCount > 0 || currentData.length > 0) && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">
                  Show
                </span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-400 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
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
                  {Math.min(currentPage * itemsPerPage, totalCount)}{" "}
                  of {totalCount}
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  pagination={{
                    page: currentPage,
                    limit: itemsPerPage,
                    total: totalCount,
                    totalPages: totalPages,
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
        title={activeTab === "route-map" ? "Delete Route Map" : "Delete Delivery Slot"}
        message={`Are you sure you want to delete this ${activeTab === "route-map" ? "route map" : "delivery slot"}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default ScheduledDelivery;
