// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Package, DollarSign, CheckCircle, XCircle, Clock, Eye,
  Filter, ChevronDown, ChevronRight, Search, TrendingDown, Users, Truck,
  Image as ImageIcon, Shield, Ban, FileText, BarChart3, X, AlertCircle,
  Percent, CreditCard, RefreshCcw, Download, Info, Hammer, Droplets,
  HelpCircle, Coins, ArrowLeft, Plus, Send, Camera, Trash2 as Trash, Printer, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';
import { damageAPI } from './services/damageService';
import { adminAPI } from './services/adminService';
import { useUserStore } from './store/userStore';
import { exportReportToExcel, generateReportPDF } from './adminreports/ReportUtils';
import { Building2, ArrowRight, ChevronLeft } from 'lucide-react';

const TABS = [
  { id: 'entries', label: 'Damage Entries', icon: AlertTriangle },
  { id: 'deductions', label: 'Deductions', icon: DollarSign },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 }
];

const DAMAGE_TYPE_COLORS = {
  DAMAGED: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: Hammer },
  EXPIRED: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: Clock },
  LEAKAGE: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: Droplets },
  LOST: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: HelpCircle },
  DENT: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: Hammer },
  SCRATCH: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: Clock },
  TIRE: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: Droplets },
  ACCIDENT: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: Hammer },
  MECHANICAL: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: HelpCircle },
  ELECTRICAL: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', icon: Clock },
  GLASS: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: Droplets },
  BODY: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: Hammer },
  OTHER: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: HelpCircle }
};

const STATUS_COLORS = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
  UNDER_REVIEW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
  REPORTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  REPAIR_SCHEDULED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  IN_REPAIR: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400' },
  REPAIRED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400' }
};

const RESPONSIBILITY_LABELS = {
  VGE_RESPONSIBLE: 'VGE Responsible',
  NEGLIGENCE: 'Negligence',
  INTENTIONAL: 'Intentional',
  MIS_HANDLING: 'Mis-Handling',
  NOT_RESPONSIBLE: 'Not Responsible'
};

