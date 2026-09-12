import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import PunchInScreen from '../pages/PunchInScreen';
import { useUserStore } from '../store/userStore';
import { attendanceAPI } from '../services/api';
// hgjhg
export default function AgentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useUserStore();
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [hasPunchedIn, setHasPunchedIn] = useState(false);
  const [checkingAttendance, setCheckingAttendance] = useState(true);

  // Only gate SALES_AGENT, VEHICLE_AGENT, VSMS_AGENT, DELIVERY_AGENT roles
  const roleUpper = (user?.role || '').toUpperCase();
  const isAgent = roleUpper === 'SALES_AGENT' || roleUpper === 'VEHICLE_AGENT' || roleUpper === 'VSMS_AGENT' || roleUpper === 'DELIVERY_AGENT' || roleUpper.endsWith('_AGENT');

  useEffect(() => {
    if (!isAgent) {
      setAttendanceChecked(true);
      setHasPunchedIn(true);
      setCheckingAttendance(false);
      return;
    }

    const checkAttendance = async () => {
      try {
        const { data } = await attendanceAPI.getToday();
        setHasPunchedIn(data.punchedIn === true);
      } catch (err) {
        console.error('Failed to check attendance:', err);
        // On error or unpunched state, enforce punch-in screen
        setHasPunchedIn(false);
      } finally {
        setAttendanceChecked(true);
        setCheckingAttendance(false);
      }
    };

    checkAttendance();
  }, [isAgent]);

  const handlePunchIn = (attendance) => {
    setHasPunchedIn(true);
  };

  // Loading state while checking attendance
  if (checkingAttendance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  // Punch-in gate disabled — agents go straight to the portal after login
  // if (isAgent && user?.attendanceEnabled !== false && attendanceChecked && !hasPunchedIn) {
  //   return <PunchInScreen onPunchIn={handlePunchIn} />;
  // }

  return (
    <div className="bg-slate-50 min-h-screen md:pl-64 flex flex-col">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
