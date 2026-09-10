import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import { getOperatorUser } from './operatorAuth';
import { Package, AlertCircle, Play, Pause, CheckCircle, Plus, X, ListTodo } from 'lucide-react';
import toast from 'react-hot-toast';

export const ActivePacking: React.FC = () => {
  const user = getOperatorUser();
  const navigate = useNavigate();
  const [activeJob, setActiveJob] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddQuantity, setShowAddQuantity] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Input states
  const [addPacked, setAddPacked] = useState<number | ''>('');
  const [addRejected, setAddRejected] = useState<number | ''>('');
  const [pauseReason, setPauseReason] = useState('Break');

  const fetchActiveJob = async () => {
    try {
      setLoading(true);
      const response = await workOrderService.getWorkOrders({ operatorId: user.id });
      const job = (response.data || []).find(
        (wo) =>
          (!wo.operatorId || wo.operatorId === user.id) &&
          (wo.status === 'PACKING_STARTED' || wo.status === 'PACKING_IN_PROGRESS')
      );
      setActiveJob(job || null);
    } catch (err) {
      console.error('Failed to fetch active job', err);
      toast.error('Failed to load active packing job.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveJob();
  }, []);

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
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No active packing job.</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Select a job from My Jobs to start packing.</p>
        <button
          onClick={() => navigate('/packer/operator/jobs')}
          className="bg-green-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-700 active:scale-95 transition-all flex items-center shadow-xs text-sm cursor-pointer"
        >
          <ListTodo size={18} className="mr-2" />
          View My Jobs
        </button>
      </div>
    );
  }

  // Calculations
  const requiredQty = activeJob.requiredQty || 0;
  const packedQty = activeJob.actualProduced || 0;
  const rejectedQty = activeJob.actualRejected || 0;
  const remainingQty = Math.max(0, requiredQty - packedQty - rejectedQty);
  const completionPercentage = requiredQty > 0 ? Math.min(100, Math.round((packedQty / requiredQty) * 100)) : 0;
  const isHighPriority = activeJob.priority === 'HIGH' || activeJob.priority === 'URGENT';

  // SLA Calculation
  const expected = activeJob.expectedDate ? new Date(activeJob.expectedDate).getTime() : 0;
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

  const handleUpdateQuantity = async () => {
    const inputPacked = Number(addPacked) || 0;
    const inputRejected = Number(addRejected) || 0;
    if (inputPacked < 0 || inputRejected < 0) {
      return toast.error('Cannot add negative quantities');
    }

    let targetPacked = (inputPacked >= packedQty || inputPacked === requiredQty) ? inputPacked : packedQty + inputPacked;
    let targetRejected = (inputRejected >= rejectedQty) ? inputRejected : rejectedQty + inputRejected;

    if (inputPacked === requiredQty) {
      targetPacked = requiredQty;
    }

    const totalNew = targetPacked + targetRejected;
    if (totalNew > requiredQty) {
      return toast.error(
        `Total packed + rejected (${totalNew}) cannot exceed required quantity (${requiredQty}). Remaining allowed: ${remainingQty}.`
      );
    }

    try {
      await workOrderService.updateQuantity(activeJob.id, {
        actualProduced: targetPacked,
        actualRejected: targetRejected,
      });
      toast.success('Quantities updated successfully');
      setAddPacked('');
      setAddRejected('');
      setShowAddQuantity(false);
      fetchActiveJob();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed to update quantity');
    }
  };

  const handlePause = async () => {
    try {
      await workOrderService.pausePacking(activeJob.id, pauseReason);
      toast.success('Packing job paused');
      setShowPauseModal(false);
      fetchActiveJob();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed to pause');
    }
  };

  const handleResume = async () => {
    try {
      await workOrderService.resumePacking(activeJob.id);
      toast.success('Packing job resumed');
      fetchActiveJob();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed to resume');
    }
  };

  const handleComplete = async () => {
    try {
      await workOrderService.completePacking(activeJob.id);
      toast.success('Packing completed! Sent for Label Application / QC.');
      setShowCompleteModal(false);
      navigate('/packer/operator/jobs');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed to complete packing');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Active Packing Execution</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Monitor and update quantities for job <span className="font-mono font-bold">{activeJob.woNumber}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Main Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Order Summary Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            {isHighPriority && (
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                {activeJob.priority} PRIORITY
              </div>
            )}
            {activeJob.isPaused && (
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                PAUSED
              </div>
            )}

            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-xl ${activeJob.isPaused ? 'bg-orange-100 dark:bg-orange-950/50' : 'bg-purple-100 dark:bg-purple-950/50'}`}>
                <Package className={activeJob.isPaused ? 'text-orange-600' : 'text-purple-600'} size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{activeJob.woNumber}</h2>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{activeJob.product?.name || 'Assigned Product'}</p>
                <p className="text-xs text-gray-400 dark:text-gray-400 font-mono mt-0.5">SKU: {activeJob.product?.sku || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-2 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-100 dark:border-gray-700 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Batch Number</p>
                <p className="font-bold text-gray-800 dark:text-gray-100 font-mono">{activeJob.batchNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Status</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">{activeJob.isPaused ? 'PAUSED' : activeJob.status.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Warehouse</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">{user.warehouse?.name || 'Central Facility'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Started At</p>
                <p className="font-bold text-gray-800 dark:text-gray-100">
                  {activeJob.startedAt ? new Date(activeJob.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">SLA Target</p>
                <p className={`font-bold ${slaRisk ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>{slaText}</p>
              </div>
            </div>
          </div>

          {/* Progress & Quantities Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Packing Progress</h3>
              <span className="text-sm font-black text-green-600">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-6 overflow-hidden">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-700">
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Required</p>
                <p className="text-lg font-black text-gray-800 dark:text-gray-100">{requiredQty}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-100 dark:border-green-800/40">
                <p className="text-[10px] text-green-700 dark:text-green-400 font-bold uppercase mb-1">Packed</p>
                <p className="text-lg font-black text-green-700 dark:text-green-400">{packedQty}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-100 dark:border-red-800/40">
                <p className="text-[10px] text-red-700 dark:text-red-400 font-bold uppercase mb-1">Rejected</p>
                <p className="text-lg font-black text-red-700 dark:text-red-400">{rejectedQty}</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-100 dark:border-orange-800/40">
                <p className="text-[10px] text-orange-700 dark:text-orange-400 font-bold uppercase mb-1">Remaining</p>
                <p className="text-lg font-black text-orange-700 dark:text-orange-400">{remainingQty}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-3 mb-4 text-sm">
              Operator Actions
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => setShowAddQuantity(true)}
                disabled={activeJob.isPaused || remainingQty === 0}
                className="w-full flex justify-center items-center p-3 rounded-xl font-bold text-xs bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Plus size={16} className="mr-2" />
                Update Packed / Rejected Qty
              </button>

              {activeJob.isPaused ? (
                <button
                  onClick={handleResume}
                  className="w-full flex justify-center items-center p-3 rounded-xl font-bold text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <Play size={16} className="mr-2" />
                  Resume Packing
                </button>
              ) : (
                <button
                  onClick={() => setShowPauseModal(true)}
                  disabled={remainingQty === 0}
                  className="w-full flex justify-center items-center p-3 rounded-xl font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Pause size={16} className="mr-2" />
                  Pause Packing
                </button>
              )}

              <button
                onClick={() =>
                  navigate('/packer/operator/report-issue', {
                    state: { woId: activeJob.id, woText: `${activeJob.woNumber} - ${activeJob.product?.name}` }
                  })
                }
                className="w-full flex justify-center items-center p-3 rounded-xl font-bold text-xs bg-slate-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <AlertCircle size={16} className="mr-2" />
                Report Machine/Material Issue
              </button>

              <button
                onClick={() => setShowCompleteModal(true)}
                disabled={remainingQty > 0 || activeJob.isPaused}
                className="w-full flex justify-center items-center p-3.5 mt-4 rounded-xl font-bold text-xs bg-green-600 text-white shadow-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <CheckCircle size={16} className="mr-2" />
                Complete Packing Job
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Quantity Modal */}
      {showAddQuantity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Update Quantities</h3>
              <button onClick={() => setShowAddQuantity(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">Packed Quantity to Add</label>
                <input
                  type="number"
                  min="0"
                  value={addPacked}
                  onChange={(e) => setAddPacked(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900 text-sm font-bold focus:ring-1 focus:ring-green-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">Rejected Quantity to Add</label>
                <input
                  type="number"
                  min="0"
                  value={addRejected}
                  onChange={(e) => setAddRejected(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900 text-sm font-bold focus:ring-1 focus:ring-red-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg flex items-start gap-2 border border-blue-100 dark:border-blue-800/40">
                <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Remaining allowed capacity: <span className="font-bold">{remainingQty}</span> units
                </p>
              </div>
              <button
                onClick={handleUpdateQuantity}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors text-xs cursor-pointer shadow-xs"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Pause Packing</h3>
              <button onClick={() => setShowPauseModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">Reason for pausing</label>
                <select
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-100"
                >
                  <option>Break</option>
                  <option>Material Shortage</option>
                  <option>Machine Issue</option>
                  <option>Supervisor Instruction</option>
                  <option>Other</option>
                </select>
              </div>
              <button
                onClick={handlePause}
                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors text-xs cursor-pointer shadow-xs"
              >
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-3">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Complete Packing?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                Complete WO <strong>{activeJob.woNumber}</strong> and submit for Label Application & QC.
              </p>

              <div className="w-full bg-slate-50 dark:bg-gray-900 rounded-xl p-4 mb-5 text-left border border-slate-100 dark:border-gray-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Packed</span>
                  <span className="font-bold text-green-600">{packedQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Rejected</span>
                  <span className="font-bold text-red-600">{rejectedQty}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Completion</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100">100%</span>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivePacking;