export default function AdminDamage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, can } = useUserStore();
  const storeId = searchParams.get('storeId') || user?.storeId;

  if (!can('INVENTORY', 'READ', 'DAMAGE')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm mt-8">
        <Ban size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Access Denied</h2>
        <p className="text-gray-500 mt-1 font-bold text-sm">You do not have permission to view Damage management.</p>
        <button
          onClick={() => window.history.back()}
          className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('entries');
  const [entries, setEntries] = useState<any[]>([]);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  // const [productSearch, setProductSearch] = useState('');
  // Modal states
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState<any>(null);

  // Review form
  const [reviewAction, setReviewAction] = useState('');
  const [adminResponsibility, setAdminResponsibility] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');

  // Deduction form
  const [deductionMode, setDeductionMode] = useState('FULL');
  const [deductionPercentage, setDeductionPercentage] = useState(100);
  const [deductionRemarks, setDeductionRemarks] = useState('');

  // Creation State
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [createData, setCreateData] = useState({
    vehicleId: '',
    damageType: 'DENT',
    severity: 'MINOR',
    title: '',
    description: '',
    location: '',
    estimatedCost: '',
    odometerReading: '',
    images: []
  });
  const [createPreviews, setCreatePreviews] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const VEHICLE_DAMAGE_TYPES = ['DENT', 'SCRATCH', 'TIRE', 'ACCIDENT', 'MECHANICAL', 'ELECTRICAL', 'GLASS', 'BODY', 'OTHER'];
  const VEHICLE_SEVERITIES = ['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL'];
  const VEHICLE_LOCATIONS = ['Front Left', 'Front Right', 'Front Center', 'Rear Left', 'Rear Right', 'Rear Center', 'Left Side', 'Right Side', 'Roof', 'Undercarriage', 'Engine', 'Interior', 'Windshield', 'Other'];


  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (storeId) params.storeId = storeId;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const { data } = await adminAPI.getVehicleDamages(params);
      setEntries(data || []);
    } catch (err) {
      toast.error('Failed to load damage entries');
    } finally {
      setLoading(false);
    }
  }, [storeId, statusFilter, typeFilter]);

  const fetchDeductions = useCallback(async () => {
    try {
      const params = {};
      if (storeId) params.storeId = storeId;
      const { data } = await damageAPI.getDeductions(params);
      setDeductions(data || []);
    } catch (err) {
      toast.error('Failed to load deductions');
    }
  }, [storeId]);

  const fetchReports = useCallback(async () => {
    try {
      const params = {};
      if (storeId) params.storeId = storeId;
      const { data } = await damageAPI.getDamageReports(params);
      setReports(data || {
        summary: { total: 0, totalLoss: 0, totalDeductions: 0, appliedDeductions: 0 },
        lossByType: {},
        topProducts: [],
        vgeReport: [],
        payrollReport: []
      });
    } catch (err) {
      toast.error('Failed to load reports');
    }
  }, [storeId]);

  useEffect(() => {
    if (activeTab === 'entries') fetchEntries();
    else if (activeTab === 'deductions') fetchDeductions();
    else if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchEntries, fetchDeductions, fetchReports]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await adminAPI.getStores();
        const fetchedStores = res.data?.success ? res.data.data : (res.data || []);
        setStores(fetchedStores);
      } catch (err) {
        console.error('Failed to fetch stores');
      } finally {
        setLoadingStores(false);
      }
    };
    fetchStores();
  }, []);

  const fetchCreateData = useCallback(async () => {
    try {
      const [prodsRes, vehiclesRes] = await Promise.all([
        adminAPI.getItems({ showAll: true }),
        adminAPI.getVehicles()
      ]);
      setAllProducts(prodsRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data for damage creation');
    }
  }, []);

  useEffect(() => {
    if (showCreatePage) fetchCreateData();
  }, [showCreatePage, fetchCreateData]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.vehicle?.vehicleNumber?.toLowerCase().includes(q) ||
      e.damageType?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // Stats from entries
  const stats = useMemo(() => {
    const total = entries.length;
    const pending = entries.filter(e => e.status === 'PENDING' || e.status === 'UNDER_REVIEW' || e.status === 'REPORTED').length;
    const approved = entries.filter(e => e.status === 'APPROVED' || e.status === 'REPAIRED').length;
    const totalLoss = entries.reduce((s, e) => s + (e.estimatedCost || 0), 0);
    return { total, pending, approved, totalLoss };
  }, [entries]);

  // Handlers
  const openReview = (entry) => {
    setSelectedEntry(entry);
    setReviewAction('');
    setAdminResponsibility('');
    setAdminRemarks('');
    setShowReviewModal(true);
  };

  const openDeduction = (entry) => {
    setSelectedEntry(entry);
    setDeductionMode('FULL');
    setDeductionPercentage(100);
    setDeductionRemarks('');
    setShowDeductionModal(true);
  };

  const openDetail = async (entry) => {
    try {
      const { data } = await adminAPI.getVehicleDamageById(entry.id);
      setSelectedEntry(data);
      setShowDetailModal(true);
    } catch {
      toast.error('Failed to load details');
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewAction) return toast.error('Select an action');
    try {
      await damageAPI.reviewDamage(selectedEntry.id, {
        action: reviewAction,
        adminResponsibility,
        adminRemarks
      });
      toast.success(`Damage entry ${reviewAction.toLowerCase()}`);
      setShowReviewModal(false);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review');
    }
  };

  const handleDeductionSubmit = async () => {
    try {
      await damageAPI.applyDeduction({
        damageEntryId: selectedEntry.id,
        userId: selectedEntry.reportedById,
        mode: deductionMode,
        percentage: deductionPercentage,
        remarks: deductionRemarks
      });
      toast.success('Deduction applied successfully');
      setShowDeductionModal(false);
      fetchEntries();
      fetchDeductions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply deduction');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (!createData.vehicleId || !createData.title || !createData.damageType) {
      return toast.error('Vehicle, title, and damage type are required');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('vehicleId', createData.vehicleId);
      formData.append('title', createData.title);
      formData.append('damageType', createData.damageType);
      formData.append('severity', createData.severity);
      if (createData.description) formData.append('description', createData.description);
      if (createData.location) formData.append('location', createData.location);
      if (createData.estimatedCost) formData.append('estimatedCost', createData.estimatedCost);
      if (createData.odometerReading) formData.append('odometerReading', createData.odometerReading);
      if (storeId) formData.append('storeId', storeId);

      createData.images.forEach(img => formData.append('images', img));

      await adminAPI.createVehicleDamage(formData);
      toast.success('Vehicle damage reported successfully');
      setShowCreatePage(false);

      // Reset form
      setCreateData({
        vehicleId: '',
        damageType: 'DENT',
        severity: 'MINOR',
        title: '',
        description: '',
        location: '',
        estimatedCost: '',
        odometerReading: '',
        images: []
      });
      setVehicleSearch('');
      setCreatePreviews([]);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report vehicle damage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newImages = [...createData.images, ...files].slice(0, 4);
    setCreateData({ ...createData, images: newImages });
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setCreatePreviews([...createPreviews, ...newPreviews].slice(0, 4));
  };

  const removeImage = (index) => {
    const newImgs = [...createData.images];
    newImgs.splice(index, 1);
    const newPrevs = [...createPreviews];
    newPrevs.splice(index, 1);
    setCreateData({ ...createData, images: newImgs });
    setCreatePreviews(newPrevs);
  };

  const handleDeductionStatusChange = async (id, status) => {
    try {
      await damageAPI.updateDeductionStatus(id, { status });
      toast.success(`Deduction ${status.toLowerCase()}`);
      fetchDeductions();
    } catch (err) {
      toast.error('Failed to update deduction status');
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'reports') {
      exportReportToExcel('damages', reports);
    } else {
      exportReportToExcel('agent-damage-reports', entries);
    }
  };

  const handleExportPDF = () => {
    if (activeTab === 'reports') {
      generateReportPDF('damages', reports);
    } else {
      generateReportPDF('agent-damage-reports', entries);
    }
  };

  const handlePrint = () => {
    if (activeTab === 'reports') {
      generateReportPDF('damages', reports, true);
    } else {
      generateReportPDF('agent-damage-reports', entries, true);
    }
  };

  // ───────── RENDER HELPERS ─────────
  const renderStatusBadge = (status) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {status?.replace('_', ' ')}
      </span>
    );
  };

  const renderTypeBadge = (type) => {
    const c = DAMAGE_TYPE_COLORS[type] || DAMAGE_TYPE_COLORS.DAMAGED;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>
        <c.icon size={11} strokeWidth={2.5} /> {type}
      </span>
    );
  };

  // ───────── STAT CARDS ─────────
  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total Entries', value: stats.total, icon: Package, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
        { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        { label: 'Approved Status', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        { label: 'Total Loss (₹)', value: `₹${stats.totalLoss.toLocaleString()}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
      ].map((s, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</h3>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
            <s.icon size={24} />
          </div>
        </div>
      ))}
    </div>
  );

  // ───────── ENTRIES TABLE ─────────
  const renderEntries = () => (
    <div>
      {renderStats()}

      {/* Sticky Filters Wrapper - sticks below the tabs */}
      <div className="sticky top-[8.5rem] z-20 bg-gray-50 dark:bg-gray-900/50/95 backdrop-blur-md pb-4 mb-2 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product, agent, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="UNDER_REVIEW">Under Review</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Types</option>
              <option value="DAMAGED">Damaged</option>
              <option value="EXPIRED">Expired</option>
              <option value="LEAKAGE">Leakage</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <AlertTriangle size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No damage entries found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xl shadow-slate-200/50">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900/50/50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 min-w-[180px]">ID / Date</th>
                  <th className="text-left px-4 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Damage / Location</th>
                  <th className="text-left px-4 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Vehicle</th>
                  <th className="text-left px-4 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Severity</th>
                  <th className="text-left px-4 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 w-28">Type</th>
                  <th className="text-right px-4 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 w-24">Est. Cost</th>
                  <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 w-32">Status</th>
                  <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-800 tracking-tight">
                          {entry.displayId || entry.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-900 text-emerald-600">
                          <Wrench size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{entry.title || 'Unknown Damage'}</span>
                          <span className="text-[10px] text-slate-400">Location: {entry.location || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-slate-600">
                          {entry.vehicle?.vehicleNumber || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold text-slate-600">
                        {entry.severity || 'N/A'}
                      </span>
                    </td>

                    <td className="px-4 py-4">{renderTypeBadge(entry.damageType)}</td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-xs font-bold text-rose-600">₹{(entry.estimatedCost || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-center">{renderStatusBadge(entry.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(entry)}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-md transition-all"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm" onClick={() => openDetail(entry)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-900 text-emerald-600">
                      <Wrench size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{entry.title || 'Unknown Damage'}</p>
                      <p className="text-[10px] text-gray-400">{entry.displayId || entry.id.slice(0, 8)} · Location: {entry.location || 'N/A'}</p>
                    </div>
                  </div>
                  {renderStatusBadge(entry.status)}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {renderTypeBadge(entry.damageType)}
                  <span className="text-gray-500 font-medium flex items-center gap-1">
                    <Truck size={12} /> {entry.vehicle?.vehicleNumber || 'N/A'}
                  </span>
                  <span className="ml-auto font-bold text-red-600">₹{(entry.estimatedCost || 0).toFixed(0)}</span>
                </div>
                {entry.images?.length > 0 && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                    <button onClick={(e) => { e.stopPropagation(); setShowImageModal(entry.images); }} className="py-2 px-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-xs font-bold hover:bg-gray-100 transition-colors">
                      <ImageIcon size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ───────── DEDUCTIONS TAB ─────────
  const renderDeductions = () => (
    <div>
      {deductions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <DollarSign size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No deductions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deductions.map(d => (
            <div key={d.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{d.user?.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {d.damageEntry?.product?.name} · Month: {d.month}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${d.status === 'APPLIED' ? 'bg-emerald-50 text-emerald-600' : d.status === 'DISPUTED' ? 'bg-red-50 text-red-600' : d.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600'}`}>
                  {d.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Mode</p>
                  <p className="text-sm font-bold text-gray-800">{d.mode}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Percentage</p>
                  <p className="text-sm font-bold text-gray-800">{d.percentage || 0}%</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Amount</p>
                  <p className="text-sm font-bold text-red-600">₹{(d.deductionAmount || 0).toFixed(0)}</p>
                </div>
              </div>
              {can('INVENTORY', 'UPDATE', 'DAMAGE') && d.status === 'PENDING' && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                  <button onClick={() => handleDeductionStatusChange(d.id, 'APPLIED')} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-2">
                    <CheckCircle size={14} /> Apply to Payroll
                  </button>
                  <button onClick={() => handleDeductionStatusChange(d.id, 'CANCELLED')} className="flex-1 py-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-xs font-bold hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              )}
              {d.remarks && (
                <p className="text-xs text-gray-400 mt-2 italic">"{d.remarks}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ───────── REPORTS TAB ─────────
  const renderReportsTab = () => {
    if (!reports) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
        </div>
      );
    }

    const { summary, lossByType, topProducts, vgeReport, payrollReport } = reports;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Entries', value: summary.total, icon: Package, color: 'text-slate-600', bg: 'bg-slate-50' },
            { label: 'Total Loss', value: `₹${summary.totalLoss?.toFixed(0) || 0}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Total Deductions', value: `₹${summary.totalDeductions?.toFixed(0) || 0}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Recovery Rate', value: summary.totalLoss > 0 ? `${((summary.appliedDeductions / summary.totalLoss) * 100).toFixed(0)}%` : '0%', icon: Percent, color: 'text-emerald-600', bg: 'bg-emerald-50' }
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-lg p-4 border border-gray-200`}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={16} className={s.color} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Loss by Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2 align-bottom">
            <BarChart3 size={14} className="text-gray-300" /> Loss by Damage Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(lossByType).map(([type, data]) => {
              const c = DAMAGE_TYPE_COLORS[type] || DAMAGE_TYPE_COLORS.DAMAGED;
              return (
                <div key={type} className={`${c.bg} border ${c.border} rounded-xl p-3`}>
                  <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5"><c.icon size={12} className={c.text} /> {type}</p>
                  <p className={`text-lg font-bold ${c.text}`}>₹{data.loss?.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400">{data.count} entries</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Damaged Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <TrendingDown size={14} className="text-red-300" /> Top Damaged Products
          </h3>
          {topProducts?.length > 0 ? (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-6">#{i + 1}</span>
                    <span className="text-sm font-bold text-gray-800">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">₹{p.loss?.toFixed(0)}</p>
                    <p className="text-[10px] text-gray-400">{p.qty} units</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>

        {/* VGE Accountability */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">👤 VGE Accountability Report</h3>
          {vgeReport?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Agent</th>
                    <th className="text-center px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Reports</th>
                    <th className="text-center px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Qty</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Total Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vgeReport.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:bg-gray-900/50">
                      <td className="px-3 py-2 font-medium text-gray-800">{v.name}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{v.count}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{v.totalDamage}</td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">₹{v.totalLoss?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>

        {/* Payroll Deduction Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Coins size={14} className="text-emerald-300" /> Payroll Deduction Report
          </h3>
          {payrollReport?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">User</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Base Salary</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Deduction</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Net Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payrollReport.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:bg-gray-900/50">
                      <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                      <td className="px-3 py-2 text-right text-gray-600">₹{p.baseSalary?.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">-₹{p.totalDeduction?.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">₹{p.netSalary?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>
      </div>
    );
  };

  // ───────── MODALS ─────────

  // Create Page
  const renderCreatePage = () => {
    return (
      <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowCreatePage(false)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-white border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase shadow-sm transition-all hover:bg-gray-50 dark:bg-gray-900/50"
          >
            <ArrowLeft size={16} /> Cancel & Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
              <AlertTriangle size={16} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Report New Damage</h2>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mx-auto max-w-2xl overflow-visible">
          <div className="p-8 md:p-10 space-y-8">
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Vehicle *</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Search vehicle by number or name..."
                    value={vehicleSearch}
                    onChange={(e) => {
                      setVehicleSearch(e.target.value);
                      if (createData.vehicleId) setCreateData({ ...createData, vehicleId: '' });
                    }}
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                  />
                  {(vehicleSearch || createData.vehicleId) && (
                    <button
                      type="button"
                      onClick={() => { setVehicleSearch(''); setCreateData({ ...createData, vehicleId: '' }); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X size={16} />
                    </button>
                  )}
                  {vehicleSearch && !createData.vehicleId && (
                    <div className="absolute z-[100] left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto scrollbar-thin">
                      {vehicles
                        .filter(v =>
                          v.vehicleNumber?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                          v.vehicleName?.toLowerCase().includes(vehicleSearch.toLowerCase())
                        )
                        .slice(0, 15)
                        .map(v => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => { setCreateData({ ...createData, vehicleId: v.id }); setVehicleSearch(v.vehicleNumber); }}
                            className="w-full px-5 py-4 text-left hover:bg-red-50 flex items-center justify-between border-b border-gray-100 last:border-0 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-100 dark:border-red-900 text-red-600">
                                <Truck size={18} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-800 uppercase tracking-tight">{v.vehicleNumber}</span>
                                <span className="text-[10px] font-bold text-gray-400">{v.vehicleName || 'No Name'}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-emerald-600 block">
                                {v.assignedUsers?.length > 0 ? v.assignedUsers.map(u => u.name).join(', ') : 'Unassigned'}
                              </span>
                            </div>
                          </button>
                        ))
                      }
                      {vehicles.filter(v =>
                        v.vehicleNumber?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
                        v.vehicleName?.toLowerCase().includes(vehicleSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                          <Truck size={24} className="mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-bold">No vehicles found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {createData.vehicleId && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-top-2">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm overflow-hidden">
                    <Truck size={20} className="text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Selected Vehicle</p>
                    <p className="text-sm font-bold text-emerald-950 uppercase">{vehicles.find(v => v.id === createData.vehicleId)?.vehicleNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Driver / Agent</p>
                    <p className="text-sm font-bold text-emerald-950">
                      {vehicles.find(v => v.id === createData.vehicleId)?.assignedUsers?.length > 0
                        ? vehicles.find(v => v.id === createData.vehicleId).assignedUsers.map(u => u.name).join(', ')
                        : 'Unassigned'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Damage Title *</label>
                <input
                  type="text"
                  required
                  value={createData.title}
                  onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg px-5 py-4 text-sm font-bold focus:bg-white outline-none"
                  placeholder="e.g. Front bumper dent"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Damage Type *</label>
                  <select
                    value={createData.damageType}
                    onChange={(e) => setCreateData({ ...createData, damageType: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg px-5 py-4 text-sm font-bold focus:bg-white outline-none appearance-none cursor-pointer"
                  >
                    {VEHICLE_DAMAGE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Severity *</label>
                  <select
                    value={createData.severity}
                    onChange={(e) => setCreateData({ ...createData, severity: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg px-5 py-4 text-sm font-bold focus:bg-white outline-none appearance-none cursor-pointer"
                  >
                    {VEHICLE_SEVERITIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Location on Vehicle</label>
                  <select
                    value={createData.location}
                    onChange={(e) => setCreateData({ ...createData, location: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg px-5 py-4 text-sm font-bold focus:bg-white outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select Location...</option>
                    {VEHICLE_LOCATIONS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estimated Repair Cost</label>
                  <input
                    type="number"
                    value={createData.estimatedCost}
                    onChange={(e) => setCreateData({ ...createData, estimatedCost: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg px-5 py-4 text-sm font-bold focus:bg-white outline-none"
                    placeholder="₹0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Odometer Reading</label>
                <input
                  type="number"
                  value={createData.odometerReading}
                  onChange={(e) => setCreateData({ ...createData, odometerReading: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg px-5 py-4 text-sm font-bold focus:bg-white outline-none"
                  placeholder="e.g. 45000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description / Notes</label>
                <textarea
                  value={createData.description}
                  onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 rounded-lg px-5 py-4 text-sm font-bold focus:bg-white outline-none h-24 resize-none"
                  placeholder="Provide details about the damage..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Evidence Photos (Max 4)</label>
                <div className="flex flex-wrap gap-3">
                  {createPreviews.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group shadow-sm">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-white/90 backdrop-blur p-1 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
                  {createData.images.length < 4 && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:border-red-400 hover:text-red-500 cursor-pointer transition-all hover:bg-red-50/50">
                      <Camera size={20} />
                      <span className="text-[8px] font-bold uppercase mt-1">Upload</span>
                      <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !createData.vehicleId}
                  className="w-full bg-red-600 text-white font-bold py-5 rounded-xl shadow-2xl shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-xs uppercase tracking-[0.2em]"
                >
                  {submitting ? <RefreshCcw className="animate-spin" size={18} /> : <><Send size={18} /> Submit Damage Report</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Detail Modal
  const renderDetailModal = () => {
    if (!showDetailModal || !selectedEntry) return null;
    const e = selectedEntry;
    return (
      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowDetailModal(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-white border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase shadow-sm transition-all hover:bg-gray-50 dark:bg-gray-900/50">
            <ArrowLeft size={16} /> Back to List
          </button>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Damage Details</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mx-auto max-w-4xl overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{e.displayId || e.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {renderStatusBadge(e.status)}
            </div>

            {/* Vehicle Damage Info */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-900 text-emerald-600">
                  <Wrench size={22} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{e.title || 'Unknown Damage'}</p>
                  <p className="text-xs text-gray-400">Location: {e.location || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Severity</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{e.severity}</p>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Vehicle</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{e.vehicle?.vehicleNumber || 'N/A'}</p>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Type</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{e.damageType}</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-[9px] font-bold text-red-400 uppercase">Estimated Cost</p>
                  <p className="text-sm font-bold text-red-600 mt-1">₹{(e.estimatedCost || 0).toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* Odometer and Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Odometer Reading</p>
                <p className="text-sm font-bold text-blue-800">{e.odometerReading ? `${e.odometerReading} km` : 'N/A'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description / Notes</p>
                <p className="text-sm font-bold text-slate-800">{e.description || 'No description provided'}</p>
              </div>
            </div>

            {/* Images */}
            {e.images?.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon size={10} /> Evidence Photos
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {e.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Damage ${i + 1}`}
                      className="rounded-xl object-cover aspect-square border border-gray-200 cursor-pointer hover:opacity-80"
                      onClick={() => setShowImageModal([img])}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Review Modal
  const renderReviewModal = () => {
    if (!showReviewModal || !selectedEntry) return null;
    return (
      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowReviewModal(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-white border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase shadow-sm transition-all hover:bg-gray-50 dark:bg-gray-900/50">
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Review Damage</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mx-auto max-w-2xl overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Entry summary */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
              <p className="text-sm font-bold">{selectedEntry.product?.name || 'Unknown Product'} (Qty: {selectedEntry.quantity || 0})</p>
              <p className="text-xs text-gray-400">{selectedEntry.reportedBy?.name} · {selectedEntry.displayId} · {selectedEntry.vehicle?.vehicleNumber || 'Store Stock'}</p>
              <p className="text-sm font-bold text-red-600 mt-1">Loss: ₹{(selectedEntry.totalLoss || 0).toFixed(2)}</p>
            </div>

            {/* Action */}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Action</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 'APPROVED', label: 'Approve', icon: CheckCircle, color: 'orange' },
                  { val: 'REJECTED', label: 'Reject', icon: XCircle, color: 'red' },
                  { val: 'UNDER_REVIEW', label: 'Review', icon: AlertCircle, color: 'indigo' }
                ].map(a => (
                  <button
                    key={a.val}
                    onClick={() => setReviewAction(a.val)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${reviewAction === a.val ? `border-${a.color}-500 bg-${a.color}-50 text-${a.color}-600` : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                  >
                    <a.icon size={20} />
                    <span className="text-[10px] font-bold uppercase">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Responsibility Decision */}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Responsibility Decision</p>
              <select
                value={adminResponsibility}
                onChange={(e) => setAdminResponsibility(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Responsibility</option>
                <option value="VGE_RESPONSIBLE">VGE Responsible</option>
                <option value="NEGLIGENCE">Negligence</option>
                <option value="INTENTIONAL">Intentional</option>
                <option value="MIS_HANDLING">Mis-Handling</option>
                <option value="NOT_RESPONSIBLE">Not Responsible</option>
              </select>
            </div>

            {/* Remarks */}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Remarks</p>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Optional admin remarks..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleReviewSubmit}
              disabled={!reviewAction}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
            >
              Submit Decision
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Deduction Modal
  const renderDeductionModal = () => {
    if (!showDeductionModal || !selectedEntry) return null;
    const loss = selectedEntry.totalLoss || 0;
    const calcAmount = deductionMode === 'FULL' ? loss : deductionMode === 'PARTIAL' ? (loss * deductionPercentage / 100) : 0;

    return (
      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowDeductionModal(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-white border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase shadow-sm transition-all hover:bg-gray-50 dark:bg-gray-900/50">
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Apply Deduction</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mx-auto max-w-2xl overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Loss Info */}
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Total Loss</p>
                  <p className="text-2xl font-bold text-red-600">₹{loss.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Product</p>
                  <p className="text-sm font-bold text-gray-700">{selectedEntry.product?.name || 'Unknown Product'}</p>
                  <p className="text-xs text-gray-400">Qty: {selectedEntry.quantity || 0} · {selectedEntry.vehicle?.vehicleNumber || 'Store Stock'}</p>
                </div>
              </div>
            </div>

            {/* Deduction Mode */}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Deduction Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 'FULL', label: '100%', desc: 'Full deduction' },
                  { val: 'PARTIAL', label: 'Partial', desc: '% deduction' },
                  { val: 'WAIVED', label: 'Waived', desc: 'No deduction' }
                ].map(m => (
                  <button
                    key={m.val}
                    onClick={() => setDeductionMode(m.val)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${deductionMode === m.val ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{m.label}</p>
                    <p className="text-[10px] text-gray-400">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Percentage (only for partial) */}
            {deductionMode === 'PARTIAL' && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Percentage (%)</p>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={deductionPercentage}
                  onChange={(e) => setDeductionPercentage(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Calculated Amount */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Deduction Amount</p>
              <p className="text-3xl font-bold text-emerald-600">₹{calcAmount.toFixed(2)}</p>
            </div>

            {/* Remarks */}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Remarks</p>
              <textarea
                value={deductionRemarks}
                onChange={(e) => setDeductionRemarks(e.target.value)}
                placeholder="Optional deduction remarks..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleDeductionSubmit}
              className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
            >
              Apply Deduction
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Image Lightbox
  const renderImageModal = () => {
    if (!showImageModal) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowImageModal(null)}>
        <div className="max-w-2xl w-full">
          <button onClick={() => setShowImageModal(null)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={28} /></button>
          <div className="flex gap-2 overflow-x-auto pb-4">
            {showImageModal.map((img, i) => (
              <img key={i} src={img} alt={`Evidence ${i + 1}`} className="max-h-[80vh] rounded-lg object-contain" />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderClassifiedDamage = () => {
    return null;

    const isPartner = user?.role === 'PARTNER';
    if (storeId || isPartner) return null;

    return (
      <div className="flex flex-col gap-4 pt-4 animate-in fade-in slide-in-from-bottom-6 max-w-5xl mx-auto px-4">
        <div className="mb-2">
          <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            {(() => {
              let label = 'Damage & Deductions';
              if (activeTab === 'entries') label = 'Damage Entries';
              else if (activeTab === 'deductions') label = 'Deductions';
              else if (activeTab === 'reports') label = 'Damage Reports';
              return `Branch ${label}`;
            })()}
          </h3>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1 italic">Select a branch to manage its Damage & Deductions</p>
        </div>

        <div className="grid gap-4">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('storeId', store.id);
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                window.location.reload(); // Force reload to trigger useEffects with new storeId
              }}
              className="group w-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-2xl hover:border-red-200 transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 group-hover:bg-red-100 transition-all duration-500 opacity-50" />

              <div className="flex items-center gap-6 z-10">
                <div className="w-16 h-16 rounded-[1.25rem] bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 group-hover:scale-110 transition-transform duration-500">
                  <Building2 size={32} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col text-left">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1 group-hover:text-red-600 transition-colors">{store.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold bg-red-50 text-red-700 px-3 py-1 rounded-full uppercase tracking-widest">{store.code || 'Branch'}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">• {store.stateCode || 'Active'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12 z-10">
                <div className="w-14 h-14 rounded-lg bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center text-gray-300 group-hover:bg-red-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-500">
                  <ArrowRight size={24} strokeWidth={3} />
                </div>
              </div>
            </button>
          ))}

          {stores.length === 0 && !loadingStores && (
            <div className="py-20 text-center bg-white rounded-lg border-2 border-dashed border-gray-200">
              <Building2 size={64} className="mx-auto text-gray-200 mb-4" />
              <p className="text-lg font-bold text-gray-400 uppercase tracking-widest">No Branches Configured</p>
              <p className="text-sm text-gray-300 mt-2">Add your first store in Settings to start tracking.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const classifiedView = renderClassifiedDamage();
  if (classifiedView) return classifiedView;

  // ───────── MAIN RENDER ─────────
  if (showDetailModal && selectedEntry) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
        {renderDetailModal()}
        {renderImageModal()}
      </div>
    );
  }

  if (showReviewModal && selectedEntry) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
        {renderReviewModal()}
        {renderImageModal()}
      </div>
    );
  }

  if (showDeductionModal && selectedEntry) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
        {renderDeductionModal()}
        {renderImageModal()}
      </div>
    );
  }

  if (showCreatePage) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
        {renderCreatePage()}
        {renderImageModal()}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Header - Non sticky for better vertical space */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shadow-sm">
            <AlertTriangle size={20} className="text-red-600" strokeWidth={2.5} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {false && storeId && stores.length > 1 && (
              <button
                onClick={() => {
                  window.history.replaceState({}, '', window.location.pathname);
                  window.location.reload();
                }}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm active:scale-90"
                title="Back to All Branches"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Damage & Deductions</h1>
            {false && stores.length > 1 && (
              <select
                value={storeId || ''}
                onChange={(e) => {
                  const params = new URLSearchParams(window.location.search);
                  if (e.target.value) {
                    params.set('storeId', e.target.value);
                  } else {
                    params.delete('storeId');
                  }
                  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                  window.location.reload();
                }}
                className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest pl-3 pr-7 py-1.5 rounded-xl border-none outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm ml-1"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.35rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.1rem'
                }}
              >
                <option value="">All Branches</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-gray-400 font-medium tracking-tight">Inventory damage tracking, accountability & financial recovery</p>
          {can('INVENTORY', 'CREATE', 'DAMAGE') && (
            <div className="ml-auto flex items-center gap-2 no-print">
              <button
                onClick={handleExportPDF}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all shadow-sm"
                title="Export PDF"
              >
                <FileText size={18} />
              </button>
              <button
                onClick={handlePrint}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-blue-500 hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm"
                title="Print Report"
              >
                <Printer size={18} />
              </button>
              <button
                onClick={handleExportExcel}
                className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm"
                title="Export Excel"
              >
                <Download size={18} />
              </button>
              {!showCreatePage && (
                <button
                  onClick={() => setShowCreatePage(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm active:scale-95 transition-all ml-1"
                >
                  <Plus size={14} strokeWidth={3} /> Report Damage
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden w-full md:w-1/2 mt-4">
        <div className="flex w-full border-b border-gray-200 overflow-x-auto tabs-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative flex items-center justify-center gap-2 ${activeTab === tab.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-600 dark:bg-emerald-400"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'entries' && renderEntries()}
      {activeTab === 'deductions' && renderDeductions()}
      {activeTab === 'reports' && renderReportsTab()}

      {/* Modals */}
      {renderImageModal()}
    </div>
  );
}
