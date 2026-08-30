import React, { useEffect, useState } from 'react';
import { Clock, PackageCheck, Play, PauseCircle, X } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { qualityCheckService, PendingQCWorkOrder } from '../../../api/packing/qualityCheckService';
import { workOrderService } from '../../../api/packing/workOrderService';
import { getQCUser } from './qcAuth';
import toast from 'react-hot-toast';

export const MyQCTasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeJobId } = useParams<{ id?: string }>();
  const user = getQCUser();

  const [activeTab, setActiveTab] = useState<'ready' | 'in-progress' | 'hold'>(location.state?.filter || 'ready');
  const [tasks, setTasks] = useState<PendingQCWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<PendingQCWorkOrder | null>(null);

  const ELIGIBLE_QC_STATUSES = ['LABELS_APPLIED', 'QC_PENDING', 'QC_STARTED', 'QC_IN_PROGRESS', 'QC_HOLD'];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await qualityCheckService.getPendingQCWorkOrders();
      // Filter for logged in inspector or unassigned
      const filtered = (response || []).filter(
        (wo) => {
          const inspector: any = wo.inspector;
          const isAssigned = !inspector || 
            inspector.id === user.id || 
            (user.email && inspector.email === user.email) || 
            (user.phone && inspector.phone === user.phone);
          return isAssigned && ELIGIBLE_QC_STATUSES.includes(wo.status);
        }
      );
      setTasks(filtered);

      if (routeJobId) {
        const found = filtered.find((t) => t.id === routeJobId);
        if (found) setSelectedTask(found);
      }
    } catch (error) {
      console.error('Failed to fetch QC tasks:', error);
      toast.error('Failed to load QC tasks.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'ready':
        return tasks.filter((t) => ['LABELS_APPLIED', 'QC_PENDING', 'QC_STARTED'].includes(t.status));
      case 'in-progress':
        return tasks.filter((t) => t.status === 'QC_IN_PROGRESS');
      case 'hold':
        return tasks.filter((t) => t.status === 'QC_HOLD');
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  const handleStartQC = async (id: string) => {
    try {
      await workOrderService.updateWorkOrderStatus(id, 'QC_IN_PROGRESS');
      toast.success('QC Inspection started');
      navigate('/packer/qc/active-inspection');
    } catch (error: any) {
      console.error('Error starting QC', error);
      toast.error(error?.response?.data?.message || 'Failed to start QC inspection.');
    }
  };

  const handleResumeQC = () => {
    navigate('/packer/qc/active-inspection');
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">My QC Tasks</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            Quality checks ready for inspection (Inspector: {user.name})
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
          Ready for QC
          <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-full ${
            activeTab === 'ready' ? 'bg-blue-200 text-blue-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {tasks.filter((t) => ['LABELS_APPLIED', 'QC_PENDING', 'QC_STARTED'].includes(t.status)).length}
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
            {tasks.filter((t) => t.status === 'QC_IN_PROGRESS').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('hold')}
          className={`flex-1 md:flex-none px-5 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'hold'
              ? 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-400 shadow-xs'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          On Hold
          <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] rounded-full ${
            activeTab === 'hold' ? 'bg-yellow-200 text-yellow-900' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {tasks.filter((t) => t.status === 'QC_HOLD').length}
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
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              {task.priority === 'URGENT' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">{task.woNumber}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${getPriorityColor(task.priority)}`}>
                      {task.priority || 'NORMAL'}
                    </span>
                    <span className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      Labels Applied
                    </span>
                  </div>

                  <div className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3">
                    <PackageCheck size={16} className="mr-2 text-gray-400" />
                    {task.product?.name || 'Product'}
                    <span className="text-gray-400 mx-2">•</span>
                    SKU: {task.product?.sku || 'N/A'}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700 text-xs">
                      <span className="font-semibold text-gray-500 dark:text-gray-400 mr-2 uppercase text-[10px]">Packed Qty:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-100">{task.actualProduced || task.requiredQty} units</span>
                    </div>

                    <div className="flex items-center bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700 text-xs">
                      <Clock size={12} className="text-gray-400 mr-1.5" />
                      <span className="font-semibold text-gray-600 dark:text-gray-300">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 justify-end md:w-44 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-5">
                  {['LABELS_APPLIED', 'QC_PENDING', 'QC_STARTED'].includes(task.status) && (
                    <button
                      onClick={() => handleStartQC(task.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      Start Inspection
                    </button>
                  )}

                  {task.status === 'QC_IN_PROGRESS' && (
                    <button
                      onClick={handleResumeQC}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      <Play size={14} className="mr-1.5" /> Resume Inspection
                    </button>
                  )}

                  {task.status === 'QC_HOLD' && (
                    <button
                      onClick={() => handleStartQC(task.id)}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      <PauseCircle size={14} className="mr-1.5" /> Resolve Hold
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedTask(task)}
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
            <PackageCheck size={40} className="text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">No QC Tasks Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium">
            There are currently no tasks in this tab ready for QC inspection.
          </p>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{selectedTask.woNumber}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">QC Inspection Details</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Product</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedTask.product?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Batch Number</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedTask.batchNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Packed Qty</span>
                  <p className="font-bold text-green-600">{selectedTask.actualProduced || selectedTask.requiredQty} units</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedTask.status}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyQCTasks;
