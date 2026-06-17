// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Package, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '.././services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function ItemWiseReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getItemReport({ storeId });
      setReportData(res.data.data);
    } catch (error) {
      toast.error('Failed to load item-wise data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Item-wise Sales" icon={Package} activeTab="item-wise" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight uppercase">Item-wise Analysis</h3>
            <button onClick={fetchData} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
              <RotateCcw size={18} />
            </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity Sold</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.isArray(reportData) && reportData.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:bg-gray-900/50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">{item.itemName}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-600 dark:text-gray-400">{item.totalQty}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600 italic">₹{(item.revenue || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportLayout>
  );
}
