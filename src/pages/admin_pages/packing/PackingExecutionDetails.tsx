import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrderService, WorkOrder, WoStatus } from '../../../api/packing/workOrderService';
import { barcodeService } from '../../../api/packing/barcodeService';
import { masterDataService } from '../../../api/packing/masterDataService';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Layers,
  Save,
  Check,
} from 'lucide-react';

export const resolveProductAndSku = (alloc: any, wo: any, catalog: any[] = []) => {
  // 1. Resolve Product Name
  let productName =
    alloc?.sourceProductName ||
    alloc?.productName ||
    alloc?.product ||
    wo?.product?.name ||
    '';

  const packText = (alloc?.packSizeText || '').trim();

  // If productName equals skuName or is empty, clean it up
  if (!productName && alloc?.skuName) {
    productName = alloc.skuName;
  }
  if (productName && packText && productName.toLowerCase().endsWith(packText.toLowerCase())) {
    productName = productName.slice(0, productName.length - packText.length).trim();
  }

  // 2. Resolve SKU Code
  let sku = alloc?.sku || alloc?.skuCode || alloc?.sourceProductSku || '';
  if (sku === '—' || sku === 'N/A') sku = '';

  // Look up in catalog products
  if (!sku && catalog && catalog.length > 0) {
    const matchedProduct = catalog.find((p: any) => {
      const pName = (p.name || '').toLowerCase().trim();
      const targetName = (productName || '').toLowerCase().trim();
      return (
        (alloc?.sourceProductId && p.id === alloc.sourceProductId) ||
        (wo?.productId && p.id === wo.productId) ||
        (targetName && pName === targetName) ||
        (targetName && (pName.includes(targetName) || targetName.includes(pName)))
      );
    });

    if (matchedProduct) {
      if (!productName && matchedProduct.name) {
        productName = matchedProduct.name;
      }

      // Check product variants for exact match on measurement + unit or variantName
      if (Array.isArray(matchedProduct.variants) && matchedProduct.variants.length > 0) {
        const matchedVariant = matchedProduct.variants.find((v: any) => {
          const vText = `${v.measurement || ''} ${v.unit || ''}`.trim().toLowerCase();
          const pTextLower = packText.toLowerCase();
          const vName = (v.variantName || '').trim().toLowerCase();
          const skuNameLower = (alloc?.skuName || '').trim().toLowerCase();

          return (
            (pTextLower && vText === pTextLower) ||
            (vName && skuNameLower.includes(vName))
          );
        });

        if (matchedVariant?.sku) {
          sku = matchedVariant.sku;
        }
      }

      // If no variant SKU, check product.sku
      if (!sku && matchedProduct.sku) {
        if (packText) {
          const prefix = matchedProduct.sku.includes('-')
            ? matchedProduct.sku.split('-')[0]
            : matchedProduct.sku;
          sku = `${prefix}-${packText.replace(/\s+/g, '-').toUpperCase()}`;
        } else {
          sku = matchedProduct.sku;
        }
      }
    }
  }

  // Fallback to workOrder product SKU or sourceItems SKU
  if (!sku) {
    const woSku = wo?.product?.sku || (Array.isArray(wo?.sourceItems) && wo.sourceItems[0]?.sku);
    if (woSku && woSku !== '—' && woSku !== 'N/A') {
      sku = woSku;
    }
  }

  // Final deterministic fallback: Generate from Product Name & Pack Size
  if (!sku && productName) {
    const codePart = productName
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
    sku = packText ? `${codePart}-${packText.replace(/\s+/g, '-').toUpperCase()}` : `${codePart}-SKU`;
  }

  return {
    productName: productName || 'Product',
    sku: sku || '—',
  };
};

const STAGES: { key: WoStatus; label: string }[] = [
  { key: 'MATERIAL_ISSUED', label: 'Material Issued' },
  { key: 'PACKING_STARTED', label: 'Packing Started' },
  { key: 'PACKING_IN_PROGRESS', label: 'In Progress' },
  { key: 'PACKING_COMPLETED', label: 'Packing Completed' },
  { key: 'LABEL_APPLICATION_ASSIGNED', label: 'Labels Assigned' },
  { key: 'LABEL_APPLICATION_IN_PROGRESS', label: 'Labeling In Progress' },
  { key: 'LABELS_APPLIED', label: 'Labeling Completed' },
];

