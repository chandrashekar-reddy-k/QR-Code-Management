import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  X,
  Scan,
  RefreshCw,
  ArrowLeft,
  UserCheck,
  Layers,
} from 'lucide-react';

interface MaterialItem {
  id: string;
  itemCode: string;
  materialName: string;
  batchNo: string;
  type: 'RAW_MATERIAL' | 'PACKAGING' | string;
  reqQty: number;
  uom: string;
  stockQty: number;
  issueQty: number;
  status: 'AVAILABLE' | 'INSUFFICIENT' | 'OUT_OF_STOCK' | 'INVENTORY_UNAVAILABLE';
}

const resolveProductUnit = (product: any): string => {
  if (!product) return 'Units';
  let rawUnit =
    product.uom?.abbreviation ||
    product.uom?.name ||
    (typeof product.unit === 'object'
      ? product.unit?.name || product.unit?.type
      : product.unit);
  if (
    !rawUnit ||
    /^[0-9a-f-]{36}$/i.test(String(rawUnit).trim()) ||
    /^\d+$/.test(String(rawUnit).trim()) ||
    String(rawUnit).length > 20
  ) {
    const textToSearch = `${product.sku || ''} ${product.variantName || ''} ${product.name || ''}`.toUpperCase();
    if (textToSearch.includes('KG') || textToSearch.includes('KILOGRAM')) {
      return 'kg';
    } else if (
      textToSearch.includes('GRAM') ||
      textToSearch.includes(' GM') ||
      textToSearch.includes(' G')
    ) {
      return 'gm';
    } else if (
      textToSearch.includes('ML') ||
      textToSearch.includes('MILLILITRE')
    ) {
      return 'ml';
    } else if (
      textToSearch.includes('LITRE') ||
      textToSearch.includes(' LTR') ||
      textToSearch.includes(' L')
    ) {
      return 'L';
    } else if (
      textToSearch.includes('PACKET') ||
      textToSearch.includes('PCS') ||
      textToSearch.includes('PIECE')
    ) {
      return 'pcs';
    }
    return product.unitName || product.uom || 'Units';
  }
  return String(rawUnit);
};

