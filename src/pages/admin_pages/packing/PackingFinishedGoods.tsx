import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle,
  Archive,
  Calculator,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { finishedGoodsService, FinishedGoodsRecord } from '../../../api/packing/finishedGoodsService';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import { qualityCheckService, QCRecord } from '../../../api/packing/qualityCheckService';
import { masterDataService } from '../../../api/packing/masterDataService';
import { resolveProductAndSku } from './PackingExecutionDetails';
import toast from 'react-hot-toast';

const getSourceItemsArray = (wo: any): any[] => {
  let items = wo?.sourceItems;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) {}
  }
  return Array.isArray(items) ? items : [];
};

const getOutputAllocationsArray = (wo: any): any[] => {
  let allocs = wo?.outputAllocations;
  if (typeof allocs === 'string') {
    try { allocs = JSON.parse(allocs); } catch (e) {}
  }
  return Array.isArray(allocs) ? allocs : [];
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${day}-${month}-${year} ${time}`;
};

export const PackingFinishedGoods: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  // Form State
  const [allocations, setAllocations] = useState({ ready: 0 });
  const [maxPostedQty, setMaxPostedQty] = useState<number>(0);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [woData, qcRes, fgRes, catalogRes] = await Promise.all([
        workOrderService.getWorkOrderById(id).catch(() => null),
        qualityCheckService.getQualityChecks({ limit: 500 }).catch(() => ({ data: [] })),
        finishedGoodsService.getFinishedGoods({ limit: 500 }).catch(() => ({ data: [] })),
        masterDataService.getProducts().catch(() => masterDataService.getProducts('inventoryType=PRODUCTION').catch(() => [])),
      ]);

      if (Array.isArray(catalogRes)) {
        setLiveProducts(catalogRes);
      }

      let targetWO = woData;
      if (!targetWO) {
        const woRes = await workOrderService.getWorkOrders({ limit: 500 });
        targetWO = woRes.data.find((w: WorkOrder) => w.id === id || w.woNumber === id) || null;
      }

      setWorkOrder(targetWO);
      const fgList = fgRes.data || [];

      if (targetWO) {
        const qcRecords = (qcRes.data || []).filter(
          (q: QCRecord) => q.woId === targetWO.id && ['PASS', 'PARTIAL_PASS', 'Pass', 'Partial Pass'].includes(q.result)
        );
        let totalApproved = qcRecords.reduce((sum: number, q: QCRecord) => sum + (q.checkedQty || 0), 0);
        if (qcRecords.length === 0 || totalApproved === 0) {
          totalApproved = targetWO.actualProduced || targetWO.requiredQty || 0;
        }
        if (targetWO.actualProduced && totalApproved > targetWO.actualProduced) {
          totalApproved = targetWO.actualProduced;
        }

        const alreadyPostedFGs = fgList.filter((fg: FinishedGoodsRecord) => fg.woId === targetWO.id);
        const alreadyPosted = alreadyPostedFGs.reduce((sum: number, fg: FinishedGoodsRecord) => sum + (fg.postedQty || 0), 0);
        const maxQty = Math.max(0, totalApproved - alreadyPosted);

        setMaxPostedQty(maxQty);
        setAllocations({ ready: maxQty });
      }
    } catch (err) {
      console.error('Failed to load Work Order details:', err);
      toast.error('Failed to fetch Work Order details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrder) {
      toast.error('Work Order not found.');
      return;
    }

    const allocationsPayload = outputAllocations.length > 0
      ? outputAllocations.map((alloc: any) => ({
          destination: `Ready Inventory (${alloc.skuName || alloc.productName || 'Product'})`,
          qty: Number(alloc.packedUnits ?? alloc.packedQty ?? alloc.plannedUnits) || 1,
          productId: alloc.sourceProductId || alloc.productId,
          sourceProductId: alloc.sourceProductId || alloc.productId,
        }))
      : [{ destination: 'Ready Inventory', qty: allocations.ready, productId: workOrder.productId }];

    const totalAllocated = allocationsPayload.reduce((sum: number, a: any) => sum + (Number(a.qty) || 0), 0);
    if (totalAllocated <= 0) {
      toast.error('Please allocate quantity to Ready Inventory.');
      return;
    }

    const batchNumber = workOrder.batchNumber || `BATCH-2026-${workOrder.woNumber.split('-').pop()}`;

    try {
      setIsPosting(true);
      await finishedGoodsService.postFinishedGoods({
        woId: workOrder.id,
        batchNumber: batchNumber,
        allocations: allocationsPayload,
        costPayload: {
          postedBy: 'Admin User',
          postedAt: new Date().toISOString(),
          outputAllocations,
        },
      });

      await workOrderService.updateWorkOrderStatus(workOrder.id, 'COMPLETED').catch((err) => {
        console.warn('WO status update warning:', err);
      });

      toast.success(`Finished Goods successfully posted for ${workOrder.woNumber}!`);
      setTimeout(() => {
        navigate('/packing-erp/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to post finished goods:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to post finished goods.');
    } finally {
      setIsPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-500">
        <Loader2 className="animate-spin text-[#00891D] mb-3" size={36} />
        <p className="text-sm font-semibold">Loading Finished Goods Details...</p>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
        <Package className="text-slate-300 dark:text-gray-600 mb-4" size={48} />
        <h3 className="text-lg font-bold text-slate-700 dark:text-gray-300">Work Order Not Found</h3>
        <button
          onClick={() => navigate('/packing-erp/dashboard')}
          className="mt-4 px-4 py-2 bg-[#00891D] text-white rounded-lg text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const outputAllocations = getOutputAllocationsArray(workOrder);
  const sourceItems = getSourceItemsArray(workOrder);

  const displayProductName = (() => {
    if (!workOrder) return 'Product';
    if (outputAllocations.length > 1) {
      return `${outputAllocations.length} Products (${outputAllocations.map((a: any) => resolveProductAndSku(a, workOrder, liveProducts).productName || 'Item').join(', ')})`;
    }
    if (outputAllocations.length === 1) {
      return resolveProductAndSku(outputAllocations[0], workOrder, liveProducts).productName || workOrder.product?.name || 'Product';
    }
    if (sourceItems.length > 1) {
      return `${sourceItems.length} Source Products (${sourceItems.map((s: any) => s.product || s.productName || 'Item').join(', ')})`;
    }
    return workOrder.product?.name || 'Product';
  })();

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-8 text-left space-y-6">
      {/* Top Header Navigation */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/packing-erp/dashboard')}
            className="p-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <Archive className="text-[#00891D] dark:text-emerald-400" size={24} />
              Post Finished Goods
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Dashboard &gt; <span className="text-[#00891D] dark:text-emerald-400 font-semibold">{workOrder.woNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/packing-erp/dashboard')}
            className="px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Content Form Screen */}
      <form id="post-fg-form" onSubmit={handlePostSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: BATCH INFO & INVENTORY ALLOCATION */}
        <div className="lg:col-span-2 space-y-6">
          {/* CARD 1: WORK ORDER INFO */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-150 dark:border-gray-700 pb-3 flex items-center gap-2">
              <Package size={16} className="text-[#00891D]" />
              Work Order & QC Details
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-gray-900 p-3 rounded-lg border border-slate-150 dark:border-gray-700">
                <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase">Work Order No</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{workOrder.woNumber}</span>
              </div>
              <div className="bg-slate-50 dark:bg-gray-900 p-3 rounded-lg border border-slate-150 dark:border-gray-700">
                <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase">Product Name</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block" title={displayProductName}>{displayProductName}</span>
              </div>
              <div className="bg-slate-50 dark:bg-gray-900 p-3 rounded-lg border border-slate-150 dark:border-gray-700">
                <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase">Batch Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{workOrder.batchNumber || `BATCH-2026-${workOrder.woNumber.split('-').pop()}`}</span>
              </div>
              <div className="bg-slate-50 dark:bg-gray-900 p-3 rounded-lg border border-slate-150 dark:border-gray-700">
                <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase">QC Approved Qty</span>
                {outputAllocations.length > 1 ? (
                  <div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono block">
                      {outputAllocations.reduce((sum: number, a: any) => sum + (Number(a.approvedQty ?? a.packedUnits ?? a.packedQty ?? a.plannedUnits) || 0), 0)} units
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400 block truncate" title={outputAllocations.map((a: any) => `${a.skuName || a.productName || 'Item'}: ${a.approvedQty ?? a.packedUnits ?? a.packedQty ?? a.plannedUnits ?? 0}u`).join(', ')}>
                      ({outputAllocations.map((a: any) => `${a.approvedQty ?? a.packedUnits ?? a.packedQty ?? a.plannedUnits ?? 0}u`).join(' + ')})
                    </span>
                  </div>
                ) : (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                    {outputAllocations.length > 0
                      ? `${Number(outputAllocations[0].approvedQty ?? outputAllocations[0].packedUnits ?? outputAllocations[0].packedQty ?? outputAllocations[0].plannedUnits) || 0} units`
                      : `${maxPostedQty} units`}
                  </span>
                )}
              </div>
            </div>

            {/* TARGET OUTPUT PRODUCTS BREAKDOWN TABLE */}
            {outputAllocations.length > 0 ? (
              <div className="pt-2 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider block">
                  Target Output Products Breakdown ({outputAllocations.length})
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-700">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-gray-700/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                        <th className="py-2.5 px-3.5">SKU</th>
                        <th className="py-2.5 px-3.5">PRODUCT NAME</th>
                        <th className="py-2.5 px-3.5">PACK SIZE</th>
                        <th className="py-2.5 px-3.5 text-center">PLANNED UNITS</th>
                        <th className="py-2.5 px-3.5 text-center">PACKED QTY</th>
                        <th className="py-2.5 px-3.5 text-right">TOTAL AVAILABLE QTY</th>
                        <th className="py-2.5 px-3.5 text-right">TOTAL CONSUMED QTY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                      {outputAllocations.map((alloc: any, idx: number) => {
                        const resolved = resolveProductAndSku(alloc, workOrder, liveProducts);
                        const matchedSourceItem = sourceItems.find(
                          (s: any) =>
                            (alloc.sourceProductId && (s.id === alloc.sourceProductId || s.productId === alloc.sourceProductId)) ||
                            (alloc.sourceProductName && (s.product === alloc.sourceProductName || s.productName === alloc.sourceProductName))
                        );

                        const matchedLiveProduct = liveProducts.find(
                          (p: any) =>
                            (alloc.sourceProductId && (p.id === alloc.sourceProductId || p.productId === alloc.sourceProductId)) ||
                            (alloc.sourceProductName && (p.name === alloc.sourceProductName || p.productName === alloc.sourceProductName)) ||
                            (matchedSourceItem && (p.id === matchedSourceItem.id || p.sku === matchedSourceItem.sku || p.name === matchedSourceItem.product))
                        );

                        const availQty = matchedLiveProduct
                          ? (matchedLiveProduct.receivedQty ?? matchedLiveProduct.acceptedQty ?? matchedLiveProduct.availableStock ?? matchedLiveProduct.stock ?? matchedLiveProduct.productionStock?.inProductionQty ?? 0)
                          : matchedSourceItem
                          ? Number(matchedSourceItem.availableQty) || 0
                          : alloc.availableQty ?? (workOrder?.product as any)?.stock ?? (workOrder?.product as any)?.availableStock ?? '—';

                        const uom = matchedLiveProduct?.uom?.abbreviation || matchedLiveProduct?.unit || matchedSourceItem?.uom || (alloc.packSizeText ? alloc.packSizeText.trim().split(' ').pop() : 'KG');

                        const formatMatchedQuantities = (availRaw: any, rawUom: string, totalQtyKg: any) => {
                          if (availRaw === '—' || availRaw === undefined || availRaw === null) {
                            const reqKgNum = typeof totalQtyKg === 'number' ? totalQtyKg : (parseFloat(String(totalQtyKg)) || 0);
                            return {
                              availableStr: '—',
                              requiredStr: reqKgNum ? `${parseFloat(reqKgNum.toFixed(3))} KG` : '—',
                            };
                          }

                          const availNum = typeof availRaw === 'number' ? availRaw : (parseFloat(String(availRaw)) || 0);
                          const reqKgNum = typeof totalQtyKg === 'number' ? totalQtyKg : (parseFloat(String(totalQtyKg)) || 0);
                          const uomUpper = (rawUom || 'KG').trim().toUpperCase();

                          const isGram = ['G', 'GM', 'GRAM', 'GRAMS'].includes(uomUpper);
                          const isMl = ['ML', 'MILLILITRE', 'MILLILITER'].includes(uomUpper);

                          if (isGram) {
                            if (reqKgNum < 1 && reqKgNum > 0) {
                              const reqGrams = reqKgNum * 1000;
                              return {
                                availableStr: `${parseFloat(availNum.toFixed(3))} G`,
                                requiredStr: `${parseFloat(reqGrams.toFixed(3))} G`,
                              };
                            } else {
                              const availKg = availNum / 1000;
                              return {
                                availableStr: `${parseFloat(availKg.toFixed(3))} KG`,
                                requiredStr: `${parseFloat(reqKgNum.toFixed(3))} KG`,
                              };
                            }
                          }

                          if (isMl) {
                            if (reqKgNum < 1 && reqKgNum > 0) {
                              const reqMl = reqKgNum * 1000;
                              return {
                                availableStr: `${parseFloat(availNum.toFixed(3))} ML`,
                                requiredStr: `${parseFloat(reqMl.toFixed(3))} ML`,
                              };
                            } else {
                              const availL = availNum / 1000;
                              return {
                                availableStr: `${parseFloat(availL.toFixed(3))} L`,
                                requiredStr: `${parseFloat(reqKgNum.toFixed(3))} L`,
                              };
                            }
                          }

                          return {
                            availableStr: `${parseFloat(availNum.toFixed(3))} KG`,
                            requiredStr: `${parseFloat(reqKgNum.toFixed(3))} KG`,
                          };
                        };

                        const matchedQuantities = formatMatchedQuantities(availQty, uom, alloc.totalQtyKg);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/30">
                            <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {resolved.sku}
                            </td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                              {resolved.productName}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-600 dark:text-gray-300">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-700 text-[11px] font-semibold">
                                {alloc.packSizeText || (alloc.packSizeKg ? `${alloc.packSizeKg} KG` : '—')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-bold text-slate-800 dark:text-gray-200">
                              {alloc.plannedUnits ?? '—'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {alloc.packedUnits ?? alloc.packedQty ?? alloc.plannedUnits ?? '—'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-blue-600 dark:text-blue-400 font-mono">
                              {matchedQuantities.availableStr}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {matchedQuantities.requiredStr}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : sourceItems.length > 1 ? (
              <div className="pt-2 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider block">
                  Source Products Breakdown ({sourceItems.length})
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-700">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-gray-700/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                        <th className="py-2.5 px-3.5">PRODUCT NAME</th>
                        <th className="py-2.5 px-3.5 text-center">UOM</th>
                        <th className="py-2.5 px-3.5 text-center">BATCH</th>
                        <th className="py-2.5 px-3.5 text-right">QUANTITY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                      {sourceItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/30">
                          <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                            {item.product || item.productName || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-700 text-[11px] font-semibold">
                              {item.uom || 'KG'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center font-mono text-slate-500 dark:text-gray-400 text-[11px]">
                            {item.batch || '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {item.availableQty ?? item.requiredQty ?? '—'} {item.uom || ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {/* CARD 2: QUANTITY ALLOCATION METRICS */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-150 dark:border-gray-700 pb-3 flex items-center gap-2">
              <Calculator size={16} className="text-[#00891D]" />
              Warehouse Inventory Allocation
            </h3>

            {outputAllocations.length > 0 ? (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider block mb-1">
                  Product Inventory Allocation ({outputAllocations.length})
                </span>
                {outputAllocations.map((alloc: any, idx: number) => {
                  const resolved = resolveProductAndSku(alloc, workOrder, liveProducts);
                  const qty = Number(alloc.packedUnits ?? alloc.packedQty ?? alloc.plannedUnits) || 0;
                  const totalKg = alloc.totalQtyKg ? `${parseFloat(Number(alloc.totalQtyKg).toFixed(3))} KG` : '';
                  return (
                    <div key={idx} className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-gray-700">
                            {resolved.sku}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {resolved.productName}
                          </span>
                        </div>
                        <span className="text-xs text-emerald-600 dark:text-emerald-300">
                          Pack Size: <strong>{alloc.packSizeText || (alloc.packSizeKg ? `${alloc.packSizeKg} KG` : '—')}</strong> {totalKg ? `• Total: ${totalKg}` : ''}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 font-mono bg-white dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                        {qty} units (Auto-allocated)
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex flex-wrap justify-between items-center mb-4 border-b border-slate-200 dark:border-gray-700 pb-3 gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-gray-300">
                    Approved Quantity: <span className="text-gray-900 dark:text-white bg-slate-200 dark:bg-gray-800 px-2 py-0.5 rounded ml-1 font-mono text-sm">{maxPostedQty}</span>
                  </span>
                  <div className="flex gap-4">
                    <span className="text-xs font-bold text-slate-600 dark:text-gray-300">
                      Allocated: <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded ml-1 font-mono text-sm">{allocations.ready}</span>
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex justify-between items-center">
                  <div>
                    <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                      Ready Inventory (Warehouse) Allocation
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-300">
                      Automatic stock sync to main warehouse store
                    </span>
                  </div>
                  <span className="text-base font-bold text-emerald-800 dark:text-emerald-300 font-mono bg-white dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                    {allocations.ready} units (Auto-allocated)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POSTING SUMMARY */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-150 dark:border-gray-700 pb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00891D]" />
              Posting Summary
            </h3>

            <div className="bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-gray-700 space-y-4">
              <div className="grid grid-cols-1 gap-3 text-xs">
                {outputAllocations.length > 0 ? (
                  <div className="border-b border-slate-200 dark:border-gray-800 pb-3 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase block">
                      Allocated Per Product ({outputAllocations.length})
                    </span>
                    {outputAllocations.map((alloc: any, idx: number) => {
                      const resolved = resolveProductAndSku(alloc, workOrder, liveProducts);
                      const qty = Number(alloc.approvedQty ?? alloc.packedUnits ?? alloc.packedQty ?? alloc.plannedUnits) || 0;
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex flex-col truncate max-w-[170px]">
                            <span className="font-semibold text-slate-800 dark:text-gray-200 truncate" title={resolved.productName}>
                              {resolved.productName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate" title={resolved.sku}>
                              {resolved.sku}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {qty} units
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="border-b border-slate-200 dark:border-gray-800 pb-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase">
                    Total Allocated
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm font-mono">
                    {outputAllocations.length > 0
                      ? `${outputAllocations.reduce((sum: number, a: any) => sum + (Number(a.packedUnits ?? a.packedQty ?? a.plannedUnits) || 0), 0)} units`
                      : `${allocations.ready} units`}
                  </span>
                </div>

                <div className="border-b border-slate-200 dark:border-gray-800 pb-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase">
                    Posting Date
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {formatDateTime(new Date().toISOString())}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase mb-1">
                    Current Status
                  </span>
                  <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 rounded-full font-bold text-[11px]">
                    Ready for Inventory Sync
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPosting}
              className="w-full py-3 bg-[#00891D] hover:bg-[#006b17] text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-xs"
            >
              <CheckCircle size={16} />
              <span>{isPosting ? 'Posting Finished Goods...' : 'Post Finished Goods'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PackingFinishedGoods;
