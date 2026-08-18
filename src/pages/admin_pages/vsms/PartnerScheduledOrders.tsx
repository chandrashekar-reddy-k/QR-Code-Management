// @ts-nocheck
import React, { useState } from 'react';
import {
  Package,
  FileText,
  MapPin,
  ShoppingBag,
  CreditCard,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Clock,
  Search,
  Scan,
  CheckCircle,
  Minus,
  Plus,
  Filter,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function PartnerScheduledOrders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'loadItems' | 'orders' | 'map'>('loadItems');
  const [showCreatePreOrder, setShowCreatePreOrder] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [selectedViewOrder, setSelectedViewOrder] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('All');

  // Form states for Pre Order
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [delDate, setDelDate] = useState('');
  const [delTime, setDelTime] = useState('');
  const [delAddress, setDelAddress] = useState('');

  const [preOrderItems, setPreOrderItems] = useState([
    {
      id: '1',
      name: "Mom's Magic Cashew &",
      price: 55,
      qty: 1,
      selected: false,
      img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100',
    },
    {
      id: '2',
      name: 'Mysore Sandal soap',
      price: 55,
      qty: 1,
      selected: false,
      img: 'https://images.unsplash.com/photo-1608248597359-bb436efab783?w=100',
    },
  ]);

  if (selectedViewOrder) {
    return (
      <div className="min-h-screen pb-32 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-3.5">
          {/* Header Bar */}
          <div className="pt-1 flex items-center gap-2.5">
            <button
              onClick={() => setSelectedViewOrder(null)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
                View Order
              </h1>
              <p className="text-[10px] font-semibold text-gray-400">
                Order #{selectedViewOrder.orderNumber || 'VK-20260806-000125'}
              </p>
            </div>
          </div>

          {/* 1. Order Details Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <h3 className="text-xs font-black text-gray-900">Order Details</h3>
              </div>
              <span className="text-[10px] font-black text-white bg-[#00891D] px-3.5 py-1 rounded-full">
                Scheduled
              </span>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] font-extrabold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">
                Home Delivery
              </span>
              <span className="text-[9px] font-extrabold text-[#E85D04] bg-orange-50 px-2.5 py-1 rounded-lg">
                COD
              </span>
            </div>
          </div>

          {/* 2. Customer Information Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <h3 className="text-xs font-black text-gray-900">Customer Information</h3>
              </div>

              {/* Call & Navigate Action Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${selectedViewOrder.phone || '9393479928'}`}
                  className="w-8 h-8 rounded-xl bg-[#00891D] text-white flex items-center justify-center shadow-sm cursor-pointer hover:bg-[#007018] transition-all"
                  title="Call Customer"
                >
                  <span className="text-xs">📞</span>
                </a>
                <button
                  onClick={() => toast.success('Opening delivery location map...')}
                  className="w-8 h-8 rounded-xl bg-[#00891D] text-white flex items-center justify-center shadow-sm cursor-pointer hover:bg-[#007018] transition-all"
                  title="Open GPS Navigation"
                >
                  <MapPin size={14} />
                </button>
              </div>
            </div>

            {/* Customer Details Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-50">
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-semibold text-gray-400">Customer Name</p>
                  <h4 className="text-xs font-black text-gray-900 mt-0.5">
                    {selectedViewOrder.customer || 'Rahul'}
                  </h4>
                </div>

                <div>
                  <p className="text-[9px] font-semibold text-gray-400">Phone</p>
                  <p className="text-xs font-black text-gray-900 mt-0.5 flex items-center gap-1">
                    <span>📞</span>
                    <span>{selectedViewOrder.phone || '9393479928'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-l border-gray-100 pl-3">
                <div>
                  <p className="text-[9px] font-semibold text-gray-400">Village</p>
                  <h4 className="text-xs font-black text-gray-900 mt-0.5">
                    {selectedViewOrder.village || 'Pargi'}
                  </h4>
                </div>

                <div>
                  <p className="text-[9px] font-semibold text-gray-400">Address</p>
                  <p className="text-[10px] font-medium text-gray-600 mt-0.5 leading-snug">
                    {selectedViewOrder.address || 'House No 3-15, Main Road, Pargi, Telangana – 509325'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Order Items Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                <span className="text-sm">🥞</span>
              </div>
              <h3 className="text-xs font-black text-gray-900">Order Items</h3>
            </div>

            {/* Items List */}
            <div className="divide-y divide-gray-100">
              {[
                {
                  id: '1',
                  name: 'Rice',
                  unit: '10 Kg',
                  qty: 1,
                  price: 120,
                  img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100',
                },
                {
                  id: '2',
                  name: 'Oil',
                  unit: '1 L',
                  qty: 2,
                  price: 76,
                  img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=100',
                },
              ].map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-12 h-12 rounded-2xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-black text-gray-900 leading-none">{item.name}</h4>
                      <p className="text-[10px] font-medium text-gray-400 mt-1">{item.unit}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <span className="text-[9px] font-semibold text-gray-400 block">Qty</span>
                      <span className="text-xs font-black text-gray-900">{item.qty}</span>
                    </div>
                    <span className="text-xs font-black text-gray-900 min-w-[3.5rem] text-right">
                      ₹{item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Amount Row */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-black text-gray-900">Total Amount</span>
              <span className="text-base font-black text-[#00891D]">
                ₹{selectedViewOrder.amount ? Number(selectedViewOrder.amount).toFixed(2) : '196.00'}
              </span>
            </div>
          </div>

          {/* 4. Order Note */}
          <div className="bg-white rounded-2xl p-3 border border-gray-100/90 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00891D] shrink-0" />
            <p className="text-[11px] font-semibold text-gray-600">
              Customer requested phone call.
            </p>
          </div>
        </div>

        {/* Sticky Bottom Actions Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 p-3 pb-5">
          <div className="max-w-[420px] mx-auto flex items-center gap-3">
            <button
              onClick={() => setSelectedViewOrder(null)}
              className="py-3 px-5 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                navigate('/vsms/agent-portal/sales/payment', {
                  state: {
                    orderId: selectedViewOrder.id || 'ORD-125',
                    orderNumber: selectedViewOrder.orderNumber || 'VK-20260806-000125',
                    amountToCollect: selectedViewOrder.amount || 196,
                  },
                });
              }}
              className="flex-1 py-3 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-black shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Proceed to Payment</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showOrderHistory) {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowOrderHistory(false)}
                className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                Order History
              </h1>
            </div>

            {/* Date Picker Pill */}
            <div className="bg-white rounded-2xl px-3 py-1.5 border border-gray-200 shadow-sm flex items-center gap-2 text-xs font-black text-gray-800">
              <Calendar size={13} className="text-gray-400" />
              <span>12-08-2026</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-12 gap-2.5">
            {/* Search Bar */}
            <div className="col-span-8 bg-white rounded-2xl p-2.5 px-3 border border-gray-200 shadow-sm flex items-center gap-2">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search customers or order ID..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="col-span-4 bg-white rounded-2xl p-2.5 px-3 border border-gray-200 shadow-sm flex items-center justify-between text-xs font-black text-gray-800 cursor-pointer">
              <div className="flex items-center gap-1.5">
                <Filter size={12} className="text-gray-400" />
                <span>All</span>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>

          {/* Order History Cards List */}
          <div className="space-y-3 pt-1">
            {[
              {
                id: '1',
                orderId: 'ORD-13277',
                customer: 'Ramesh Kumar',
                location: 'Kukatpally, Hyderabad',
                amount: '261',
                status: 'Delivered',
                statusType: 'delivered',
                meta: '3 Items • 08 Aug 2026, 07:21 PM',
                icon: ShoppingBag,
              },
              {
                id: '2',
                orderId: 'PRE-00482',
                customer: 'Suresh Kumar',
                location: 'Miyapur, Hyderabad',
                amount: '540',
                status: 'Pre Order',
                statusType: 'preorder',
                meta: '4 Items • Created: 12 Aug 2026, 06:10 PM',
                deliveryDate: 'For Delivery: 13 Aug 2026',
                icon: Calendar,
              },
              {
                id: '3',
                orderId: 'ORD-11496',
                customer: 'Anil Kumar',
                location: 'Moosapet, Hyderabad',
                amount: '415',
                status: 'Delivered',
                statusType: 'delivered',
                meta: '2 Items • 20 Jul 2026, 05:33 PM',
                icon: ShoppingBag,
              },
              {
                id: '4',
                orderId: 'PRE-00321',
                customer: 'Lakshmi Devi',
                location: 'Bachupally, Hyderabad',
                amount: '320',
                status: 'Pre Order',
                statusType: 'preorder',
                meta: '3 Items • Created: 10 Jul 2026, 11:45 AM',
                deliveryDate: 'For Delivery: 15 Jul 2026',
                icon: Calendar,
              },
            ].map((ord) => (
              <div
                key={ord.id}
                onClick={() => navigate(`/vsms/agent-portal/order/${ord.id}`)}
                className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-2.5 hover:border-emerald-200 transition-all cursor-pointer"
              >
                {/* Top Row: Icon, Order ID, Customer, Amount, Status Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        ord.statusType === 'delivered'
                          ? 'bg-emerald-50 text-[#00891D]'
                          : 'bg-orange-50 text-[#E85D04]'
                      }`}
                    >
                      <ord.icon size={16} />
                    </div>

                    <div>
                      <span
                        className={`text-xs font-black leading-none block ${
                          ord.statusType === 'delivered'
                            ? 'text-[#00891D]'
                            : 'text-[#E85D04]'
                        }`}
                      >
                        {ord.orderId}
                      </span>
                      <h4 className="text-xs font-black text-gray-900 mt-1 leading-none">
                        {ord.customer}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 mt-1">
                        <MapPin size={11} className="text-gray-400 shrink-0" />
                        <span>{ord.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <h4 className="text-sm font-black text-gray-900">
                      ₹{ord.amount}
                    </h4>
                    <span
                      className={`inline-block text-[8px] font-extrabold px-2.5 py-0.5 rounded-full mt-1.5 ${
                        ord.statusType === 'delivered'
                          ? 'bg-[#00891D] text-white'
                          : 'bg-[#E85D04] text-white'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>

                {/* Subtitle & Date Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-[10px]">
                  <div>
                    <p className="font-medium text-gray-400">{ord.meta}</p>
                    {ord.deliveryDate && (
                      <p className="font-bold text-[#E85D04] mt-0.5">
                        {ord.deliveryDate}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Form states for Pre Order
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [delDate, setDelDate] = useState('');
  const [delTime, setDelTime] = useState('');
  const [delAddress, setDelAddress] = useState('');

  const [preOrderItems, setPreOrderItems] = useState([
    {
      id: '1',
      name: "Mom's Magic Cashew &",
      price: 55,
      qty: 1,
      selected: false,
      img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100',
    },
    {
      id: '2',
      name: 'Mysore Sandal soap',
      price: 55,
      qty: 1,
      selected: false,
      img: 'https://images.unsplash.com/photo-1608248597359-bb436efab783?w=100',
    },
  ]);

  if (showCreatePreOrder) {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setShowCreatePreOrder(false)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Create Pre Order
            </h1>
          </div>

          {/* Customer Name & Mobile Number (2 Columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm">
                <input
                  type="tel"
                  placeholder="Enter Mobile Number"
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Delivery Date & Delivery Time (2 Columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Delivery Date <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex items-center justify-between">
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={delDate}
                  onChange={(e) => setDelDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
                <Calendar size={14} className="text-gray-400 shrink-0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Delivery Time
              </label>
              <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex items-center justify-between">
                <input
                  type="text"
                  placeholder="00:00"
                  value={delTime}
                  onChange={(e) => setDelTime(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
                <Clock size={14} className="text-gray-400 shrink-0" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-sm">
              <textarea
                rows={3}
                placeholder="Enter Complete delivery address....."
                value={delAddress}
                onChange={(e) => setDelAddress(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none resize-none"
              />
            </div>
            <button
              type="button"
              onClick={() => toast.success('Location fetched: Parigi, Telangana')}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#00891D] hover:underline pt-0.5"
            >
              <span>🎯</span>
              <span>Use Current Location</span>
            </button>
          </div>

          {/* Select Items */}
          <div className="space-y-2.5 pt-1">
            <label className="text-xs font-black text-gray-900">
              Select Items <span className="text-red-500">*</span>
            </label>

            {/* Search items bar with barcode scanner icon */}
            <div className="bg-white rounded-2xl p-2.5 px-3 border border-gray-200 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search items..."
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => toast.success('Barcode scanner ready')}
                className="text-gray-400 hover:text-gray-600"
              >
                <Scan size={15} />
              </button>
            </div>

            {/* Product Item Cards */}
            <div className="space-y-2.5">
              {preOrderItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-3 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3"
                >
                  {/* Checkbox & Product Image */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        setPreOrderItems(
                          preOrderItems.map((i) =>
                            i.id === item.id ? { ...i, selected: e.target.checked } : i
                          )
                        );
                      }}
                      className="w-4 h-4 rounded text-[#00891D] focus:ring-[#00891D] border-gray-300 rounded-md cursor-pointer accent-[#00891D]"
                    />

                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-extrabold text-gray-900">
                        {item.name}
                      </h4>
                      <span className="inline-block mt-1 text-[9px] font-black text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/60">
                        ₹{item.price}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPreOrderItems(
                          preOrderItems.map((i) =>
                            i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i
                          )
                        );
                      }}
                      className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-lg text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-gray-900">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreOrderItems(
                          preOrderItems.map((i) =>
                            i.id === item.id ? { ...i, qty: i.qty + 1 } : i
                          )
                        );
                      }}
                      className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-lg text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 p-3 shadow-lg max-w-[420px] mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-semibold text-gray-400">Total Quantity: 4</p>
              <h3 className="text-base font-black text-[#00891D] leading-none mt-0.5">
                ₹540
              </h3>
            </div>

            <button
              onClick={() => {
                toast.success('Pre Order created successfully!');
                setShowCreatePreOrder(false);
              }}
              className="flex-1 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center cursor-pointer"
            >
              Create Pre Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  const loadItemsList = [
    { id: '1', name: 'Rice 5kg', qty: 4, icon: '🌾', iconBg: 'bg-emerald-50 text-[#00891D]' },
    { id: '2', name: 'Toor Dal 1kg', qty: 8, icon: '🥜', iconBg: 'bg-amber-50 text-amber-500' },
    { id: '3', name: 'Sunflower Oil 1L', qty: 6, icon: '🛢️', iconBg: 'bg-amber-50 text-amber-500' },
    { id: '4', name: 'Sugar 1kg', qty: 10, icon: '🥛', iconBg: 'bg-emerald-50 text-[#00891D]' },
    { id: '5', name: 'Biscuits', qty: 10, icon: '🍪', iconBg: 'bg-amber-50 text-amber-500' },
  ];

  const ordersList = [
    { id: '1', orderNumber: 'VK-DEL-10291', customer: 'Ramesh Kumar', items: 3, total: 420, status: 'Out for Delivery', time: '10:00 AM' },
    { id: '2', orderNumber: 'VK-DEL-10292', customer: 'Priya Sharma', items: 5, total: 850, status: 'Confirmed', time: '11:30 AM' },
    { id: '3', orderNumber: 'VK-DEL-10293', customer: 'Suresh Babu', items: 2, total: 310, status: 'Ready for Pickup', time: '01:00 PM' },
  ];

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Header Bar */}
        <div className="pt-1">
          <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
            Online Orders
          </h1>
          <p className="text-[10px] font-medium text-gray-400 mt-0.5">
            Today's Deliveries • 13 Aug 2026
          </p>
        </div>

        {/* 3-Tab Pill Switcher */}
        <div className="bg-white rounded-2xl p-1.5 border border-gray-200/80 shadow-sm grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab('loadItems')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'loadItems'
                ? 'bg-emerald-50 text-[#00891D]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Package size={14} />
            <span>Load Items</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-emerald-50 text-[#00891D]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <FileText size={14} />
            <span>Orders</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'map'
                ? 'bg-emerald-50 text-[#00891D]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <MapPin size={14} />
            <span>Map</span>
          </button>
        </div>

        {/* 3 Top Summary KPI Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Orders */}
          <div className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm text-center space-y-1">
            <div className="w-8 h-8 mx-auto rounded-xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
            <p className="text-[9px] font-semibold text-gray-400">Orders</p>
            <h4 className="text-base font-black text-gray-900 leading-tight">12</h4>
          </div>

          {/* Total Items */}
          <div className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm text-center space-y-1">
            <div className="w-8 h-8 mx-auto rounded-xl bg-orange-50 text-[#E85D04] flex items-center justify-center">
              <Package size={16} />
            </div>
            <p className="text-[9px] font-semibold text-gray-400">Total Items</p>
            <h4 className="text-base font-black text-gray-900 leading-tight">38</h4>
          </div>

          {/* Order Value */}
          <div className="bg-white rounded-3xl p-3.5 border border-gray-100/90 shadow-sm text-center space-y-1">
            <div className="w-8 h-8 mx-auto rounded-xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
              <CreditCard size={16} />
            </div>
            <p className="text-[9px] font-semibold text-gray-400">Order Value</p>
            <h4 className="text-sm font-black text-gray-900 leading-tight">₹4,860</h4>
          </div>
        </div>

        {/* Tab 1: Load Items (Exact Figma Match) */}
        {activeTab === 'loadItems' && (
          <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-gray-50">
              <h3 className="text-xs font-black text-gray-900">Items To Load</h3>
              <span className="text-[10px] font-black text-[#00891D] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/60">
                38 Items
              </span>
            </div>

            <div className="divide-y divide-gray-50/80">
              {[
                { id: '1', name: 'Rice 5kg', qty: 4, icon: '🌾', iconBg: 'bg-emerald-50 text-[#00891D]' },
                { id: '2', name: 'Toor Dal 1kg', qty: 8, icon: '🥜', iconBg: 'bg-amber-50 text-amber-500' },
                { id: '3', name: 'Sunflower Oil 1L', qty: 6, icon: '🛢️', iconBg: 'bg-amber-50 text-amber-500' },
                { id: '4', name: 'Sugar 1kg', qty: 10, icon: '🥛', iconBg: 'bg-emerald-50 text-[#00891D]' },
                { id: '5', name: 'Biscuits', qty: 10, icon: '🍪', iconBg: 'bg-amber-50 text-amber-500' },
              ].map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                    >
                      <span className="text-base">{item.icon}</span>
                    </div>
                    <h4 className="text-xs font-black text-gray-900">
                      {item.name}
                    </h4>
                  </div>

                  <span className="text-xs font-black text-gray-900 tracking-tight">
                    × {item.qty}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Orders List */}
        {activeTab === 'orders' && (
          <div className="space-y-4 pt-1">
            {/* Search and Create Pre Order Button Row */}
            <div className="grid grid-cols-12 gap-2.5">
              {/* Search Bar */}
              <div className="col-span-6 bg-white rounded-2xl p-2.5 px-3 border border-gray-200 shadow-sm flex items-center gap-2">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>

              {/* Create Pre Order Button */}
              <button
                onClick={() => setShowCreatePreOrder(true)}
                className="col-span-6 py-2.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-[11px] font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⊕</span>
                <span>Create Pre Order</span>
              </button>
            </div>

            {/* My Orders Section Header */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-sm font-black text-gray-900 tracking-tight">My Orders</h3>
              <button
                onClick={() => setShowOrderHistory(true)}
                className="text-[10px] font-extrabold text-[#00891D] bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100/60 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                View History
              </button>
            </div>

            {/* Orders Cards List */}
            <div className="space-y-3.5">
              {[
                {
                  id: '1',
                  orderNumber: 'VK-20260806-000125',
                  orderId: 'VK-20260806-000125',
                  type: 'Scheduled delivery',
                  payment: 'COD',
                  slot: '11:00 am',
                  customer: 'Rahul',
                  phone: '9393479928',
                  village: 'Pargi',
                  amount: '196',
                  itemsCount: '2 Items',
                  address: 'House No 3-15, Main Road, Pargi, Telangana – 509325',
                },
                {
                  id: '2',
                  orderNumber: 'VK-20260804-000014',
                  orderId: 'VK-20260804-000014',
                  type: 'Pre Order',
                  payment: 'COD',
                  slot: 'Today',
                  customer: 'Aishwarya',
                  phone: '9393479928',
                  village: 'Adikmet',
                  amount: '344',
                  itemsCount: '5 Items',
                  address: 'Ramnagar , Near Balaji Temple, Adikmet , Hyderabad , Telangana',
                },
              ].map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => setSelectedViewOrder(ord)}
                  className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3.5 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  {/* Top Row: Icon, Order ID, Badges, Action Button */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle size={18} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-gray-900">
                          {ord.orderId}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[8px] font-extrabold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                            {ord.type}
                          </span>
                          <span className="text-[8px] font-extrabold text-[#E85D04] bg-orange-50 px-2 py-0.5 rounded-md">
                            {ord.payment}
                          </span>
                          <span className="text-[8px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md">
                            {ord.slot}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button className="w-8 h-8 rounded-xl bg-[#00891D] text-white flex items-center justify-center shadow-sm">
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Middle Customer & Amount Box */}
                  <div className="bg-gray-50/70 rounded-2xl p-3 grid grid-cols-2 gap-2">
                    {/* Customer */}
                    <div>
                      <p className="text-[9px] font-semibold text-gray-400">Customer</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded-full bg-emerald-100/70 text-[#00891D] font-black text-[9px] flex items-center justify-center shrink-0">
                          R
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-black text-gray-900 leading-none truncate">
                            {ord.customer}
                          </h5>
                          <p className="text-[9px] font-medium text-gray-400 mt-0.5 truncate">
                            {ord.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-[9px] font-semibold text-gray-400">Amount</p>
                      <h4 className="text-sm font-black text-gray-900 mt-1 leading-none">
                        ₹{ord.amount}
                      </h4>
                      <p className="text-[9px] font-medium text-gray-400 mt-0.5">
                        {ord.itemsCount}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Address Row */}
                  <div className="flex items-start gap-2 text-[10px] font-medium text-gray-500 pt-0.5">
                    <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      {ord.address}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Route Map View */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            {/* Map Canvas Card */}
            <div className="relative w-full h-[460px] bg-[#EBF2F7] rounded-3xl overflow-hidden border border-gray-200/80 shadow-sm">
              {/* Map Road Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                {/* Horizontal main roads */}
                <line x1="0" y1="90" x2="420" y2="105" stroke="#CBD5E1" strokeWidth="6" />
                <line x1="0" y1="180" x2="420" y2="170" stroke="#CBD5E1" strokeWidth="8" />
                <line x1="0" y1="260" x2="420" y2="280" stroke="#CBD5E1" strokeWidth="5" />
                <line x1="0" y1="360" x2="420" y2="350" stroke="#CBD5E1" strokeWidth="6" />

                {/* Vertical / Diagonal roads */}
                <line x1="90" y1="0" x2="70" y2="460" stroke="#CBD5E1" strokeWidth="6" />
                <line x1="140" y1="0" x2="165" y2="460" stroke="#CBD5E1" strokeWidth="7" />
                <line x1="235" y1="0" x2="225" y2="460" stroke="#CBD5E1" strokeWidth="6" />
                <line x1="330" y1="0" x2="310" y2="460" stroke="#CBD5E1" strokeWidth="5" />

                {/* Minor streets */}
                <line x1="0" y1="220" x2="420" y2="250" stroke="#E2E8F0" strokeWidth="3" />
                <line x1="180" y1="0" x2="120" y2="460" stroke="#E2E8F0" strokeWidth="3" />
              </svg>

              {/* Area Labels */}
              <span className="absolute top-10 left-36 text-[9px] font-bold text-gray-400 tracking-wider">
                MIYAPUR
              </span>
              <span className="absolute top-44 left-36 text-[9px] font-bold text-gray-400 tracking-wider">
                KUKATPALLY
              </span>
              <span className="absolute top-48 right-12 text-[9px] font-bold text-gray-400 tracking-wider">
                MOOSAPET
              </span>
              <span className="absolute bottom-36 right-16 text-[9px] font-bold text-gray-400 tracking-wider">
                BACHUPALLY
              </span>
              <span className="absolute bottom-24 right-10 text-[9px] font-bold text-gray-400 tracking-wider">
                NIZAMPET
              </span>
              <span className="absolute top-44 left-4 text-[8px] font-bold text-gray-300">
                BHEL Rd
              </span>
              <span className="absolute bottom-40 left-6 text-[8px] font-bold text-gray-300 rotate-90">
                Mumbai Hwy
              </span>

              {/* Map Controls (Top Right) */}
              <div className="absolute top-4 right-4 z-10 flex flex-col items-center gap-2">
                {/* My Location */}
                <button
                  type="button"
                  onClick={() => toast.success('Centered to your vehicle location')}
                  className="w-10 h-10 rounded-2xl bg-white text-gray-700 shadow-md flex flex-col items-center justify-center gap-0.5 border border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <Navigation size={13} className="text-gray-600" />
                  <span className="text-[6px] font-black text-gray-500 leading-none">My Location</span>
                </button>

                {/* Zoom Buttons */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 divide-y divide-gray-100 overflow-hidden flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => toast.success('Zoom In')}
                    className="w-9 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-50 text-base font-bold cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success('Zoom Out')}
                    className="w-9 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-50 text-base font-bold cursor-pointer"
                  >
                    −
                  </button>
                </div>
              </div>

              {/* Numbered Delivery Pins */}
              {/* Pin 1 - Kukatpally */}
              <div className="absolute top-44 left-28 flex flex-col items-center z-10 cursor-pointer">
                <div className="w-7 h-9 bg-[#00891D] rounded-t-full rounded-b-sm shadow-md flex items-center justify-center text-white text-[10px] font-black border-2 border-white">
                  1
                </div>
              </div>

              {/* Pin 2 - Miyapur */}
              <div className="absolute top-16 left-24 flex flex-col items-center z-10 cursor-pointer">
                <div className="w-7 h-9 bg-[#00891D] rounded-t-full rounded-b-sm shadow-md flex items-center justify-center text-white text-[10px] font-black border-2 border-white">
                  2
                </div>
              </div>

              {/* Pin 3 - Moosapet */}
              <div className="absolute top-48 right-24 flex flex-col items-center z-10 cursor-pointer">
                <div className="w-7 h-9 bg-[#00891D] rounded-t-full rounded-b-sm shadow-md flex items-center justify-center text-white text-[10px] font-black border-2 border-white">
                  3
                </div>
              </div>

              {/* Pin 4 - Bachupally */}
              <div className="absolute bottom-32 right-28 flex flex-col items-center z-10 cursor-pointer">
                <div className="w-7 h-9 bg-[#00891D] rounded-t-full rounded-b-sm shadow-md flex items-center justify-center text-white text-[10px] font-black border-2 border-white">
                  4
                </div>
              </div>

              {/* Pin 5 - Nizampet */}
              <div className="absolute bottom-20 right-14 flex flex-col items-center z-10 cursor-pointer">
                <div className="w-7 h-9 bg-[#00891D] rounded-t-full rounded-b-sm shadow-md flex items-center justify-center text-white text-[10px] font-black border-2 border-white">
                  5
                </div>
              </div>

              {/* Vehicle Current Location Pin ("You") */}
              <div className="absolute bottom-28 left-20 flex flex-col items-center z-20 cursor-pointer">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[#00891D] text-white flex items-center justify-center shadow-lg border-2 border-white">
                    <Truck size={18} />
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-white bg-[#00891D] px-2 py-0.5 rounded-full shadow-sm -mt-1 border border-white/80">
                  You
                </span>
              </div>

              {/* Bottom Floating Active Order Card */}
              <div className="absolute bottom-3 left-3 right-3 z-30 bg-white rounded-3xl p-3.5 shadow-lg border border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#00891D] font-black text-xs flex items-center justify-center shrink-0 border border-emerald-100">
                    01
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 leading-tight">
                      Ramesh Kumar
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 mt-0.5">
                      <MapPin size={11} className="text-gray-400 shrink-0" />
                      <span>Kukatpally, Hyderabad</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-900 mt-1">
                      3 Items • <span className="text-[#00891D]">₹261</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/vsms/agent-portal/order/1')}
                  className="py-2 px-4 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all shrink-0 cursor-pointer"
                >
                  View Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
