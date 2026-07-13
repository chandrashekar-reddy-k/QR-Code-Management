import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, RefreshCw } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  useGetPickupSlots,
  useDeletePickupSlot,
  PickupSlotItem,
} from "../../../hooks/deliverySettings";


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

const formatRepeat = (slot: PickupSlotItem): string => {
  if (!slot.repeat) return "Once";
  const rt = slot.repeatType;
  if (rt === "MON_FRI") return "Mon - Fri";
  if (rt === "SUN") return "Sun";
  if (rt === "CUSTOM" && slot.customDays?.length) return slot.customDays.join(", ");
  if (rt === "ONCE") return "Once";
  return rt ?? "Once";
};

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

const StorePickup = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  });

  // API: Get pickup slots
  const {
    data: pickupSlotsData,
    isLoading,
    isFetching,
    refetch,
  } = useGetPickupSlots({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    enabled: true,
  });
  const deletePickupSlotMutation = useDeletePickupSlot();

  // Normalize pickup slots list from API (data may be array or { pickupSlots: [] })
  const rawSlots: PickupSlotItem[] = useMemo(() => {
    const raw = pickupSlotsData?.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "pickupSlots" in raw) return (raw as { pickupSlots: PickupSlotItem[] }).pickupSlots ?? [];
    return [];
  }, [pickupSlotsData?.data]);

  // Map to table display type
  const slots = useMemo(() =>
    rawSlots.map((s) => ({
      id: s.id,
      slotDate: formatSlotDate(s.date),
      slotTime: formatSlotTime(s.startTime, s.endTime),
      repeat: formatRepeat(s),
      createdOn: s.createdAt,
      raw: s,
    })),
    [rawSlots]
  );

  // Pagination
  const slotsPagination = pickupSlotsData?.pagination;
  const totalCount = slotsPagination?.total ?? slots.length;
  const totalPages = slotsPagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // Sort (client-side for now)
  const filteredAndSortedSlots = useMemo(() => {
    let data = slots;
    if (sortField) {
      data = [...data].sort((a, b) => {
        let aValue: string | number = a[sortField as keyof typeof a] as any;
        let bValue: string | number = b[sortField as keyof typeof b] as any;
        if (typeof aValue === "string") aValue = aValue.toLowerCase();
        if (typeof bValue === "string") bValue = bValue.toLowerCase();
        if (sortDirection === "asc") return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      });
    }
    return data;
  }, [slots, sortField, sortDirection]);

  const paginatedSlots = filteredAndSortedSlots;

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

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id == null) return;
    deletePickupSlotMutation.mutate(deleteConfirm.id, {
      onSettled: () => setDeleteConfirm({ isOpen: false, id: null }),
    });
  };

  const handleRefresh = () => {
    refetch();
    setSearchTerm("");
    setCurrentPage(1);
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: false,
      render: (slot: any) => (
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
      render: (slot: any) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.slotDate}
          </span>
        </div>
      ),
    },
    {
      key: "slotTime",
      label: "SLOT TIME",
      sortable: false,
      render: (slot: any) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.slotTime}
          </span>
        </div>
      ),
    },
    {
      key: "repeat",
      label: "REPEAT",
      sortable: true,
      render: (slot: any) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.repeat}
          </span>
        </div>
      ),
    },
    {
      key: "createdOn",
      label: "CREATED ON",
      sortable: true,
      render: (slot: any) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {formatDateTime(slot.createdOn)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (slot: any) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <EditIconButton
              onClick={() =>
                navigate(`/delivery-settings/store-pickup/edit-slot/${slot.id}`, {
                  state: slot.raw ? { slot: slot.raw } : undefined,
                })
              }
              size={12}
              tooltip="Edit"
            />
            <DeleteIconButton
              onClick={() => handleDeleteClick(slot.id)}
              size={12}
              tooltip="Delete"
              disabled={deletePickupSlotMutation.isLoading && deleteConfirm.id === slot.id}
            />
          </div>
        </div>
      ),
    },
  ];


  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title & Create Slot Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Store Pickup
        </h1>
        <PrimaryButton
          onClick={() =>
            navigate("/delivery-settings/store-pickup/create-slot")
          }
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Create Slot</span>
        </PrimaryButton>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Refresh & Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="w-full sm:w-auto">
          <Button
            onClick={handleRefresh}
            variant="ghost"
            className="flex items-center gap-1.5 h-10 px-3 sm:px-4 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium bg-white disabled:opacity-50"
            title="Refresh"
            disabled={isFetching}
          >
            <RefreshCw size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* <div className="w-full sm:w-auto sm:min-w-[200px] sm:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div> */}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedSlots}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading || isFetching}
            keyExtractor={(item) => item.id.toString()}
            emptyMessage="No store pickup slots found"
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                </span>
              </div>

              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination
                  currentPage={currentPage}
                  pagination={{
                    page: currentPage,
                    limit: itemsPerPage,
                    total: totalCount,
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

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Slot"
        message="Are you sure you want to delete this store pickup slot? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deletePickupSlotMutation.isLoading}
      />
    </div>
  );
};

export default StorePickup;

