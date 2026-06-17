import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Filter, RotateCcw, ChevronDown, Layers, History, Calendar, HelpCircle, ChevronRight, Eye, ArrowLeft } from 'lucide-react';
import { useInventory } from '../../../hooks/useInventory';
import { useGetActiveCategoriesList } from '../../../hooks/category';
import {
  useGetInventoryBalances,
  useGetInventoryLocations,
  useGetStockLedger,
  useGetInventoryBatches,
  useCreateInventoryBatch
} from '../../../hooks/InventoryManagement/inventory';
import { useGetAllProductList, useGetProductDetailsById } from '../../../hooks/product';
import { InventorySnapshot, StockLedgerEntry } from '../../../types/inventory.types';
import { calculateAvailable, getInventoryStatus } from '../../../lib/utils/inventory.ts';
import StatusBadge from '../../../components/common/inventory/StatusBadge';
import { StatCard, DataTable, Pagination, SearchInput, SelectInput, ViewIconButton, Modal } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

const InventoryOverview = () => {

  const [variantSearchTerm, setVariantSearchTerm] = useState('');
  const [isVariantDropdownOpen, setIsVariantDropdownOpen] = useState(false);
  const variantDropdownRef = useRef<HTMLDivElement>(null);

  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);


  const navigate = useNavigate();
  const { snapshots, setSnapshots, locations, ledger, setLedger } = useInventory();
  const { data: categoryData } = useGetActiveCategoriesList();

  // Real Backend API Queries
  const { data: realLocationsRes } = useGetInventoryLocations();
  const { data: realBalancesRes } = useGetInventoryBalances();
  const { data: realLedgerRes } = useGetStockLedger(1, 100);
  const { data: realBatchesRes } = useGetInventoryBatches();

  // Batch creation states
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [batchProductId, setBatchProductId] = useState('');
  const [batchVariantId, setBatchVariantId] = useState('');
  const [batchLocationId, setBatchLocationId] = useState('');
  const [batchQuantity, setBatchQuantity] = useState<number | ''>('');
  const [batchMfgDate, setBatchMfgDate] = useState('');
  const [batchExpDate, setBatchExpDate] = useState('');

  // Fetch product list for batch creation
  const { data: productsRes } = useGetAllProductList(1, 100);
  const productsList = useMemo(() => {
    return productsRes?.data?.products ?? [];
  }, [productsRes]);

  // Fetch variants for selected product
  const variantsList = useMemo(() => {
    const selectedProduct = productsList.find((p: any) => p.id === batchProductId);
    return selectedProduct?.variants ?? [];
  }, [productsList, batchProductId]);

  const createBatchMutation = useCreateInventoryBatch();

  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNumber || !batchProductId || !batchLocationId || batchQuantity === '') {
      return;
    }

    try {
      await createBatchMutation.mutateAsync({
        batchNumber,
        lotNumber: lotNumber || undefined,
        productId: batchProductId,
        productVariantId: batchVariantId || undefined,
        locationId: batchLocationId,
        quantity: Number(batchQuantity),
        manufacturingDate: batchMfgDate || undefined,
        expiryDate: batchExpDate || undefined,
      });

      // Reset Form and close modal
      setIsCreatingBatch(false);
      setBatchNumber('');
      setLotNumber('');
      setBatchProductId('');
      setBatchVariantId('');
      setBatchLocationId('');
      setBatchQuantity('');
      setBatchMfgDate('');
      setBatchExpDate('');
    } catch (err) {
      console.error("Failed to create batch:", err);
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'locations' | 'ledger' | 'batches'>('overview');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedLocType, setSelectedLocType] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ 'root-wh': true });



  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
        setProductSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
        setProductSearchTerm('');
      }
      if (variantDropdownRef.current && !variantDropdownRef.current.contains(e.target as Node)) {
        setIsVariantDropdownOpen(false);
        setVariantSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setVariantSearchTerm('');
    setIsVariantDropdownOpen(false);
  }, [batchProductId]);

  const filteredVariantsList = useMemo(() => {
    if (!variantSearchTerm) return variantsList;
    const term = variantSearchTerm.toLowerCase();
    return variantsList.filter((v: any) => v.variantName.toLowerCase().includes(term));
  }, [variantsList, variantSearchTerm]);

  const filteredProductsList = useMemo(() => {
    if (!productSearchTerm) return productsList;
    const term = productSearchTerm.toLowerCase();
    return productsList.filter((p: any) => p.name.toLowerCase().includes(term));
  }, [productsList, productSearchTerm]);

  // Initialize mock data for snapshots and ledger if empty
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
        }
      ];
      setSnapshots(mockSnapshots);
    }

    if (ledger.length === 0) {
      const mockLedger: StockLedgerEntry[] = [
        {
          id: 'L-001',
          variantId: 'VAR-001',
          locationCode: 'MAIN-WH',
          dateTime: new Date(Date.now() - 3600000 * 2).toISOString(),
          qtyChange: 50,
          reason: 'GRN',
          reference: 'GRN-2026-001',
          performedBy: 'Supriya Sharma'
        },
        {
          id: 'L-002',
          variantId: 'VAR-002',
          locationCode: 'MAIN-WH',
          dateTime: new Date(Date.now() - 3600000 * 5).toISOString(),
          qtyChange: -10,
          reason: 'TRANSFER_OUT',
          reference: 'TRF-100234',
          performedBy: 'Sanjay Kumar'
        },
        {
          id: 'L-003',
          variantId: 'VAR-003',
          locationCode: 'DIST-CENTER',
          dateTime: new Date(Date.now() - 3600000 * 12).toISOString(),
          qtyChange: 200,
          reason: 'ADJUSTMENT',
          reference: 'ADJ-SYS-09',
          performedBy: 'Admin Team'
        }
      ];
      setLedger(mockLedger);
    }
  }, [snapshots.length, ledger.length, setSnapshots, setLedger]);

  // Sync real balances and ledger from backend to Redux
  useEffect(() => {
    if (realBalancesRes) {
      const raw = (realBalancesRes as any)?.data ?? [];
      if (raw.length > 0) {
        const transformed = raw.map((b: any) => ({
          variantId: b.productVariantId || b.productId,
          productName: b.product?.name || 'Unknown Product',
          variantLabel: b.productVariant?.variantName || 'Standard',
          sku: b.productVariant?.sku || b.product?.sku || 'N/A',
          locationName: b.location?.name || 'Unknown Location',
          locationCode: b.location?.id || b.locationId || '',
          onHand: b.onHand || 0,
          reserved: b.reserved || 0,
          damaged: b.damaged || 0,
          inbound: b.inbound || 0,
          reorderPoint: b.reorderPoint || 30,
          safetyStock: b.safetyStock || 20,
        }));

        const isDifferent = snapshots.length !== transformed.length ||
          transformed.some((t: any, idx: number) => {
            const current = snapshots[idx];
            return !current ||
              current.variantId !== t.variantId ||
              current.locationCode !== t.locationCode ||
              current.onHand !== t.onHand ||
              current.reserved !== t.reserved;
          });

        if (isDifferent) {
          setSnapshots(transformed);
        }
      }
    }
  }, [realBalancesRes, setSnapshots, snapshots]);

  useEffect(() => {
    if (realLedgerRes) {
      const raw = (realLedgerRes as any)?.data?.ledger ?? [];
      if (raw.length > 0) {
        const transformed = raw.map((entry: any) => ({
          id: entry.id,
          variantId: entry.productVariant?.variantName || entry.product?.name || entry.productVariantId || 'Unknown',
          locationCode: entry.location?.name || entry.locationId || 'Unknown',
          dateTime: entry.createdAt,
          qtyChange: entry.changeQuantity || 0,
          reason: entry.movement?.type || 'ADJUSTMENT',
          reference: entry.referenceId || entry.movementId || 'N/A',
          performedBy: entry.movement?.userId || 'System',
        }));

        const isDifferent = ledger.length !== transformed.length ||
          transformed.some((t: any, idx: number) => {
            const current = ledger[idx];
            return !current ||
              current.id !== t.id ||
              current.qtyChange !== t.qtyChange;
          });

        if (isDifferent) {
          setLedger(transformed);
        }
      }
    }
  }, [realLedgerRes, setLedger, ledger]);

  // Transform backend API data to match UI types with mock fallbacks
  const apiLocationsList = useMemo(() => {
    const raw = (realLocationsRes as any)?.data ?? [];
    if (raw.length === 0) return locations;
    return raw.map((loc: any) => ({
      code: loc.id,
      name: loc.name,
      type: loc.type,
      parentId: loc.parentId,
    }));
  }, [realLocationsRes, locations]);

  const apiSnapshotsList = useMemo(() => {
    const rawBalances = (realBalancesRes as any)?.data ?? [];
    if (productsList.length === 0) {
      if (rawBalances.length === 0) return snapshots;
      return rawBalances.map((b: any) => ({
        variantId: b.productVariantId || b.productId,
        productName: b.product?.name || 'Unknown Product',
        variantLabel: b.productVariant?.variantName || 'Standard',
        sku: b.productVariant?.sku || b.product?.sku || 'N/A',
        locationName: b.location?.name || 'Unknown Location',
        locationCode: b.location?.id || b.locationId || '',
        onHand: b.onHand || 0,
        reserved: b.reserved || 0,
        damaged: b.damaged || 0,
        inbound: b.inbound || 0,
        reorderPoint: b.reorderPoint || 30,
        safetyStock: b.safetyStock || 20,
        vehicleStock: b.vehicleStock || 0,
        image: b.image || null,
      }));
    }

    const firstLoc = apiLocationsList[0];
    const defaultLocationName = firstLoc?.name || 'PTP WAREHOUSE Location';
    const defaultLocationCode = firstLoc?.code || '';

    const snapshotsMap = new Map<string, any>();

    // Load actual stock balances
    rawBalances.forEach((b: any) => {
      const key = `${b.productId}-${b.productVariantId || ''}`;
      snapshotsMap.set(key, {
        variantId: b.productVariantId || b.productId,
        productName: b.product?.name || 'Unknown Product',
        variantLabel: b.productVariant?.variantName || 'Standard',
        sku: b.productVariant?.sku || b.product?.sku || 'N/A',
        locationName: b.location?.name || defaultLocationName,
        locationCode: b.location?.id || b.locationId || defaultLocationCode,
        onHand: b.onHand || 0,
        reserved: b.reserved || 0,
        damaged: b.damaged || 0,
        inbound: b.inbound || 0,
        reorderPoint: b.reorderPoint || 30,
        safetyStock: b.safetyStock || 20,
        vehicleStock: b.vehicleStock || 0,
        image: b.image || null,
      });
    });

    // Fill in placeholders for products/variants that do not have balance records
    productsList.forEach((p: any) => {
      const variants = p.variants || [];
      if (variants.length > 0) {
        variants.forEach((v: any) => {
          const key = `${p.id}-${v.id}`;
          if (!snapshotsMap.has(key)) {
            snapshotsMap.set(key, {
              variantId: v.id,
              productName: p.name,
              variantLabel: v.variantName || 'Standard',
              sku: v.sku || 'N/A',
              locationName: defaultLocationName,
              locationCode: defaultLocationCode,
              onHand: 0,
              reserved: 0,
              damaged: 0,
              inbound: 0,
              reorderPoint: p.threshold || 30,
              safetyStock: 20,
              vehicleStock: p.vehicleStock || 0,
              image: v.primaryImages?.[0] || p.images?.[0] || null,
            });
          }
        });
      } else {
        const key = `${p.id}-`;
        if (!snapshotsMap.has(key)) {
          snapshotsMap.set(key, {
            variantId: p.id,
            productName: p.name,
            variantLabel: p.variantName || 'Standard',
            sku: p.sku || 'N/A',
            locationName: defaultLocationName,
            locationCode: defaultLocationCode,
            onHand: 0,
            reserved: 0,
            damaged: 0,
            inbound: 0,
            reorderPoint: p.threshold || 30,
            safetyStock: 20,
            vehicleStock: p.vehicleStock || 0,
            image: p.images?.[0] || null,
          });
        }
      }
    });

    return Array.from(snapshotsMap.values());
  }, [realBalancesRes, productsList, apiLocationsList, snapshots]);

  const apiLedgerList = useMemo(() => {
    const raw = (realLedgerRes as any)?.data?.ledger ?? [];
    if (raw.length === 0) return ledger;
    return raw.map((entry: any) => ({
      id: entry.id,
      variantId: entry.productVariant?.variantName || entry.product?.name || entry.productVariantId || 'Unknown',
      locationCode: entry.location?.name || entry.locationId || 'Unknown',
      dateTime: entry.createdAt,
      qtyChange: entry.changeQuantity || 0,
      reason: entry.movement?.type || 'ADJUSTMENT',
      reference: entry.referenceId || entry.movementId || 'N/A',
      performedBy: entry.movement?.userId || 'System',
    }));
  }, [realLedgerRes, ledger]);

  const apiBatchesList = useMemo(() => {
    return (realBatchesRes as any)?.data ?? [];
  }, [realBatchesRes]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleResetFilters = () => {
    setSelectedLocation('All');
    setSelectedLocType('All');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const statusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'IN_STOCK', label: 'In Stock' },
    { value: 'LOW_STOCK', label: 'Low Stock' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
    { value: 'COMING_SOON', label: 'Coming Soon' },
    { value: 'NEGATIVE_STOCK', label: 'Negative' },
  ];

  // Filtering & Sorting
  const filteredAndSorted = useMemo(() => {
    let filtered = apiSnapshotsList;

    if (selectedLocation !== 'All') {
      filtered = filtered.filter((s) => s.locationCode === selectedLocation);
    }

    if (selectedLocType !== 'All') {
      filtered = filtered.filter((s) => {
        const name = s.locationName.toLowerCase();
        if (selectedLocType === 'WAREHOUSE') return name.includes('warehouse') || name.includes('wh') || name.includes('center');
        if (selectedLocType === 'STORE') return name.includes('store') || name.includes('branch');
        if (selectedLocType === 'VEHICLE') return name.includes('vehicle') || name.includes('truck') || name.includes('bike');
        return true;
      });
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((s) => s.productName.toLowerCase().includes(selectedCategory.toLowerCase()));
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter((s) => getInventoryStatus(s).code === selectedStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.productName.toLowerCase().includes(term) ||
          s.sku.toLowerCase().includes(term) ||
          s.variantLabel.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [apiSnapshotsList, selectedLocation, selectedLocType, selectedCategory, selectedStatus, searchTerm]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalOnHand = filteredAndSorted.reduce((sum, s) => sum + s.onHand, 0);
    const totalAvailable = filteredAndSorted.reduce((sum, s) => sum + calculateAvailable(s), 0);
    const totalReserved = filteredAndSorted.reduce((sum, s) => sum + s.reserved, 0);
    const totalDamaged = filteredAndSorted.reduce((sum, s) => sum + ((s as any).damaged || 0), 0);

    return { totalOnHand, totalAvailable, totalReserved, totalDamaged };
  }, [filteredAndSorted]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedSnapshots = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-6">
      {isCreatingBatch ? (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsCreatingBatch(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center text-gray-500 dark:text-gray-400"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Create New Inventory Batch
            </h2>
          </div>

          <form onSubmit={handleCreateBatchSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BAT-2026-001"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Lot Number
                </label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g. LOT-AB-12"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 relative" ref={productDropdownRef}>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Product *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      isProductDropdownOpen
                        ? productSearchTerm
                        : (productsList.find((p: any) => p.id === batchProductId)?.name || '')
                    }
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setProductSearchTerm('');
                      setIsProductDropdownOpen(true);
                    }}
                    placeholder="Search and select a product..."
                    className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                  />
                  <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Hidden input to preserve "required" validation on the form */}
                <input type="text" required value={batchProductId} readOnly className="sr-only" tabIndex={-1} />

                {isProductDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                    {filteredProductsList.length > 0 ? (
                      filteredProductsList.map((prod: any) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            setBatchProductId(prod.id);
                            setBatchVariantId('');
                            setProductSearchTerm('');
                            setIsProductDropdownOpen(false);
                          }}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-600 ${batchProductId === prod.id
                            ? 'bg-orange-100 dark:bg-gray-600 font-semibold text-orange-700 dark:text-orange-300'
                            : 'text-gray-700 dark:text-gray-200'
                            }`}
                        >
                          {prod.name}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400">No products found</div>
                    )}
                  </div>
                )}
              </div>

              {variantsList.length > 0 ? (
                <div className="col-span-1 sm:col-span-2 relative" ref={variantDropdownRef}>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Variant
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        isVariantDropdownOpen
                          ? variantSearchTerm
                          : (batchVariantId
                            ? (variantsList.find((v: any) => v.id === batchVariantId)?.variantName || '')
                            : 'Standard / None')
                      }
                      onChange={(e) => {
                        setVariantSearchTerm(e.target.value);
                        setIsVariantDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setVariantSearchTerm('');
                        setIsVariantDropdownOpen(true);
                      }}
                      placeholder="Search and select a variant..."
                      className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                    />
                    <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {isVariantDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                      <div
                        onClick={() => {
                          setBatchVariantId('');
                          setVariantSearchTerm('');
                          setIsVariantDropdownOpen(false);
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-600 ${batchVariantId === ''
                          ? 'bg-orange-100 dark:bg-gray-600 font-semibold text-orange-700 dark:text-orange-300'
                          : 'text-gray-700 dark:text-gray-200'
                          }`}
                      >
                        Standard / None
                      </div>
                      {filteredVariantsList.length > 0 ? (
                        filteredVariantsList.map((v: any) => (
                          <div
                            key={v.id}
                            onClick={() => {
                              setBatchVariantId(v.id);
                              setVariantSearchTerm('');
                              setIsVariantDropdownOpen(false);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-600 ${batchVariantId === v.id
                              ? 'bg-orange-100 dark:bg-gray-600 font-semibold text-orange-700 dark:text-orange-300'
                              : 'text-gray-700 dark:text-gray-200'
                              }`}
                          >
                            {v.variantName}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-400">No variants found</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden lg:block"></div> /* Empty grid slot to keep alignment uniform if no variants */
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Location *
                </label>
                <select
                  required
                  value={batchLocationId}
                  onChange={(e) => setBatchLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Location</option>
                  {apiLocationsList.map((loc: any) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mfg Date
                </label>
                <input
                  type="date"
                  value={batchMfgDate}
                  onChange={(e) => setBatchMfgDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={batchExpDate}
                  onChange={(e) => setBatchExpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsCreatingBatch(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createBatchMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {createBatchMutation.isPending ? 'Creating...' : 'Create Batch'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="w-full">
          {/* Page Title */}
          <div className="mb-4 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Inventory Command Center
            </h1>
          </div>

          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${activeTab === 'overview'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Package size={16} />
              Stock Overview
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${activeTab === 'locations'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Layers size={16} />
              Location Hierarchy
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${activeTab === 'ledger'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <History size={16} />
              Stock Ledger Trail
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${activeTab === 'batches'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Calendar size={16} />
              Batch & Expiry Tracker
            </button>
          </div>

          {activeTab === 'overview' && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Inventory" value={kpis.totalOnHand} icon={Package} variant="purple" />
                <StatCard title="Available Inventory" value={kpis.totalAvailable} icon={Package} variant="green" />
                <StatCard title="Reserved Inventory" value={kpis.totalReserved} icon={Package} variant="yellow" />
                <StatCard title="Damaged Inventory" value={kpis.totalDamaged} icon={Package} variant="red" />
              </div>

              {/* Filters and Search */}
              <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-wrap items-stretch divide-x divide-gray-300 dark:divide-gray-600 w-full lg:flex-1 overflow-hidden">
                  <div className="px-3 py-3 flex items-center justify-center flex-shrink-0">
                    <Filter size={18} className="text-gray-700 dark:text-gray-300" />
                  </div>

                  {/* Loc Type Filter */}
                  <div className="px-3 py-3 flex-1 min-w-[120px] relative">
                    <SelectInput
                      value={selectedLocType}
                      onChange={(e) => {
                        setSelectedLocType(e.target.value);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'All', label: 'All Types' },
                        { value: 'WAREHOUSE', label: 'Warehouses' },
                        { value: 'STORE', label: 'Stores' },
                        { value: 'VEHICLE', label: 'Vehicles' }
                      ]}
                    />
                  </div>

                  {/* Location Name Filter */}
                  <div className="px-3 py-3 flex-1 min-w-[140px] relative">
                    <SelectInput
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'All', label: 'All Locations' },
                        ...apiLocationsList.map((loc) => ({
                          value: loc.code,
                          label: loc.name,
                        })),
                      ]}
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="px-3 py-3 flex-1 min-w-[130px] relative">
                    <SelectInput
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'All', label: 'All Categories' },
                        ...((categoryData as any)?.data?.categories || []).map((cat: any) => ({
                          value: cat.name,
                          label: cat.name,
                        }))
                      ]}
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="px-3 py-3 flex-1 min-w-[120px] relative">
                    <SelectInput
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        setCurrentPage(1);
                      }}
                      options={statusOptions}
                    />
                  </div>

                  <div className="px-3 py-3 flex-shrink-0 flex items-center justify-center">
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-2 font-medium text-xs sm:text-sm text-orange-600 dark:text-orange-500 hover:opacity-80 transition-opacity"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>
                  </div>
                </div>

                <div className="w-full lg:w-auto lg:min-w-[200px]">
                  <SearchInput
                    placeholder="Search inventory..."
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
                  <div className="min-w-[1300px]">
                    <DataTable
                      data={paginatedSnapshots}
                      columns={[
                        {
                          key: 'thumbnail',
                          label: 'IMAGE',
                          render: (snapshot: InventorySnapshot) => (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0">
                              {(snapshot as any).image ? (
                                <img src={(snapshot as any).image} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <Package size={18} />
                              )}
                            </div>
                          ),
                        },
                        {
                          key: 'productName',
                          label: 'PRODUCT + VARIANT',
                          render: (snapshot: InventorySnapshot) => (
                            <div>
                              <div className="font-semibold text-gray-800 dark:text-gray-200">{snapshot.productName}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{snapshot.variantLabel}</div>
                            </div>
                          ),
                        },
                        {
                          key: 'sku',
                          label: 'SKU',
                          render: (snapshot: InventorySnapshot) => (
                            <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{snapshot.sku}</span>
                          ),
                        },
                        {
                          key: 'locationName',
                          label: 'LOCATION',
                          render: (snapshot: InventorySnapshot) => (
                            <span className="text-gray-700 dark:text-gray-300">{snapshot.locationName}</span>
                          ),
                        },
                        {
                          key: 'onHand',
                          label: 'ON HAND',
                          render: (snapshot: InventorySnapshot) => (
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{snapshot.onHand}</span>
                          ),
                        },
                        {
                          key: 'reserved',
                          label: 'RESERVED',
                          render: (snapshot: InventorySnapshot) => (
                            <span className="text-gray-600 dark:text-gray-400">{snapshot.reserved}</span>
                          ),
                        },
                        {
                          key: 'vehicleStock',
                          label: 'VEHICLE STOCK',
                          render: (snapshot: InventorySnapshot) => (
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{(snapshot as any).vehicleStock || 0}</span>
                          ),
                        },
                        {
                          key: 'inbound',
                          label: 'INBOUND',
                          render: (snapshot: InventorySnapshot) => (
                            <span className="text-gray-700 dark:text-gray-300">{snapshot.inbound || 0}</span>
                          ),
                        },
                        {
                          key: 'available',
                          label: 'AVAILABLE',
                          render: (snapshot: InventorySnapshot) => {
                            const available = calculateAvailable(snapshot);
                            return <span className="font-bold text-gray-950 dark:text-white">{available}</span>;
                          },
                        },
                        {
                          key: 'status',
                          label: 'STATUS',
                          render: (snapshot: InventorySnapshot) => {
                            const status = getInventoryStatus(snapshot);
                            return <StatusBadge status={status} />;
                          },
                        },
                        {
                          key: 'actions',
                          label: 'ACTIONS',
                          render: (snapshot: InventorySnapshot) => (
                            <div className="flex items-center gap-2">
                              <ViewIconButton onClick={() => navigate(`/inventory/sku/${snapshot.variantId}`)} />
                              <button
                                onClick={() => navigate(`/inventory/adjust/${snapshot.variantId}/${snapshot.locationCode}`, { state: { snapshot } })}
                                className="px-2.5 py-1 text-xs text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded transition-all font-medium"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={() => navigate('/inventory/operations/transfers/create', {
                                  state: {
                                    fromLocation: snapshot.locationCode,
                                    variantId: snapshot.variantId,
                                    sku: snapshot.sku,
                                    productName: snapshot.productName,
                                    currentOnHand: snapshot.onHand
                                  }
                                })}
                                className="px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded transition-all font-medium"
                              >
                                Transfer
                              </button>
                            </div>
                          ),
                        },
                      ]}
                      keyExtractor={(snapshot) => `${snapshot.variantId}-${snapshot.locationCode}`}
                      emptyMessage="No inventory items found"
                    />
                  </div>
                </div>

                {/* Pagination */}
                {filteredAndSorted.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <span>Show</span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span>
                          Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                          {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} items
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
            </>
          )}

          {activeTab === 'locations' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-md font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Layers size={18} className="text-orange-500" />
                Location Hierarchy Tree
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-6">
                Manage your nested spaces. Stock is allocated at the leaf level (e.g. Rack, Bin, or Vehicle) and aggregates up the node chain.
              </p>

              <div className="space-y-2 max-w-lg border border-gray-150 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/40">
                {/* Tree Root */}
                {apiLocationsList.length > 0 && apiLocationsList.some(l => l.parentId !== undefined) ? (
                  apiLocationsList.filter((loc: any) => !loc.parentId).map((rootLoc: any) => {
                    const rootExpanded = expandedNodes[rootLoc.code] ?? true;
                    const childLocs = apiLocationsList.filter((l: any) => l.parentId === rootLoc.code);
                    return (
                      <div className="flex flex-col" key={rootLoc.code}>
                        <div className="flex items-center gap-2 py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer" onClick={() => toggleNode(rootLoc.code)}>
                          <span className="text-gray-400">
                            {childLocs.length > 0 ? (rootExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <span className="w-4" />}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">{rootLoc.type}</span>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{rootLoc.name}</span>
                        </div>
                        {rootExpanded && childLocs.length > 0 && (
                          <div className="pl-6 border-l border-gray-200 dark:border-gray-700 ml-5 mt-1 space-y-1">
                            {childLocs.map((childLoc: any) => {
                              const childExpanded = expandedNodes[childLoc.code] ?? true;
                              const grandChildLocs = apiLocationsList.filter((l: any) => l.parentId === childLoc.code);
                              return (
                                <div className="flex flex-col" key={childLoc.code}>
                                  <div className="flex items-center gap-2 py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer" onClick={() => toggleNode(childLoc.code)}>
                                    <span className="text-gray-400">
                                      {grandChildLocs.length > 0 ? (childExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <span className="w-4" />}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">{childLoc.type}</span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{childLoc.name}</span>
                                  </div>
                                  {childExpanded && grandChildLocs.length > 0 && (
                                    <div className="pl-6 border-l border-gray-200 dark:border-gray-700 ml-5 mt-1 space-y-1">
                                      {grandChildLocs.map((grandChildLoc: any) => (
                                        <div className="flex items-center gap-2 py-1 px-3" key={grandChildLoc.code}>
                                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{grandChildLoc.type}</span>
                                          <span className="text-xs text-gray-600 dark:text-gray-400">{grandChildLoc.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer" onClick={() => toggleNode('root-wh')}>
                      <span className="text-gray-400">
                        {expandedNodes['root-wh'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">WH</span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Central Warehouse A (Primary WH)</span>
                    </div>

                    {expandedNodes['root-wh'] && (
                      <div className="pl-6 border-l border-gray-200 dark:border-gray-700 ml-5 mt-1 space-y-1">
                        {/* Store Child */}
                        <div className="flex items-center gap-2 py-1.5 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer" onClick={() => toggleNode('store-1')}>
                          <span className="text-gray-400">
                            {expandedNodes['store-1'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">STORE</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Store Branch 1 (Vijayawada)</span>
                        </div>

                        {expandedNodes['store-1'] && (
                          <div className="pl-6 border-l border-gray-200 dark:border-gray-700 ml-5 mt-1 space-y-1">
                            <div className="flex items-center gap-2 py-1 px-3">
                              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">VEHICLE</span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">Delivery Vehicle AP-16-TX (Active)</span>
                            </div>
                          </div>
                        )}

                        {/* Standard Rack */}
                        <div className="flex items-center gap-2 py-1 px-3">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">RACK</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Receiving Staging Zone</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-md font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <History size={18} className="text-orange-500" />
                  Immutable Stock Ledger
                </h3>
              </div>
              <div className="overflow-x-auto">
                <DataTable
                  data={apiLedgerList}
                  columns={[
                    {
                      key: 'dateTime',
                      label: 'TIMESTAMP',
                      render: (entry: StockLedgerEntry) => (
                        <span className="text-xs text-gray-600 dark:text-gray-400">{new Date(entry.dateTime).toLocaleString()}</span>
                      ),
                    },
                    {
                      key: 'variantId',
                      label: 'SKU / ITEM',
                      render: (entry: StockLedgerEntry) => (
                        <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">{entry.variantId}</span>
                      ),
                    },
                    {
                      key: 'locationCode',
                      label: 'LOCATION',
                      render: (entry: StockLedgerEntry) => (
                        <span className="text-xs text-gray-700 dark:text-gray-300">{entry.locationCode}</span>
                      ),
                    },
                    {
                      key: 'qtyChange',
                      label: 'QTY CHANGE',
                      render: (entry: StockLedgerEntry) => (
                        <span className={`font-bold text-xs ${entry.qtyChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {entry.qtyChange > 0 ? `+${entry.qtyChange}` : entry.qtyChange}
                        </span>
                      ),
                    },
                    {
                      key: 'reason',
                      label: 'TRANSACTION TYPE',
                      render: (entry: StockLedgerEntry) => (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{entry.reason}</span>
                      ),
                    },
                    {
                      key: 'reference',
                      label: 'REFERENCE',
                      render: (entry: StockLedgerEntry) => (
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{entry.reference || 'N/A'}</span>
                      ),
                    },
                    {
                      key: 'performedBy',
                      label: 'OPERATOR',
                      render: (entry: StockLedgerEntry) => (
                        <span className="text-xs text-gray-700 dark:text-gray-300">{entry.performedBy}</span>
                      ),
                    },
                  ]}
                  keyExtractor={(entry) => entry.id}
                  emptyMessage="No ledger entries found"
                />
              </div>
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-md font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Calendar size={18} className="text-orange-500" />
                  Batch & Expiry Tracker
                </h3>
                <button
                  onClick={() => setIsCreatingBatch(true)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition-all"
                >
                  Create Batch
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch Info</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry Date</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {apiBatchesList.length > 0 ? (
                      apiBatchesList.map((batch: any) => (
                        <tr key={batch.id}>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-white">{batch.batchNumber}</div>
                            <div className="text-[10px] text-gray-500">Lot: {batch.lotNumber || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-800 dark:text-gray-200">
                            {batch.product?.name || 'Unknown Product'}
                            {batch.productVariant?.variantName ? ` (${batch.productVariant.variantName})` : ''}
                          </td>
                          <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{batch.location?.name || 'Unknown'}</td>
                          <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200">{batch.quantity}</td>
                          <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                            {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${batch.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                              batch.status === 'HOLD' ? 'bg-amber-100 text-amber-800' :
                                'bg-green-100 text-green-800'
                              }`}>{batch.status}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-white">BAT-APP-2026A</div>
                            <div className="text-[10px] text-gray-500">Lot: LOT-00123</div>
                          </td>
                          <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Fresh Apples</td>
                          <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Main Warehouse</td>
                          <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200">150</td>
                          <td className="px-6 py-4 text-gray-700 dark:text-gray-300">2026-07-15</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">Active</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-white">BAT-MILK-09</div>
                            <div className="text-[10px] text-gray-500">Lot: LOT-0982</div>
                          </td>
                          <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Amul Milk</td>
                          <td className="px-6 py-4 text-gray-800 dark:text-gray-200">Distribution Center</td>
                          <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200">30</td>
                          <td className="px-6 py-4 text-gray-700 dark:text-gray-300">2026-06-12 (In 4 days)</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Near Expiry</span>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryOverview;
