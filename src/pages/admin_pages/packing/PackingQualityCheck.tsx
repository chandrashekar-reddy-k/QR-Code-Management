import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  X,
  Clock,
  CheckCircle,
  Users,
  Search,
  Eye,
  UserPlus,
  PauseCircle,
  XCircle,
  RefreshCw,
  Check,
  PackageCheck
} from 'lucide-react';
import { qualityCheckService, QCRecord, PendingQCWorkOrder, QCUser } from '../../../api/packing/qualityCheckService';
import { workOrderService } from '../../../api/packing/workOrderService';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const ELIGIBLE_ADMIN_QC_STATUSES = [
  'LABELS_APPLIED',
  'QC_PENDING',
  'QC_STARTED',
  'QC_IN_PROGRESS',
  'QC_HOLD',
  'QC_PASSED',
  'QC_FAILED',
];

interface UnifiedRow {
  id: string;
  woId: string;
  woNumber: string;
  productName: string;
  sku: string;
  batchNumber: string;
  packedQty: number;
  assignedChecker: string;
  inspectorId?: string;
  status: string;
  priority: string;
  startedAt: string;
  updatedAt: string;
  result: 'PASS' | 'FAIL' | 'HOLD' | 'IN_PROGRESS' | 'PENDING';
  holdReason?: string;
  progressText?: string;
  checksState?: Record<string, any>;
  overallRemarks?: string;
  photoUrls?: string[];
  rawQC?: QCRecord;
  rawWO?: PendingQCWorkOrder;
}

