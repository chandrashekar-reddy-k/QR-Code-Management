import { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../../../hooks/useInventory';
import { GRN as GRNType } from '../../../types/inventory.types';
import { DataTable, Pagination, Badge } from '../../../components/ui';
import {
  useGetAllGoodsReceiptList,
} from "../../../hooks/InventoryManagement/goodsReceipt";



/* ================= API TYPES ================= */

interface ApiGRN {
  id: string;
  grnCode: string;
  supplier: string;
  location: string;      // ✅ FIX
  status: "COMPLETED" | "DRAFT";
  receivedAt: string | null; // ✅ FIX
  linkedPO?: string;
}


interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    total: number;
    page: number;
    limit: number;
    grns: ApiGRN[];
  };
}

const GRN = () => {
  const { grns, setGrns, locations, snapshots, setSnapshots, setLedger } = useInventory();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    supplier: '',
    locationCode: '',
    linkedPO: '',
    lines: [] as Array<{ variantId: string; sku: string; productName: string; expectedQty: number; receivedQty: number; unitCost: number }>,
  });

  // Listen for custom event to open modal
  useEffect(() => {
    const handleOpenModal = () => {
      setShowCreateModal(true);
    };
    window.addEventListener('openCreateGRNModal', handleOpenModal);
    return () => {
      window.removeEventListener('openCreateGRNModal', handleOpenModal);
    };
  }, []);


  /* ================= API ================= */

  const { data, isLoading, refetch } = useGetAllGoodsReceiptList(
    currentPage,
    itemsPerPage
  );

  useEffect(() => {
    refetch && refetch();
  }, [currentPage, itemsPerPage, refetch]);

  const apiData = data as ApiResponse | undefined;
  const apiGRNs = apiData?.data?.grns || [];

  const pagination = {
    page: apiData?.data?.page || 1,
    limit: apiData?.data?.limit || itemsPerPage,
    total: apiData?.data?.total || 0,
    totalPages: Math.ceil(
      (apiData?.data?.total || 0) / (apiData?.data?.limit || itemsPerPage)
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

  const sortedGRNs = useMemo(() => {
    let sorted = [...apiGRNs];

    if (sortField) {
      sorted.sort((a: any, b: any) => {
        const aValue = a[sortField] ?? "";
        const bValue = b[sortField] ?? "";

        if (sortDirection === "asc") return aValue > bValue ? 1 : -1;
        return aValue < bValue ? 1 : -1;
      });
    }

    return sorted;
  }, [apiGRNs, sortField, sortDirection]);

  /* ================= HELPERS ================= */

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


  const handleCreateGRN = () => {
    if (!formData.supplier || !formData.locationCode || formData.lines.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const newGRN: GRNType = {
      id: `GRN-${String(grns.length + 1).padStart(3, '0')}`,
      supplier: formData.supplier,
      locationCode: formData.locationCode,
      status: 'Completed',
      receivedAt: new Date().toISOString(),
      linkedPO: formData.linkedPO || undefined,
      lines: formData.lines,
    };

    setGrns((prev) => [newGRN, ...prev]);

    // Update snapshots and ledger
    formData.lines.forEach((line) => {
      setSnapshots((prev) =>
        prev.map((s) =>
          s.variantId === line.variantId && s.locationCode === formData.locationCode
            ? { ...s, onHand: s.onHand + line.receivedQty }
            : s
        )
      );

      setLedger((prev) => [
        {
          id: `LED-${Date.now()}-${Math.random()}`,
          variantId: line.variantId,
          locationCode: formData.locationCode,
          dateTime: new Date().toISOString(),
          qtyChange: line.receivedQty,
          reason: 'GRN',
          reference: newGRN.id,
          performedBy: 'Admin User',
        },
        ...prev,
      ]);
    });

    setShowCreateModal(false);
    setFormData({ supplier: '', locationCode: '', linkedPO: '', lines: [] });
    alert('GRN created successfully!');
  };

  const addLine = () => {
    const firstSnapshot = snapshots[0];
    if (firstSnapshot) {
      setFormData((prev) => ({
        ...prev,
        lines: [
          ...prev.lines,
          {
            variantId: firstSnapshot.variantId,
            sku: firstSnapshot.sku,
            productName: firstSnapshot.productName,
            expectedQty: 10,
            receivedQty: 10,
            unitCost: 100,
          },
        ],
      }));
    }
  };


  /* ================= LOADING ================= */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading GRNs...</p>
      </div>
    );
  }

  return (
    <>
      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <DataTable
          data={sortedGRNs}
          columns={[
            {
              key: 'grnCode',
              label: 'GRN ID',
              sortable: true,
              render: (grn: ApiGRN) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{grn.grnCode}</span>
                </div>
              ),
            },
            {
              key: 'supplier',
              label: 'SUPPLIER',
              sortable: true,
              render: (grn: ApiGRN) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{grn.supplier}</span>
                </div>
              ),
            },
            {
              key: 'location',
              label: 'LOCATION',
              sortable: true,
              render: (grn: ApiGRN) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{getLocationName(grn.location)}</span>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'STATUS',
              sortable: true,
              render: (grn: ApiGRN) => (
                <div className="text-center">
                  <Badge
                    status={grn.status.toLowerCase() as any}
                    size="sm"
                    customColor={
                      grn.status === "COMPLETED"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                    }
                    className="rounded"
                  />
                </div>
              ),
            },
            {
              key: 'receivedAt',
              label: 'RECEIVED AT',
              sortable: true,
              render: (grn: ApiGRN) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{formatDate(grn.receivedAt)}</span>
                </div>
              ),
            },
            {
              key: 'linkedPO',
              label: 'LINKED PO',
              sortable: true,
              render: (grn: ApiGRN) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{grn.linkedPO || '-'}</span>
                </div>
              ),
            },
          ]}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          keyExtractor={(grn) => grn.id}
          emptyMessage="No GRNs found. Create your first GRN."
        />

        {/* Pagination */}
        {sortedGRNs.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing results <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, sortedGRNs.length)}</strong> of <strong>{sortedGRNs.length}</strong>
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

      {/* Create GRN Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Create GRN</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Supplier *</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Enter supplier name"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
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
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Linked PO</label>
                <input
                  type="text"
                  value={formData.linkedPO}
                  onChange={(e) => setFormData((prev) => ({ ...prev, linkedPO: e.target.value }))}
                  placeholder="PO number (optional)"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={addLine}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-medium"
                >
                  Add Line
                </button>
                {formData.lines.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {formData.lines.map((line, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 rounded text-xs text-gray-800">
                        {line.productName} - Expected: {line.expectedQty}, Received: {line.receivedQty}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ supplier: '', locationCode: '', linkedPO: '', lines: [] });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateGRN}
                  className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium"
                >
                  Complete GRN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GRN;