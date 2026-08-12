import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { qualityCheckService, QCRecord } from '../../../api/packing/qualityCheckService';
import { getQCUser } from './qcAuth';
import { Search, Filter, History, Clock, CheckCircle, XCircle, PauseCircle, ArrowRight, X } from 'lucide-react';

export const QCHistory: React.FC = () => {
  const { id: routeQcId } = useParams<{ id?: string }>();
  const user = getQCUser();

  const [records, setRecords] = useState<QCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<QCRecord | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterResult, setFilterResult] = useState('All');
  const [filterDate, setFilterDate] = useState('All');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await qualityCheckService.getQualityChecks({ inspectorId: user.id });
      const list = response.data || [];
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecords(list);

      if (routeQcId) {
        const found = list.find((r) => r.id === routeQcId || r.woId === routeQcId);
        if (found) setSelectedRecord(found);
      }
    } catch (err) {
      console.error('Failed to fetch QC history', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((rec) => {
    const searchLower = search.toLowerCase();
    const woNum = rec.workOrder?.woNumber || '';
    const prodName = rec.workOrder?.product?.name || '';
    const batchNo = rec.workOrder?.batchNumber || '';

    const matchesSearch =
      rec.qcNumber?.toLowerCase().includes(searchLower) ||
      woNum.toLowerCase().includes(searchLower) ||
      prodName.toLowerCase().includes(searchLower) ||
      batchNo.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    if (filterResult !== 'All') {
      if (filterResult === 'PASS' && rec.result !== 'PASS' && rec.result !== 'PARTIAL_PASS') return false;
      if (filterResult === 'FAIL' && rec.result !== 'REJECT' && rec.result !== 'REWORK' && rec.result !== 'DISCARD') return false;
      if (filterResult === 'HOLD' && rec.result !== 'HOLD') return false;
    }

    if (filterDate !== 'All' && rec.createdAt) {
      const now = new Date();
      const recDate = new Date(rec.createdAt);
      if (filterDate === 'Today' && recDate.toDateString() !== now.toDateString()) return false;
      if (filterDate === 'This Week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (recDate < weekAgo) return false;
      }
      if (filterDate === 'This Month') {
        if (recDate.getMonth() !== now.getMonth() || recDate.getFullYear() !== now.getFullYear()) return false;
      }
    }

    return true;
  });

  const getResultBadge = (result: string) => {
    if (result === 'PASS' || result === 'PARTIAL_PASS') {
      return (
        <span className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
          <CheckCircle size={12} /> PASS
        </span>
      );
    }
    if (result === 'HOLD') {
      return (
        <span className="bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-200 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
          <PauseCircle size={12} /> QC HOLD
        </span>
      );
    }
    return (
      <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
        <XCircle size={12} /> FAIL ({result})
      </span>
    );
  };

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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">QC Inspection History</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Read-only record of quality inspections performed by {user.name}.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search QC ID, WO, Product, Batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:ring-1 focus:ring-green-500 focus:outline-none shadow-xs"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
            showFilters || filterResult !== 'All' || filterDate !== 'All'
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
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Inspection Result</label>
            <div className="flex flex-wrap gap-2">
              {['All', 'PASS', 'FAIL', 'HOLD'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilterResult(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    filterResult === opt
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
        </div>
      )}

      {/* Record List */}
      {filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700">
          <History className="text-gray-300 dark:text-gray-500 mb-3" size={44} />
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">No QC history found.</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Completed QC inspections will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecords.map((rec) => (
            <div key={rec.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-black text-gray-800 dark:text-gray-100 text-base tracking-tight">
                      {rec.workOrder?.woNumber || `QC-${rec.id.substring(0, 6)}`}
                    </h3>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{rec.workOrder?.product?.name || 'Product'}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">Batch: {rec.workOrder?.batchNumber || 'N/A'}</p>
                  </div>
                  {getResultBadge(rec.result)}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-50 dark:bg-gray-900 p-3 rounded-xl border border-slate-100 dark:border-gray-700 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Checked Qty</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100">{rec.checkedQty || 0} units</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Inspector</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                  </div>
                  <div className="col-span-2 border-t border-slate-200 dark:border-gray-700 mt-1 pt-2 flex justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center">
                        <Clock size={10} className="mr-1" /> Inspected On
                      </p>
                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100">
                        {new Date(rec.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(rec)}
                className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2 rounded-xl hover:bg-slate-100 text-xs flex items-center justify-center cursor-pointer"
              >
                View QC Record <ArrowRight size={14} className="ml-1.5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                QC Record #{selectedRecord.qcNumber || selectedRecord.id.substring(0, 8)}
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-gray-900 p-4 rounded-xl border border-slate-100 dark:border-gray-700">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Work Order</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedRecord.workOrder?.woNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Result</span>
                  <div>{getResultBadge(selectedRecord.result)}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Product</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedRecord.workOrder?.product?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Checked Qty</span>
                  <p className="font-bold text-gray-800 dark:text-white">{selectedRecord.checkedQty} units</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Remarks</span>
                  <p className="font-medium text-gray-800 dark:text-white">{selectedRecord.remarks || 'No remarks recorded.'}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedRecord(null)}
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

export default QCHistory;
