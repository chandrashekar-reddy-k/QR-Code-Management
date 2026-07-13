// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '.././services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function SessionReport() {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getSessionReport({ storeId });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Session Report" icon={Zap} activeTab="sessions" reportData={reportData} isLoading={isLoading}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
          {Array.isArray(reportData) && reportData.map((s, i) => (
              <div key={i} className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-32 h-32 ${s.session === 'MORNING' ? 'bg-emerald-50' : 'bg-emerald-50'} rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110`} />
                  <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-lg ${s.session === 'MORNING' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-emerald-600 shadow-emerald-200'} shadow-lg flex items-center justify-center text-white mb-6`}>
                          <Zap size={28} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter mb-1 uppercase">{s.session} SESSION</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Service Analytics</p>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400 uppercase">Total Sales</span><span className="text-lg font-bold text-gray-900 dark:text-white italic">₹{(s.totalSales || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-400 uppercase">Orders</span><span className="text-lg font-bold text-gray-900 dark:text-white italic">{s.orderCount}</span></div>
                      </div>
                  </div>
              </div>
          ))}
      </div>
    </ReportLayout>
  );
}
