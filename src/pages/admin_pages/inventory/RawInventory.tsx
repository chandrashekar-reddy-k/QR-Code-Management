import React, { useState, useMemo, useEffect } from 'react';
import { Filter, RotateCcw, Send, Plus, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
// @ts-ignore
import BarcodeScannerOverlay from '../../../components/BarcodeScannerOverlay';
import {
  DataTable,
  SearchInput,
  PrimaryButton,
  Pagination,
  Badge
} from '../../../components/ui';
import { masterDataService } from '../../../api/packing/masterDataService';

interface RawInventoryItem {
  id: string;
  baseId?: string;
  grnList?: any[];
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  units: string;
  type: 'Branded' | 'Unbranded';
  quantity: string;
  price: string;
  status: boolean;
  image: string;
}

import { inventoryService } from './services/inventoryService';
import procurementService from '../vsms/services/procurementService';

const RawInventory: React.FC = () => {
  const [data, setData] = useState<RawInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const navigate = useNavigate();

  const [procurementGRNs, setProcurementGRNs] = useState<any[]>([]);
  const [selectedGRNId, setSelectedGRNId] = useState<string>('ALL');
  const [grnItemsMap, setGrnItemsMap] = useState<Record<string, any>>({});
  const [sendQtyMap, setSendQtyMap] = useState<Record<string, number | string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch GRNs & Procurement Items
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
              const baseProdId = item.product?.id || item.product?.productId;
              const rawProdId = item.productId;
              const targetIds = new Set<string>();
              if (baseProdId) targetIds.add(baseProdId);
              if (rawProdId) {
                targetIds.add(rawProdId);
                if (typeof rawProdId === 'string' && rawProdId.includes('_')) {
                  targetIds.add(rawProdId.split('_')[0]);
                }
              }

              targetIds.forEach(pid => {
                if (!map[pid]) map[pid] = [];
                map[pid].push({
                  grnId: grn.id,
                  grnDisplayId: grn.displayId || grn.grnNumber || grn.id.slice(0, 8),
                  receivedQty: item.receivedQuantity || item.receivedQty || item.quantity || 0,
                  poDisplayId: grn.po?.displayId || grn.po?.poNumber || ''
                });
              });
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
              const recQty = Number(uItem.receivedQty) || 0;
              const grnId = uItem.grnId || uItem.goodsReceiptId || uItem.grn?.id || '';

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

                if (!map[pid]) map[pid] = [];
                if (!map[pid].some(g => (uItem.id && g.grnItemId === uItem.id) || (grnId && g.grnId === grnId))) {
                  map[pid].push({
                    grnItemId: uItem.id,
                    grnId: grnId,
                    grnDisplayId: uItem.grn?.displayId || uItem.grn?.grnNumber || (grnId ? grnId.slice(0, 8) : ''),
                    receivedQty: recQty
                  });
                }
              });
            });
          }
        }
        setGrnItemsMap(map);
      } catch (err) {
        console.error('Error fetching procurement GRNs:', err);
      }

      // 2. Fetch Raw Inventory and Product Catalog Master Data in parallel
      const [response, catalogProducts] = await Promise.all([
        inventoryService.getRawInventory({ page: 1, limit: 2000 }),
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

      if (response.data && response.data.data) {
        const mappedData = response.data.data.products.map((item: any) => {
          const baseId = item.id ? item.id.split('_')[0] : item.id;
          const grnList = map[baseId] || map[item.id] || [];
          const totalProcuredQty = grnList.reduce((sum: number, g: any) => sum + (Number(g.receivedQty) || 0), 0);
          const inProdQty = Number(item.productionStock?.inProductionQty || 0);
          const availableProcuredQty = totalProcuredQty > 0 ? Math.max(0, totalProcuredQty - inProdQty) : 0;
          const rawStock = totalProcuredQty > 0
            ? availableProcuredQty
            : (typeof item.stock === 'number' && item.stock >= 0 ? item.stock : 0);
          const displayQty = rawStock;
          const displayUnit = resolvedUnitMap[baseId] || resolvedUnitMap[item.id] || item.unit || 'Units';

          const prodImage = (Array.isArray(item.images) && item.images.length > 0)
            ? item.images[0]
            : (typeof item.images === 'string' ? item.images : '') || item.image || item.masterProduct?.images?.[0] || item.masterProduct?.image || '';

          // Resolve SKU from Master Data Service, item.sku, variant, or masterProduct
          const catalogProd = catalogMap.get(item.id) || catalogMap.get(baseId) || (item.variants?.[0]?.id ? catalogMap.get(item.variants[0].id) : null);
          const sku = catalogProd?.sku || catalogProd?.resolvedSku || item.sku || item.variants?.[0]?.sku || item.masterProduct?.sku || '-';

          return {
            id: item.id,
            baseId,
            grnList,
            name: item.name,
            sku,
            barcode: item.barcode || item.posStoreStock?.barcode || '',
            category: item.category?.name || 'N/A',
            units: displayUnit,
            type: item.productType === 'BRANDED' ? 'Branded' : 'Unbranded',
            quantity: String(displayQty),
            stock: rawStock,
            procuredQty: rawStock,
            totalProcuredQty: totalProcuredQty,
            price: '₹' + (item.mrp || 0),
            status: item.isActive,
            image: prodImage,
            inventoryType: item.inventoryType || 'RAW',
            productionStock: item.productionStock,
            inProductionQty: inProdQty
          };
        });
        setData(mappedData);
      }
    } catch (error) {
      console.error("Error fetching raw inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((item) => item.type === typeFilter);
    }

    if (selectedGRNId !== 'ALL') {
      filtered = filtered.filter((item: any) => {
        const baseId = item.baseId || (item.id ? item.id.split('_')[0] : item.id);
        const grnMetas = item.grnList || grnItemsMap[item.id] || grnItemsMap[baseId] || [];
        return Array.isArray(grnMetas) && grnMetas.some((g: any) => g.grnId === selectedGRNId);
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
        const aValue = a[sortField as keyof RawInventoryItem];
        const bValue = b[sortField as keyof RawInventoryItem];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, typeFilter, selectedGRNId, grnItemsMap, sortField, sortDirection]);

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

  const markAsReady = async (item: RawInventoryItem) => {
    try {
      await inventoryService.updateProductInventoryType(item.id, 'READY');
      setData(prev => prev.filter(p => p.id !== item.id));
      toast.success('Successfully marked as ready');
    } catch (error) {
      console.error('Failed to mark as ready:', error);
      toast.error('Failed to mark item as ready. Please try again.');
    }
  };

  const calculateGrnAvailable = (matchedGrn: any, item: any) => {
    if (!matchedGrn) return 0;
    const inProdQty = Number(item.inProductionQty || item.productionStock?.inProductionQty || 0);
    const notes = String(item.productionStock?.notes || '');

    let deductedQty = 0;
    if (notes.includes(matchedGrn.grnId)) {
      deductedQty = inProdQty;
    } else if (!notes.includes('Transferred from GRN:')) {
      deductedQty = inProdQty;
    } else {
      deductedQty = 0;
    }

    return Math.max(0, Number(matchedGrn.receivedQty || 0) - deductedQty);
  };

  const sendToProduction = async (item: RawInventoryItem) => {
    const baseId = item.baseId || (item.id ? item.id.split('_')[0] : item.id);
    const grnMetas = item.grnList || grnItemsMap[item.id] || grnItemsMap[baseId] || [];
    const matchedGrn = selectedGRNId !== 'ALL' ? grnMetas.find((g: any) => g.grnId === selectedGRNId) : null;
    const isGrnFiltered = Boolean(matchedGrn);
    const grnAvailable = matchedGrn ? calculateGrnAvailable(matchedGrn, item) : 0;
    const currentStock = isGrnFiltered && matchedGrn
      ? Math.min(grnAvailable, typeof (item as any).procuredQty === 'number' ? (item as any).procuredQty : (Number(item.quantity) || 0))
      : (typeof (item as any).procuredQty === 'number'
          ? (item as any).procuredQty
          : (typeof (item as any).stock === 'number' && (item as any).stock >= 0 ? (item as any).stock : (Number(item.quantity) || 0)));
    const entered = sendQtyMap[item.id];
    const qtyToSend = Number(entered);

    if (entered === undefined || entered === '' || isNaN(qtyToSend) || qtyToSend <= 0) {
      toast.error('Please enter a quantity to send.');
      return;
    }
    if (currentStock > 0 && qtyToSend > currentStock) {
      toast.error(`Quantity cannot exceed available stock (${currentStock}).`);
      return;
    }

    try {
      await inventoryService.updateProductInventoryType(item.id, 'PRODUCTION', {
        transferQty: qtyToSend,
        grnId: isGrnFiltered ? selectedGRNId : undefined
      });

      const remainingStock = Math.max(0, currentStock - qtyToSend);
      if (remainingStock <= 0) {
        setData(prev => prev.filter(p => p.id !== item.id));
      } else {
        setData(prev => prev.map(p => p.id === item.id ? { 
          ...p, 
          stock: remainingStock, 
          quantity: String(remainingStock),
          procuredQty: remainingStock,
          inProductionQty: ((p as any).inProductionQty || 0) + qtyToSend
        } : p));
      }

      setSendQtyMap(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });

      toast.success(`Successfully sent ${qtyToSend} ${item.units} to production`);
      await loadData();
    } catch (error) {
      console.error('Failed to send to production:', error);
      toast.error('Failed to send item to production. Please try again.');
    }
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

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    filteredAndSortedData.length > 0 &&
    filteredAndSortedData.every(item => selectedItems.includes(item.id));

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedItems(prev =>
        prev.filter(id => !filteredAndSortedData.some(item => item.id === id))
      );
    } else {
      const allIds = filteredAndSortedData.map(item => item.id);
      setSelectedItems(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleBulkMarkAsReady = async () => {
    if (selectedItems.length === 0) return;

    const selectedObjects = data.filter(item => selectedItems.includes(item.id));
    const unbrandedSelected = selectedObjects.filter(item => item.type === 'Unbranded');

    if (unbrandedSelected.length > 0) {
      toast.error(`Invalid Selection: ${unbrandedSelected.length} Unbranded item(s) selected. Only Branded items can be marked as Ready.`);
      return;
    }

    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedItems.map(id => inventoryService.updateProductInventoryType(id, 'READY'))
      );
      const count = selectedItems.length;
      setData(prev => prev.filter(p => !selectedItems.includes(p.id)));
      setSelectedItems([]);
      toast.success(`Successfully marked ${count} item(s) as ready`);
    } catch (error) {
      console.error('Bulk mark as ready failed:', error);
      toast.error('Failed to mark items as ready. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkSendToProduction = async () => {
    if (selectedItems.length === 0) return;

    const selectedObjects = data.filter(item => selectedItems.includes(item.id));
    const brandedSelected = selectedObjects.filter(item => item.type === 'Branded');

    if (brandedSelected.length > 0) {
      toast.error(`Invalid Selection: ${brandedSelected.length} Branded item(s) selected. Only Unbranded items can be sent to Production.`);
      return;
    }

    for (const item of selectedObjects) {
      const entered = sendQtyMap[item.id];
      const qtyToSend = Number(entered);
      if (entered === undefined || entered === '' || isNaN(qtyToSend) || qtyToSend <= 0) {
        toast.error(`Please enter a send quantity for "${item.name}".`);
        return;
      }
      const baseId = item.baseId || (item.id ? item.id.split('_')[0] : item.id);
      const grnMetas = item.grnList || grnItemsMap[item.id] || grnItemsMap[baseId] || [];
      const matchedGrn = selectedGRNId !== 'ALL' ? grnMetas.find((g: any) => g.grnId === selectedGRNId) : null;
      const isGrnFiltered = Boolean(matchedGrn);
      const grnAvailable = matchedGrn ? calculateGrnAvailable(matchedGrn, item) : 0;
      const currentStock = isGrnFiltered && matchedGrn
        ? Math.min(grnAvailable, typeof (item as any).procuredQty === 'number' ? (item as any).procuredQty : (Number(item.quantity) || 0))
        : (typeof (item as any).procuredQty === 'number'
            ? (item as any).procuredQty
            : (typeof (item as any).stock === 'number' && (item as any).stock >= 0 ? (item as any).stock : (Number(item.quantity) || 0)));
      if (currentStock > 0 && qtyToSend > currentStock) {
        toast.error(`Send quantity for "${item.name}" cannot exceed available stock (${currentStock}).`);
        return;
      }
    }

    setBulkActionLoading(true);
    try {
      let totalSentUnits = 0;
      await Promise.all(
        selectedObjects.map(async (item) => {
          const baseId = item.baseId || (item.id ? item.id.split('_')[0] : item.id);
          const grnMetas = item.grnList || grnItemsMap[item.id] || grnItemsMap[baseId] || [];
          const matchedGrn = selectedGRNId !== 'ALL' ? grnMetas.find((g: any) => g.grnId === selectedGRNId) : null;
          const isGrnFiltered = Boolean(matchedGrn);
          const qtyToSend = Number(sendQtyMap[item.id]);

          totalSentUnits += qtyToSend;
          await inventoryService.updateProductInventoryType(item.id, 'PRODUCTION', {
            transferQty: qtyToSend,
            grnId: isGrnFiltered ? selectedGRNId : undefined
          });
        })
      );

      await loadData();
      setSelectedItems([]);
      setSendQtyMap({});
      toast.success(`Successfully sent ${totalSentUnits} unit(s) to production`);
    } catch (error) {
      console.error('Bulk send to production failed:', error);
      toast.error('Failed to send items to production. Please try again.');
    } finally {
      setBulkActionLoading(false);
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
          disabled={filteredAndSortedData.length === 0}
          onChange={toggleAll}
          title={isAllSelected ? "Deselect all" : `Select all ${filteredAndSortedData.length} items`}
        />
      ),
      sortable: false,
      render: (item: RawInventoryItem) => (
        <input
          type="checkbox"
          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
          checked={selectedItems.includes(item.id)}
          onChange={() => toggleSelection(item.id)}
        />
      )
    },
    {
      key: 'name',
      label: 'NAME',
      sortable: true,
      render: (item: RawInventoryItem) => (
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
      render: (item: RawInventoryItem) => (
        <span className="text-sm text-gray-500 max-w-[120px] line-clamp-2" title={item.sku}>{item.sku}</span>
      )
    },
    {
      key: 'category',
      label: 'CATEGORY',
      sortable: true,
      render: (item: RawInventoryItem) => (
        <span className="text-sm text-gray-500 max-w-[120px] line-clamp-2" title={item.category}>{item.category}</span>
      )
    },
    {
      key: 'type',
      label: 'TYPE',
      sortable: true,
      render: (item: RawInventoryItem) => (
        <Badge
          status={item.type}
          size="sm"
          customColor={
            item.type === 'Branded'
              ? 'bg-[#eaf8f1] text-[#20b05e]'
              : 'bg-[#fff0e6] text-[#ff6a00]'
          }
          className="rounded-full"
        />
      )
    },
    {
      key: 'quantity',
      label: <span className="w-full flex justify-center">PROCURED QTY</span>,
      sortable: true,
      render: (item: any) => {
        const baseId = item.baseId || (item.id ? item.id.split('_')[0] : item.id);
        const grnMetas = item.grnList || grnItemsMap[item.id] || grnItemsMap[baseId] || [];
        const matchedGrn = selectedGRNId !== 'ALL' ? grnMetas.find((g: any) => g.grnId === selectedGRNId) : null;
        const isGrnFiltered = Boolean(matchedGrn);
        const currentQty = typeof item.procuredQty === 'number'
          ? item.procuredQty
          : (typeof item.stock === 'number' && item.stock >= 0 ? item.stock : (Number(item.quantity) || 0));
        const grnAvailable = matchedGrn ? calculateGrnAvailable(matchedGrn, item) : 0;
        const displayQty = isGrnFiltered && matchedGrn
          ? Math.min(grnAvailable, currentQty)
          : currentQty;
        return (
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-900 font-bold">{displayQty}</span>
          </div>
        );
      }
    },
    {
      key: 'units',
      label: 'UNITS',
      sortable: false,
      render: (item: RawInventoryItem) => (
        <span className="text-sm text-gray-500">{item.units}</span>
      )
    },
    {
      key: 'sendQty',
      label: <span className="w-full flex justify-center">SEND QTY</span>,
      sortable: false,
      render: (item: any) => {
        if (item.type !== 'Unbranded') {
          return <span className="text-gray-400 text-xs text-center block">—</span>;
        }

        const baseId = item.baseId || (item.id ? item.id.split('_')[0] : item.id);
        const grnMetas = item.grnList || grnItemsMap[item.id] || grnItemsMap[baseId] || [];
        const matchedGrn = selectedGRNId !== 'ALL' ? grnMetas.find((g: any) => g.grnId === selectedGRNId) : null;
        const isGrnFiltered = Boolean(matchedGrn);
        const currentStock = typeof item.procuredQty === 'number'
          ? item.procuredQty
          : (typeof item.stock === 'number' && item.stock >= 0 ? item.stock : (Number(item.quantity) || 0));
        const grnAvailable = matchedGrn ? calculateGrnAvailable(matchedGrn, item) : 0;
        const maxQty = isGrnFiltered && matchedGrn ? Math.min(grnAvailable, currentStock > 0 ? currentStock : grnAvailable) : currentStock;
        const val = sendQtyMap[item.id] !== undefined ? sendQtyMap[item.id] : '';

        return (
          <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min="1"
              max={maxQty > 0 ? maxQty : undefined}
              value={val}
              onChange={(e) => {
                const rawVal = e.target.value;
                setSendQtyMap(prev => ({ ...prev, [item.id]: rawVal }));
              }}
              placeholder="Qty"
              className="w-20 px-2 py-1 text-center font-bold text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00] focus:border-transparent bg-white shadow-2xs"
            />
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: <span className="w-full flex justify-center">ACTION</span>,
      sortable: false,
      render: (item: RawInventoryItem) => (
        <div className="flex justify-center items-center space-x-2">
          {item.type === 'Branded' ? (
            <button
              onClick={() => markAsReady(item)}
              className="bg-[#008f33] hover:bg-[#007a2a] text-white px-3 py-1.5 rounded flex items-center text-xs font-medium shadow-sm h-8 whitespace-nowrap"
            >
              <Send className="w-3 h-3 mr-1.5 transform -rotate-45" />
              Mark as Ready
            </button>
          ) : (
            <button
              onClick={() => sendToProduction(item)}
              className="bg-[#ff6a00] hover:bg-[#e55f00] text-white px-3 py-1.5 rounded flex items-center text-xs font-medium shadow-sm h-8 whitespace-nowrap"
            >
              <Send className="w-3 h-3 mr-1.5" />
              Send to Production
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Action Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">Raw Inventory</h1>
          <p className="text-gray-500 text-sm hidden sm:block">Manage and classify procured stock as Branded (Packed) or Unbranded (Unpacked).</p>
        </div>
        <PrimaryButton
          onClick={() => navigate('/inventory/raw/configure')}
          size="sm"
          className="flex items-center gap-1.5 h-9 sm:h-10 w-full sm:w-auto justify-center"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Configure Stock</span>
        </PrimaryButton>
      </div>


      {/* Filters and Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex items-center border border-gray-300 rounded-lg bg-white h-10 shadow-sm w-fit">
          <div className="px-3.5 border-r border-gray-200 text-gray-600 flex items-center justify-center h-full">
            <Filter size={16} />
          </div>

          <div className="border-r border-gray-200 h-full flex items-center relative">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-4 pr-8 py-2 text-sm text-gray-700 bg-transparent focus:outline-none font-medium appearance-none h-full min-w-[140px] cursor-pointer"
            >
              <option value="ALL">Types</option>
              <option value="Branded">Branded</option>
              <option value="Unbranded">Unbranded</option>
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
              setTypeFilter('ALL');
              setSelectedGRNId('ALL');
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
          onScan={(code: string | any) => {
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

        {/* Selection Bar or Pagination */}
        {selectedItems.length > 0 ? (
          <div className="px-4 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
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
              <button
                disabled={bulkActionLoading}
                onClick={handleBulkMarkAsReady}
                className="bg-[#008f33] hover:bg-[#007a2a] disabled:opacity-60 text-white px-4 py-2 rounded-lg flex items-center text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1.5 transform -rotate-45" />
                {bulkActionLoading ? 'Processing...' : 'Bulk Mark as Ready'}
              </button>
              <button
                disabled={bulkActionLoading}
                onClick={handleBulkSendToProduction}
                className="bg-[#ff6a00] hover:bg-[#e55f00] disabled:opacity-60 text-white px-4 py-2 rounded-lg flex items-center text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {bulkActionLoading ? 'Processing...' : 'Bulk Send to Production'}
              </button>
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
          )
        )}
      </div>
    </div>
  );
};

export default RawInventory;
