import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  X,
  Image as ImageIcon,
  Loader2,
  Package,
  ArrowLeft,
} from 'lucide-react';
import {
  qualityCheckService,
  PendingQCWorkOrder,
} from '../../../api/packing/qualityCheckService';
import { workOrderService } from '../../../api/packing/workOrderService';
import { masterDataService } from '../../../api/packing/masterDataService';
import { resolveProductAndSku } from './PackingExecutionDetails';
import toast from 'react-hot-toast';

const DEFAULT_CHECKS = {
  sealIntegrity: true,
  packagingDamage: true,
  tamperCheck: true,
  weightAccuracy: true,
  quantityVerification: true,
  productAppearance: true,
  barcodeReadability: true,
  labelPlacement: true,
  mrpVerification: true,
  manufacturingDate: true,
  expiryDate: true,
};

const CHECKLIST_SECTIONS = [
  {
    section: 'Packaging',
    color: 'text-blue-600 dark:text-blue-400',
    items: [
      { key: 'sealIntegrity', label: 'Seal Integrity' },
      { key: 'packagingDamage', label: 'Packaging Damage' },
      { key: 'tamperCheck', label: 'Tamper Check' },
    ] as { key: keyof typeof DEFAULT_CHECKS; label: string }[],
  },
  {
    section: 'Product',
    color: 'text-violet-600 dark:text-violet-400',
    items: [
      { key: 'weightAccuracy', label: 'Weight Accuracy' },
      { key: 'quantityVerification', label: 'Quantity Verification' },
      { key: 'productAppearance', label: 'Product Appearance' },
    ] as { key: keyof typeof DEFAULT_CHECKS; label: string }[],
  },
  {
    section: 'Label',
    color: 'text-emerald-600 dark:text-emerald-400',
    items: [
      { key: 'barcodeReadability', label: 'Barcode Readability' },
      { key: 'labelPlacement', label: 'Label Placement' },
      { key: 'mrpVerification', label: 'MRP Verification' },
      { key: 'manufacturingDate', label: 'Mfg Date' },
      { key: 'expiryDate', label: 'Expiry Date' },
    ] as { key: keyof typeof DEFAULT_CHECKS; label: string }[],
  },
];

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
  if (trimmed === 'PACKS' || trimmed === 'PACK') return 'PACK';
  if (trimmed === 'PIECES' || trimmed === 'PIECE' || trimmed === 'PCS') return 'PCS';
  return trimmed;
};

const getWOUnit = (wo: any) => {
  const items = getSourceItemsArray(wo);
  const sourceUom = items[0]?.uom || items[0]?.unit || (wo as any)?.uom || (wo as any)?.product?.unit;
  return sourceUom ? normalizeUnit(sourceUom) : 'KG';
};

