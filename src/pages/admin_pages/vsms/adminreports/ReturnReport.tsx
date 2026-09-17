// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function ReturnReport() {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getReturnReport({ storeId });
      setReportData(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load return data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Return Report" icon={RotateCcw} activeTab="returns" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Returned Qty</th>
                <th className="py-3 px-4 text-right">Return Amount</th>
                <th className="py-3 px-4 text-center">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                    Loading product return audit...
                  </td>
                </tr>
              ) : !Array.isArray(reportData) || reportData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                    No returns recorded.
                  </td>
                </tr>
              ) : (
                reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-700">{r.order?.displayId || r.order?.orderNumber || r.orderId || 'N/A'}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{r.product?.name || r.productName || 'Product'}</td>
                    <td className="py-3 px-4 text-center font-bold text-rose-600">-{r.quantity}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">₹{(r.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-center text-gray-500">
                      {r.createdAt ? format(new Date(r.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                    </td>
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
