import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, AlertCircle, Clock, ListTodo, AlertTriangle, ArrowRight, Play, Tag } from 'lucide-react';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import { getOperatorUser } from './operatorAuth';

export const OperatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getOperatorUser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await workOrderService.getWorkOrders({ operatorId: user.id });
      // Filter for logged-in operator if operatorId is present or filter client-side
      const userOrders = (res.data || []).filter((wo: WorkOrder) =>
        !wo.operatorId || wo.operatorId === user.id
      );
      setWorkOrders(userOrders);
    } catch (err) {
      console.error('Failed to fetch work orders for dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const completedStatuses = [
    'PACKING_COMPLETED',
    'LABEL_APPLICATION_ASSIGNED',
    'LABEL_APPLICATION_IN_PROGRESS',
    'LABELS_APPLIED',
    'QC_PENDING',
    'QC_IN_PROGRESS',
    'QC_PASSED',
    'COMPLETED'
  ];

  const pendingJobs = workOrders.filter((wo) => ['APPROVED', 'PENDING'].includes(wo.status)).length;
  const readyToStart = workOrders.filter((wo) => wo.status === 'MATERIAL_ISSUED' || wo.status === 'LABEL_APPLICATION_ASSIGNED').length;
  const packingInProgress = workOrders.filter((wo) => wo.status === 'PACKING_STARTED' || wo.status === 'PACKING_IN_PROGRESS' || wo.status === 'LABEL_APPLICATION_IN_PROGRESS').length;
  const completedToday = workOrders.filter((wo) =>
    completedStatuses.includes(wo.status) &&
    ((wo.completedAt ? new Date(wo.completedAt).toDateString() === new Date().toDateString() : false) ||
     (wo.updatedAt ? new Date(wo.updatedAt).toDateString() === new Date().toDateString() : false))
  ).length;
  const delayedJobs = workOrders.filter((wo) =>
    wo.expectedDate && wo.expectedDate < today && !completedStatuses.includes(wo.status)
  ).length;
  const issuesReported = workOrders.filter((wo) => wo.isPaused).length;

  const stats = [
    { label: 'Pending Jobs', value: pendingJobs || 0, icon: ListTodo, color: 'text-blue-500', bg: 'bg-blue-100', path: '/packer/operator/jobs' },
    { label: 'Ready to Start', value: readyToStart || 0, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100', path: '/packer/operator/jobs' },
    { label: 'Packing In Progress', value: packingInProgress || 0, icon: Package, color: 'text-purple-500', bg: 'bg-purple-100', path: '/packer/operator/active-packing' },
    { label: 'Completed Today', value: completedToday || 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', path: '/packer/operator/history' },
    { label: 'Delayed Jobs', value: delayedJobs || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', path: '/packer/operator/jobs' },
    { label: 'Issues Reported', value: issuesReported || 0, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100', path: '/packer/operator/report-issue' },
  ];

  const activeJobs = workOrders.filter((wo) => wo.status === 'PACKING_STARTED' || wo.status === 'PACKING_IN_PROGRESS');
  const activeJob = activeJobs.length > 0 ? activeJobs[0] : null;
  const slaRiskJobs = workOrders.filter((wo) => wo.expectedDate && wo.expectedDate <= today && !completedStatuses.includes(wo.status));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SLA Alert */}
      {slaRiskJobs.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-300">SLA Risk Warning</h4>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              You have {slaRiskJobs.length} assigned job(s) approaching or exceeding target completion date.
            </p>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={() => navigate(stat.path)}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xs border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-full transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{stat.value}</h3>
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Job Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <div className="p-5 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Current Active Job</h2>
                {activeJob && (
                  <span className="bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    Packing
                  </span>
                )}
              </div>

              {activeJob ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{activeJob.woNumber}</h3>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">{activeJob.product?.name || 'Assigned Product'}</p>
                    </div>
                    <div className="flex flex-row md:flex-col gap-4 md:gap-1 text-sm font-medium">
                      <div className="flex items-center text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700">
                        <Package size={16} className="mr-2 text-green-600" />
                        Target: <span className="font-bold text-gray-800 dark:text-gray-100 ml-1">{activeJob.requiredQty} units</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700">
                        <CheckCircle size={16} className="mr-2 text-blue-600" />
                        Packed: <span className="font-bold text-gray-800 dark:text-gray-100 ml-1">{activeJob.actualProduced || 0} units</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-6 overflow-hidden">
                    <div
                      className="bg-green-500 h-3 rounded-full relative transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round(((activeJob.actualProduced || 0) / (activeJob.requiredQty || 1)) * 100))}%` }}
                    />
                  </div>

                  <button
                    onClick={() => navigate('/packer/operator/active-packing')}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-xs active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    Resume Packing <ArrowRight size={18} className="ml-2" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-full mb-3">
                    <Package size={44} className="text-gray-300 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">No active packing job in progress.</p>
                  <button
                    onClick={() => navigate('/packer/operator/jobs')}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    View Assigned Jobs
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/packer/operator/active-packing')}
                className="w-full flex items-center p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 transition-colors border border-slate-100 dark:border-gray-700 cursor-pointer group"
              >
                <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-lg mr-3 text-green-600">
                  <Play size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200 group-hover:text-green-700 dark:group-hover:text-green-400">
                  Resume Active Packing
                </span>
              </button>

              <button
                onClick={() => navigate('/packer/operator/jobs')}
                className="w-full flex items-center p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 transition-colors border border-slate-100 dark:border-gray-700 cursor-pointer group"
              >
                <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg mr-3 text-blue-600">
                  <ListTodo size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                  My Assigned Jobs
                </span>
              </button>

              <button
                onClick={() => navigate('/packer/operator/label-application')}
                className="w-full flex items-center p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-700 transition-colors border border-slate-100 dark:border-gray-700 cursor-pointer group"
              >
                <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg mr-3 text-indigo-600">
                  <Tag size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                  Label Application Tasks
                </span>
              </button>

              <button
                onClick={() => navigate('/packer/operator/report-issue')}
                className="w-full flex items-center p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 transition-colors border border-slate-100 dark:border-gray-700 cursor-pointer group"
              >
                <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg mr-3 text-red-600">
                  <AlertTriangle size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200 group-hover:text-red-700 dark:group-hover:text-red-400">
                  Report Machine/Material Issue
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorDashboard;
