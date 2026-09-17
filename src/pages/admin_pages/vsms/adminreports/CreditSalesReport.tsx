// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Clock, CheckCircle2, RefreshCw, Search, Edit3, X, Check, PieChart } from 'lucide-react';
import { adminAPI } from '../services/adminService';

export default function CreditSalesReport() {
  const [data, setData] = useState({ summary: null, orders: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for Payment Status Update
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [targetStatus, setTargetStatus] = useState('PAID');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await adminAPI.getCreditSalesReport(params);
      if (res.data) {
        setData({
          summary: res.data.summary || null,
          orders: res.data.orders || []
        });
      }
    } catch (err) {
      console.error('Error fetching credit sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, statusFilter]);

  const handleOpenUpdateModal = (order) => {
    setSelectedOrder(order);
    setTargetStatus(order.paymentStatus === 'PAID' ? 'PAID' : (order.pendingBalance > 0 && order.paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING'));
    setPaymentAmount('');
    setPaymentMode('CASH');
    setUpdateMessage('');
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setUpdateMessage('');
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setUpdating(true);
      setUpdateMessage('');

      const payload = {
        paymentStatus: targetStatus,
        additionalPayment: paymentAmount ? Number(paymentAmount) : 0,
        paymentMode
      };

      await adminAPI.updateCreditPaymentStatus(selectedOrder.id, payload);
      setUpdateMessage('Payment status updated successfully!');
      setTimeout(() => {
        handleCloseModal();
        fetchReport();
      }, 1000);
    } catch (err) {
      console.error('Failed to update credit payment status:', err);
      setUpdateMessage(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = (data.orders || []).filter(order =>
    order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <CreditCard size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base sm:text-lg">POS Credit Sales & Payment Status</h2>
            <p className="text-xs text-gray-500">Track POS credit bills, update payment statuses (Pending, Partially Paid, Paid), and collect dues</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-gray-700"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PENDING">Pending Dues</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid (Settled)</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <button
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      {data.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Credit Sales</span>
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-gray-900">₹{data.summary.totalCreditSalesRevenue?.toLocaleString('en-IN')}</div>
            <div className="text-xs text-gray-500 mt-1">{data.summary.totalCreditOrders} credit orders total</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Dues</span>
              <Clock size={18} className="text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-900">₹{data.summary.totalPendingCredit?.toLocaleString('en-IN')}</div>
            <div className="text-xs text-amber-700 font-medium mt-1">Outstanding unpaid balance</div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Partially Paid Collected</span>
              <PieChart size={18} className="text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-900">₹{(data.summary.totalPartiallyPaidCredit || 0)?.toLocaleString('en-IN')}</div>
            <div className="text-xs text-blue-700 font-medium mt-1">Partial installments received</div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Settled Revenue</span>
              <CheckCircle2 size={18} className="text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900">₹{data.summary.totalSettledCredit?.toLocaleString('en-IN')}</div>
            <div className="text-xs text-purple-700 font-medium mt-1">Fully paid & cleared bills</div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by Order #, Customer Name, or Phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        />
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Customer Name</th>
              <th className="py-3 px-4">Phone Number</th>
              <th className="py-3 px-4 text-center">Items</th>
              <th className="py-3 px-4 text-right">Total Bill</th>
              <th className="py-3 px-4 text-right">Paid Amount</th>
              <th className="py-3 px-4 text-right">Pending Dues</th>
              <th className="py-3 px-4 text-center">Payment Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-400 font-medium">
                  Loading credit sales transactions...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-400 font-medium">
                  No POS credit transactions found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-emerald-700">{order.orderNumber}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{order.customerName}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">{order.customerPhone}</td>
                  <td className="py-3 px-4 text-center font-bold text-gray-800">{order.itemCount}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">₹{order.totalAmount?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-medium">₹{order.paidAmount?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-bold text-amber-700">₹{order.pendingBalance?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      order.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.paymentStatus === 'PARTIALLY_PAID'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {order.paymentStatus === 'PAID'
                        ? 'PAID'
                        : order.paymentStatus === 'PARTIALLY_PAID'
                        ? 'PARTIALLY PAID'
                        : 'PENDING'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenUpdateModal(order)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      <Edit3 size={12} />
                      <span>Update</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Update Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                <CreditCard size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Update Credit Payment Status</h3>
                <p className="text-xs text-gray-500">Order: #{selectedOrder.orderNumber} • {selectedOrder.customerName}</p>
              </div>
            </div>

            {/* Bill Info Breakdown */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
              <div>
                <div className="text-[10px] text-gray-500 font-semibold uppercase">Total Bill</div>
                <div className="text-sm font-bold text-gray-900">₹{selectedOrder.totalAmount}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-700 font-semibold uppercase">Paid</div>
                <div className="text-sm font-bold text-emerald-700">₹{selectedOrder.paidAmount}</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-700 font-semibold uppercase">Pending Dues</div>
                <div className="text-sm font-bold text-amber-700">₹{selectedOrder.pendingBalance}</div>
              </div>
            </div>

            <form onSubmit={handleUpdatePayment} className="space-y-4">
              {/* Payment Status Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Payment Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-gray-800"
                >
                  <option value="PENDING">Pending (Unpaid)</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PAID">Paid (Fully Settled)</option>
                </select>
              </div>

              {/* Record Payment Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Collect Payment Amount (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder={`Max pending: ₹${selectedOrder.pendingBalance}`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0"
                  max={selectedOrder.pendingBalance}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* Payment Mode */}
              {paymentAmount > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CASH')}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                        paymentMode === 'CASH'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      Cash Collection
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('UPI')}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                        paymentMode === 'UPI'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      UPI / QR
                    </button>
                  </div>
                </div>
              )}

              {updateMessage && (
                <div className={`p-2.5 rounded-xl text-xs font-medium ${
                  updateMessage.includes('successfully') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {updateMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200 disabled:opacity-50"
                >
                  {updating ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
