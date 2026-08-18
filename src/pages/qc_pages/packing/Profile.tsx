import React, { useState } from 'react';
import { getQCUser, qcLogout } from './qcAuth';
import {
  Mail,
  Briefcase,
  Shield,
  Key,
  Clock,
  LogOut,
  Phone,
  Building,
  HelpCircle,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const Profile: React.FC = () => {
  const user = getQCUser();
  const navigate = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogout = () => {
    qcLogout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    toast.success('Password updated successfully');
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 px-2 sm:px-4">
      {/* Profile Header Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-1 shadow-xs">
              <div className="w-full h-full bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-purple-600 font-bold text-2xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" title="Active QC Checker" />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200">
                QC Checker / Quality Inspector
              </span>
              <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {user.employeeId}
              </span>
              <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                QA Certified Staff
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employment & Shift Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <Briefcase size={16} className="text-green-600" /> QC Staff Details
          </h3>

          <div className="space-y-3 divide-y divide-gray-100 dark:divide-gray-700 text-xs">
            <div className="pt-2 flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Building size={14} className="text-gray-400" /> Facility / Warehouse
              </span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{user.warehouse?.name || 'Hyderabad Warehouse'}</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Clock size={14} className="text-gray-400" /> Current Shift
              </span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{user.shift || 'Morning Shift'}</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Phone size={14} className="text-gray-400" /> Contact Number
              </span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{user.phone}</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Mail size={14} className="text-gray-400" /> Email
              </span>
              <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Security & Support */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <Shield size={16} className="text-green-600" /> Security & Support
          </h3>

          <div className="space-y-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600">
                  <Key size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Change Password</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Update security credentials for your QC Checker account.</p>
                </div>
              </div>
            </button>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 flex items-center gap-3">
              <HelpCircle size={18} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Quality Manager Support</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">For QA disputes or checklist updates, contact your Quality Manager.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-red-100 dark:border-red-950/40 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-gray-900 dark:text-white">Sign Out Session</h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Log out from this active QC inspection session on your workstation.</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center gap-2 border border-red-200 dark:border-red-800/40 transition-colors cursor-pointer"
        >
          <LogOut size={16} /> Log Out
        </button>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase">Change Account Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-900 font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-green-600 text-white font-bold text-xs shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
