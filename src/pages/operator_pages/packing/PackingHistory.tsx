import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { workOrderService, WorkOrder } from '../../../api/packing/workOrderService';
import { getOperatorUser } from './operatorAuth';
import { Search, Filter, History, Clock, CheckCircle, AlertTriangle, ArrowRight, X } from 'lucide-react';

export const PackingHistory: React.FC = () => {
  const { id: routeJobId } = useParams<{ id?: string }>();
  const user = getOperatorUser();

  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistoryJob, setSelectedHistoryJob] = useState<WorkOrder | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState('All');
  const [filterSla, setFilterSla] = useState('All');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await workOrderService.getWorkOrders({ operatorId: user.id });
      // Keep completed jobs or jobs past packing phase
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

      const completedJobs = (response.data || []).filter(
        (wo) =>
          (!wo.operatorId || wo.operatorId === user.id) &&
          (completedStatuses.includes(wo.status) || wo.completedAt != null)
      );

      completedJobs.sort(
        (a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime()
      );
      setJobs(completedJobs);

      if (routeJobId) {
        const found = completedJobs.find((j) => j.id === routeJobId);
        if (found) setSelectedHistoryJob(found);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      job.woNumber.toLowerCase().includes(searchLower) ||
      (job.product?.name || '').toLowerCase().includes(searchLower) ||
      (job.batchNumber || '').toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    const expected = job.expectedDate ? job.expectedDate.substring(0, 10) : '';
    const completed = job.completedAt ? job.completedAt.substring(0, 10) : '';
    const isOnTime = !expected || completed <= expected;
    if (filterSla === 'On Time' && !isOnTime) return false;
    if (filterSla === 'Delayed' && isOnTime) return false;

    if (filterDate !== 'All' && job.completedAt) {
      const now = new Date();
      const jobDate = new Date(job.completedAt);
      if (filterDate === 'Today' && jobDate.toDateString() !== now.toDateString()) return false;
      if (filterDate === 'This Week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (jobDate < weekAgo) return false;
      }
      if (filterDate === 'This Month') {
        if (jobDate.getMonth() !== now.getMonth() || jobDate.getFullYear() !== now.getFullYear()) return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Packing History</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Read-only history of your completed packing jobs.</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search WO, Product, Batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:ring-1 focus:ring-green-500 focus:outline-none shadow-xs"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
            showFilters || filterDate !== 'All' || filterSla !== 'All'
              ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xs">Filter History</h3>
            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Date Range</label>
            <div className="flex flex-wrap gap-2">
              {['All', 'Today', 'This Week', 'This Month'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilterDate(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    filterDate === opt
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-slate-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">SLA Status</label>
            <div className="flex flex-wrap gap-2">
              {['All', 'On Time', 'Delayed'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilterSla(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    filterSla === opt
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-slate-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Job List */}
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700">
          <History className="text-gray-300 dark:text-gray-500 mb-3" size={44} />
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">No completed packing history.</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Completed packing jobs will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => {
            const expectedDate = job.expectedDate ? job.expectedDate.substring(0, 10) : '';
            const completedDateStr = job.completedAt ? job.completedAt.substring(0, 10) : '';
            const isDelayed = expectedDate && completedDateStr > expectedDate;
            const started = job.startedAt ? new Date(job.startedAt).getTime() : new Date(job.createdAt).getTime();
            const completed = job.completedAt ? new Date(job.completedAt).getTime() : new Date(job.updatedAt).getTime();
            const isOnTime = !isDelayed;
            const durationMins = Math.max(1, Math.round((completed - started) / 60000));
            const durationText = durationMins > 60 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : `${durationMins}m`;

            return (
              <div key={job.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-gray-800 dark:text-gray-100 text-base tracking-tight">{job.woNumber}</h3>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{job.product?.name || 'Product'}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">Batch: {job.batchNumber || 'N/A'}</p>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center border ${
                        isOnTime
                          ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200'
                      }`}
                    >
                      {isOnTime ? <CheckCircle size={10} className="mr-1" /> : <AlertTriangle size={10} className="mr-1" />}
                      {isOnTime ? 'On Time' : 'Delayed'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 dark:bg-gray-900 p-3 rounded-xl border border-slate-100 dark:border-gray-700 text-xs">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Packed</p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">{job.actualProduced || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Rejected</p>
                      <p className="font-bold text-gray-800 dark:text-gray-100">{job.actualRejected || 0}</p>
                    </div>
                    <div className="col-span-2 border-t border-slate-200 dark:border-gray-700 mt-1 pt-2 flex justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center">
                          <Clock size={10} className="mr-1" /> Completed On
                        </p>
                        <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100">
                          {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : new Date(job.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Duration</p>
                        <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100">{durationText}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedHistoryJob(job)}
                  className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2 rounded-xl hover:bg-slate-100 text-xs flex items-center justify-center cursor-pointer"
                >
                  View Record <ArrowRight size={14} className="ml-1.5 text-gray-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedHistoryJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Packing Record #{selectedHistoryJob.woNumber}</h3>
              <button onClick={() => setSelectedHistoryJob(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-100 dark:border-gray-700">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Product</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedHistoryJob.product?.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Batch</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedHistoryJob.batchNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Target Qty</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedHistoryJob.requiredQty}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Produced</span>
                  <p className="font-bold text-green-600">{selectedHistoryJob.actualProduced || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Rejected</span>
                  <p className="font-bold text-red-600">{selectedHistoryJob.actualRejected || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedHistoryJob.status}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedHistoryJob(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold"
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

export default PackingHistory;
