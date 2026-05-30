import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { useInventory } from '../../../hooks/useInventory';
import { Reservation } from '../../../types/inventory.types';
import { DataTable, Pagination, Badge, SearchInput, SelectInput, ViewIconButton, ConfirmModal } from '../../../components/ui';

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

  // Initialize with mock data if empty
  useEffect(() => {
    // Ensure reservations is an array before checking length
    if (!Array.isArray(reservations) || reservations.length === 0) {
      const mockReservations: Reservation[] = [
        {
          id: 'RES-001',
          orderId: 'ORD-2025-001',
          customerName: 'John Smith',
          variantId: 'VAR-001',
          sku: 'SKU-APPLE-001',
          locationCode: 'MAIN-WH',
          qty: 25,
          status: 'active',
          createdAt: '2025-01-15T09:00:00',
          expiresAt: '2025-01-22T09:00:00',
        },
        {
          id: 'RES-002',
          orderId: 'ORD-2025-002',
          customerName: 'Sarah Johnson',
          variantId: 'VAR-002',
          sku: 'SKU-BANANA-001',
          locationCode: 'STORE-A',
          qty: 15,
          status: 'active',
          createdAt: '2025-01-14T14:30:00',
          expiresAt: '2025-01-21T14:30:00',
        },
        {
          id: 'RES-003',
          orderId: 'ORD-2025-003',
          customerName: 'Michael Brown',
          variantId: 'VAR-003',
          sku: 'SKU-MILK-001',
          locationCode: 'DIST-CENTER',
          qty: 50,
          status: 'released',
          createdAt: '2025-01-10T10:00:00',
          expiresAt: '2025-01-17T10:00:00',
        },
        {
          id: 'RES-004',
          orderId: 'ORD-2025-004',
          customerName: 'Emily Davis',
          variantId: 'VAR-004',
          sku: 'SKU-RICE-001',
          locationCode: 'MAIN-WH',
          qty: 10,
          status: 'active',
          createdAt: '2025-01-16T11:15:00',
          expiresAt: '2025-01-23T11:15:00',
        },
        {
          id: 'RES-005',
          orderId: 'ORD-2025-005',
          customerName: 'David Wilson',
          variantId: 'VAR-005',
          sku: 'SKU-DAL-001',
          locationCode: 'STORE-A',
          qty: 5,
          status: 'active',
          createdAt: '2025-01-15T16:45:00',
          expiresAt: '2025-01-22T16:45:00',
        },
        {
          id: 'RES-006',
          orderId: 'ORD-2025-006',
          customerName: 'Lisa Anderson',
          variantId: 'VAR-006',
          sku: 'SKU-SPICE-001',
          locationCode: 'STORE-B',
          qty: 8,
          status: 'released',
          createdAt: '2025-01-12T08:20:00',
          expiresAt: '2025-01-19T08:20:00',
        },
        {
          id: 'RES-007',
          orderId: 'ORD-2025-007',
          customerName: 'Robert Taylor',
          variantId: 'VAR-007',
          sku: 'SKU-OIL-001',
          locationCode: 'MAIN-WH',
          qty: 20,
          status: 'active',
          createdAt: '2025-01-17T13:00:00',
          expiresAt: '2025-01-24T13:00:00',
        },
        {
          id: 'RES-008',
          orderId: 'ORD-2025-008',
          customerName: 'Jennifer Martinez',
          variantId: 'VAR-001',
          sku: 'SKU-APPLE-001',
          locationCode: 'STORE-A',
          qty: 30,
          status: 'active',
          createdAt: '2025-01-16T09:30:00',
          expiresAt: '2025-01-23T09:30:00',
        },
        {
          id: 'RES-009',
          orderId: 'ORD-2025-009',
          customerName: 'William Garcia',
          variantId: 'VAR-003',
          sku: 'SKU-MILK-001',
          locationCode: 'DIST-CENTER',
          qty: 40,
          status: 'active',
          createdAt: '2025-01-15T15:20:00',
          expiresAt: '2025-01-22T15:20:00',
        },
        {
          id: 'RES-010',
          orderId: 'ORD-2025-010',
          customerName: 'Amanda White',
          variantId: 'VAR-002',
          sku: 'SKU-BANANA-001',
          locationCode: 'MAIN-WH',
          qty: 12,
          status: 'released',
          createdAt: '2025-01-11T12:00:00',
          expiresAt: '2025-01-18T12:00:00',
        },
      ];
      setReservations(mockReservations);
    }
  }, [reservations, setReservations]);

  const statusOptions = [
    { value: 'All', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'released', label: 'Released' },
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
      filtered = filtered.filter((r) => r.locationCode === locationFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.orderId.toLowerCase().includes(term) ||
          r.sku.toLowerCase().includes(term) ||
          r.customerName.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'id':
            aValue = a.id.toLowerCase();
            bValue = b.id.toLowerCase();
            break;
          case 'orderId':
            aValue = a.orderId.toLowerCase();
            bValue = b.orderId.toLowerCase();
            break;
          case 'customerName':
            aValue = a.customerName.toLowerCase();
            bValue = b.customerName.toLowerCase();
            break;
          case 'sku':
            aValue = a.sku.toLowerCase();
            bValue = b.sku.toLowerCase();
            break;
          case 'locationCode':
            aValue = a.locationCode.toLowerCase();
            bValue = b.locationCode.toLowerCase();
            break;
          case 'qty':
            aValue = a.qty;
            bValue = b.qty;
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'expiresAt':
            aValue = new Date(a.expiresAt).getTime();
            bValue = new Date(b.expiresAt).getTime();
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
    const date = new Date(dateString);
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

  const handleForceReleaseConfirm = () => {
    if (forceReleaseConfirm.id === null) return;
    
    // Compute the new reservations array
    const updatedReservations = reservations.map((reservation) =>
      reservation.id === forceReleaseConfirm.id
        ? { ...reservation, status: 'released' as const }
        : reservation
    );
    
    setReservations(updatedReservations);
    setForceReleaseConfirm({ isOpen: false, id: null });
  };

  return (
    <>
      {/* Filters and Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
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
            <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
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
            <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <DataTable
          data={paginatedReservations}
          columns={[
            {
              key: 'id',
              label: 'RESERVATION ID',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.id}</span>
                </div>
              ),
            },
            {
              key: 'orderId',
              label: 'ORDER ID',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.orderId}</span>
                </div>
              ),
            },
            {
              key: 'customerName',
              label: 'CUSTOMER',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.customerName}</span>
                </div>
              ),
            },
            {
              key: 'sku',
              label: 'SKU',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.sku}</span>
                </div>
              ),
            },
            {
              key: 'locationCode',
              label: 'LOCATION',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.locationCode}</span>
                </div>
              ),
            },
            {
              key: 'qty',
              label: 'QTY',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.qty}</span>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'STATUS',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <Badge
                    status={reservation.status === 'active' ? 'active' : 'inactive'}
                    size="sm"
                    customColor={
                      reservation.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }
                    className="rounded"
                  />
                </div>
              ),
            },
            {
              key: 'createdAt',
              label: 'CREATED AT',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{formatDate(reservation.createdAt)}</span>
                </div>
              ),
            },
            {
              key: 'expiresAt',
              label: 'EXPIRES AT',
              sortable: true,
              render: (reservation: Reservation) => (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{formatDate(reservation.expiresAt)}</span>
                </div>
              ),
            },
            {
              key: 'actions',
              label: 'ACTIONS',
              sortable: false,
              render: (reservation: Reservation) => (
                <div className="flex items-center justify-center gap-1.5">
                  <ViewIconButton
                    onClick={() => navigate(`/inventory/sku/${reservation.variantId}`)}
                    size={12}
                  />
                  {reservation.status === 'active' && (
                    <button
                      onClick={() => handleForceReleaseClick(reservation.id)}
                      className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
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
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">Show</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-medium">
                  <select
                    value={itemsPerPage.toString()}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing results <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSorted.length)}</strong> of <strong>{filteredAndSorted.length}</strong>
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
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
    </>
  );
};

export default Reservations;

