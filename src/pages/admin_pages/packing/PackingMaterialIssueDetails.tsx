import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import { masterDataService, Warehouse } from '../../../api/packing/masterDataService';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  X,
  Scan,
  RefreshCw,
  CornerUpLeft,
  ArrowLeftRight,
  ArrowLeft,
} from 'lucide-react';

interface MaterialItem {
  id: string;
  itemCode: string;
  materialName: string;
  type: 'RAW_MATERIAL' | 'PACKAGING' | string;
  reqQty: number;
  uom: string;
  stockQty: number;
  issueQty: number;
  status: 'AVAILABLE' | 'INSUFFICIENT' | 'OUT_OF_STOCK' | 'INVENTORY_UNAVAILABLE';
}

export const PackingMaterialIssueDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Execution State
  const [batchNo, setBatchNo] = useState('');
  const [location, setLocation] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materialsToIssue, setMaterialsToIssue] = useState<MaterialItem[]>([]);

  useEffect(() => {
    masterDataService.getWarehouses().then(setWarehouses).catch(console.error);
  }, []);

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
    if (!selectedWO || !selectedWO.recipe) return;
    const recipe = selectedWO.recipe;

    if (batchNo === '') setBatchNo(selectedWO.batchNumber || `BATCH-${selectedWO.woNumber}-1`);

    const targetYield = recipe.outputQty && recipe.outputQty > 0 ? recipe.outputQty : 1;
    const woQty = selectedWO.requiredQty || 100;
    const ratio = woQty / targetYield;

    const items: MaterialItem[] = (recipe.items || []).map((item, idx) => {
      const reqQty = Math.round(item.requiredQty * ratio * 100) / 100;
      const inputProd = item.inputProduct;
      const uom = inputProd?.unit || '';
      const type = inputProd?.type || (item.isPackaging ? 'PACKAGING' : 'RAW_MATERIAL');

      // Check stock
      const stockQty = inputProd?.productionStock?.inProductionQty ?? (inputProd as any)?.stockQty ?? (inputProd as any)?.currentStock ?? (inputProd as any)?.stock ?? 0;
      const shortage = Math.max(0, reqQty - stockQty);

      let status: MaterialItem['status'] = 'AVAILABLE';
      if (stockQty === undefined || stockQty === null) {
        status = 'INVENTORY_UNAVAILABLE';
      } else if (stockQty === 0) {
        status = 'OUT_OF_STOCK';
      } else if (shortage > 0) {
        status = 'INSUFFICIENT';
      }

      return {
        id: item.inputProductId || `material-${idx}`,
        itemCode: inputProd?.sku || `SKU-${idx + 1}`,
        materialName: inputProd?.name || 'Input Material',
        type,
        reqQty,
        uom,
        stockQty,
        issueQty: reqQty,
        status,
      };
    });

    setMaterialsToIssue(items);
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

  const handleRefreshStock = async () => {
    try {
      setIsSubmitting(true);
      await fetchWO();
      setIssueSuccess('Inventory stock levels refreshed!');
      setTimeout(() => setIssueSuccess(null), 2500);
    } catch (err) {
      console.error(err);
    } fontally: {
      setIsSubmitting(false);
    }
  };

  const handleIssueMaterials = async () => {
    if (!selectedWO) return;

    try {
      setIsSubmitting(true);
      setIssueError(null);

      await workOrderService.issueMaterials(selectedWO.id, {
        batchNo,
        location,
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
        navigate('/packing-erp/material-issue');
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
          onClick={() => navigate('/packing-erp/material-issue')}
          className="mt-4 px-4 py-2 bg-[#00891D] text-white rounded-lg text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const rawCount =
    selectedWO.recipe?.items?.filter((i) => !i.isPackaging).length || 0;
  const pkgCount =
    selectedWO.recipe?.items?.filter((i) => i.isPackaging).length || 0;

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
            onClick={() => navigate('/packing-erp/material-issue')}
          >
            Material Issue Queue &gt; {selectedWO.woNumber}
          </p>
        </div>
        <button
          onClick={() => navigate('/packing-erp/material-issue')}
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
          {/* Work Order Context */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Package size={16} className="text-[#00891D]" />
              Work Order Context
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
                  Output Product
                </span>
                <span className="text-slate-800 dark:text-white font-bold block mt-0.5 truncate max-w-[130px]">
                  {selectedWO.product?.name || selectedWO.productId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                  Required Qty
                </span>
                <span className="text-slate-800 dark:text-white font-bold font-mono block mt-0.5">
                  {selectedWO.requiredQty} {selectedWO.product?.unit || 'Units'}
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

          {/* Product BOM Context */}
          <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <RefreshCw size={16} className="text-blue-500" />
              Product BOM Context
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                  Active BOM
                </span>
                <span className="text-slate-800 dark:text-white font-bold block mt-0.5">
                  {selectedWO.recipe?.code || selectedWO.recipeId} -{' '}
                  {selectedWO.recipe?.name}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-gray-700 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                    Raw Materials
                  </span>
                  <span className="text-slate-700 dark:text-gray-300 font-bold block mt-0.5">
                    {rawCount} items
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                    Packaging
                  </span>
                  <span className="text-slate-700 dark:text-gray-300 font-bold block mt-0.5">
                    {pkgCount} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stock Feasibility Banner */}
          <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs flex flex-col justify-center">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-full ${
                  hasNoMaterials
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    : allAvailable
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                {hasNoMaterials ? (
                  <X size={24} />
                ) : allAvailable ? (
                  <CheckCircle size={24} />
                ) : (
                  <AlertTriangle size={24} />
                )}
              </div>
              <div>
                <h3
                  className={`text-base font-bold ${
                    hasNoMaterials
                      ? 'text-rose-700 dark:text-rose-400'
                      : allAvailable
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {hasNoMaterials
                    ? 'No BOM Materials Defined'
                    : allAvailable
                    ? 'All Materials Available'
                    : 'Shortage Detected'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  {hasNoMaterials
                    ? 'Please configure raw materials and packaging in Product BOM.'
                    : allAvailable
                    ? 'Sufficient inventory is available for material issuance.'
                    : 'Some required materials fall below the requested quantity.'}
                </p>
              </div>
            </div>
          </div>
        </div>

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
              <button
                onClick={handleRefreshStock}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  size={12}
                  className={isSubmitting ? 'animate-spin' : ''}
                />
                <span>Refresh Stock</span>
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 dark:border-gray-700 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-slate-50 dark:bg-gray-900 dark:text-white font-mono"
                placeholder="Enter batch number..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                Storage / Warehouse Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-slate-50 dark:bg-gray-900 dark:text-white"
              >
                <option value="" className="dark:bg-gray-800">
                  Select Warehouse Location...
                </option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id} className="dark:bg-gray-800">
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-gray-700/50 text-slate-500 dark:text-gray-400 uppercase text-[10px] border-b border-slate-200 dark:border-gray-700 font-bold">
                <tr>
                  <th className="px-4 py-3">Item Code</th>
                  <th className="px-4 py-3">Material Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-center">Req Qty</th>
                  <th className="px-4 py-3 text-center">UOM</th>
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
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            mat.type === 'PACKAGING'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {mat.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white">
                        {mat.reqQty}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-gray-300">
                        {mat.uom}
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
                {hasNoMaterials && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500 dark:text-gray-400 font-medium"
                    >
                      No BOM Materials Defined.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-gray-800/50 border-t border-slate-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <CornerUpLeft size={14} />
                <span>Return Material</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <ArrowLeftRight size={14} />
                <span>Transfer</span>
              </button>
            </div>

            <button
              onClick={handleIssueMaterials}
              disabled={isSubmitting || !allAvailable || hasNoMaterials}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${
                isSubmitting || !allAvailable || hasNoMaterials
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
                {selectedWO.status === 'MATERIAL_ISSUED'
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
