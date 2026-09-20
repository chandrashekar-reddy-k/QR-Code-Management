// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Printer, CheckCircle, Receipt, Calendar, Search, RotateCcw } from 'lucide-react';
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
      if (startDate) { params.startDate = startDate; params.fromDate = startDate; }
      if (endDate) { params.endDate = endDate; params.toDate = endDate; }
      const res = await adminAPI.getInvoiceReport(params);
      setReportData(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load invoice data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId, startDate, endDate]);

  const invoicesList = Array.isArray(reportData) ? reportData : [];
  const filteredInvoices = invoicesList.filter(ord => {
    const q = searchQuery.toLowerCase();
    const invId = (ord.displayId || ord.orderNumber || ord.id || '').toLowerCase();
    const cust = (ord.customerName || ord.customer?.name || '').toLowerCase();
    const mode = (ord.paymentMode || '').toLowerCase();
    return invId.includes(q) || cust.includes(q) || mode.includes(q);
  });

  const toggleExpand = (id) => {
    setExpandedInvoiceId(prev => prev === id ? null : id);
  };

  const calculateItemGST = (item) => {
    const total = Number(item.totalPrice || (item.unitPrice * item.quantity) || 0);
    const rate = Number(item.taxRate || item.gstRate || 5);
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
              title="Refresh Invoices Audit"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Receipt size={18} className="text-emerald-600" />
              Recent Invoices & GST Tax Breakdown Audit
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {startDate && endDate ? `${startDate} to ${endDate}` : 'Itemized GST calculations (Taxable Amount, GST Rate %, CGST/SGST, Total)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search invoice, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs font-medium border border-gray-200 rounded-xl outline-none focus:border-emerald-500 transition-all bg-white"
              />
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              {filteredInvoices.length} Invoices
            </div>
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
              ) : !Array.isArray(filteredInvoices) || filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 font-medium">
                    No sales invoices available.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((ord, i) => {
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
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${ord.paymentMode === 'CASH' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
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
