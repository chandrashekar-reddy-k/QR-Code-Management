// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Package, RotateCcw, Calendar, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '.././services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function ItemWiseReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickPreset, setQuickPreset] = useState('30days');
  const [searchQuery, setSearchQuery] = useState('');

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
      const res = await adminAPI.getItemReport(params);
      setReportData(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load item-wise data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId, startDate, endDate]);

  const itemsList = Array.isArray(reportData) ? reportData : [];
  const filteredItems = itemsList.filter(item => 
    (item.itemName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ReportLayout title="Item-wise Sales" icon={Package} activeTab="item-wise" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
        
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
              title="Refresh Audit"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight uppercase">Item-wise Sales Breakdown</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {startDate && endDate ? `${startDate} to ${endDate}` : 'Custom Date Range Analytics'}
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs font-medium border border-gray-200 rounded-xl outline-none focus:border-emerald-500 transition-all bg-gray-50/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Quantity Sold</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400 font-medium text-xs">
                    No item sales found for the selected date range.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, i) => (
                  <tr key={i} className="hover:bg-emerald-50/20 transition-colors text-xs">
                    <td className="px-6 py-4 font-bold text-gray-800">{item.itemName}</td>
                    <td className="px-6 py-4 font-bold text-gray-600 text-center">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase border border-blue-100">
                        {item.totalQty} Units
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 italic text-right">₹{(item.revenue || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ReportLayout>
  );
}

