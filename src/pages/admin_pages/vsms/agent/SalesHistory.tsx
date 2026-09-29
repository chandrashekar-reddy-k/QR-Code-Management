// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { ordersAPI } from '../services/api';
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Calendar,
  ChevronDown,
  TrendingUp,
  CreditCard,
  Smartphone,
  Banknote,
  FileText,
  Printer,
  Download,
  Target,
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function SalesHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  // Default to today's date formatted as YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await ordersAPI.getMyHistory();
      const list = Array.isArray(data) ? data : (data?.orders || []);
      setOrders(list);
    } catch (err) {
      toast.error('Failed to load sales history from database');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for profit & margin money calculation
  const calculateItemMargin = (item) => {
    const sp = Number(item.sellingPrice ?? item.unitPrice ?? item.price ?? 0);
    const lp = Number(item.landingPrice ?? item.landing_price ?? item.product?.landingPrice ?? item.productVariant?.landingPrice ?? item.costPrice ?? 0);
    const qty = Number(item.quantity || 1);
    if (lp > 0 && sp >= lp) {
      return (sp - lp) * qty;
    }
    return (sp * 0.20) * qty; // Default fallback to 20% margin if landing price unpopulated
  };

  const calculateOrderMargin = (order) => {
    if (order.margin !== undefined && order.margin !== null) return Number(order.margin);
    if (order.profit !== undefined && order.profit !== null) return Number(order.profit);
    if (Array.isArray(order.items) && order.items.length > 0) {
      return order.items.reduce((sum, item) => sum + calculateItemMargin(item), 0);
    }
    return Number(order.totalAmount || order.amount || 0) * 0.20;
  };

  // Live filter matching
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !search ||
        (o.customerName || o.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.displayId || o.orderNumber || o.id || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.mobile || o.customer?.mobile || '').includes(search);

      const matchesStatus =
        filterStatus === 'ALL' || (o.status || '').toUpperCase() === filterStatus.toUpperCase();

      const matchesDate = !selectedDate || (() => {
        try {
          if (!o.createdAt) return false;
          const orderDateStr = format(new Date(o.createdAt), 'yyyy-MM-dd');
          return orderDateStr === selectedDate;
        } catch (e) {
          return true;
        }
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, filterStatus, selectedDate]);

  // Metrics derived strictly from the live displayed/filtered orders
  const ordersCount = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.totalAmount || o.amount || 0), 0);
  const totalMarginMoney = filteredOrders.reduce((sum, o) => sum + calculateOrderMargin(o), 0);
  const marginPercent = totalRevenue > 0 ? Math.round((totalMarginMoney / totalRevenue) * 100) : 0;

  const cashSales = filteredOrders
    .filter(o => (o.paymentMode || o.paymentMethod || 'CASH').toUpperCase() === 'CASH')
    .reduce((sum, o) => sum + Number(o.totalAmount || o.amount || 0), 0);
  const upiSales = filteredOrders
    .filter(o => (o.paymentMode || o.paymentMethod || '').toUpperCase() === 'UPI')
    .reduce((sum, o) => sum + Number(o.totalAmount || o.amount || 0), 0);
  const cardSales = filteredOrders
    .filter(o => (o.paymentMode || o.paymentMethod || '').toUpperCase() === 'CARD')
    .reduce((sum, o) => sum + Number(o.totalAmount || o.amount || 0), 0);

  const dailyTarget = 10000;
  const goalPercent = Math.min(100, Math.round((totalRevenue / dailyTarget) * 100));

  // Export filtered orders as CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('No records to export');
      return;
    }
    const headers = ['Order Number', 'Date', 'Customer', 'Status', 'Payment Mode', 'Total Amount', 'Margin'];
    const rows = filteredOrders.map(o => [
      `"${o.displayId || o.orderNumber || o.id}"`,
      `"${o.createdAt ? format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm') : ''}"`,
      `"${o.customerName || o.customer?.name || 'Walk-In'}"`,
      `"${o.status || 'COMPLETED'}"`,
      `"${o.paymentMode || 'CASH'}"`,
      Number(o.totalAmount || 0).toFixed(2),
      calculateOrderMargin(o).toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_history_${selectedDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sales history exported');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
              Sales Management
            </h1>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-[#00891D] transition-colors rounded-xl hover:bg-gray-100 cursor-pointer"
            title="Refresh from DB"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#00891D]' : ''} />
          </button>
        </div>

        {/* Daily Sales Goals Card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                <Target size={20} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400">Daily Sales Goals</p>
                <h3 className="text-sm font-black text-gray-900 leading-tight mt-0.5">
                  ₹{totalRevenue.toFixed(2)} <span className="text-xs font-semibold text-gray-400">/ ₹{dailyTarget.toLocaleString()}</span>
                </h3>
              </div>
            </div>
            <span className="text-base font-black text-[#E85D04]">{goalPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#00891D] h-full transition-all duration-500" style={{ width: `${goalPercent}%` }} />
          </div>
        </div>

        {/* 6 KPI Cards (2x3 grid) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Orders Processed */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400">Orders Processed</p>
              <h4 className="text-xl font-black text-gray-900">{ordersCount}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
              <ShoppingBag size={18} strokeWidth={2} />
            </div>
          </div>

          {/* Revenue Generated */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400">Revenue Generated</p>
              <h4 className="text-xl font-black text-gray-900">₹{totalRevenue.toFixed(2)}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#FFF3E0] text-[#E65100] flex items-center justify-center shrink-0">
              <TrendingUp size={18} strokeWidth={2} />
            </div>
          </div>

          {/* Margin Money / Net Profit */}
          <div className="bg-white rounded-3xl p-4 border border-emerald-100 shadow-2xs flex items-start justify-between bg-emerald-50/20">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-gray-500">Margin Money</p>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                  {marginPercent}% Margin
                </span>
              </div>
              <h4 className="text-xl font-black text-[#00891D]">₹{totalMarginMoney.toFixed(2)}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
              <Banknote size={18} strokeWidth={2} />
            </div>
          </div>

          {/* Cash Sales */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400">Cash Sales</p>
              <h4 className="text-xl font-black text-gray-900">₹{cashSales.toFixed(2)}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
              <Banknote size={18} strokeWidth={2} />
            </div>
          </div>

          {/* UPI */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400">UPI</p>
              <h4 className="text-xl font-black text-gray-900">₹{upiSales.toFixed(2)}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#FFF3E0] text-[#E65100] flex items-center justify-center shrink-0">
              <Smartphone size={18} strokeWidth={2} />
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400">Card</p>
              <h4 className="text-xl font-black text-gray-900">₹{cardSales.toFixed(2)}</h4>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
              <CreditCard size={18} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Sales History Header & Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">Sales History</h3>
            <span className="text-xs font-black text-[#00891D] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
              {filteredOrders.length} Records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              title="Print Sales Report"
              className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer size={15} />
            </button>
            <button
              onClick={handleExportCSV}
              title="Export as CSV"
              className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-[#00891D] transition-colors shadow-2xs cursor-pointer"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        {/* Search, Date, Status Filter Controls */}
        <div className="grid grid-cols-12 gap-2">
          {/* Search Input */}
          <div className="col-span-5 bg-white rounded-2xl p-2 px-2.5 border border-gray-200 shadow-2xs flex items-center gap-1.5">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date Picker */}
          <div className="col-span-4 bg-white rounded-2xl p-2 px-2 border border-gray-200 shadow-2xs flex items-center justify-between gap-1">
            <Calendar size={13} className="text-[#00891D] shrink-0 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-transparent text-[11px] font-extrabold text-gray-800 outline-none text-center cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                title="View All Dates"
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative col-span-3 bg-white rounded-2xl p-2 px-2.5 border border-gray-200 shadow-2xs flex items-center justify-between">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-transparent text-[11px] font-bold text-gray-700 outline-none appearance-none cursor-pointer pr-3"
            >
              <option value="ALL">Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="DELIVERED">Delivered</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDown size={13} className="text-gray-400 pointer-events-none absolute right-2" />
          </div>
        </div>

        {/* Date Filter Quick Reset Banner */}
        {selectedDate && (
          <div className="flex items-center justify-between text-xs px-1 text-gray-500">
            <span>
              Showing sales for <strong className="text-gray-800">{format(new Date(selectedDate), 'dd MMM yyyy')}</strong>
            </span>
            <button
              onClick={() => setSelectedDate('')}
              className="text-[#00891D] font-bold hover:underline cursor-pointer"
            >
              Show all dates
            </button>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-3 pt-1">
          {loading ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-2xs flex flex-col items-center justify-center space-y-2">
              <RefreshCw size={24} className="animate-spin text-[#00891D]" />
              <p className="text-xs font-bold text-gray-400">Loading sales records...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-2xs text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900">No Sales Records Found</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                  {orders.length === 0
                    ? "You haven't recorded any sales yet. Create your first sale from the Sales Grid."
                    : "No orders match your selected filters. Try clearing the date or status filter."}
                </p>
              </div>
              {orders.length > 0 ? (
                <button
                  onClick={() => { setSearch(''); setSelectedDate(''); setFilterStatus('ALL'); }}
                  className="px-3.5 py-1.5 bg-[#E8F5E9] text-[#00891D] rounded-xl text-xs font-black cursor-pointer hover:bg-emerald-100 transition-all"
                >
                  Clear all filters
                </button>
              ) : (
                <button
                  onClick={() => navigate('/vsms/agent-portal/sales')}
                  className="px-4 py-2 bg-[#00891D] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#007017] transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  Open Sales Grid
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map((order, idx) => {
              const custName = order.customerName || order.customer?.name || 'Walk-In';
              const displayId = order.displayId || order.orderNumber || order.id || `ORD-${order.id?.slice(0, 8)}`;
              const dateStr = order.createdAt
                ? format(new Date(order.createdAt), 'dd MMM, HH:mm').toUpperCase()
                : 'RECENT';
              const orderMargin = calculateOrderMargin(order);

              return (
                <div
                  key={order.id || idx}
                  onClick={() => navigate(`/vsms/agent-portal/order/${order.id}`)}
                  className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  {/* Left Green Shopping Bag Icon */}
                  <div className="w-10 h-10 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                    <ShoppingBag size={20} strokeWidth={2} />
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h4 className="text-sm font-black text-gray-900 truncate">
                      {custName}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-400 truncate">
                      #{displayId}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400">
                      <Calendar size={11} />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Right Side: Status Badge, Price & Margin Money */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-black text-[#00891D] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full uppercase">
                        {order.status || 'COMPLETED'}
                      </span>
                      <span className="text-base font-black text-gray-900">
                        ₹{Math.round(order.totalAmount || order.amount || 0)}
                      </span>
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        Margin: +₹{orderMargin.toFixed(2)}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 shrink-0 ml-0.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
