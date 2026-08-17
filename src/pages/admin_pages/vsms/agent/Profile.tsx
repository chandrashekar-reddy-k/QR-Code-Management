import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Shield, Truck, LogOut, FileText, CheckCircle2, XCircle, Package, KeyRound, Loader2, Download, Plus, ArrowLeft, RotateCcw, ShoppingBag, Bell, Calendar, MapPin, Store, AlertTriangle } from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export default function Profile() {
  const { user, clearUser } = useUserStore();
  const navigate = useNavigate();

  const [fullUser, setFullUser] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const currentUser = fullUser || user || {};

  const fetchProfile = async () => {
    try {
      const { data } = await authAPI.me();
      setFullUser(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUploadDoc = async (type, file) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);
    
    const loadingToast = toast.loading(`Uploading ${type}...`);
    try {
      await authAPI.uploadMyDocument(formData);
      toast.success('Document uploaded successfully!', { id: loadingToast });
      fetchProfile(); // Refresh list
    } catch (error) {
      toast.error('Upload failed', { id: loadingToast });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("New passwords don't match");
    }
    if (passwords.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }

    setIsUpdating(true);
    try {
      await authAPI.updatePassword({
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      toast.success("Password updated securely!");
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setIsUpdating(false);
    }
  };

  const ROLE_COLORS = {
    ADMIN: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    SALES_AGENT: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    CONSUMER: 'from-emerald-800 to-emerald-950 shadow-emerald-950/20',
  };

  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'profile' | 'changePassword' | 'myActivities' | 'myAssets' | 'requestAsset' | 'reportIssue' | 'requestReplacement'>('profile');
  const [assetsTab, setAssetsTab] = useState<'myAssets' | 'status'>('myAssets');
  const [expandedAsset, setExpandedAsset] = useState<string | null>('tshirt');

  // Request Asset Form State
  const [reqAssetType, setReqAssetType] = useState('');
  const [reqPriority, setReqPriority] = useState('');
  const [reqReason, setReqReason] = useState('');

  // Report Issue Form State
  const [issueAssetType, setIssueAssetType] = useState('');
  const [issueType, setIssueType] = useState('');
  const [issueReason, setIssueReason] = useState('');

  // Request Replacement Form State
  const [repAssetType, setRepAssetType] = useState('tshirt');
  const [repPriority, setRepPriority] = useState('');
  const [repReason, setRepReason] = useState('');

  if (activeSubView === 'requestReplacement') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setActiveSubView('myAssets')}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Request Replacement
            </h1>
          </div>

          {/* Form Fields */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success('Replacement request submitted successfully!');
              setActiveSubView('myAssets');
            }}
            className="space-y-4 pt-1"
          >
            {/* Select Asset Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Select Asset Type <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                <select
                  required
                  value={repAssetType}
                  onChange={(e) => setRepAssetType(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  <option value="tshirt">T Shirt</option>
                  <option value="pos">POS Machine</option>
                  <option value="bag">Delivery Bag</option>
                  <option value="cap">Cap / Helmet</option>
                  <option value="id_card">ID Card & Lanyard</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                <select
                  required
                  value={repPriority}
                  onChange={(e) => setRepPriority(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            {/* Reason/Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Reason/Description
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm">
                <textarea
                  rows={4}
                  placeholder="Describe why do you need this?"
                  value={repReason}
                  onChange={(e) => setRepReason(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-400 outline-none resize-none"
                />
              </div>
            </div>

            {/* Action Buttons: Cancel & Submit Request */}
            <div className="grid grid-cols-12 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubView('myAssets')}
                className="col-span-4 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl text-xs font-bold shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="col-span-8 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeSubView === 'reportIssue') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setActiveSubView('myAssets')}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Report Issue
            </h1>
          </div>

          {/* Form Fields */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.error('Asset issue reported to admin!');
              setActiveSubView('myAssets');
            }}
            className="space-y-4 pt-1"
          >
            {/* Select Asset Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Select Asset Type <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                <select
                  required
                  value={issueAssetType}
                  onChange={(e) => setIssueAssetType(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  <option value="tshirt">T Shirt</option>
                  <option value="pos">POS Machine</option>
                  <option value="bag">Delivery Bag</option>
                  <option value="cap">Cap / Helmet</option>
                  <option value="id_card">ID Card & Lanyard</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            {/* Select Issue */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Select Issue <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                <select
                  required
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  <option value="damaged">Damaged / Torn</option>
                  <option value="not_working">Not Working / Hardware Fault</option>
                  <option value="battery">Battery / Charging Issue</option>
                  <option value="lost">Lost / Stolen</option>
                  <option value="size">Wrong Size</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            {/* Reason/Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Reason/Description
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm">
                <textarea
                  rows={3}
                  placeholder="Describe what happened"
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-400 outline-none resize-none"
                />
              </div>
            </div>

            {/* Photos Upload Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Photos
              </label>
              <div
                onClick={() => toast.success('Photo selector opened')}
                className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-200 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#00891D] flex items-center justify-center">
                  <Download size={18} className="rotate-180" />
                </div>
                <div className="text-center">
                  <h4 className="text-xs font-extrabold text-gray-900">Tap to add photo</h4>
                  <p className="text-[10px] font-medium text-gray-400 mt-0.5">PDF, JPG, PNG up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Action Buttons: Cancel & Report Issue (Red) */}
            <div className="grid grid-cols-12 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubView('myAssets')}
                className="col-span-4 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl text-xs font-bold shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="col-span-8 py-3.5 bg-[#E60000] hover:bg-[#cc0000] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                Report Issue
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeSubView === 'requestAsset') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setActiveSubView('myAssets')}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Request New Asset
            </h1>
          </div>

          {/* Form Fields */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success('Asset request submitted successfully!');
              setActiveSubView('myAssets');
            }}
            className="space-y-4 pt-1"
          >
            {/* Select Asset Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Select Asset Type <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                <select
                  required
                  value={reqAssetType}
                  onChange={(e) => setReqAssetType(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  <option value="tshirt">T Shirt</option>
                  <option value="pos">POS Machine</option>
                  <option value="bag">Delivery Bag</option>
                  <option value="cap">Cap / Helmet</option>
                  <option value="id_card">ID Card & Lanyard</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                <select
                  required
                  value={reqPriority}
                  onChange={(e) => setReqPriority(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            {/* Reason/Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Reason/Description
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm">
                <textarea
                  rows={4}
                  placeholder="Describe why do you need this?"
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-400 outline-none resize-none"
                />
              </div>
            </div>

            {/* Action Buttons: Cancel & Submit Request */}
            <div className="grid grid-cols-12 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubView('myAssets')}
                className="col-span-4 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl text-xs font-bold shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="col-span-8 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (activeSubView === 'myAssets') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar with Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubView('profile')}
                className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                My Assets
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubView('requestAsset')}
                className="px-3 py-1.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-xl text-[10px] font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                Request New
              </button>
              <button
                onClick={() => setActiveSubView('reportIssue')}
                className="px-3 py-1.5 bg-[#E85D04] hover:bg-[#d45300] text-white rounded-xl text-[10px] font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                Report Issue
              </button>
            </div>
          </div>

          {/* 2-Tab Switcher Pill */}
          <div className="bg-white rounded-2xl p-1.5 border border-gray-200/80 shadow-sm grid grid-cols-2 gap-1">
            <button
              onClick={() => setAssetsTab('myAssets')}
              className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                assetsTab === 'myAssets'
                  ? 'bg-emerald-50 text-[#00891D]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Package size={14} />
              <span>My Assets</span>
            </button>
            <button
              onClick={() => setAssetsTab('status')}
              className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                assetsTab === 'status'
                  ? 'bg-emerald-50 text-[#00891D]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xs">⏱</span>
              <span>Status</span>
            </button>
          </div>

          {/* Assets Tab Content */}
          {assetsTab === 'myAssets' ? (
            <div className="space-y-3 pt-1">
              {/* Asset 1: T Shirt (Expanded) */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-4">
                <div
                  onClick={() => setExpandedAsset(expandedAsset === 'tshirt' ? null : 'tshirt')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
                      <Package size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 leading-tight">
                        T Shirt
                      </h3>
                      <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                        VillagKart T-Shirt
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      In use
                    </span>
                    <span className="text-gray-400 font-bold text-xs">
                      {expandedAsset === 'tshirt' ? '⌵' : '›'}
                    </span>
                  </div>
                </div>

                {expandedAsset === 'tshirt' && (
                  <div className="space-y-4 pt-1 animate-fade-in">
                    {/* Details Box */}
                    <div className="bg-gray-50/70 rounded-2xl p-3.5 divide-y divide-gray-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-[10px] font-medium text-gray-400">Condition</span>
                        <span className="text-xs font-black text-gray-900">Good</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[10px] font-medium text-gray-400">Assigned On</span>
                        <span className="text-xs font-black text-gray-900">11 Aug 2026</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[10px] font-medium text-gray-400">Brand</span>
                        <span className="text-xs font-black text-gray-900">Medium</span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-medium text-gray-400">Asset ID</span>
                        <span className="text-xs font-black text-gray-900">VK-ASSET-1001</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setRepAssetType('tshirt');
                          setActiveSubView('requestReplacement');
                        }}
                        className="py-3 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        onClick={() => {
                          setIssueAssetType('tshirt');
                          setActiveSubView('reportIssue');
                        }}
                        className="py-3 bg-[#E85D04] hover:bg-[#d45300] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
                      >
                        Report Issue
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Asset 2: POS Machine (Collapsed) */}
              <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm">
                <div
                  onClick={() => setExpandedAsset(expandedAsset === 'pos' ? null : 'pos')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
                      <Package size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 leading-tight">
                        POS Machine
                      </h3>
                      <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                        VillagKart POS Machine
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      In use
                    </span>
                    <span className="text-gray-400 font-bold text-xs">
                      {expandedAsset === 'pos' ? '⌵' : '›'}
                    </span>
                  </div>
                </div>

                {expandedAsset === 'pos' && (
                  <div className="space-y-4 pt-3 animate-fade-in">
                    {/* Details Box */}
                    <div className="bg-gray-50/70 rounded-2xl p-3.5 divide-y divide-gray-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-[10px] font-medium text-gray-400">Condition</span>
                        <span className="text-xs font-black text-gray-900">Excellent</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[10px] font-medium text-gray-400">Assigned On</span>
                        <span className="text-xs font-black text-gray-900">01 Aug 2026</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[10px] font-medium text-gray-400">Brand</span>
                        <span className="text-xs font-black text-gray-900">Sunmi V2</span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-medium text-gray-400">Asset ID</span>
                        <span className="text-xs font-black text-gray-900">VK-ASSET-2004</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => toast.success('Replace request submitted')}
                        className="py-3 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        onClick={() => toast.error('Report issue submitted')}
                        className="py-3 bg-[#E85D04] hover:bg-[#d45300] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
                      >
                        Report Issue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Status Tab Content */
            <div className="space-y-3 pt-1">
              {[
                {
                  id: '1',
                  type: 'Replacement',
                  status: 'Pending',
                  statusColor: 'text-[#00891D] bg-emerald-50 border border-emerald-100',
                  title: 'New Requirement',
                  desc: 'sdnfbsjfh',
                  date: '9 Apr 2026',
                  priority: 'Medium',
                  priorityColor: 'text-gray-900',
                },
                {
                  id: '2',
                  type: 'Replacement',
                  status: 'Approved',
                  statusColor: 'text-[#00891D] bg-emerald-50 border border-emerald-100',
                  title: 'T Shirt Replacement',
                  desc: 'Size L required',
                  date: '5 Apr 2026',
                  priority: 'High',
                  priorityColor: 'text-[#E85D04]',
                },
                {
                  id: '3',
                  type: 'Replacement',
                  status: 'Rejected',
                  statusColor: 'text-rose-600 bg-rose-50 border border-rose-100',
                  title: 'Old T-Shirt replace request',
                  desc: 'Material issue',
                  date: '22 Mar 2026',
                  priority: 'Low',
                  priorityColor: 'text-gray-700',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3"
                >
                  {/* Top Row: Type & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                        <RotateCcw size={15} />
                      </div>
                      <h4 className="text-xs font-black text-gray-900">
                        {item.type}
                      </h4>
                    </div>

                    <span
                      className={`text-[9px] font-extrabold px-3 py-0.5 rounded-full ${item.statusColor}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Details Card */}
                  <div className="bg-gray-50/70 rounded-2xl p-3 space-y-1">
                    <p className="text-[9px] font-medium text-gray-400">Details</p>
                    <h5 className="text-xs font-black text-gray-900 leading-snug">
                      {item.title}
                    </h5>
                    <p className="text-[10px] font-medium text-gray-400">
                      {item.desc}
                    </p>
                  </div>

                  {/* Bottom Row: Date & Priority */}
                  <div className="flex items-center justify-between text-[10px] font-medium text-gray-400 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>{item.date}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span>Priority :</span>
                      <span className={`font-bold ${item.priorityColor}`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeSubView === 'myActivities') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setActiveSubView('profile')}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              My Activities
            </h1>
          </div>

          {/* Activities List */}
          <div className="space-y-3 pt-1">
            {[
              {
                id: '1',
                type: 'Sale Completed',
                time: '07:21 PM',
                title: 'Completed sale #13277 for ₹261',
                date: 'Saturday, 8th August 2026',
                icon: 'bag',
                iconBg: 'bg-emerald-50 text-[#00891D]',
              },
              {
                id: '2',
                type: 'Route Updated',
                time: '02:00 PM',
                title: 'Updated route assignment for agent Abhiram on route "Test route"',
                date: 'Thursday, 6th August 2026',
                icon: 'route',
                iconBg: 'bg-emerald-50 text-[#00891D]',
              },
              {
                id: '3',
                type: 'Route Assigned',
                time: '10:33 AM',
                title: 'Assigned route "Test route" to agent Abhiram with vehicle Test Vehicle',
                date: 'Thursday, 6th August 2026',
                icon: 'route',
                iconBg: 'bg-emerald-50 text-[#00891D]',
              },
              {
                id: '4',
                type: 'Driver Assigned',
                time: '05:25 PM',
                title: 'Handover executed for vehicle Test Vehicle to Abhiram via policy INHERIT',
                date: 'Wednesday, 5th August 2026',
                icon: 'driver',
                iconBg: 'bg-blue-50 text-blue-500',
              },
              {
                id: '5',
                type: 'Sale Completed',
                time: '05:33 PM',
                title: 'Completed sale #11496 for ₹415',
                date: 'Monday, 20th July 2026',
                icon: 'bag',
                iconBg: 'bg-emerald-50 text-[#00891D]',
              },
              {
                id: '6',
                type: 'Sale Completed',
                time: '09:02 PM',
                title: 'Completed sale #10925 for ₹88',
                date: 'Thursday, 9th July 2026',
                icon: 'bag',
                iconBg: 'bg-emerald-50 text-[#00891D]',
              },
            ].map((act) => (
              <div
                key={act.id}
                className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-start gap-3.5"
              >
                {/* Left Icon Container */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${act.iconBg}`}
                >
                  {act.icon === 'bag' && <ShoppingBag size={18} />}
                  {act.icon === 'route' && <span className="text-base">🔀</span>}
                  {act.icon === 'driver' && <span className="text-base">📋</span>}
                </div>

                {/* Right Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500">
                      {act.type}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400">
                      {act.time}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-gray-900 leading-snug">
                    {act.title}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 pt-0.5">
                    <Calendar size={11} />
                    <span>{act.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeSubView === 'changePassword') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-5">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setActiveSubView('profile')}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Change Password
            </h1>
          </div>

          {/* Password Form */}
          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
                <input
                  type={showPasswordCurrent ? 'text' : 'password'}
                  required
                  placeholder="***************"
                  value={passwords.oldPassword}
                  onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordCurrent(!showPasswordCurrent)}
                  className="text-gray-400 hover:text-gray-600 shrink-0 ml-2"
                >
                  <span className="text-sm">👁</span>
                </button>
              </div>
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => toast.success('Password reset link sent to your registered email.')}
                  className="text-[11px] font-black text-[#00891D] hover:underline"
                >
                  Forgot Password
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
                <input
                  type={showPasswordNew ? 'text' : 'password'}
                  required
                  placeholder="***************"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordNew(!showPasswordNew)}
                  className="text-gray-400 hover:text-gray-600 shrink-0 ml-2"
                >
                  <span className="text-sm">👁</span>
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  required
                  placeholder="***************"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="text-gray-400 hover:text-gray-600 shrink-0 ml-2"
                >
                  <span className="text-sm">👁</span>
                </button>
              </div>
            </div>

            {/* Save Password Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isUpdating ? <Loader2 className="animate-spin" size={16} /> : 'Save Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Header Bar */}
        <div className="pt-1">
          <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
            My Profile
          </h1>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                <User size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-tight">
                  {currentUser?.name || 'Abhiram'}
                </h3>
                <span className="inline-block mt-1 text-[9px] font-extrabold text-white bg-[#00891D] px-2.5 py-0.5 rounded-full">
                  {currentUser?.role?.replace('_', ' ') || 'Sales Agent'}
                </span>
              </div>
            </div>

            <button className="w-8 h-8 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
              <span className="text-xs">✏️</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-[10px] font-semibold text-gray-600">
            <div className="flex items-center gap-1.5 truncate">
              <Phone size={12} className="text-[#00891D] shrink-0" />
              <span className="truncate">{currentUser?.mobile || '9876543210'}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Mail size={12} className="text-[#00891D] shrink-0" />
              <span className="truncate">{currentUser?.email || 'Abhi@Wheels.Com'}</span>
            </div>
          </div>
        </div>

        {/* Assigned Vehicle Card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-900 leading-tight">
                  {currentUser?.assignedVehicle?.vehicleName || 'Test Vehicle'}
                </h4>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                  TATA ACE
                </p>
              </div>
            </div>

            <span className="text-[10px] font-extrabold text-gray-800 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-xl">
              {currentUser?.assignedVehicle?.vehicleNumber || 'AP 39 AB 1234'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
            <div>
              <p className="text-[9px] font-semibold text-gray-400">Status</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00891D]"></span>
                <span className="text-xs font-black text-[#00891D]">ACTIVE</span>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-gray-400">Documentation</p>
              <p className="text-xs font-black text-gray-900 mt-0.5">Verified Cloud</p>
            </div>
          </div>
        </div>

        {/* CASH MANAGEMENT */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            CASH MANAGEMENT
          </p>
          <div
            onClick={() => navigate('/vsms/agent-portal/closing-cash')}
            className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
              <span className="text-lg">💵</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-extrabold text-gray-900">Cash Reconciliation</h5>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">Reconcile cash collected</p>
            </div>
            <span className="text-gray-300 font-bold text-sm">›</span>
          </div>
        </div>

        {/* SALES */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            SALES
          </p>
          <div
            onClick={() => navigate('/vsms/agent-portal/sales')}
            className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
              <span className="text-base">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-extrabold text-gray-900">Sales Management</h5>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">View sales history and analytics</p>
            </div>
            <span className="text-gray-300 font-bold text-sm">›</span>
          </div>
        </div>

        {/* MY ASSETS & ACTIVITIES */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            MY ASSETS & ACTIVITIES
          </p>

          <div
            onClick={() => setActiveSubView('myAssets')}
            className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-extrabold text-gray-900">My Assets</h5>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">View and manage your assets</p>
            </div>
            <span className="text-gray-300 font-bold text-sm">›</span>
          </div>

          <div
            onClick={() => setActiveSubView('myActivities')}
            className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
              <span className="text-base">📋</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-extrabold text-gray-900">My Activities</h5>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">View recent operational logs & handovers</p>
            </div>
            <span className="text-gray-300 font-bold text-sm">›</span>
          </div>
        </div>

        {/* Account Security Button */}
        <div className="pt-1">
          <div
            onClick={() => setActiveSubView('changePassword')}
            className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
              <KeyRound size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-extrabold text-gray-900">Change Password</h5>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">Update your account password</p>
            </div>
            <span className="text-gray-300 font-bold text-sm">›</span>
          </div>
        </div>
      </div>
    </div>
  );
}