export const PackingExecutionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [actualProduced, setActualProduced] = useState<number>(0);
  const [actualRejected, setActualRejected] = useState<number>(0);
  const [labelsApplied, setLabelsApplied] = useState<string>('');
  const [labelsRejected, setLabelsRejected] = useState<string>('');
  const [pauseReason, setPauseReason] = useState<string>('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [allocInputs, setAllocInputs] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

  const showToast = (msg: string, isError = false) => {
    if (isError) setErrorMsg(msg);
    else setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 3500);
  };

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

  const normalizeUnit = (u?: string) => {
    if (!u) return '';
    const trimmed = String(u).trim().toUpperCase();
    if (trimmed === 'KILOGRAMS' || trimmed === 'KILOGRAM') return 'KG';
    if (trimmed === 'GRAMS' || trimmed === 'GRAM') return 'GM';
    if (trimmed === 'LITRES' || trimmed === 'LITRE' || trimmed === 'LITERS' || trimmed === 'LITER') return 'L';
    if (trimmed === 'MILLILITRES' || trimmed === 'MILLILITRE' || trimmed === 'MILLILITERS' || trimmed === 'MILLILITER') return 'ML';
    return trimmed;
  };

  const getWOUnit = (wo: any) => {
    // Unit fetched strictly from Eligible Source Inventory (wo.sourceItems)
    const items = getSourceItemsArray(wo);
    const sourceUom = items[0]?.uom;
    return sourceUom ? normalizeUnit(sourceUom) : '';
  };

  // Helper to render product column with Primary Product + Counter Badge & Hover Popover for multi-product orders
  const renderProductColumn = (wo: any) => {
    const items = getSourceItemsArray(wo);

    if (items && items.length > 1) {
      const primaryName = items[0].product || 'Product 1';
      const extraCount = items.length - 1;

      return (
        <div className="relative group inline-flex items-center gap-1.5 max-w-[200px]">
          <span className="font-semibold text-slate-800 dark:text-white truncate cursor-default max-w-[120px]" title={primaryName}>
            {primaryName}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shrink-0 cursor-default">
            +{extraCount} more
          </span>

          <div className="absolute left-0 top-full mt-1.5 hidden group-hover:block z-50 min-w-[220px] max-w-[320px] bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl p-3 space-y-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="font-bold text-slate-400 dark:text-gray-400 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-gray-700 pb-1.5">
              Source Products ({items.length})
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <span className="text-slate-400 font-mono text-[11px] shrink-0">{idx + 1}.</span>
                  <span>{item.product}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const singleName = wo?.product?.name || items?.[0]?.product || '-';
    return (
      <span className="font-bold text-slate-800 dark:text-white truncate block max-w-[130px]" title={singleName}>
        {singleName}
      </span>
    );
  };

  const formatRequiredQty = (wo: any) => {
    if (!wo) return '0';
    const invUnit = getWOUnit(wo);
    const allocs = getOutputAllocationsArray(wo);
    if (allocs.length > 0) {
      const totalAllocated = allocs.reduce((sum: number, alloc: any) => {
        return sum + (Number(alloc.totalQtyKg) || (Number(alloc.plannedUnits) || 0) * (alloc.packSizeKg || 1));
      }, 0);
      if (totalAllocated > 0) {
        return `${parseFloat(totalAllocated.toFixed(3))} ${invUnit}`;
      }
    }
    return `${parseFloat(Number(wo.requiredQty || 0).toFixed(3))} ${invUnit}`;
  };

  const handleAllocPackedChange = (idx: number, value: string) => {
    const cleanStr = value.replace(/^0+(?=\d)/, '');
    let num: number | '' = cleanStr === '' ? '' : Math.max(0, parseInt(cleanStr, 10) || 0);
    const planned = Number(allocInputs[idx]?.plannedUnits) || 0;
    const currentRejected = Number(allocInputs[idx]?.rejectedUnits) || 0;

    if (num !== '' && planned > 0 && num > planned) {
      showToast(`Packed units cannot exceed planned units (${planned}).`, true);
      num = planned;
    } else if (num !== '' && planned > 0 && num + currentRejected > planned) {
      const maxAllowed = Math.max(0, planned - currentRejected);
      showToast(`Total units (packed + rejected) cannot exceed planned units (${planned}). Max packed: ${maxAllowed}`, true);
      num = maxAllowed;
    }

    setAllocInputs((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], packedUnits: num };
      const newProduced = updated.reduce(
        (sum, a) => sum + (Number(a.packedUnits) || 0) * (a.packSizeKg || 1),
        0
      );
      setActualProduced(newProduced);
      return updated;
    });
  };

  const handleAllocRejectedChange = (idx: number, value: string) => {
    const cleanStr = value.replace(/^0+(?=\d)/, '');
    let num: number | '' = cleanStr === '' ? '' : Math.max(0, parseInt(cleanStr, 10) || 0);
    const planned = Number(allocInputs[idx]?.plannedUnits) || 0;
    const currentPacked = Number(allocInputs[idx]?.packedUnits) || 0;

    if (num !== '' && planned > 0 && currentPacked + num > planned) {
      const maxAllowed = Math.max(0, planned - currentPacked);
      showToast(`Total units (packed + rejected) cannot exceed planned units (${planned}). Max rejected: ${maxAllowed}`, true);
      num = maxAllowed;
    }

    setAllocInputs((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], rejectedUnits: num };
      const newRejected = updated.reduce(
        (sum, a) => sum + (Number(a.rejectedUnits) || 0) * (a.packSizeKg || 1),
        0
      );
      setActualRejected(newRejected);
      return updated;
    });
  };