export const PackingQualityCheck: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState<PendingQCWorkOrder | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Form fields
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formCheckedQty, setFormCheckedQty] = useState<number | ''>('');
  const [formPackedQty, setFormPackedQty] = useState(0);
  const [formInspectionType, setFormInspectionType] = useState('100% Inspection');
  const [formResult, setFormResult] = useState('PASS');
  const [formSeverity, setFormSeverity] = useState('MINOR');
  const [formFailureReason, setFormFailureReason] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formPhotos, setFormPhotos] = useState<{ id: string; url: string; file: File }[]>([]);
  const [checks, setChecks] = useState({ ...DEFAULT_CHECKS });
  const [submitting, setSubmitting] = useState(false);

  const loadTargetWO = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch work orders or pending QC list and catalog products
      const [pendingRes, woData, productsRes] = await Promise.all([
        qualityCheckService.getPendingQCWorkOrders().catch(() => ({ data: [] })),
        workOrderService.getWorkOrderById(id).catch(() => null),
        masterDataService.getProducts().catch(() => ({ data: [] })),
      ]);

      const catalog = (productsRes as any)?.data || (Array.isArray(productsRes) ? productsRes : []);
      setCatalogProducts(catalog);

      const pendingList: PendingQCWorkOrder[] = Array.isArray(pendingRes) ? pendingRes : (pendingRes as any)?.data || [];
      let found: any = pendingList.find((w) => w.id === id || w.woNumber === id) || null;

      if (!found && woData) {
        found = woData as any;
      } else if (found && woData) {
        found = {
          ...woData,
          ...found,
          outputAllocations: (woData as any).outputAllocations || (found as any).outputAllocations,
          sourceItems: (woData as any).sourceItems || (found as any).sourceItems,
        };
      }

      if (!found) {
        const allWOs = await workOrderService.getWorkOrders({ limit: 500 }).catch(() => ({ data: [] }));
        found = (allWOs.data || []).find((w: any) => w.id === id || w.woNumber === id) || null;
      }

      if (found) {
        setSelectedWO(found);
        const allocs = getOutputAllocationsArray(found);
        let totalPackedUnits = 0;
        if (allocs.length > 0) {
          totalPackedUnits = allocs.reduce((sum: number, alloc: any) => {
            const val = alloc.packedUnits !== undefined && alloc.packedUnits !== null
              ? Number(alloc.packedUnits)
              : alloc.packedQty !== undefined && alloc.packedQty !== null
              ? Number(alloc.packedQty)
              : Number(alloc.plannedUnits) || 0;
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
        } else {
          totalPackedUnits = Number((found as any).packedUnits ?? found.actualProduced ?? found.requiredQty ?? 0);
        }

        setFormPackedQty(totalPackedUnits);
        setFormCheckedQty(totalPackedUnits || '');
        setFormBatchNo(found.batchNumber ?? `BATCH-${found.woNumber.split('-').pop()}`);
      }
    } catch (err) {
      console.error('Failed to load Quality Check target Work Order:', err);
      toast.error('Failed to load Work Order for Quality Check.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTargetWO();
  }, [loadTargetWO]);

  const handleCheckboxChange = (key: keyof typeof checks) => {
    const updated = { ...checks, [key]: !checks[key] };
    setChecks(updated);
    setFormResult(Object.values(updated).every((v) => v) ? 'PASS' : 'REWORK');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFormPhotos((prev) => [
      ...prev,
      ...Array.from(e.target.files!).map((f) => ({
        id: Math.random().toString(36).slice(2),
        url: URL.createObjectURL(f),
        file: f,
      })),
    ]);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) {
      toast.error('No Work Order selected for Quality Check.');
      return;
    }

    const checkedQtyNum = Number(formCheckedQty);
    if (!formCheckedQty || isNaN(checkedQtyNum) || checkedQtyNum <= 0) {
      toast.error('Checked Quantity must be greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      await qualityCheckService.submitQualityCheck({
        woId: selectedWO.id,
        checkedQty: Number(formCheckedQty),
        result: formResult,
        severity: ['REWORK', 'REJECT', 'DISCARD'].includes(formResult) ? formSeverity : undefined,
        failureReason: ['REWORK', 'REJECT', 'DISCARD'].includes(formResult) ? formFailureReason : undefined,
        remarks: formRemarks,
        checksPayload: checks,
      });

      toast.success(`Quality Check successfully submitted for ${selectedWO.woNumber}!`);
      setTimeout(() => {
        navigate('/packing-erp/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit Quality Check:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to submit Quality Check.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 text-slate-500">
        <Loader2 className="animate-spin text-[#00891D] mb-3" size={36} />
        <p className="text-sm font-semibold">Loading Quality Inspection Details...</p>
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
          className="mt-4 px-4 py-2 bg-[#00891D] text-white rounded-lg text-sm font-semibold cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const outputAllocations = getOutputAllocationsArray(selectedWO);
  const sourceItems = getSourceItemsArray(selectedWO);

  const displayProductName = (() => {
    if (!selectedWO) return '—';
    if (outputAllocations.length > 1) {
      return `${outputAllocations.length} Products (${outputAllocations.map((a: any) => resolveProductAndSku(a, selectedWO, catalogProducts).productName || 'Item').join(', ')})`;
    }
    if (outputAllocations.length === 1) {
      return resolveProductAndSku(outputAllocations[0], selectedWO, catalogProducts).productName || selectedWO.product?.name || '—';
    }
    if (sourceItems.length > 1) {
      return `${sourceItems.length} Source Products (${sourceItems.map((s: any) => s.product || s.productName || 'Item').join(', ')})`;
    }
    return selectedWO.product?.name ?? '—';
  })();

  const displayRequiredQty = (() => {
    if (!selectedWO) return '0 units';
    const invUnit = getWOUnit(selectedWO);
    const allocs = getOutputAllocationsArray(selectedWO);
    if (allocs.length > 0) {
      const totalAllocated = allocs.reduce((sum: number, alloc: any) => {
        return sum + (Number(alloc.totalQtyKg) || (Number(alloc.plannedUnits) || 0) * (alloc.packSizeKg || 1));
      }, 0);
      const reqVal = totalAllocated > 0 ? totalAllocated : Number(selectedWO.requiredQty || 0);
      return `${parseFloat(Number(reqVal).toFixed(3))} ${invUnit}`;
    }
    const sources = getSourceItemsArray(selectedWO);
    if (sources.length > 1) {
      return sources.map((s: any) => `${parseFloat(Number(s.quantity || s.issueQuantity || 0).toFixed(3))} ${normalizeUnit(s.uom || invUnit)}`).join(', ');
    }
    return `${parseFloat(Number(selectedWO.requiredQty || 0).toFixed(3))} ${invUnit || 'units'}`;
  })();

  return (
    <div className="space-y-6 text-left pb-12 font-sans select-none">
      {/* TOP BAR / BREADCRUMB */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-gray-700 pb-4 mt-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/packing-erp/dashboard')}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div>
            <span className="text-[10px] font-mono font-bold text-[#00891D] uppercase tracking-wider block">
              {selectedWO.woNumber}
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={22} className="text-[#00891D]" />
              Quality Inspection Checklist Log
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => navigate('/packing-erp/dashboard')}
            className="px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* MAIN FORM GRID */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: INSPECTION INPUTS & CHECKLIST */}
          <div className="lg:col-span-2 space-y-6">
            {/* WORK ORDER SUMMARY CARD */}
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-150 dark:border-gray-700 pb-3">
                1. Work Order Details
              </h3>

              <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                      WO Number
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white font-mono">
                      {selectedWO.woNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                      Product
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white truncate block" title={displayProductName}>
                      {displayProductName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                      Batch Number
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white font-mono">
                      {selectedWO.batchNumber ?? `BATCH-${selectedWO.woNumber.split('-').pop()}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                      Required Qty
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {displayRequiredQty}
                    </span>
                  </div>
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
                          <th className="py-2.5 px-3.5 text-right">TOTAL CONSUMED QTY</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-700/50 font-medium">
                        {outputAllocations.map((alloc: any, idx: number) => {
                          const resolved = resolveProductAndSku(alloc, selectedWO, catalogProducts);
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
                              <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {alloc.totalQtyKg ? `${parseFloat(Number(alloc.totalQtyKg).toFixed(3))} ${getWOUnit(selectedWO)}` : '—'}
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

            {/* BATCH QUANTITY & SAMPLING */}
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-150 dark:border-gray-700 pb-3">
                2. Sampling & Inspection Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-mono bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formBatchNo}
                    onChange={(e) => setFormBatchNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Inspection Type *
                  </label>
                  <select
                    required
                    className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formInspectionType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormInspectionType(newType);
                      if (newType === '100% Inspection' && formPackedQty > 0) {
                        setFormCheckedQty(formPackedQty);
                      } else if (newType === 'Sampling Inspection' && formPackedQty > 0) {
                        setFormCheckedQty(Math.max(1, Math.round(formPackedQty * 0.1)));
                      } else if (newType === 'Random Inspection' && formPackedQty > 0) {
                        setFormCheckedQty(Math.max(1, Math.round(formPackedQty * 0.05)));
                      }
                    }}
                  >
                    <option value="" className="dark:bg-gray-800">-- Select Inspection Type --</option>
                    <option className="dark:bg-gray-800">100% Inspection</option>
                    <option className="dark:bg-gray-800">Sampling Inspection</option>
                    <option className="dark:bg-gray-800">Random Inspection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Packed Qty
                  </label>
                  <input
                    type="number"
                    readOnly
                    className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-mono"
                    value={formPackedQty}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Checked Qty *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-mono bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formCheckedQty}
                    onChange={(e) => setFormCheckedQty(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Sampling %
                  </label>
                  <div
                    className={`w-full p-2.5 border rounded-xl text-sm font-bold text-center flex items-center justify-center h-[42px] ${
                      formPackedQty > 0
                        ? (() => {
                            const p = Math.min(
                              100,
                              Math.round((Number(formCheckedQty) / formPackedQty) * 100)
                            );
                            return p >= 50
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                              : p >= 20
                              ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
                          })()
                        : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-500'
                    }`}
                  >
                    {formPackedQty > 0
                      ? `${Math.min(
                          100,
                          Math.round((Number(formCheckedQty) / formPackedQty) * 100)
                        )}%`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* VERIFICATION CHECKLIST CARD */}
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-150 dark:border-gray-700 pb-3">
                3. Verification Checklist
              </h3>

              <div className="border border-slate-200 dark:border-gray-700 rounded-xl bg-slate-50 dark:bg-gray-900 overflow-hidden">
                {CHECKLIST_SECTIONS.map(({ section, color, items }) => (
                  <div
                    key={section}
                    className="p-4 space-y-3 border-b border-slate-200 dark:border-gray-800 last:border-b-0"
                  >
                    <span className={`block text-xs font-bold uppercase ${color}`}>
                      {section} Criteria
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {items.map(({ key, label }) => (
                        <label
                          key={key}
                          className={`flex items-center gap-2.5 bg-white dark:bg-gray-800 border p-3 rounded-xl cursor-pointer transition-colors ${
                            checks[key]
                              ? 'border-slate-200 dark:border-gray-700'
                              : 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-[#00891D] shrink-0"
                            checked={checks[key]}
                            onChange={() => handleCheckboxChange(key)}
                          />
                          <span className="text-xs font-semibold text-slate-800 dark:text-gray-200 leading-tight">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QC DECISION & EVIDENCE */}
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-150 dark:border-gray-700 pb-3">
                4. Evaluation & Evidence
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    QC Decision *
                  </label>
                  <select
                    className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formResult}
                    onChange={(e) => {
                      setFormResult(e.target.value);
                      if (
                        !['REWORK', 'REJECT', 'DISCARD'].includes(e.target.value)
                      )
                        setFormFailureReason('');
                    }}
                  >
                    <option value="PASS" className="dark:bg-gray-800">Pass (Post to FG)</option>
                    <option value="PARTIAL_PASS" className="dark:bg-gray-800">Partial Pass</option>
                    <option value="REWORK" className="dark:bg-gray-800">Rework Required</option>
                    <option value="REJECT" className="dark:bg-gray-800">Fail Batch</option>
                    <option value="DISCARD" className="dark:bg-gray-800">Discard Batch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Photo Evidence
                  </label>
                  <label className="w-full h-[42px] px-3 rounded-xl border border-dashed border-slate-300 dark:border-gray-600 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer bg-slate-50 dark:bg-gray-900 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400">
                    <ImageIcon size={16} /> Upload photos
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {formPhotos.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {formPhotos.map((p) => (
                    <div
                      key={p.id}
                      className="relative group w-16 h-16 rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden bg-slate-100 dark:bg-gray-900"
                    >
                      <img
                        src={p.url}
                        alt="QC Evidence"
                        className="object-cover w-full h-full cursor-pointer"
                        onClick={() => setPreviewPhoto(p.url)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormPhotos((prev) => prev.filter((x) => x.id !== p.id))
                        }
                        className="absolute top-1 right-1 bg-white dark:bg-gray-800 rounded-full p-1 text-rose-500 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {['REWORK', 'REJECT', 'DISCARD'].includes(formResult) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      Severity *
                    </label>
                    <select
                      className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-semibold focus:outline-none"
                      value={formSeverity}
                      onChange={(e) => setFormSeverity(e.target.value)}
                    >
                      <option value="MINOR" className="dark:bg-gray-800">Minor</option>
                      <option value="MAJOR" className="dark:bg-gray-800">Major</option>
                      <option value="CRITICAL" className="dark:bg-gray-800">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      Failure Reason *
                    </label>
                    <select
                      required
                      className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-semibold focus:outline-none"
                      value={formFailureReason}
                      onChange={(e) => setFormFailureReason(e.target.value)}
                    >
                      <option value="" className="dark:bg-gray-800">-- Select Reason --</option>
                      <option className="dark:bg-gray-800">Seal Defect</option>
                      <option className="dark:bg-gray-800">Barcode Issue</option>
                      <option className="dark:bg-gray-800">Label Error</option>
                      <option className="dark:bg-gray-800">Weight Mismatch</option>
                      <option className="dark:bg-gray-800">Product Contamination</option>
                      <option className="dark:bg-gray-800">Damaged Packaging</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Inspection Remarks / Observations
                </label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                  placeholder="Additional notes for rework or FG team..."
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: GUIDELINES & SUMMARY SIDEBAR */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide border-b border-slate-150 dark:border-gray-700 pb-3">
                QC Standard Guidelines
              </h3>

              <div className="space-y-3 text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1">
                  <span className="font-bold text-blue-700 dark:text-blue-400 block">1. Sampling Percentage</span>
                  <p>Ensure checked quantity meets minimum required sampling thresholds before marking PASS.</p>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block">2. Label & Barcode Scan</span>
                  <p>Verify batch barcode scan readability and valid MRP date printing.</p>
                </div>

                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl space-y-1">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block">3. Defect & Rework Protocol</span>
                  <p>For any failed checklist item, select Rework or Reject and specify failure reason and severity.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#00891D] hover:bg-[#007518] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting Inspection Log...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Submit Inspection Log</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 bg-white dark:bg-gray-700 rounded-full p-2 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors shadow-md z-10"
            >
              <X size={20} />
            </button>
            <img
              src={previewPhoto}
              alt="Preview Evidence"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingQualityCheck;
