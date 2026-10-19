import React, { useState, useMemo, useEffect } from 'react';
import { Filter, RotateCcw, Lock, X, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import BarcodeScannerOverlay from '../../../components/BarcodeScannerOverlay';
import {
  DataTable,
  SearchInput,
  PrimaryButton,
  Pagination,
  EditIconButton
} from '../../../components/ui';
import { inventoryService } from './services/inventoryService';
import procurementService from '../vsms/services/procurementService';

interface ReadyInventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  units: string;
  readyQty: string;
  online: string;
  pos: string;
  vehicle: string;
  remainingQty: string;
  rawUnit: string;
  image: string;
  productId?: string;
}


const ReadyInventory: React.FC = () => {
  const [data, setData] = useState<ReadyInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [editingItem, setEditingItem] = useState<ReadyInventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ readyQty: '', online: '0', pos: '0', vehicle: '0' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const navigate = useNavigate();

  const [procurementGRNs, setProcurementGRNs] = useState<any[]>([]);
  const [selectedGRNId, setSelectedGRNId] = useState<string>('ALL');
  const [grnItemsMap, setGrnItemsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch GRNs & Procurement Items for unit resolution
      let map: Record<string, any[]> = {};
      let resolvedUnitMap: Record<string, string> = {};
      try {
        const [grnRes, unconfiguredRes] = await Promise.allSettled([
          inventoryService.getProcurementGRNs(),
          procurementService.getUnconfiguredGRNItems({ includeConfigured: true })
        ]);

        const list = grnRes.status === 'fulfilled' ? (grnRes.value.data?.data || grnRes.value.data || grnRes.value || []) : [];
        setProcurementGRNs(list);
        list.forEach((grn: any) => {
          if (grn.items && Array.isArray(grn.items)) {
            grn.items.forEach((item: any) => {
              const pid = item.productId || item.product?.id;
              if (pid) {
                if (!map[pid]) map[pid] = [];
                map[pid].push({
                  grnId: grn.id,
                  grnDisplayId: grn.displayId || grn.grnNumber || grn.id.slice(0, 8),
                  receivedQty: item.receivedQuantity || item.receivedQty || item.quantity || 0,
                  poDisplayId: grn.po?.displayId || grn.po?.poNumber || ''
                });
              }
            });
          }
        });
        setGrnItemsMap(map);

        if (unconfiguredRes.status === 'fulfilled') {
          const unconfData = unconfiguredRes.value.data?.data || unconfiguredRes.value.data || unconfiguredRes.value || [];
          if (Array.isArray(unconfData) && unconfData.length > 0) {
            unconfData.forEach((uItem: any) => {
              const baseProdId = uItem.product?.id || uItem.product?.productId;
              const rawProdId = uItem.productId;
              const unitVal = uItem.resolvedUnit;
              const targetIds = new Set<string>();
              if (baseProdId) targetIds.add(baseProdId);
              if (rawProdId) {
                targetIds.add(rawProdId);
                if (typeof rawProdId === 'string' && rawProdId.includes('_')) {
                  targetIds.add(rawProdId.split('_')[0]);
                }
              }
              targetIds.forEach(pid => {
                if (!resolvedUnitMap[pid] || (unitVal && unitVal !== 'Units' && (resolvedUnitMap[pid] === 'Grams' || resolvedUnitMap[pid] === 'Units'))) {
                  if (unitVal) resolvedUnitMap[pid] = unitVal;
                }
              });
            });
          }
        }
      } catch (err) {
        console.error('Error fetching procurement GRNs:', err);
      }

      // 2. Fetch Ready Inventory
      const response = await inventoryService.getReadyInventory({ page: 1, limit: 2000 });
      if (response.data && response.data.data) {
        const mappedData: ReadyInventoryItem[] = [];

        response.data.data.products.forEach((item: any) => {
          const prodImage = (Array.isArray(item.images) && item.images.length > 0)
            ? item.images[0]
            : (typeof item.images === 'string' ? item.images : '') || item.image || item.masterProduct?.images?.[0] || item.masterProduct?.image || '';

          const baseId = item.id ? item.id.split('_')[0] : item.id;
          const displayUnit = resolvedUnitMap[baseId] || resolvedUnitMap[item.id] || item.unit || 'Units';
          const grnList = map[item.id] || [];
          const totalProcuredQty = grnList.reduce((sum: number, g: any) => sum + (Number(g.receivedQty) || 0), 0);

          const fgList = Array.isArray(item.finishedGoods) ? item.finishedGoods : [];
          const variantMap: Record<string, any> = {};

          fgList.forEach((fg: any) => {
            let allocs = fg.costPayload?.outputAllocations;
            if (typeof allocs === 'string') {
              try { allocs = JSON.parse(allocs); } catch (e) {}
            }
            if (Array.isArray(allocs) && allocs.length > 0) {
              allocs.forEach((alloc: any) => {
                const allocProdId = alloc.sourceProductId || alloc.productId;
                if (!allocProdId || allocProdId === item.id || allocProdId === baseId) {
                  const vKey = alloc.skuName || alloc.productName || item.name;
                  const prodName = alloc.sourceProductName || item.name || 'Product';
                  if (!variantMap[vKey]) {
                    const rawSku = alloc.variantSku || alloc.sku || alloc.skuCode;
                    const isUuid = typeof rawSku === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSku.trim());
                    const isAutoSku = typeof rawSku === 'string' && rawSku.startsWith('SKU-');
                    const cleanSku = (rawSku && String(rawSku).trim() && !isUuid && !isAutoSku) ? String(rawSku).trim() : null;

                    const generatedSku = cleanSku || (() => {
                      const prefix = (item.name || 'PROD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
                      const pack = (alloc.packSizeText || '').replace(/\s+/g, '-').toUpperCase();
                      return pack ? `${prefix}-${pack}` : `${prefix}-VAR`;
                    })();

                    variantMap[vKey] = {
                      id: `${item.id}_${vKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
                      productId: item.id,
                      name: prodName,
                      sku: generatedSku,
                      barcode: item.barcode || item.posStoreStock?.barcode || '',
                      category: item.category?.name || 'N/A',
                      units: alloc.packSizeText ? 'Units' : displayUnit,
                      readyQty: 0,
                      online: 0,
                      pos: 0,
                      vehicle: 0,
                      rawUnit: displayUnit,
                      image: prodImage
                    };
                  }
                  variantMap[vKey].readyQty += Number(alloc.plannedUnits) || Number(fg.postedQty) || 0;
                }
              });
            }
          });

          // 1. Resolve Online stock from ChannelInventory, onlineStock, or onlineAppStock
          let onlineQty = 0;
          if (Array.isArray(item.channelInventories) && item.channelInventories.length > 0) {
            const onlineRecord = item.channelInventories.find((ci: any) =>
              ci.channel === 'ONLINE_APP' || ci.channel === 'ONLINE' || ci.channel === 'APP'
            );
            if (onlineRecord) onlineQty = Number(onlineRecord.quantity) || 0;
          }
          if (onlineQty === 0) {
            onlineQty = Number(item.onlineStock ?? item.onlineAppStock?.onlineStock ?? 0);
          }

          // 2. Resolve POS stock from ChannelInventory, posStock, or posStoreStock
          let posQty = 0;
          if (Array.isArray(item.channelInventories) && item.channelInventories.length > 0) {
            const posRecord = item.channelInventories.find((ci: any) =>
              ci.channel === 'POS_STORE' || ci.channel === 'POS'
            );
            if (posRecord) posQty = Number(posRecord.quantity) || 0;
          }
          if (posQty === 0) {
            posQty = Number(item.posStock ?? item.posStoreStock?.posStock ?? 0);
          }

          // 3. Resolve Vehicle stock from ChannelInventory (VEHICLE), vehicleStockAssignments, or vehicleStocks
          let vehicleFromCi = 0;
          if (Array.isArray(item.channelInventories) && item.channelInventories.length > 0) {
            const vehicleRecord = item.channelInventories.find((ci: any) => ci.channel === 'VEHICLE');
            if (vehicleRecord) vehicleFromCi = Number(vehicleRecord.quantity) || 0;
          }
          const vsaQty = Array.isArray(item.vehicleStockAssignments)
            ? item.vehicleStockAssignments.reduce((sum: number, v: any) => sum + (Number(v.quantity) || 0), 0)
            : (Array.isArray(item.vehicleStocks)
                ? item.vehicleStocks.reduce((sum: number, v: any) => sum + (Number(v.quantity) || 0), 0)
                : 0);
          const vehicleQty = vehicleFromCi > 0 ? vehicleFromCi : (vsaQty > 0 ? vsaQty : Number(item.vehicleStock || 0));

          const variantItems = Object.values(variantMap);
          if (variantItems.length > 0) {
            variantItems.forEach((vItem: any) => {
              const remainingQty = Math.max(0, vItem.readyQty - onlineQty - posQty - vehicleQty);

              mappedData.push({
                id: vItem.id,
                productId: vItem.productId,
                name: vItem.name,
                sku: vItem.sku,
                barcode: vItem.barcode,
                category: vItem.category,
                units: vItem.units,
                readyQty: String(vItem.readyQty),
                online: String(onlineQty),
                pos: String(posQty),
                vehicle: String(vehicleQty),
                remainingQty: String(remainingQty),
                rawUnit: vItem.rawUnit,
                image: vItem.image
              });
            });
          } else {
            const fgPosted = fgList.reduce((sum: number, fg: any) => sum + (fg.postedQty || 0), 0);
            const effectiveReadyQty = Math.max(
              Number(item.baseStock ?? item.stock ?? 0),
              totalProcuredQty,
              fgPosted
            );

            const remainingQty = Math.max(0, effectiveReadyQty - onlineQty - posQty - vehicleQty);

            mappedData.push({
              id: item.id,
              productId: item.id,
              name: item.name,
              sku: item.sku || '—',
              barcode: item.barcode || item.posStoreStock?.barcode || '',
              category: item.category?.name || 'N/A',
              units: displayUnit,
              readyQty: String(effectiveReadyQty),
              online: String(onlineQty),
              pos: String(posQty),
              vehicle: String(vehicleQty),
              remainingQty: String(Math.max(0, remainingQty)),
              rawUnit: displayUnit,
              image: prodImage
            });
          }
        });

        setData(mappedData);
      }
    } catch (error) {
      console.error('Error fetching ready inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    if (selectedGRNId !== 'ALL') {
      filtered = filtered.filter((item) => {
        const grnMetas = grnItemsMap[item.id];
        return grnMetas && Array.isArray(grnMetas) && grnMetas.some((g: any) => g.grnId === selectedGRNId);
      });
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.sku.toLowerCase().includes(searchLower) ||
          item.id.toLowerCase().includes(searchLower) ||
          (item.barcode && item.barcode.toLowerCase().includes(searchLower)) ||
          item.category.toLowerCase().includes(searchLower)
      );
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField as keyof ReadyInventoryItem];
        const bValue = b[sortField as keyof ReadyInventoryItem];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortField, sortDirection]);

  // Pagination
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
      else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openEdit = (item: ReadyInventoryItem) => {
    setEditingItem(item);
    setEditForm({ readyQty: item.readyQty, online: item.online, pos: item.pos, vehicle: item.vehicle });
  };

  const closeEdit = () => {
    setEditingItem(null);
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const totalQty = Math.max(0, Number(editForm.readyQty) || 0);
      const onlineQty = Math.max(0, Number(editForm.online) || 0);
      const posQty = Math.max(0, Number(editForm.pos) || 0);
      const vehicleQty = Math.max(0, Number(editForm.vehicle) || 0);
      const totalAllocated = onlineQty + posQty + vehicleQty;

      if (totalAllocated > totalQty) {
        toast.error(`Total allocated (${totalAllocated}) cannot exceed Ready Quantity (${totalQty}).`);
        setSaving(false);
        return;
      }

      const targetId = editingItem.productId || (typeof editingItem.id === 'string' && editingItem.id.includes('_') ? editingItem.id.split('_')[0] : editingItem.id);

      // 1. Update Product Master Stock
      await inventoryService.updateProductStock(targetId, totalQty);

      // 2. Update Channel Allocation in ChannelInventory (with mode='SET' so exact quantities are stored)
      await inventoryService.saveChannelAllocation(targetId, {
        onlineQty,
        posQty,
        vehicleQty,
        mode: 'SET'
      });

      const remaining = Math.max(0, totalQty - totalAllocated);

      setData(prev => prev.map(p => {
        if (p.id === editingItem.id) {
          return {
            ...p,
            readyQty: String(totalQty),
            online: String(onlineQty),
            pos: String(posQty),
            vehicle: String(vehicleQty),
            remainingQty: String(remaining)
          };
        }
        return p;
      }));

      closeEdit();
      toast.success('Ready stock and Channel Inventory updated successfully');
      loadData();
    } catch (err: any) {
      console.error('Failed to save:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save allocation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'STOCK NAME',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <div className="flex items-center min-w-[200px] max-w-[250px]">
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
          <span className="text-sm font-medium text-gray-700 line-clamp-2" title={item.name}>{item.name}</span>
        </div>
      )
    },
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-500">{item.sku}</span>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-500">{item.category}</span>
      )
    },
    {
      key: 'units',
      label: 'UNITS',
      sortable: false,
      render: (item: ReadyInventoryItem) => (
        <span className="text-sm text-gray-500">{item.units}</span>
      )
    },
    {
      key: 'readyQty',
      label: 'READY QTY',
      sortable: true,
      render: (item: any) => {
        const grnMetas = grnItemsMap[item.id] || [];
        const matchedGrn = grnMetas.find((g: any) => g.grnId === selectedGRNId) || grnMetas[0];
        const isGrnFiltered = selectedGRNId !== 'ALL' && matchedGrn;
        const displayQty = isGrnFiltered ? matchedGrn.receivedQty : (item.procuredQty > 0 ? item.procuredQty : item.readyQty);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900">{displayQty}</span>
            {isGrnFiltered && (
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5 w-fit">
                GRN Received: {matchedGrn.receivedQty}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'online',
      label: '(ONLINE)',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          Number(item.online) > 0
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'text-gray-500 bg-gray-50 border border-gray-200'
        }`}>
          {item.online}
        </span>
      )
    },
    {
      key: 'pos',
      label: '(POS)',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          Number(item.pos) > 0
            ? 'bg-purple-50 text-purple-700 border border-purple-200'
            : 'text-gray-500 bg-gray-50 border border-gray-200'
        }`}>
          {item.pos}
        </span>
      )
    },
    {
      key: 'vehicle',
      label: '(VEHICLE)',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          Number(item.vehicle) > 0
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'text-gray-500 bg-gray-50 border border-gray-200'
        }`}>
          {item.vehicle}
        </span>
      )
    },
    {
      key: 'remainingQty',
      label: 'REMAINING QTY',
      sortable: true,
      render: (item: ReadyInventoryItem) => (
        <span className="inline-block px-3 py-1 rounded bg-[#eaf8f1] text-[#20b05e] text-sm font-semibold">
          {item.remainingQty}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'ACTION',
      sortable: false,
      render: (item: ReadyInventoryItem) => (
        <div className="flex justify-center items-center">
          <EditIconButton onClick={() => openEdit(item)} size={16} tooltip="Edit" />
        </div>
      )
    }
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Edit Ready Inventory</h2>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{editingItem.name}</p>
              </div>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Total Ready Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.readyQty}
                  onChange={e => setEditForm(f => ({ ...f, readyQty: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-semibold"
                />
              </div>

              {/* Channel Inventory Allocation */}
              <div className="pt-2 border-t border-gray-100">
                <span className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5">
                  Channel Inventory Stock Allocation
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 mb-1">
                      Online App
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.online}
                      onChange={e => setEditForm(f => ({ ...f, online: e.target.value }))}
                      className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-700 mb-1">
                      POS Store
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.pos}
                      onChange={e => setEditForm(f => ({ ...f, pos: e.target.value }))}
                      className="w-full border border-purple-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 bg-purple-50/30 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-700 mb-1">
                      Vehicle Sales
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.vehicle}
                      onChange={e => setEditForm(f => ({ ...f, vehicle: e.target.value }))}
                      className="w-full border border-amber-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-center"
                    />
                  </div>
                </div>

                {/* Stock Summary Pill */}
                {(() => {
                  const tReady = Number(editForm.readyQty) || 0;
                  const tOnline = Number(editForm.online) || 0;
                  const tPos = Number(editForm.pos) || 0;
                  const tVehicle = Number(editForm.vehicle) || 0;
                  const tAlloc = tOnline + tPos + tVehicle;
                  const tRem = tReady - tAlloc;
                  const isOver = tAlloc > tReady;

                  return (
                    <div className="mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Total Channel Allocated:</span>
                        <span className="font-semibold text-gray-800">{tAlloc}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">Remaining Unallocated:</span>
                        <span className={`font-bold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                          {tRem}
                        </span>
                      </div>
                      {isOver && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">
                          ⚠️ Total allocated ({tAlloc}) exceeds Total Ready stock ({tReady}).
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-[#008f33] hover:bg-[#007a2a] rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Ready Inventory</h1>
          <p className="text-gray-500 text-sm hidden sm:block">Manage sellable stock and reserve quantities across sales channels (Online, POS and Vehicle Sales).</p>
        </div>
        <PrimaryButton
          onClick={() => navigate('/inventory/ready/reserve')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Lock size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Reserve Stock</span>
        </PrimaryButton>
      </div>


      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex items-center border border-gray-300 rounded-lg bg-white h-10 shadow-sm w-fit">
          <div className="px-3.5 border-r border-gray-200 text-gray-600 flex items-center justify-center h-full">
            <Filter size={16} />
          </div>



          {/* Procurement GRN Filter */}
          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select
              value={selectedGRNId}
              onChange={(e) => {
                setSelectedGRNId(e.target.value);
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
              setSearchTerm('');
              setCurrentPage(1);
            }}
            className="flex items-center gap-1.5 px-4 h-full text-[#ea580c] hover:bg-orange-50 transition-colors text-sm font-medium cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        <div className="w-full lg:w-auto flex items-center gap-2">
          <div className="w-full sm:w-56 lg:w-64">
            <SearchInput
              placeholder="Search name, ID, SKU, barcode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 w-full rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg shadow-sm hover:shadow transition-all text-xs sm:text-sm font-semibold whitespace-nowrap active:scale-95 h-10 shrink-0"
            title="Scan product barcode using camera"
          >
            <Camera size={16} />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>
      </div>

      {isScannerOpen && (
        <BarcodeScannerOverlay
          onScan={(code: string) => {
            const cleanCode = String(code || '').trim();
            if (cleanCode) {
              setSearchTerm(cleanCode);
              setCurrentPage(1);
              setIsScannerOpen(false);
            }
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

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
            emptyMessage="No stock items found"
          />
        </div>

        {/* Pagination */}
        {filteredAndSortedData.length > 0 && (
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
                    className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 bg-white text-gray-900"
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
        )}
      </div>
    </div>
  );
};

export default ReadyInventory;
