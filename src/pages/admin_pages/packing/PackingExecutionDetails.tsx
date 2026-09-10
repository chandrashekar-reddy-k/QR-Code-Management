import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrderService, WorkOrder, WoStatus } from '../../../api/packing/workOrderService';
import { barcodeService } from '../../../api/packing/barcodeService';
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
  const [labelsApplied, setLabelsApplied] = useState<number>(0);
  const [labelsRejected, setLabelsRejected] = useState<number>(0);
  const [pauseReason, setPauseReason] = useState<string>('');
  const [showPauseModal, setShowPauseModal] = useState(false);

  const showToast = (msg: string, isError = false) => {
    if (isError) setErrorMsg(msg);
    else setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 3500);
  };

  const fetchWO = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await workOrderService.getWorkOrders();
      const found = res.data?.find((w) => w.id === id);
      if (found) {
        setSelectedWO(found);
        setActualProduced(found.actualProduced || 0);
        setActualRejected(found.actualRejected || 0);
        setLabelsApplied(found.labelsApplied ?? found.actualProduced ?? 0);
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
          onClick={() => navigate('/packing-erp/packing-execution')}
          className="mt-4 px-4 py-2 bg-[#00891D] text-white rounded-lg text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isLabelingStage = selectedWO.status === 'LABEL_APPLICATION_IN_PROGRESS' || selectedWO.status === 'LABELS_APPLIED';

  // Packing logic
  const reqQty = selectedWO.requiredQty || 1;
  const packedQty = actualProduced;
  const packingRemaining = Math.max(0, reqQty - packedQty);
  const packingPct = Math.min(100, Math.round((packedQty / reqQty) * 100));

  // Labeling logic
  const reqLabels = packedQty > 0 ? packedQty : reqQty;
  const labelsRemaining = Math.max(0, reqLabels - labelsApplied - labelsRejected);
  const labelingPct = Math.min(100, Math.round((labelsApplied / reqLabels) * 100) || 0);



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
    try {
      setActionLoading(true);
      const updated = await workOrderService.updateQuantity(selectedWO.id, {
        actualProduced,
        actualRejected,
      });
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
    if (actualProduced <= 0) {
      showToast('Packed quantity must be greater than 0 to complete packing.', true);
      return;
    }
    try {
      setActionLoading(true);
      // Ensure quantity is updated before marking complete
      await workOrderService.updateQuantity(selectedWO.id, {
        actualProduced,
        actualRejected,
      });
      const updated = await workOrderService.completePacking(selectedWO.id);
      setSelectedWO(updated);
      showToast(`Work Order ${updated.woNumber} packing completed!`);
      setTimeout(() => {
        navigate('/packing-erp/packing-execution');
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
    const maxQty = actualProduced > 0 ? actualProduced : reqQty;
    if (labelsApplied + labelsRejected > maxQty) {
      showToast('Total labels cannot exceed packed quantity.', true);
      return;
    }
    try {
      setActionLoading(true);
      const updated = await workOrderService.updateWorkOrderStatus(selectedWO.id, selectedWO.status, {
        labelsApplied,
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
    const maxQty = actualProduced > 0 ? actualProduced : reqQty;
    if (labelsApplied + labelsRejected > maxQty) {
      showToast('Total labels cannot exceed packed quantity.', true);
      return;
    }
    try {
      setActionLoading(true);
      await workOrderService.updateWorkOrderStatus(selectedWO.id, selectedWO.status, { labelsApplied });
      await barcodeService.completeTask({
        workOrderId: selectedWO.id,
        appliedQuantity: labelsApplied,
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
            onClick={() => navigate('/packing-erp/packing-execution')}
          >
            Packing Execution Queue &gt; {selectedWO.woNumber}
          </p>
        </div>
        <button
          onClick={() => navigate('/packing-erp/packing-execution')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Packing Stage Tracker */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Packing Execution Stage Tracker
        </h3>
        <div className="grid grid-cols-4 gap-2 relative">
          {STAGES.map((stage, idx) => {
            const uiStatus = selectedWO.status === 'PACKING_STARTED' && (selectedWO.actualProduced || 0) > 0 
                ? 'PACKING_IN_PROGRESS' 
                : selectedWO.status;
            
            const activeIdx = STAGES.findIndex((s) => s.key === uiStatus);
            const isCompletedState = selectedWO.status === 'LABELS_APPLIED' || selectedWO.status === 'COMPLETED' || selectedWO.status === 'QC_PENDING';
            const isDone = idx < activeIdx || isCompletedState;
            const isCurrent = idx === activeIdx && !isCompletedState;

            return (
              <div
                key={stage.key}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center transition-all ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : isCurrent
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-slate-400 dark:text-gray-500'
                }`}
              >
                <div className="mb-1">
                  {isDone ? (
                    <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="text-xs font-mono font-bold">{idx + 1}</span>
                  )}
                </div>
                <span className="text-xs font-semibold">{stage.label}</span>
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
              <span className="text-slate-800 dark:text-white font-bold block mt-0.5 truncate">
                {selectedWO.product?.name || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                SKU
              </span>
              <span className="text-slate-800 dark:text-white font-mono font-semibold block mt-0.5">
                {selectedWO.product?.sku || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-gray-400 block text-[9px] uppercase font-bold">
                Product BOM
              </span>
              <span className="text-slate-800 dark:text-white font-mono font-semibold block mt-0.5">
                {selectedWO.recipe?.code || selectedWO.recipeId}
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
                {selectedWO.operator?.name || selectedWO.supervisor?.name || 'Unassigned'}
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
                {isLabelingStage ? 'Required Labels' : 'Required Qty'}
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-white font-mono">
                {isLabelingStage ? reqLabels : reqQty}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-emerald-600 dark:text-emerald-400 block text-[9px] uppercase font-bold">
                {isLabelingStage ? 'Labels Applied' : 'Packed Qty'}
              </span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                {isLabelingStage ? labelsApplied : packedQty}
              </span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900">
              <span className="text-amber-600 dark:text-amber-400 block text-[9px] uppercase font-bold">
                {isLabelingStage ? 'Remaining Labels' : 'Remaining Qty'}
              </span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">
                {isLabelingStage ? labelsRemaining : packingRemaining}
              </span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900">
              <span className="text-rose-600 dark:text-rose-400 block text-[9px] uppercase font-bold">
                {isLabelingStage ? 'Rejected Labels' : 'Rejected Qty'}
              </span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono">
                {isLabelingStage ? labelsRejected : actualRejected}
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

            {selectedWO.status === 'LABEL_APPLICATION_ASSIGNED' && (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                Packed Quantity (Good Packs) *
              </label>
              <input
                type="number"
                min="0"
                value={actualProduced}
                onChange={(e) => setActualProduced(Number(e.target.value))}
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
                value={actualRejected}
                onChange={(e) => setActualRejected(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
              />
            </div>
          </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                Labels Applied Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={labelsApplied}
                onChange={(e) => setLabelsApplied(Number(e.target.value))}
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
                onChange={(e) => setLabelsRejected(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-mono font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
              />
            </div>
          </div>
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
