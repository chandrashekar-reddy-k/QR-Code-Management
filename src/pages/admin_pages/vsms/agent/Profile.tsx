import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import api, { authAPI, assetAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  User,
  Phone,
  Mail,
  Truck,
  LogOut,
  Package,
  Loader2,
  Download,
  ArrowLeft,
  RotateCcw,
  ShoppingBag,
  Calendar,
  Pencil,
  Banknote,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Eye,
  EyeOff,
  GitFork,
  Tv,
  Plus,
  AlertTriangle,
  Camera,
} from 'lucide-react';

import { format } from 'date-fns';
import { adminAPI } from '../services/adminService';

export default function Profile() {
  const { user, clearUser } = useUserStore();
  const navigate = useNavigate();

  const [fullUser, setFullUser] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [activitiesList, setActivitiesList] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activeSubView, setActiveSubView] = useState<
    'profile' | 'editProfile' | 'changePassword' | 'myActivities' | 'myAssets' | 'requestAsset' | 'reportIssue' | 'requestReplacement'
  >('profile');

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

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleOpenEditProfile = () => {
    setEditName(currentUser?.name || '');
    setEditPhone(currentUser?.phone || currentUser?.mobile || '');
    setEditEmail(currentUser?.email || '');
    setEditAvatarFile(null);
    setEditAvatarPreview(currentUser?.avatar || null);
    setActiveSubView('editProfile');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return toast.error('Avatar image must be under 5MB');
      }
      setEditAvatarFile(file);
      setEditAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      return toast.error('Full name is required');
    }
    if (!editPhone.trim()) {
      return toast.error('Phone number is required');
    }

    setIsUpdatingProfile(true);
    try {
      let res;
      if (editAvatarFile) {
        const fd = new FormData();
        fd.append('name', editName.trim());
        if (editPhone.trim()) fd.append('phone', editPhone.trim());
        if (editEmail.trim()) fd.append('email', editEmail.trim());
        fd.append('avatar', editAvatarFile);
        res = await authAPI.updateProfile(fd);
      } else {
        res = await authAPI.updateProfile({
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
        });
      }

      toast.success('Profile updated successfully!');
      
      const payload = res.data?.data || res.data;
      if (payload) {
        const updated = {
          ...user,
          ...payload,
          name: payload.name || editName.trim(),
          phone: payload.phone || editPhone.trim(),
          mobile: payload.phone || editPhone.trim(),
          email: payload.email || editEmail.trim(),
          avatar: payload.avatar || editAvatarPreview,
        };
        useUserStore.getState().setUser(updated);
        try {
          localStorage.setItem('partnerUser', JSON.stringify(updated));
          localStorage.setItem('user', JSON.stringify(updated));
          localStorage.setItem('userName', updated.name);
        } catch {}
      }

      await fetchProfile();
      setActiveSubView('profile');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeSubView === 'myActivities') {
      const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
          const res = await api.get('/activities/my?limit=50');
          if (res.data?.success && Array.isArray(res.data.logs)) {
            setActivitiesList(res.data.logs);
          } else if (Array.isArray(res.data)) {
            setActivitiesList(res.data);
          } else {
            setActivitiesList([]);
          }
        } catch (error) {
          console.error('Failed to fetch activities:', error);
          setActivitiesList([]);
        } finally {
          setLoadingActivities(false);
        }
      };
      fetchActivities();
    }
  }, [activeSubView]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
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
        newPassword: passwords.newPassword,
      });
      toast.success('Password updated securely!');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [assetsTab, setAssetsTab] = useState<'myAssets' | 'status'>('myAssets');

  // Live Asset States
  const [myAssetsList, setMyAssetsList] = useState<any[]>([]);
  const [myAssetRequests, setMyAssetRequests] = useState<any[]>([]);
  const [assetCatalog, setAssetCatalog] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [isSubmittingAssetAction, setIsSubmittingAssetAction] = useState(false);
  const [selectedAssetForAction, setSelectedAssetForAction] = useState<any>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  // Request Asset Form State
  const [reqAssetType, setReqAssetType] = useState('');
  const [reqPriority, setReqPriority] = useState('MEDIUM');
  const [reqReason, setReqReason] = useState('');

  // Report Issue Form State
  const [issueAssetType, setIssueAssetType] = useState('');
  const [issueType, setIssueType] = useState('NOT_WORKING');
  const [issueReason, setIssueReason] = useState('');
  const [issuePhotos, setIssuePhotos] = useState<File[]>([]);

  // Request Replacement Form State
  const [repAssetType, setRepAssetType] = useState('');
  const [repPriority, setRepPriority] = useState('MEDIUM');
  const [repReason, setRepReason] = useState('');

  const fetchAssetsData = async () => {
    setLoadingAssets(true);
    try {
      const [assetsRes, reqsRes, catRes] = await Promise.all([
        assetAPI.getMyAssets(),
        assetAPI.getMyRequests(),
        assetAPI.getCatalog().catch(() => ({ data: [] })),
      ]);
      setMyAssetsList(Array.isArray(assetsRes.data) ? assetsRes.data : []);
      setMyAssetRequests(Array.isArray(reqsRes.data) ? reqsRes.data : []);
      setAssetCatalog(Array.isArray(catRes.data) ? catRes.data : []);
    } catch (err) {
      console.error('Failed to load asset data:', err);
      setMyAssetsList([]);
      setMyAssetRequests([]);
      setAssetCatalog([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    if (
      activeSubView === 'myAssets' ||
      activeSubView === 'requestAsset' ||
      activeSubView === 'reportIssue' ||
      activeSubView === 'requestReplacement'
    ) {
      fetchAssetsData();
    }
  }, [activeSubView]);

  const handleReplacementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenUnitId = repAssetType || selectedAssetForAction?.assetUnitId || selectedAssetForAction?.id;
    if (!chosenUnitId) {
      return toast.error('Please select an assigned asset to replace');
    }
    const target = myAssetsList.find(
      (a) => (a.assetUnitId || a.id) === chosenUnitId
    ) || selectedAssetForAction;

    setIsSubmittingAssetAction(true);
    try {
      await assetAPI.createRequest({
        type: 'REPLACEMENT',
        assetId: target?.assetUnit?.asset?.id || target?.assetUnit?.assetId || null,
        assetUnitId: target?.assetUnitId || target?.assetUnit?.id || chosenUnitId,
        description: repReason,
        priority: repPriority || 'MEDIUM',
      });
      toast.success('Replacement request submitted successfully!');
      setRepReason('');
      setRepAssetType('');
      setSelectedAssetForAction(null);
      await fetchAssetsData();
      setAssetsTab('status');
      setActiveSubView('myAssets');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit replacement request');
    } finally {
      setIsSubmittingAssetAction(false);
    }
  };

  const handleReportIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenUnitId = issueAssetType || selectedAssetForAction?.assetUnitId || selectedAssetForAction?.id;
    if (!chosenUnitId) {
      return toast.error('Please select an assigned asset');
    }
    const target = myAssetsList.find(
      (a) => (a.assetUnitId || a.id) === chosenUnitId
    ) || selectedAssetForAction;

    const unitId = target?.assetUnitId || target?.assetUnit?.id || chosenUnitId;

    setIsSubmittingAssetAction(true);
    try {
      const fd = new FormData();
      fd.append('assetUnitId', unitId);
      fd.append('issueType', issueType || 'OTHER');
      if (issueReason) fd.append('description', issueReason);
      if (issuePhotos && issuePhotos.length > 0) {
        issuePhotos.forEach((file) => fd.append('photos', file));
      }

      await assetAPI.reportIssue(fd);
      toast.success('Asset issue reported successfully!');
      setIssueReason('');
      setIssuePhotos([]);
      setIssueAssetType('');
      setSelectedAssetForAction(null);
      await fetchAssetsData();
      setActiveSubView('myAssets');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to report issue');
    } finally {
      setIsSubmittingAssetAction(false);
    }
  };

  const handleRequestAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqAssetType) {
      return toast.error('Please select an asset type or requirement');
    }
    setIsSubmittingAssetAction(true);
    try {
      const isCustom = reqAssetType === 'custom';
      await assetAPI.createRequest({
        type: isCustom ? 'NEW_REQUIREMENT' : 'NEW_ASSET',
        assetId: isCustom ? null : reqAssetType,
        description: reqReason,
        priority: reqPriority || 'MEDIUM',
      });
      toast.success('Asset request submitted successfully!');
      setReqAssetType('');
      setReqReason('');
      await fetchAssetsData();
      setAssetsTab('status');
      setActiveSubView('myAssets');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit asset request');
    } finally {
      setIsSubmittingAssetAction(false);
    }
  };

  // SUBVIEW 1: REQUEST REPLACEMENT
  if (activeSubView === 'requestReplacement') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
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

          <form onSubmit={handleReplacementSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Select Asset to Replace <span className="text-red-500">*</span>
              </label>
              {myAssetsList.length === 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-800 space-y-2">
                  <p className="font-semibold">You don't have any assigned assets to replace.</p>
                  <button
                    type="button"
                    onClick={() => setActiveSubView('requestAsset')}
                    className="text-xs font-bold text-[#00891D] underline block"
                  >
                    Request a new asset instead →
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                  <select
                    required
                    value={repAssetType}
                    onChange={(e) => setRepAssetType(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select Asset</option>
                    {myAssetsList.map((assignment: any) => (
                      <option key={assignment.id} value={assignment.assetUnitId || assignment.id}>
                        {assignment.assetUnit?.asset?.name || 'Asset'} ({assignment.assetUnit?.serialNumber || 'Unit'})
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
                </div>
              )}
            </div>

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
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">Reason/Description <span className="text-red-500">*</span></label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm">
                <textarea
                  required
                  rows={4}
                  placeholder="Describe why do you need replacement (e.g. damaged, wrong size, hardware failure)..."
                  value={repReason}
                  onChange={(e) => setRepReason(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-400 outline-none resize-none"
                />
              </div>
            </div>

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
                disabled={isSubmittingAssetAction || myAssetsList.length === 0}
                className="col-span-8 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingAssetAction ? <Loader2 className="animate-spin" size={16} /> : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SUBVIEW 2: REPORT ISSUE
  if (activeSubView === 'reportIssue') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setActiveSubView('myAssets')}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Report Issue</h1>
          </div>

          <form onSubmit={handleReportIssueSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Select Asset <span className="text-red-500">*</span>
              </label>
              {myAssetsList.length === 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">No assets currently assigned to report an issue on.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                  <select
                    required
                    value={issueAssetType}
                    onChange={(e) => setIssueAssetType(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Select Asset</option>
                    {myAssetsList.map((assignment: any) => (
                      <option key={assignment.id} value={assignment.assetUnitId || assignment.id}>
                        {assignment.assetUnit?.asset?.name || 'Asset'} ({assignment.assetUnit?.serialNumber || 'Unit'})
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Select Issue Type <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                <select
                  required
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                >
                  <option value="DAMAGED">Damaged / Torn</option>
                  <option value="NOT_WORKING">Not Working / Hardware Fault</option>
                  <option value="BATTERY">Battery / Charging Issue</option>
                  <option value="LOST">Lost / Stolen</option>
                  <option value="OTHER">Other Issue</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">Reason / Description <span className="text-red-500">*</span></label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm">
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what happened..."
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-400 outline-none resize-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">Photos</label>
              <input
                id="issue-photos-input"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setIssuePhotos(Array.from(e.target.files));
                  }
                }}
              />
              <div
                onClick={() => document.getElementById('issue-photos-input')?.click()}
                className="bg-white rounded-3xl p-6 border border-dashed border-gray-200 hover:border-emerald-300 shadow-sm flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#00891D] flex items-center justify-center">
                  <Download size={18} className="rotate-180" />
                </div>
                <div className="text-center">
                  <h4 className="text-xs font-extrabold text-gray-900">
                    {issuePhotos.length > 0 ? `${issuePhotos.length} photo(s) selected` : 'Tap to add photos'}
                  </h4>
                  <p className="text-[10px] font-medium text-gray-400 mt-0.5">JPG, PNG up to 10MB</p>
                </div>
              </div>
            </div>

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
                disabled={isSubmittingAssetAction || myAssetsList.length === 0}
                className="col-span-8 py-3.5 bg-[#E85D04] hover:bg-[#d45300] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingAssetAction ? <Loader2 className="animate-spin" size={16} /> : 'Report Issue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SUBVIEW 3: REQUEST ASSET
  if (activeSubView === 'requestAsset') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => setActiveSubView('myAssets')}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Request New Asset</h1>
          </div>

          <form onSubmit={handleRequestAssetSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">
                Select Asset / Item <span className="text-red-500">*</span>
              </label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm flex items-center justify-between">
                <select
                  required
                  value={reqAssetType}
                  onChange={(e) => setReqAssetType(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select Asset from Catalog</option>
                  {assetCatalog.map((catItem: any) => (
                    <option key={catItem.id} value={catItem.id}>
                      {catItem.name} {catItem.model ? `(${catItem.model})` : ''} - {catItem.assetType || 'Equipment'}
                    </option>
                  ))}
                  <option value="custom">Other / Custom Requirement</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

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
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Priority</option>
                </select>
                <span className="text-gray-400 font-bold text-xs pointer-events-none">⌵</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-900">Reason/Description <span className="text-red-500">*</span></label>
              <div className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-sm">
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what item is needed and why (e.g. Size L uniform, POS machine)..."
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-700 placeholder:text-gray-400 outline-none resize-none"
                />
              </div>
            </div>

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
                disabled={isSubmittingAssetAction}
                className="col-span-8 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingAssetAction ? <Loader2 className="animate-spin" size={16} /> : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SUBVIEW 4: MY ASSETS
  if (activeSubView === 'myAssets') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-4">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubView('profile')}
                className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">My Assets</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {myAssetsList.length} assigned • {myAssetRequests.length} requests
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubView('requestAsset')}
                className="px-3 py-1.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-xl text-[10px] font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus size={12} strokeWidth={3} />
                <span>Request New</span>
              </button>
              {myAssetsList.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedAssetForAction(myAssetsList[0]);
                    setIssueAssetType(myAssetsList[0].assetUnitId || myAssetsList[0].id);
                    setActiveSubView('reportIssue');
                  }}
                  className="px-3 py-1.5 bg-[#E85D04] hover:bg-[#d45300] text-white rounded-xl text-[10px] font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Report Issue
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-1.5 border border-gray-200/80 shadow-sm grid grid-cols-2 gap-1">
            <button
              onClick={() => setAssetsTab('myAssets')}
              className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                assetsTab === 'myAssets' ? 'bg-emerald-50 text-[#00891D]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Package size={14} />
              <span>Assigned ({myAssetsList.length})</span>
            </button>
            <button
              onClick={() => setAssetsTab('status')}
              className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                assetsTab === 'status' ? 'bg-emerald-50 text-[#00891D]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <RotateCcw size={14} />
              <span>Status ({myAssetRequests.length})</span>
            </button>
          </div>

          {loadingAssets ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <Loader2 className="animate-spin text-[#00891D]" size={36} />
              <p className="text-xs font-bold text-gray-400">Loading your assets...</p>
            </div>
          ) : assetsTab === 'myAssets' ? (
            <div className="space-y-3 pt-1">
              {myAssetsList.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#00891D] mx-auto flex items-center justify-center">
                    <Package size={30} strokeWidth={2} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black text-gray-900">No Assets Assigned</h3>
                    <p className="text-[11px] font-medium text-gray-400 max-w-xs mx-auto leading-relaxed">
                      You currently do not have any company assets, uniforms, or hardware assigned to you in the system.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveSubView('requestAsset')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Request an Asset</span>
                    </button>
                  </div>
                </div>
              ) : (
                myAssetsList.map((assignment: any) => {
                  const asset = assignment.assetUnit?.asset;
                  const unit = assignment.assetUnit;
                  const isExpanded = expandedAssetId === assignment.id;
                  const assignedDateFormatted = assignment.assignedDate
                    ? format(new Date(assignment.assignedDate), 'dd MMM yyyy')
                    : 'Assigned';

                  return (
                    <div key={assignment.id} className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-4">
                      <div
                        onClick={() => setExpandedAssetId(isExpanded ? null : assignment.id)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00891D] flex items-center justify-center shrink-0">
                            <Package size={20} />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-gray-900 leading-tight">{asset?.name || 'Assigned Asset'}</h3>
                            <p className="text-[10px] font-medium text-gray-400 mt-0.5">{asset?.model || asset?.description || 'Company Gear'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-extrabold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            {assignment.isActive ? 'In use' : 'Returned'}
                          </span>
                          <span className="text-gray-400 font-bold text-xs">
                            {isExpanded ? '⌵' : '›'}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-4 pt-1 animate-fade-in">
                          <div className="bg-gray-50/70 rounded-2xl p-3.5 divide-y divide-gray-100 space-y-2 text-xs">
                            <div className="flex items-center justify-between pb-2">
                              <span className="text-[10px] font-medium text-gray-400">Condition</span>
                              <span className="text-xs font-black text-gray-900">{unit?.condition || 'Good'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-[10px] font-medium text-gray-400">Assigned On</span>
                              <span className="text-xs font-black text-gray-900">{assignedDateFormatted}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-[10px] font-medium text-gray-400">Brand / Model</span>
                              <span className="text-xs font-black text-gray-900">{asset?.brand || asset?.model || 'VillagKart'}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[10px] font-medium text-gray-400">Asset ID / Serial</span>
                              <span className="text-xs font-black text-gray-900">{unit?.serialNumber || assignment.id.slice(0, 8)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                setSelectedAssetForAction(assignment);
                                setRepAssetType(assignment.assetUnitId || assignment.id);
                                setActiveSubView('requestReplacement');
                              }}
                              className="py-3 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all cursor-pointer"
                            >
                              Replace
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAssetForAction(assignment);
                                setIssueAssetType(assignment.assetUnitId || assignment.id);
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
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {myAssetRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center">
                    <RotateCcw size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-gray-900">No Asset Requests</h3>
                    <p className="text-[11px] font-medium text-gray-400 max-w-xs mx-auto">
                      You haven't submitted any asset requests, replacements, or issue reports yet.
                    </p>
                  </div>
                </div>
              ) : (
                myAssetRequests.map((reqItem: any) => {
                  const reqDate = reqItem.createdAt ? format(new Date(reqItem.createdAt), 'dd MMM yyyy') : 'Recent';
                  const statusBadge =
                    reqItem.status === 'APPROVED' || reqItem.status === 'FULFILLED'
                      ? 'text-[#00891D] bg-emerald-50 border border-emerald-100'
                      : reqItem.status === 'REJECTED'
                      ? 'text-rose-600 bg-rose-50 border border-rose-100'
                      : 'text-amber-700 bg-amber-50 border border-amber-100';

                  const typeLabel =
                    reqItem.type === 'NEW_ASSET'
                      ? 'New Asset Request'
                      : reqItem.type === 'REPLACEMENT'
                      ? 'Replacement'
                      : reqItem.type === 'NEW_REQUIREMENT'
                      ? 'Requirement'
                      : reqItem.type?.replace(/_/g, ' ') || 'Request';

                  return (
                    <div key={reqItem.id} className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00891D] flex items-center justify-center">
                            <RotateCcw size={15} />
                          </div>
                          <h4 className="text-xs font-black text-gray-900">{typeLabel}</h4>
                        </div>

                        <span className={`text-[9px] font-extrabold px-3 py-0.5 rounded-full capitalize ${statusBadge}`}>
                          {reqItem.status?.toLowerCase() || 'pending'}
                        </span>
                      </div>

                      <div className="bg-gray-50/70 rounded-2xl p-3 space-y-1">
                        <p className="text-[9px] font-medium text-gray-400">Details</p>
                        <h5 className="text-xs font-black text-gray-900 leading-snug">
                          {reqItem.asset?.name || (reqItem.type === 'NEW_REQUIREMENT' ? 'Special Requirement' : 'Asset Request')}
                        </h5>
                        {reqItem.description && (
                          <p className="text-[10px] font-medium text-gray-500">{reqItem.description}</p>
                        )}
                        {reqItem.adminRemark && (
                          <div className="pt-1.5 border-t border-gray-100 text-[10px]">
                            <span className="font-bold text-gray-600">Admin Remark: </span>
                            <span className="text-gray-500">{reqItem.adminRemark}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-medium text-gray-400 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span>{reqDate}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span>Priority :</span>
                          <span className={`font-bold capitalize ${
                            reqItem.priority === 'HIGH' || reqItem.priority === 'URGENT' ? 'text-[#E85D04]' : 'text-gray-900'
                          }`}>
                            {reqItem.priority?.toLowerCase() || 'medium'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // SUBVIEW 5: MY ACTIVITIES
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

          {/* Activities List (Live Backend API Data from DB) */}
          <div className="space-y-3 pt-1">
            {loadingActivities ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-100 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-emerald-600" size={24} />
                <p className="text-xs font-semibold text-gray-400">Loading activities...</p>
              </div>
            ) : activitiesList && activitiesList.length > 0 ? (
              activitiesList.map((act: any) => ({
                id: act.id,
                type: act.action || act.type || 'Activity',
                time: act.createdAt ? format(new Date(act.createdAt), 'hh:mm a') : '',
                title: act.description || act.title || act.details || 'Activity log recorded',
                date: act.createdAt ? format(new Date(act.createdAt), 'EEEE, do MMMM yyyy') : '',
                icon: (act.action || act.type || '').toLowerCase().includes('driver') ? 'driver' : (act.action || act.type || '').toLowerCase().includes('route') ? 'route' : 'bag',
                iconBg: (act.action || act.type || '').toLowerCase().includes('driver') ? 'bg-[#E3F2FD] text-[#1E88E5]' : 'bg-[#E8F5E9] text-[#00891D]',
              })).map((act) => (
                <div
                  key={act.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex items-start gap-3.5"
                >
                {/* Left Icon Container */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${act.iconBg}`}
                >
                  {act.icon === 'bag' && <ShoppingBag size={19} strokeWidth={2} />}
                  {act.icon === 'route' && <GitFork size={19} strokeWidth={2} />}
                  {act.icon === 'driver' && <Tv size={19} strokeWidth={2} />}
                </div>

                {/* Right Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">{act.type}</span>
                    <span className="text-[11px] font-semibold text-gray-400">{act.time}</span>
                  </div>

                  <h4 className="text-xs font-black text-gray-900 leading-snug">
                    {act.title}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-400 pt-0.5">
                    <Calendar size={12} className="text-gray-400 shrink-0" />
                    <span>{act.date}</span>
                  </div>
                </div>
              </div>
              ))) : (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center space-y-1">
                <p className="text-xs font-semibold text-gray-500">No activity logs recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SUBVIEW 6: CHANGE PASSWORD
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

          {/* Form */}
          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-900 flex items-center gap-1">
                Current Password <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="bg-white border border-gray-200/90 rounded-2xl px-4 py-3.5 shadow-2xs flex items-center justify-between">
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
                  className="text-gray-400 hover:text-gray-600 shrink-0 ml-2 cursor-pointer"
                >
                  {showPasswordCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => toast.success('Password reset link sent to your registered email.')}
                  className="text-xs font-bold text-[#00891D] hover:underline cursor-pointer"
                >
                  Forgot Password
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-900 flex items-center gap-1">
                New Password <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="bg-white border border-gray-200/90 rounded-2xl px-4 py-3.5 shadow-2xs flex items-center justify-between">
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
                  className="text-gray-400 hover:text-gray-600 shrink-0 ml-2 cursor-pointer"
                >
                  {showPasswordNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-900 flex items-center gap-1">
                Confirm New Password <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="bg-white border border-gray-200/90 rounded-2xl px-4 py-3.5 shadow-2xs flex items-center justify-between">
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
                  className="text-gray-400 hover:text-gray-600 shrink-0 ml-2 cursor-pointer"
                >
                  {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Save Password Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isUpdating ? <Loader2 className="animate-spin" size={16} /> : 'Save Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SUBVIEW 7: EDIT PROFILE
  if (activeSubView === 'editProfile') {
    return (
      <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
        <div className="max-w-[420px] mx-auto px-4 space-y-5">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setActiveSubView('profile')}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
              Edit Profile
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
            {/* Avatar Section */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex items-center gap-4">
              <div className="relative group shrink-0">
                {editAvatarPreview ? (
                  <img
                    src={editAvatarPreview}
                    alt="Agent Avatar"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center font-black text-xl shadow-xs">
                    {editName?.trim()?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                )}
                <label
                  htmlFor="agent-avatar-upload"
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-[#00891D] text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-[#007018] active:scale-90 transition-all"
                  title="Change avatar photo"
                >
                  <Camera size={14} />
                  <input
                    id="agent-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-gray-900 leading-tight">Profile Picture</h4>
                <p className="text-[11px] font-medium text-gray-400">
                  Tap camera icon to upload a photo (PNG, JPG up to 5MB)
                </p>
                {editAvatarFile && (
                  <span className="inline-block text-[10px] font-bold text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded-md">
                    New photo selected
                  </span>
                )}
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-900 flex items-center gap-1">
                Full Name <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="bg-white border border-gray-200/90 rounded-2xl px-4 py-3.5 shadow-2xs flex items-center gap-2.5 focus-within:border-[#00891D] transition-colors">
                <User size={16} className="text-[#00891D] shrink-0" />
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* Mobile / Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-900 flex items-center gap-1">
                Phone / Mobile Number <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="bg-white border border-gray-200/90 rounded-2xl px-4 py-3.5 shadow-2xs flex items-center gap-2.5 focus-within:border-[#00891D] transition-colors">
                <Phone size={16} className="text-[#00891D] shrink-0" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-900">
                Email Address
              </label>
              <div className="bg-white border border-gray-200/90 rounded-2xl px-4 py-3.5 shadow-2xs flex items-center gap-2.5 focus-within:border-[#00891D] transition-colors">
                <Mail size={16} className="text-[#00891D] shrink-0" />
                <input
                  type="email"
                  placeholder="e.g. agent@villagkart.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {/* Read-Only Account Role & Vehicle Info */}
            <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-3.5 space-y-1">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Account Role</p>
              <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                <span>{currentUser?.role?.replace(/_/g, ' ') || 'Vehicle Agent'}</span>
                <span className="text-xs font-semibold text-gray-600">
                  {currentUser?.assignedVehicle?.vehicleNumber || 'No Vehicle Linked'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isUpdatingProfile ? <Loader2 className="animate-spin" size={16} /> : null}
                <span>{isUpdatingProfile ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubView('profile')}
                className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl text-xs font-bold shadow-2xs active:scale-98 transition-all flex items-center justify-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // MAIN PROFILE SCREEN
  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        <div className="pt-1">
          <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">My Profile</h1>
        </div>

        {/* 1. User Info Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                <User size={22} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                  {currentUser?.name || 'Agent'}
                </h3>
                <span className="inline-block mt-1 text-[10px] font-bold text-white bg-[#00891D] px-3 py-0.5 rounded-full uppercase tracking-wider">
                  {currentUser?.role?.replace(/_/g, ' ') || 'Vehicle Agent'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:text-[#00891D] hover:border-emerald-300 hover:bg-emerald-50 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <Pencil size={15} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-xs font-semibold text-gray-700">
            <div className="flex items-center gap-2 truncate">
              <Phone size={14} className="text-[#00891D] shrink-0" />
              <span className="truncate">{currentUser?.phone || currentUser?.mobile || 'Not Set'}</span>
            </div>
            <div className="flex items-center gap-2 truncate pl-2 border-l border-gray-100">
              <Mail size={14} className="text-[#00891D] shrink-0" />
              <span className="truncate">{currentUser?.email || 'Not Set'}</span>
            </div>
          </div>
        </div>

        {/* 2. Assigned Vehicle Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                <Truck size={20} strokeWidth={2} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-gray-900 leading-tight">
                  {currentUser?.assignedVehicle?.vehicleName || (currentUser?.assignedVehicleId ? 'Assigned Vehicle' : 'No Vehicle Linked')}
                </h4>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">
                  {currentUser?.assignedVehicle ? (currentUser.assignedVehicle.displayId || 'Mobile Store Unit') : 'Unassigned'}
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
              {currentUser?.assignedVehicle?.vehicleNumber || (currentUser?.assignedVehicleId ? 'Linked' : 'No Vehicle')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 divide-x divide-gray-100">
            <div className="pr-2">
              <p className="text-[10px] font-bold text-gray-400">Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {currentUser?.assignedVehicle ? (
                  <>
                    <span className={`w-2 h-2 rounded-full ${currentUser?.assignedVehicle?.status !== false ? 'bg-[#00891D]' : 'bg-amber-500'}`}></span>
                    <span className={`text-xs font-extrabold ${currentUser?.assignedVehicle?.status !== false ? 'text-[#00891D]' : 'text-amber-600'}`}>
                      {currentUser?.assignedVehicle?.status !== false ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    <span className="text-xs font-extrabold text-gray-400">UNASSIGNED</span>
                  </>
                )}
              </div>
            </div>
            <div className="pl-3">
              <p className="text-[10px] font-bold text-gray-400">Documentation</p>
              <p className="text-xs font-extrabold text-gray-900 mt-0.5">
                {currentUser?.assignedVehicle?.rcDocument || currentUser?.assignedVehicle?.insuranceDocument
                  ? 'Verified Cloud'
                  : currentUser?.assignedVehicle
                  ? 'Pending Verification'
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. CASH MANAGEMENT */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">CASH MANAGEMENT</p>
          <div
            onClick={() => navigate('/vsms/agent-portal/closing-cash')}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex items-center justify-between gap-3.5 hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
              <Banknote size={20} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h5 className="text-xs font-extrabold text-gray-900">Cash Reconciliation</h5>
              <p className="text-[11px] font-medium text-gray-400">Reconcile cash collected</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </div>
        </div>

        {/* 4. SALES */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">SALES</p>
          <div
            onClick={() => navigate('/vsms/agent-portal/sales-history')}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex items-center justify-between gap-3.5 hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
              <TrendingUp size={20} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h5 className="text-xs font-extrabold text-gray-900">Sales Management</h5>
              <p className="text-[11px] font-medium text-gray-400">View sales history and analytics</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </div>
        </div>

        {/* 5. MY ASSETS & ACTIVITIES */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">MY ASSETS & ACTIVITIES</p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden divide-y divide-gray-100">
            <div
              onClick={() => setActiveSubView('myAssets')}
              className="p-4 flex items-center justify-between gap-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                <ShieldCheck size={20} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <h5 className="text-xs font-extrabold text-gray-900">My Assets</h5>
                <p className="text-[11px] font-medium text-gray-400">View and manage your assets</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </div>

            <div
              onClick={() => setActiveSubView('myActivities')}
              className="p-4 flex items-center justify-between gap-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                <Calendar size={20} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <h5 className="text-xs font-extrabold text-gray-900">My Activities</h5>
                <p className="text-[11px] font-medium text-gray-400">Track your activities and tasks</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </div>
          </div>
        </div>

        {/* 6. ACCOUNT SECURITY */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">ACCOUNT SECURITY</p>
          <div
            onClick={() => setActiveSubView('changePassword')}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex items-center justify-between gap-3.5 hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h5 className="text-xs font-extrabold text-gray-900">Change Password</h5>
              <p className="text-[11px] font-medium text-gray-400">Update your account password</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </div>
        </div>

        {/* 7. Sign Out Button */}
        <div className="pt-2">
          <button
            onClick={() => {
              clearUser();
              toast.success('Logged out successfully');
              navigate('/login');
            }}
            className="w-full py-3.5 bg-[#FFF4EC] border border-[#E85D04] text-[#E85D04] rounded-2xl text-xs font-bold shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-[#FFE8D6]"
          >
            <LogOut size={16} strokeWidth={2.2} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
