import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Loader2,
  Scissors,
  RefreshCw,
} from 'lucide-react';
import { repackingService, RepackingLog, PendingRepackWorkOrder } from '../../../api/packing/repackingService';
import { workOrderService } from '../../../api/packing/workOrderService';
import ViewIconButton from '../../../components/ui/Button/ViewIconButton';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const PRIORITY_LABEL: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' };
const PRIORITY_COLOR = (p: string) =>
  p === 'HIGH' || p === 'URGENT'
    ? 'text-red-600 dark:text-red-400 font-bold'
    : p === 'MEDIUM'
    ? 'text-yellow-600 dark:text-yellow-400 font-semibold'
    : 'text-gray-500 dark:text-gray-400';

const STATUS_BADGE: Record<string, string> = {
  'Pending Repack': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  Repacked: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  Failed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
};

const STATUS_DOT: Record<string, string> = {
  'Pending Repack': 'bg-amber-400',
  Repacked: 'bg-emerald-500',
  Failed: 'bg-rose-500',
};

interface TableRow {
  _type: 'PENDING' | 'COMPLETED';
  id: string;
  woId: string;
  woNumber: string;
  productName: string;
  batchNumber: string;
  repackTime: string;
  assignedTo: string;
  displayStatus: string;
  priority: string;
  recoverableQty: number;
  wasteQty: number;
  rawRP?: RepackingLog;
  rawWO?: PendingRepackWorkOrder;
}

const REPACK_TYPES = [
  'Damaged Pack → New Pack',
  'Large Pack → Small Packs',
  'Combo Creation',
  'Gift Kit',
  'Festival Kit',
  'Customer Return → Repack',
];

