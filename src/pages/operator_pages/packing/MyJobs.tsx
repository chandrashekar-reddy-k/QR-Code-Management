import React, { useEffect, useState } from 'react';
import { Package, Clock, AlertTriangle, Play, CheckCircle, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import { barcodeService } from '../../../api/packing/barcodeService';
import { getOperatorUser } from './operatorAuth';
import toast from 'react-hot-toast';

export const MyJobs: React.FC = () => {
  const navigate = useNavigate();
  const { id: routeJobId } = useParams<{ id?: string }>();
  const [activeTab, setActiveTab] = useState<'ready' | 'in-progress' | 'pending' | 'labels'>('ready');
  const [tasks, setTasks] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<WorkOrder | null>(null);
  const user = getOperatorUser();

  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [labelJobId, setLabelJobId] = useState('');
  const [labelsApplied, setLabelsApplied] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await workOrderService.getWorkOrders({ operatorId: user.id });
      // Only jobs assigned to logged-in operator or unassigned
      const filtered = (response.data || []).filter(wo =>
        !wo.operatorId || wo.operatorId === user.id
      );
      setTasks(filtered);

      if (routeJobId) {
        const found = filtered.find(t => t.id === routeJobId);
        if (found) setSelectedJob(found);
      }
    } catch (error) {
      console.error('Failed to fetch assigned jobs', error);
      toast.error('Failed to load packing jobs');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'ready':
        return tasks.filter(t => t.status === 'MATERIAL_ISSUED' || t.status === 'LABEL_APPLICATION_ASSIGNED');
      case 'in-progress':
        return tasks.filter(t => t.status === 'PACKING_STARTED' || t.status === 'PACKING_IN_PROGRESS' || t.status === 'LABEL_APPLICATION_IN_PROGRESS');
      case 'pending':
        return tasks.filter(t => ['APPROVED', 'PENDING', 'DRAFT'].includes(t.status));
      case 'labels':
        return tasks.filter(t => ['LABEL_APPLICATION_ASSIGNED', 'LABEL_APPLICATION_IN_PROGRESS'].includes(t.status));
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  const handleStartPacking = async (id: string) => {
    try {
      await workOrderService.startPacking(id);
      toast.success('Packing job started successfully');
      navigate('/packer/operator/active-packing');
    } catch (error: any) {
      console.error('Error starting packing', error);
      toast.error(error?.response?.data?.message || 'Failed to start packing job.');
    }
  };

  const handleResumePacking = () => {
    navigate('/packer/operator/active-packing');
  };

  const handleStartLabeling = async (id: string) => {
    try {
      await workOrderService.updateWorkOrderStatus(id, 'LABEL_APPLICATION_IN_PROGRESS');
      fetchTasks();
      toast.success('Label application started.');
      navigate('/packer/operator/label-application');
    } catch (error) {
      console.error('Error starting labeling', error);
      toast.error('Failed to start labeling.');
    }
  };

  const handleCompleteLabeling = async (id: string) => {
    setLabelJobId(id);
    setLabelsApplied('');
    setLabelModalOpen(true);
  };

  const submitLabelsApplied = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(labelsApplied, 10);
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid positive label quantity.');
      return;
    }
    try {
      await barcodeService.completeTask({ workOrderId: labelJobId, appliedQuantity: num });
      fetchTasks();
      setLabelModalOpen(false);
      toast.success('Labels recorded successfully.');
    } catch (error: any) {
      console.error('Error completing labeling', error);
      toast.error(error?.response?.data?.message || 'Failed to record label completion.');
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200';
      case 'MEDIUM':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Assigned Jobs</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Jobs assigned to {user.name} ({user.employeeId})
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 flex w-full md:w-fit overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('ready')}
          className={`flex-1 md:flex-none px-5 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ready'
              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Ready to Start
          <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-full ${
            activeTab === 'ready' ? 'bg-blue-200 text-blue-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {tasks.filter(t => t.status === 'MATERIAL_ISSUED' || t.status === 'LABEL_APPLICATION_ASSIGNED').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('in-progress')}
          className={`flex-1 md:flex-none px-5 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'in-progress'
              ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          In Progress
          <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-full ${
            activeTab === 'in-progress' ? 'bg-orange-200 text-orange-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {tasks.filter(t => t.status === 'PACKING_STARTED' || t.status === 'PACKING_IN_PROGRESS' || t.status === 'LABEL_APPLICATION_IN_PROGRESS').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 md:flex-none px-5 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Pending Material
          <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-full ${
            activeTab === 'pending' ? 'bg-gray-300 text-gray-800' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {tasks.filter(t => ['APPROVED', 'PENDING', 'DRAFT'].includes(t.status)).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('labels')}
          className={`flex-1 md:flex-none px-5 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'labels'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Label Application
          <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-full ${
            activeTab === 'labels' ? 'bg-indigo-200 text-indigo-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {tasks.filter(t => ['LABEL_APPLICATION_ASSIGNED', 'LABEL_APPLICATION_IN_PROGRESS'].includes(t.status)).length}
          </span>
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid gap-4">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              {task.priority === 'URGENT' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />}
              {(task.status === 'PACKING_STARTED' || task.status === 'PACKING_IN_PROGRESS') && (
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">{task.woNumber}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${getPriorityColor(task.priority)}`}>
                      {task.priority || 'NORMAL'}
                    </span>
                    {(task.status === 'PACKING_STARTED' || task.status === 'PACKING_IN_PROGRESS') && (
                      <span className="bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        Packing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3">
                    <Package size={16} className="mr-2 text-gray-400" />
                    {task.product?.name || 'Assigned Product'}
                    <span className="text-gray-400 mx-2">•</span>
                    SKU: {task.product?.sku || 'N/A'}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700 text-xs">
                      <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2 uppercase text-[10px]">Target:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100">{task.requiredQty} units</span>
                    </div>

                    {(task.status === 'PACKING_STARTED' || task.status === 'PACKING_IN_PROGRESS') && (
                      <div className="flex items-center bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700 text-xs">
                        <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2 uppercase text-[10px]">Packed:</span>
                        <span className="font-bold text-gray-800 dark:text-gray-100">{task.actualProduced || 0} units</span>
                      </div>
                    )}

                    <div className="flex items-center bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700 text-xs">
                      <Clock size={12} className="text-gray-400 mr-1.5" />
                      <span className="font-semibold text-gray-600 dark:text-gray-300">
                        {new Date(task.startedAt || task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 justify-end md:w-44 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-5">
                  {task.status === 'MATERIAL_ISSUED' && (
                    <button
                      onClick={() => handleStartPacking(task.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      Start Packing
                    </button>
                  )}

                  {(task.status === 'PACKING_STARTED' || task.status === 'PACKING_IN_PROGRESS') && (
                    <button
                      onClick={handleResumePacking}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      <Play size={14} className="mr-1.5" /> Resume
                    </button>
                  )}

                  {['APPROVED', 'PENDING', 'DRAFT'].includes(task.status) && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                      <AlertTriangle size={16} className="text-gray-400 mb-1" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Awaiting Material</span>
                    </div>
                  )}

                  {task.status === 'LABEL_APPLICATION_ASSIGNED' && (
                    <button
                      onClick={() => handleStartLabeling(task.id)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      Start Labeling
                    </button>
                  )}

                  {task.status === 'LABEL_APPLICATION_IN_PROGRESS' && (
                    <button
                      onClick={() => handleCompleteLabeling(task.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      <CheckCircle size={14} className="mr-1.5" /> Complete Labels
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedJob(task)}
                    className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col items-center justify-center min-h-[250px]">
          <div className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-full mb-3">
            <Package size={40} className="text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">No Assigned Jobs</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium">
            There are currently no tasks in this tab assigned to you. Select a different tab or check back later.
          </p>
        </div>
      )}

      {/* Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{selectedJob.woNumber}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Work Order Details</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Product</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedJob.product?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Batch Number</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedJob.batchNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Target Qty</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedJob.requiredQty} units</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Packed Qty</span>
                  <p className="font-bold text-green-600">{selectedJob.actualProduced || 0} units</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedJob.status}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Priority</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedJob.priority}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Labeling Modal */}
      {labelModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600" /> Complete Label Application
              </h3>
              <button onClick={() => setLabelModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitLabelsApplied} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Applied Quantity *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 font-bold text-sm"
                  value={labelsApplied}
                  onChange={(e) => setLabelsApplied(e.target.value)}
                  placeholder="Enter quantity applied..."
                  autoFocus
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setLabelModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyJobs;
