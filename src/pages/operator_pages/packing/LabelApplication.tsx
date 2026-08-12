import React, { useEffect, useState } from 'react';
import { Tag, CheckCircle, AlertTriangle, Scan, Play, ShieldCheck, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { barcodeService } from '../../../api/packing/barcodeService';
import { workOrderService } from '../../../api/packing/workOrderService';
import { getOperatorUser } from './operatorAuth';
import toast from 'react-hot-toast';

export interface LabelTask {
  id: string; // Work order ID or task ID
  taskId?: string;
  woNumber: string;
  product?: { id: string; name: string; sku: string };
  status: string;
  priority: string;
  requiredQty: number;
  actualProduced?: number;
  labelsApplied?: number;
  startedAt?: string;
  createdAt?: string;
}

export const LabelApplication: React.FC = () => {
  const navigate = useNavigate();
  const user = getOperatorUser();

  const [labelTasks, setLabelTasks] = useState<LabelTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Active / Selected task state
  const [activeTask, setActiveTask] = useState<LabelTask | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [applyIncrement, setApplyIncrement] = useState<number | ''>('');
  const [scannedCount, setScannedCount] = useState(0);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // First try fetching tasks from barcodeService.getMyTasks()
      let tasksData: LabelTask[] = [];
      try {
        const res = await barcodeService.getMyTasks();
        if (res && res.data && Array.isArray(res.data)) {
          tasksData = res.data;
        }
      } catch (err) {
        console.warn('Fallback to workOrderService for label tasks:', err);
      }

      // Fallback or complement with workOrderService
      if (tasksData.length === 0) {
        const woRes = await workOrderService.getWorkOrders({ operatorId: user.id });
        const eligible = (woRes.data || []).filter(
          (wo) =>
            (!wo.operatorId || wo.operatorId === user.id) &&
            ['LABEL_APPLICATION_ASSIGNED', 'LABEL_APPLICATION_IN_PROGRESS'].includes(wo.status)
        );
        tasksData = eligible.map((wo) => ({
          id: wo.id,
          taskId: wo.id,
          woNumber: wo.woNumber,
          product: wo.product,
          status: wo.status,
          priority: wo.priority,
          requiredQty: wo.actualProduced || wo.requiredQty,
          actualProduced: wo.actualProduced || wo.requiredQty,
          labelsApplied: wo.labelsApplied || 0,
          startedAt: wo.startedAt,
          createdAt: wo.createdAt,
        }));
      }

      setLabelTasks(tasksData);

      if (tasksData.length > 0 && !activeTask) {
        const inProgress = tasksData.find((t) => t.status === 'LABEL_APPLICATION_IN_PROGRESS');
        setActiveTask(inProgress || tasksData[0]);
      } else if (activeTask) {
        const updated = tasksData.find((t) => t.id === activeTask.id);
        if (updated) setActiveTask(updated);
      }
    } catch (error) {
      console.error('Failed to load label application tasks:', error);
      toast.error('Failed to load label application tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (task: LabelTask) => {
    try {
      await workOrderService.updateWorkOrderStatus(task.id, 'LABEL_APPLICATION_IN_PROGRESS');
      toast.success(`Label application started for ${task.woNumber}`);
      fetchTasks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start label application task.');
    }
  };

  const handleScanLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    if (!activeTask) return;

    const reqQty = activeTask.actualProduced || activeTask.requiredQty;
    const currentApplied = activeTask.labelsApplied || 0;

    if (currentApplied >= reqQty) {
      toast.error('Required quantity of labels has already been reached.');
      setScanInput('');
      return;
    }

    setScannedCount((prev) => prev + 1);
    toast.success(`Scanned label match #${scannedCount + 1}`);
    setScanInput('');
  };

  const handleUpdateAppliedQty = async () => {
    if (!activeTask) return;

    const inc = Number(applyIncrement) || 0;
    if (inc <= 0) return toast.error('Please enter a valid positive quantity.');

    const reqQty = activeTask.actualProduced || activeTask.requiredQty;
    const currentApplied = activeTask.labelsApplied || 0;
    const targetApplied = currentApplied + inc;

    if (targetApplied > reqQty) {
      return toast.error(`Total applied quantity (${targetApplied}) cannot exceed required quantity (${reqQty}).`);
    }

    try {
      await barcodeService.completeTask({
        workOrderId: activeTask.id,
        appliedQuantity: inc,
      });
      toast.success(`Applied ${inc} labels.`);
      setApplyIncrement('');
      setShowApplyModal(false);
      fetchTasks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update applied label quantity.');
    }
  };

  const handleCompleteTask = async () => {
    if (!activeTask) return;

    const reqQty = activeTask.actualProduced || activeTask.requiredQty;
    const currentApplied = activeTask.labelsApplied || 0;

    if (currentApplied < reqQty) {
      return toast.error(`Completion allowed only when applied quantity (${currentApplied}) equals required quantity (${reqQty}).`);
    }

    try {
      // Transition status to LABELS_APPLIED which automatically opens QC_PENDING workflow
      await workOrderService.updateWorkOrderStatus(activeTask.id, 'LABELS_APPLIED');
      toast.success(`Label application completed for ${activeTask.woNumber}! Work Order moved to LABELS_APPLIED / QC_PENDING.`);
      setShowCompleteModal(false);
      setActiveTask(null);
      fetchTasks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to complete label application.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Tag className="text-indigo-600" size={26} /> Label Application
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Apply physical barcode labels generated from Admin Barcodes & Labels.
          </p>
        </div>
      </div>

      {labelTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center border border-gray-100 dark:border-gray-700 shadow-xs max-w-lg mx-auto">
          <Tag size={48} className="text-gray-300 dark:text-gray-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">No Assigned Label Tasks</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            There are currently no active label application tasks assigned to you. Check back after Admin generates labels.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Task Selection List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Assigned Label Tasks ({labelTasks.length})
            </h3>
            <div className="space-y-3">
              {labelTasks.map((task) => {
                const reqQty = task.actualProduced || task.requiredQty;
                const appliedQty = task.labelsApplied || 0;
                const isSelected = activeTask?.id === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => setActiveTask(task)}
                    className={`bg-white dark:bg-gray-800 p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                        : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-black text-sm text-gray-800 dark:text-white">{task.woNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          task.status === 'LABEL_APPLICATION_IN_PROGRESS'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400'
                        }`}
                      >
                        {task.status === 'LABEL_APPLICATION_IN_PROGRESS' ? 'IN PROGRESS' : 'ASSIGNED'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3 truncate">
                      {task.product?.name || 'Product'}
                    </p>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                      <span className="font-bold text-indigo-600">
                        {appliedQty} / {reqQty} units
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.round((appliedQty / (reqQty || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Task Operator Workstation */}
          {activeTask && (
            <div className="lg:col-span-2 space-y-6">
              {/* Active Task Summary Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xs border border-gray-100 dark:border-gray-700 relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">{activeTask.woNumber}</h2>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{activeTask.product?.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-400 font-mono mt-0.5">SKU: {activeTask.product?.sku || 'N/A'}</p>
                  </div>
                  {activeTask.status === 'LABEL_APPLICATION_ASSIGNED' && (
                    <button
                      onClick={() => handleStartTask(activeTask)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center cursor-pointer"
                    >
                      <Play size={14} className="mr-1.5" /> Start Task
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-700 text-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Required</span>
                    <span className="text-lg font-black text-gray-800 dark:text-white">
                      {activeTask.actualProduced || activeTask.requiredQty} units
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-800/40 text-xs">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase block mb-1">Applied</span>
                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                      {activeTask.labelsApplied || 0} units
                    </span>
                  </div>

                  <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-100 dark:border-orange-800/40 text-xs">
                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase block mb-1">Remaining</span>
                    <span className="text-lg font-black text-orange-700 dark:text-orange-400">
                      {Math.max(0, (activeTask.actualProduced || activeTask.requiredQty) - (activeTask.labelsApplied || 0))} units
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-700 text-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Operator</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white truncate block">{user.name}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 mb-6">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500">Completion Progress</span>
                    <span className="text-indigo-600">
                      {Math.round(
                        ((activeTask.labelsApplied || 0) / (activeTask.actualProduced || activeTask.requiredQty || 1)) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((activeTask.labelsApplied || 0) / (activeTask.actualProduced || activeTask.requiredQty || 1)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Scan & Verify Form */}
                <div className="bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-100 dark:border-gray-700 mb-6">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Scan size={16} className="text-indigo-600" /> Scan / Verify Label Barcode
                  </h4>
                  <form onSubmit={handleScanLabel} className="flex gap-2">
                    <input
                      type="text"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      placeholder="Scan or type barcode string..."
                      className="flex-1 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-mono font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                    >
                      Verify
                    </button>
                  </form>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="flex-1 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Plus size={16} className="mr-1.5" /> Update Applied Quantity
                  </button>

                  <button
                    onClick={() =>
                      navigate('/packer/operator/report-issue', {
                        state: { woId: activeTask.id, woText: `${activeTask.woNumber} - Barcode Label Issue` },
                      })
                    }
                    className="flex-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  >
                    <AlertTriangle size={16} className="mr-1.5" /> Report Label Issue
                  </button>

                  <button
                    onClick={() => setShowCompleteModal(true)}
                    disabled={(activeTask.labelsApplied || 0) < (activeTask.actualProduced || activeTask.requiredQty)}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center"
                  >
                    <CheckCircle size={16} className="mr-1.5" /> Complete Label Application
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Update Applied Quantity Modal */}
      {showApplyModal && activeTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xs uppercase">Record Applied Labels</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">Additional Labels Applied</label>
                <input
                  type="number"
                  min="1"
                  value={applyIncrement}
                  onChange={(e) => setApplyIncrement(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Enter count..."
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Current: <strong>{activeTask.labelsApplied || 0}</strong> / Required:{' '}
                <strong>{activeTask.actualProduced || activeTask.requiredQty}</strong>
              </p>
              <button
                onClick={handleUpdateAppliedQty}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-xs shadow-xs cursor-pointer"
              >
                Save Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {showCompleteModal && activeTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-5 flex flex-col items-center text-center">
              <ShieldCheck size={36} className="text-green-600 mb-3" />
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">Finish Label Application?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                This will set Label Task to COMPLETED, update Work Order to LABELS_APPLIED and submit for Quality Check (QC_PENDING).
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteTask}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Confirm Completion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelApplication;
