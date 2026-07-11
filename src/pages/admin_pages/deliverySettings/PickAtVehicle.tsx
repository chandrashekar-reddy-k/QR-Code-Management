import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SearchInput,
  DataTable,
  Pagination,
  PrimaryButton,
  SelectInput,
  Button,
} from "../../../components/ui";
import { Plus, RefreshCw } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  useGetPickupSlots,
  PickupSlotItem,
} from "../../../hooks/deliverySettings";
import {
  formatSlotDate,
  formatSlotTime,
  formatRepeat,
  formatDateTime,
} from "../../../utils/formatters/dateTimeFormatters";

type PickupAtVehicleRow = {
  id: number;
  vehicleId: string | number;
  pickupDate: string;
  slotTime: string;
  repeat: string;
  createdOn: string;
};

const normalizePickupSlots = (data: unknown): PickupSlotItem[] => {
  if (Array.isArray(data)) return data as PickupSlotItem[];
  if (data && typeof data === "object" && "pickupSlots" in data) {
    return (data as { pickupSlots?: PickupSlotItem[] }).pickupSlots ?? [];
  }
  return [];
};

const PickAtVehicle = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const slots = normalizePickupSlots(pickupSlotsData?.data).map((slot) => {
    const vehicleSlot = slot as PickupSlotItem & {
      vehicleId?: string | number;
      vehicle_id?: string | number;
    };

    return {
      id: slot.id,
      vehicleId: vehicleSlot.vehicleId ?? vehicleSlot.vehicle_id ?? "-",
      pickupDate: formatSlotDate(slot.date),
      slotTime: formatSlotTime(slot.startTime, slot.endTime),
      repeat: formatRepeat(slot),
      createdOn: slot.createdAt,
    } satisfies PickupAtVehicleRow;
  });

  const slotsPagination = pickupSlotsData?.pagination;
  const totalCount = slotsPagination?.total ?? slots.length;
  const totalPages =
    slotsPagination?.totalPages ??
    Math.max(1, Math.ceil(totalCount / itemsPerPage));

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
      render: (slot: PickupAtVehicleRow) => {
        const idString = String(slot.id || "");
        const truncatedId =
          idString.length > 8 ? `${idString.slice(0, 8)}...` : idString;
        return (
          <div className="text-center">
            <span className="text-xs sm:text-sm text-gray-800">
              {truncatedId}
            </span>
          </div>
        );
      },
    },
    {
      key: "vehicleId",
      label: "VEHICLE ID",
      sortable: true,
      render: (slot: PickupAtVehicleRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.vehicleId}
          </span>
        </div>
      ),
    },
    {
      key: "pickupDate",
      label: "PICKUP DATE",
      sortable: true,
      render: (slot: PickupAtVehicleRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {slot.pickupDate}
          </span>
        </div>
      ),
    },
    {
      key: "slotTime",
      label: "SLOT TIME",
      sortable: false,
      render: (slot: PickupAtVehicleRow) => (
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
      render: (slot: PickupAtVehicleRow) => (
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
      render: (slot: PickupAtVehicleRow) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800">
            {formatDateTime(slot.createdOn)}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Pickup At Vehicle
        </h1>
        <PrimaryButton
          onClick={() =>
            navigate("/delivery-settings/pick-at-vehicle/create-slot")
          }
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Create Slot</span>
        </PrimaryButton>
      </div>

      <div className="mb-4">
        <Breadcrumbs />
      </div>

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

        <div className="w-full sm:w-auto sm:min-w-[300px] sm:flex-shrink-0">
          <SearchInput
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={slots}
            columns={columns}
            loading={isLoading || isFetching}
            keyExtractor={(item) => item.id.toString()}
            emptyMessage="No pickup at vehicle slots found"
          />
        </div>

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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
                  {totalCount}
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
    </div>
  );
};

export default PickAtVehicle;