export const PackingRepacking: React.FC = () => {
  const [pendingWOs, setPendingWOs] = useState<PendingRepackWorkOrder[]>([]);
  const [completedRPs, setCompletedRPs] = useState<RepackingLog[]>([]);
  const [operators, setOperators] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [search] = useState('');
  const [filterStatus] = useState('');
  const [filterOperator] = useState('');
  const [filterPriority] = useState('');
  const [filterBatch] = useState('');
  const [filterWO] = useState('');
  const [filterProduct] = useState('');

  // Modals
  const [selectedRP, setSelectedRP] = useState<RepackingLog | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<PendingRepackWorkOrder | null>(null);

  // Row-level Assign Repacking Modal state
  const [assignModalWO, setAssignModalWO] = useState<PendingRepackWorkOrder | null>(null);
  const [assignModalOperatorId, setAssignModalOperatorId] = useState('');
  const [assignModalPriority, setAssignModalPriority] = useState<string>('HIGH');
  const [assignModalLoading, setAssignModalLoading] = useState(false);

  // Form fields
  const [formSourceBatch, setFormSourceBatch] = useState('');
  const [formRepackType, setFormRepackType] = useState(REPACK_TYPES[0]);
  const [formRecoveredQty, setFormRecoveredQty] = useState(0);
  const [formWasteQty, setFormWasteQty] = useState(0);
  const [formSignature, setFormSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [woRes, rpRes, userRes] = await Promise.all([
        repackingService.getPendingRepackWorkOrders(),
        repackingService.getRepackingLogs(),
        repackingService.getOperators(),
      ]);
      setPendingWOs(woRes || []);
      setCompletedRPs(rpRes.data || []);
      setOperators(userRes || []);
    } catch (err) {
      console.error('Failed to load Repacking data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshKey]);

  // KPIs
  const todayStr = new Date().toDateString();
  const repackedToday = useMemo(
    () => completedRPs.filter((rp) => new Date(rp.createdAt).toDateString() === todayStr).length,
    [completedRPs, todayStr]
  );
  const totalRecovered = useMemo(
    () => completedRPs.reduce((acc, rp) => acc + (rp.recoverableQty || 0), 0),
    [completedRPs]
  );
  const totalWaste = useMemo(
    () => completedRPs.reduce((acc, rp) => acc + (rp.wasteQty || 0), 0),
    [completedRPs]
  );

  // Row-level Modal Task Assignment
  const openAssignModal = (wo: PendingRepackWorkOrder) => {
    setAssignModalWO(wo);
    setAssignModalOperatorId((wo as any).operatorId || wo.operator?.id || '');
    setAssignModalPriority(wo.priority || 'HIGH');
  };

  const handleConfirmAssignModal = async () => {
    if (!assignModalWO || !assignModalOperatorId) {
      toast.error('Please select a Team Member.');
      return;
    }
    try {
      setAssignModalLoading(true);
      await workOrderService.updateWorkOrderStatus(assignModalWO.id, 'REPACKING_IN_PROGRESS', {
        operatorId: assignModalOperatorId,
        priority: assignModalPriority,
      });
      const assignedUser = operators.find((o) => o.id === assignModalOperatorId);
      toast.success(`Repacking task for ${assignModalWO.woNumber} assigned to ${assignedUser?.name || 'Team Member'}.`);
      setAssignModalWO(null);
      loadAll();
    } catch (err: any) {
      console.error('Failed to assign task', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to assign repacking task');
    } finally {
      setAssignModalLoading(false);
    }
  };

  // Unified Table Rows
  const unifiedData = useMemo<TableRow[]>(() => {
    const rows: TableRow[] = [];
    pendingWOs.forEach((wo) =>
      rows.push({
        _type: 'PENDING',
        id: `PENDING-${wo.id}`,
        woId: wo.id,
        woNumber: wo.woNumber,
        productName: wo.product?.name ?? '—',
        batchNumber: wo.batchNumber || (wo as any).batchNo || (wo.woNumber ? `BATCH-${wo.woNumber}` : '—'),
        repackTime: wo.updatedAt,
        assignedTo: (wo as any).operator?.name ?? (wo as any).supervisor?.name ?? (wo as any).inspector?.name ?? 'Unassigned',
        displayStatus: 'Pending Repack',
        priority: wo.priority,
        recoverableQty: 0,
        wasteQty: 0,
        rawWO: wo,
      })
    );
    completedRPs.forEach((rp) =>
      rows.push({
        _type: 'COMPLETED',
        id: rp.id,
        woId: rp.sourceWoId,
        woNumber: rp.sourceWorkOrder?.woNumber ?? '—',
        productName: rp.sourceWorkOrder?.product?.name ?? '—',
        batchNumber: (rp as any).newBatchNumber || rp.sourceWorkOrder?.batchNumber || (rp.sourceWorkOrder?.woNumber ? `BATCH-${rp.sourceWorkOrder.woNumber}` : '-'),
        repackTime: rp.createdAt,
        assignedTo: rp.loggedBy?.name ?? '—',
        displayStatus: 'Repacked',
        priority: rp.sourceWorkOrder?.priority ?? 'MEDIUM',
        recoverableQty: rp.recoverableQty,
        wasteQty: rp.wasteQty,
        rawRP: rp,
      })
    );
    return rows;
  }, [pendingWOs, completedRPs]);

  const filteredData = useMemo(() => {
    let d = unifiedData;
    if (filterStatus) {
      d = d.filter((r) =>
        filterStatus === 'PENDING'
          ? r._type === 'PENDING'
          : filterStatus === 'COMPLETED'
          ? r._type === 'COMPLETED'
          : r.displayStatus === filterStatus
      );
    }
    if (filterOperator) d = d.filter((r) => r.assignedTo === filterOperator);
    if (filterPriority) d = d.filter((r) => r.priority === filterPriority);
    if (filterBatch) d = d.filter((r) => r.batchNumber.toLowerCase().includes(filterBatch.toLowerCase()));
    if (filterWO) d = d.filter((r) => r.woNumber.toLowerCase().includes(filterWO.toLowerCase()));
    if (filterProduct) d = d.filter((r) => r.productName.toLowerCase().includes(filterProduct.toLowerCase()));
    if (search) {
      const t = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.productName.toLowerCase().includes(t) ||
          r.woNumber.toLowerCase().includes(t) ||
          r.batchNumber.toLowerCase().includes(t) ||
          r.assignedTo.toLowerCase().includes(t)
      );
    }
    return d;
  }, [unifiedData, filterStatus, filterOperator, filterPriority, filterBatch, filterWO, filterProduct, search]);

  // Form helpers
  const openForm = (wo: PendingRepackWorkOrder) => {
    setSelectedWO(wo);
    setFormSourceBatch(wo.batchNumber ?? `BATCH-${wo.woNumber.split('-').pop()}`);
    setFormRepackType(REPACK_TYPES[0]);
    setFormRecoveredQty(Math.max(1, wo.actualRejected ?? Math.round(wo.requiredQty * 0.5)));
    setFormWasteQty(0);
    setFormSignature('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;
    setSubmitting(true);
    try {
      await repackingService.logRepacking({
        sourceWoId: selectedWO.id,
        repackType: formRepackType,
        recoverableQty: formRecoveredQty,
        wasteQty: formWasteQty,
      });
      setIsFormOpen(false);
      setSelectedWO(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit repacking log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full px-2 md:px-4 pb-6 text-left">
      {/* Header */}
      <div className="mb-4 mt-3 flex justify-between items-center sm:items-end flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Repacking & Rework</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Home &gt; <span className="text-orange-600 dark:text-orange-400 font-semibold">Repacking</span>
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedWO(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-1.5 bg-[#00891D] hover:bg-[#006b17] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
        >
          <Scissors size={16} /> New Repacking Log
        </button>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-5 max-w-full">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 truncate max-w-[100px]">
              Pending Repa...
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingWOs.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 truncate max-w-[100px]">
              Active Operat...
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{operators.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Total Repacked</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedRPs.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 truncate max-w-[100px]">
              Repacked Tod...
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{repackedToday}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 truncate max-w-[100px]">
              Yield Recover...
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRecovered}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Total Waste</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalWaste}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <Scissors size={20} />
          </div>
        </div>
      </div>



      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden mb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 dark:text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading repacking data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  {[
                    'PRODUCT / WORK ORDER',
                    'BATCH NO',
                    'DATE / TIME',
                    'ASSIGNED TO',
                    'RECOVERED',
                    'WASTE',
                    'STATUS',
                    'PRIORITY',
                    'ACTION',
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap ${
                        h === 'ACTION' || h === 'RECOVERED' || h === 'WASTE' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                      No repacking records found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 dark:text-white text-xs">{row.productName}</div>
                        <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500">{row.woNumber}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {row.batchNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{fmt(row.repackTime)}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                        {row.assignedTo}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {row._type === 'COMPLETED' ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {row.recoverableQty}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {row._type === 'COMPLETED' ? (
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{row.wasteQty}</span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                            STATUS_BADGE[row.displayStatus] ?? 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              STATUS_DOT[row.displayStatus] ?? 'bg-gray-400'
                            }`}
                          />
                          {row.displayStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[11px] ${PRIORITY_COLOR(row.priority)}`}>
                          {PRIORITY_LABEL[row.priority] ?? row.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {row._type === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => row.rawWO && openForm(row.rawWO)}
                              className="bg-[#00891D] hover:bg-[#006b17] text-white font-semibold px-3 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                            >
                              Start Repacking
                            </button>
                            <button
                              onClick={() => row.rawWO && openAssignModal(row.rawWO)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-semibold px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                              title="Assign Team Member to this repacking task"
                            >
                              Assign
                            </button>
                          </div>
                        ) : (
                          <ViewIconButton
                            onClick={() => row.rawRP && setSelectedRP(row.rawRP)}
                            title="View Details"
                          />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
            {filteredData.length} of {unifiedData.length} records &nbsp;·&nbsp;
            {pendingWOs.length} pending&nbsp;·&nbsp;{completedRPs.length} completed
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRP && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 w-full max-w-md shadow-2xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-gray-700 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-gray-500">
                  {selectedRP.rpNumber}
                </span>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  {selectedRP.sourceWorkOrder?.product?.name ?? '—'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRP(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-gray-900 p-3 rounded-lg border border-slate-100 dark:border-gray-700 text-gray-800 dark:text-gray-200">
              <div>
                <strong>Repack No:</strong> {selectedRP.rpNumber}
              </div>
              <div>
                <strong>Work Order:</strong> {selectedRP.sourceWorkOrder?.woNumber ?? '—'}
              </div>
              <div>
                <strong>Operator:</strong> {selectedRP.loggedBy?.name ?? '—'}
              </div>
              <div>
                <strong>Date:</strong> {fmt(selectedRP.createdAt)}
              </div>
              <div>
                <strong>Source Batch:</strong> {selectedRP.sourceWorkOrder?.batchNumber ?? '—'}
              </div>
              <div>
                <strong>New Batch:</strong> {selectedRP.newBatchNumber}
              </div>
              <div className="col-span-2 border-t border-slate-200 dark:border-gray-700 mt-1 pt-2">
                <strong>Repack Type:</strong> {selectedRP.repackType}
              </div>
              <div>
                <strong className="text-emerald-700 dark:text-emerald-400">Recovered Yield:</strong>{' '}
                {selectedRP.recoverableQty}
              </div>
              <div>
                <strong className="text-rose-700 dark:text-rose-400">Waste:</strong> {selectedRP.wasteQty}
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setSelectedRP(null)}
                className="bg-slate-800 dark:bg-gray-700 hover:bg-slate-900 dark:hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row-level Assign Repacking Task Modal */}
      {assignModalWO && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-md overflow-hidden text-left space-y-4">
            <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-indigo-950 text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users size={18} className="text-indigo-400" /> Assign Repacking Task
              </h3>
              <button
                onClick={() => setAssignModalWO(null)}
                className="p-1 rounded-lg hover:bg-indigo-900 text-indigo-300 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-2 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-gray-900 p-3.5 rounded-lg border border-slate-100 dark:border-gray-700 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {assignModalWO.woNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {assignModalWO.priority || 'MEDIUM'}
                  </span>
                </div>
                <div className="font-bold text-slate-800 dark:text-gray-100 text-sm truncate">
                  {assignModalWO.product?.name || 'Product'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Batch: <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{assignModalWO.batchNumber || (assignModalWO as any).batchNo || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Assign To (Team Member) *
                </label>
                <select
                  value={assignModalOperatorId}
                  onChange={(e) => setAssignModalOperatorId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">
                    {operators.length === 0 ? 'No team members found' : '-- Select Team Member --'}
                  </option>
                  {operators.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.email ? `(${u.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Priority
                </label>
                <select
                  value={assignModalPriority}
                  onChange={(e) => setAssignModalPriority(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-gray-900/50 border-t border-slate-100 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setAssignModalWO(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={assignModalLoading || !assignModalOperatorId}
                onClick={handleConfirmAssignModal}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {assignModalLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Users size={14} />
                )}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repack Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-slate-900 text-white rounded-t-xl sticky top-0 z-10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Scissors size={18} /> Repack & Rework Log
              </h3>
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setSelectedWO(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 flex-1 text-left text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Select Work Order *
                </label>
                <select
                  required
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                  value={selectedWO?.id ?? ''}
                  onChange={(e) => {
                    const wo = pendingWOs.find((w) => w.id === e.target.value);
                    if (wo) openForm(wo);
                  }}
                >
                  <option value="" className="dark:bg-gray-800">-- Choose Pending Rework Batch --</option>
                  {pendingWOs.map((w) => (
                    <option key={w.id} value={w.id} className="dark:bg-gray-800">
                      {w.woNumber} — {w.product?.name ?? 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWO && (
                <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">
                    Work Order Summary
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">WO Number</span>
                      <span className="font-bold text-slate-800 dark:text-white font-mono">{selectedWO.woNumber}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">Product</span>
                      <span className="font-bold text-slate-800 dark:text-white">{selectedWO.product?.name ?? '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">Source Batch</span>
                      <span className="font-bold text-slate-800 dark:text-white font-mono">{selectedWO.batchNumber ?? '—'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">Failed Qty (approx)</span>
                      <span className="font-bold text-slate-800 dark:text-white">{selectedWO.actualRejected ?? selectedWO.requiredQty} units</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Source Batch No
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-mono"
                    value={formSourceBatch}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Repack Type *
                  </label>
                  <select
                    required
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formRepackType}
                    onChange={(e) => setFormRepackType(e.target.value)}
                  >
                    {REPACK_TYPES.map((t) => (
                      <option key={t} value={t} className="dark:bg-gray-800">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                    Recovered Yield Qty *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="w-full p-2 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={formRecoveredQty}
                    onChange={(e) => setFormRecoveredQty(Number(e.target.value))}
                  />
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1">
                    Quantity successfully saved for repackaging.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-1">
                    Waste / Discard Qty *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="w-full p-2 border border-rose-200 dark:border-rose-800 rounded-lg text-sm font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    value={formWasteQty}
                    onChange={(e) => setFormWasteQty(Number(e.target.value))}
                  />
                  <p className="text-[9px] text-rose-600 dark:text-rose-400 mt-1">
                    Quantity permanently lost or discarded.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Operator Signature *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type your initials"
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                  value={formSignature}
                  onChange={(e) => setFormSignature(e.target.value)}
                />
              </div>

              <div className="border-t border-slate-100 dark:border-gray-700 pt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setSelectedWO(null);
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#00891D] hover:bg-[#006b17] text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? 'Logging...' : 'Submit Repack Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingRepacking;
