import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2, 
  Search, Plus, Eye, ArrowRight, Settings, ChevronRight,
  Shield, CheckSquare, Square, ChevronDown, RefreshCw,
  TrendingUp, TrendingDown, MoreHorizontal, Layers,
  ShoppingBag, Truck, Package, Store, Smartphone, FileSpreadsheet,
  Download, FileText, MapPin, Building, Navigation, Warehouse,
  ArrowLeft, Calendar, UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auditService, AuditMetrics, InventoryAuditItem } from './auditService';
import {
  exportSingleAuditPDF,
  exportSingleAuditExcel,
  exportAllAuditsSummaryPDF,
  exportAllAuditsSummaryExcel
} from './auditReportExport';
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

  // Logged-in user resolution for assigning audit team dynamically
  const currentUser = React.useMemo(() => {
    try {
      const raw = sessionStorage.getItem('staffUser') || localStorage.getItem('partnerUser') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const loggedInUserName = currentUser?.name || currentUser?.fullName || currentUser?.username || 'Current User';
  const loggedInUserRole = currentUser?.role ? String(currentUser.role).replace(/_/g, ' ') : 'Auditor';

  // Screen Toggle: 'DASHBOARD' vs 'CREATE_AUDIT'
  const [isCreatingAudit, setIsCreatingAudit] = useState(false);
  const [initForm, setInitForm] = useState({
    scope: 'READY_INVENTORY',
    countingMethod: 'SYSTEM_ASSISTED' as 'SYSTEM_ASSISTED' | 'BLIND',
    vehicleId: '',
    storeId: '',
    counterName: '',
    verifierName: '',
    notes: ''
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
      else if (activeTab === 'In Progress') statusParam = 'DRAFT';
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
        setIsCreatingAudit(false);
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

  const handleDownloadSingleAudit = async (auditSummary: InventoryAuditItem, format: 'PDF' | 'EXCEL') => {
    try {
      toast.loading(`Preparing ${format} report for ${auditSummary.auditNumber}...`, { id: `dl-${auditSummary.id}` });
      const res = await auditService.getAuditById(auditSummary.id);
      if (res?.data?.success) {
        const fullAudit = res.data.data;
        if (format === 'PDF') {
          exportSingleAuditPDF(fullAudit);
        } else {
          exportSingleAuditExcel(fullAudit);
        }
        toast.success(`${format} report downloaded successfully!`, { id: `dl-${auditSummary.id}` });
      } else {
        toast.error('Failed to load audit items for report', { id: `dl-${auditSummary.id}` });
      }
    } catch (err) {
      toast.error('Failed to generate audit report', { id: `dl-${auditSummary.id}` });
    }
  };

  const handleDownloadFilteredReports = (type: 'PDF' | 'EXCEL') => {
    if (filteredAudits.length === 0) {
      toast.error('No audits in current filter to export');
      return;
    }
    if (type === 'PDF') {
      exportAllAuditsSummaryPDF(filteredAudits, `${activeTab.toUpperCase()} AUDITS REPORT`);
    } else {
      exportAllAuditsSummaryExcel(filteredAudits);
    }
    toast.success(`${type} summary report downloaded!`);
  };

  const handleQuickReport = (reportType: string) => {
    if (audits.length === 0) {
      toast.error('No audit records available');
      return;
    }

    if (reportType === 'Variance Report') {
      const varianceAudits = audits.filter(a => (a.totalVarianceQty || 0) !== 0);
      if (varianceAudits.length === 0) {
        toast('No variance discrepancies found across audits!', { icon: '✅' });
        return;
      }
      exportAllAuditsSummaryPDF(varianceAudits, 'DISCREPANCY & VARIANCE AUDIT REPORT');
    } else if (reportType === 'Hub Audit Report') {
      const hubAudits = audits.filter(a => a.scope === 'HUB_CONSOLIDATED');
      exportAllAuditsSummaryPDF(hubAudits.length > 0 ? hubAudits : audits, 'CONSOLIDATED HUB AUDIT REPORT');
    } else {
      exportAllAuditsSummaryPDF(audits, `${reportType.toUpperCase()}`);
    }
    toast.success(`${reportType} downloaded!`);
  };

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
      
      {!isCreatingAudit ? (
        <>
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
            onClick={() => setIsCreatingAudit(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#f95721] hover:bg-[#ea450f] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200 transition-all"
          >
            <Plus size={16} />
            <span>Create New Audit</span>
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
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[7rem] relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-bold text-gray-500">Variance Value</span>
            <div className="w-8 h-8 rounded-xl bg-[#8b5cf6] flex items-center justify-center text-white shadow-sm shrink-0">
              <span className="text-sm font-black">₹</span>
            </div>
          </div>
          <div className="flex flex-col mt-1">
            <span 
              className="text-xl sm:text-2xl font-black text-gray-900 truncate tracking-tight"
              title={`₹ ${Math.abs(metrics?.totalVarianceValue ?? 0).toLocaleString('en-IN')}`}
            >
              {(() => {
                const val = Math.abs(metrics?.totalVarianceValue ?? 0);
                if (val >= 10000000) {
                  return `₹ ${(val / 10000000).toFixed(2)} Cr`;
                } else if (val >= 100000) {
                  return `₹ ${(val / 100000).toFixed(2)} L`;
                } else if (val >= 10000) {
                  return `₹ ${(val / 1000).toFixed(1)}k`;
                }
                return `₹ ${val.toLocaleString('en-IN')}`;
              })()}
            </span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-gray-400 font-medium truncate">
                {Math.abs(metrics?.totalVarianceValue ?? 0) >= 100000 
                  ? `₹${Math.abs(metrics?.totalVarianceValue ?? 0).toLocaleString('en-IN')}` 
                  : 'Total net discrepancy'}
              </span>
              <span className="text-[10px] font-bold text-purple-600 flex items-center gap-0.5 bg-purple-50 px-1.5 py-0.5 rounded-md shrink-0">
                <TrendingDown size={11} /> -62%
              </span>
            </div>
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

          {viewMode === 'Section View' ? (
            /* 5 Section Cards Grid (RAW_INVENTORY, READY_INVENTORY, VEHICLE, POS_CHANNEL, ONLINE_CHANNEL) */
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
              <div 
                onClick={() => navigate('/vsms/stock-history?sub=tracking')}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3 hover:border-gray-200 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">Vehicle Inventory</h3>
                      <p className="text-[11px] text-gray-400 font-medium">{metrics?.sectionCounts?.VEHICLE ?? 0} SKUs</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
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
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/vsms/stock-history?sub=tracking');
                  }}
                  className="w-full py-1.5 text-center text-xs font-bold text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-100"
                >
                  View Live Vehicle Stock
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
          ) : (
            /* Location View: Physical facilities & geolocations (Main Warehouse, Retail Outlet, Van Fleet, Fulfillment Node) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* Location 1: Central Warehouse (Main Hub) */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-200 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                      <Warehouse size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm">Central Hub & Warehouse</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          PRIMARY
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                        <MapPin size={11} className="text-emerald-600" />
                        Main Logistics Center (Bay 1-4)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    LOC-WH-01
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50/70 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Total SKUs</span>
                    <strong className="text-gray-900 font-black text-sm">
                      {((metrics?.sectionCounts?.RAW_INVENTORY || 0) + (metrics?.sectionCounts?.READY_INVENTORY || 0))}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Sections</span>
                    <strong className="text-gray-700 font-bold">Raw & Ready</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Audit Status</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartAudit('RAW_INVENTORY')}
                    className="flex-1 py-2 text-center text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Audit Raw Bay
                  </button>
                  <button
                    onClick={() => handleStartAudit('READY_INVENTORY')}
                    className="flex-1 py-2 text-center text-xs font-bold text-white bg-[#0f2c1d] hover:bg-[#091f13] rounded-xl shadow-sm transition-all"
                  >
                    Audit Ready Bay
                  </button>
                </div>
              </div>

              {/* Location 2: POS Retail Outlet */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-red-200 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
                      <Building size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm">VillageKart Store Outlet</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
                          STOREFRONT
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                        <MapPin size={11} className="text-red-600" />
                        Main Street Retail Counter
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    LOC-STR-01
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50/70 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Store Items</span>
                    <strong className="text-gray-900 font-black text-sm">
                      {metrics?.sectionCounts?.POS_CHANNEL ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Channel</span>
                    <strong className="text-gray-700 font-bold">POS / Cash</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Discrepancy</span>
                    <span className={`font-bold ${(metrics?.sectionAuditStats?.POS_CHANNEL?.varianceCount || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {metrics?.sectionAuditStats?.POS_CHANNEL?.varianceCount || 0} items
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartAudit('POS_CHANNEL')}
                  className="w-full py-2 text-center text-xs font-bold text-white bg-[#0f2c1d] hover:bg-[#091f13] rounded-xl shadow-sm transition-all"
                >
                  Audit Retail Floor Stock
                </button>
              </div>

              {/* Location 3: Mobile Fleet & Vans */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-200 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      <Truck size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm">VSMS Mobile Sales Fleet</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          TRANSIT
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                        <Navigation size={11} className="text-blue-600" />
                        Active Route Delivery Vans
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    LOC-FLT-01
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50/70 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Van SKUs</span>
                    <strong className="text-gray-900 font-black text-sm">
                      {metrics?.sectionCounts?.VEHICLE ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Type</span>
                    <strong className="text-gray-700 font-bold">Rolling Stock</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Tracking</span>
                    <span className="text-blue-600 font-bold">GPS Live</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/vsms/stock-history?sub=tracking')}
                    className="flex-1 py-2 text-center text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                  >
                    View Live GPS Fleet
                  </button>
                  <button
                    onClick={() => handleStartAudit('VEHICLE')}
                    className="flex-1 py-2 text-center text-xs font-bold text-white bg-[#0f2c1d] hover:bg-[#091f13] rounded-xl shadow-sm transition-all"
                  >
                    Audit Vehicle Stock
                  </button>
                </div>
              </div>

              {/* Location 4: Online E-Commerce Node */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-teal-200 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm">E-Commerce Dark Store Hub</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200">
                          DIGITAL
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                        <MapPin size={11} className="text-teal-600" />
                        Online App Packing & Dispatch Area
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    LOC-ONL-01
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50/70 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Online SKUs</span>
                    <strong className="text-gray-900 font-black text-sm">
                      {metrics?.sectionCounts?.ONLINE_CHANNEL ?? 0}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Platform</span>
                    <strong className="text-gray-700 font-bold">App & Web</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">Sync</span>
                    <span className="text-emerald-700 font-bold">Real-time</span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartAudit('ONLINE_CHANNEL')}
                  className="w-full py-2 text-center text-xs font-bold text-white bg-[#0f2c1d] hover:bg-[#091f13] rounded-xl shadow-sm transition-all"
                >
                  Audit Online Staging Racks
                </button>
              </div>

            </div>
          )}
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
                type="button"
                onClick={() => {
                  const hubAudits = audits.filter(a => a.scope === 'HUB_CONSOLIDATED');
                  if (hubAudits.length > 0) {
                    handleDownloadSingleAudit(hubAudits[0], 'PDF');
                  } else {
                    toast('No completed Hub audit yet. Running audit summary...', { icon: '📊' });
                    exportAllAuditsSummaryPDF(audits, 'CONSOLIDATED HUB AUDIT REPORT');
                  }
                }}
                className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Download size={14} className="text-emerald-700" />
                <span>Download Hub Audit Report</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Bottom Row: Recent Audits Table (Full Width) */}
      <div className="w-full">
        
        {/* Recent Audits Tabbed Table */}
        <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-900">Recent Audits</h2>

            {/* Filter Pills and View All */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                {(['All', 'Pending', 'In Progress', 'Completed', 'With Variance'] as const).map(tab => (
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

              <button
                type="button"
                onClick={() => {
                  setActiveTab('All');
                  setSearchQuery('');
                }}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 hover:underline"
              >
                View All
              </button>
            </div>

            {/* Export and Search in Table Header */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDownloadFilteredReports('PDF')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                  title="Download Current Audits as PDF"
                >
                  <Download size={13} />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadFilteredReports('EXCEL')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                  title="Download Current Audits as Excel"
                >
                  <FileSpreadsheet size={13} />
                  <span>Excel</span>
                </button>
              </div>

              {/* Search Input in Table Header */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                  type="text"
                  placeholder="Search by audit ID, section or user..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:border-emerald-600 w-52"
                />
              </div>
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
                             a.status === 'PENDING_REVIEW' ? 'Pending Review' : 'In Progress'}
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleAudit(a, 'PDF')}
                              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                              title="Download Audit PDF Report"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleAudit(a, 'EXCEL')}
                              className="p-1.5 hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 rounded-lg transition-colors"
                              title="Download Audit Excel Report"
                            >
                              <FileSpreadsheet size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (a.status === 'DRAFT') {
                                  navigate(`/inventory/audits/${a.id}/conduct`);
                                } else {
                                  navigate(`/inventory/audits/${a.id}/review`);
                                }
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                              title="Open Audit Session"
                            >
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
      ) : (
        /* SCREEN 2: DEDICATED FULL SCREEN RENDERING FOR CREATE NEW AUDIT */
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
          
          {/* Breadcrumb & Navigation Header */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setIsCreatingAudit(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-gray-950 bg-white hover:bg-gray-100 border border-gray-200 shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Audit Dashboard</span>
            </button>

            <span className="text-xs font-semibold text-gray-400">
              Screen 2 of 5 • Step 1: Configuration & Snapshot Freeze
            </span>
          </div>

          {/* Screen Title & Description */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0f2c1d] text-white flex items-center justify-center font-bold shadow-md shadow-emerald-950/20">
                <ClipboardCheck size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                    Create New Inventory Audit
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                    Configuration
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                  Configure audit scope, snapshot cutoff timestamp, count methodology and auditor assignments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreatingAudit(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (initForm.scope === 'VEHICLE' && !initForm.vehicleId) {
                    toast.error('Please select a vehicle for vehicle inventory audit');
                    return;
                  }
                  handleStartAudit();
                }}
                className="px-6 py-2.5 bg-[#f95721] hover:bg-[#ea450f] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200 transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Freezing Snapshot...' : 'Initiate Audit & Freeze Snapshot →'}</span>
              </button>
            </div>
          </div>

          {/* Main Configuration Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* 1. Audit Type */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                1. Audit Type & Scope Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div 
                  onClick={() => setInitForm(f => ({ ...f, scope: f.scope === 'HUB_CONSOLIDATED' ? 'READY_INVENTORY' : f.scope }))}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    initForm.scope !== 'HUB_CONSOLIDATED'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="radio" 
                      name="screenAuditType" 
                      checked={initForm.scope !== 'HUB_CONSOLIDATED'} 
                      onChange={() => {}} 
                      className="accent-emerald-700 w-4 h-4" 
                    />
                    <div>
                      <span className="font-bold text-gray-900 text-sm">Section Audit</span>
                      <span className="ml-2 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 pl-6 leading-relaxed">
                    Audit a specific inventory bay (Raw, Ready, Vehicle Fleet, POS Storefront, or Online App Staging).
                  </p>
                </div>

                <div 
                  onClick={() => setInitForm(f => ({ ...f, scope: 'HUB_CONSOLIDATED', vehicleId: '' }))}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    initForm.scope === 'HUB_CONSOLIDATED'
                      ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="radio" 
                      name="screenAuditType" 
                      checked={initForm.scope === 'HUB_CONSOLIDATED'} 
                      onChange={() => {}} 
                      className="accent-purple-700 w-4 h-4" 
                    />
                    <div>
                      <span className="font-bold text-gray-900 text-sm">Consolidated Hub Audit</span>
                      <span className="ml-2 text-[10px] font-bold text-purple-800 bg-purple-100/70 px-2 py-0.5 rounded-full">
                        Full Facility
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 pl-6 leading-relaxed">
                    Simultaneously captures and reconciles stock across all warehouse sections, vehicles, and retail terminals.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Inventory Section (if Section Audit) */}
            {initForm.scope !== 'HUB_CONSOLIDATED' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  2. Select Target Section
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'READY_INVENTORY', label: 'Ready Inventory', sub: 'Finished Goods Bay', icon: Store },
                    { id: 'RAW_INVENTORY', label: 'Raw Inventory', sub: 'Bulk Storage & Ingredients', icon: Package },
                    { id: 'VEHICLE', label: 'Vehicle Inventory', sub: 'Mobile Fleet Delivery Vans', icon: Truck },
                    { id: 'POS_CHANNEL', label: 'POS Store Stock', sub: 'Retail Storefront Counter', icon: Building },
                    { id: 'ONLINE_CHANNEL', label: 'Online App Stock', sub: 'Ecommerce Dispatch Bay', icon: Smartphone },
                  ].map(sec => {
                    const Icon = sec.icon;
                    const isSelected = initForm.scope === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setInitForm(f => ({ ...f, scope: sec.id, vehicleId: '' }))}
                        className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className={`font-bold text-xs ${isSelected ? 'text-emerald-950' : 'text-gray-900'}`}>
                            {sec.label}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                            {sec.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Fleet Vehicle Picker (if Vehicle scope) */}
            {initForm.scope === 'VEHICLE' && (
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    3. Select Delivery Fleet Vehicle *
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                    Required
                  </span>
                </div>
                <select
                  value={initForm.vehicleId}
                  onChange={e => setInitForm(f => ({ ...f, vehicleId: e.target.value }))}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">-- Choose active delivery vehicle --</option>
                  <option value="V001">V001 - AP 39 XX 1234 (Route: Medak Hub - Active)</option>
                  <option value="V002">V002 - TS 09 UB 5678 (Route: Sangareddy Hub - Active)</option>
                  <option value="V003">V003 - TS 07 EK 9012 (Route: Patancheru Hub - Active)</option>
                </select>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Ledger snapshot will be frozen from the morning vehicle dispatch allocation for this van.
                </p>
              </div>
            )}

            {/* 4. Stock Status & Counting Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Stock Status */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  4. Stock Condition Status
                </label>
                <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span className="font-bold text-xs text-gray-900">Sellable Good Stock</span>
                  </div>
                  <p className="text-[11px] text-gray-500 pl-4.5">
                    Count saleable on-shelf stock. Damaged, expired or quarantine items can be logged under discrepancies.
                  </p>
                </div>
              </div>

              {/* Counting Method */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                  5. Count Verification Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInitForm(f => ({ ...f, countingMethod: 'SYSTEM_ASSISTED' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      initForm.countingMethod === 'SYSTEM_ASSISTED'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      System-assisted
                    </div>
                    <div className="text-[10px] text-gray-500 font-normal mt-1 leading-snug">
                      Shows expected ledger stock while counting
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInitForm(f => ({ ...f, countingMethod: 'BLIND' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      initForm.countingMethod === 'BLIND'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Blind Count
                    </div>
                    <div className="text-[10px] text-gray-500 font-normal mt-1 leading-snug">
                      Hides book stock from counter until submission
                    </div>
                  </button>
                </div>
              </div>

            </div>

            {/* 6. Schedule Cutoff (Snapshot Time) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                6. Schedule Cutoff (Frozen Snapshot Timestamp)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                    <Calendar size={13} />
                    Snapshot Cutoff Date
                  </span>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                    <Clock size={13} />
                    Cutoff Time
                  </span>
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                Any sales transactions or goods receipts booked after this exact timestamp will not skew the physical audit variance.
              </p>
            </div>

            {/* 7. Assign Team */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} className="text-emerald-700" />
                  <span>7. Assign Team (Auditors & Reviewers)</span>
                </label>
                <span className="text-[10px] text-gray-400">
                  Assign active staff member and supervisor
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Floor Counter */}
                <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Floor Counter (Auditor)
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                      Primary
                    </span>
                  </div>
                  <input
                    type="text"
                    value={initForm.counterName}
                    onChange={e => setInitForm(f => ({ ...f, counterName: e.target.value }))}
                    placeholder={`e.g. ${loggedInUserName} (${loggedInUserRole})`}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
                  />
                  <p className="text-[10px] text-gray-400">
                    Logged-in session: <strong className="text-gray-700">{loggedInUserName}</strong> ({loggedInUserRole})
                  </p>
                </div>

                {/* Supervisor / Verifier */}
                <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      Supervisor / Verifier
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                      Approval Authority
                    </span>
                  </div>
                  <input
                    type="text"
                    value={initForm.verifierName}
                    onChange={e => setInitForm(f => ({ ...f, verifierName: e.target.value }))}
                    placeholder="e.g. Warehouse Operations Manager / Store Admin"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20"
                  />
                  <p className="text-[10px] text-gray-400">
                    Will review variances and authorize inventory ledger adjustments.
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Audit Notes / Shift Reference (Optional)
              </label>
              <input
                type="text"
                value={initForm.notes}
                onChange={e => setInitForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Periodic cycle count before morning dispatch route..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Action Bar Footer */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsCreatingAudit(false)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                ← Back to Dashboard
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (initForm.scope === 'VEHICLE' && !initForm.vehicleId) {
                    toast.error('Please select a vehicle for vehicle inventory audit');
                    return;
                  }
                  handleStartAudit();
                }}
                className="w-full sm:w-auto px-8 py-3 bg-[#f95721] hover:bg-[#ea450f] text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>{isSubmitting ? 'Freezing Snapshot...' : 'Initiate Audit & Freeze Snapshot →'}</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
