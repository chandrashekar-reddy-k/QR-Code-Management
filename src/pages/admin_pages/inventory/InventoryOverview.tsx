import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingDown, AlertCircle, Box, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { useInventory } from '../../../hooks/useInventory';
import { InventorySnapshot } from '../../../types/inventory.types';
import { calculateAvailable, getInventoryStatus } from '../../../lib/utils/inventory.ts';
import StatusBadge from '../../../components/common/inventory/StatusBadge';
import { StatCard, DataTable, Pagination, SearchInput, SelectInput, ViewIconButton } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

const InventoryOverview = () => {
  const navigate = useNavigate();
  const { snapshots, setSnapshots, locations, adjustStock, updateAlerts } = useInventory();
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Initialize with mock data if empty
  useEffect(() => {
    if (snapshots.length === 0) {
      const mockSnapshots: InventorySnapshot[] = [
        {
          variantId: 'VAR-001',
          productName: 'Fresh Apples',
          variantLabel: 'Red Delicious - 1kg',
          sku: 'SKU-APPLE-001',
          locationName: 'Main Warehouse',
          locationCode: 'MAIN-WH',
          onHand: 150,
          reserved: 25,
          inbound: 50,
          reorderPoint: 30,
          safetyStock: 20,
        },
        {
          variantId: 'VAR-002',
          productName: 'Bananas',
          variantLabel: 'Cavendish - 1kg',
          sku: 'SKU-BANANA-001',
          locationName: 'Main Warehouse',
          locationCode: 'MAIN-WH',
          onHand: 200,
          reserved: 40,
          inbound: 0,
          reorderPoint: 50,
          safetyStock: 30,
        },
        {
          variantId: 'VAR-003',
          productName: 'Amul Milk',
          variantLabel: 'Full Cream - 1L',
          sku: 'SKU-MILK-001',
          locationName: 'Distribution Center',
          locationCode: 'DIST-CENTER',
          onHand: 500,
          reserved: 100,
          inbound: 200,
          reorderPoint: 100,
          safetyStock: 50,
        },
        {
          variantId: 'VAR-004',
          productName: 'Basmati Rice',
          variantLabel: 'Premium - 5kg',
          sku: 'SKU-RICE-001',
          locationName: 'Main Warehouse',
          locationCode: 'MAIN-WH',
          onHand: 25,
          reserved: 5,
          inbound: 0,
          reorderPoint: 30,
          safetyStock: 20,
        },
        {
          variantId: 'VAR-005',
          productName: 'Toor Dal',
          variantLabel: 'Split - 1kg',
          sku: 'SKU-DAL-001',
          locationName: 'Store Branch A',
          locationCode: 'STORE-A',
          onHand: 8,
          reserved: 2,
          inbound: 0,
          reorderPoint: 15,
          safetyStock: 10,
        },
        {
          variantId: 'VAR-006',
          productName: 'MDH Garam Masala',
          variantLabel: 'Spice Mix - 100g',
          sku: 'SKU-SPICE-001',
          locationName: 'Store Branch A',
          locationCode: 'STORE-A',
          onHand: 0,
          reserved: 0,
          inbound: 0,
          reorderPoint: 20,
          safetyStock: 15,
        },
        {
          variantId: 'VAR-007',
          productName: 'Tata Tea Gold',
          variantLabel: 'Premium - 500g',
          sku: 'SKU-TEA-001',
          locationName: 'Distribution Center',
          locationCode: 'DIST-CENTER',
          onHand: 300,
          reserved: 50,
          inbound: 100,
          reorderPoint: 80,
          safetyStock: 40,
        },
        {
          variantId: 'VAR-008',
          productName: 'Patanjali Soap',
          variantLabel: 'Herbal - 125g',
          sku: 'SKU-SOAP-001',
          locationName: 'Store Branch B',
          locationCode: 'STORE-B',
          onHand: -5,
          reserved: 0,
          inbound: 0,
          reorderPoint: 30,
          safetyStock: 20,
        },
        {
          variantId: 'VAR-009',
          productName: 'Colgate Toothpaste',
          variantLabel: 'Fresh Mint - 200g',
          sku: 'SKU-TOOTHPASTE-001',
          locationName: 'Main Warehouse',
          locationCode: 'MAIN-WH',
          onHand: 180,
          reserved: 30,
          inbound: 50,
          reorderPoint: 50,
          safetyStock: 25,
        },
        {
          variantId: 'VAR-010',
          productName: 'Lays Chips',
          variantLabel: 'Classic Salted - 70g',
          sku: 'SKU-CHIPS-001',
          locationName: 'Store Branch C',
          locationCode: 'STORE-C',
          onHand: 0,
          reserved: 0,
          inbound: 100,
          reorderPoint: 40,
          safetyStock: 20,
        },
        {
          variantId: 'VAR-011',
          productName: 'Britannia Good Day',
          variantLabel: 'Butter Cookies - 200g',
          sku: 'SKU-BISCUIT-001',
          locationName: 'Store Branch D',
          locationCode: 'STORE-D',
          onHand: 45,
          reserved: 10,
          inbound: 0,
          reorderPoint: 25,
          safetyStock: 15,
        },
        {
          variantId: 'VAR-012',
          productName: 'Head & Shoulders',
          variantLabel: 'Anti-Dandruff - 400ml',
          sku: 'SKU-SHAMPOO-001',
          locationName: 'Distribution Center',
          locationCode: 'DIST-CENTER',
          onHand: 120,
          reserved: 20,
          inbound: 0,
          reorderPoint: 60,
          safetyStock: 30,
        },
        {
          variantId: 'VAR-013',
          productName: 'Onions',
          variantLabel: 'Fresh - 1kg',
          sku: 'SKU-ONION-001',
          locationName: 'Main Warehouse',
          locationCode: 'MAIN-WH',
          onHand: 350,
          reserved: 50,
          inbound: 0,
          reorderPoint: 100,
          safetyStock: 50,
        },
        {
          variantId: 'VAR-014',
          productName: 'Potatoes',
          variantLabel: 'Fresh - 1kg',
          sku: 'SKU-POTATO-001',
          locationName: 'Store Branch A',
          locationCode: 'STORE-A',
          onHand: 12,
          reserved: 3,
          inbound: 0,
          reorderPoint: 20,
          safetyStock: 12,
        },
        {
          variantId: 'VAR-015',
          productName: 'Tomatoes',
          variantLabel: 'Fresh - 500g',
          sku: 'SKU-TOMATO-001',
          locationName: 'Store Branch B',
          locationCode: 'STORE-B',
          onHand: 0,
          reserved: 0,
          inbound: 0,
          reorderPoint: 15,
          safetyStock: 10,
        },
      ];
      setSnapshots(mockSnapshots);
    }
  }, [snapshots.length, setSnapshots]);

  useEffect(() => {
    updateAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots]);

  const statusOptions = [
    { value: 'All', label: 'All' },
    { value: 'IN_STOCK', label: 'In stock' },
    { value: 'LOW_STOCK', label: 'Low stock' },
    { value: 'OUT_OF_STOCK', label: 'Out of stock' },
    { value: 'COMING_SOON', label: 'Coming soon' },
    { value: 'NEGATIVE_STOCK', label: 'Negative' },
  ];

  const handleResetFilters = () => {
    setSelectedLocation('All');
    setSelectedStatus('All');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = snapshots;

    // Location filter
    if (selectedLocation !== 'All') {
      filtered = filtered.filter((s) => s.locationCode === selectedLocation);
    }

    // Status filter
    if (selectedStatus !== 'All') {
      filtered = filtered.filter((s) => {
        const status = getInventoryStatus(s);
        return status.code === selectedStatus;
      });
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.productName.toLowerCase().includes(term) ||
          s.sku.toLowerCase().includes(term) ||
          s.variantLabel.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortField === 'available') {
          aValue = calculateAvailable(a);
          bValue = calculateAvailable(b);
        } else if (sortField === 'productName') {
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
        } else if (sortField === 'locationName') {
          aValue = a.locationName.toLowerCase();
          bValue = b.locationName.toLowerCase();
        } else {
          aValue = a[sortField as keyof InventorySnapshot];
          bValue = b[sortField as keyof InventorySnapshot];
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [snapshots, selectedLocation, selectedStatus, searchTerm, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAdjustStock = (snapshot: InventorySnapshot) => {
    navigate(`/inventory/adjust/${snapshot.variantId}/${snapshot.locationCode}`, {
      state: { snapshot }
    });
  };

  const handleTransfer = (snapshot: InventorySnapshot) => {
    // Navigate to transfers page with pre-filled data
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


  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalSKUs = filteredAndSorted.length;
    const lowStock = filteredAndSorted.filter((s) => getInventoryStatus(s).code === 'LOW_STOCK').length;
    const outOfStock = filteredAndSorted.filter((s) => getInventoryStatus(s).code === 'OUT_OF_STOCK').length;
    const totalOnHand = filteredAndSorted.reduce((sum, s) => sum + s.onHand, 0);

    return { totalSKUs, lowStock, outOfStock, totalOnHand };
  }, [filteredAndSorted]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedSnapshots = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Inventory Overview
        </h1>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-full mb-6">
        <StatCard title="Total SKUs" value={kpis.totalSKUs} icon={Package} variant="purple" />
        <StatCard title="Low Stock" value={kpis.lowStock} icon={Package} variant="yellow" />
        <StatCard title="Out of Stock" value={kpis.outOfStock} icon={Package} variant="red" />
        <StatCard title="Total On Hand" value={kpis.totalOnHand} icon={Package} variant="green" />
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 lg:max-w-md overflow-hidden">
          {/* Filter Icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center sm:justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Location Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
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

          {/* Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-1 min-w-0 relative">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
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
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedSnapshots}
            columns={[
              {
                key: 'thumbnail',
                label: 'THUMBNAIL',
                sortable: false,
                render: () => (
                  <div className="text-center">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center mx-auto">
                      <Package size={16} className="text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                ),
              },
              {
                key: 'productName',
                label: 'PRODUCT + VARIANT',
                sortable: true,
                render: (snapshot: InventorySnapshot) => (
                  <div className="text-center">
                    <div className="text-xs">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{snapshot.productName}</div>
                      <div className="text-gray-600 dark:text-gray-400">{snapshot.variantLabel}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'sku',
                label: 'SKU',
                sortable: true,
                render: (snapshot: InventorySnapshot) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.sku}</span>
                  </div>
                ),
              },
              {
                key: 'locationName',
                label: 'LOCATION',
                sortable: true,
                render: (snapshot: InventorySnapshot) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.locationName}</span>
                  </div>
                ),
              },
              {
                key: 'onHand',
                label: 'ON HAND',
                sortable: true,
                render: (snapshot: InventorySnapshot) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{snapshot.onHand}</span>
                  </div>
                ),
              },
              {
                key: 'reserved',
                label: 'RESERVED',
                sortable: true,
                render: (snapshot: InventorySnapshot) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.reserved}</span>
                  </div>
                ),
              },
              {
                key: 'available',
                label: 'AVAILABLE',
                sortable: true,
                render: (snapshot: InventorySnapshot) => {
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
                render: (snapshot: InventorySnapshot) => (
                  <div className="text-center">
                    <span className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{snapshot.inbound}</span>
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'STATUS',
                sortable: false,
                render: (snapshot: InventorySnapshot) => {
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
                render: (snapshot: InventorySnapshot) => (
                  <div className="flex items-center justify-center gap-1.5">
                    <ViewIconButton
                      onClick={() => navigate(`/inventory/sku/${snapshot.variantId}`)}
                      size={12}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustStock(snapshot);
                      }}
                      className="px-2 py-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                      title="Adjust Stock"
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
                      title="Transfer"
                    >
                      Transfer
                    </button>
                  </div>
                ),
              },
            ]}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            keyExtractor={(snapshot) => `${snapshot.variantId}-${snapshot.locationCode}`}
            emptyMessage="No inventory items found"
          />
        </div>

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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredAndSorted.length
                  )}{' '}
                  of {filteredAndSorted.length}
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

    </div>
  );
};

export default InventoryOverview;
