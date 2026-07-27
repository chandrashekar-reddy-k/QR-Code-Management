import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { useInventory } from '../../../hooks/useInventory';
import { Reservation } from '../../../types/inventory.types';
import { DataTable, Pagination, Badge, SearchInput, SelectInput, ViewIconButton, ConfirmModal } from '../../../components/ui';
import { useGetInventoryReservations, useReleaseInventoryReservation } from '../../../hooks/InventoryManagement/inventory';

const Reservations = () => {
  const navigate = useNavigate();
  const { reservations, setReservations, locations } = useInventory();
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [forceReleaseConfirm, setForceReleaseConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);

  const { data: realReservationsRes } = useGetInventoryReservations();
  const releaseMutation = useReleaseInventoryReservation();

  // Sync real reservations from backend
  useEffect(() => {
    if (realReservationsRes) {
      const raw = (realReservationsRes as any)?.data ?? [];
      setReservations(raw);
    }
  }, [realReservationsRes, setReservations]);

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'active', label: 'Active (Pending)' },
    { value: 'completed', label: 'Completed (Fulfilled)' },
    { value: 'released', label: 'Cancelled / Released' },
  ];

  const handleResetFilters = () => {
    setStatusFilter('All');
    setLocationFilter('All');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    // Ensure reservations is always an array
    if (!Array.isArray(reservations)) {
      return [];
    }

    let filtered = reservations;

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Location filter
    if (locationFilter !== 'All') {
      filtered = filtered.filter((r) => r.locationCode === locationFilter || (r as any).locationId === locationFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.orderId || '').toLowerCase().includes(term) ||
          (r.customerName || '').toLowerCase().includes(term) ||
          r.items?.some(item => (item.sku || '').toLowerCase().includes(term) || (item.productName || '').toLowerCase().includes(term))
      );
    }

    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'id':
            aValue = (a.id || '').toLowerCase();
            bValue = (b.id || '').toLowerCase();
            break;
          case 'orderId':
            aValue = (a.orderId || '').toLowerCase();
            bValue = (b.orderId || '').toLowerCase();
            break;
          case 'customerName':
            aValue = (a.customerName || '').toLowerCase();
            bValue = (b.customerName || '').toLowerCase();
            break;
          case 'sku':
            aValue = (a.items?.[0]?.sku || '').toLowerCase();
            bValue = (b.items?.[0]?.sku || '').toLowerCase();
            break;
          case 'locationCode':
            aValue = (a.locationCode || '').toLowerCase();
            bValue = (b.locationCode || '').toLowerCase();
            break;
          case 'qty':
            aValue = a.qty || 0;
            bValue = b.qty || 0;
            break;
          case 'status':
            aValue = (a.status || '').toLowerCase();
            bValue = (b.status || '').toLowerCase();
            break;
          case 'createdAt':
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          case 'expiresAt':
            aValue = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
            bValue = b.expiresAt ? new Date(b.expiresAt).getTime() : 0;
            break;
          default:
            return 0;
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [reservations, statusFilter, locationFilter, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedReservations = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const displayHours = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${day}-${month}-${year}, ${displayHours}:${minutes} ${ampm}`;
  };

  const handleForceReleaseClick = (id: string) => {
    setForceReleaseConfirm({ isOpen: true, id });
  };

  const handleForceReleaseConfirm = async () => {
    if (forceReleaseConfirm.id === null) return;
    try {
      await releaseMutation.mutateAsync(forceReleaseConfirm.id);
      setForceReleaseConfirm({ isOpen: false, id: null });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* Filters and Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700" />
          </div>

          {/* Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={statusOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>

          {/* Location Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'All', label: 'All Locations' },
                  ...locations.map((loc) => ({
                    value: loc.code,
                    label: loc.name,
                  })),
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>

          {/* Reset Filter Button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-500 w-full sm:w-auto justify-center sm:justify-start"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-500" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search - Beside filters */}
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <DataTable
          data={paginatedReservations}
          columns={[
            {
              key: 'orderId',
              label: 'ORDER / RESERVATION ID',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center font-medium text-gray-900">
                  <span>{reservation.orderId}</span>
                </div>
              ),
            },
            {
              key: 'customerName',
              label: 'CUSTOMER',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{reservation.customerName}</span>
                </div>
              ),
            },
            {
              key: 'locationCode',
              label: 'LOCATION',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center font-mono">
                  <span className="text-xs sm:text-sm text-gray-800">{reservation.locationCode}</span>
                </div>
              ),
            },
            {
              key: 'qty',
              label: 'TOTAL QTY',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center font-semibold">
                  <span className="text-xs sm:text-sm text-gray-800">{reservation.qty}</span>
                </div>
              ),
            },
            {
              key: 'itemsCount',
              label: 'ITEMS COUNT',
              sortable: false,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full font-medium">
                    {reservation.items?.length || 0} items
                  </span>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'STATUS',
              sortable: true,
              render: (reservation: Reservation) => {
                const isStale = (reservation as any).isStale ?? (reservation.status === 'active' && (Date.now() - new Date(reservation.createdAt).getTime()) > 24 * 60 * 60 * 1000);
                return (
                  <div className="text-center flex flex-col items-center justify-center gap-1">
                    <Badge
                      status={reservation.status === 'active' ? 'active' : 'inactive'}
                      size="sm"
                      customColor={
                        reservation.status === 'active'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                          : (reservation as any).status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800'
                      }
                      className="rounded"
                    />
                    {isStale && (
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">
                        Stale (&gt;24h)
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'createdAt',
              label: 'CREATED AT',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{formatDate(reservation.createdAt)}</span>
                </div>
              ),
            },
            {
              key: 'expiresAt',
              label: 'EXPIRES AT',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800">{formatDate(reservation.expiresAt)}</span>
                </div>
              ),
            },
            {
              key: 'actions',
              label: 'ACTIONS',
              sortable: false,
              render: (reservation: Reservation) => (
                <div className="flex items-center justify-center gap-2">
                  <ViewIconButton
                    onClick={() => setViewingReservation(reservation)}
                    size={14}
                  />
                  {reservation.status === 'active' && (
                    <button
                      onClick={() => handleForceReleaseClick(reservation.id)}
                      className="px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Release
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          keyExtractor={(reservation) => reservation.id}
          emptyMessage="No reservations found"
        />

        {/* Pagination */}
        {filteredAndSorted.length > 0 && (
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
                  Showing results <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSorted.length)}</strong> of <strong>{filteredAndSorted.length}</strong>
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                pagination={{
                  page: currentPage,
                  limit: itemsPerPage,
                  total: filteredAndSorted.length,
                  totalPages: totalPages,
                  hasNext: currentPage < totalPages,
                  hasPrev: currentPage > 1
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Force Release Confirmation Modal */}
      <ConfirmModal
        isOpen={forceReleaseConfirm.isOpen}
        onClose={() => setForceReleaseConfirm({ isOpen: false, id: null })}
        onConfirm={handleForceReleaseConfirm}
        title="Force Release Reservation"
        message="Are you sure you want to force release this reservation?"
        confirmText="Release"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Detailed Items Modal */}
      {viewingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 dark:bg-gray-900/30">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Reservation Details (Order: {viewingReservation.orderId})
              </h3>
              <button
                onClick={() => setViewingReservation(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="text-xs sm:text-sm text-gray-600 mb-4 flex flex-col sm:flex-row sm:justify-between gap-2">
                <span>Customer: <strong className="text-gray-800">{viewingReservation.customerName}</strong></span>
                <span>Location Code: <strong className="text-gray-800">{viewingReservation.locationCode}</strong></span>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:bg-gray-900/10 text-gray-500 font-semibold">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">PRODUCT</th>
                      <th className="py-2.5 px-3">VARIANT</th>
                      <th className="py-2.5 px-3 text-center">QTY</th>
                      <th className="py-2.5 px-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800">
                    {viewingReservation.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <td className="py-3 px-3 font-mono text-[11px] sm:text-xs">{item.sku}</td>
                        <td className="py-3 px-3 font-medium">{item.productName}</td>
                        <td className="py-3 px-3 text-gray-500">{item.variantName}</td>
                        <td className="py-3 px-3 text-center font-semibold">{item.qty}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setViewingReservation(null);
                              navigate(`/inventory/sku/${item.variantId}`);
                            }}
                            className="px-2 py-1 text-xs bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold rounded transition-colors"
                          >
                            View SKU
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50/10 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingReservation(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Reservations;

