import React, { useState, useMemo, useEffect } from 'react';
import { Filter, RotateCcw, ArrowLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DataTable,
  SearchInput,
  Button,
  Pagination
} from '../../../components/ui';
import procurementService from '../vsms/services/procurementService';
import { masterDataService } from '../../../api/packing/masterDataService';

interface ConfigureStockItem {
  id: string;
  grnId: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  image: string;
  isConfigured: boolean;
}

const ConfigureStock: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ConfigureStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [procurementGRNs, setProcurementGRNs] = useState<any[]>([]);
  const [selectedGRNId, setSelectedGRNId] = useState<string>('ALL');
  const [configFilter, setConfigFilter] = useState<'ALL' | 'UNCONFIGURED' | 'CONFIGURED'>('UNCONFIGURED');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const [res, catalogProducts] = await Promise.all([
        procurementService.getUnconfiguredGRNItems({ includeConfigured: true }),
        masterDataService.getProducts().catch(() => [])
      ]);

      const catalogMap = new Map<string, any>();
      (catalogProducts || []).forEach((p: any) => {
        if (p?.id) catalogMap.set(p.id, p);
        if (Array.isArray(p?.variants)) {
          p.variants.forEach((v: any) => {
            if (v?.id) catalogMap.set(v.id, { ...v, sku: v.sku || p.sku });
          });
        }
      });

      if (res.data?.success) {
        const items = res.data.data.map((item: any) => {
          const prodImage = (Array.isArray(item.product?.images) && item.product.images.length > 0)
            ? item.product.images[0]
            : (typeof item.product?.images === 'string' ? item.product.images : '') || item.product?.image || item.product?.masterProduct?.images?.[0] || item.product?.masterProduct?.image || '';

          const prodId = item.productVariantId || item.productId || item.product?.id;
          const catalogProd = prodId ? catalogMap.get(prodId) : null;
          const sku = catalogProd?.sku || catalogProd?.resolvedSku || item.product?.sku || item.product?.masterProduct?.sku || '-';

          return {
            id: item.id,
            grnId: item.grnId || item.goodsReceiptId || item.grn?.id || '',
            name: item.product?.name || 'Unknown',
            sku,
            category: item.resolvedCategory || item.product?.category?.name || item.product?.subCategory?.name || 'General',
            quantity: item.receivedQty || 0,
            unit: item.resolvedUnit || item.product?.unit || 'Units',
            price: item.resolvedPurchasePrice ?? item.product?.price ?? 0,
            image: prodImage,
            isConfigured: Boolean(item.isConfigured)
          };
        });
        setData(items);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGRNs = async () => {
    try {
      const res = await procurementService.getGRNs();
      const list = res.data?.data || res.data || [];
      setProcurementGRNs(list);
    } catch (err) {
      console.error('Failed to fetch GRNs', err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchGRNs();
  }, []);

  const handleConfigure = async (type: 'BRANDED' | 'NON-BRANDED') => {
    if (!selectedItems.length) return;
    try {
      setLoading(true);
      const payload = {
        items: selectedItems.map(id => ({ grnItemId: id, type }))
      };
      const res = await procurementService.configureGRNItemsToRaw(payload);
      if (res.data?.success) {
        setSelectedItems([]);
        toast.success(`Successfully marked as ${type === 'BRANDED' ? 'branded' : 'unbranded'}`);
        navigate('/inventory/raw');
      }
    } catch (error) {
      console.error("Configuration failed", error);
      toast.error('Configuration failed. Please try again.');
    } finally {
      setLoading(false);
      fetchItems();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    if (selectedGRNId !== 'ALL') {
      filtered = filtered.filter((item: any) => item.grnId === selectedGRNId);
    }

    if (configFilter === 'UNCONFIGURED') {
      filtered = filtered.filter((item) => !item.isConfigured);
    } else if (configFilter === 'CONFIGURED') {
      filtered = filtered.filter((item) => item.isConfigured);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.sku.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower)
      );
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField as keyof ConfigureStockItem];
        const bValue = b[sortField as keyof ConfigureStockItem];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, selectedGRNId, configFilter, sortField, sortDirection]);

  // Pagination
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Only unconfigured items in filtered list can be selected across all pages
  const allSelectableItems = useMemo(
    () => filteredAndSortedData.filter((item) => !item.isConfigured),
    [filteredAndSortedData]
  );

  const isAllSelected =
    allSelectableItems.length > 0 &&
    allSelectableItems.every((item) => selectedItems.includes(item.id));

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedItems((prev) =>
        prev.filter((id) => !allSelectableItems.some((item) => item.id === id))
      );
    } else {
      const selectableIds = allSelectableItems.map((item) => item.id);
      setSelectedItems((prev) => Array.from(new Set([...prev, ...selectableIds])));
    }
  };

  const pagination = {
    page: currentPage,
    limit: itemsPerPage,
    total: filteredAndSortedData.length,
    totalPages: Math.ceil(filteredAndSortedData.length / itemsPerPage),
    hasNext: currentPage < Math.ceil(filteredAndSortedData.length / itemsPerPage),
    hasPrev: currentPage > 1,
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const columns = [
    {
      key: 'checkbox',
      label: (
        <input
          type="checkbox"
          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          checked={isAllSelected}
          disabled={allSelectableItems.length === 0}
          onChange={toggleAll}
          title={isAllSelected ? "Deselect all" : `Select all ${allSelectableItems.length} items`}
        />
      ),
      sortable: false,
      render: (item: ConfigureStockItem) => {
        const isSelected = selectedItems.includes(item.id);
        if (item.isConfigured) {
          return (
            <input
              type="checkbox"
              disabled
              title="Already configured in Raw Inventory"
              className="w-4 h-4 text-gray-300 rounded border-gray-200 cursor-not-allowed opacity-40 bg-gray-100"
            />
          );
        }
        return (
          <input
            type="checkbox"
            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
            checked={isSelected}
            onChange={() => toggleSelection(item.id)}
          />
        );
      }
    },
    {
      key: 'name',
      label: 'STOCK NAME',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mr-3 overflow-hidden shrink-0 p-1">
            {item.image ? (
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-full h-full object-contain" 
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    const fallback = target.parentElement.querySelector('.fallback-letter') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <span 
              className="fallback-letter text-xs font-bold text-gray-600" 
              style={{ display: item.image ? 'none' : 'flex' }}
            >
              {item.name ? item.name[0].toUpperCase() : 'P'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700">{item.name}</span>
        </div>
      )
    },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <span className="text-sm text-gray-600 font-medium">{item.sku}</span>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <span className="text-sm text-gray-500">{item.category}</span>
      )
    },
    {
      key: 'quantity',
      label: 'QUANTITY',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <div className="text-center text-sm text-gray-600">{item.quantity}</div>
      )
    },
    {
      key: 'unit',
      label: 'UNIT',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <div className="text-center text-sm text-gray-500">{item.unit}</div>
      )
    },
    {
      key: 'price',
      label: 'PURCHASE PRICE (₹)',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        <div className="text-center text-sm text-gray-600 font-medium">₹{item.price}</div>
      )
    },
    {
      key: 'isConfigured',
      label: 'STATUS',
      sortable: true,
      render: (item: ConfigureStockItem) => (
        item.isConfigured ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Configured
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            Pending Config
          </span>
        )
      )
    }
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start">
          <button
            onClick={() => navigate('/inventory/raw')}
            className="mr-3 mt-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Configure Stock</h1>
            <p className="text-gray-500 text-sm hidden sm:block">Select procured stock items and mark them as Branded or Unbranded to add to Raw Inventory.</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex items-center border border-gray-300 rounded-lg bg-white h-10 shadow-sm w-fit flex-wrap sm:flex-nowrap">
          <div className="px-3.5 border-r border-gray-200 text-gray-600 flex items-center justify-center h-full">
            <Filter size={16} />
          </div>

          {/* Status Filter */}
          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select
              value={configFilter}
              onChange={(e) => {
                setConfigFilter(e.target.value as any);
                setSelectedItems([]);
                setCurrentPage(1);
              }}
              className="pl-4 pr-8 py-2 text-sm text-gray-700 bg-transparent focus:outline-none font-medium appearance-none h-full min-w-[160px] cursor-pointer"
            >
              <option value="UNCONFIGURED">Pending Config</option>
              <option value="CONFIGURED">Configured</option>
              <option value="ALL">All Status</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          {/* Procurement GRN Filter */}
          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select
              value={selectedGRNId}
              onChange={(e) => {
                setSelectedGRNId(e.target.value);
                setSelectedItems([]);
                setCurrentPage(1);
              }}
              className="pl-4 pr-8 py-2 text-sm text-gray-700 bg-transparent focus:outline-none font-medium appearance-none h-full min-w-[200px] cursor-pointer"
            >
              <option value="ALL">All Procurements (GRN)</option>
              {procurementGRNs.map((grn: any) => {
                const label = `${grn.displayId || grn.grnNumber || grn.id.slice(0, 8)} ${grn.po?.vendor?.vendorName ? `— ${grn.po.vendor.vendorName}` : ''}`;
                return (
                  <option key={grn.id} value={grn.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedGRNId('ALL');
              setConfigFilter('UNCONFIGURED');
              setSearchTerm('');
              setSelectedItems([]);
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-4 h-full text-[#ea580c] hover:bg-orange-50 transition-colors text-sm font-medium cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        <div className="w-full lg:w-auto lg:min-w-[320px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search...."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full rounded-lg"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable
            data={paginatedData}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={loading}
            keyExtractor={(item) => item.id}
            emptyMessage="No items to configure"
          />
        </div>

        {/* Selection Bar or Pagination */}
        {selectedItems.length > 0 ? (
          <div className="px-4 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
            <div className="text-sm flex items-center gap-2">
              <span className="font-bold text-gray-900">{selectedItems.length}</span>
              <span className="text-gray-500">items selected</span>
              <button
                type="button"
                onClick={() => setSelectedItems([])}
                className="text-xs text-red-600 hover:text-red-700 underline font-medium cursor-pointer ml-2"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                disabled={loading}
                onClick={() => handleConfigure('NON-BRANDED')}
                className="bg-[#ea580c] hover:bg-orange-700 text-white border-none flex items-center gap-2 px-5 py-2"
              >
                <Package size={16} />
                Mark as Unbranded
              </Button>
              <Button
                variant="primary"
                disabled={loading}
                onClick={() => handleConfigure('BRANDED')}
                className="bg-[#0f9d58] hover:bg-green-700 text-white border-none flex items-center gap-2 px-5 py-2"
              >
                <Package size={16} />
                Mark as Branded
              </Button>
            </div>
          </div>
        ) : (
          filteredAndSortedData.length > 0 && (
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
                      className="w-16 sm:w-20 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 bg-white text-gray-900"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="500">500</option>
                      <option value="1000">1000</option>
                    </select>
                  </div>
                  <span className="text-gray-600 whitespace-nowrap">
                    Showing{" "}
                    <span className="text-orange-600 dark:text-orange-500 font-medium">
                      {filteredAndSortedData.length > 0 ? ((currentPage - 1) * itemsPerPage + 1).toLocaleString() : 0}
                    </span>{" "}
                    of{" "}
                    <span className="text-orange-600 dark:text-orange-500 font-medium">
                      {filteredAndSortedData.length.toLocaleString()}
                    </span>
                  </span>
                </div>

                <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                  <Pagination
                    currentPage={currentPage}
                    pagination={pagination}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ConfigureStock;
