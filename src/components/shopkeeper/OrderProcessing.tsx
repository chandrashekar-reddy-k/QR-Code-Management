import { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid,
  Package,
  Layers,
  Truck,
  AlertCircle,
  Filter,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  QrCode,
  Play
} from 'lucide-react';
import { getSLAInfo } from '../../utils/slaHelper';
import { SelectInput, SearchInput, Modal, Button } from '../ui';
import api from '../../api/axios';

interface OrderProcessingProps {
  orders: any[];
  onNavigate?: (screen: string, data?: any) => void;
}

export function OrderProcessing({ orders = [], onNavigate }: OrderProcessingProps) {
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'picking' | 'packing' | 'ready'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [agents, setAgents] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedOrderForRider, setSelectedOrderForRider] = useState<any | null>(null);
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const fetchAgents = () => {
    api.get('/delivery-agents')
      .then(res => setAgents(res.data))
      .catch(err => console.error("Failed to load riders", err));
  };

  useEffect(() => {
    fetchAgents();
    window.addEventListener('agentStatusUpdated', fetchAgents);
    return () => window.removeEventListener('agentStatusUpdated', fetchAgents);
  }, []);

  const handleAssignRider = async (orderId: string, agentId: string) => {
    if (!agentId) return;
    setAssigningId(orderId);
    try {
      await api.post(`/orders/${orderId}/assign-rider`, { agentId });
      // Reload page since we don't have direct access to refreshOrders here, or just let context polling handle it
      window.dispatchEvent(new Event('refreshOrders'));
      setSelectedOrderForRider(null);
    } catch (err) {
      console.error("Failed to assign rider", err);
    } finally {
      setAssigningId(null);
    }
  };

  const now = new Date();

  // Helper to check if order is active (not completed/cancelled)
  const isActive = (o: any) => {
    const s = (o.status || '').toUpperCase();
    return ['CONFIRMED', 'ALLOCATED', 'ACCEPTED', 'PICKING', 'PACKING', 'PACKED', 'PROCESSING', 'READY', 'READY_FOR_PICKUP'].includes(s);
  };

  const isReadyForDispatch = (o: any) => {
    const isReady = (o.status || '').toLowerCase() === 'ready';
    const isNotSelfPickup = o.order_type !== 'Self Pickup';
    return isReady && isNotSelfPickup;
  };

  // KPI Calculations
  const kpiData = useMemo(() => {
    let picking = 0;
    let packing = 0;
    let ready = 0;
    let overdue = 0;

    orders.filter(isActive).forEach(o => {
      const s = (o.status || '').toUpperCase();
      if (['ALLOCATED', 'ACCEPTED', 'PICKING'].includes(s)) picking++;
      if (['PACKING', 'PACKED', 'PROCESSING'].includes(s)) packing++;
      if (isReadyForDispatch(o)) ready++;

      const sla = getSLAInfo(o, now);
      if (sla.isBreached) overdue++;
    });

    return {
      total: orders.filter(isActive).length,
      picking,
      packing,
      ready,
      overdue
    };
  }, [orders, now]);

  // Dynamic Delivery Type Options
  const deliveryTypeOptions = useMemo(() => {
    const types = new Set<string>();
    orders.forEach((o: any) => {
      const t = o.deliveryType || o.delivery_type || o.order_type;
      if (t) types.add(t);
    });
    return [
      { value: '', label: 'Delivery Type' },
      ...Array.from(types).map(t => ({ value: t, label: t }))
    ];
  }, [orders]);

  // Tab Filtering
  const filteredByTab = useMemo(() => {
    const activeOrders = orders.filter(isActive);
    if (activeTab === 'picking') return activeOrders.filter(o => ['ALLOCATED', 'ACCEPTED', 'PICKING'].includes((o.status || '').toUpperCase()));
    if (activeTab === 'packing') return activeOrders.filter(o => ['PACKING', 'PACKED', 'PROCESSING'].includes((o.status || '').toUpperCase()));
    if (activeTab === 'ready') return activeOrders.filter(isReadyForDispatch);
    return activeOrders;
  }, [orders, activeTab]);

  // UI Filtering
  const displayedOrders = useMemo(() => {
    return filteredByTab.filter(o => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const id = (o.orderNumber || o.order_number || o.id || '').toLowerCase();
        const customer = (o.customerName || o.customer_name || '').toLowerCase();
        const phone = (o.customerPhone || o.customer_phone || '').toLowerCase();
        if (!id.includes(query) && !customer.includes(query) && !phone.includes(query)) return false;
      }
      // Delivery Type
      if (deliveryTypeFilter) {
        const type = (o.deliveryType || o.delivery_type || o.order_type || '').toLowerCase();
        if (type !== deliveryTypeFilter.toLowerCase()) return false;
      }
      // Stage Filter
      if (stageFilter) {
        const status = (o.status || '').toLowerCase();
        if (stageFilter === 'confirmed' && status !== 'confirmed') return false;
        if (stageFilter === 'picking' && !['allocated', 'accepted', 'picking'].includes(status)) return false;
        if (stageFilter === 'packing' && !['packing', 'packed', 'processing'].includes(status)) return false;
        if (stageFilter === 'ready' && !isReadyForDispatch(o)) return false;
      }
      return true;
    });
  }, [filteredByTab, searchQuery, deliveryTypeFilter, stageFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, deliveryTypeFilter, stageFilter]);

  const totalPages = Math.ceil(displayedOrders.length / itemsPerPage);
  const paginatedOrders = displayedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => {
    setDeliveryTypeFilter('');
    setStageFilter('');
    setSearchQuery('');
  };

  const getStageDisplay = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'ALLOCATED':
      case 'ACCEPTED':
      case 'PICKING': return { label: 'Picking', color: 'bg-purple-100 text-purple-600', dot: 'bg-purple-500' };
      case 'PACKING':
      case 'PACKED':
      case 'PROCESSING': return { label: 'Packing', color: 'bg-orange-100 text-[#EF5A06]', dot: 'bg-[#EF5A06]' };
      case 'READY':
      case 'READY_FOR_PICKUP': return { label: 'Ready for Dispatch', color: 'bg-green-100 text-green-600', dot: 'bg-green-500' };
      default: return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-500' };
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 dark:bg-gray-900 p-8 font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-gray-900 dark:text-white leading-tight mb-2">Order Processing</h1>
        <p className="text-gray-500 dark:text-gray-400 text-[15px]">Track and manage all order processing operations.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400 font-medium text-[15px]">Total Orders</span>
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
              <LayoutGrid size={20} />
            </div>
          </div>
          <div className="text-[32px] font-bold text-gray-900 dark:text-white leading-none">{kpiData.total}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400 font-medium text-[15px]">Picking</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Package size={20} />
            </div>
          </div>
          <div className="text-[32px] font-bold text-gray-900 dark:text-white leading-none">{kpiData.picking}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400 font-medium text-[15px]">Packing</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Layers size={20} />
            </div>
          </div>
          <div className="text-[32px] font-bold text-gray-900 dark:text-white leading-none">{kpiData.packing}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400 font-medium text-[15px]">Ready for Dispatch</span>
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <Truck size={20} />
            </div>
          </div>
          <div className="text-[32px] font-bold text-gray-900 dark:text-white leading-none">{kpiData.ready}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-gray-500 dark:text-gray-400 font-medium text-[15px]">Overdue</span>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="text-[32px] font-bold text-red-600 dark:text-red-400 leading-none">{kpiData.overdue}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm h-11 overflow-hidden">
          <div className="px-4 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center h-full">
            <Filter size={18} className="text-gray-900 dark:text-gray-100" />
          </div>

          <div className="w-48 border-r border-gray-200 dark:border-gray-700 h-full relative flex items-center">
            <div className="w-full h-full [&_select]:border-0 [&_select]:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-4 [&_select]:py-0 [&_select]:h-full [&_select]:leading-[44px]">
              <SelectInput
                options={deliveryTypeOptions}
                value={deliveryTypeFilter}
                onChange={(e) => setDeliveryTypeFilter(e.target.value)}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-900 dark:text-gray-100" />
          </div>

          <div className="w-48 border-r border-gray-200 dark:border-gray-700 h-full relative flex items-center">
            <div className="w-full h-full [&_select]:border-0 [&_select]:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-4 [&_select]:py-0 [&_select]:h-full [&_select]:leading-[44px]">
              <SelectInput
                options={[
                  { value: '', label: 'Current Stage' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'picking', label: 'Picking' },
                  { value: 'packing', label: 'Packing' },
                  { value: 'ready', label: 'Ready for Dispatch' }
                ]}
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-900 dark:text-gray-100" />
          </div>

          <button
            onClick={resetFilters}
            className="flex items-center gap-2 text-[#EF5A06] hover:bg-orange-50 dark:hover:bg-orange-900/20 px-5 h-full transition-colors font-medium text-sm flex-shrink-0"
          >
            <RotateCcw size={16} />
            Reset Filter
          </button>
        </div>
        <div className="w-72">
          <SearchInput
            placeholder="Search ...."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm h-11"
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 pt-2 gap-8">
          {[
            { id: 'all', label: 'All Orders', count: null, color: '' },
            { id: 'picking', label: 'Picking', count: kpiData.picking, color: 'bg-purple-600' },
            { id: 'packing', label: 'Packing', count: kpiData.packing, color: 'bg-[#EF5A06]' },
            { id: 'ready', label: 'Ready for Dispatch', count: kpiData.ready, color: 'bg-green-700' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-4 pt-2 px-1 relative font-semibold text-[14px] transition-colors ${activeTab === tab.id
                  ? 'text-[#00891D]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${tab.color}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00891D] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10">
              {activeTab === 'ready' ? (
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-black dark:text-gray-100 font-bold text-[13px] uppercase tracking-wider h-12">
                  <th className="px-4 py-3 text-left">ORDER NUMBER</th>
                  <th className="px-4 py-3 text-left">SHOPKEEPER</th>
                  <th className="px-4 py-3 text-left">DELIVERY TYPE</th>
                  <th className="px-4 py-3 text-left">TRAY</th>
                  <th className="px-4 py-3 text-left">RIDER</th>
                  <th className="px-4 py-3 text-left">READY SINCE</th>
                  <th className="px-4 py-3 text-left">SLA STATUS</th>
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              ) : activeTab === 'packing' ? (
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 h-[56px] text-left text-[13px] font-bold text-black dark:text-gray-100 uppercase tracking-wider">
                  <th className="px-3 py-3">Order Number</th>
                  <th className="px-3 py-3">Assigned Shopkeeper</th>
                  <th className="text-center px-3 py-3">Packing Tray</th>
                  <th className="text-center px-3 py-3">Total Items</th>
                  <th className="text-center px-3 py-3">Packing Progress</th>
                  <th className="px-3 py-3">SLA Status</th>
                  <th style={{ width: "165px", minWidth: "165px" }} className="text-center px-3 py-3">Actions</th>
                </tr>
              ) : activeTab === 'picking' ? (
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 h-[56px] text-left text-[13px] font-bold text-black dark:text-gray-100 uppercase tracking-wider">
                  <th className="px-3 py-3">Order Number</th>
                  <th className="px-3 py-3">Delivery Type</th>
                  <th className="px-3 py-3">Assigned Shopkeeper</th>
                  <th className="text-center px-3 py-3">Total Items</th>
                  <th className="px-3 py-3">Pick Progress</th>
                  <th className="px-3 py-3">SLA Status</th>
                  <th style={{ width: "220px", minWidth: "220px" }} className="text-center px-3 py-3">Actions</th>
                </tr>
              ) : (
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">ORDER NO</th>
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">CUSTOMER</th>
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">DELIVERY TYPE</th>
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">CURRENT STAGE</th>
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">TRAY</th>
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">RIDER</th>
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">SLA</th>
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">ORDER TIME</th>
                  <th className="font-bold text-[13px] text-gray-900 dark:text-gray-100 py-3 px-4 text-left">ACTION</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    No orders found.
                  </td>
                </tr>
              ) : paginatedOrders.map((order) => {
                const stage = getStageDisplay(order.status);
                const sla = getSLAInfo(order, now);
                let slaColor = "text-[#00891D]"; // Green
                if (sla.status === 'at_risk') slaColor = "text-[#EF5A06]"; // Orange
                if (sla.status === 'breached') slaColor = "text-red-500"; // Red

                // Map format delivery type
                const dt = (order.deliveryType || order.delivery_type || '').toLowerCase();
                const dtDisplay = dt === 'self_pickup' ? 'Self Pickup' : 'Home Delivery';

                // Customer info
                const cName = order.customerName || order.customer_name || 'Guest';
                const cPhone = order.customerPhone || order.customer_phone || '—';

                // Status mapping to action
                const s = (order.status || '').toUpperCase();
                let actionBtn = null;
                if (['ALLOCATED', 'ACCEPTED', 'PICKING'].includes(s)) {
                  const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                  const totalItemsCount = (Array.isArray(order.items) ? order.items.length : (order.items || order.totalItems)) || 0;
                  const pickedCount = (itemsList.length > 0 ? itemsList.filter((i: any) => i.is_picked).length : order.picked) || 0;
                  const isCompleted = pickedCount === totalItemsCount && totalItemsCount > 0;
                  const isInProgress = pickedCount > 0 && !isCompleted;
                  actionBtn = (
                    <button
                      onClick={() => onNavigate?.("picking-screen", order)}
                      className={`flex items-center gap-1.5 text-xs font-bold text-white transition-colors px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap ${isInProgress ? "bg-[#EF5A06] hover:bg-[#D44F05]" : "bg-[#00891D] hover:bg-[#006614]"
                        }`}
                    >
                      <Play size={12} fill="white" />
                      <span>{isInProgress ? "Resume Picking" : "Start Picking"}</span>
                    </button>
                  );
                } else if (['PACKING', 'PACKED', 'PROCESSING'].includes(s)) {
                  const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                  const totalToPack = (Array.isArray(order.items) ? order.items.length : (order.items || order.totalItems)) || 0;
                  const isCompletedVal = ["packed", "ready", "dispatched"].includes((order.status || "").toLowerCase());
                  const packedCountVal = isCompletedVal ? totalToPack : (itemsList.filter((i: any) => i.is_picked && i.is_verified).length || 0);
                  const isPartialVal = packedCountVal > 0 && packedCountVal < totalToPack;
                  actionBtn = (
                    <button
                      onClick={() => onNavigate?.("packing-screen", order)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#EF5A06] hover:bg-[#D44F05] transition-colors px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap"
                    >
                      <Play size={12} fill="white" />
                      <span>{isPartialVal ? "Resume Packing" : "Start Packing"}</span>
                    </button>
                  );
                } else if (['READY', 'READY_FOR_PICKUP'].includes(s)) {
                  const hasRider = !!order.agentId || !!order.agent || !!order.rider;
                  if (hasRider) {
                    actionBtn = (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrderForRider(order)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 transition-colors font-bold text-xs whitespace-nowrap"
                        >
                          Change Rider
                        </button>
                        <button
                          onClick={() => {
                            const agentName = order.agent?.name || agents.find(a => a.id === order.agentId)?.name || "N/A";
                            onNavigate?.("handover-verification", {
                              ...order,
                              riderName: agentName
                            });
                          }}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 bg-[#00891D] hover:bg-[#006614] transition-colors text-white font-bold text-xs shadow-sm whitespace-nowrap"
                        >
                          <QrCode size={12} color="white" />
                          <span>Handover</span>
                        </button>
                      </div>
                    );
                  } else {
                    actionBtn = (
                      <button
                        onClick={() => setSelectedOrderForRider(order)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
                      >
                        Assign Rider
                      </button>
                    );
                  }
                }

                return activeTab === 'packing' ? (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors h-[64px]">
                    <td className="px-3 py-3 font-semibold text-[13px] text-gray-700 dark:text-gray-300">
                      {order.orderNumber || order.order_number || order.id}
                    </td>

                    <td className="px-3 py-3">
                      {order.shopkeeper_name || order.shopkeeperName ? (
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">{order.shopkeeper_name || order.shopkeeperName}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-[#EF5A06]">
                      {order.trayNumber || order.tray_number || order.tray || 'N/A'}
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-gray-100 text-center font-bold">
                      {Array.isArray(order.items) ? order.items.length : (order.items || order.totalItems || 0)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                          {(() => {
                            const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                            const totalToPack = itemsList.filter((i: any) => i.is_picked).length || (Array.isArray(order.items) ? order.items.length : order.items) || 0;
                            const isCompletedVal = ["packed", "ready", "dispatched"].includes((order.status || "").toLowerCase());
                            const packedCountVal = isCompletedVal ? totalToPack : (itemsList.filter((i: any) => i.is_picked && i.is_verified).length || 0);
                            return `${packedCountVal}/${totalToPack}`;
                          })()}
                        </span>
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-300"
                            style={{
                              width: `${(() => {
                                const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                                const totalToPack = itemsList.filter((i: any) => i.is_picked).length || (Array.isArray(order.items) ? order.items.length : order.items) || 0;
                                const isCompletedVal = ["packed", "ready", "dispatched"].includes((order.status || "").toLowerCase());
                                const packedCountVal = isCompletedVal ? totalToPack : (itemsList.filter((i: any) => i.is_picked && i.is_verified).length || 0);
                                return totalToPack > 0 ? Math.round((Number(packedCountVal) / Number(totalToPack)) * 100) : 0;
                              })()}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        let slaBadgeClass = "";
                        if (sla.status === 'breached') {
                          slaBadgeClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800";
                        } else if (sla.status === 'at_risk') {
                          slaBadgeClass = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800";
                        } else {
                          slaBadgeClass = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800";
                        }
                        return (
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border whitespace-nowrap ${slaBadgeClass}`}>
                            {sla.displayText}
                          </span>
                        )
                      })()}
                    </td>
                    <td style={{ width: "165px", minWidth: "165px" }} className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onNavigate?.('order-details', order)}
                          className="flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>
                        {(() => {
                          const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                          const totalToPack = itemsList.filter((i: any) => i.is_picked).length || (Array.isArray(order.items) ? order.items.length : order.items) || 0;
                          const isCompletedVal = ["packed", "ready", "dispatched"].includes((order.status || "").toLowerCase());
                          const packedCountVal = isCompletedVal ? totalToPack : (itemsList.filter((i: any) => i.is_picked && i.is_verified).length || 0);
                          const isFullVal = (packedCountVal === totalToPack && totalToPack > 0) || isCompletedVal;
                          const isPartialVal = packedCountVal > 0 && packedCountVal < totalToPack;

                          if (isFullVal) return null;

                          return (
                            <button
                              onClick={() => onNavigate?.("packing-screen", order)}
                              className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#EF5A06] hover:bg-[#D44F05] transition-colors px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap"
                            >
                              <Play size={10} fill="white" />
                              <span>{isPartialVal ? "Resume Packing" : "Start Packing"}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ) : activeTab === 'picking' ? (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors h-[64px]">
                    <td className="px-3 py-3 font-semibold text-[13px] text-gray-700 dark:text-gray-300">
                      {order.orderNumber || order.order_number || order.id}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 font-semibold">
                      {order.order_type || order.deliveryType || "Home Delivery"}
                    </td>
                    <td className="px-3 py-3">
                      {order.shopkeeper_name || order.shopkeeperName ? (
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">{order.shopkeeper_name || order.shopkeeperName}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-gray-100 text-center font-bold">
                      {Array.isArray(order.items) ? order.items.length : (order.items || order.totalItems || 0)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200 w-10 flex-shrink-0">
                          {(() => {
                            const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                            const totalItemsCount = (Array.isArray(order.items) ? order.items.length : (order.items || order.totalItems)) || 0;
                            const pickedCount = (itemsList.length > 0 ? itemsList.filter((i: any) => i.is_picked).length : order.picked) || 0;
                            return `${pickedCount}/${totalItemsCount}`;
                          })()}
                        </span>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(() => {
                                const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                                const totalItemsCount = (Array.isArray(order.items) ? order.items.length : (order.items || order.totalItems)) || 0;
                                const pickedCount = (itemsList.length > 0 ? itemsList.filter((i: any) => i.is_picked).length : order.picked) || 0;
                                return totalItemsCount > 0 ? (pickedCount / totalItemsCount) * 100 : 0;
                              })()}%`,
                              backgroundColor: (() => {
                                const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                                const totalItemsCount = (Array.isArray(order.items) ? order.items.length : (order.items || order.totalItems)) || 0;
                                const pickedCount = (itemsList.length > 0 ? itemsList.filter((i: any) => i.is_picked).length : order.picked) || 0;
                                const isCompleted = pickedCount === totalItemsCount && totalItemsCount > 0;
                                return isCompleted ? "#00891D" : "#EF5A06";
                              })()
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        let slaBadgeClass = "";
                        if (sla.status === 'breached') {
                          slaBadgeClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800";
                        } else if (sla.status === 'at_risk') {
                          slaBadgeClass = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800";
                        } else {
                          slaBadgeClass = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800";
                        }
                        return (
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border whitespace-nowrap ${slaBadgeClass}`}>
                            {sla.displayText}
                          </span>
                        )
                      })()}
                    </td>
                    <td style={{ width: "220px", minWidth: "220px" }} className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2 flex-nowrap whitespace-nowrap">
                        <button
                          onClick={() => onNavigate?.('order-details', order)}
                          className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {(() => {
                          const itemsList = order.itemsList || (Array.isArray(order.items) ? order.items : []);
                          const totalItemsCount = (Array.isArray(order.items) ? order.items.length : (order.items || order.totalItems)) || 0;
                          const pickedCount = (itemsList.length > 0 ? itemsList.filter((i: any) => i.is_picked).length : order.picked) || 0;
                          const isCompleted = pickedCount === totalItemsCount && totalItemsCount > 0;
                          const isInProgress = pickedCount > 0 && !isCompleted;

                          if (isCompleted) {
                            return (
                              <button
                                onClick={() => onNavigate?.("packing-queue")}
                                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#00891D] hover:bg-[#006614] transition-colors px-3 py-1.5 rounded-lg shadow-sm"
                              >
                                <span>Pack</span>
                                <ChevronRight size={14} />
                              </button>
                            );
                          } else {
                            return (
                              <button
                                onClick={() => onNavigate?.("picking-screen", order)}
                                className={`flex items-center gap-1.5 text-xs font-bold text-white transition-colors px-3 py-1.5 rounded-lg shadow-sm ${isInProgress ? "bg-[#EF5A06] hover:bg-[#D44F05]" : "bg-[#00891D] hover:bg-[#006614]"
                                  }`}
                              >
                                <Play size={12} fill="white" />
                                <span>{isInProgress ? "Resume" : "Start"}</span>
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className={activeTab === 'ready' ? "px-4 py-3 font-semibold text-gray-700 dark:text-gray-300" : "py-3 px-4 text-[13px] font-semibold text-gray-700 dark:text-gray-300"}>
                      {activeTab === 'ready' ? `#${order.orderNumber || order.order_number || order.id}` : (order.orderNumber || order.order_number || order.id)}
                    </td>
                    {activeTab !== 'ready' && (
                      <td className="py-3 px-4">
                        <div className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{cName}</div>
                        <div className="text-[12px] text-gray-500 dark:text-gray-400">{cPhone}</div>
                      </td>
                    )}
                    {activeTab === 'ready' && (
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold text-xs whitespace-nowrap">
                        {order.shopkeeper_name || order.shopkeeperName || "Not Assigned"}
                      </td>
                    )}
                    <td className={activeTab === 'ready' ? "px-4 py-3 text-gray-500 font-semibold text-xs whitespace-nowrap" : "py-3 px-4 text-[13px] text-gray-700 dark:text-gray-300"}>
                      {activeTab === 'ready' ? (
                        <span className="px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-800 inline-block whitespace-nowrap">
                          {dtDisplay}
                        </span>
                      ) : (
                        dtDisplay
                      )}
                    </td>
                    {activeTab !== 'ready' && (
                      <td className="py-3 px-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap ${stage.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stage.dot}`} />
                          {stage.label}
                        </div>
                      </td>
                    )}
                    <td className={activeTab === 'ready' ? "px-4 py-3 font-bold text-gray-900 dark:text-gray-100" : "py-3 px-4"}>
                      {activeTab === 'ready' ? (
                        order.trayNumber || order.tray_number || order.tray || 'N/A'
                      ) : order.trayNumber || order.tray_number || order.tray ? (
                        <div className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[13px] font-bold text-gray-700 dark:text-gray-300">
                          {order.trayNumber || order.tray_number || order.tray}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className={activeTab === 'ready' ? "px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap" : "py-3 px-4"}>
                      {activeTab === 'ready' ? (
                        order.agent || order.rider ? (
                          <span className="font-medium text-gray-900 dark:text-gray-100">{(order.agent || order.rider).name}</span>
                        ) : (
                          <span className="text-gray-400 font-normal">Not Assigned</span>
                        )
                      ) : order.agent || order.rider ? (
                        <div>
                          <div className="text-[13px] font-bold text-gray-900 dark:text-gray-100">{(order.agent || order.rider).name}</div>
                          <div className="text-[12px] text-gray-500 dark:text-gray-400">{(order.agent || order.rider).phone || ''}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    {activeTab === 'ready' && (
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {(() => {
                          const readyAt = order.packing_completed_at || order.packedAt || order.packingCompletedAt || order.updated_at || order.updatedAt;
                          if (!readyAt) return <span className="text-gray-400">—</span>;
                          const mins = Math.round((Date.now() - new Date(readyAt).getTime()) / 60000);
                          if (mins < 1) return <span className="font-semibold text-gray-600 dark:text-gray-300">Just now</span>;
                          if (mins >= 1440) return <span className="font-semibold text-gray-600 dark:text-gray-300">{Math.floor(mins / 1440)}d {Math.floor((mins % 1440) / 60)}h ago</span>;
                          if (mins >= 60) return <span className="font-semibold text-gray-600 dark:text-gray-300">{Math.floor(mins / 60)}h {mins % 60}m ago</span>;
                          return <span className="font-semibold text-gray-600 dark:text-gray-300">{mins} mins ago</span>;
                        })()}
                      </td>
                    )}
                    <td className={activeTab === 'ready' ? "px-4 py-3" : `py-3 px-4 text-[13px] font-semibold ${slaColor}`}>
                      {activeTab === 'ready' ? (
                        sla.isBreached ? (
                          <span className="inline-flex items-center gap-1 text-red-650 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 whitespace-nowrap">
                            <AlertCircle size={12} />
                            {sla.displayText}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100 whitespace-nowrap">
                            {sla.displayText}
                          </span>
                        )
                      ) : (
                        sla.displayText
                      )}
                    </td>
                    {activeTab !== 'ready' && (
                      <td className="py-3 px-4 text-[13px] text-gray-500 dark:text-gray-400">
                        {formatTime(order.createdAt || order.created_at)}
                      </td>
                    )}
                    <td className={activeTab === 'ready' ? "px-4 py-3 text-right" : "py-3 px-4"}>
                      <div className={`flex items-center gap-3 ${activeTab === 'ready' ? 'justify-end' : ''}`}>
                        <button
                          onClick={() => onNavigate?.('order-details', order)}
                          className={activeTab === 'ready' ? "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm" : "w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"}
                          title="View Details"
                        >
                          {activeTab === 'ready' ? <Package size={14} /> : <Eye size={16} />}
                          {activeTab === 'ready' && "View"}
                        </button>

                        {activeTab === 'ready' ? (
                          (() => {
                            const isHandedOver = order.status?.toLowerCase() === 'dispatched' || order.status?.toLowerCase() === 'completed';
                            if (isHandedOver) return null;

                            const hasRider = !!order.agentId || !!order.agent || !!order.rider;
                            if (hasRider) {
                              return (
                                <>
                                  <button
                                    onClick={() => setSelectedOrderForRider(order)}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 transition-colors font-bold text-xs"
                                  >
                                    Change Rider
                                  </button>
                                  <button
                                    onClick={() => {
                                      const agentName = order.agent?.name || agents.find(a => a.id === order.agentId)?.name || "N/A";
                                      onNavigate?.("handover-verification", {
                                        ...order,
                                        riderName: agentName
                                      });
                                    }}
                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 bg-[#00891D] hover:bg-[#006614] transition-colors text-white font-bold text-xs shadow-sm"
                                  >
                                    <QrCode size={12} color="white" />
                                    <span>Handover</span>
                                  </button>
                                </>
                              );
                            } else {
                              return (
                                <button
                                  onClick={() => setSelectedOrderForRider(order)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
                                >
                                  Assign Rider
                                </button>
                              );
                            }
                          })()
                        ) : (
                          actionBtn
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {displayedOrders.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <div className="text-[13px] text-gray-500 font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, displayedOrders.length)} of {displayedOrders.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[14px] font-semibold text-gray-700 dark:text-gray-300 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Rider Modal */}
      <Modal
        isOpen={!!selectedOrderForRider}
        onClose={() => {
          setSelectedOrderForRider(null);
          setSelectedAgentId(null);
          setAgentSearchTerm("");
        }}
        title="Assign Delivery Agent"
        size="sm"
        showCloseButton={true}
      >
        <div className="space-y-4">
          <SearchInput
            placeholder="Search"
            value={agentSearchTerm}
            onChange={(e) => setAgentSearchTerm(e.target.value)}
          />

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {agents
              .filter(a => (a.name || '').toLowerCase().includes(agentSearchTerm.toLowerCase()) || (a.phone || a.mobileNumber || '').includes(agentSearchTerm))
              .map((agent) => {
                const phone = agent.phone || agent.mobileNumber || agent.mobile || "";
                const profilePic = agent.profilePic || agent.profilePicUrl || agent.profileImage;

                return (
                  <label
                    key={agent.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedAgentId === agent.id
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {profilePic ? (
                        <img src={profilePic} alt={agent.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold uppercase text-lg">
                          {agent.name ? agent.name.charAt(0) : "A"}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                            {agent.name}
                          </span>
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                          <span>{phone}</span>
                          <span className="text-[10px]">•</span>
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="deliveryAgent"
                      value={agent.id}
                      checked={selectedAgentId === agent.id}
                      onChange={() => setSelectedAgentId(agent.id)}
                      className="w-4 h-4 text-green-600 dark:text-green-400 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-2 bg-white dark:bg-gray-700 cursor-pointer"
                    />
                  </label>
                );
              })}
            {agents.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                No delivery agents found
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              if (selectedOrderForRider && selectedAgentId) {
                handleAssignRider(selectedOrderForRider.id, selectedAgentId);
                setSelectedOrderForRider(null);
                setSelectedAgentId(null);
                setAgentSearchTerm("");
              }
            }}
            variant="primary"
            size="lg"
            className="w-full bg-[#52B148] hover:bg-[#43963A] text-white border-0"
            disabled={!selectedAgentId || assigningId === selectedOrderForRider?.id}
          >
            {assigningId === selectedOrderForRider?.id ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