export const PackingMaterialIssueDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Execution State
  const [batchNo, setBatchNo] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const [materialsToIssue, setMaterialsToIssue] = useState<MaterialItem[]>([]);

  const fetchWO = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await workOrderService.getWorkOrders();
      const found = res.data?.find((w) => w.id === id);
      if (found) {
        setSelectedWO(found);
      }
    } catch (e) {
      console.error('Failed to fetch Work Order details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWO();
  }, [id]);



  useEffect(() => {
    if (!selectedWO) return;

    let sourceItems = (selectedWO as any).sourceItems;
    if (typeof sourceItems === 'string') {
      try { sourceItems = JSON.parse(sourceItems); } catch (e) { }
    }

    let outputAllocations = (selectedWO as any).outputAllocations;
    if (typeof outputAllocations === 'string') {
      try { outputAllocations = JSON.parse(outputAllocations); } catch (e) { }
    }

    if (Array.isArray(sourceItems) && sourceItems.length > 0) {
      const sourceBatches = sourceItems.map((i: any) => i.batch || i.batchNo).filter(Boolean);
      if (batchNo === '') {
        setBatchNo(sourceBatches.length > 0 ? sourceBatches.join(', ') : selectedWO.batchNumber || `BATCH-${selectedWO.woNumber}`);
      }

      const items: MaterialItem[] = sourceItems.map((item: any, idx: number) => {
        let itemReqQty = selectedWO.requiredQty || 10;
        if (Array.isArray(outputAllocations) && outputAllocations.length > 0) {
          const matchedByProd = outputAllocations.filter(
            (a: any) =>
              (a.sourceProductName && a.sourceProductName.trim().toLowerCase() === item.product?.trim().toLowerCase()) ||
              (a.sourceProductId && a.sourceProductId === item.id)
          );
          if (matchedByProd.length > 0) {
            itemReqQty = matchedByProd.reduce(
              (acc: number, a: any) =>
                acc + (Number(a.totalQtyKg) || (Number(a.plannedUnits) || 0) * (a.packSizeKg || 1)),
              0
            );
          } else {
            const itemUom = (item.uom || 'KG').toUpperCase();
            const matchedByUom = outputAllocations.filter((a: any) => {
              const parts = a.packSizeText ? a.packSizeText.trim().split(' ') : [];
              const unit = parts.length > 1 ? parts.slice(1).join(' ').toUpperCase() : 'KG';
              return unit === itemUom;
            });
            if (matchedByUom.length > 0) {
              const totalUomQty = matchedByUom.reduce(
                (acc: number, a: any) =>
                  acc + (Number(a.totalQtyKg) || (Number(a.plannedUnits) || 0) * (a.packSizeKg || 1)),
                0
              );
              const uomItems = sourceItems.filter(
                (s: any) => (s.uom || 'KG').toUpperCase() === itemUom
              );
              itemReqQty = Math.round((totalUomQty / uomItems.length) * 100) / 100;
            }
          }
        }

        const stockQty = Number(item.availableQty) ?? (item.productObj as any)?.availableStock ?? 100;
        const shortage = Math.max(0, itemReqQty - stockQty);

        let status: MaterialItem['status'] = 'AVAILABLE';
        if (stockQty === 0) {
          status = 'OUT_OF_STOCK';
        } else if (shortage > 0) {
          status = 'INSUFFICIENT';
        }

        const rawSku = item.sku || item.baseSku || item.rawSku;
        const isUuid = typeof rawSku === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSku.trim());
        const isAutoSku = typeof rawSku === 'string' && rawSku.startsWith('SKU-');
        const isVariantSku = typeof rawSku === 'string' && /-\d+-(GRAMS|KG|KILOGRAMS|GM|G|ML|L|PACKET|PCS)/i.test(rawSku.trim());
        const baseSkuCode = (rawSku && String(rawSku).trim() && !isUuid && !isAutoSku && !isVariantSku) ? String(rawSku).trim() : '—';

        return {
          id: item.id || `mat-${idx}`,
          itemCode: baseSkuCode,
          materialName: item.product || 'Raw Material',
          batchNo: item.batch || item.batchNo || selectedWO.batchNumber || '—',
          type: item.type || 'RAW_MATERIAL',
          reqQty: itemReqQty,
          uom: item.uom || 'KG',
          stockQty: stockQty,
          issueQty: itemReqQty,
          status,
        };
      });

      setMaterialsToIssue(items);
    } else {
      if (batchNo === '') {
        setBatchNo(selectedWO.batchNumber || `BATCH-${selectedWO.woNumber}`);
      }

      const reqQty = selectedWO.requiredQty || 10;
      const prod = selectedWO.product;
      const stockQty = (prod as any)?.availableStock ?? (prod as any)?.stock ?? 100;
      const shortage = Math.max(0, reqQty - stockQty);

      let status: MaterialItem['status'] = 'AVAILABLE';
      if (stockQty === 0) {
        status = 'OUT_OF_STOCK';
      } else if (shortage > 0) {
        status = 'INSUFFICIENT';
      }

      const rawProdSku = prod?.sku;
      const isProdUuid = typeof rawProdSku === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawProdSku.trim());
      const isProdAutoSku = typeof rawProdSku === 'string' && rawProdSku.startsWith('SKU-');
      const isProdVariantSku = typeof rawProdSku === 'string' && /-\d+-(GRAMS|KG|KILOGRAMS|GM|G|ML|L|PACKET|PCS)/i.test(rawProdSku.trim());
      const prodSkuCode = (rawProdSku && String(rawProdSku).trim() && !isProdUuid && !isProdAutoSku && !isProdVariantSku) ? String(rawProdSku).trim() : '—';

      const items: MaterialItem[] = [
        {
          id: prod?.id || selectedWO.productId || 'mat-1',
          itemCode: prodSkuCode,
          materialName: prod?.name || 'Raw Material',
          batchNo: selectedWO.batchNumber || '—',
          type: prod?.type || 'RAW_MATERIAL',
          reqQty: reqQty,
          uom: resolveProductUnit(prod),
          stockQty: stockQty,
          issueQty: reqQty,
          status,
        },
      ];

      setMaterialsToIssue(items);
    }
  }, [selectedWO]);

  const handleMaterialQtyChange = (matId: string, value: string) => {
    const numVal = Number(value);
    setMaterialsToIssue((prev) =>
      prev.map((m) => {
        if (m.id === matId) {
          const shortage = Math.max(0, numVal - m.stockQty);
          let status: MaterialItem['status'] = 'AVAILABLE';
          if (m.stockQty === 0) status = 'OUT_OF_STOCK';
          else if (shortage > 0) status = 'INSUFFICIENT';

          return {
            ...m,
            issueQty: numVal,
            status,
          };
        }
        return m;
      })
    );
  };

  const hasNoMaterials = materialsToIssue.length === 0;
  const allAvailable =
    !hasNoMaterials &&
    materialsToIssue.every(
      (m) => m.status === 'AVAILABLE' && m.stockQty >= m.issueQty && m.issueQty > 0
    );


  const handleIssueMaterials = async () => {
    if (!selectedWO) return;

    try {
      setIsSubmitting(true);
      setIssueError(null);

      await workOrderService.issueMaterials(selectedWO.id, {
        batchNo,
        location: undefined,
        materials: materialsToIssue.map((m) => ({
          productId: m.id,
          itemCode: m.itemCode,
          materialName: m.materialName,
          type: m.type,
          reqQty: m.reqQty,
          uom: m.uom,
          stockQty: m.stockQty,
          issuedQty: m.issueQty,
          status: m.status,
        })),
      });

      setIssueSuccess(
        `Successfully issued materials for Work Order ${selectedWO.woNumber}`
      );
      setTimeout(() => {
        setIssueSuccess(null);
        navigate('/packing-erp/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Failed to issue materials:', error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to issue materials';
      setIssueError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
        <Package
          className="text-slate-300 dark:text-gray-600 mb-4 animate-pulse"
          size={48}
        />
        <h3 className="text-lg font-bold text-slate-700 dark:text-gray-300">
          Loading Details...
        </h3>
      </div>
    );
  }

  if (!selectedWO) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
        <Package className="text-slate-300 dark:text-gray-600 mb-4" size={48} />
        <h3 className="text-lg font-bold text-slate-700 dark:text-gray-300">
          Work Order Not Found
        </h3>
        <button
          onClick={() => navigate('/packing-erp/dashboard')}
          className="mt-4 px-4 py-2 bg-[#00891D] text-white rounded-lg text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const getSourceBatchesDisplay = (wo: any) => {
    let items = wo?.sourceItems;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) { }
    }
    if (Array.isArray(items) && items.length > 0) {
      const batches = items.map((i: any) => i.batch || i.batchNo).filter(Boolean);
      if (batches.length > 0) {
        return batches.join(', ');
      }
    }
    return wo?.batchNumber || wo?.woNumber || '—';
  };

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Top Title & Navigation */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Material Issue Details
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

      {issueSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle size={20} />
          <span className="font-semibold">{issueSuccess}</span>
        </div>
      )}

      {issueError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle size={20} />
          <span className="font-semibold">{issueError}</span>
        </div>
      )}

      {/* Main Execution View */}
      <div className="flex flex-col space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Work Order Details */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Package size={16} className="text-[#00891D]" />
              Work Order Details
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
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
                  Expected Completion
                </span>
                <span className="text-slate-800 dark:text-white font-bold font-mono block mt-0.5">
                  {selectedWO.expectedDate
                    ? new Date(selectedWO.expectedDate).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Batch & Assignment Info */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <UserCheck size={16} className="text-blue-500" />
              Batch & Assignment
            </h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                  Batch Number
                </span>
                <span className="text-slate-800 dark:text-white font-bold font-mono block mt-0.5" title={getSourceBatchesDisplay(selectedWO)}>
                  {getSourceBatchesDisplay(selectedWO)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                  Priority
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                  {selectedWO.priority || 'MEDIUM'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                  Supervisor
                </span>
                <span className="text-slate-800 dark:text-gray-200 font-bold block mt-0.5 truncate">
                  {selectedWO.supervisor?.name || 'Supervisor'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                  Operator
                </span>
                <span className="text-slate-800 dark:text-gray-200 font-bold block mt-0.5 truncate">
                  {selectedWO.operator?.name || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Issue Readiness Banner */}
          <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs flex flex-col justify-center">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-full ${selectedWO.status === 'MATERIAL_ISSUED' || (selectedWO.status as string) === 'RAW_MATERIALS_ISSUED'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : allAvailable
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  }`}
              >
                {selectedWO.status === 'MATERIAL_ISSUED' || (selectedWO.status as string) === 'RAW_MATERIALS_ISSUED' ? (
                  <CheckCircle size={24} />
                ) : allAvailable ? (
                  <CheckCircle size={24} />
                ) : (
                  <AlertTriangle size={24} />
                )}
              </div>
              <div>
                <h3
                  className={`text-base font-bold ${selectedWO.status === 'MATERIAL_ISSUED' || (selectedWO.status as string) === 'RAW_MATERIALS_ISSUED'
                    ? 'text-blue-700 dark:text-blue-400'
                    : allAvailable
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                    }`}
                >
                  {selectedWO.status === 'MATERIAL_ISSUED' || (selectedWO.status as string) === 'RAW_MATERIALS_ISSUED'
                    ? 'Materials Issued'
                    : allAvailable
                      ? 'Ready for Issue'
                      : 'Shortage Detected'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  {selectedWO.status === 'MATERIAL_ISSUED' || (selectedWO.status as string) === 'RAW_MATERIALS_ISSUED'
                    ? 'Inventory materials have been dispatched to the packing line.'
                    : allAvailable
                      ? 'Sufficient inventory is available for material issuance.'
                      : 'Required materials fall below available stock.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Output Products Table */}
        {(() => {
          let allocs = selectedWO?.outputAllocations;
          if (typeof allocs === 'string') {
            try { allocs = JSON.parse(allocs); } catch (e) { }
          }
          const resolveVariantSkuCode = (alloc: any) => {
            const explicitSku = alloc.variantSku || alloc.sku || alloc.skuCode;
            if (explicitSku && String(explicitSku).trim() && String(explicitSku).trim() !== '—') {
              return String(explicitSku).trim();
            }
            if (alloc.skuName && typeof alloc.skuName === 'string' && /^[A-Z0-9]+-[0-9]+-[A-Z]+$/i.test(alloc.skuName.trim())) {
              return alloc.skuName.trim();
            }
            const prodName = alloc.sourceProductName || alloc.productName || selectedWO.product?.name || '';
            const packSize = alloc.packSizeText || '';
            if (prodName && packSize) {
              const prefix = prodName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
              const cleanPack = packSize.replace(/\s+/g, '-').toUpperCase();
              return `${prefix}-${cleanPack}`;
            }
            return alloc.skuName || '—';
          };

          const itemsList = Array.isArray(allocs) && allocs.length > 0
            ? allocs.map((alloc: any, idx: number) => {
              const variantName = alloc.skuName || alloc.variantName || (alloc.sourceProductName ? `${alloc.sourceProductName} ${alloc.packSizeText || ''}` : selectedWO.product?.name) || 'Output Variant';
              const sName = resolveVariantSkuCode(alloc);
              const pUnits = alloc.plannedUnits !== undefined ? alloc.plannedUnits : (selectedWO.requiredQty || 1);
              const pSize = alloc.packSizeText || resolveProductUnit(selectedWO.product);
              return {
                id: alloc.id || `alloc-${idx}`,
                name: variantName,
                sku: sName,
                plannedUnits: pUnits,
                packSize: pSize,
              };
            })
            : [
              {
                id: 'alloc-1',
                name: selectedWO.product?.name || 'Output Product',
                sku: selectedWO.product?.sku || (selectedWO.product?.name ? `${selectedWO.product.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-RAW` : '—'),
                plannedUnits: selectedWO.requiredQty || 1,
                packSize: resolveProductUnit(selectedWO.product),
              },
            ];

          return (
            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xs overflow-hidden flex flex-col">
              <div className="border-b border-slate-200 dark:border-gray-700 p-4 bg-slate-50 dark:bg-gray-800/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                  <Layers size={18} className="text-[#00891D]" />
                  <span>Output Products</span>
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {itemsList.length} Output SKU{itemsList.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-500 dark:text-gray-400 uppercase text-[10px] border-b border-slate-200 dark:border-gray-700 font-bold">
                    <tr>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3 text-center">Planned Qty</th>
                      <th className="px-4 py-3 text-center">UOM / Pack Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                    {itemsList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-gray-300">
                          {item.sku}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white">
                          {item.plannedUnits} units
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-gray-300">
                          {item.packSize}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Materials to Issue Table & Controls */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="border-b border-slate-200 dark:border-gray-700 p-4 bg-slate-50 dark:bg-gray-800/50 flex justify-between items-center flex-wrap gap-3">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
              <Package size={18} className="text-[#00891D]" />
              <span>Materials to Issue</span>
            </h3>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Scan
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Scan Barcode..."
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-200 dark:border-gray-700 rounded-lg text-xs focus:ring-1 focus:ring-[#00891D] w-44 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>



          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-500 dark:text-gray-400 uppercase text-[10px] border-b border-slate-200 dark:border-gray-700 font-bold">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Material Name</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-center">Req Qty</th>
                  <th className="px-4 py-3 text-center">Available Stock</th>
                  <th className="px-4 py-3 text-center">Issue Qty</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {materialsToIssue.map((mat) => {
                  return (
                    <tr
                      key={mat.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-gray-300">
                        {mat.itemCode}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">
                        {mat.materialName}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-gray-300 font-bold">
                        {mat.batchNo}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${mat.type === 'PACKAGING'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            }`}
                        >
                          {mat.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white">
                        {mat.reqQty} <span className="text-slate-500 dark:text-gray-400 text-[11px] font-medium">{mat.uom}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white">
                        {mat.stockQty}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={mat.issueQty}
                          onChange={(e) =>
                            handleMaterialQtyChange(mat.id, e.target.value)
                          }
                          className="w-24 p-1 text-center border border-slate-200 dark:border-gray-700 rounded text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#00891D] dark:bg-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {mat.status === 'AVAILABLE' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle size={14} /> Available
                          </span>
                        ) : mat.status === 'INVENTORY_UNAVAILABLE' ? (
                          <span className="inline-flex items-center gap-1 text-gray-500 font-bold text-xs">
                            <AlertTriangle size={14} /> Unavailable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs">
                            <X size={14} /> Shortage
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-gray-800/50 border-t border-slate-200 dark:border-gray-700 flex justify-end items-center flex-wrap gap-3">

            <button
              onClick={handleIssueMaterials}
              disabled={isSubmitting || !allAvailable || hasNoMaterials}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${isSubmitting || !allAvailable || hasNoMaterials
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-[#00891D] hover:bg-[#007017] text-white hover:shadow-md'
                }`}
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Package size={14} />
              )}
              <span>
                {selectedWO.status === 'MATERIAL_ISSUED' || (selectedWO.status as string) === 'RAW_MATERIALS_ISSUED'
                  ? 'Re-issue Materials'
                  : 'Issue Materials'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingMaterialIssueDetails;
