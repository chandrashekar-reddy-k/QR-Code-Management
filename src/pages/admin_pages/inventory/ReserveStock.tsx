import React, { useState, useMemo, useEffect } from 'react';
import { Filter, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  DataTable,
  SearchInput,
  Pagination
} from '../../../components/ui';
import { inventoryService } from './services/inventoryService';

interface ReserveStockItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: string;
  available: string;
  image: string;
}

const ReserveStock: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ReserveStockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, { online: number; pos: number; vehicle: number }>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [procurementGRNs, setProcurementGRNs] = useState<any[]>([]);
  const [selectedGRNId, setSelectedGRNId] = useState('ALL');
  const [grnItemsMap, setGrnItemsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReadyItems();
    inventoryService.getProcurementGRNs().then((res: any) => {
      const list = res.data?.data || res.data || [];
      setProcurementGRNs(list);
      const map: Record<string, string> = {};
      list.forEach((grn: any) => {
        if (grn.items && Array.isArray(grn.items)) {
          grn.items.forEach((item: any) => {
            if (item.productId) {
              map[item.productId] = grn.id;
            }
          });
        }
      });
      setGrnItemsMap(map);
    }).catch(console.error);
  }, []);

  const fetchReadyItems = async () => {
    try {
      const response = await inventoryService.getReadyInventory({ page: 1, limit: 100 });
      if (response.data?.data) {
        const unallocatedProducts = response.data.data.products.filter((item: any) => {
          const totalStock = item.stock ?? item.baseStock ?? 0;
          
          let onlineStock = 0;
          let posStock = 0;
          if (Array.isArray(item.channelInventories)) {
            const onlineRecord = item.channelInventories.find((ci: any) => ci.channel === 'ONLINE_APP');
            const posRecord = item.channelInventories.find((ci: any) => ci.channel === 'POS_STORE');
            if (onlineRecord) onlineStock = Number(onlineRecord.quantity) || 0;
            if (posRecord) posStock = Number(posRecord.quantity) || 0;
          } else {
            onlineStock = item.onlineAppStock?.onlineStock ?? 0;
            posStock = item.posStoreStock?.posStock ?? 0;
          }

          const vStock = item.vehicleStoreStock ?? (Array.isArray(item.vehicleStocks) ? item.vehicleStocks.reduce((sum: number, v: any) => sum + (Number(v.quantity) || 0), 0) : 0);
          const allocated = onlineStock + posStock + vStock;
          return totalStock > allocated;
        });

        const mapped: ReserveStockItem[] = unallocatedProducts.map((item: any) => {
          const totalStock = item.stock ?? item.baseStock ?? 0;
          
          let onlineStock = 0;
          let posStock = 0;
          if (Array.isArray(item.channelInventories)) {
            const onlineRecord = item.channelInventories.find((ci: any) => ci.channel === 'ONLINE_APP');
            const posRecord = item.channelInventories.find((ci: any) => ci.channel === 'POS_STORE');
            if (onlineRecord) onlineStock = Number(onlineRecord.quantity) || 0;
            if (posRecord) posStock = Number(posRecord.quantity) || 0;
          } else {
            onlineStock = item.onlineAppStock?.onlineStock ?? 0;
            posStock = item.posStoreStock?.posStock ?? 0;
          }

          const vStock = item.vehicleStoreStock ?? (Array.isArray(item.vehicleStocks) ? item.vehicleStocks.reduce((sum: number, v: any) => sum + (Number(v.quantity) || 0), 0) : 0);
          const allocated = onlineStock + posStock + vStock;
          const remaining = Math.max(0, totalStock - allocated);

          return {
            id: item.id,
            name: item.name,
            sku: item.sku || '-',
            unit: item.unit || 'units',
            price: '₹' + (item.price || item.mrp || 0),
            available: String(remaining),
            image: item.name ? item.name.charAt(0).toUpperCase() : 'N',
          };
        });
        setData(mapped);
        // Pre-fill quantities from existing channel data
        const initialQty: Record<string, { online: number; pos: number; vehicle: number }> = {};
        unallocatedProducts.forEach((item: any) => {
          initialQty[item.id] = {
            online: 0,
            pos: 0,
            vehicle: 0,
          };
        });
        setQuantities(initialQty);
      }
    } catch (error) {
      console.error('Error fetching ready inventory:', error);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedItems.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedData.map(item => item.id));
    }
  };

  const handleQtyChange = (id: string, field: 'online' | 'pos' | 'vehicle', value: number) => {
    const item = data.find(i => i.id === id);
    const available = item ? parseInt(item.available) || 0 : 0;
    const currentQty = quantities[id] || { online: 0, pos: 0, vehicle: 0 };
    const newQty = { ...currentQty, [field]: Math.max(0, value) };
    const totalAllocated = newQty.online + newQty.pos + newQty.vehicle;

    if (totalAllocated > available) {
      toast.error(`Low Stock Alert: Total allocated (${totalAllocated}) exceeds available stock (${available}) for ${item?.name || 'product'}`);
    }

    setQuantities(prev => ({
      ...prev,
      [id]: newQty
    }));
  };

  const saveSelectedAllocations = async () => {
    if (selectedItems.length === 0) return;

    // Validate allocations against available stock
    for (const itemId of selectedItems) {
      const item = data.find(d => d.id === itemId);
      const qty = quantities[itemId] || { online: 0, pos: 0, vehicle: 0 };
      const totalWanted = (qty.online || 0) + (qty.pos || 0) + (qty.vehicle || 0);
      const avail = Number(item?.available) || 0;

      if (totalWanted <= 0) {
        toast.error(`Please allocate at least 1 unit across channels for "${item?.name || 'selected item'}".`);
        return;
      }

      if (totalWanted > avail) {
        toast.error(`Cannot allocate ${totalWanted} units for "${item?.name || 'selected item'}". Exceeds available stock (${avail}).`);
        return;
      }
    }

    setIsSaving(true);
    
    try {
      await Promise.all(
        selectedItems.map(async (itemId) => {
          const qty = quantities[itemId] || { online: 0, pos: 0, vehicle: 0 };
          await inventoryService.saveChannelAllocation(itemId, {
            onlineQty: qty.online,
            posQty: qty.pos,
            vehicleQty: qty.vehicle,
          });
        })
      );
      
      // Refresh list to filter out fully allocated items automatically
      await fetchReadyItems();
      setSelectedItems([]);
      
      toast.success(`Stock reserved successfully for ${selectedItems.length} item(s).`);
    } catch (err: any) {
      console.error('Failed to save allocations:', err);
      const backendMessage = err?.response?.data?.message || err?.message || 'Failed to save allocation. Please try again.';
      toast.error(backendMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter and sort
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;
    if (selectedGRNId !== 'ALL') {
      filtered = filtered.filter(item => grnItemsMap[item.id] === selectedGRNId);
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(searchLower) ||
          item.sku.toLowerCase().includes(searchLower)
      );
    }
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField as keyof ReserveStockItem];
        const bValue = b[sortField as keyof ReserveStockItem];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }
    return filtered;
  }, [data, selectedGRNId, grnItemsMap, searchTerm, sortField, sortDirection]);

  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
      else if (sortDirection === 'desc') { setSortField(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const QtyInput = ({ itemId, field, isOverAllocated }: { itemId: string; field: 'online' | 'pos' | 'vehicle'; isOverAllocated: boolean }) => {
    const item = data.find(i => i.id === itemId);
    const available = item ? parseInt(item.available) || 0 : 0;
    const qty = quantities[itemId] || { online: 0, pos: 0, vehicle: 0 };
    const totalAllocated = qty.online + qty.pos + qty.vehicle;
    const isExceeded = isOverAllocated || totalAllocated > available;

    return (
      <div className={`flex items-center border rounded-md overflow-hidden w-[100px] h-9 bg-white mx-auto transition-colors ${
        isExceeded ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-[#d2d6df]'
      }`}>
        <input
          type="number"
          min="0"
          className={`w-full text-center text-[13px] font-bold focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${isExceeded ? 'text-red-700 bg-red-50' : 'text-gray-700 bg-white'}`}
          value={qty[field] || 0}
          onChange={e => handleQtyChange(itemId, field, parseInt(e.target.value) || 0)}
          style={{ MozAppearance: 'textfield' }}
        />
        <div className={`flex flex-col border-l ${isExceeded ? 'border-red-300 bg-red-100' : 'border-[#d2d6df] bg-white'} h-full w-[26px] flex-shrink-0`}>
          <button
            className={`flex-1 flex items-center justify-center ${isExceeded ? 'text-red-600 hover:bg-red-200' : 'text-[#7a869a] hover:bg-gray-50'} transition-colors border-b ${isExceeded ? 'border-red-300' : 'border-[#d2d6df]'}`}
            onClick={() => handleQtyChange(itemId, field, (qty[field] || 0) + 1)}
          >
            <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M4 0L8 5H0L4 0Z" /></svg>
          </button>
          <button
            className={`flex-1 flex items-center justify-center ${isExceeded ? 'text-red-600 hover:bg-red-200' : 'text-[#7a869a] hover:bg-gray-50'} transition-colors`}
            onClick={() => handleQtyChange(itemId, field, (qty[field] || 0) - 1)}
          >
            <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M4 5L0 0H8L4 5Z" /></svg>
          </button>
        </div>
      </div>
    );
  };

  const columns = [
    {
      key: 'checkbox',
      label: (
        <input
          type="checkbox"
          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
          checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
          onChange={toggleAll}
        />
      ),
      sortable: false,
      render: (item: ReserveStockItem) => (
        <input
          type="checkbox"
          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelection(item.id)}
        />
      )
    },
    {
      key: 'name',
      label: 'STOCK NAME',
      sortable: false,
      render: (item: ReserveStockItem) => {
        const availNum = Number(item.available) || 0;
        const isLowStock = availNum > 0 && availNum <= 10;
        const isOutOfStock = availNum <= 0;

        return (
          <div className="flex items-center min-w-[170px]">
            <div className="w-9 h-9 rounded-lg bg-[#fff5f2] flex-shrink-0 flex items-center justify-center mr-3 text-sm font-semibold text-orange-400 border border-orange-100">
              {item.image}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#0066cc] cursor-pointer hover:underline line-clamp-1">{item.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">SKU: {item.sku}</span>
                {isOutOfStock ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                    OUT OF STOCK
                  </span>
                ) : isLowStock ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    LOW STOCK ({availNum})
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-gray-400">{item.unit}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'price',
      label: 'SELLING PRICE',
      sortable: false,
      render: (item: ReserveStockItem) => (
        <span className="text-sm font-medium text-gray-700">{item.price}</span>
      )
    },
    {
      key: 'online',
      label: 'ONLINE ORDERS',
      sortable: false,
      render: (item: ReserveStockItem) => {
        const qty = quantities[item.id] || { online: 0, pos: 0, vehicle: 0 };
        const total = (qty.online || 0) + (qty.pos || 0) + (qty.vehicle || 0);
        const avail = Number(item.available) || 0;
        return <QtyInput itemId={item.id} field="online" isOverAllocated={total > avail} />;
      }
    },
    {
      key: 'pos',
      label: 'POS SALES',
      sortable: false,
      render: (item: ReserveStockItem) => {
        const qty = quantities[item.id] || { online: 0, pos: 0, vehicle: 0 };
        const total = (qty.online || 0) + (qty.pos || 0) + (qty.vehicle || 0);
        const avail = Number(item.available) || 0;
        return <QtyInput itemId={item.id} field="pos" isOverAllocated={total > avail} />;
      }
    },
    {
      key: 'vehicle',
      label: 'VEHICLE SALES',
      sortable: false,
      render: (item: ReserveStockItem) => {
        const qty = quantities[item.id] || { online: 0, pos: 0, vehicle: 0 };
        const total = (qty.online || 0) + (qty.pos || 0) + (qty.vehicle || 0);
        const avail = Number(item.available) || 0;
        return <QtyInput itemId={item.id} field="vehicle" isOverAllocated={total > avail} />;
      }
    },
    {
      key: 'available',
      label: 'AVAILABLE QTY',
      sortable: false,
      render: (item: ReserveStockItem) => {
        const avail = Number(item.available) || 0;
        const qty = quantities[item.id] || { online: 0, pos: 0, vehicle: 0 };
        const totalAlloc = (qty.online || 0) + (qty.pos || 0) + (qty.vehicle || 0);
        const isOver = totalAlloc > avail;
        const isLow = avail > 0 && avail <= 10;

        return (
          <div className="flex flex-col items-center gap-1">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${
              isOver 
                ? 'bg-red-50 text-red-600 border-red-200 font-bold' 
                : isLow 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-[#eaf8f1] text-[#20b05e] border-green-200'
            }`}>
              Available: {item.available}
            </span>
            {isOver && (
              <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                Exceeds by {totalAlloc - avail} ({totalAlloc}/{avail})
              </span>
            )}
            {!isOver && totalAlloc > 0 && (
              <span className="text-[11px] text-gray-500 font-medium">
                Allocating: {totalAlloc} (Rem: {avail - totalAlloc})
              </span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Header */}
      <div className="mb-4 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start">
          <button
            onClick={() => navigate('/inventory/ready')}
            className="mr-3 mt-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Reserve Stocks</h1>
            <p className="text-gray-500 text-sm hidden sm:block">Select a ready stock item and allocate quantities for each sales channel.</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center border border-gray-300 rounded-lg bg-white h-10 shadow-sm w-fit">
          <div className="px-3.5 border-r border-gray-200 text-gray-600 flex items-center justify-center h-full">
            <Filter size={16} />
          </div>
          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select 
              value={selectedGRNId}
              onChange={(e) => {
                setSelectedGRNId(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-4 pr-8 py-2 text-sm text-gray-700 bg-transparent focus:outline-none font-medium appearance-none h-full min-w-[180px] cursor-pointer"
            >
              <option value="ALL">All Procurements (GRN)</option>
              {procurementGRNs.map((grn) => {
                const label = `${grn.displayId || grn.grnNumber || grn.id.slice(0, 8)} ${grn.po?.vendor?.vendorName ? `— ${grn.po.vendor.vendorName}` : ''}`;
                return (
                  <option key={grn.id} value={grn.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select className="pl-4 pr-8 py-2 text-sm text-gray-700 bg-transparent focus:outline-none font-medium appearance-none h-full min-w-[140px] cursor-pointer">
              <option>All Categories</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select className="pl-4 pr-8 py-2 text-sm text-gray-700 bg-transparent focus:outline-none font-medium appearance-none h-full min-w-[100px] cursor-pointer">
              <option>Units</option>
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <button
            onClick={() => { setSelectedGRNId('ALL'); setSearchTerm(''); setCurrentPage(1); }}
            className="flex items-center gap-1.5 px-4 h-full text-[#ea580c] hover:bg-orange-50 transition-colors text-sm font-medium cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset Filter</span>
          </button>
        </div>

        <div className="w-full lg:w-auto lg:min-w-[320px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search stock name, SKU, Category..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
            loading={false}
            keyExtractor={item => item.id}
            emptyMessage="No items in Reserve Stock. Mark items from Raw Inventory first."
          />
        </div>

        {filteredAndSortedData.length > 0 && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 whitespace-nowrap">Show</span>
                <select
                  value={itemsPerPage.toString()}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-14 sm:w-16 h-7 text-xs border border-gray-300 rounded px-2 focus:outline-none bg-white text-gray-900"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-gray-600 whitespace-nowrap">
                  Showing{' '}
                  <span className="text-orange-600 font-medium">
                    {filteredAndSortedData.length > 0 ? ((currentPage - 1) * itemsPerPage + 1) : 0}
                  </span>{' '}
                  of{' '}
                  <span className="text-orange-600 font-medium">{filteredAndSortedData.length}</span>
                </span>
              </div>
              <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                <Pagination currentPage={currentPage} pagination={pagination} onPageChange={setCurrentPage} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="mt-6 flex items-center justify-end gap-4">
        <button
          onClick={() => navigate('/inventory/ready')}
          className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={saveSelectedAllocations}
          disabled={selectedItems.length === 0 || isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#008f33] hover:bg-[#007a2a] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          {isSaving ? 'Reserving...' : 'Reserve Stock'}
        </button>
      </div>
    </div>
  );
};

export default ReserveStock;
