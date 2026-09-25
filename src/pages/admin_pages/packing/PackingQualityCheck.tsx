import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  X,
  Image as ImageIcon,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Search,
  Loader2,
  Package,
  RotateCcw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  qualityCheckService,
  QCRecord,
  PendingQCWorkOrder,
  QCUser,
} from '../../../api/packing/qualityCheckService';
import { workOrderService } from '../../../api/packing/workOrderService';
import ViewIconButton from '../../../components/ui/Button/ViewIconButton';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${d.getFullYear()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const RESULT_LABEL: Record<string, string> = {
  PASS: 'Passed',
  PARTIAL_PASS: 'Partial Pass',
  FAIL: 'Failed',
  REWORK: 'Rework',
  DISCARD: 'Discard',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};
const PRIORITY_COLOR = (p: string) =>
  p === 'HIGH' || p === 'URGENT'
    ? 'text-red-600 dark:text-red-400 font-bold'
    : p === 'MEDIUM'
    ? 'text-yellow-600 dark:text-yellow-400 font-semibold'
    : 'text-gray-500 dark:text-gray-400';

const STATUS_BADGE: Record<string, string> = {
  'QC Pending': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  'Labels Applied': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'Labels Printed': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  'Application Assigned': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  'Application In Progress': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  'Packing Completed': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  Passed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  'Partial Pass': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  Failed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  Rework: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  Discard: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
};

const STATUS_DOT: Record<string, string> = {
  'QC Pending': 'bg-amber-400',
  'Labels Applied': 'bg-blue-400',
  'Labels Printed': 'bg-indigo-400',
  'Application Assigned': 'bg-indigo-400',
  'Application In Progress': 'bg-indigo-400',
  'Packing Completed': 'bg-teal-400',
  Passed: 'bg-emerald-500',
  'Partial Pass': 'bg-emerald-400',
  Failed: 'bg-rose-500',
  Rework: 'bg-orange-400',
  Discard: 'bg-rose-500',
};

const RESULT_BADGE = (r: string) =>
  r === 'PASS' || r === 'PARTIAL_PASS'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    : r === 'FAIL' || r === 'DISCARD'
    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
    : r === 'REWORK'
    ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
    : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';

interface TableRow {
  _type: 'PENDING' | 'COMPLETED';
  id: string;
  woId: string;
  woNumber: string;
  productName: string;
  batchNumber: string;
  packedTime: string;
  packedBy: string;
  assignedTo: string;
  displayStatus: string;
  priority: string;
  rawQC?: QCRecord;
  rawWO?: PendingQCWorkOrder;
}

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

export const PackingQualityCheck: React.FC = () => {
  const [pendingWOs, setPendingWOs] = useState<PendingQCWorkOrder[]>([]);
  const [completedQCs, setCompletedQCs] = useState<QCRecord[]>([]);
  const [inspectors, setInspectors] = useState<QCUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterWO, setFilterWO] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [selectedQC, setSelectedQC] = useState<QCRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<PendingQCWorkOrder | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Row-level Assign Inspector Modal state
  const [assignModalWO, setAssignModalWO] = useState<PendingQCWorkOrder | null>(null);
  const [assignModalInspectorId, setAssignModalInspectorId] = useState('');
  const [assignModalPriority, setAssignModalPriority] = useState<string>('HIGH');
  const [assignModalLoading, setAssignModalLoading] = useState(false);

  // Form fields
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formCheckedQty, setFormCheckedQty] = useState<number | ''>('');
  const [formPackedQty, setFormPackedQty] = useState(0);
  const [formInspectionType, setFormInspectionType] = useState('Sampling Inspection');
  const [formResult, setFormResult] = useState('PASS');
  const [formSeverity, setFormSeverity] = useState('MINOR');
  const [formFailureReason, setFormFailureReason] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formPhotos, setFormPhotos] = useState<{ id: string; url: string; file: File }[]>([]);
  const [checks, setChecks] = useState({ ...DEFAULT_CHECKS });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [woRes, qcRes, userRes] = await Promise.all([
        qualityCheckService.getPendingQCWorkOrders(),
        qualityCheckService.getQualityChecks(),
        qualityCheckService.getUsers(),
      ]);
      setPendingWOs(woRes || []);
      setCompletedQCs(qcRes.data || []);
      setInspectors(userRes || []);
    } catch (err) {
      console.error('Failed to load QC data', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll(true);
    const interval = setInterval(() => loadAll(false), 5000);
    return () => clearInterval(interval);
  }, [loadAll, refreshKey]);

  // KPIs
  const todayStr = new Date().toDateString();
  const passedToday = useMemo(
    () =>
      completedQCs.filter(
        (q) =>
          new Date(q.createdAt).toDateString() === todayStr &&
          (q.result === 'PASS' || q.result === 'PARTIAL_PASS')
      ).length,
    [completedQCs, todayStr]
  );
  const failedToday = useMemo(
    () =>
      completedQCs.filter(
        (q) =>
          new Date(q.createdAt).toDateString() === todayStr &&
          (q.result === 'REJECT' || q.result === 'DISCARD')
      ).length,
    [completedQCs, todayStr]
  );
  const reworkCount = completedQCs.filter((q) => q.result === 'REWORK').length;

  // Table rows
  const unifiedData = useMemo<TableRow[]>(() => {
    const rows: TableRow[] = [];
    pendingWOs.forEach((wo) =>
      rows.push({
        _type: 'PENDING',
        id: `PENDING-${wo.id}`,
        woId: wo.id,
        woNumber: wo.woNumber,
        productName: wo.product?.name ?? '—',
        batchNumber: wo.batchNumber ?? '—',
        packedTime: wo.updatedAt || wo.createdAt,
        packedBy: wo.supervisor?.name ?? wo.operator?.name ?? '—',
        assignedTo: (wo as any).inspector?.name ?? (wo as any).inspectorName ?? 'Unassigned',
        displayStatus:
          wo.status === 'LABELS_APPLIED'
            ? 'Labels Applied'
            : wo.status === 'LABEL_APPLICATION_ASSIGNED'
            ? 'Application Assigned'
            : wo.status === 'LABEL_APPLICATION_IN_PROGRESS'
            ? 'Application In Progress'
            : wo.status === 'LABELS_PRINTED'
            ? 'Labels Printed'
            : wo.status === 'PACKING_COMPLETED'
            ? 'Packing Completed'
            : 'QC Pending',
        priority: wo.priority,
        rawWO: wo,
      })
    );
    completedQCs.forEach((qc) =>
      rows.push({
        _type: 'COMPLETED',
        id: qc.id,
        woId: qc.woId,
        woNumber: qc.workOrder?.woNumber ?? '—',
        productName: qc.workOrder?.product?.name ?? '—',
        batchNumber: qc.workOrder?.batchNumber ?? '—',
        packedTime: qc.workOrder?.updatedAt ?? qc.createdAt,
        packedBy: qc.workOrder?.operator?.name ?? qc.workOrder?.supervisor?.name ?? '—',
        assignedTo: qc.inspector?.name ?? '—',
        displayStatus: RESULT_LABEL[qc.result] ?? qc.result,
        priority: qc.workOrder?.priority ?? 'MEDIUM',
        rawQC: qc,
      })
    );
    return rows;
  }, [pendingWOs, completedQCs]);

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
    if (filterPriority) d = d.filter((r) => r.priority === filterPriority);
    if (filterBatch)
      d = d.filter((r) =>
        r.batchNumber.toLowerCase().includes(filterBatch.toLowerCase())
      );
    if (filterWO)
      d = d.filter((r) =>
        r.woNumber.toLowerCase().includes(filterWO.toLowerCase())
      );
    if (filterProduct)
      d = d.filter((r) =>
        r.productName.toLowerCase().includes(filterProduct.toLowerCase())
      );
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
  }, [
    unifiedData,
    filterStatus,
    filterPriority,
    filterBatch,
    filterWO,
    filterProduct,
    search,
  ]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Row-level Modal Task Assignment
  const openAssignModal = (wo: PendingQCWorkOrder) => {
    setAssignModalWO(wo);
    setAssignModalInspectorId((wo as any).inspectorId || wo.inspector?.id || '');
    setAssignModalPriority(wo.priority || 'HIGH');
  };

  const handleConfirmAssignModal = async () => {
    if (!assignModalWO || !assignModalInspectorId) {
      toast.error('Please select a QC Inspector.');
      return;
    }
    try {
      setAssignModalLoading(true);
      await workOrderService.updateWorkOrderStatus(assignModalWO.id, 'QC_PENDING', {
        inspectorId: assignModalInspectorId,
        priority: assignModalPriority as any,
      });
      const assignedInspector = inspectors.find((i) => i.id === assignModalInspectorId);
      toast.success(
        `Inspection task for ${assignModalWO.woNumber} assigned to ${
          assignedInspector?.name || 'QC Inspector'
        }!`
      );
      setAssignModalWO(null);
      loadAll(false);
    } catch (err: any) {
      console.error('Failed to assign task', err);
      toast.error(
        err.response?.data?.message || err.message || 'Failed to assign inspector'
      );
    } finally {
      setAssignModalLoading(false);
    }
  };

  // Form helpers
  const openForm = (wo: PendingQCWorkOrder) => {
    setSelectedWO(wo);
    const packed = wo.actualProduced ?? wo.requiredQty;
    setFormPackedQty(packed);
    setFormCheckedQty('');
    setFormBatchNo(wo.batchNumber ?? `BATCH-${wo.woNumber.split('-').pop()}`);
    setFormInspectionType('Sampling Inspection');
    setFormResult('PASS');
    setFormSeverity('MINOR');
    setFormFailureReason('');
    setFormRemarks('');
    setFormPhotos([]);
    setChecks({ ...DEFAULT_CHECKS });
    setIsFormOpen(true);
  };

  const handleCheckboxChange = (key: keyof typeof checks) => {
    const u = { ...checks, [key]: !checks[key] };
    setChecks(u);
    setFormResult(Object.values(u).every((v) => v) ? 'PASS' : 'REWORK');
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
    if (!selectedWO) return;
    setSubmitting(true);
    try {
      await qualityCheckService.submitQualityCheck({
        woId: selectedWO.id,
        checkedQty: Number(formCheckedQty),
        result: formResult,
        severity: ['REWORK', 'REJECT', 'DISCARD'].includes(formResult)
          ? formSeverity
          : undefined,
        failureReason: ['REWORK', 'REJECT', 'DISCARD'].includes(formResult)
          ? formFailureReason
          : undefined,
        remarks: formRemarks,
        checksPayload: checks,
      });
      setIsFormOpen(false);
      setSelectedWO(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterBatch('');
    setFilterWO('');
    setFilterProduct('');
  };

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Title & Subtitle */}
      <div className="flex justify-between items-center sm:items-end flex-col sm:flex-row gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Quality Check
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Home &gt; Quality Check
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedWO(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-1.5 bg-[#00891D] hover:bg-[#006b17] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
        >
          <ShieldCheck size={16} /> New Inspection Log
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1 truncate max-w-[100px]">
              Pending Assi...
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {pendingWOs.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              QC Inspectors
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {inspectors.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              Rework
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {reworkCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Package size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              Passed Today
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {passedToday}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              Failed Today
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {failedToday}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
              Total QC Done
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {completedQCs.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>



      {/* Filter & Search Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-xs h-10 overflow-x-auto w-full xl:w-auto">
          <div className="px-3 flex items-center justify-center text-slate-500 dark:text-gray-400 shrink-0">
            <Filter size={16} />
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[120px] shrink-0"
          >
            <option value="" className="dark:bg-gray-800">All Status</option>
            <option value="PENDING" className="dark:bg-gray-800">Pending QC</option>
            <option value="COMPLETED" className="dark:bg-gray-800">Completed</option>
            <option value="Passed" className="dark:bg-gray-800">Passed</option>
            <option value="Partial Pass" className="dark:bg-gray-800">Partial Pass</option>
            <option value="Failed" className="dark:bg-gray-800">Failed</option>
            <option value="Rework" className="dark:bg-gray-800">Rework</option>
            <option value="Discard" className="dark:bg-gray-800">Discard</option>
          </select>

          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 outline-none cursor-pointer appearance-none min-w-[120px] shrink-0"
          >
            <option value="" className="dark:bg-gray-800">All Priority</option>
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
              <option key={p} value={p} className="dark:bg-gray-800">
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-slate-200 dark:bg-gray-700 shrink-0" />

          <button
            onClick={resetFilters}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors bg-transparent cursor-pointer shrink-0"
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>

        <div className="relative w-full xl:w-72">
          <Search
            className="absolute left-3 top-2.5 text-slate-400 dark:text-gray-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Search orders, batches, products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00891D]/20 focus:border-[#00891D] transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400 dark:text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading quality check data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {[
                    'PRODUCT / WORK ORDER',
                    'BATCH NO',
                    'TIME AND DATE',
                    'ASSIGNED TO',
                    'STATUS',
                    'PRIORITY',
                    'ACTION',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                    >
                      No quality check records found.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr
                      key={`${row.id}-${index}`}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {row.productName}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                          {row.woNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-gray-300 whitespace-nowrap">
                        {row.batchNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-gray-300 font-medium whitespace-nowrap">
                        {fmt(row.packedTime)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-gray-300 whitespace-nowrap">
                        <span
                          className={
                            row.assignedTo === 'Unassigned' || row.assignedTo === '—'
                              ? 'text-gray-400 dark:text-gray-500 font-normal italic'
                              : 'text-slate-800 dark:text-gray-200 font-semibold'
                          }
                        >
                          {row.assignedTo}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                            STATUS_BADGE[row.displayStatus] ??
                            'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
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
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        {row._type === 'PENDING' ? (
                          <div className="flex items-center gap-2">
                            <ViewIconButton
                              onClick={() => row.rawWO && openForm(row.rawWO)}
                              title="Perform / View QC"
                            />
                            <button
                              onClick={() => {
                                if (row.rawWO) {
                                  openAssignModal(row.rawWO);
                                }
                              }}
                              className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] cursor-pointer transition-colors border border-indigo-200 dark:border-indigo-800"
                              title="Assign Inspector to this WO"
                            >
                              Assign
                            </button>
                          </div>
                        ) : (
                          <ViewIconButton
                            onClick={() => row.rawQC && setSelectedQC(row.rawQC)}
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
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="p-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 dark:text-white focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                Showing {(currentPage - 1) * rowsPerPage + 1} -{' '}
                {Math.min(currentPage * rowsPerPage, filteredData.length)} of{' '}
                {filteredData.length} records &nbsp;·&nbsp;
                {pendingWOs.length} pending&nbsp;·&nbsp;{completedQCs.length} completed
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-bold dark:text-white">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QC Detail Modal */}
      {selectedQC && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 w-full max-w-lg shadow-2xl p-6 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-gray-700 pb-3 sticky top-0 bg-white dark:bg-gray-800">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {selectedQC.qcNumber}
                </span>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  {selectedQC.workOrder?.product?.name ?? '—'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedQC(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-gray-900 p-3 rounded-lg border border-slate-100 dark:border-gray-700 text-slate-800 dark:text-gray-200">
              <div>
                <strong>QC No:</strong> {selectedQC.qcNumber}
              </div>
              <div>
                <strong>Work Order:</strong> {selectedQC.workOrder?.woNumber ?? '—'}
              </div>
              <div>
                <strong>Inspector:</strong> {selectedQC.inspector?.name ?? '—'}
              </div>
              <div>
                <strong>Date:</strong> {fmt(selectedQC.createdAt)}
              </div>
              <div>
                <strong>Checked Qty:</strong> {selectedQC.checkedQty}
              </div>
              <div>
                <strong>Batch No:</strong> {selectedQC.workOrder?.batchNumber ?? '—'}
              </div>
              <div className="col-span-2">
                <strong>Result:</strong>{' '}
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${RESULT_BADGE(
                    selectedQC.result
                  )}`}
                >
                  {RESULT_LABEL[selectedQC.result] ?? selectedQC.result}
                </span>
              </div>
              {selectedQC.severity && (
                <div>
                  <strong>Severity:</strong> {selectedQC.severity}
                </div>
              )}
              {selectedQC.failureReason && (
                <div className="col-span-2">
                  <strong>Failure Reason:</strong> {selectedQC.failureReason}
                </div>
              )}
            </div>

            {selectedQC.checksPayload &&
              Object.keys(selectedQC.checksPayload).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase">
                    Inspection Checklist
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedQC.checksPayload).map(([key, passed]) => (
                      <div
                        key={key}
                        className="flex justify-between p-2 border border-slate-100 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
                      >
                        <span className="capitalize text-slate-700 dark:text-gray-300">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span
                          className={
                            passed
                              ? 'text-emerald-600 font-bold'
                              : 'text-rose-600 font-bold'
                          }
                        >
                          {passed ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {selectedQC.remarks && (
              <div className="text-xs border-t border-slate-100 dark:border-gray-700 pt-3">
                <strong className="text-slate-800 dark:text-gray-200">Remarks:</strong>
                <p className="text-slate-600 dark:text-gray-400 mt-1 italic">
                  {selectedQC.remarks}
                </p>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setSelectedQC(null)}
                className="bg-slate-800 dark:bg-gray-700 hover:bg-slate-900 dark:hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row-level Assign QC Inspector Modal */}
      {assignModalWO && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-md overflow-hidden text-left space-y-4">
            <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-indigo-950 text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users size={18} className="text-indigo-400" /> Assign QC Inspector
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
                  Batch: <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{assignModalWO.batchNumber || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Assign To (QC Inspector) *
                </label>
                <select
                  value={assignModalInspectorId}
                  onChange={(e) => setAssignModalInspectorId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">
                    {inspectors.length === 0 ? 'No inspectors found' : '-- Select QC Inspector --'}
                  </option>
                  {inspectors.map((u) => (
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
                disabled={assignModalLoading || !assignModalInspectorId}
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

      {/* QC Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-slate-900 text-white rounded-t-xl sticky top-0 z-10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShieldCheck size={18} /> Quality Inspection Checklist Log
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

            <form
              onSubmit={handleFormSubmit}
              className="p-6 space-y-5 flex-1 text-left text-xs"
            >
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
                  <option value="" className="dark:bg-gray-800">-- Choose Pending QC Batch --</option>
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
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">
                        WO Number
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white font-mono">
                        {selectedWO.woNumber}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">
                        Product
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {selectedWO.product?.name ?? '—'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">
                        Batch Number
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white font-mono">
                        {selectedWO.batchNumber ?? '—'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[9px] uppercase font-semibold">
                        Required Qty
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {selectedWO.requiredQty} units
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formBatchNo}
                    onChange={(e) => setFormBatchNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Inspection Type *
                  </label>
                  <select
                    required
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formInspectionType}
                    onChange={(e) => setFormInspectionType(e.target.value)}
                  >
                    <option className="dark:bg-gray-800">100% Inspection</option>
                    <option className="dark:bg-gray-800">Sampling Inspection</option>
                    <option className="dark:bg-gray-800">Random Inspection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Packed Qty
                  </label>
                  <input
                    type="number"
                    readOnly
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 font-mono"
                    value={formPackedQty}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Checked Qty *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    value={formCheckedQty}
                    onChange={(e) => setFormCheckedQty(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Sampling %
                  </label>
                  <div
                    className={`w-full p-2 border rounded-lg text-sm font-bold text-center ${
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

              <div className="border border-slate-100 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-900 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800">
                  <span className="font-bold text-[10px] text-slate-500 dark:text-gray-400 uppercase">
                    Verification Checklist
                  </span>
                </div>
                {CHECKLIST_SECTIONS.map(({ section, color, items }) => (
                  <div
                    key={section}
                    className="px-3 pt-2.5 pb-3 space-y-2 border-b border-slate-100 dark:border-gray-800 last:border-b-0"
                  >
                    <span className={`block text-[10px] font-bold uppercase ${color}`}>
                      {section}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {items.map(({ key, label }) => (
                        <label
                          key={key}
                          className={`flex items-center gap-2 bg-white dark:bg-gray-800 border p-2 rounded-lg cursor-pointer transition-colors ${
                            checks[key]
                              ? 'border-slate-200 dark:border-gray-700'
                              : 'border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="rounded accent-[#00891D] shrink-0"
                            checked={checks[key]}
                            onChange={() => handleCheckboxChange(key)}
                          />
                          <span className="text-[11px] font-medium text-slate-700 dark:text-gray-300 leading-tight">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    QC Decision *
                  </label>
                  <select
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-[#00891D]"
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
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Photo Evidence
                  </label>
                  <label className="w-full h-[42px] px-3 rounded-lg border border-dashed border-slate-300 dark:border-gray-600 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer bg-slate-50 dark:bg-gray-900 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400">
                    <ImageIcon size={14} /> Upload photos
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
                <div className="flex flex-wrap gap-2">
                  {formPhotos.map((p) => (
                    <div
                      key={p.id}
                      className="relative group w-14 h-14 rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden bg-slate-100 dark:bg-gray-900"
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
                        className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 text-rose-500 shadow-xs opacity-0 group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {['REWORK', 'REJECT', 'DISCARD'].includes(formResult) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      Severity *
                    </label>
                    <select
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-semibold focus:outline-none"
                      value={formSeverity}
                      onChange={(e) => setFormSeverity(e.target.value)}
                    >
                      <option value="MINOR" className="dark:bg-gray-800">Minor</option>
                      <option value="MAJOR" className="dark:bg-gray-800">Major</option>
                      <option value="CRITICAL" className="dark:bg-gray-800">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                      Failure Reason *
                    </label>
                    <select
                      required
                      className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-semibold focus:outline-none"
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
                <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Inspection Remarks / Observations
                </label>
                <textarea
                  rows={2}
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                  placeholder="Additional notes for rework or FG team..."
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setSelectedWO(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 font-bold hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#00891D] hover:bg-[#006b17] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Inspection Log'}
                </button>
              </div>
            </form>
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
