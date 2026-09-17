// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Layers, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '.././services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function CategoryWiseReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getCategoryReport({ storeId });
      setReportData(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load category-wise data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Category-wise" icon={Layers} activeTab="category-wise" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight uppercase">Category Distribution</h3>
            <button onClick={fetchData} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
              <RotateCcw size={18} />
            </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orders</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.isArray(reportData) && reportData.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:bg-gray-900/50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">{item.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-600">{item.orderCount}</td>
                  <td className="px-6 py-4 text-sm font-bold text-purple-600 italic">₹{(item.totalSales || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportLayout>
  );
}
