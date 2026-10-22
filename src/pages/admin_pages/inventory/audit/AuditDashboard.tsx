import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2, 
  Search, Plus, Eye, ArrowRight, Settings, ChevronRight,
  Shield, CheckSquare, Square, ChevronDown, RefreshCw,
  TrendingUp, TrendingDown, MoreHorizontal, Layers,
  ShoppingBag, Truck, Package, Store, Smartphone, FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auditService, AuditMetrics, InventoryAuditItem } from './auditService';
import toast from 'react-hot-toast';

export default function AuditDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [audits, setAudits] = useState<InventoryAuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'In Progress' | 'Completed' | 'With Variance'>('All');
  const [viewMode, setViewMode] = useState<'Section View' | 'Location View'>('Section View');
  const [searchQuery, setSearchQuery] = useState('');

  // New Audit Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [initForm, setInitForm] = useState({
    scope: 'READY_INVENTORY',
    countingMethod: 'SYSTEM_ASSISTED' as 'SYSTEM_ASSISTED' | 'BLIND',
    vehicleId: '',
    storeId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permission toggles state (mockable interactive for demo)
  const [permissions, setPermissions] = useState({
    viewAudit: { admin: true, manager: true, staff: false },
    conductAudit: { admin: true, manager: true, staff: true },
    approveAdjustments: { admin: true, manager: true, staff: false },
    viewReports: { admin: true, manager: true, staff: true },
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      let statusParam: string | undefined = undefined;
      if (activeTab === 'Pending') statusParam = 'PENDING_REVIEW';
      else if (activeTab === 'Saved Drafts') statusParam = 'DRAFT';
      else if (activeTab === 'Completed') statusParam = 'CLOSED';

      const [dashRes, listRes] = await Promise.all([
        auditService.getDashboard(),
        auditService.listAudits({
          status: statusParam,
          search: searchQuery.trim() || undefined
        })
      ]);

      if (dashRes?.data?.success) {
        setMetrics(dashRes.data.data.metrics);
      }
      if (listRes?.data?.success) {
        setAudits(listRes.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load audits:', err);
      toast.error('Failed to load audit data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleStartAudit = async (customScope?: string) => {
    const targetScope = customScope || initForm.scope;
    if (targetScope === 'REPACKING') {
      toast('Repacking audit section is coming soon!', { icon: '⏳' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...initForm,
        scope: targetScope
      };
      const res = await auditService.initiateAudit(payload);
      if (res?.data?.success) {
        toast.success('Audit session initiated with frozen snapshot');
        setShowNewModal(false);
        navigate(`/inventory/audits/${res.data.data.id}/conduct`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to initiate audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAudits = audits.filter(a => {
    if (activeTab === 'With Variance') {
      return (a.totalVarianceQty || 0) !== 0;
    }
    return true;
  });

  const formatAuditDate = (dateStr: string | null | undefined, fallback: string) => {
    if (!dateStr) return fallback;
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fallback;
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen px-4 sm:px-6 py-6 space-y-6 text-gray-800 font-sans">
      
      {/* 1. Header Bar: Title, Subtitle, Audit Settings & + New Audit */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
            Inventory Audit
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Monitor and manage inventory audits across all sections and the entire hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => toast('Audit settings are configured according to store policy', { icon: '⚙️' })}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Settings size={15} className="text-emerald-700" />
            <span>Audit Settings</span>
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#f95721] hover:bg-[#ea450f] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200 transition-all"
          >
            <Plus size={16} />
            <span>New Audit</span>
            <ChevronDown size={14} className="opacity-80" />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards Row (5 Distinct Color Accents) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        
        {/* Total Audits */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500 leading-tight">
              Total Audits<br /><span className="text-[10px] text-gray-400 font-normal">(Last 30 Days)</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm">
              <ClipboardCheck size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-gray-900">{metrics?.totalAudits ?? 0}</span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <TrendingUp size={11} /> +33%
            </span>
          </div>
        </div>

        {/* Pending Audits */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500">Pending Audits</span>
            <div className="w-8 h-8 rounded-xl bg-[#2563eb] flex items-center justify-center text-white shadow-sm">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-gray-900">{metrics?.pendingReviewCount ?? 0}</span>
            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded-md">
              ↑ 2 new
            </span>
          </div>
        </div>

        {/* Items with Variance */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500">Items with Variance</span>
            <div className="w-8 h-8 rounded-xl bg-[#f97316] flex items-center justify-center text-white shadow-sm">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-gray-900">{metrics?.itemsWithVariance ?? 0}</span>
            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md">
              <TrendingDown size={11} /> -40%
            </span>
          </div>
        </div>

        {/* Variance Value */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500">Variance Value</span>
            <div className="w-8 h-8 rounded-xl bg-[#8b5cf6] flex items-center justify-center text-white shadow-sm">
              <span className="text-sm font-black">₹</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-gray-900">
              ₹ {Math.abs(metrics?.totalVarianceValue ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-purple-600 flex items-center gap-0.5 bg-purple-50 px-1.5 py-0.5 rounded-md">
              <TrendingDown size={11} /> -62%
            </span>
          </div>
        </div>

        {/* Completed Audits */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-gray-500">Completed Audits</span>
            <div className="w-8 h-8 rounded-xl bg-[#059669] flex items-center justify-center text-white shadow-sm">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-gray-900">{metrics?.closedCount ?? 0}</span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <TrendingUp size={11} /> +46%
            </span>
          </div>
        </div>

      </div>

      {/* 3. Middle Section: Section Cards (Left 3 cols) + Consolidated Hub & Permissions (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Left 3 Columns: Audit by Inventory Section Grid */}
        <div className="lg:col-span-3 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Audit by Inventory Section</h2>
              <p className="text-xs text-gray-400">Run audits for individual sections or view details</p>
            </div>

            {/* Toggle: Section View vs Location View */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs">
              <button 
                onClick={() => setViewMode('Section View')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === 'Section View' ? 'bg-[#0f2c1d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Section View
              </button>
              <button 
                onClick={() => setViewMode('Location View')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === 'Location View' ? 'bg-[#0f2c1d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Location View
              </button>
            </div>
          </div>

          {/* 6 Individual Section Cards Grid + 1 Consolidated Hub Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            
            {/* Raw Inventory */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3 hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Raw Inventory</h3>
                    <p className="text-[11px] text-gray-400 font-medium">{metrics?.sectionCounts?.RAW_INVENTORY ?? 0} SKUs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Variance</span>
                  <span className={`font-bold text-[11px] ${(metrics?.sectionAuditStats?.RAW_INVENTORY?.varianceCount || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {metrics?.sectionAuditStats?.RAW_INVENTORY ? `${metrics.sectionAuditStats.RAW_INVENTORY.varianceCount} items` : '0 items'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-medium">Last Audit</span>
                  <span className="font-semibold text-gray-700 text-[11px]">
                    {formatAuditDate(metrics?.sectionAuditStats?.RAW_INVENTORY?.lastAuditDate, 'Never audited')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleStartAudit('RAW_INVENTORY')}
                className="w-full py-1.5 text-center text-xs font-bold text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100"
              >
                Audit Now
              </button>
            </div>

            {/* Repacking */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden transition-all opacity-90">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Settings size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-gray-900 text-sm">Repacking</h3>
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold tracking-wide">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">{metrics?.sectionCounts?.REPACKING ?? 0} SKUs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Variance</span>
                  <span className="font-bold text-gray-400 text-[11px]">3 items</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-medium">Last Audit</span>
                  <span className="font-semibold text-gray-500 text-[11px]">12 Oct 2026</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => toast('Repacking audit section is coming soon!', { icon: '⏳' })}
                className="w-full py-1.5 text-center text-xs font-bold text-gray-400 bg-gray-100 hover:bg-gray-150 rounded-xl transition-colors border border-gray-200 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>

            {/* Ready Inventory */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3 hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Ready Inventory</h3>
                    <p className="text-[11px] text-gray-400 font-medium">{metrics?.sectionCounts?.READY_INVENTORY ?? 0} SKUs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Variance</span>
                  <span className={`font-bold text-[11px] ${(metrics?.sectionAuditStats?.READY_INVENTORY?.varianceCount || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {metrics?.sectionAuditStats?.READY_INVENTORY ? `${metrics.sectionAuditStats.READY_INVENTORY.varianceCount} items` : '0 items'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-medium">Last Audit</span>
                  <span className="font-semibold text-gray-700 text-[11px]">
                    {formatAuditDate(metrics?.sectionAuditStats?.READY_INVENTORY?.lastAuditDate, 'Never audited')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleStartAudit('READY_INVENTORY')}
                className="w-full py-1.5 text-center text-xs font-bold text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100"
              >
                Audit Now
              </button>
            </div>

            {/* Vehicle Inventory */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3 hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Vehicle Inventory</h3>
                    <p className="text-[11px] text-gray-400 font-medium">{metrics?.sectionCounts?.VEHICLE ?? 0} SKUs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Variance</span>
                  <span className={`font-bold text-[11px] ${(metrics?.sectionAuditStats?.VEHICLE?.varianceCount || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {metrics?.sectionAuditStats?.VEHICLE ? `${metrics.sectionAuditStats.VEHICLE.varianceCount} items` : '0 items'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-medium">Last Audit</span>
                  <span className="font-semibold text-gray-700 text-[11px]">
                    {formatAuditDate(metrics?.sectionAuditStats?.VEHICLE?.lastAuditDate, 'Never audited')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleStartAudit('VEHICLE')}
                className="w-full py-1.5 text-center text-xs font-bold text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100"
              >
                Audit Now
              </button>
            </div>

            {/* POS Inventory */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3 hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">POS Inventory</h3>
                    <p className="text-[11px] text-gray-400 font-medium">{metrics?.sectionCounts?.POS_CHANNEL ?? 0} SKUs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Variance</span>
                  <span className={`font-bold text-[11px] ${(metrics?.sectionAuditStats?.POS_CHANNEL?.varianceCount || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {metrics?.sectionAuditStats?.POS_CHANNEL ? `${metrics.sectionAuditStats.POS_CHANNEL.varianceCount} items` : '0 items'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-medium">Last Audit</span>
                  <span className="font-semibold text-gray-700 text-[11px]">
                    {formatAuditDate(metrics?.sectionAuditStats?.POS_CHANNEL?.lastAuditDate, 'Never audited')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleStartAudit('POS_CHANNEL')}
                className="w-full py-1.5 text-center text-xs font-bold text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100"
              >
                Audit Now
              </button>
            </div>

            {/* Online Inventory */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3 hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Online Inventory</h3>
                    <p className="text-[11px] text-gray-400 font-medium">{metrics?.sectionCounts?.ONLINE_CHANNEL ?? 0} SKUs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Variance</span>
                  <span className={`font-bold text-[11px] ${(metrics?.sectionAuditStats?.ONLINE_CHANNEL?.varianceCount || 0) > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {metrics?.sectionAuditStats?.ONLINE_CHANNEL ? `${metrics.sectionAuditStats.ONLINE_CHANNEL.varianceCount} items` : '0 items'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-medium">Last Audit</span>
                  <span className="font-semibold text-gray-700 text-[11px]">
                    {formatAuditDate(metrics?.sectionAuditStats?.ONLINE_CHANNEL?.lastAuditDate, 'Never audited')}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleStartAudit('ONLINE_CHANNEL')}
                className="w-full py-1.5 text-center text-xs font-bold text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100"
              >
                Audit Now
              </button>
            </div>

          </div>
        </div>

        {/* Right 1 Column: Consolidated Hub Audit Spotlight Card */}
        <div className="space-y-4">
          <div className="bg-[#f0fdf4] border border-emerald-200/80 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0f2c1d] text-white flex items-center justify-center shadow-md">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm leading-snug">Consolidated Hub Audit</h3>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5 leading-tight">
                    Audit entire hub across all sections, locations and vehicles
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100/60">
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">Total Products</span>
                <span className="text-base font-black text-gray-900">
                  {metrics?.sectionCounts?.HUB_CONSOLIDATED?.toLocaleString() ?? 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">Total Stock Value</span>
                <span className="text-base font-black text-gray-900">
                  ₹ {metrics?.sectionCounts?.HUB_STOCK_VALUE ? metrics.sectionCounts.HUB_STOCK_VALUE.toLocaleString() : 0}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 font-medium">
              Last Hub Audit: <strong className="text-gray-800">{formatAuditDate(metrics?.sectionAuditStats?.HUB_CONSOLIDATED?.lastAuditDate, 'Never audited')}</strong>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleStartAudit('HUB_CONSOLIDATED')}
                className="w-full py-2.5 bg-[#0f2c1d] hover:bg-[#091f13] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Start Hub Audit</span>
              </button>

              <button
                onClick={() => navigate('/inventory/audits?scope=HUB_CONSOLIDATED')}
                className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-1.5"
              >
                <FileSpreadsheet size={14} className="text-emerald-700" />
                <span>View Last Hub Audit Report</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Bottom Row: Recent Audits Table (Left 3 cols) + Audit Permissions & Quick Reports (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* Left 3 Columns: Recent Audits Tabbed Table */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-900">Recent Audits</h2>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
              {(['All', 'Pending', 'Saved Drafts', 'Completed', 'With Variance'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    activeTab === tab
                      ? 'bg-[#0f2c1d] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  {tab === 'All' ? 'All Audits' : tab}
                </button>
              ))}
            </div>

            {/* Search Input in Table Header */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search by audit ID, section or user..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:border-emerald-600 w-56"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Audit ID</th>
                  <th className="py-3 px-3">Section / Scope</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-3 text-center">Variance</th>
                  <th className="py-3 px-3 text-right">Value (₹)</th>
                  <th className="py-3 px-3">Audited By</th>
                  <th className="py-3 px-3">Audit Date</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400 text-xs">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredAudits.map((a) => {
                    const isVariance = (a.totalVarianceQty || 0) !== 0;
                    return (
                      <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {a.auditNumber}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-gray-800">
                            {a.vehicle ? `Vehicle - ${a.vehicle.vehicleNumber}` : a.scope.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-gray-500 whitespace-nowrap">
                          {a.scope === 'HUB_CONSOLIDATED' ? 'Consolidated' : 'Section'}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            a.status === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {a.status === 'CLOSED' ? 'Completed' :
                             a.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Saved Draft'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-gray-700">
                          {a._count?.items || a.totalExpectedQty || 0}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`font-bold ${isVariance ? 'text-red-600' : 'text-gray-700'}`}>
                            {Math.abs(a.totalVarianceQty || 0)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-gray-900">
                          {Math.abs(Math.round(a.totalVarianceVal || 0)).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                              {(a.auditor?.name || 'S').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-800 font-semibold">{a.auditor?.name || 'Suresh'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-gray-500 text-[11px] whitespace-nowrap">
                          {new Date(a.cutoffTime).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => {
                              if (a.status === 'DRAFT') {
                                navigate(`/inventory/audits/${a.id}/conduct`);
                              } else {
                                navigate(`/inventory/audits/${a.id}/review`);
                              }
                            }}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Column: Audit Permissions Card + Quick Reports */}
        <div className="space-y-5">
          
          {/* Audit Permissions Widget */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <Shield size={16} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Audit Permissions</h3>
                <p className="text-[10px] text-gray-400 font-medium">Manage access and roles</p>
              </div>
            </div>

            {/* Matrix Checklist */}
            <div className="space-y-3 pt-1 text-xs">
              
              {/* View Audit */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-[11px]">View Audit</span>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Admin
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Manager
                  </span>
                  <span className="flex items-center gap-0.5 text-gray-400">
                    <Square size={13} /> Staff
                  </span>
                </div>
              </div>

              {/* Conduct Audit */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-[11px]">Conduct Audit</span>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Admin
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Manager
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Staff
                  </span>
                </div>
              </div>

              {/* Approve Adjustments */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-[11px]">Approve Adjustments</span>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Admin
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Manager
                  </span>
                  <span className="flex items-center gap-0.5 text-gray-400">
                    <Square size={13} /> Staff
                  </span>
                </div>
              </div>

              {/* View Reports */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 text-[11px]">View Reports</span>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Admin
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Manager
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-800">
                    <CheckSquare size={13} className="text-emerald-700" /> Staff
                  </span>
                </div>
              </div>

            </div>

            <button 
              onClick={() => toast('Role permissions are synced with backend RBAC', { icon: '🔒' })}
              className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Settings size={13} />
              <span>Manage Permissions</span>
            </button>
          </div>

          {/* Quick Reports Widget */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                <Layers size={13} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Quick Reports</h3>
            </div>

            <div className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
              {[
                'Variance Report',
                'Section-wise Audit Report',
                'Hub Audit Report',
                'Adjustment History',
                'Audit Trail Log'
              ].map(reportName => (
                <div 
                  key={reportName}
                  onClick={() => toast.success(`Generating ${reportName}...`)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:text-emerald-700 transition-colors"
                >
                  <span>{reportName}</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Start New Audit */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <ClipboardCheck size={20} className="text-emerald-700" />
                  Initiate Stock Audit
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Capture ledger snapshot and count physical stock</p>
              </div>
              <button 
                onClick={() => setShowNewModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Select Scope
                </label>
                <select
                  value={initForm.scope}
                  onChange={e => setInitForm(f => ({ ...f, scope: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="READY_INVENTORY">Ready Inventory (Finished Goods)</option>
                  <option value="HUB_CONSOLIDATED">Consolidated Hub Audit</option>
                  <option value="RAW_INVENTORY">Raw Inventory</option>
                  <option value="REPACKING" disabled>Repacking Section (Coming Soon)</option>
                  <option value="VEHICLE">Vehicle Inventory</option>
                  <option value="POS_CHANNEL">POS Channel Stock</option>
                  <option value="ONLINE_CHANNEL">Online App Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Counting Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInitForm(f => ({ ...f, countingMethod: 'SYSTEM_ASSISTED' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      initForm.countingMethod === 'SYSTEM_ASSISTED'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold">System Assisted</div>
                    <div className="text-[10px] text-gray-400 font-normal">Shows expected book stock</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInitForm(f => ({ ...f, countingMethod: 'BLIND' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      initForm.countingMethod === 'BLIND'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold">Blind Count</div>
                    <div className="text-[10px] text-gray-400 font-normal">Hides expected stock</div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleStartAudit()}
                  className="px-4 py-2 bg-[#f95721] hover:bg-[#ea450f] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Capturing Snapshot...' : 'Create Snapshot & Count'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
