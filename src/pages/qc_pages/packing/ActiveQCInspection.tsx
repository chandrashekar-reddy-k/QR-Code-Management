import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { qualityCheckService, PendingQCWorkOrder } from '../../../api/packing/qualityCheckService';
import { workOrderService } from '../../../api/packing/workOrderService';
import { getQCUser } from './qcAuth';
import { Package, AlertCircle, CheckCircle, ListTodo, Camera, X, Check, XCircle, PauseCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface QcChecklist {
  id: string;
  label: string;
  required: boolean;
  description: string;
}

interface ChecklistState {
  status: 'PASS' | 'FAIL' | null;
  remarks: string;
}

const DEFAULT_CHECKPOINTS: QcChecklist[] = [
  { id: 'chk-1', label: 'Packaging Quality', required: true, description: 'Verify seal integrity, box condition & absence of tears' },
  { id: 'chk-2', label: 'Label Verification', required: true, description: 'Verify placement, text legibility & MRP formatting' },
  { id: 'chk-3', label: 'Barcode Verification', required: true, description: 'Scan and confirm barcode scannability & GTIN/SKU match' },
  { id: 'chk-4', label: 'Quantity Verification', required: true, description: 'Check net weight / unit count against BOM target' },
  { id: 'chk-5', label: 'Product Condition', required: true, description: 'Ensure product is free from moisture, damage, or discoloration' },
  { id: 'chk-6', label: 'Expiry & Batch Verification', required: true, description: 'Confirm batch code & expiry date match work order records' },
];

export const ActiveQCInspection: React.FC = () => {
  const user = getQCUser();
  const navigate = useNavigate();
  const [activeJob, setActiveJob] = useState<PendingQCWorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // QC Checklist state
  const [checklists] = useState<QcChecklist[]>(DEFAULT_CHECKPOINTS);
  const [checksState, setChecksState] = useState<Record<string, ChecklistState>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [overallRemarks, setOverallRemarks] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState('Lab Verification Pending');

  const ELIGIBLE_QC_STATUSES = ['LABELS_APPLIED', 'QC_PENDING', 'QC_STARTED', 'QC_IN_PROGRESS', 'QC_HOLD'];

  const fetchActiveJob = async () => {
    try {
      setLoading(true);
      const orders = await qualityCheckService.getPendingQCWorkOrders();
      const job =
        orders.find((wo) => wo.status === 'QC_IN_PROGRESS') ||
        orders.find((wo) => ELIGIBLE_QC_STATUSES.includes(wo.status));

      if (job && job.status !== 'QC_IN_PROGRESS') {
        try {
          await workOrderService.updateWorkOrderStatus(job.id, 'QC_IN_PROGRESS');
          job.status = 'QC_IN_PROGRESS';
        } catch (e) {
          console.error('Failed to update status to QC_IN_PROGRESS', e);
        }
      }

      setActiveJob(job || null);

      if (job) {
        // Fetch active inspection progress from backend database (no localStorage)
        const backendQC = await qualityCheckService.getQualityCheckByWoId(job.id);
        if (backendQC && backendQC.checksPayload) {
          const payload: any = backendQC.checksPayload;
          if (payload.checksState) {
            setChecksState(payload.checksState);
          } else {
            const initial: Record<string, ChecklistState> = {};
            DEFAULT_CHECKPOINTS.forEach((c) => {
              const val = payload[c.id];
              initial[c.id] = {
                status: val === true ? 'PASS' : val === false ? 'FAIL' : null,
                remarks: '',
              };
            });
            setChecksState(initial);
          }

          if (payload.overallRemarks || backendQC.remarks) {
            setOverallRemarks(payload.overallRemarks || backendQC.remarks || '');
          }

          if (payload.photos && Array.isArray(payload.photos)) {
            setPhotos(payload.photos);
          }
        } else {
          // Initialize fresh checklist
          const initial: Record<string, ChecklistState> = {};
          DEFAULT_CHECKPOINTS.forEach((c) => {
            initial[c.id] = { status: null, remarks: '' };
          });
          setChecksState(initial);
        }
      }
    } catch (err) {
      console.error('Failed to fetch active QC job', err);
      toast.error('Failed to load active inspection job.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveJob();
  }, []);

  const handleCheck = (id: string, status: 'PASS' | 'FAIL') => {
    setChecksState((prev) => ({
      ...prev,
      [id]: { ...prev[id], status },
    }));
  };

  const handleRemarkChange = (id: string, text: string) => {
    setChecksState((prev) => ({
      ...prev,
      [id]: { ...prev[id], remarks: text },
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (photos.length >= 3) {
        toast.error('Maximum 3 photo evidence files allowed.');
        return;
      }
      const newFiles = Array.from(e.target.files);
      const newPhotoUrls = newFiles.map((file) => URL.createObjectURL(file));
      setPhotos((prev) => [...prev, ...newPhotoUrls]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProgress = async () => {
    if (!activeJob) return;
    try {
      setIsSaving(true);
      const payloadData = {
        checksState,
        overallRemarks,
        photos,
        status: 'QC_IN_PROGRESS',
        updatedAt: new Date().toISOString(),
      };

      await qualityCheckService.submitQualityCheck({
        woId: activeJob.id,
        checkedQty: activeJob.actualProduced || activeJob.requiredQty,
        result: 'PARTIAL_PASS',
        remarks: overallRemarks || 'QC inspection in progress (Draft saved)',
        checksPayload: payloadData,
        targetWoStatus: 'QC_IN_PROGRESS',
      });

      toast.success('QC Inspection progress saved to database.');
    } catch (err: any) {
      console.error('Failed to save QC progress:', err);
      toast.error(err?.response?.data?.message || 'Failed to save progress to server.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!activeJob) {
    return (
      <div className="flex flex-col items-center justify-center p-10 mt-10 bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700 max-w-lg mx-auto text-center">
        <Package className="text-gray-300 dark:text-gray-500 mb-4" size={64} />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No active QC inspection.</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Select a task from My QC Tasks to begin inspection.</p>
        <button
          onClick={() => navigate('/packer/qc/tasks')}
          className="bg-green-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-700 active:scale-95 transition-all flex items-center shadow-xs text-sm cursor-pointer"
        >
          <ListTodo size={18} className="mr-2" />
          View My QC Tasks
        </button>
      </div>
    );
  }

  // Inspection metrics
  const totalItems = checklists.length;
  const inspectedItems = Object.values(checksState).filter((c) => c.status !== null).length;
  const passedItems = Object.values(checksState).filter((c) => c.status === 'PASS').length;
  const failedItems = Object.values(checksState).filter((c) => c.status === 'FAIL').length;
  const completionPercentage = totalItems > 0 ? Math.min(100, Math.round((inspectedItems / totalItems) * 100)) : 0;
  const isHighPriority = activeJob.priority === 'HIGH' || activeJob.priority === 'URGENT';

  // SLA Calculation
  const expected = activeJob.createdAt ? new Date(activeJob.createdAt).getTime() + 24 * 3600 * 1000 : 0;
  const now = new Date().getTime();
  let slaText = 'N/A';
  let slaRisk = false;
  if (expected > 0) {
    const diffHours = (expected - now) / (1000 * 60 * 60);
    if (diffHours < 0) {
      slaText = 'Overdue';
      slaRisk = true;
    } else if (diffHours < 24) {
      slaText = `${Math.floor(diffHours)}h left`;
      slaRisk = true;
    } else {
      slaText = `${Math.floor(diffHours / 24)}d left`;
    }
  }

  const validateChecklist = () => {
    for (const check of checklists) {
      const state = checksState[check.id];
      if (check.required && (!state || state.status === null)) {
        toast.error(`Mandatory checkpoint "${check.label}" has not been evaluated.`);
        return false;
      }
      if (state && state.status === 'FAIL' && !state.remarks.trim()) {
        toast.error(`Remarks are required for failed checkpoint "${check.label}".`);
        return false;
      }
    }
    return true;
  };

  const handleCompleteInspection = async () => {
    if (!validateChecklist()) return;

    const isPass = failedItems === 0;
    const finalResult = isPass ? 'PASS' : 'REJECT';
    const targetWoStatus = isPass ? 'QC_PASSED' : 'QC_FAILED';

    try {
      const payloadData = {
        checksState,
        overallRemarks,
        photos,
        status: targetWoStatus,
        completedAt: new Date().toISOString(),
      };

      await qualityCheckService.submitQualityCheck({
        woId: activeJob.id,
        checkedQty: activeJob.actualProduced || activeJob.requiredQty,
        result: finalResult,
        severity: isPass ? undefined : 'MAJOR',
        failureReason: isPass ? undefined : 'Quality checklist failed',
        remarks: overallRemarks || (isPass ? 'QC inspection passed successfully' : 'QC inspection failed'),
        checksPayload: payloadData,
        targetWoStatus,
      });

      if (isPass) {
        toast.success(`QC Passed! Work order #${activeJob.woNumber} is now eligible for Finished Goods.`);
      } else {
        toast.error(`QC Failed! Work order #${activeJob.woNumber} marked QC_FAILED and eligible for Repacking.`);
      }

      setShowCompleteModal(false);
      navigate('/packer/qc/tasks');
    } catch (err: any) {
      console.error('Failed to submit QC inspection:', err);
      toast.error(err?.response?.data?.message || 'Failed to submit QC inspection.');
    }
  };

  const handleHoldInspection = async () => {
    try {
      const payloadData = {
        checksState,
        overallRemarks,
        photos,
        holdReason,
        status: 'QC_HOLD',
        updatedAt: new Date().toISOString(),
      };

      await qualityCheckService.submitQualityCheck({
        woId: activeJob.id,
        checkedQty: activeJob.actualProduced || activeJob.requiredQty,
        result: 'HOLD',
        remarks: holdReason,
        checksPayload: payloadData,
        targetWoStatus: 'QC_HOLD',
      });

      toast.success(`Work Order #${activeJob.woNumber} placed on QC Hold.`);
      setShowHoldModal(false);
      navigate('/packer/qc/tasks');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to place on QC hold.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Active QC Inspection</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Perform quality inspection for Work Order <span className="font-mono font-bold">{activeJob.woNumber}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Inspection Workstation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Order Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700 relative">
            {isHighPriority && (
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                {activeJob.priority} PRIORITY
              </div>
            )}

            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950/50">
                <CheckCircle className="text-purple-600 dark:text-purple-400" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{activeJob.woNumber}</h2>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{activeJob.product?.name || 'Product'}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {activeJob.product?.sku || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-2 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-100 dark:border-gray-700 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Batch Number</p>
                <p className="font-bold text-gray-800 dark:text-gray-100 font-mono">{activeJob.batchNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Packed Quantity</p>
                <p className="font-bold text-green-600 font-mono">{activeJob.actualProduced || activeJob.requiredQty} units</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">QC Checker</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">{user.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Preceding Status</p>
                <p className="font-bold text-indigo-600">LABELS_APPLIED ✓</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">SLA</p>
                <p className={`font-bold ${slaRisk ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>{slaText}</p>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">QC Checkpoints Checklist</h3>
              <span className="text-xs font-bold text-green-600">{inspectedItems} / {totalItems} Evaluated</span>
            </div>

            <div className="space-y-4">
              {checklists.map((check) => {
                const currentState = checksState[check.id] || { status: null, remarks: '' };
                return (
                  <div key={check.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <div>
                        <span className="font-bold text-xs text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                          {check.label} {check.required && <span className="text-red-500">*</span>}
                        </span>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{check.description}</p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCheck(check.id, 'PASS')}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                            currentState.status === 'PASS'
                              ? 'bg-green-600 text-white shadow-xs'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-green-50'
                          }`}
                        >
                          <Check size={14} /> Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCheck(check.id, 'FAIL')}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                            currentState.status === 'FAIL'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-red-50'
                          }`}
                        >
                          <XCircle size={14} /> Fail
                        </button>
                      </div>
                    </div>

                    {currentState.status === 'FAIL' && (
                      <input
                        type="text"
                        value={currentState.remarks}
                        onChange={(e) => handleRemarkChange(check.id, e.target.value)}
                        placeholder="Enter failure remarks (required)..."
                        className="w-full p-2 text-xs border border-red-300 rounded-lg bg-red-50/50 dark:bg-red-950/30 text-red-900 dark:text-red-200 focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Controls & Evidence */}
        <div className="space-y-6">
          {/* Progress Summary Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
              Inspection Summary
            </h3>

            <div className="space-y-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Progress</span>
                <span className="font-bold text-green-600">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${completionPercentage}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="bg-green-50 p-2 rounded-lg text-green-700 font-bold">Passed: {passedItems}</div>
                <div className="bg-red-50 p-2 rounded-lg text-red-700 font-bold">Failed: {failedItems}</div>
              </div>
            </div>

            {/* Overall Remarks */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Overall Inspection Remarks</label>
              <textarea
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                placeholder="Optional overall inspector remarks..."
                className="w-full p-2.5 bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs resize-none h-20"
              />
            </div>

            {/* Evidence Photos */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Photo Evidence</label>
                <span className="text-[10px] font-bold text-gray-400">{photos.length}/3</span>
              </div>

              {photos.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {photos.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <img src={src} alt="Evidence" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-3 flex items-center justify-center text-xs font-semibold text-gray-500 hover:bg-slate-50 cursor-pointer"
                >
                  <Camera size={16} className="mr-2" /> Add Evidence Photo
                </button>
              )}
              <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl border border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 font-bold text-xs hover:bg-green-100 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? 'Saving to Database...' : 'Save Progress (Backend)'}
              </button>

              <button
                type="button"
                onClick={() => setShowHoldModal(true)}
                className="w-full py-2.5 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PauseCircle size={16} /> Place on QC Hold
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('/packer/qc/report-issue', {
                    state: { woId: activeJob.id, woText: `${activeJob.woNumber} - Quality Inspection Issue` },
                  })
                }
                className="w-full py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertCircle size={16} /> Report Quality Defect
              </button>

              <button
                type="button"
                onClick={() => setShowCompleteModal(true)}
                className={`w-full py-3.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all cursor-pointer flex items-center justify-center ${
                  failedItems > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <CheckCircle size={16} className="mr-1.5" />
                {failedItems > 0 ? 'Submit QC Failure (REPACKING)' : 'Complete & Pass QC (FINISHED GOODS)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Inspection Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-5 text-center space-y-3">
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${failedItems > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {failedItems > 0 ? <XCircle size={32} /> : <CheckCircle size={32} />}
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                {failedItems > 0 ? 'Confirm QC Failure?' : 'Confirm QC Pass?'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {failedItems > 0
                  ? `WO #${activeJob.woNumber} will be marked as QC_FAILED and sent for Repacking.`
                  : `WO #${activeJob.woNumber} will be marked as QC_PASSED and sent to Finished Goods.`}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteInspection}
                  className={`flex-1 py-2.5 text-white rounded-xl font-bold text-xs ${failedItems > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QC Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xs">Place Work Order on QC Hold</h3>
              <button onClick={() => setShowHoldModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Hold Reason / Remarks *</label>
                <textarea
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-900 font-medium h-24"
                  placeholder="Specify why inspection is held..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowHoldModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleHoldInspection}
                  className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-xs"
                >
                  Confirm Hold
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveQCInspection;
