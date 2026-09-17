// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Printer, CheckCircle, Receipt } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function InvoiceReport() {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getInvoiceReport({ storeId });
      setReportData(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load invoice data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  const toggleExpand = (id) => {
    setExpandedInvoiceId(prev => prev === id ? null : id);
  };

  const calculateItemGST = (item) => {
    const total = Number(item.totalPrice || (item.unitPrice * item.quantity) || 0);
    const rate = Number(item.taxRate || item.gstRate || 5); // default 5% GST if unassigned
    const taxable = rate > 0 ? (total / (1 + rate / 100)) : total;
    const gstAmt = total - taxable;
    const halfTax = gstAmt / 2;
    return {
      rate,
      taxableAmount: Math.round(taxable * 100) / 100,
      gstAmount: Math.round(gstAmt * 100) / 100,
      cgst: Math.round(halfTax * 100) / 100,
      sgst: Math.round(halfTax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  };

  return (
    <ReportLayout title="Invoice & GST Report" icon={FileText} activeTab="invoices" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Receipt size={18} className="text-emerald-600" />
              Recent Invoices & GST Tax Breakdown Audit
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Itemized GST calculations (Taxable Amount, GST Rate %, CGST/SGST, Total)</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider self-start sm:self-auto">
            {Array.isArray(reportData) ? reportData.length : 0} Invoices Loaded
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Taxable Amount</th>
                <th className="py-3 px-4 text-right">GST Amount</th>
                <th className="py-3 px-4 text-right">Total Invoice</th>
                <th className="py-3 px-4 text-center">Payment Mode</th>
                <th className="py-3 px-4 text-center">GST Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 font-medium">
                    Loading invoices...
                  </td>
                </tr>
              ) : !Array.isArray(reportData) || reportData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 font-medium">
                    No sales invoices available.
                  </td>
                </tr>
              ) : (
                reportData.map((ord, i) => {
                  const isExpanded = expandedInvoiceId === (ord.id || i);
                  
                  // Calculate order level GST totals
                  let orderTaxable = 0;
                  let orderGST = 0;
                  (ord.items || []).forEach(item => {
                    const gstInfo = calculateItemGST(item);
                    orderTaxable += gstInfo.taxableAmount;
                    orderGST += gstInfo.gstAmount;
                  });

                  if (orderTaxable === 0) {
                    const totalAmt = ord.totalAmount || 0;
                    orderTaxable = Math.round((totalAmt / 1.05) * 100) / 100;
                    orderGST = Math.round((totalAmt - orderTaxable) * 100) / 100;
                  }

                  return (
                    <React.Fragment key={ord.id || i}>
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-emerald-700">{ord.displayId || ord.orderNumber || ord.id}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{ord.customerName || ord.customer?.name || 'Walk-in Customer'}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-700">{(ord.items || []).length}</td>
                        <td className="py-3 px-4 text-right text-gray-700 font-medium">₹{orderTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-medium">₹{orderGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right font-black text-gray-900">₹{(ord.totalAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            ord.paymentMode === 'CASH' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ord.paymentMode || 'POS'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggleExpand(ord.id || i)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                          >
                            <span>{isExpanded ? 'Hide GST' : 'View GST'}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Itemized Tax Breakdown */}
                      {isExpanded && (
                        <tr className="bg-emerald-50/30">
                          <td colSpan={9} className="p-4">
                            <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm space-y-4">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText size={14} className="text-emerald-600" />
                                  Item-Level GST Tax Breakdown (Invoice #{ord.displayId || ord.orderNumber})
                                </h4>
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                  CGST + SGST Split Applied
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                      <th className="py-2 px-3">Item Description</th>
                                      <th className="py-2 px-3 text-center">Qty</th>
                                      <th className="py-2 px-3 text-right">Unit Price (₹)</th>
                                      <th className="py-2 px-3 text-right">Taxable Amount (₹)</th>
                                      <th className="py-2 px-3 text-center">GST Rate (%)</th>
                                      <th className="py-2 px-3 text-right">CGST (₹)</th>
                                      <th className="py-2 px-3 text-right">SGST (₹)</th>
                                      <th className="py-2 px-3 text-right">GST Amount (₹)</th>
                                      <th className="py-2 px-3 text-right">Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {(ord.items || []).map((item, idx) => {
                                      const gst = calculateItemGST(item);
                                      return (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                          <td className="py-2 px-3 font-semibold text-gray-900">{item.productName || item.name || 'Product Item'}</td>
                                          <td className="py-2 px-3 text-center font-bold text-gray-800">{item.quantity}</td>
                                          <td className="py-2 px-3 text-right text-gray-700">₹{Number(item.unitPrice || item.price || 0).toLocaleString()}</td>
                                          <td className="py-2 px-3 text-right text-gray-900 font-medium">₹{gst.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                          <td className="py-2 px-3 text-center font-bold text-emerald-700">{gst.rate}%</td>
                                          <td className="py-2 px-3 text-right text-gray-600">₹{gst.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                          <td className="py-2 px-3 text-right text-gray-600">₹{gst.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                          <td className="py-2 px-3 text-right text-emerald-700 font-semibold">₹{gst.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                          <td className="py-2 px-3 text-right font-bold text-gray-900">₹{gst.total.toLocaleString()}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-emerald-50/60 font-bold text-xs text-gray-900">
                                      <td colSpan={3} className="py-2.5 px-3 uppercase text-emerald-900">Summary Totals</td>
                                      <td className="py-2.5 px-3 text-right text-gray-900">₹{orderTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2.5 px-3 text-center text-emerald-800">-</td>
                                      <td className="py-2.5 px-3 text-right text-emerald-900">₹{(orderGST / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2.5 px-3 text-right text-emerald-900">₹{(orderGST / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2.5 px-3 text-right text-emerald-800">₹{orderGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2.5 px-3 text-right text-gray-900">₹{(ord.totalAmount || 0).toLocaleString()}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ReportLayout>
  );
}
