// @ts-nocheck
import { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Calendar,
  ChevronDown,
  TrendingUp,
  Package,
  CreditCard,
  Smartphone,
  Banknote,
  DollarSign,
  FileText,
  Printer,
  Download,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function SalesHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('11-08-2026');
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await ordersAPI.getMyHistory();
      setOrders(data || []);
    } catch (err) {
      toast.error('Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.displayId?.toLowerCase().includes(search.toLowerCase()) ||
      o.mobile?.includes(search);

    const matchesStatus =
      filterStatus === 'ALL' || o.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const displayOrders = filteredOrders.length > 0 ? filteredOrders : [
    { id: '1', customerName: 'Walk-In', displayId: 'VK-AP-HUB-ORD-12626', createdAt: new Date().toISOString(), totalAmount: 261.00, status: 'COMPLETED' },
    { id: '2', customerName: 'Walk-In', displayId: 'VK-AP-HUB-ORD-10845', createdAt: new Date().toISOString(), totalAmount: 261.00, status: 'COMPLETED' },
    { id: '3', customerName: 'Walk-In', displayId: 'VK-AP-HUB-ORD-09823', createdAt: new Date().toISOString(), totalAmount: 145.00, status: 'COMPLETED' },
  ];

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
            Sales Management
          </h1>
        </div>

        {/* Daily Sales Goals Card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
                <Target size={20} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400">Daily Sales Goals</p>
                <h3 className="text-sm font-black text-gray-900 leading-tight mt-0.5">
                  ₹0.00 <span className="text-[10px] font-semibold text-gray-400">/ ₹10,000</span>
                </h3>
              </div>
            </div>
            <span className="text-sm font-black text-[#E85D04]">0%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#00891D] h-full w-[2%]" />
          </div>
        </div>

        {/* 6 KPI Cards (2x3 grid) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Orders Processed */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400">Orders Processed</p>
              <h4 className="text-base font-black text-gray-900 mt-1">245</h4>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#00891D] flex items-center justify-center">
              <Package size={14} />
            </div>
          </div>

          {/* Revenue Generated */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400">Revenue Generated</p>
              <h4 className="text-base font-black text-gray-900 mt-1">₹0.00</h4>
            </div>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#E85D04] flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400">Net Profit</p>
              <h4 className="text-base font-black text-gray-900 mt-1">₹0.00</h4>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
              <Banknote size={14} />
            </div>
          </div>

          {/* Cash Sales */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400">Cash Sales</p>
              <h4 className="text-base font-black text-gray-900 mt-1">₹0.00</h4>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#00891D] flex items-center justify-center">
              <DollarSign size={14} />
            </div>
          </div>

          {/* UPI */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400">UPI</p>
              <h4 className="text-base font-black text-gray-900 mt-1">₹0.00</h4>
            </div>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#E85D04] flex items-center justify-center">
              <Smartphone size={14} />
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400">Card</p>
              <h4 className="text-base font-black text-gray-900 mt-1">₹0.00</h4>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#00891D] flex items-center justify-center">
              <CreditCard size={14} />
            </div>
          </div>
        </div>

        {/* Sales History Header & Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-gray-900 tracking-tight">Sales History</h3>
            <span className="text-[9px] font-bold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              100 Records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-600">
              <FileText size={12} />
            </button>
            <button className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-600">
              <Printer size={12} />
            </button>
            <button className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-600">
              <Download size={12} />
            </button>
          </div>
        </div>

        {/* Search, Date, Status Filter Controls */}
        <div className="grid grid-cols-12 gap-2">
          {/* Search Input */}
          <div className="col-span-5 bg-white rounded-2xl p-2 px-3 border border-gray-200 shadow-sm flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[11px] font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
            />
          </div>

          {/* Date Picker Pill */}
          <div className="col-span-4 bg-white rounded-2xl p-2 px-2.5 border border-gray-200 shadow-sm flex items-center justify-between gap-1">
            <Calendar size={13} className="text-[#00891D] shrink-0" />
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-transparent text-[10px] font-bold text-gray-800 outline-none text-center"
            />
          </div>

          {/* Status Dropdown */}
          <div className="col-span-3 bg-white rounded-2xl p-2 px-2.5 border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer">
            <span className="text-[10px] font-bold text-gray-700">Status</span>
            <ChevronDown size={13} className="text-gray-400" />
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-2.5 pt-1">
          {displayOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/vsms/agent-portal/order/${order.id}`)}
              className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
            >
              {/* Left Green Shopping Bag Icon */}
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
                <ShoppingBag size={18} />
              </div>

              {/* Order Info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <h4 className="text-xs font-extrabold text-gray-900 truncate">
                  {order.customerName || 'Walk-In'}
                </h4>
                <p className="text-[9px] font-medium text-gray-400 truncate">
                  #{order.displayId || 'VK-AP-HUB-ORD-12626'}
                </p>
                <div className="flex items-center gap-1 text-[8px] font-medium text-gray-400">
                  <Calendar size={10} />
                  <span>08 AUG, 07:21</span>
                </div>
              </div>

              {/* Right Side: Completed Badge & Price */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[8px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {order.status || 'COMPLETED'}
                  </span>
                  <span className="text-xs font-black text-gray-900">
                    ₹{Number(order.totalAmount || 261).toFixed(2)}
                  </span>
                </div>
                <span className="text-gray-300 font-bold text-sm">›</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