export const PackingQualityCheck: React.FC = () => {
  const [pendingWOs, setPendingWOs] = useState<PendingQCWorkOrder[]>([]);
  const [completedQCs, setCompletedQCs] = useState<QCRecord[]>([]);
  const [inspectors, setInspectors] = useState<QCUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterInspector, setFilterInspector] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterResult, setFilterResult] = useState('');

  // Assignment Modal State
  const [selectedAssignWO, setSelectedAssignWO] = useState<PendingQCWorkOrder | null>(null);
  const [assignInspectorId, setAssignInspectorId] = useState('');
  const [assignPriority, setAssignPriority] = useState('HIGH');
  const [isAssigning, setIsAssigning] = useState(false);

  // View Inspection Modal State
  const [selectedRow, setSelectedRow] = useState<UnifiedRow | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // ─── Data Loading ───────────────────────────────────────────────────────────
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [woRes, qcRes, userRes] = await Promise.all([
        qualityCheckService.getPendingQCWorkOrders(),
        qualityCheckService.getQualityChecks(),
        qualityCheckService.getUsers(),
      ]);

      // Only show Work Orders that have completed Label Application
      const filteredWOs = (woRes || []).filter((wo) => ELIGIBLE_ADMIN_QC_STATUSES.includes(wo.status));
      setPendingWOs(filteredWOs);
      setCompletedQCs(qcRes.data || []);
      setInspectors(userRes || []);
    } catch (err) {
      console.error('Failed to load Quality Check admin data:', err);
      toast.error('Failed to load quality check records.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ─── KPIs Calculation ──────────────────────────────────────────────────────
  const todayStr = new Date().toDateString();

  const kpiStats = useMemo(() => {
    const pendingCount = pendingWOs.filter((w) => ['LABELS_APPLIED', 'QC_PENDING', 'QC_STARTED'].includes(w.status)).length;
    const inProgressCount = pendingWOs.filter((w) => w.status === 'QC_IN_PROGRESS').length;
    const onHoldCount = pendingWOs.filter((w) => w.status === 'QC_HOLD').length;

    const passedTodayCount = completedQCs.filter(
      (q) => new Date(q.createdAt).toDateString() === todayStr && (q.result === 'PASS' || q.result === 'PARTIAL_PASS')
    ).length;

    const failedTodayCount = completedQCs.filter(
      (q) => new Date(q.createdAt).toDateString() === todayStr && (q.result === 'REJECT' || q.result === 'DISCARD' || q.result === 'REWORK')
    ).length;

    const totalToday = completedQCs.filter((q) => new Date(q.createdAt).toDateString() === todayStr).length;

    return {
      pending: pendingCount,
      inProgress: inProgressCount,
      passedToday: passedTodayCount,
      failedToday: failedTodayCount,
      onHold: onHoldCount,
      totalToday,
    };
  }, [pendingWOs, completedQCs, todayStr]);

  // ─── Unified Data Rows ─────────────────────────────────────────────────────
  const unifiedRows = useMemo<UnifiedRow[]>(() => {
    const rows: UnifiedRow[] = [];

    // Map Work Orders currently in pending/active QC stages
    pendingWOs.forEach((wo) => {
      // Look for backend persisted quality check payload for active progress
      const matchingQC = completedQCs.find((q) => q.woId === wo.id);
      const payload: any = matchingQC?.checksPayload || {};

      let progressText = undefined;
      let checksStateMap: Record<string, any> | undefined = undefined;
      let overallRemarksStr = matchingQC?.remarks || payload?.overallRemarks || '';

      if (payload && payload.checksState) {
        checksStateMap = payload.checksState;
        const evaluated = Object.values(payload.checksState).filter((c: any) => c.status !== null).length;
        const total = Object.keys(payload.checksState).length;
        if (total > 0) {
          progressText = `${evaluated} / ${total} Checks Completed`;
        }
      }

      let res: UnifiedRow['result'] = 'PENDING';
      if (wo.status === 'QC_IN_PROGRESS') res = 'IN_PROGRESS';
      if (wo.status === 'QC_HOLD') res = 'HOLD';
      if (wo.status === 'QC_PASSED') res = 'PASS';
      if (wo.status === 'QC_FAILED') res = 'FAIL';

      rows.push({
        id: `WO-${wo.id}`,
        woId: wo.id,
        woNumber: wo.woNumber,
        productName: wo.product?.name || 'Assigned Product',
        sku: wo.product?.sku || 'N/A',
        batchNumber: wo.batchNumber || 'N/A',
        packedQty: wo.actualProduced || wo.requiredQty,
        assignedChecker: wo.inspector?.name || (wo as any).inspectorName || 'Unassigned',
        inspectorId: wo.inspector?.id,
        status: wo.status,
        priority: wo.priority || 'MEDIUM',
        startedAt: wo.startedAt || wo.createdAt,
        updatedAt: wo.updatedAt,
        result: res,
        holdReason: payload?.holdReason || matchingQC?.failureReason || 'Pending Resolution',
        progressText,
        checksState: checksStateMap,
        overallRemarks: overallRemarksStr,
        photoUrls: payload?.photos || [],
        rawWO: wo,
        rawQC: matchingQC,
      });
    });

    // Map completed Quality Check records that are no longer in pendingWOs
    completedQCs.forEach((qc) => {
      const existsInWO = rows.some((r) => r.woId === qc.woId);
      if (!existsInWO) {
        const isPass = qc.result === 'PASS' || qc.result === 'PARTIAL_PASS';
        const isHold = qc.result === 'HOLD';
        const isFail = qc.result === 'REJECT' || qc.result === 'DISCARD' || qc.result === 'REWORK';

        const payload: any = qc.checksPayload || {};
        let checksStateMap: Record<string, any> | undefined = undefined;
        let progressText = undefined;

        if (payload && payload.checksState) {
          checksStateMap = payload.checksState;
          const evaluated = Object.values(payload.checksState).filter((c: any) => c.status !== null).length;
          const total = Object.keys(payload.checksState).length;
          progressText = `${evaluated} / ${total} Checks Completed`;
        }

        rows.push({
          id: `QC-${qc.id}`,
          woId: qc.woId,
          woNumber: qc.workOrder?.woNumber || `WO-${qc.woId.substring(0, 6)}`,
          productName: qc.workOrder?.product?.name || 'Product',
          sku: qc.workOrder?.product?.sku || 'N/A',
          batchNumber: qc.workOrder?.batchNumber || 'N/A',
          packedQty: qc.checkedQty || qc.workOrder?.actualProduced || qc.workOrder?.requiredQty || 0,
          assignedChecker: qc.inspector?.name || 'Inspector',
          inspectorId: qc.inspectorId,
          status: isPass ? 'QC_PASSED' : isHold ? 'QC_HOLD' : isFail ? 'QC_FAILED' : 'QC_COMPLETED',
          priority: qc.workOrder?.priority || 'MEDIUM',
          startedAt: qc.createdAt,
          updatedAt: qc.updatedAt || qc.createdAt,
          result: isPass ? 'PASS' : isHold ? 'HOLD' : 'FAIL',
          holdReason: qc.failureReason || payload?.holdReason,
          progressText,
          checksState: checksStateMap,
          overallRemarks: qc.remarks || payload?.overallRemarks || '',
          photoUrls: payload?.photos || [],
          rawQC: qc,
        });
      }
    });

    // Sort by updatedAt desc
    return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [pendingWOs, completedQCs]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterInspector && r.assignedChecker !== filterInspector) return false;
      if (filterPriority && r.priority !== filterPriority) return false;
      if (filterResult && r.result !== filterResult) return false;

      if (search) {
        const s = search.toLowerCase();
        const matchesWo = r.woNumber.toLowerCase().includes(s);
        const matchesProd = r.productName.toLowerCase().includes(s);
        const matchesBatch = r.batchNumber.toLowerCase().includes(s);
        const matchesChecker = r.assignedChecker.toLowerCase().includes(s);
        if (!matchesWo && !matchesProd && !matchesBatch && !matchesChecker) return false;
      }
      return true;
    });
  }, [unifiedRows, filterStatus, filterInspector, filterPriority, filterResult, search]);

  // ─── QC Assignment Handler ─────────────────────────────────────────────────
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignWO || !assignInspectorId) return;

    try {
      setIsAssigning(true);
      await workOrderService.updateWorkOrderStatus(selectedAssignWO.id, 'QC_PENDING', {
        inspectorId: assignInspectorId,
        priority: assignPriority,
      });

      const assignedInspector = inspectors.find((i) => i.id === assignInspectorId);
      toast.success(`Work Order #${selectedAssignWO.woNumber} assigned to ${assignedInspector?.name || 'QC Inspector'}.`);
      setSelectedAssignWO(null);
      setAssignInspectorId('');
      loadData(false);
    } catch (err: any) {
      console.error('Failed to assign QC inspector:', err);
      toast.error(err?.response?.data?.message || 'Failed to assign inspector.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (row: UnifiedRow) => {
    switch (row.status) {
      case 'LABELS_APPLIED':
        return (
          <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Labels Applied
          </span>
        );
      case 'QC_PENDING':
        return (
          <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> QC Pending
          </span>
        );
      case 'QC_IN_PROGRESS':
        return (
          <div className="flex flex-col gap-1">
            <span className="bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> QC In Progress
            </span>
            {row.progressText && <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 ml-1">{row.progressText}</span>}
          </div>
        );
      case 'QC_HOLD':
        return (
          <span className="bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <PauseCircle size={12} /> QC Hold
          </span>
        );
      case 'QC_PASSED':
        return (
          <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <CheckCircle size={12} /> QC Passed
          </span>
        );
      case 'QC_FAILED':
        return (
          <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit">
            <XCircle size={12} /> QC Failed
          </span>
        );
      default:
        return (
          <span className="bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-bold w-fit">
            {row.status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-green-600" size={28} />
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Quality Check Management</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Monitor live QC inspections, assign inspectors, review checklist progress & handle exceptions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-2 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-600 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Pending QC */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-100">
              <Clock size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{kpiStats.pending}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Pending QC</p>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 border border-orange-100">
              <PackageCheck size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{kpiStats.inProgress}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">In Progress</p>
        </div>

        {/* Passed Today */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100">
              <CheckCircle size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{kpiStats.passedToday}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Passed Today</p>
        </div>

        {/* Failed Today */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-100">
              <XCircle size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{kpiStats.failedToday}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Failed Today</p>
        </div>

        {/* On Hold */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 border border-yellow-100">
              <PauseCircle size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{kpiStats.onHold}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">On Hold</p>
        </div>

        {/* Total Today */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
          <div className="flex justify-between items-start mb-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-100">
              <ShieldCheck size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{kpiStats.totalToday}</h3>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Total QC Today</p>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by WO No, Product, Batch, or Inspector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl"
            >
              <option value="">All Statuses</option>
              <option value="LABELS_APPLIED">Labels Applied</option>
              <option value="QC_PENDING">QC Pending</option>
              <option value="QC_IN_PROGRESS">QC In Progress</option>
              <option value="QC_HOLD">QC Hold</option>
              <option value="QC_PASSED">QC Passed</option>
              <option value="QC_FAILED">QC Failed</option>
            </select>

            {/* Inspector Filter */}
            <select
              value={filterInspector}
              onChange={(e) => setFilterInspector(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl"
            >
              <option value="">All Inspectors</option>
              {inspectors.map((insp) => (
                <option key={insp.id} value={insp.name}>
                  {insp.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
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

            {/* Result Filter */}
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold px-3 py-2 rounded-xl"
            >
              <option value="">All Results</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PASS">QC Passed</option>
              <option value="FAIL">QC Failed</option>
              <option value="HOLD">QC Hold</option>
            </select>
          </div>
        </div>
      </div>

      {/* QC QUEUE TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/50">
          <h2 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
            Quality Check Workstation Queue ({filteredRows.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <ShieldCheck size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-bold text-sm">No Quality Check records found matching criteria.</p>
            <p className="text-xs text-gray-400 mt-1">Ensure Work Orders have completed Label Application.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Packed Qty</th>
                  <th className="py-3 px-4">Assigned Checker</th>
                  <th className="py-3 px-4">Status & Progress</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                      {row.woNumber}
                    </td>

                    <td className="py-3 px-4 font-semibold">
                      <div>{row.productName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">SKU: {row.sku}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                      {row.batchNumber}
                    </td>

                    <td className="py-3 px-4 font-bold text-green-700 dark:text-green-400 font-mono">
                      {row.packedQty} units
                    </td>

                    <td className="py-3 px-4 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-gray-400" />
                        <span className={row.assignedChecker === 'Unassigned' ? 'text-gray-400 italic' : 'text-gray-800 dark:text-gray-200'}>
                          {row.assignedChecker}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {renderStatusBadge(row)}
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

                    <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                      {fmtDate(row.updatedAt)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {['LABELS_APPLIED', 'QC_PENDING'].includes(row.status) && row.rawWO && (
                          <button
                            onClick={() => {
                              setSelectedAssignWO(row.rawWO!);
                              setAssignInspectorId(row.inspectorId || '');
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold border border-blue-200 text-xs flex items-center gap-1 cursor-pointer"
                            title="Assign QC Checker"
                          >
                            <UserPlus size={14} /> Assign
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedRow(row)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-slate-200 font-bold border border-gray-200 dark:border-gray-600 text-xs flex items-center gap-1 cursor-pointer"
                          title="View Inspection Details"
                        >
                          <Eye size={14} /> View Details
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

      {/* ASSIGNMENT MODAL */}
      {selectedAssignWO && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-900 dark:text-white text-xs uppercase">
                Assign QC Checker — {selectedAssignWO.woNumber}
              </h3>
              <button onClick={() => setSelectedAssignWO(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Work Order Details</label>
                <div className="p-3 bg-slate-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1">
                  <p className="font-bold text-gray-800 dark:text-white">{selectedAssignWO.product?.name}</p>
                  <p className="text-gray-500 font-mono">Batch: {selectedAssignWO.batchNumber || 'N/A'}</p>
                  <p className="text-green-600 font-bold">Packed Qty: {selectedAssignWO.actualProduced || selectedAssignWO.requiredQty} units</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select QC Inspector *</label>
                <select
                  value={assignInspectorId}
                  onChange={(e) => setAssignInspectorId(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-bold text-xs"
                  required
                >
                  <option value="">-- Choose Inspector --</option>
                  {inspectors.map((insp) => (
                    <option key={insp.id} value={insp.id}>
                      {insp.name} ({insp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Priority</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 font-bold text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssignWO(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INSPECTION DETAILS MODAL */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900 sticky top-0 z-10">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-sm">
                  QC Inspection Record — {selectedRow.woNumber}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono">Work Order ID: {selectedRow.woId}</p>
              </div>
              <button onClick={() => setSelectedRow(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Product Name</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedRow.productName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Batch Number</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{selectedRow.batchNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Packed Quantity</span>
                  <p className="font-mono font-bold text-green-600">{selectedRow.packedQty} units</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">QC Inspector</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedRow.assignedChecker}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Workflow Status</span>
                  <div className="mt-0.5">{renderStatusBadge(selectedRow)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Priority</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedRow.priority}</p>
                </div>
              </div>

              {/* QC Hold Reason Alert */}
              {selectedRow.status === 'QC_HOLD' && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-xl space-y-1">
                  <h4 className="font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-1.5">
                    <PauseCircle size={16} /> QC Hold Notice
                  </h4>
                  <p className="text-xs text-yellow-900 dark:text-yellow-300 font-medium">
                    Reason: {selectedRow.holdReason || 'Inspection held pending further review or lab testing.'}
                  </p>
                  <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-medium">
                    Assigned Inspector: {selectedRow.assignedChecker}
                  </p>
                </div>
              )}

              {/* Workflow Result Banner */}
              <div className="p-4 rounded-xl border flex items-center justify-between bg-slate-50 dark:bg-gray-900">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Inspection Result</span>
                  <h4 className="text-base font-black text-gray-900 dark:text-white">
                    {selectedRow.result === 'PASS'
                      ? 'QC PASSED — Eligible for Finished Goods'
                      : selectedRow.result === 'FAIL'
                      ? 'QC FAILED — Eligible for Repacking'
                      : selectedRow.result === 'HOLD'
                      ? 'QC HOLD — Under Review'
                      : 'IN PROGRESS — Inspection Active'}
                  </h4>
                </div>
              </div>

              {/* Checklist Breakdown */}
              {selectedRow.checksState && (
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
                    Checklist Checkpoints Breakdown
                  </h4>
                  <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-slate-50 dark:bg-gray-900">
                    {Object.entries(selectedRow.checksState).map(([chkId, item]: [string, any]) => (
                      <div key={chkId} className="flex justify-between items-center p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div>
                          <span className="font-bold text-gray-800 dark:text-gray-200 capitalize">{chkId.replace('-', ' ')}</span>
                          {item.remarks && <p className="text-[10px] text-red-500 font-medium">{item.remarks}</p>}
                        </div>
                        <div>
                          {item.status === 'PASS' ? (
                            <span className="text-green-600 font-bold flex items-center gap-1 text-[11px]">
                              <Check size={14} /> PASS
                            </span>
                          ) : item.status === 'FAIL' ? (
                            <span className="text-red-600 font-bold flex items-center gap-1 text-[11px]">
                              <XCircle size={14} /> FAIL
                            </span>
                          ) : (
                            <span className="text-gray-400 font-bold text-[11px]">NOT EVALUATED</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Remarks */}
              {selectedRow.overallRemarks && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Overall Inspector Remarks</span>
                  <div className="p-3 bg-slate-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                    {selectedRow.overallRemarks}
                  </div>
                </div>
              )}

              {/* Evidence Photos */}
              {selectedRow.photoUrls && selectedRow.photoUrls.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Photo Evidence References</span>
                  <div className="flex gap-2">
                    {selectedRow.photoUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewPhoto(url)}
                        className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden cursor-pointer bg-gray-100"
                      >
                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setSelectedRow(null)}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW LIGHTBOX */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-2xl w-full">
            <button onClick={() => setPreviewPhoto(null)} className="absolute top-2 right-2 text-white bg-black/50 p-2 rounded-full">
              <X size={20} />
            </button>
            <img src={previewPhoto} alt="Evidence Full" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingQualityCheck;
