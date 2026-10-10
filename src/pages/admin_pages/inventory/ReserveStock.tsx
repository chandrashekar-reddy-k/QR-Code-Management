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
import procurementService from '../vsms/services/procurementService';

interface ReserveStockItem {
  id: string;
  productId?: string;
  name: string;
  sku: string;
  unit: string;
  price: string;
  available: string;
  stock: number;
  procuredQty: number;
  image: string;
}

interface QtyCellProps {
  itemId: string;
  field: 'online' | 'pos' | 'vehicle';
  value: number;
  available: number;
  totalAllocated: number;
  onChange: (itemId: string, field: 'online' | 'pos' | 'vehicle', value: number) => void;
  onBlurValidate: (itemId: string) => void;
}

const QtyCell: React.FC<QtyCellProps> = React.memo(({
  itemId,
  field,
  value,
  available,
  totalAllocated,
  onChange,
  onBlurValidate
}) => {
  // Keep local string state to allow natural typing of multi-digit numbers like 10, 25, 100 without losing cursor
  const [localVal, setLocalVal] = useState<string>(value > 0 ? String(value) : '');

  useEffect(() => {
    setLocalVal(value > 0 ? String(value) : '');
  }, [value]);

  const isExceeded = totalAllocated > available;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty string or digits only
    if (raw === '' || /^\d+$/.test(raw)) {
      setLocalVal(raw);
      const numeric = raw === '' ? 0 : parseInt(raw, 10);
      onChange(itemId, field, isNaN(numeric) ? 0 : numeric);
    }
  };

  return (
    <div className="w-[84px] mx-auto">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={`w-full h-9 px-2 text-center text-[13px] font-semibold border rounded-lg focus:outline-none transition-all ${
          isExceeded
            ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200'
            : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100'
        }`}
        value={localVal}
        placeholder="0"
        onChange={handleChange}
        onBlur={() => onBlurValidate(itemId)}
      />
    </div>
  );
});

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
  const [loading, setLoading] = useState(true);

  const [procurementGRNs, setProcurementGRNs] = useState<any[]>([]);
  const [selectedGRNId, setSelectedGRNId] = useState('ALL');
  const [grnItemsMap, setGrnItemsMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Procurement GRNs & Unconfigured items for unit resolution
      let map: Record<string, any[]> = {};
      let resolvedUnitMap: Record<string, string> = {};
      let resolvedPriceMap: Record<string, number> = {};
      const vehicleQtyUpdates: Record<string, number> = {};

      try {
        const [grnRes, unconfiguredRes] = await Promise.allSettled([
          inventoryService.getProcurementGRNs(),
          procurementService.getUnconfiguredGRNItems({ includeConfigured: true })
        ]);

        const list = grnRes.status === 'fulfilled' ? (grnRes.value.data?.data || grnRes.value.data || grnRes.value || []) : [];
        setProcurementGRNs(list);

        list.forEach((grn: any) => {
          if (grn.items && Array.isArray(grn.items)) {
            let poMetaItems: any[] = [];
            if (grn.po?.remarks && typeof grn.po.remarks === 'string' && grn.po.remarks.includes('[PO_METADATA]:')) {
              try {
                const metaStr = grn.po.remarks.split('[PO_METADATA]:')[1];
                const parsed = JSON.parse(metaStr);
                poMetaItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
              } catch (e) {}
            }

            grn.items.forEach((item: any) => {
              const pId = item.productId || item.product?.id || item.id;
              if (pId) {
                if (!map[pId]) map[pId] = [];
                const poItem = grn.po?.items?.find((pi: any) => pi.productId === item.productId || pi.productId === pId);
                const metaItem = poMetaItems.find((m: any) => m.productId === item.productId || m.productId === pId);

                const configuredSellingPrice = Number(
                  metaItem?.sellingPrice ?? metaItem?.mrp ??
                  item.sellingPrice ?? item.mrp ??
                  poItem?.sellingPrice ?? poItem?.mrp ?? 0
                );

                const receivedQty = Number(item.receivedQuantity ?? item.receivedQty ?? item.quantity ?? 0);
                map[pId].push({
                  grnId: grn.id,
                  grnDisplayId: grn.displayId || grn.grnNumber || grn.id.slice(0, 8),
                  receivedQty,
                  sellingPrice: configuredSellingPrice,
                  poDisplayId: grn.po?.displayId || grn.po?.poNumber || ''
                });

                if (receivedQty > 0) {
                  vehicleQtyUpdates[pId] = (vehicleQtyUpdates[pId] || 0) + receivedQty;
                }
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
              const sPrice = Number(uItem.sellingPrice ?? uItem.mrp ?? 0);
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
                if (sPrice > 0 && !resolvedPriceMap[pid]) {
                  resolvedPriceMap[pid] = sPrice;
                }
              });
            });
          }
        }
      } catch (grnErr) {
        console.error('Error fetching procurement GRNs:', grnErr);
      }

      // 2. Fetch Ready Inventory
      const response = await inventoryService.getReadyInventory({ page: 1, limit: 1000 });
      if (response.data?.data) {
        const products = response.data.data.products || [];
        const mapped: ReserveStockItem[] = [];
        const initialQty: Record<string, { online: number; pos: number; vehicle: number }> = {};

        products.forEach((item: any) => {
          const grnList = map[item.id] || [];
          const totalProcuredQty = grnList.reduce((sum: number, g: any) => sum + (Number(g.receivedQty) || 0), 0);

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

          const baseId = item.id ? item.id.split('_')[0] : item.id;
          const displayUnit = resolvedUnitMap[baseId] || resolvedUnitMap[item.id] || item.unit || 'units';

          const prodImage = (Array.isArray(item.images) && item.images.length > 0)
            ? item.images[0]
            : (typeof item.images === 'string' ? item.images : '') || item.image || item.masterProduct?.images?.[0] || item.masterProduct?.image || '';

          const grnItemWithSellingPrice = grnList.find((g: any) => g.sellingPrice && g.sellingPrice > 0);
          const resolvedSellingPrice = grnItemWithSellingPrice?.sellingPrice || resolvedPriceMap[item.id] || resolvedPriceMap[baseId] || 0;
          const formattedPrice = resolvedSellingPrice > 0 ? '₹' + resolvedSellingPrice : '—';

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
                      name: prodName,
                      sku: generatedSku,
                      unit: alloc.packSizeText ? 'Units' : displayUnit,
                      readyQty: 0,
                    };
                  }
                  variantMap[vKey].readyQty += Number(alloc.plannedUnits) || Number(fg.postedQty) || 0;
                }
              });
            }
          });

          const variantItems = Object.values(variantMap);
          if (variantItems.length > 0) {
            variantItems.forEach((vItem: any) => {
              const remaining = Math.max(0, vItem.readyQty - allocated);
              const availableQty = remaining > 0 ? remaining : vItem.readyQty;

              mapped.push({
                id: vItem.id,
                productId: item.id,
                name: vItem.name,
                sku: vItem.sku,
                unit: vItem.unit,
                price: formattedPrice,
                available: String(availableQty),
                stock: vItem.readyQty,
                procuredQty: totalProcuredQty,
                image: prodImage,
              });

              const sugVehicle = vehicleQtyUpdates[item.id] || 0;
              initialQty[vItem.id] = {
                online: 0,
                pos: 0,
                vehicle: 0
              };
            });
          } else {
            const fgPosted = fgList.reduce((sum: number, fg: any) => sum + (fg.postedQty || 0), 0);
            const effectiveBaseQty = totalProcuredQty > 0 ? totalProcuredQty : fgPosted;
            const remaining = Math.max(0, effectiveBaseQty - allocated);
            const availableQty = remaining > 0 ? remaining : effectiveBaseQty;

            const rawSku = item.sku;
            const isUuid = typeof rawSku === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSku.trim());
            const isAutoSku = typeof rawSku === 'string' && rawSku.startsWith('SKU-');
            const displaySku = (rawSku && String(rawSku).trim() && !isUuid && !isAutoSku) ? String(rawSku).trim() : '—';

            mapped.push({
              id: item.id,
              productId: item.id,
              name: item.name,
              sku: displaySku,
              unit: displayUnit,
              price: formattedPrice,
              available: String(availableQty),
              stock: effectiveBaseQty,
              procuredQty: totalProcuredQty,
              image: prodImage,
            });

            initialQty[item.id] = {
              online: 0,
              pos: 0,
              vehicle: 0
            };
          }
        });

        setData(mapped);
        setQuantities(initialQty);
      }
    } catch (error) {
      console.error('Error fetching ready inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadyItems = loadData;

  const handleGRNSelect = (grnId: string) => {
    setSelectedGRNId(grnId);
    setCurrentPage(1);

    if (grnId === 'ALL') return;

    const grn = procurementGRNs.find(g => g.id === grnId);
    if (grn && grn.items && Array.isArray(grn.items)) {
      setQuantities(prev => {
        const next = { ...prev };
        grn.items.forEach((item: any) => {
          const pId = item.productId || item.product?.id || item.id;
          const qty = item.receivedQuantity ?? item.quantity ?? 0;
          if (pId && qty > 0) {
            next[pId] = {
              online: next[pId]?.online || 0,
              pos: next[pId]?.pos || 0,
              vehicle: qty
            };
          }
        });
        return next;
      });
    }
  };






  const toggleAll = () => {
    if (selectedItems.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedData.map(item => item.id));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleQtyChange = React.useCallback((id: string, field: 'online' | 'pos' | 'vehicle', value: number) => {
    setQuantities(prev => {
      const current = prev[id] || { online: 0, pos: 0, vehicle: 0 };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: Math.max(0, value)
        }
      };
    });
  }, []);

  const handleBlurValidation = React.useCallback((itemId: string) => {
    const item = data.find(i => i.id === itemId);
    const available = item ? parseInt(item.available) || 0 : 0;
    const currentQty = quantities[itemId] || { online: 0, pos: 0, vehicle: 0 };
    const totalAllocated = currentQty.online + currentQty.pos + currentQty.vehicle;
    if (totalAllocated > available) {
      toast.error(`Low Stock Alert: Total allocated (${totalAllocated}) exceeds available stock (${available}) for ${item?.name || 'product'}`);
    }
  }, [data, quantities]);

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
          const targetItem = data.find((d) => d.id === itemId);
          const cleanProductId = targetItem?.productId || (typeof itemId === 'string' && itemId.includes('_') ? itemId.split('_')[0] : itemId);

          await inventoryService.saveChannelAllocation(cleanProductId, {
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
      filtered = filtered.filter(item => {
        const grnList = grnItemsMap[item.id] || [];
        return grnList.some((g: any) => g.grnId === selectedGRNId);
      });
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
            </div>
          </div>
        );
      }
    },
    {
      key: 'price',
      label: 'SELLING PRICE',
      sortable: false,
      render: (item: ReserveStockItem) => {
        const baseId = item.id ? item.id.split('_')[0] : item.id;
        const grnMetas = grnItemsMap[item.id] || grnItemsMap[baseId] || [];
        const matchedGrn = selectedGRNId !== 'ALL' ? grnMetas.find((g: any) => g.grnId === selectedGRNId) : null;
        const displayPrice = (matchedGrn && matchedGrn.sellingPrice > 0) ? '₹' + matchedGrn.sellingPrice : item.price;

        return (
          <span className="text-sm font-medium text-gray-700">{displayPrice}</span>
        );
      }
    },
    {
      key: 'online',
      label: 'ONLINE ORDERS',
      sortable: false,
      render: (item: ReserveStockItem) => {
        const qty = quantities[item.id] || { online: 0, pos: 0, vehicle: 0 };
        const total = (qty.online || 0) + (qty.pos || 0) + (qty.vehicle || 0);
        const avail = Number(item.available) || 0;
        return (
          <QtyCell
            itemId={item.id}
            field="online"
            value={qty.online || 0}
            available={avail}
            totalAllocated={total}
            onChange={handleQtyChange}
            onBlurValidate={handleBlurValidation}
          />
        );
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
        return (
          <QtyCell
            itemId={item.id}
            field="pos"
            value={qty.pos || 0}
            available={avail}
            totalAllocated={total}
            onChange={handleQtyChange}
            onBlurValidate={handleBlurValidation}
          />
        );
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
        return (
          <QtyCell
            itemId={item.id}
            field="vehicle"
            value={qty.vehicle || 0}
            available={avail}
            totalAllocated={total}
            onChange={handleQtyChange}
            onBlurValidate={handleBlurValidation}
          />
        );
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

        const grnMetas = grnItemsMap[item.id] || [];
        const matchedGrn = grnMetas.find((g: any) => g.grnId === selectedGRNId);

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

            {matchedGrn && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                GRN Recv: {matchedGrn.receivedQty}
              </span>
            )}
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
        {/* <button
          type="button"
          onClick={handleQuickLoadPreset}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-sm hover:shadow transition-all text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer border border-emerald-500 shrink-0"
          title="Quick load preset purchase quantities for all 88 items"
        >
          <PackageCheck size={16} />
          <span>Quick Load Purchase Preset (88 Items)</span>
        </button> */}
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
              onChange={(e) => handleGRNSelect(e.target.value)}
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
            loading={loading}
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
                  <option value="500">500</option>
                  <option value="1000">1000</option>
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
