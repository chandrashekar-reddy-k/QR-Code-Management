import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  Search,
  RefreshCw,
  X,
  Eye,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Users,
  PackageOpen,
  Save,
  ArrowRight
} from 'lucide-react';
import { repackingService, RepackingLog, PendingRepackWorkOrder } from '../../../api/packing/repackingService';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

interface UnifiedRow {
  _type: 'FAILED' | 'REPACKING';
  id: string;
  rpId?: string;
  rpNumber?: string;
  woId: string;
  woNumber: string;
  productName: string;
  sku: string;
  batchNumber: string;
  newBatchNumber?: string;
  packedQty: number;
  failedQty: number;
  recoverableQty?: number;
  wasteQty?: number;
  failureReason: string;
  assignedOperator: string;
  operatorId?: string;
  priority: string;
  repackStatus: string;
  requiresRelabeling: boolean;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  remarks?: string;
  checksState?: Record<string, any>;
  rawWO?: PendingRepackWorkOrder;
  rawRP?: RepackingLog;
}

export const PackingRepacking: React.FC = () => {
  const [repackWOs, setRepackWOs] = useState<PendingRepackWorkOrder[]>([]);
  const [repackLogs, setRepackLogs] = useState<RepackingLog[]>([]);
  const [operators, setOperators] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  // Start Repacking Modal
  const [selectedStartWO, setSelectedStartWO] = useState<UnifiedRow | null>(null);
  const [startOperatorId, setStartOperatorId] = useState('');
  const [startRemarks, setStartRemarks] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Update Progress Modal
  const [selectedUpdateRP, setSelectedUpdateRP] = useState<UnifiedRow | null>(null);
  const [updateRecoverableQty, setUpdateRecoverableQty] = useState(0);
  const [updateWasteQty, setUpdateWasteQty] = useState(0);
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [requiresRelabeling, setRequiresRelabeling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // View Details Modal
  const [selectedViewRow, setSelectedViewRow] = useState<UnifiedRow | null>(null);

  // ─── Data Loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [woRes, rpRes, opRes] = await Promise.all([
        repackingService.getPendingRepackWorkOrders(),
        repackingService.getRepackingLogs(),
        repackingService.getOperators(),
      ]);
      setRepackWOs(woRes || []);
      setRepackLogs(rpRes.data || []);
      setOperators(opRes || []);
    } catch (err) {
      console.error('Failed to load repacking data:', err);
      toast.error('Failed to load repacking data.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const failed = repackWOs.filter((w) => w.status === 'QC_FAILED').length;
    const pending = repackWOs.filter((w) => w.status === 'REPACKING_PENDING').length;
    const inProgress = repackWOs.filter((w) => w.status === 'REPACKING_IN_PROGRESS').length;
    const completed = repackWOs.filter((w) => w.status === 'REPACKING_COMPLETED').length;
    return { failed, pending, inProgress, completed };
  }, [repackWOs]);

  // ─── Unified Rows ─────────────────────────────────────────────────────────
  const unifiedRows = useMemo<UnifiedRow[]>(() => {
    return repackWOs.map((wo) => {
      const matchingRP = repackLogs.find((rp) => rp.sourceWoId === wo.id);
      const latestQC = (wo as any).qualityChecks?.[0] || null;
      const failedQty = wo.actualProduced || wo.requiredQty;
      const checksState = latestQC?.checksPayload?.checksState;

      return {
        _type: (matchingRP ? 'REPACKING' : 'FAILED') as 'REPACKING' | 'FAILED',
        id: matchingRP ? matchingRP.id : `FAILED-${wo.id}`,
        rpId: matchingRP?.id,
        rpNumber: matchingRP?.rpNumber,
        woId: wo.id,
        woNumber: wo.woNumber,
        productName: wo.product?.name || 'Product',
        sku: wo.product?.sku || 'N/A',
        batchNumber: wo.batchNumber || 'N/A',
        newBatchNumber: matchingRP?.newBatchNumber,
        packedQty: failedQty,
        failedQty,
        recoverableQty: matchingRP?.recoverableQty,
        wasteQty: matchingRP?.wasteQty,
        failureReason: latestQC?.failureReason || latestQC?.remarks || 'QC Failure',
        assignedOperator: matchingRP?.operatorId
          ? operators.find((o) => o.id === matchingRP.operatorId)?.name || matchingRP.operatorId
          : wo.operator?.name || 'Unassigned',
        operatorId: matchingRP?.operatorId || wo.operator?.id,
        priority: wo.priority,
        repackStatus: wo.status,
        requiresRelabeling: matchingRP?.requiresRelabeling || false,
        startedAt: matchingRP?.startedAt,
        completedAt: matchingRP?.completedAt,
        updatedAt: wo.updatedAt,
        remarks: matchingRP?.remarks,
        checksState,
        rawWO: wo,
        rawRP: matchingRP,
      };
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [repackWOs, repackLogs, operators]);

  // ─── Filtered Rows ────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      if (filterStatus && r.repackStatus !== filterStatus) return false;
      if (filterPriority && r.priority !== filterPriority) return false;
      if (filterProduct && !r.productName.toLowerCase().includes(filterProduct.toLowerCase())) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !r.woNumber.toLowerCase().includes(s) &&
          !r.productName.toLowerCase().includes(s) &&
          !r.batchNumber.toLowerCase().includes(s) &&
          !r.assignedOperator.toLowerCase().includes(s) &&
          !(r.rpNumber || '').toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [unifiedRows, filterStatus, filterPriority, filterProduct, search]);

  // ─── Quantity Validation ─────────────────────────────────────────────────
  const validateQty = (recoverableQty: number, wasteQty: number, failedQty: number): string | null => {
    if (recoverableQty < 0) return 'Recoverable quantity cannot be negative.';
    if (wasteQty < 0) return 'Wastage quantity cannot be negative.';
    if (recoverableQty + wasteQty > failedQty) {
      return `Recoverable (${recoverableQty}) + Wastage (${wasteQty}) = ${recoverableQty + wasteQty} exceeds Failed Qty (${failedQty}).`;
    }
    return null;
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleStartRepacking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStartWO) return;

    try {
      setIsStarting(true);
      await repackingService.startRepacking({
        sourceWoId: selectedStartWO.woId,
        operatorId: startOperatorId || undefined,
        remarks: startRemarks || undefined,
      });
      toast.success(`Repacking started for Work Order #${selectedStartWO.woNumber}.`);
      setSelectedStartWO(null);
      setStartOperatorId('');
      setStartRemarks('');
      loadData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start repacking.');
    } finally {
      setIsStarting(false);
    }
  };

  const openUpdateModal = (row: UnifiedRow) => {
    setSelectedUpdateRP(row);
    setUpdateRecoverableQty(row.recoverableQty ?? row.failedQty);
    setUpdateWasteQty(row.wasteQty ?? 0);
    setUpdateRemarks(row.remarks || '');
    setRequiresRelabeling(row.requiresRelabeling);
    setIsCompleting(false);
  };

  const handleUpdateRepacking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpdateRP?.rpId) return;

    const validationError = validateQty(updateRecoverableQty, updateWasteQty, selectedUpdateRP.failedQty);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsUpdating(true);

      if (isCompleting) {
        await repackingService.completeRepacking(selectedUpdateRP.rpId, {
          recoverableQty: updateRecoverableQty,
          wasteQty: updateWasteQty,
          remarks: updateRemarks,
          requiresRelabeling,
        });

        if (requiresRelabeling) {
          toast.success(`Repacking completed. Work Order #${selectedUpdateRP.woNumber} → Barcodes & Labels for new label printing. After labels are applied → QC re-inspection.`);
        } else {
          toast.success(`Repacking completed. Work Order #${selectedUpdateRP.woNumber} → QC_PENDING. QC Checker can now inspect the repacked batch.`);
        }
      } else {
        await repackingService.updateRepacking(selectedUpdateRP.rpId, {
          recoverableQty: updateRecoverableQty,
          wasteQty: updateWasteQty,
          remarks: updateRemarks,
          requiresRelabeling,
        });
        toast.success('Repacking progress saved to database.');
      }

      setSelectedUpdateRP(null);
      loadData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update repacking.');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'QC_FAILED':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <XCircle size={12} /> QC Failed
          </span>
        );
      case 'REPACKING_PENDING':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <Clock size={12} /> Repacking Pending
          </span>
        );
      case 'REPACKING_IN_PROGRESS':
        return (
          <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Repacking In Progress
          </span>
        );
      case 'REPACKING_COMPLETED':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <CheckCircle size={12} /> Repacking Completed
          </span>
        );
      default:
        return (
          <span className="bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-bold w-fit">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="text-orange-600" size={28} />
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Repacking Management</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Manage QC-failed batches through rework — all progress persists in backend database
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          className="flex items-center gap-2 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-600 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="p-2.5 w-fit rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-100 mb-3">
            <XCircle size={20} />
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white">{kpis.failed}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">QC Failed</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="p-2.5 w-fit rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-100 mb-3">
            <Clock size={20} />
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white">{kpis.pending}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Repacking Pending</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="p-2.5 w-fit rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 border border-orange-100 mb-3">
            <PackageOpen size={20} />
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white">{kpis.inProgress}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">In Progress</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="p-2.5 w-fit rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100 mb-3">
            <CheckCircle size={20} />
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white">{kpis.completed}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Completed</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by WO No, Product, Batch, Operator, RP No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl"
            >
              <option value="">All Statuses</option>
              <option value="QC_FAILED">QC Failed</option>
              <option value="REPACKING_PENDING">Repacking Pending</option>
              <option value="REPACKING_IN_PROGRESS">Repacking In Progress</option>
              <option value="REPACKING_COMPLETED">Repacking Completed</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <input
              type="text"
              placeholder="Filter by Product..."
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* REPACKING QUEUE TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/50">
          <h2 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
            Repacking Workstation Queue ({filteredRows.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <RotateCcw size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-bold text-sm">No Repacking records found matching criteria.</p>
            <p className="text-xs text-gray-400 mt-1">Only QC_FAILED batches and active repacking jobs appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">QC Failed Qty</th>
                  <th className="py-3 px-4">Recoverable Qty</th>
                  <th className="py-3 px-4">Wastage</th>
                  <th className="py-3 px-4">Failure Reason</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/50 transition-colors text-gray-800 dark:text-gray-200">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                      {row.woNumber}
                      {row.rpNumber && <div className="text-[10px] text-orange-500 font-mono">{row.rpNumber}</div>}
                    </td>

                    <td className="py-3 px-4 font-semibold">
                      <div>{row.productName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">SKU: {row.sku}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                      <div>{row.batchNumber}</div>
                      {row.newBatchNumber && (
                        <div className="text-[10px] text-orange-500 font-mono">New: {row.newBatchNumber}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-bold text-rose-600 font-mono">
                      {row.failedQty} units
                    </td>

                    <td className="py-3 px-4 font-bold text-green-600 font-mono">
                      {row.recoverableQty !== undefined ? `${row.recoverableQty} units` : '—'}
                    </td>

                    <td className="py-3 px-4 font-bold text-gray-500 font-mono">
                      {row.wasteQty !== undefined ? `${row.wasteQty} units` : '—'}
                    </td>

                    <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300 max-w-[160px] truncate">
                      {row.failureReason}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Users size={14} className="text-gray-400" />
                        <span className={row.assignedOperator === 'Unassigned' ? 'text-gray-400 italic' : ''}>
                          {row.assignedOperator}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        row.priority === 'URGENT' || row.priority === 'HIGH'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {row.priority}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {renderStatusBadge(row.repackStatus)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(row.repackStatus === 'QC_FAILED' || row.repackStatus === 'REPACKING_PENDING') && (
                          <button
                            onClick={() => setSelectedStartWO(row)}
                            className="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Play size={13} /> Start
                          </button>
                        )}

                        {row.repackStatus === 'REPACKING_IN_PROGRESS' && row.rpId && (
                          <button
                            onClick={() => openUpdateModal(row)}
                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Save size={13} /> Update
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedViewRow(row)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-slate-200 font-bold border border-gray-200 dark:border-gray-600 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* START REPACKING MODAL */}
      {selectedStartWO && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-xs uppercase">
                  Start Repacking — {selectedStartWO.woNumber}
                </h3>
                <p className="text-[10px] text-rose-600 font-bold">
                  Failed Batch: {selectedStartWO.batchNumber} | Failed Qty: {selectedStartWO.failedQty} units
                </p>
              </div>
              <button onClick={() => setSelectedStartWO(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartRepacking} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl space-y-1">
                <p className="font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> QC Failure Reason
                </p>
                <p className="text-rose-900 dark:text-rose-300 font-medium">{selectedStartWO.failureReason}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assign Repacking Operator</label>
                <select
                  value={startOperatorId}
                  onChange={(e) => setStartOperatorId(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-bold text-xs"
                >
                  <option value="">-- Select Operator --</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name} ({op.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Initial Remarks</label>
                <textarea
                  value={startRemarks}
                  onChange={(e) => setStartRemarks(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-medium text-xs h-16 resize-none"
                  placeholder="Reason for repacking, notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedStartWO(null)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isStarting} className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer disabled:opacity-50">
                  {isStarting ? 'Starting...' : 'Start Repacking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE / COMPLETE REPACKING MODAL */}
      {selectedUpdateRP && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900 sticky top-0 z-10">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-xs uppercase">
                  {isCompleting ? 'Complete Repacking' : 'Update Repacking Progress'} — {selectedUpdateRP.woNumber}
                </h3>
                <p className="text-[10px] text-orange-600 font-bold">{selectedUpdateRP.rpNumber} | Failed Qty: {selectedUpdateRP.failedQty} units</p>
              </div>
              <button onClick={() => setSelectedUpdateRP(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateRepacking} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Recoverable Qty *</label>
                  <input
                    type="number"
                    value={updateRecoverableQty}
                    onChange={(e) => setUpdateRecoverableQty(Number(e.target.value))}
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-mono font-bold text-green-600 text-xs"
                    min={0}
                    max={selectedUpdateRP.failedQty}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Wastage Qty *</label>
                  <input
                    type="number"
                    value={updateWasteQty}
                    onChange={(e) => setUpdateWasteQty(Number(e.target.value))}
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-mono font-bold text-rose-600 text-xs"
                    min={0}
                    required
                  />
                </div>
              </div>

              {/* Quantity validation indicator */}
              {(() => {
                const total = updateRecoverableQty + updateWasteQty;
                const exceeds = total > selectedUpdateRP.failedQty;
                return (
                  <div className={`p-3 rounded-xl text-xs font-bold border ${exceeds ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    Total: {total} / {selectedUpdateRP.failedQty} units
                    {exceeds && ' — ⚠ Exceeds Failed Qty! Reduce Recoverable or Wastage.'}
                  </div>
                );
              })()}

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Repacking Remarks</label>
                <textarea
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-medium text-xs h-16 resize-none"
                  placeholder="Rework details, issues, notes..."
                />
              </div>

              {/* Relabeling decision */}
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={requiresRelabeling}
                    onChange={(e) => setRequiresRelabeling(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Requires Re-labeling / New Barcode
                </label>
                <p className="text-[10px] text-gray-500 mt-1 ml-6">
                  {requiresRelabeling
                    ? '✓ Relabeling path: REPACKING_COMPLETED → Barcodes & Labels → Label Application → LABELS_APPLIED → QC_PENDING'
                    : '✓ No relabeling: REPACKING_COMPLETED → QC_PENDING (direct, no labels needed)'}
                </p>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 dark:text-gray-200 text-xs">
                  <input
                    type="checkbox"
                    checked={isCompleting}
                    onChange={(e) => setIsCompleting(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Mark as Repacking Completed (return to QC)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedUpdateRP(null)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || (updateRecoverableQty + updateWasteQty > selectedUpdateRP.failedQty)}
                  className={`px-5 py-2 rounded-xl text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${isCompleting ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isUpdating ? (isCompleting ? 'Completing...' : 'Saving...') : (
                    isCompleting ? <><ArrowRight size={14} /> Complete & Return to QC</> : <><Save size={14} /> Save Progress</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedViewRow && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900 sticky top-0 z-10">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-sm">
                  Repacking Audit Record — {selectedViewRow.rpNumber || selectedViewRow.woNumber}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono">Work Order: {selectedViewRow.woNumber}</p>
              </div>
              <button onClick={() => setSelectedViewRow(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">Product</span><p className="font-bold text-gray-900 dark:text-white">{selectedViewRow.productName}</p></div>
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">Original Batch</span><p className="font-mono font-bold text-gray-900 dark:text-white">{selectedViewRow.batchNumber}</p></div>
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">New Batch</span><p className="font-mono font-bold text-orange-600">{selectedViewRow.newBatchNumber || '—'}</p></div>
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">QC Failed Qty</span><p className="font-mono font-bold text-rose-600">{selectedViewRow.failedQty} units</p></div>
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">Recoverable Qty</span><p className="font-mono font-bold text-green-600">{selectedViewRow.recoverableQty ?? '—'}</p></div>
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">Wastage Qty</span><p className="font-mono font-bold text-gray-600">{selectedViewRow.wasteQty ?? '—'}</p></div>
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">Assigned Operator</span><p className="font-bold text-gray-900 dark:text-white">{selectedViewRow.assignedOperator}</p></div>
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">Started At</span><p className="font-mono text-gray-700 dark:text-gray-300">{fmtDate(selectedViewRow.startedAt)}</p></div>
                <div><span className="text-[10px] font-bold text-gray-400 uppercase">Completed At</span><p className="font-mono text-gray-700 dark:text-gray-300">{fmtDate(selectedViewRow.completedAt)}</p></div>
                <div className="col-span-2"><span className="text-[10px] font-bold text-gray-400 uppercase">QC Failure Reason</span><p className="font-medium text-rose-700 dark:text-rose-400">{selectedViewRow.failureReason}</p></div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Requires Relabeling</span>
                  <p className={`font-bold ${selectedViewRow.requiresRelabeling ? 'text-orange-600' : 'text-green-600'}`}>
                    {selectedViewRow.requiresRelabeling ? 'Yes — New label/barcode required' : 'No — Labels unchanged'}
                  </p>
                </div>
              </div>

              {selectedViewRow.remarks && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Repacking Remarks</span>
                  <div className="p-3 bg-slate-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                    {selectedViewRow.remarks}
                  </div>
                </div>
              )}

              {selectedViewRow.repackStatus === 'REPACKING_COMPLETED' && (
                <div className={`p-3 rounded-xl font-bold text-xs ${selectedViewRow.requiresRelabeling ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                  {selectedViewRow.requiresRelabeling ? (
                    <>
                      ⚠ Relabeling Required — Work Order is now in <strong>Barcodes &amp; Labels</strong> queue.
                      <br />
                      <span className="font-medium text-[11px]">
                        Next steps: Admin prints replacement labels → Operator applies labels → LABELS_APPLIED → QC_PENDING → QC re-inspection.
                      </span>
                      <br />
                      <span className="font-medium text-[11px]">New Batch: <span className="font-mono">{selectedViewRow.newBatchNumber || '—'}</span></span>
                    </>
                  ) : (
                    <>
                      ✓ Repacking completed. Work Order returned directly to <strong>QC_PENDING</strong> for re-inspection by QC Checker.
                      <br />
                      <span className="font-medium text-[11px]">No relabeling required — original label data unchanged.</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setSelectedViewRow(null)} className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs">
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingRepacking;
