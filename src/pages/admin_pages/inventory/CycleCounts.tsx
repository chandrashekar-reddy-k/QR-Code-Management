import { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../../../hooks/useInventory';
import { CycleCount } from '../../../types/inventory.types';
import { DataTable, Pagination, Badge } from '../../../components/ui';
import { useGetAllCycleCountList } from "../../../hooks/InventoryManagement/cycleCounts";
/* ================= API TYPES ================= */

interface ApiCycleCount {
  id: string;
  scope: "ALL_SKUS" | "CATEGORY" | "CUSTOM_SKUS";
  status: "COMPLETED" | "IN_PROGRESS" | "OPEN";
  createdAt: string;
  completedAt?: string | null;
  location: {
    id: string;
    name: string;
  };
  assignedTo: {
    id: string;
    name: string;
  };
}


interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    total: number;
    page: number;
    limit: number;
    cycleCounts: ApiCycleCount[];
  };
}


const CycleCounts = () => {
  // const { cycleCounts, setCycleCounts, locations } = useInventory();
  const { locations } = useInventory();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    locationCode: '',
    scope: 'All SKUs' as 'All SKUs' | 'Category' | 'Custom SKUs',
    assignedTo: '',
  });

  // Listen for custom event to open modal
  useEffect(() => {
    const handleOpenModal = () => {
      setShowCreateModal(true);
    };
    window.addEventListener('openCreateCycleCountModal', handleOpenModal);
    return () => {
      window.removeEventListener('openCreateCycleCountModal', handleOpenModal);
    };
  }, []);


  /* ================= API ================= */

  const { data, isLoading } = useGetAllCycleCountList(
    currentPage,
    itemsPerPage
  );

  const apiData = data as ApiResponse | undefined;
  const apiCycleCounts = apiData?.data?.cycleCounts || [];

  const pagination = {
    page: apiData?.data?.page || 1,
    limit: apiData?.data?.limit || itemsPerPage,
    total: apiData?.data?.total || 0,
    totalPages: Math.ceil(
      (apiData?.data?.total || 0) /
      (apiData?.data?.limit || itemsPerPage)
    ),
    hasNext:
      (apiData?.data?.page || 1) <
      Math.ceil(
        (apiData?.data?.total || 0) /
        (apiData?.data?.limit || itemsPerPage)
      ),
    hasPrev: (apiData?.data?.page || 1) > 1,
  };

  /* ================= SORT ================= */

  const sortedCycleCounts = useMemo(() => {
    let sorted = [...apiCycleCounts];

    if (sortField) {
      sorted.sort((a: any, b: any) => {
        const aValue = a[sortField] ?? "";
        const bValue = b[sortField] ?? "";

        if (sortDirection === "asc") return aValue > bValue ? 1 : -1;
        return aValue < bValue ? 1 : -1;
      });
    }

    return sorted;
  }, [apiCycleCounts, sortField, sortDirection]);

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

  /* ================= HELPERS ================= */

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours() % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
  };

  const getLocationName = (code: string) => {
    const location = locations.find((loc) => loc.code === code);
    return location ? location.name : code;
  };

  /* ================= LOADING ================= */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading Cycle Counts...</p>
      </div>
    );
  }



  const handleCreateCycleCount = () => {
    if (!formData.locationCode || !formData.assignedTo) {
      alert('Please fill in all required fields');
      return;
    }

    const newCycleCount: CycleCount = {
      id: `CC-${String(cycleCounts.length + 1).padStart(3, '0')}`,
      locationCode: formData.locationCode,
      scope: formData.scope,
      status: 'Scheduled',
      assignedTo: formData.assignedTo,
      createdAt: new Date().toISOString(),
    };

    setCycleCounts((prev) => [newCycleCount, ...prev]);
    setShowCreateModal(false);
    setFormData({ locationCode: '', scope: 'All SKUs', assignedTo: '' });
    alert('Cycle count created successfully!');
  };

  return (
    <>
      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <DataTable
          data={sortedCycleCounts}
          columns={[
            {
              key: 'id',
              label: 'CYCLE COUNT ID',
              sortable: true,
              render: (cc: ApiCycleCount) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{cc.id.slice(0, 8)}...</span>
                </div>
              ),
            },
            {
              key: 'location',
              label: 'LOCATION',
              sortable: true,
              render: (cc: ApiCycleCount) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{getLocationName(cc.location?.name)}</span>
                </div>
              ),
            },
            {
              key: 'scope',
              label: 'SCOPE',
              sortable: true,
              render: (cc: ApiCycleCount) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{cc.scope.replace("_", " ")}</span>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'STATUS',
              sortable: true,
              render: (cc: ApiCycleCount) => (
                <div className="text-center">
                  <Badge
                    status={cc.status.toLowerCase().replace(' ', '_') as any}
                    size="sm"
                    customColor={
                      cc.status === "COMPLETED"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        : cc.status === "IN_PROGRESS"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                    }
                    className="rounded"
                  />
                </div>
              ),
            },
            {
              key: 'assignedTo',
              label: 'ASSIGNED TO',
              sortable: true,
              render: (cc: ApiCycleCount) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{cc.assignedTo?.name}</span>
                </div>
              ),
            },
            {
              key: 'createdAt',
              label: 'CREATED AT',
              sortable: true,
              render: (cc: ApiCycleCount) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{formatDate(cc.createdAt)}</span>
                </div>
              ),
            },
            {
              key: "completedAt",
              label: "COMPLETED AT",
              sortable: true,
              render: (cc: ApiCycleCount) => {
                const value =
                  cc.completedAt && !isNaN(new Date(cc.completedAt).getTime())
                    ? formatDate(cc.completedAt)
                    : "--";

                return (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800">
                      {value}
                    </span>
                  </div>
                );
              },
            }

            // {
            //   key: 'completedAt',
            //   label: 'COMPLETED AT',
            //   sortable: true,
            //   render: (cc: ApiCycleCount) => (
            //     <div className="text-center">
            //       <span className="text-xs sm:text-sm text-gray-800">{cc.completedAt ? formatDate(cc.completedAt) : '--'}</span>
            //     </div>
            //   ),
            // },
          ]}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          keyExtractor={(cc) => cc.id}
          emptyMessage="No cycle counts found. Start your first cycle count."
        />

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 bg-white"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-gray-600">
                  Showing{" "}
                  <strong>
                    {Math.min(
                      (currentPage - 1) * itemsPerPage + 1,
                      pagination.total
                    )}
                  </strong>{" "}
                  of <strong>{pagination.total}</strong>
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                pagination={pagination}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Create Cycle Count Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Start Cycle Count</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Location *</label>
                <select
                  value={formData.locationCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, locationCode: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900"
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.code} value={loc.code}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Scope *</label>
                <select
                  value={formData.scope}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scope: e.target.value as any }))}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900"
                >
                  <option value="All SKUs">All SKUs</option>
                  <option value="Category">Category</option>
                  <option value="Custom SKUs">Custom SKUs</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Assigned To *</label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))}
                  placeholder="Enter assignee name"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ locationCode: '', scope: 'All SKUs', assignedTo: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCycleCount}
                  className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium"
                >
                  Create Cycle Count
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CycleCounts;
