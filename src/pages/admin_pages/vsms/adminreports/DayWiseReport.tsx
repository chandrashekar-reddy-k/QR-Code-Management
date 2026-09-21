// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Calendar, RotateCcw, ChevronRight, ArrowLeft, Package, Search, FileDown, TrendingUp, Filter } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '.././services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';
import * as XLSX from 'xlsx';

export default function DayWiseReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickPreset, setQuickPreset] = useState('30days');

  // Detailed View State
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailedData, setDetailedData] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');

  const handleQuickPreset = (preset) => {
    setQuickPreset(preset);
    const today = new Date();
    const formatDateStr = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const dStr = formatDateStr(today);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'yesterday') {
      const yest = new Date();
      yest.setDate(today.getDate() - 1);
      const dStr = formatDateStr(yest);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      setStartDate(formatDateStr(past));
      setEndDate(formatDateStr(today));
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 29);
      setStartDate(formatDateStr(past));
      setEndDate(formatDateStr(today));
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = { storeId };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await adminAPI.getDailyReport(params);
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load day-wise data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetailedData = async (date) => {
    setSelectedDate(date);
    setIsDetailLoading(true);
    try {
      const res = await adminAPI.getDayDetailedSales({ date, storeId });
      setDetailedData(res.data);
    } catch (error) {
      toast.error('Failed to load detailed sales');
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId, startDate, endDate]);

  const exportDetailedToExcel = () => {
    if (!detailedData.length) return;
    const ws = XLSX.utils.json_to_sheet(detailedData.map(item => ({
      'Product Name': item.name,
      'SKU': item.sku,
      'Category': item.category,
      'Quantity Sold': item.quantity,
      'Total Revenue': item.revenue,
      'Total Profit': item.profit
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Day_Detailed_Sales");
    XLSX.writeFile(wb, `Sales_Report_${selectedDate}.xlsx`);
  };

  const filteredDetailed = detailedData.filter(item => 
    item.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
    item.sku.toLowerCase().includes(detailSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(detailSearch.toLowerCase())
  );

  const listData = React.useMemo(() => {
    if (!reportData) return [];
    if (Array.isArray(reportData)) return reportData;
    if (Array.isArray(reportData.data)) return reportData.data;
    if (Array.isArray(reportData.trends)) return reportData.trends;
    return [];
  }, [reportData]);

  return (
    <ReportLayout title="Day-wise Sales" icon={Calendar} activeTab="day-wise" reportData={reportData} isLoading={isLoading}>
      <div>
        {!selectedDate ? (
          <div 
            key="summary"
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4"
          >
            {/* Custom Date Range Filter Bar */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <span className="text-xs font-bold text-gray-500 mr-1 uppercase">Quick Range:</span>
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: '30days', label: 'Last 30 Days' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickPreset(p.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      quickPreset === p.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1 shadow-2xs">
                  <Calendar size={14} className="text-emerald-600" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setQuickPreset('custom'); setStartDate(e.target.value); }}
                    className="text-xs font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setQuickPreset('custom'); setEndDate(e.target.value); }}
                    className="text-xs font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
                <button 
                  onClick={fetchData} 
                  className="p-2 rounded-xl bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-xs border border-gray-200 cursor-pointer"
                  title="Refresh Sales Audit"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            <div className="px-6 pt-2 pb-4 flex justify-between items-center border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight uppercase">Daily Revenue Audit</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {startDate && endDate ? `${startDate} to ${endDate}` : 'Custom Date Sales Performance'}
                    </p>
                  </div>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date / Session</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Volume</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Net Revenue</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Gross Profit</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Insights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                        No sales records found for selected date range.
                      </td>
                    </tr>
                  ) : (
                    listData.map((item, i) => (
                      <tr 
                        key={i} 
                        className="transition-all group cursor-pointer hover:bg-emerald-50/20 text-xs" 
                        onClick={() => fetchDetailedData(item.rawDate || item.date)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                              <Calendar size={16} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-800">{item.date}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Business Day</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-tight border border-blue-100">{item.orders || item.totalOrders || 0} Orders</span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-700 italic">₹{(item.revenue || item.grandTotal || item.totalSales || 0).toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-700">₹{(item.profit || item.totalProfit || 0).toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end text-emerald-600 opacity-0 group-hover:opacity-100 transition-all">
                            <span className="text-[10px] font-bold uppercase tracking-widest mr-2">Detailed Audit</span>
                            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                              <ChevronRight size={14} strokeWidth={3} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div 
            key="details"
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-900/50 transition-all shadow-sm group"
              >
                <ArrowLeft size={18} className="text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-widest">Back to Overview</span>
              </button>

              <div className="flex items-center gap-3">
                 <button 
                  onClick={exportDetailedToExcel}
                  className="flex items-center gap-3 px-7 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                 >
                   <FileDown size={20} />
                   <span className="text-xs font-bold uppercase tracking-widest">Export Detailed XLSX</span>
                 </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden relative">
              <div className="p-10 border-b border-gray-200 bg-gray-50 dark:bg-gray-900/50/30 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-200 animate-pulse-subtle">
                    <Package size={36} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tighter uppercase leading-tight">Product Performance</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest">
                        Audit Log: {selectedDate}
                      </div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-2">
                        • {detailedData.length} Unique SKUs Sold
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by product name, SKU or category..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-4.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all shadow-inner placeholder:text-gray-300"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-200">
                    <Filter size={18} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50/50">
                      <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Intelligence</th>
                      <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Categorization</th>
                      <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Unit Volume</th>
                      <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Net Revenue</th>
                      <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Profit & Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isDetailLoading ? (
                      <tr>
                        <td colSpan="5" className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center gap-6">
                            <div className="w-16 h-16 border-4 border-emerald-50 border-t-emerald-600 rounded-full animate-spin shadow-inner" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] animate-pulse">Assembling Daily Data Stream...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDetailed.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <Search size={48} className="text-gray-400" />
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No products match your criteria</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDetailed.map((item, i) => (
                      <tr 
                        key={i} 
                        className="hover:bg-emerald-50/10 transition-colors"
                      >
                        <td className="px-10 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-1">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded tracking-widest">SKU: {item.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className="px-3 py-1 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-wider">{item.category}</span>
                        </td>
                        <td className="px-10 py-6 text-center">
                           <div className="flex flex-col items-center">
                              <span className="text-sm font-bold text-gray-800">{item.quantity}</span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Units Dispatched</span>
                           </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className="text-sm font-bold text-emerald-600 italic">₹{(item.revenue || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <div className="flex flex-col items-end">
                              <span className="text-sm font-bold text-emerald-600">₹{(item.profit || 0).toLocaleString()}</span>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 mt-1 uppercase">
                                 <TrendingUp size={12} strokeWidth={3} />
                                 {Math.round((item.profit / item.revenue) * 100)}% ROI
                              </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
