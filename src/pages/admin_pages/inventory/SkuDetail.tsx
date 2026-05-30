import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useInventory } from '../../../hooks/useInventory';
import { calculateAvailable, getInventoryStatus } from '../../../lib/utils/inventory.ts';
import { StockLedgerEntry, Reservation } from '../../../types/inventory.types';
import StatusBadge from '../../../components/common/inventory/StatusBadge';
import { BackButton, DataTable } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

const SkuDetail = () => {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();
  const { snapshots, ledger, reservations, setLedger, setReservations } = useInventory();
  const [activeTab, setActiveTab] = useState<'locations' | 'ledger' | 'reservations'>('locations');

  // Get all snapshots for this variant
  const variantSnapshots = snapshots.filter((s) => s.variantId === variantId);
  const firstSnapshot = variantSnapshots[0];

  if (!firstSnapshot) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="mb-3 mt-3">
          <BackButton onClick={() => navigate('/inventory/overview')} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">The requested SKU could not be found.</p>
        </div>
      </div>
    );
  }

  // Initialize mock ledger data if empty
  useEffect(() => {
    if (ledger.length === 0 && variantId) {
      const mockLedger: StockLedgerEntry[] = [
        {
          id: 'LED-001',
          variantId: variantId,
          locationCode: 'MAIN-WH',
          dateTime: '2025-01-15T10:30:00',
          qtyChange: 100,
          reason: 'GRN',
          reference: 'GRN-001',
          performedBy: 'John Manager',
        },
        {
          id: 'LED-002',
          variantId: variantId,
          locationCode: 'MAIN-WH',
          dateTime: '2025-01-14T14:20:00',
          qtyChange: -25,
          reason: 'SALE_ALLOCATE',
          reference: 'ORD-2025-001',
          performedBy: 'System',
        },
        {
          id: 'LED-003',
          variantId: variantId,
          locationCode: 'MAIN-WH',
          dateTime: '2025-01-13T09:15:00',
          qtyChange: 50,
          reason: 'TRANSFER_IN',
          reference: 'TRF-001',
          performedBy: 'Sarah Admin',
        },
        {
          id: 'LED-004',
          variantId: variantId,
          locationCode: 'MAIN-WH',
          dateTime: '2025-01-12T16:45:00',
          qtyChange: -10,
          reason: 'RESERVE',
          reference: 'RES-001',
          performedBy: 'System',
        },
        {
          id: 'LED-005',
          variantId: variantId,
          locationCode: 'MAIN-WH',
          dateTime: '2025-01-11T13:30:00',
          qtyChange: 5,
          reason: 'ADJUSTMENT',
          reference: 'ADJ-001',
          performedBy: 'Mike Supervisor',
        },
        {
          id: 'LED-006',
          variantId: variantId,
          locationCode: 'DIST-CENTER',
          dateTime: '2025-01-10T10:00:00',
          qtyChange: 200,
          reason: 'GRN',
          reference: 'GRN-002',
          performedBy: 'Emma Coordinator',
        },
        {
          id: 'LED-007',
          variantId: variantId,
          locationCode: 'DIST-CENTER',
          dateTime: '2025-01-09T11:20:00',
          qtyChange: -50,
          reason: 'TRANSFER_OUT',
          reference: 'TRF-002',
          performedBy: 'David Operations',
        },
        {
          id: 'LED-008',
          variantId: variantId,
          locationCode: 'STORE-A',
          dateTime: '2025-01-08T08:30:00',
          qtyChange: 30,
          reason: 'TRANSFER_IN',
          reference: 'TRF-003',
          performedBy: 'Lisa Store Manager',
        },
        {
          id: 'LED-009',
          variantId: variantId,
          locationCode: 'STORE-A',
          dateTime: '2025-01-07T15:00:00',
          qtyChange: -15,
          reason: 'SALE_ALLOCATE',
          reference: 'ORD-2025-002',
          performedBy: 'System',
        },
        {
          id: 'LED-010',
          variantId: variantId,
          locationCode: 'MAIN-WH',
          dateTime: '2025-01-06T12:00:00',
          qtyChange: -3,
          reason: 'CYCLE_COUNT_VARIANCE',
          reference: 'CC-001',
          performedBy: 'Robert Assistant',
        },
      ];
      setLedger(mockLedger);
    }
  }, [ledger.length, variantId, setLedger]);

  // Initialize mock reservations data if empty
  useEffect(() => {
    if (reservations.length === 0 && variantId && firstSnapshot) {
      const mockReservations: Reservation[] = [
        {
          id: 'RES-001',
          orderId: 'ORD-2025-001',
          customerName: 'Rajesh Kumar',
          variantId: variantId,
          sku: firstSnapshot.sku,
          locationCode: 'MAIN-WH',
          qty: 25,
          status: 'active',
          createdAt: '2025-01-15T09:00:00',
          expiresAt: '2025-01-17T09:00:00',
        },
        {
          id: 'RES-002',
          orderId: 'ORD-2025-002',
          customerName: 'Priya Sharma',
          variantId: variantId,
          sku: firstSnapshot.sku,
          locationCode: 'STORE-A',
          qty: 15,
          status: 'active',
          createdAt: '2025-01-14T11:30:00',
          expiresAt: '2025-01-16T11:30:00',
        },
        {
          id: 'RES-003',
          orderId: 'ORD-2025-003',
          customerName: 'Amit Patel',
          variantId: variantId,
          sku: firstSnapshot.sku,
          locationCode: 'DIST-CENTER',
          qty: 40,
          status: 'active',
          createdAt: '2025-01-13T14:20:00',
          expiresAt: '2025-01-15T14:20:00',
        },
        {
          id: 'RES-004',
          orderId: 'ORD-2025-004',
          customerName: 'Sneha Reddy',
          variantId: variantId,
          sku: firstSnapshot.sku,
          locationCode: 'MAIN-WH',
          qty: 20,
          status: 'released',
          createdAt: '2025-01-12T10:15:00',
          expiresAt: '2025-01-14T10:15:00',
        },
        {
          id: 'RES-005',
          orderId: 'ORD-2025-005',
          customerName: 'Vikram Singh',
          variantId: variantId,
          sku: firstSnapshot.sku,
          locationCode: 'STORE-B',
          qty: 10,
          status: 'active',
          createdAt: '2025-01-11T16:45:00',
          expiresAt: '2025-01-13T16:45:00',
        },
        {
          id: 'RES-006',
          orderId: 'ORD-2025-006',
          customerName: 'Anjali Mehta',
          variantId: variantId,
          sku: firstSnapshot.sku,
          locationCode: 'MAIN-WH',
          qty: 30,
          status: 'released',
          createdAt: '2025-01-10T08:30:00',
          expiresAt: '2025-01-12T08:30:00',
        },
        {
          id: 'RES-007',
          orderId: 'ORD-2025-007',
          customerName: 'Rahul Gupta',
          variantId: variantId,
          sku: firstSnapshot.sku,
          locationCode: 'DIST-CENTER',
          qty: 18,
          status: 'active',
          createdAt: '2025-01-09T13:00:00',
          expiresAt: '2025-01-11T13:00:00',
        },
        {
          id: 'RES-008',
          orderId: 'ORD-2025-008',
          customerName: 'Kavita Nair',
          variantId: variantId,
          sku: firstSnapshot.sku,
          locationCode: 'STORE-C',
          qty: 12,
          status: 'active',
          createdAt: '2025-01-08T15:20:00',
          expiresAt: '2025-01-10T15:20:00',
        },
      ];
      setReservations(mockReservations);
    }
  }, [reservations.length, variantId, firstSnapshot, setReservations]);

  // Filter ledger for this variant
  const variantLedger = ledger.filter((l) => l.variantId === variantId);
  
  // Filter reservations for this variant
  const variantReservations = reservations.filter((r) => r.variantId === variantId);

  const handleAdjustStock = (snapshot: any) => {
    navigate(`/inventory/adjust/${snapshot.variantId}/${snapshot.locationCode}`, {
      state: { snapshot }
    });
  };

  const handleTransfer = (snapshot: any) => {
    navigate('/inventory/operations/transfers', {
      state: {
        fromLocation: snapshot.locationCode,
        fromLocationName: snapshot.locationName,
        variantId: snapshot.variantId,
        sku: snapshot.sku,
        productName: snapshot.productName,
        currentOnHand: snapshot.onHand,
      }
    });
  };

  const tabs = [
    { id: 'locations', label: 'Locations' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'reservations', label: 'Reservations' },
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {firstSnapshot.productName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {firstSnapshot.variantLabel} • SKU: {firstSnapshot.sku}
          </p>
        </div>
        <button
          onClick={() => {
            alert('View in Product Catalog - Coming soon');
          }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-medium"
        >
          <ExternalLink size={14} />
          View in Product Catalog
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Tabs - Separate Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-4 overflow-hidden w-1/2">
        <div className="flex w-full border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-600 dark:bg-orange-400"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Separate Container */}
      <div>
        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable
                data={variantSnapshots}
                columns={[
                  {
                    key: 'locationName',
                    label: 'LOCATION',
                    sortable: true,
                    render: (snapshot: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.locationName}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'onHand',
                    label: 'ON HAND',
                    sortable: true,
                    render: (snapshot: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.onHand}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'reserved',
                    label: 'RESERVED',
                    sortable: true,
                    render: (snapshot: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.reserved}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'available',
                    label: 'AVAILABLE',
                    sortable: true,
                    render: (snapshot: any) => {
                      const available = calculateAvailable(snapshot);
                      return (
                        <div className="text-center">
                          <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{available}</span>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'inbound',
                    label: 'INBOUND',
                    sortable: true,
                    render: (snapshot: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.inbound}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'reorderPoint',
                    label: 'REORDER POINT',
                    sortable: true,
                    render: (snapshot: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.reorderPoint}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'safetyStock',
                    label: 'SAFETY STOCK',
                    sortable: true,
                    render: (snapshot: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.safetyStock}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'STATUS',
                    sortable: false,
                    render: (snapshot: any) => {
                      const status = getInventoryStatus(snapshot);
                      return (
                        <div className="text-center">
                          <StatusBadge status={status} />
                        </div>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    label: 'ACTIONS',
                    sortable: false,
                    render: (snapshot: any) => (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdjustStock(snapshot);
                          }}
                          className="px-2 py-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                        >
                          Adjust
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTransfer(snapshot);
                          }}
                          className="px-2 py-1 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded transition-colors"
                        >
                          Transfer
                        </button>
                      </div>
                    ),
                  },
                ]}
                sortField={null}
                sortDirection={null}
                onSort={() => {}}
                keyExtractor={(snapshot, index) => `${snapshot.variantId}-${snapshot.locationCode}-${index}`}
                emptyMessage="No locations found"
              />
            </div>
          </div>
        )}

        {/* Ledger Tab */}
        {activeTab === 'ledger' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable
                data={variantLedger}
                columns={[
                  {
                    key: 'dateTime',
                    label: 'DATE/TIME',
                    sortable: true,
                    render: (entry: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                          {new Date(entry.dateTime).toLocaleString()}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'locationCode',
                    label: 'LOCATION',
                    sortable: true,
                    render: (entry: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{entry.locationCode}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'qtyChange',
                    label: 'QTY CHANGE',
                    sortable: true,
                    render: (entry: any) => (
                      <div className="text-center">
                        <span className={`text-xs sm:text-sm font-medium ${
                          entry.qtyChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {entry.qtyChange > 0 ? '+' : ''}{entry.qtyChange}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'reason',
                    label: 'REASON',
                    sortable: true,
                    render: (entry: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{entry.reason}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'reference',
                    label: 'REFERENCE',
                    sortable: true,
                    render: (entry: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{entry.reference}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'performedBy',
                    label: 'PERFORMED BY',
                    sortable: true,
                    render: (entry: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{entry.performedBy}</span>
                      </div>
                    ),
                  },
                ]}
                sortField={null}
                sortDirection={null}
                onSort={() => {}}
                keyExtractor={(entry) => entry.id}
                emptyMessage="No ledger entries found"
              />
            </div>
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <DataTable
                data={variantReservations}
                columns={[
                  {
                    key: 'id',
                    label: 'RESERVATION ID',
                    sortable: true,
                    render: (reservation: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.id}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'orderId',
                    label: 'ORDER ID',
                    sortable: true,
                    render: (reservation: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.orderId}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'customerName',
                    label: 'CUSTOMER',
                    sortable: true,
                    render: (reservation: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.customerName}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'locationCode',
                    label: 'LOCATION',
                    sortable: true,
                    render: (reservation: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{reservation.locationCode}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'qty',
                    label: 'QTY',
                    sortable: true,
                    render: (reservation: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{reservation.qty}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'STATUS',
                    sortable: true,
                    render: (reservation: any) => (
                      <div className="text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          reservation.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {reservation.status}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'createdAt',
                    label: 'CREATED AT',
                    sortable: true,
                    render: (reservation: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                          {new Date(reservation.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'expiresAt',
                    label: 'EXPIRES AT',
                    sortable: true,
                    render: (reservation: any) => (
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                          {new Date(reservation.expiresAt).toLocaleString()}
                        </span>
                      </div>
                    ),
                  },
                ]}
                sortField={null}
                sortDirection={null}
                onSort={() => {}}
                keyExtractor={(reservation) => reservation.id}
                emptyMessage="No reservations found"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkuDetail;