const getReqForSKU = (alloc: any) => {
  if (!alloc) return 0;
  if (alloc.packedUnits !== '' && alloc.packedUnits !== null && alloc.packedUnits !== undefined) {
    const val = Number(alloc.packedUnits);
    if (!isNaN(val)) return Math.max(0, val);
  }
  const plUnits = Number(alloc.plannedUnits);
  if (!isNaN(plUnits) && plUnits > 0) return plUnits;
  return 0;
};

  const handleAllocLabelsAppliedChange = (idx: number, value: string) => {
    const num = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    setAllocInputs((prev) => {
      const updated = [...prev];
      const reqForSKU = getReqForSKU(updated[idx]);
      const clampedNum = Math.min(num, reqForSKU);
      updated[idx] = { ...updated[idx], labelsApplied: clampedNum };
      const newTotalApplied = updated.reduce(
        (sum, a) => sum + (Number(a.labelsApplied) || 0),
        0
      );
      setLabelsApplied(String(newTotalApplied));
      return updated;
    });
  };

  const handleAllocLabelsRejectedChange = (idx: number, value: string) => {
    const num = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    setAllocInputs((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], labelsRejected: num };
      const newTotalRejected = updated.reduce(
        (sum, a) => sum + (Number(a.labelsRejected) || 0),
        0
      );
      setLabelsRejected(String(newTotalRejected));
      return updated;
    });
  };

  const fetchWO = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [res, catalog] = await Promise.all([
        workOrderService.getWorkOrders(),
        masterDataService.getProducts().catch(() => [])
      ]);
      setCatalogProducts(catalog || []);
      const found = res.data?.find((w) => w.id === id);
      if (found) {
        setSelectedWO(found);
        setActualProduced(found.actualProduced || 0);
        setActualRejected(found.actualRejected || 0);

        let allocs: any[] = [];
        const rawAllocs = getOutputAllocationsArray(found);
        const rawSources = getSourceItemsArray(found);
        if (rawAllocs.length > 0) {
          allocs = rawAllocs;
        } else if (rawSources.length > 0) {
          allocs = rawSources.map((item: any) => ({
            skuName: item.product || item.skuName || item.skuCode || 'Item SKU',
            packSizeText: `${item.quantity || 1} ${item.uom || 'KG'}`,
            packSizeKg: item.packSizeKg || 1,
            plannedUnits: item.quantity || 1,
            packedUnits: item.packedUnits !== undefined && item.packedUnits !== null ? item.packedUnits : '',
            rejectedUnits: item.rejectedUnits ?? 0,
            labelsApplied: item.labelsApplied !== undefined && item.labelsApplied !== null ? item.labelsApplied : '',
            labelsRejected: item.labelsRejected ?? 0,
          }));
        }

        const initialAllocInputs = allocs.map((a: any) => {
          const resolved = resolveProductAndSku(a, found, catalog || []);
          return {
            ...a,
            sku: a.sku || resolved.sku,
            productName: a.productName || resolved.productName,
            packedUnits: a.packedUnits !== undefined && a.packedUnits !== null ? a.packedUnits : '',
            rejectedUnits: a.rejectedUnits ?? 0,
            labelsApplied: a.labelsApplied !== undefined && a.labelsApplied !== null ? a.labelsApplied : '',
            labelsRejected: a.labelsRejected ?? 0,
          };
        });
        setAllocInputs(initialAllocInputs);

        if (initialAllocInputs.length > 0) {
          const totApplied = initialAllocInputs.reduce((sum: number, a: any) => sum + (Number(a.labelsApplied) || 0), 0);
          const totRejected = initialAllocInputs.reduce((sum: number, a: any) => sum + (Number(a.labelsRejected) || 0), 0);
          setLabelsApplied(String(totApplied));
          setLabelsRejected(String(totRejected));
        } else {
          const la = found.labelsApplied ?? found.actualProduced;
          setLabelsApplied(la ? String(la) : '');
          setLabelsRejected(found.labelsRejected ? String(found.labelsRejected) : '0');
        }
      }
    } catch (e) {
      console.error('Failed to fetch Work Order for details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWO();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
        <Package className="text-slate-300 dark:text-gray-600 mb-4 animate-pulse" size={48} />
        <h3 className="text-lg font-bold text-slate-700 dark:text-gray-300">Loading Execution Workspace...</h3>
      </div>
    );
  }

  if (!selectedWO) {
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

  const isLabelingStage = [
    'LABEL_APPLICATION_ASSIGNED',
    'LABELS_PRINTED',
    'LABEL_APPLICATION_IN_PROGRESS',
    'LABELS_APPLIED',
    'QC_PENDING',
    'COMPLETED'
  ].includes(selectedWO.status);

  // Packing logic
  const invUnit = getWOUnit(selectedWO);
  const totalAllocReq = allocInputs.length > 0
    ? allocInputs.reduce((sum, a) => sum + (Number(a.totalQtyKg) || (Number(a.plannedUnits) || 0) * (a.packSizeKg || 1)), 0)
    : 0;
  const reqQty = totalAllocReq > 0 ? totalAllocReq : (selectedWO.requiredQty || 1);
  const packedQty = actualProduced;
  const packingRemaining = Math.max(0, reqQty - packedQty);
  const packingPct = Math.min(100, Math.round((packedQty / reqQty) * 100));

  // Labeling logic (strictly based on actual packed quantities/units from packing execution)
  const totalAllocPackedUnits = allocInputs.length > 0
    ? allocInputs.reduce((sum, a) => sum + (Number(a.packedUnits) || 0), 0)
    : 0;
  const reqLabels = allocInputs.length > 0
    ? allocInputs.reduce((sum, a) => sum + getReqForSKU(a), 0)
    : (packedQty > 0 ? packedQty : reqQty);
  const labelsRemaining = Math.max(0, reqLabels - Number(labelsApplied || 0) - Number(labelsRejected || 0));
  const labelingPct = reqLabels > 0 ? Math.min(100, Math.round((Number(labelsApplied || 0) / reqLabels) * 100)) : 0;



  const handleStartPacking = async () => {
    try {
      setActionLoading(true);
      const updated = await workOrderService.startPacking(selectedWO.id);
      setSelectedWO(updated);
      showToast(`Packing started for Work Order ${updated.woNumber}`);
      fetchWO();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to start packing', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveQuantity = async () => {
    for (const alloc of allocInputs) {
      const planned = Number(alloc.plannedUnits) || 0;
      const packed = Number(alloc.packedUnits) || 0;
      const rejected = Number(alloc.rejectedUnits) || 0;
      const label = alloc.skuName || alloc.productName || 'SKU';
      if (planned > 0 && packed > planned) {
        showToast(`Packed units for ${label} cannot exceed planned units (${planned}).`, true);
        return;
      }
      if (planned > 0 && packed + rejected > planned) {
        showToast(`Total units for ${label} cannot exceed planned units (${planned}).`, true);
        return;
      }
    }

    if (actualProduced > reqQty) {
      showToast(`Packed quantity cannot exceed required quantity (${reqQty}).`, true);
      return;
    }
    try {
      setActionLoading(true);
      const allocationsPayload = allocInputs.map((a: any) => {
        const resolved = resolveProductAndSku(a, selectedWO, catalogProducts);
        return {
          ...a,
          sku: a.sku || resolved.sku,
          productName: a.productName || resolved.productName,
        };
      });
      const updated = await workOrderService.updateQuantity(selectedWO.id, {
        actualProduced,
        actualRejected,
      });
      if (allocationsPayload.length > 0) {
        await workOrderService.updateWorkOrderStatus(selectedWO.id, selectedWO.status, {
          outputAllocations: allocationsPayload,
        });
      }
      setSelectedWO(updated);
      showToast('Packed quantity updated successfully!');
      fetchWO();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to update quantity', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePausePacking = async () => {
    if (!pauseReason.trim()) {
      showToast('Please enter a reason to pause packing.', true);
      return;
    }
    try {
      setActionLoading(true);
      const updated = await workOrderService.pausePacking(selectedWO.id, pauseReason);
      setSelectedWO(updated);
      setShowPauseModal(false);
      setPauseReason('');
      showToast('Packing paused.');
      fetchWO();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to pause packing', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumePacking = async () => {
    try {
      setActionLoading(true);
      const updated = await workOrderService.resumePacking(selectedWO.id);
      setSelectedWO(updated);
      showToast('Packing resumed.');
      fetchWO();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to resume packing', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompletePacking = async () => {
    for (const alloc of allocInputs) {
      const planned = Number(alloc.plannedUnits) || 0;
      const packed = Number(alloc.packedUnits) || 0;
      const rejected = Number(alloc.rejectedUnits) || 0;
      const label = alloc.skuName || alloc.productName || 'SKU';
      if (planned > 0 && packed > planned) {
        showToast(`Packed units for ${label} cannot exceed planned units (${planned}).`, true);
        return;
      }
      if (planned > 0 && packed + rejected > planned) {
        showToast(`Total units for ${label} cannot exceed planned units (${planned}).`, true);
        return;
      }
    }

    if (actualProduced <= 0) {
      showToast('Packed quantity must be greater than 0 to complete packing.', true);
      return;
    }
    if (actualProduced > reqQty) {
      showToast(`Packed quantity cannot exceed required quantity (${reqQty}).`, true);
      return;
    }
    try {
      setActionLoading(true);
      const allocationsPayload = allocInputs.map((a: any) => {
        const resolved = resolveProductAndSku(a, selectedWO, catalogProducts);
        return {
          ...a,
          sku: a.sku || resolved.sku,
          productName: a.productName || resolved.productName,
        };
      });
      // Ensure quantity is updated before marking complete
      await workOrderService.updateQuantity(selectedWO.id, {
        actualProduced,
        actualRejected,
      });
      if (allocationsPayload.length > 0) {
        await workOrderService.updateWorkOrderStatus(selectedWO.id, selectedWO.status, {
          outputAllocations: allocationsPayload,
        });
      }
      const updated = await workOrderService.completePacking(selectedWO.id);
      setSelectedWO(updated);
      showToast(`Work Order ${updated.woNumber} packing completed!`);
      setTimeout(() => {
        navigate('/packing-erp/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to complete packing', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignLabels = async () => {
    try {
      setActionLoading(true);
      await barcodeService.printLabels({
        workOrderId: selectedWO.id,
        batchNumber: selectedWO.batchNumber || `BATCH-${selectedWO.woNumber}`,
        barcodeType: 'CODE128',
        printedQty: actualProduced > 0 ? actualProduced : reqQty,
      });
      showToast(`Labels assigned for Work Order ${selectedWO.woNumber}`);
      fetchWO();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to assign labels', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartLabeling = async () => {
    try {
      setActionLoading(true);
      await workOrderService.updateWorkOrderStatus(selectedWO.id, 'LABEL_APPLICATION_IN_PROGRESS');
      showToast('Labeling started!');
      fetchWO();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to start labeling', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveLabelQuantities = async () => {
    const maxQty = reqLabels;
    if (Number(labelsApplied) + Number(labelsRejected) > maxQty) {
      showToast(`Total labels cannot exceed packed quantity (${maxQty}).`, true);
      return;
    }
    try {
      setActionLoading(true);
      const allocationsPayload = allocInputs.map((a: any) => {
        const resolved = resolveProductAndSku(a, selectedWO, catalogProducts);
        return {
          ...a,
          sku: a.sku || resolved.sku,
          productName: a.productName || resolved.productName,
        };
      });
      const updated = await workOrderService.updateWorkOrderStatus(selectedWO.id, selectedWO.status, {
        labelsApplied: Number(labelsApplied),
        labelsRejected: Number(labelsRejected),
        outputAllocations: allocationsPayload.length > 0 ? allocationsPayload : undefined,
      });
      setSelectedWO(updated);
      showToast('Label quantities updated successfully!');
      fetchWO();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to update label quantities', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteLabeling = async () => {
    const maxQty = reqLabels;
    if (Number(labelsApplied) + Number(labelsRejected) > maxQty) {
      showToast(`Total labels cannot exceed packed quantity (${maxQty}).`, true);
      return;
    }
    try {
      setActionLoading(true);
      const allocationsPayload = allocInputs.map((a: any) => {
        const resolved = resolveProductAndSku(a, selectedWO, catalogProducts);
        return {
          ...a,
          sku: a.sku || resolved.sku,
          productName: a.productName || resolved.productName,
        };
      });
      await workOrderService.updateWorkOrderStatus(selectedWO.id, selectedWO.status, {
        labelsApplied: Number(labelsApplied),
        labelsRejected: Number(labelsRejected),
        outputAllocations: allocationsPayload.length > 0 ? allocationsPayload : undefined,
      });
      await barcodeService.completeTask({
        workOrderId: selectedWO.id,
        appliedQuantity: Number(labelsApplied),
      });
      showToast('Labeling completed successfully!');
      fetchWO();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to complete labeling', true);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Toast notifications */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-55 bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-5 right-5 z-55 bg-rose-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header & Back */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Packing Execution Details
          </h2>
          <p
            className="text-sm text-slate-500 dark:text-gray-400 mt-1 cursor-pointer hover:underline"
            onClick={() => navigate('/packing-erp/dashboard')}
          >
            Dashboard &gt; {selectedWO.woNumber}
          </p>
        </div>
        <button
          onClick={() => navigate('/packing-erp/dashboard')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Packing Stage Tracker */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
            Packing Execution Stage Tracker
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {STAGES.map((stage, idx) => {
            const uiStatus = selectedWO.status === 'PACKING_STARTED' && (selectedWO.actualProduced || 0) > 0 
                ? 'PACKING_IN_PROGRESS' 
                : (selectedWO.status === 'LABELS_PRINTED' ? 'LABEL_APPLICATION_ASSIGNED' : selectedWO.status);
            
            const activeIdx = STAGES.findIndex((s) => s.key === uiStatus);
            const isCompletedState = selectedWO.status === 'LABELS_APPLIED' || selectedWO.status === 'COMPLETED' || selectedWO.status === 'QC_PENDING';
            const isDone = idx < activeIdx || isCompletedState;
            const isCurrent = idx === activeIdx && !isCompletedState;

            return (
              <div
                key={stage.key}
                className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 text-center transition-all ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : isCurrent
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500'
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                  )}
                </div>
                <span className="text-[10px] font-semibold truncate">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WO Context */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Package size={16} className="text-[#00891D]" />
            Work Order Context
          </h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
            <div>
              <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                WO Number
              </span>
              <span className="text-slate-800 dark:text-white font-bold font-mono block mt-0.5">
                {selectedWO.woNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                Output Product
              </span>
              <div className="mt-0.5">
                {renderProductColumn(selectedWO)}
              </div>
            </div>
            <div>
              <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                SKU
              </span>
              <span className="text-slate-800 dark:text-white font-mono font-semibold block mt-0.5">
                {(allocInputs.length > 0 && allocInputs[0]?.sku && allocInputs[0].sku !== '—')
                  ? allocInputs[0].sku
                  : (selectedWO.product?.sku && selectedWO.product.sku !== '—'
                      ? selectedWO.product.sku
                      : (allocInputs.length > 0
                          ? resolveProductAndSku(allocInputs[0], selectedWO, catalogProducts).sku
                          : (Array.isArray((selectedWO as any).sourceItems) && (selectedWO as any).sourceItems[0]?.sku !== '—' && (selectedWO as any).sourceItems[0]?.sku) || 'N/A'))}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                Batch Number
              </span>
              <span className="text-slate-800 dark:text-white font-mono font-semibold block mt-0.5">
                {selectedWO.batchNumber || `BATCH-${selectedWO.woNumber}`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                Assigned Operator
              </span>
              <span className="text-slate-800 dark:text-white font-semibold block mt-0.5 truncate">
                {selectedWO.operator?.name || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>

        {/* Quantity Summary Card */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Layers size={16} className="text-blue-500" />
            {isLabelingStage ? 'Labeling Quantity & Progress' : 'Quantity & Progress'}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs mb-4">
            <div className="p-3 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-100 dark:border-gray-700">
              <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                {isLabelingStage ? 'Packed Qty' : 'Required Qty'}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-white font-mono">
                {isLabelingStage
                  ? (allocInputs.length > 0 && totalAllocPackedUnits > 0
                      ? `${totalAllocPackedUnits} Packs (${parseFloat(Number(packedQty || 0).toFixed(3))} ${invUnit})`
                      : `${parseFloat(Number(packedQty || 0).toFixed(3))} ${invUnit}`)
                  : formatRequiredQty(selectedWO)}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-emerald-600 dark:text-emerald-400 block text-[9px] uppercase font-bold">
                {isLabelingStage ? 'Labels Applied' : 'Packed Qty'}
              </span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                {isLabelingStage ? (labelsApplied || 0) : `${parseFloat(Number(packedQty || 0).toFixed(3))} ${invUnit}`}
              </span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900">
              <span className="text-amber-600 dark:text-amber-400 block text-[9px] uppercase font-bold">
                {isLabelingStage ? 'Remaining to Label' : 'Remaining Qty'}
              </span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">
                {isLabelingStage ? labelsRemaining : `${parseFloat(Number(packingRemaining || 0).toFixed(3))} ${invUnit}`}
              </span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900">
              <span className="text-rose-600 dark:text-rose-400 block text-[9px] uppercase font-bold">
                {isLabelingStage ? 'Rejected Labels' : 'Rejected Qty'}
              </span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono">
                {isLabelingStage ? (labelsRejected || 0) : `${parseFloat(Number(actualRejected || 0).toFixed(3))} ${invUnit}`}
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              <span>{isLabelingStage ? 'Labeling Progress' : 'Packing Progress'}</span>
              <span>{isLabelingStage ? labelingPct : packingPct}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${isLabelingStage ? 'bg-blue-600' : 'bg-[#00891D]'}`}
                style={{ width: `${isLabelingStage ? labelingPct : packingPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Execution Actions Card */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" />
              Packing Actions
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
              Current Status:{' '}
              <span className="font-bold text-slate-800 dark:text-white uppercase">
                {(selectedWO.status === 'PACKING_STARTED' && (selectedWO.actualProduced || 0) > 0 
                  ? 'PACKING_IN_PROGRESS' 
                  : selectedWO.status).replace(/_/g, ' ')}
              </span>
            </p>
          </div>

          <div className="space-y-3">
            {selectedWO.status === 'MATERIAL_ISSUED' && (
              <button
                onClick={handleStartPacking}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00891D] hover:bg-[#007017] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Start Packing</span>
              </button>
            )}

            {selectedWO.isPaused ? (
              <button
                onClick={handleResumePacking}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Resume Packing</span>
              </button>
            ) : (
              (selectedWO.status === 'PACKING_STARTED' ||
                selectedWO.status === 'PACKING_IN_PROGRESS') && (
                <button
                  onClick={() => setShowPauseModal(true)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 font-semibold text-xs rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  <Pause size={14} />
                  <span>Pause Packing</span>
                </button>
              )
            )}

            {(selectedWO.status === 'PACKING_STARTED' ||
              selectedWO.status === 'PACKING_IN_PROGRESS') && (
              <button
                onClick={handleCompletePacking}
                disabled={actionLoading || actualProduced <= 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Complete Packing</span>
              </button>
            )}

            {(selectedWO.status === 'PACKING_COMPLETED') && (
              <button
                onClick={handleAssignLabels}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Assign Labels</span>
              </button>
            )}

            {(selectedWO.status === 'LABEL_APPLICATION_ASSIGNED' || selectedWO.status === 'LABELS_PRINTED') && (
              <button
                onClick={handleStartLabeling}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00891D] hover:bg-[#007017] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Start Labeling</span>
              </button>
            )}

            {selectedWO.status === 'LABEL_APPLICATION_IN_PROGRESS' && (
              <button
                onClick={handleCompleteLabeling}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Complete Labeling</span>
              </button>
            )}

            {(selectedWO.status === 'LABELS_APPLIED' || selectedWO.status === 'QC_PENDING' || selectedWO.status === 'COMPLETED') && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                ✓ Labeling Completed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Production Output Entry Card */}
      {(selectedWO.status === 'PACKING_STARTED' ||
        selectedWO.status === 'PACKING_IN_PROGRESS') && (
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-gray-700 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Update Floor Output Quantities
            </h3>
            <button
              onClick={handleSaveQuantity}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Save size={14} />
              <span>Save Quantities</span>
            </button>
          </div>

          {allocInputs.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">PRODUCT NAME</th>
                      <th className="py-2.5 px-3">PACK SIZE</th>
                      <th className="py-2.5 px-3 text-center">PLANNED UNITS</th>
                      <th className="py-2.5 px-3 text-center">PACKED UNITS (GOOD)</th>
                      <th className="py-2.5 px-3 text-center">REJECTED UNITS</th>
                      <th className="py-2.5 px-3 text-right">TOTAL PACKED QTY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                    {allocInputs.map((alloc: any, idx: number) => {
                      const unit = invUnit;
                      const totalPackedKg = (Number(alloc.packedUnits) || 0) * (alloc.packSizeKg || 1);
                      const resolved = resolveProductAndSku(alloc, selectedWO, catalogProducts);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/30">
                          <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                            {alloc.sku || resolved.sku}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {alloc.productName || resolved.productName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300 font-semibold">
                            {alloc.packSizeText}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-gray-200">
                            {alloc.plannedUnits}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={alloc.plannedUnits}
                              placeholder="0"
                              value={alloc.packedUnits === undefined || alloc.packedUnits === null || alloc.packedUnits === '' || alloc.packedUnits === 0 ? '' : alloc.packedUnits}
                              onChange={(e) => handleAllocPackedChange(idx, e.target.value)}
                              className="w-24 p-1.5 text-center border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-emerald-600 dark:bg-gray-900 dark:text-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={alloc.rejectedUnits === 0 || alloc.rejectedUnits === '' || alloc.rejectedUnits == null ? '' : alloc.rejectedUnits}
                              onChange={(e) => handleAllocRejectedChange(idx, e.target.value)}
                              className="w-24 p-1.5 text-center border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-rose-600 dark:bg-gray-900 dark:text-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {totalPackedKg} {unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-between items-center p-3 bg-slate-50 dark:bg-gray-700/40 rounded-lg border border-slate-200 dark:border-gray-700 text-xs font-bold">
                <span className="text-slate-600 dark:text-gray-300">Total Floor Output Summary:</span>
                <div className="flex gap-6 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Total Packed Qty</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{actualProduced} {invUnit}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Total Rejected Qty</span>
                    <strong className="text-rose-600 dark:text-rose-400">{actualRejected} {invUnit}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Packed Quantity (Good Packs) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={reqQty}
                  placeholder="Enter packed quantity..."
                  value={actualProduced === 0 ? '' : actualProduced}
                  onChange={(e) => {
                    let val = e.target.value === '' ? 0 : Number(e.target.value);
                    if (val > reqQty) val = reqQty;
                    setActualProduced(val);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Rejected / Defective Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={actualRejected === 0 ? '' : actualRejected}
                  onChange={(e) => {
                    let val = e.target.value === '' ? 0 : Number(e.target.value);
                    setActualRejected(val);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Labeling Output Entry Card */}
      {selectedWO.status === 'LABEL_APPLICATION_IN_PROGRESS' && (
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-gray-700 pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Update Labeling Quantities
            </h3>
            <button
              onClick={handleSaveLabelQuantities}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Save size={14} />
              <span>Save Quantities</span>
            </button>
          </div>

          {allocInputs.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-700">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">PRODUCT NAME</th>
                      <th className="py-2.5 px-3">PACK SIZE</th>
                      <th className="py-2.5 px-3 text-center">PACKED UNITS (TO LABEL)</th>
                      <th className="py-2.5 px-3 text-center">LABELS APPLIED</th>
                      <th className="py-2.5 px-3 text-center">REJECTED LABELS</th>
                      <th className="py-2.5 px-3 text-right">REMAINING LABELS</th>
                    </tr>
                  </thead>                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                    {allocInputs.map((alloc: any, idx: number) => {
                      const reqForSKU = getReqForSKU(alloc);
                      const applied = alloc.labelsApplied ?? 0;
                      const rejected = alloc.labelsRejected ?? 0;
                      const rem = Math.max(0, reqForSKU - applied - rejected);
                      const resolved = resolveProductAndSku(alloc, selectedWO, catalogProducts);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-gray-700/30">
                          <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700 dark:text-indigo-400">
                            {alloc.sku || resolved.sku}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {alloc.productName || resolved.productName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300 font-semibold">
                            {alloc.packSizeText}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-gray-200">
                            {reqForSKU}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={reqForSKU}
                              value={applied === 0 ? '' : applied}
                              onChange={(e) => handleAllocLabelsAppliedChange(idx, e.target.value)}
                              className="w-24 p-1.5 text-center border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-600 dark:bg-gray-900 dark:text-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={rejected === 0 ? '' : rejected}
                              onChange={(e) => handleAllocLabelsRejectedChange(idx, e.target.value)}
                              className="w-24 p-1.5 text-center border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold focus:ring-1 focus:ring-rose-600 dark:bg-gray-900 dark:text-white"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {rem}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-between items-center p-3 bg-slate-50 dark:bg-gray-700/40 rounded-lg border border-slate-200 dark:border-gray-700 text-xs font-bold">
                <span className="text-slate-600 dark:text-gray-300">Total Labeling Summary:</span>
                <div className="flex gap-6 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Total Labels Applied</span>
                    <strong className="text-blue-600 dark:text-blue-400">{labelsApplied || 0}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Total Rejected Labels</span>
                    <strong className="text-rose-600 dark:text-rose-400">{labelsRejected || 0}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Total Remaining</span>
                    <strong className="text-amber-600 dark:text-amber-400">{labelsRemaining}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Labels Applied Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  value={labelsApplied}
                  onChange={(e) => setLabelsApplied(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Rejected / Defective Labels Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={labelsRejected}
                  onChange={(e) => setLabelsRejected(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pause Packing Job
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Please enter the reason for pausing this packing job (e.g. Machine Maintenance, Material Reload).
            </p>
            <textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Enter pause reason..."
              className="w-full border border-slate-200 dark:border-gray-700 rounded-lg p-3 text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:ring-1 focus:ring-emerald-600 h-24 shadow-2xs resize-none"
            />
            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handlePausePacking}
                disabled={actionLoading || !pauseReason.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                Pause Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingExecutionDetails;
