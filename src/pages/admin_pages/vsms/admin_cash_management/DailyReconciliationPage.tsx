// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { 
  Search, Download, FileText, X, Plus, Calendar, ChevronDown
} from 'lucide-react';
import { exportReportToExcel, generateReportPDF } from '../adminreports/ReportUtils';

import DailyReconciliationTab from './DailyReconciliationTab';
import LiveCashTab from './LiveCashTab';
import AuditLedgerTab from './AuditLedgerTab';

import { 
  EditReconciliationModal, DeleteModal, 
  ViewAgentDenomsModal, ImagePreviewModal 
} from './AgentModals';
import ShiftBreakdownView from './ShiftBreakdownView';
import AssignFloatView from './AssignFloatView';
import DepositShiftCashReportView from './DepositShiftCashReportView';

import { 
  getAdminReconciliation, adminUpdateReconciliation, 
  adminDeleteReconciliation, getStoreCashRegister, 
  getStoreCashLedger, adminReviewClosing
} from '../services/cashService';
import adminAPI from '../services/adminService';
import { useUserStore } from '../store/userStore';
import { useCashSocket } from '../../../../hooks/useCashSocket';

export default function DailyReconciliationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'reconciliation';
  const setActiveTab = (tab: string) => setSearchParams(prev => { prev.set('tab', tab); return prev; });
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summaries, setSummaries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [ledgerFilter, setLedgerFilter] = useState('ALL');
  const [viewingAssignFloat, setViewingAssignFloat] = useState(false);
  const [viewingDepositReport, setViewingDepositReport] = useState(false);
  const [storeRegisterData, setStoreRegisterData] = useState(null);

  const user = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);
  const refreshUserProfile = useUserStore(s => s.refreshUserProfile);

  useEffect(() => {
    const token = localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token && !user) {
      refreshUserProfile();
    }
  }, [user]);

  const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN' || (user?.role === 'ADMIN' && !user?.customRoleId);
  const storeFilterId = searchParams.get('storeId') || (!isGlobalRole ? user?.storeId : null);

  useCashSocket({
    date,
    storeId: storeFilterId,
    onUpdate: () => {
      fetchSummaries();
      fetchStoreRegister();
      if (activeTab === 'ledger') {
        fetchLedger();
      }
    }
  });

  // Edit Reconciliation Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);
  const [editData, setEditData] = useState({
    openingCash: 0, shift: 1, remark: '', isNoService: false,
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSummary, setDeletingSummary] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewingSummary, setViewingSummary] = useState(null);
  const [viewingAgentDenoms, setViewingAgentDenoms] = useState(null);

  // Review (Closing Edit) State
  const [isReviewEditing, setIsReviewEditing] = useState(null);
  const [reviewEditData, setReviewEditData] = useState({
    actualCash: 0, upiSales: 0, cardSales: 0, remark: '',
    denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
  });
  const [activeCorrectionTab, setActiveCorrectionTab] = useState('CASH');
  const [appliedParts, setAppliedParts] = useState({ CASH: false, UPI: false, CARD: false });

  // Ledger State
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const data = await getAdminReconciliation(date, storeFilterId);
      setSummaries(data);
    } catch (error) {
      toast.error('Failed to fetch cash summaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data } = await adminAPI.getVehicles({ storeId: storeFilterId });
      setVehicles(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data } = await adminAPI.getAgents({ storeId: storeFilterId });
      setAgents(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
    }
  };

  const fetchStoreRegister = async () => {
    try {
      const data = await getStoreCashRegister(date, storeFilterId);
      setStoreRegisterData(data);
    } catch (error) {
      console.error('Failed to fetch store cash register', error);
    }
  };

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const data = await getStoreCashLedger(date, storeFilterId);
      setLedgerData(data);
    } catch (error) {
      console.error('Failed to fetch store cash ledger', error);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
    fetchVehicles();
    fetchAgents();
    fetchStoreRegister();
  }, [date, storeFilterId]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedger();
    }
  }, [activeTab, date, storeFilterId]);

  const handleDenominationChange = (value, denom, type = 'edit') => {
    const qty = Math.max(0, parseInt(value) || 0);
    if (type === 'edit') {
      const newDenoms = { ...editData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setEditData({ ...editData, denominations: newDenoms, openingCash: total });
    } else if (type === 'review') {
      const newDenoms = { ...reviewEditData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setReviewEditData({ ...reviewEditData, denominations: newDenoms, actualCash: total });
      setAppliedParts(prev => ({ ...prev, CASH: false }));
    }
  };

  const handleReviewClosing = async (vehicleId, dateStr, shift, status, additionalData = {}) => {
    setIsSubmitting(true);
    try {
      await adminReviewClosing({ vehicleId, date: dateStr || date, shift, status, ...additionalData, storeId: storeFilterId });
      toast.success(`Closing ${status.toLowerCase()}`);
      setIsReviewEditing(null);
      fetchSummaries();
      fetchStoreRegister();
      setViewingSummary(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to review closing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (summary) => {
    setEditingSummary(summary);
    const shiftKey = `shift${summary.shift || 1}`;
    const op = summary.shiftDetails?.[shiftKey]?.opening;
    setEditData({
      openingCash: op?.totalOpeningCash || 0,
      shift: summary.shift || 1,
      remark: op?.remark || '',
      isNoService: op?.isNoService || false,
      denominations: op?.denominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
    });
    setShowEditModal(true);
  };

  const handleUpdateReconciliation = async () => {
    if (!editingSummary) return;
    setIsSubmitting(true);
    try {
      const vId = editingSummary.vehicleId || editingSummary.vehicle?.id;
      const d = editingSummary.date || date;
      await adminUpdateReconciliation({
        ...editData,
        vehicleId: vId,
        date: d
      });
      toast.success('Float updated successfully');
      setShowEditModal(false);
      fetchSummaries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update float');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReconciliation = async () => {
    if (!deletingSummary) return;
    setIsDeleting(true);
    try {
      const vId = deletingSummary.vehicleId || deletingSummary.vehicle?.id || deletingSummary.id;
      const d = deletingSummary.date || date;
      await adminDeleteReconciliation(vId, d);
      toast.success('Record deleted successfully');
      setShowDeleteModal(false);
      fetchSummaries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  const getAgentDisplay = (s) => {
    const agent = s.vehicle?.assignedUsers?.find(u => ['SALES_AGENT', 'DELIVERY_AGENT', 'VEHICLE_AGENT'].includes(u.role))
      || s.vehicle?.assignedUsers?.[0]
      || s.user;
    return agent?.name || s.vehicle?.vehicleName || s.vehicle?.vehicleNumber || 'Standard';
  };

  const filteredSummaries = summaries.filter(s => {
    if (storeFilterId && s.vehicle?.storeId && s.vehicle.storeId !== storeFilterId && s.storeId !== storeFilterId) return false;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const vName = s.vehicle?.vehicleName?.toLowerCase() || '';
    const vNum = s.vehicle?.vehicleNumber?.toLowerCase() || '';
    const agentName = getAgentDisplay(s).toLowerCase();
    const extraNames = (s.vehicle?.assignedUsers || []).map(u => u.name?.toLowerCase()).join(' ');
    return vName.includes(term) || vNum.includes(term) || agentName.includes(term) || extraNames.includes(term);
  });

  const posToday = storeRegisterData?.liveMetrics?.totalStoreSalesGrandTotal || 0;

  const handleExportPDF = () => {
    const columns = [
      { header: 'Agent / Vehicle', dataKey: 'agent' },
      { header: 'S1 Open', dataKey: 's1Open' },
      { header: 'S1 Close', dataKey: 's1Close' },
      { header: 'S2 Open', dataKey: 's2Open' },
      { header: 'S2 Close', dataKey: 's2Close' },
      { header: 'Expenses', dataKey: 'expenses' }
    ];
    const data = filteredSummaries.map(s => ({
      agent: getAgentDisplay(s),
      s1Open: `₹${(s.shiftDetails?.shift1?.opening?.totalOpeningCash || 0).toLocaleString()}`,
      s1Close: `₹${(s.shiftDetails?.shift1?.closing?.actualCash || 0).toLocaleString()}`,
      s2Open: `₹${(s.shiftDetails?.shift2?.opening?.totalOpeningCash || 0).toLocaleString()}`,
      s2Close: `₹${(s.shiftDetails?.shift2?.closing?.actualCash || 0).toLocaleString()}`,
      expenses: `₹${((s.shiftDetails?.shift1?.live?.expenses || 0) + (s.shiftDetails?.shift2?.live?.expenses || 0)).toLocaleString()}`
    }));
    generateReportPDF('Daily Cash Reconciliation Report', columns, data, `daily_recon_${date}.pdf`);
  };

  const handleExportExcel = () => {
    const data = filteredSummaries.map(s => ({
      'Agent / Vehicle': getAgentDisplay(s),
      'S1 Opening Cash': s.shiftDetails?.shift1?.opening?.totalOpeningCash || 0,
      'S1 Closing Cash': s.shiftDetails?.shift1?.closing?.actualCash || 0,
      'S2 Opening Cash': s.shiftDetails?.shift2?.opening?.totalOpeningCash || 0,
      'S2 Closing Cash': s.shiftDetails?.shift2?.closing?.actualCash || 0,
      'Day Expenses': (s.shiftDetails?.shift1?.live?.expenses || 0) + (s.shiftDetails?.shift2?.live?.expenses || 0)
    }));
    exportReportToExcel(data, `daily_recon_${date}`, 'Reconciliation');
  };

  if (viewingSummary) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50">
        <ShiftBreakdownView 
          viewingSummary={viewingSummary} 
          setViewingSummary={setViewingSummary}
          isReviewEditing={isReviewEditing} 
          setIsReviewEditing={setIsReviewEditing}
          activeCorrectionTab={activeCorrectionTab} 
          setActiveCorrectionTab={setActiveCorrectionTab}
          reviewEditData={reviewEditData} 
          setReviewEditData={setReviewEditData}
          appliedParts={appliedParts} 
          setAppliedParts={setAppliedParts}
          handleDenominationChange={handleDenominationChange} 
          handleReviewClosing={handleReviewClosing}
          isSubmitting={isSubmitting}
          can={can}
        />
      </div>
    );
  }

  if (viewingAssignFloat) {
    return (
      <AssignFloatView 
        onBack={() => setViewingAssignFloat(false)}
        onSuccess={() => {
          setViewingAssignFloat(false);
          fetchSummaries();
        }}
        date={date}
        storeFilterId={storeFilterId}
        summaries={summaries}
        vehicles={vehicles}
        agents={agents}
      />
    );
  }

  if (viewingDepositReport) {
    return (
      <DepositShiftCashReportView
        onBack={() => setViewingDepositReport(false)}
        onClose={() => setViewingDepositReport(false)}
        summaries={summaries}
        date={date}
        storeFilterId={storeFilterId}
        isGlobalRole={isGlobalRole}
        fetchSummaries={fetchSummaries}
        fetchStoreRegister={fetchStoreRegister}
      />
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daily Reconciliation</h1>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-3">
          {/* Calendar Date Picker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('reconPageDatePicker');
                if (el) {
                  if (el.showPicker) el.showPicker();
                  else el.focus();
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-emerald-50/50 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 shadow-2xs transition-all cursor-pointer"
            >
              <Calendar size={14} className="text-[#0e8345]" />
              <span>Showing for: <strong className="text-gray-900">{date ? format(new Date(date), 'dd MMM yyyy') : 'Today'}</strong></span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            <input 
              id="reconPageDatePicker"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="sr-only"
            />
          </div>

          <button
            type="button"
            onClick={() => setViewingAssignFloat(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0e8345] hover:bg-[#0c6f3a] text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Assign Float</span>
          </button>

          {/* Export Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 shadow-2xs transition-all"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => { setShowExportDropdown(false); handleExportPDF(); }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileText size={14} className="text-rose-500" /> Export PDF
                </button>
                <button
                  onClick={() => { setShowExportDropdown(false); handleExportExcel(); }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download size={14} className="text-emerald-600" /> Export Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Card Container matching user's screenshot */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-xs space-y-6">
        {/* Card Header Row: Segment Control Tabs on Left, Search Bar on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Segmented Control Tabs */}
          <div className="inline-flex bg-white border border-gray-200 rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('reconciliation')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'reconciliation'
                  ? 'text-[#0e8345] bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Daily Reconciliation
              {activeTab === 'reconciliation' && (
                <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#0e8345] rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'live'
                  ? 'text-[#0e8345] bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Live Cash Status
              {activeTab === 'live' && (
                <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#0e8345] rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'ledger'
                  ? 'text-[#0e8345] bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Audit Ledger
              {activeTab === 'ledger' && (
                <div className="absolute bottom-1 left-4 right-4 h-0.5 bg-[#0e8345] rounded-full" />
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72 md:w-80 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={15} />
            <input 
              type="text" 
              placeholder="Search ...." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-2xl text-xs font-semibold placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'reconciliation' && (
          <DailyReconciliationTab 
            loading={loading} filteredSummaries={filteredSummaries} storeRegisterData={storeRegisterData}
            handleOpenView={setViewingSummary} handleOpenEdit={handleOpenEdit} setDeletingSummary={setDeletingSummary}
            setShowDeleteModal={setShowDeleteModal} can={can}
            setViewingAgentDenoms={setViewingAgentDenoms}
            posToday={posToday}
            date={date} setDate={setDate}
          />
        )}

        {activeTab === 'live' && (
          <LiveCashTab filteredSummaries={filteredSummaries} handleOpenView={setViewingSummary} />
        )}

        {activeTab === 'ledger' && (
          <AuditLedgerTab 
            ledgerLoading={ledgerLoading} ledgerData={ledgerData} ledgerFilter={ledgerFilter} 
            setLedgerFilter={setLedgerFilter} date={date} setViewingOrder={setViewingOrder} setPreviewImage={setPreviewImage} 
          />
        )}
      </div>

      {/* Modals */}
      <EditReconciliationModal show={showEditModal} setShow={setShowEditModal} editData={editData} setEditData={setEditData} editingSummary={editingSummary} handleDenominationChange={handleDenominationChange} handleUpdateReconciliation={handleUpdateReconciliation} isSubmitting={isSubmitting} />
      <DeleteModal show={showDeleteModal} setShow={setShowDeleteModal} deletingSummary={deletingSummary} handleDelete={handleDeleteReconciliation} isDeleting={isDeleting} />
      <ViewAgentDenomsModal viewingAgentDenoms={viewingAgentDenoms} setViewingAgentDenoms={setViewingAgentDenoms} />
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
}
