import { useState, useMemo, useEffect } from "react";
import { Plus, Clock, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  SearchInput,
  StatCard,
  ViewIconButton,
  EditIconButton,
  DeleteIconButton,
  DataTable,
  Pagination,
  Badge,
  PrimaryButton,
  ConfirmModal,
  TextInput,
  Button,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

interface TimeSlot {
  id: number;
  title: string;
  fromTime: string;
  toTime: string;
  lastOrderTime: string;
  status: "active" | "inactive";
}

const DeliverySettings = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    title: "",
    fromTime: "",
    toTime: "",
    lastOrderTime: "",
  });
  const [configData, setConfigData] = useState({
    deliveryEstimateDays: 1,
    enableTimeSlots: true,
    allowedDays: 3,
  });

  // Mock data
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    {
      id: 1,
      title: "Morning 9AM to 12PM",
      fromTime: "09:00",
      toTime: "12:00",
      lastOrderTime: "11:30",
      status: "active",
    },
    {
      id: 2,
      title: "Afternoon 12PM to 4PM",
      fromTime: "12:00",
      toTime: "16:00",
      lastOrderTime: "15:30",
      status: "active",
    },
    {
      id: 3,
      title: "Evening 4PM to 8PM",
      fromTime: "16:00",
      toTime: "20:00",
      lastOrderTime: "19:30",
      status: "active",
    },
  ]);

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

  // Filter and sort time slots
  const filteredAndSortedTimeSlots = useMemo(() => {
    const filtered = timeSlots.filter(
      (slot) =>
        slot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.fromTime.includes(searchTerm) ||
        slot.toTime.includes(searchTerm) ||
        slot.lastOrderTime.includes(searchTerm) ||
        slot.id.toString().includes(searchTerm)
    );

    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: string | number = a[sortField as keyof TimeSlot] as
        | string
        | number;
      let bValue: string | number = b[sortField as keyof TimeSlot] as
        | string
        | number;
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [timeSlots, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedTimeSlots.length / itemsPerPage)
  );
  const paginatedTimeSlots = filteredAndSortedTimeSlots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingId(null);
    setFormData({ title: "", fromTime: "", toTime: "", lastOrderTime: "" });
  };

  const handleEdit = (slot: TimeSlot) => {
    setEditingId(slot.id);
    setFormData({
      title: slot.title,
      fromTime: slot.fromTime,
      toTime: slot.toTime,
      lastOrderTime: slot.lastOrderTime,
    });
    setShowAddForm(true);
  };

  const handleView = (id: number) => {
    navigate(`/system/delivery-settings/view/${id}`);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.id === null) return;
    setTimeSlots(timeSlots.filter((slot) => slot.id !== deleteConfirm.id));
    setDeleteConfirm({ isOpen: false, id: null });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setTimeSlots(
        timeSlots.map((slot) =>
          slot.id === editingId
            ? { ...slot, ...formData, status: slot.status }
            : slot
        )
      );
    } else {
      const newSlot: TimeSlot = {
        id:
          timeSlots.length > 0
            ? Math.max(...timeSlots.map((s) => s.id)) + 1
            : 1,
        ...formData,
        status: "active",
      };
      setTimeSlots([...timeSlots, newSlot]);
    }
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ title: "", fromTime: "", toTime: "", lastOrderTime: "" });
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ title: "", fromTime: "", toTime: "", lastOrderTime: "" });
  };

  const activeTimeSlots = timeSlots.filter((s) => s.status === "active").length;
  const inactiveTimeSlots = timeSlots.filter(
    (s) => s.status === "inactive"
  ).length;

  // Table columns
  const columns = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      render: (slot: TimeSlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{slot.id}</span>
        </div>
      ),
    },
    {
      key: "title",
      label: "TITLE",
      sortable: true,
      render: (slot: TimeSlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
            {slot.title}
          </span>
        </div>
      ),
    },
    {
      key: "fromTime",
      label: "FROM TIME",
      sortable: true,
      render: (slot: TimeSlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {slot.fromTime}
          </span>
        </div>
      ),
    },
    {
      key: "toTime",
      label: "TO TIME",
      sortable: true,
      render: (slot: TimeSlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {slot.toTime}
          </span>
        </div>
      ),
    },
    {
      key: "lastOrderTime",
      label: "LAST ORDER TIME",
      sortable: true,
      render: (slot: TimeSlot) => (
        <div className="text-center">
          <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
            {slot.lastOrderTime}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: true,
      render: (slot: TimeSlot) => (
        <div className="text-center">
          <Badge
            status={slot.status}
            size="sm"
            customColor={
              slot.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }
            className="rounded"
          />
        </div>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      sortable: false,
      render: (slot: TimeSlot) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ViewIconButton
              onClick={() => handleView(slot.id)}
              size={12}
              tooltip="View"
            />
            <EditIconButton
              onClick={() => handleEdit(slot)}
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

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {showAddForm
            ? editingId
              ? "Edit Time Slot"
              : "Add Time Slot"
            : "Manage Time Slots"}
        </h1>
        {!showAddForm && (
          <PrimaryButton
            onClick={handleAdd}
            size="sm"
            className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Add Time Slot</span>
          </PrimaryButton>
        )}
        {showAddForm && <BackButton onClick={handleCancel} />}
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      {!showAddForm && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-full mb-6">
          <StatCard
            title="Total Time Slots"
            value={timeSlots.length}
            icon={Clock}
            variant="blue"
          />
          <StatCard
            title="Active Slots"
            value={activeTimeSlots}
            icon={Clock}
            variant="green"
          />
          <StatCard
            title="Inactive Slots"
            value={inactiveTimeSlots}
            icon={Clock}
            variant="gray"
          />
        </div>
      )}

      {/* Time Slot Config */}
      {!showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
          <h2 className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-300 mb-4">
            Time Slot Config
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput
              label="Delivery Estimate Days"
              type="number"
              value={configData.deliveryEstimateDays}
              onChange={(e) =>
                setConfigData({
                  ...configData,
                  deliveryEstimateDays: parseInt(e.target.value) || 0,
                })
              }
              min="0"
            />
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Enable / Disable Time Slots
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={configData.enableTimeSlots}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      enableTimeSlots: e.target.checked,
                    })
                  }
                  className="w-4 h-4 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700"
                />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {configData.enableTimeSlots ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
            <TextInput
              label="How many Days you want to allow?"
              type="number"
              value={configData.allowedDays}
              onChange={(e) =>
                setConfigData({
                  ...configData,
                  allowedDays: parseInt(e.target.value) || 0,
                })
              }
              min="0"
            />
          </div>
        </div>
      )}

      {/* Add Time Slot Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
          <form onSubmit={handleSubmit}>
            <div className="max-w-4xl">
              <FormSectionWithDots
                title={editingId ? "Edit Time Slot" : "Add Time Slot"}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="Title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Morning 9AM to 12PM"
                    required
                  />
                  <TextInput
                    label="From Time (24 hrs format)"
                    type="time"
                    value={formData.fromTime}
                    onChange={(e) =>
                      setFormData({ ...formData, fromTime: e.target.value })
                    }
                    required
                  />
                  <TextInput
                    label="To Time (24 hrs format)"
                    type="time"
                    value={formData.toTime}
                    onChange={(e) =>
                      setFormData({ ...formData, toTime: e.target.value })
                    }
                    required
                  />
                  <TextInput
                    label="Last Order Time (24 hrs format)"
                    type="time"
                    value={formData.lastOrderTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lastOrderTime: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </FormSectionWithDots>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </Button>
                <PrimaryButton
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
                >
                  <Save size={14} />
                  <span>
                    {editingId ? "Update Time Slot" : "Add Time Slot"}
                  </span>
                </PrimaryButton>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Search and Table */}
      {!showAddForm && (
        <>
          {/* Search Bar */}
          <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
              <SearchInput
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 w-full"
              />
            </div>
          </div>

          {/* Time Slots Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable
                data={paginatedTimeSlots}
                columns={columns}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                keyExtractor={(slot) => slot.id.toString()}
                emptyMessage="No time slots found"
              />
            </div>

            {/* Pagination */}
            {filteredAndSortedTimeSlots.length > 0 && (
              <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      Show
                    </span>
                    <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium [&_select]:px-2 [&_select]:py-1 [&_select]:pr-6 [&_select]:border [&_select]:border-gray-300 dark:[&_select]:border-gray-600 [&_select]:rounded-lg [&_select]:bg-white dark:[&_select]:bg-gray-700 [&_select]:w-16 [&_select]:sm:w-20 [&_select]:h-7 [&_select]:text-xs [&_select]:appearance-none">
                      <select
                        value={itemsPerPage.toString()}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="w-16 sm:w-20 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredAndSortedTimeSlots.length
                      )}{" "}
                      of {filteredAndSortedTimeSlots.length}
                    </span>
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredAndSortedTimeSlots.length}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          <ConfirmModal
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
            onConfirm={handleDeleteConfirm}
            title="Delete Time Slot"
            message="Are you sure you want to delete this time slot? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
          />
        </>
      )}
    </div>
  );
};

export default DeliverySettings;
