import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, ArrowRight, Play, AlertCircle, PackageCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { qualityCheckService } from '../../../api/packing/qualityCheckService';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';

export const QCDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    pending: 0,
    ready: 0,
    inProgress: 0,
    completed: 0,
    failedToday: 0,
    issues: 0,
  });

  const [activeJobs, setActiveJobs] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const ELIGIBLE_QC_STATUSES = ['LABELS_APPLIED', 'QC_PENDING', 'QC_STARTED', 'QC_IN_PROGRESS', 'QC_HOLD'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [woRes, qcRes] = await Promise.all([
        workOrderService.getWorkOrders(),
        qualityCheckService.getQualityChecks(),
      ]);

      const orders = woRes.data || [];
      const qcs = qcRes.data || [];

      // Entry Rule: Ready for QC only if LABELS_APPLIED, QC_PENDING, etc.
      const readyForQcOrders = orders.filter((o) => ELIGIBLE_QC_STATUSES.includes(o.status));
      const pendingCount = orders.filter((o) => ['APPROVED', 'MATERIAL_ISSUED', 'PACKING_STARTED', 'PACKING_IN_PROGRESS', 'LABEL_APPLICATION_ASSIGNED', 'LABEL_APPLICATION_IN_PROGRESS'].includes(o.status)).length;
      const qcInProgressCount = orders.filter((o) => o.status === 'QC_IN_PROGRESS').length;
      const todayStr = new Date().toDateString();

      const passedTodayCount = qcs.filter(
        (q) => new Date(q.createdAt).toDateString() === todayStr && (q.result === 'PASS' || q.result === 'PARTIAL_PASS')
      ).length;

      const failedTodayCount = qcs.filter(
        (q) => new Date(q.createdAt).toDateString() === todayStr && (q.result === 'REJECT' || q.result === 'DISCARD' || q.result === 'REWORK')
      ).length;

      const issuesCount = qcs.filter(
        (q) => new Date(q.createdAt).toDateString() === todayStr && (q.severity === 'CRITICAL' || q.severity === 'MAJOR')
      ).length;

      setStats({
        pending: pendingCount,
        ready: readyForQcOrders.length,
        inProgress: qcInProgressCount,
        completed: passedTodayCount,
        failedToday: failedTodayCount,
        issues: issuesCount,
      });

      const activeList = orders.filter((o) => o.status === 'QC_IN_PROGRESS');
      setActiveJobs(activeList);
    } catch (err) {
      console.error('Failed to fetch QC dashboard data:', err);
    } fontally: {
      setLoading(false);
    }
  };

  const kpis = [
    {
      title: 'Pending Inspection',
      value: stats.pending.toString(),
      icon: Clock,
      color: 'text-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-700',
      border: 'border-gray-200 dark:border-gray-600',
      onClick: () => navigate('/packer/qc/tasks', { state: { filter: 'pending' } }),
    },
    {
      title: 'Ready for QC',
      value: stats.ready.toString(),
      icon: PackageCheck,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-100 dark:border-blue-800/40',
      onClick: () => navigate('/packer/qc/tasks', { state: { filter: 'ready' } }),
    },
    {
      title: 'QC In Progress',
      value: stats.inProgress.toString(),
      icon: Play,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      border: 'border-orange-100 dark:border-orange-800/40',
      onClick: () => navigate('/packer/qc/active-inspection'),
    },
    {
      title: 'Passed Today',
      value: stats.completed.toString(),
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/40',
      border: 'border-green-100 dark:border-green-800/40',
      onClick: () => navigate('/packer/qc/history', { state: { status: 'passed', date: 'Today' } }),
    },
    {
      title: 'Failed Today',
      value: stats.failedToday.toString(),
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-100 dark:border-red-800/40',
      onClick: () => navigate('/packer/qc/history', { state: { status: 'failed', date: 'Today' } }),
    },
    {
      title: 'Issues Reported',
      value: stats.issues.toString(),
      icon: AlertCircle,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'border-purple-100 dark:border-purple-800/40',
      onClick: () => navigate('/packer/qc/report-issue'),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
              onClick={kpi.onClick}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xs border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-full transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.border} border`}>
                  <Icon size={20} className={kpi.color} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{kpi.value}</h3>
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">{kpi.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Active Jobs) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <div className="p-5 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Current Active Inspection</h2>
                {activeJobs.length > 0 && (
                  <span className="bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    Inspecting
                  </span>
                )}
              </div>

              {activeJobs.length > 0 ? (
                <div className="space-y-6">
                  {activeJobs.map((activeJob) => (
                    <div key={activeJob.id} className="border-b border-gray-100 dark:border-gray-700 pb-6 last:border-0 last:pb-0">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                          <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{activeJob.woNumber}</h3>
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">{activeJob.product?.name || 'Assigned Product'}</p>
                        </div>
                        <div className="flex flex-row md:flex-col gap-4 md:gap-1 text-sm font-medium">
                          <div className="flex items-center text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700">
                            <PackageCheck size={16} className="mr-2 text-green-600" />
                            Target: <span className="font-bold text-gray-800 dark:text-gray-100 ml-1">{activeJob.requiredQty} units</span>
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-gray-700">
                            <CheckCircle size={16} className="mr-2 text-blue-600" />
                            Packed: <span className="font-bold text-gray-800 dark:text-gray-100 ml-1">{activeJob.actualProduced || 0} units</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/packer/qc/active-inspection')}
                        className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-xs active:scale-95 flex items-center justify-center cursor-pointer text-xs"
                      >
                        Resume QC Inspection <ArrowRight size={16} className="ml-2" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-full mb-3">
                    <PackageCheck size={44} className="text-gray-300 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-4 text-xs">No active QC inspection in progress.</p>
                  <button
                    onClick={() => navigate('/packer/qc/tasks')}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-xs active:scale-95 text-xs cursor-pointer"
                  >
                    View Assigned QC Tasks
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Quick Actions) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/packer/qc/active-inspection')}
                className="w-full flex items-center p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700 transition-colors border border-slate-100 dark:border-gray-700 cursor-pointer group"
              >
                <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-lg mr-3 text-green-600">
                  <Play size={18} />
                </div>
                <span className="font-bold text-xs text-gray-700 dark:text-gray-200 group-hover:text-green-700 dark:group-hover:text-green-400">
                  Resume QC Inspection
                </span>
              </button>

              <button
                onClick={() => navigate('/packer/qc/tasks')}
                className="w-full flex items-center p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 transition-colors border border-slate-100 dark:border-gray-700 cursor-pointer group"
              >
                <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg mr-3 text-blue-600">
                  <PackageCheck size={18} />
                </div>
                <span className="font-bold text-xs text-gray-700 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                  My QC Tasks
                </span>
              </button>

              <button
                onClick={() => navigate('/packer/qc/report-issue')}
                className="w-full flex items-center p-3.5 bg-slate-50 dark:bg-gray-900 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 transition-colors border border-slate-100 dark:border-gray-700 cursor-pointer group"
              >
                <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg mr-3 text-red-600">
                  <AlertTriangle size={18} />
                </div>
                <span className="font-bold text-xs text-gray-700 dark:text-gray-200 group-hover:text-red-700 dark:group-hover:text-red-400">
                  Report Quality Defect / Issue
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QCDashboard;
