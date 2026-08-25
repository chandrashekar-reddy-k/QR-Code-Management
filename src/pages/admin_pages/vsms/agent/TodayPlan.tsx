// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Sun, Moon, CheckCircle2, Clock, ChevronRight,
  Loader2, ArrowLeft, Calendar, RefreshCw, AlertTriangle,
  X, Play, Square, Activity, ShieldCheck, Store, Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import * as routeService from '../services/routeService';
import * as locationService from '../services/locationService';
import * as shiftService from '../services/shiftService';
import toast from 'react-hot-toast';

export default function TodayPlan() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<any>(null);
  const [markingSlot, setMarkingSlot] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [closureSummary, setClosureSummary] = useState<any>(null);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureRemarks, setClosureRemarks] = useState('');
  const [distanceToVillage, setDistanceToVillage] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [availableShifts, setAvailableShifts] = useState<any[]>([]);
  const [activeVillageVisit, setActiveVillageVisit] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [villageActionLoading, setVillageActionLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await routeService.getCoverageStatus();
      setStatusData(data);
    } catch (err) {
      toast.error("Failed to load today's plan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    fetchActiveShift();
    setIsTracking(locationService.isTrackingActive());
  }, []);

  const fetchActiveShift = async () => {
    try {
      const { data } = await shiftService.getShiftStatus();
      setActiveShift(data.activeShift);
      setAvailableShifts(data.shifts || []);
      setAttendance(data.attendance);
      if (data.activeShift?.activities?.length > 0) {
        const latest = data.activeShift.activities[0];
        if (!latest.endTime) setActiveVillageVisit(latest);
      }
      if (data.activeShift && !locationService.isTrackingActive()) {
        locationService.startLiveTracking();
        setIsTracking(true);
      }
    } catch (err) {
      console.error('Failed to fetch shift status');
    }
  };

  useEffect(() => {
    let interval: any;
    if (activeShift && statusData?.today?.villageChecklist?.length > 0) {
      interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          const unvisited = statusData.today.villageChecklist.filter((v: any) => !v.visited && v.lat && v.lon);
          if (unvisited.length === 0) { setDistanceToVillage(null); return; }
          let minD = 999999;
          unvisited.forEach((target: any) => {
            const R = 6371e3;
            const φ1 = latitude * Math.PI / 180;
            const φ2 = target.lat * Math.PI / 180;
            const Δφ = (target.lat - latitude) * Math.PI / 180;
            const Δλ = (target.lon - longitude) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c;
            if (d < minD) minD = d;
          });
          setDistanceToVillage(minD);
        });
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [activeShift, statusData]);

  const formatTime12h = (time24: string) => {
    if (!time24) return 'N/A';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const handleMarkCoverage = async (shift: any) => {
    if (markingSlot) return;
    setMarkingSlot(shift.id || shift.name);
    try {
      await routeService.markCoverage({ shiftId: shift.id, shiftName: shift.name, slot: shift.name.toUpperCase() });
      toast.success(`${shift.name} coverage marked!`);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to mark ${shift.name}`);
    } finally {
      setMarkingSlot(null);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchStatus(); };

  const handleStartShift = async (type: number) => {
    setActionLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const { latitude, longitude, accuracy } = pos.coords;
      if (accuracy > 2000) throw new Error(`GPS accuracy too low (${Math.round(accuracy)}m).`);
      await shiftService.startShift({ lat: latitude, lon: longitude, accuracy, facePhoto: "placeholder", shiftType: type });
      toast.success('Shift Started ✅');
      locationService.startLiveTracking();
      setIsTracking(true);
      fetchActiveShift();
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start shift');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    setActionLoading(true);
    try {
      const summary = await routeService.getAgentClosureSummary();
      setClosureSummary(summary);
      setShowClosureModal(true);
    } catch (err) {
      toast.error('Failed to load daily summary');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmEndShift = async () => {
    if (closureSummary?.missedVillages?.length > 0 && !closureRemarks.trim()) {
      toast.error('Please provide a reason for missed villages.');
      return;
    }
    setActionLoading(true);
    try {
      locationService.stopLiveTracking();
      setIsTracking(false);
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const { latitude, longitude, accuracy } = pos.coords;
      await shiftService.endShift({ shiftLogId: activeShift.id, lat: latitude, lon: longitude, accuracy, remarks: closureRemarks });
      if (activeVillageVisit) setActiveVillageVisit(null);
      toast.success('Shift Ended ✅. Day Summary Submitted.');
      setShowClosureModal(false);
      setClosureRemarks('');
      setActiveShift(null);
      fetchActiveShift();
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to end shift');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVillageVisit = async (action: 'start' | 'end') => {
    if (!activeShift) { toast.error('Start your shift first.'); return; }
    setVillageActionLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const { latitude, longitude, accuracy } = pos.coords;
      if (accuracy > 2000) { toast.error(`GPS accuracy too low (${Math.round(accuracy)}m).`); return; }
      if (action === 'start') {
        const { data } = await api.post('/village-activities/start', { lat: latitude, lon: longitude, accuracy, shiftLogId: activeShift.id });
        setActiveVillageVisit(data.activity);
        toast.success('Village Visit Started ✅');
      } else {
        await api.post('/village-activities/end', { lat: latitude, lon: longitude, accuracy, activityId: activeVillageVisit.id });
        setActiveVillageVisit(null);
        toast.success('Village Visit Ended ✅');
      }
      fetchActiveShift();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setVillageActionLoading(false);
    }
  };

  const handleLocationCheckIn = () => {
    if (!activeShift) { toast.error('Please start your shift first.'); return; }
    setCheckingIn(true);
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); setCheckingIn(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          if (accuracy > 2000) { toast.error(`GPS accuracy too low (${Math.round(accuracy)}m).`); setCheckingIn(false); return; }
          try {
            await routeService.locationCheckIn({ latitude, longitude, villageName: today?.villageName });
          } catch (e) { console.error('Manual check-in failed:', e); }
          locationService.startLiveTracking();
          setIsTracking(true);
          toast.success('Location ON! You are now visible to Admin.');
          fetchActiveShift();
        } catch (err) {
          toast.error('Failed to sync location. Please try again.');
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => { toast.error('GPS Error: ' + error.message); setCheckingIn(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
          <p className="text-gray-500 font-medium tracking-wide text-sm uppercase">Loading Plan...</p>
        </div>
      </div>
    );
  }

  if (!statusData?.vehicleAssigned) {
    return (
      <div className="min-h-screen pt-8">
        <div className="max-w-lg mx-auto px-5">
          <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 text-center">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-bold text-amber-900 mb-2">No Vehicle Assigned</h3>
            <p className="text-sm text-amber-700">Contact your admin to assign a vehicle to this agent's profile.</p>
          </div>
        </div>
      </div>
    );
  }

  const { today, tomorrow, tomorrowLabel, coverage, shifts: configShifts } = statusData;
  const hasPlan = today && !today.message && !today.noVillage;
  const hasTomorrow = tomorrow && !tomorrow.message && !tomorrow.noVillage;
  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const currentShift = (configShifts || []).find((s: any) => currentTime >= s.startTime && currentTime <= s.endTime) || (configShifts ? configShifts[0] : null);
  const sessionName = currentShift ? currentShift.name : (new Date().getHours() < 14 ? 'Morning' : 'Evening');

  return (
    <div className="min-h-screen pb-24 pt-2 bg-[#FAFAFA]">
      <div className="max-w-[420px] mx-auto px-4 space-y-4">
        {/* Mobile Header Bar */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/vsms/agent-portal/home')}
              className="p-1 -ml-1 rounded-xl text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Today's Plan</h1>
              <p className="text-[11px] font-medium text-gray-400">
                Thursday, 6 Aug 2025
              </p>
            </div>
          </div>
        </div>

        {/* Today's Assignment Card (Figma Specs: 364x170, r:12px, p:12px, gap:8px) */}
        <div className="w-full max-w-[364px] min-h-[170px] mx-auto bg-white rounded-[12px] p-3 border border-gray-100/90 shadow-sm flex flex-col justify-between gap-2 transition-all">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar size={16} strokeWidth={2.5} />
            </div>
            <h3 className="text-xs font-black text-gray-900">Today's Assignment</h3>
          </div>

          <div className="grid grid-cols-4 divide-x divide-gray-100 pt-1 text-center items-center">
            <div className="px-1 flex flex-col items-center">
              <div className="text-emerald-600 mb-1">
                <Truck size={15} />
              </div>
              <p className="text-[9px] font-semibold text-gray-400">Vehicle</p>
              <p className="text-[10px] font-extrabold text-gray-900 mt-0.5 truncate max-w-full">
                TS09 AB 4521
              </p>
            </div>

            <div className="px-1 flex flex-col items-center">
              <div className="text-emerald-600 mb-1">
                <MapPin size={15} />
              </div>
              <p className="text-[9px] font-semibold text-gray-400">Morning Shift</p>
              <p className="text-[10px] font-extrabold text-gray-900 mt-0.5 truncate max-w-full">
                Pargi
              </p>
            </div>

            <div className="px-1 flex flex-col items-center">
              <div className="text-emerald-600 mb-1">
                <MapPin size={15} />
              </div>
              <p className="text-[9px] font-semibold text-gray-400">Evening Shift</p>
              <p className="text-[10px] font-extrabold text-gray-900 mt-0.5 truncate max-w-full">
                Shankarpally
              </p>
            </div>

            <div className="px-1 flex flex-col items-center">
              <div className="text-emerald-600 mb-1">
                <Store size={15} />
              </div>
              <p className="text-[9px] font-semibold text-gray-400">Routes</p>
              <p className="text-[10px] font-extrabold text-gray-900 mt-0.5 truncate max-w-full">
                2 Assigned
              </p>
            </div>
          </div>

          {/* Quick status footer indicator inside assignment box */}
          <div className="bg-gray-50/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between mt-auto">
            <span className="text-[9px] font-bold text-gray-500">Route Status</span>
            <span className="text-[9px] font-black text-[#00891D] bg-emerald-50 px-2 py-0.5 rounded">Active Plan</span>
          </div>
        </div>

        {/* Morning Shift Card */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sun size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-['Segoe_UI'] font-bold text-[16px] leading-[24px] tracking-[0px] text-gray-900">
                  Morning Shift
                </h4>
                <p className="text-[10px] font-medium text-gray-400">08:00 AM – 02:00 PM</p>
              </div>
            </div>

            {coverage?.morningDone ? (
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Completed
              </span>
            ) : activeShift?.shift === 1 ? (
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Started
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#E85D04] bg-orange-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E85D04]" />
                Not Started
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#F9FAFB] rounded-2xl border border-gray-100/60">
              <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                <MapPin size={14} />
                <span className="text-[10px] font-bold text-gray-400">Assigned Village</span>
              </div>
              <p className="text-xs font-extrabold text-gray-900 pl-5">{today?.morning || 'Pargi'}</p>
            </div>

            <div className="p-3 bg-[#F9FAFB] rounded-2xl border border-gray-100/60">
              <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                <Store size={14} />
                <span className="text-[10px] font-bold text-gray-400">Assigned Route</span>
              </div>
              <p className="text-xs font-extrabold text-gray-900 pl-5">{today?.routeName || 'Route-03'}</p>
            </div>
          </div>

          {/* Route Progress Widget when Shift is Active */}
          {activeShift?.shift === 1 && (
            <div className="p-4 bg-white rounded-2xl border border-gray-100/90 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                  <span className="text-xs font-extrabold text-gray-900">Route Progress</span>
                </div>
                <span className="text-sm font-black text-[#E85D04]">0%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-0 transition-all duration-500" />
              </div>
            </div>
          )}

          {activeShift?.shift === 1 ? (
            <button
              onClick={handleEndShift}
              disabled={actionLoading}
              className="w-full bg-[#E85D04] hover:bg-[#D05304] text-white py-3.5 rounded-2xl font-bold text-xs shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-white" />}
              End Morning Shift
            </button>
          ) : !coverage?.morningDone ? (
            <button
              onClick={() => handleStartShift(1)}
              disabled={actionLoading || !!activeShift}
              className="w-full bg-[#00891D] hover:bg-[#007018] text-white py-3.5 rounded-2xl font-bold text-xs shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-white" />}
              Start Morning Shift
            </button>
          ) : (
            <div className="w-full bg-[#E5E7EB]/80 text-[#9CA3AF] py-3.5 rounded-2xl font-bold text-xs shadow-none flex items-center justify-center gap-2 select-none">
              <Play size={15} className="fill-[#9CA3AF] text-[#9CA3AF]" />
              Shift Completed
            </div>
          )}
        </div>

        {/* Evening Shift Card */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Moon size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-['Segoe_UI'] font-bold text-[16px] leading-[24px] tracking-[0px] text-gray-900">
                  Evening Shift
                </h4>
                <p className="text-[10px] font-medium text-gray-400">02:00 AM – 08:00 PM</p>
              </div>
            </div>

            {coverage?.eveningDone ? (
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Completed
              </span>
            ) : activeShift?.shift === 2 ? (
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Started
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#E85D04] bg-orange-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E85D04]" />
                Not Started
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#F9FAFB] rounded-2xl border border-gray-100/60">
              <div className="flex items-center gap-1.5 text-purple-600 mb-1">
                <MapPin size={14} />
                <span className="text-[10px] font-bold text-gray-400">Assigned Village</span>
              </div>
              <p className="text-xs font-extrabold text-gray-900 pl-5">{today?.evening || 'Shankarpally'}</p>
            </div>

            <div className="p-3 bg-[#F9FAFB] rounded-2xl border border-gray-100/60">
              <div className="flex items-center gap-1.5 text-purple-600 mb-1">
                <Store size={14} />
                <span className="text-[10px] font-bold text-gray-400">Assigned Route</span>
              </div>
              <p className="text-xs font-extrabold text-gray-900 pl-5">{today?.routeName || 'Route-05'}</p>
            </div>
          </div>

          {/* Route Progress Widget when Shift is Active */}
          {activeShift?.shift === 2 && (
            <div className="p-4 bg-white rounded-2xl border border-gray-100/90 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                  <span className="text-xs font-extrabold text-gray-900">Route Progress</span>
                </div>
                <span className="text-sm font-black text-[#E85D04]">0%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-0 transition-all duration-500" />
              </div>
            </div>
          )}

          {activeShift?.shift === 2 ? (
            <button
              onClick={handleEndShift}
              disabled={actionLoading}
              className="w-full bg-[#E85D04] hover:bg-[#D05304] text-white py-3.5 rounded-2xl font-bold text-xs shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-white" />}
              End Evening Shift
            </button>
          ) : !coverage?.eveningDone ? (
            <button
              onClick={() => handleStartShift(2)}
              disabled={actionLoading || !!activeShift}
              className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                coverage?.morningDone || !activeShift
                  ? 'bg-[#00891D] hover:bg-[#007018] text-white'
                  : 'bg-[#E5E7EB] text-gray-400 cursor-not-allowed'
              }`}
            >
              <Play size={16} className={coverage?.morningDone || !activeShift ? 'fill-white' : 'fill-gray-400'} />
              Start Evening Shift
            </button>
          ) : (
            <div className="w-full bg-[#E5E7EB]/80 text-[#9CA3AF] py-3.5 rounded-2xl font-bold text-xs shadow-none flex items-center justify-center gap-2 select-none">
              <Play size={15} className="fill-[#9CA3AF] text-[#9CA3AF]" />
              Shift Completed
            </div>
          )}
        </div>

        {/* This Week's Plan Card (Figma Specs: 354x225, r:12px, p:16px, gap:12px) */}
        <div className="w-full max-w-[354px] min-h-[225px] mx-auto bg-white rounded-[12px] p-4 border border-gray-100/90 shadow-sm flex flex-col justify-between gap-3 transition-all">
          <h4 className="text-xs font-black text-gray-900 tracking-tight">This Week's Plan</h4>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1 no-scrollbar text-center flex-1">
            {[
              { day: 'Mon', date: '4 Aug', village: 'Pargi', status: 'Completed' },
              { day: 'Tue', date: '5 Aug', village: 'Chevella', status: 'Completed' },
              { day: 'Wed', date: '6 Aug', village: 'Vikarabad', status: 'Completed' },
              { day: 'Thu', date: '7 Aug', morning: 'Pargi', evening: 'Shankar...', isToday: true },
              { day: 'Fri', date: '8 Aug', village: 'Moinabad', status: 'Upcoming' },
              { day: 'Sat', date: '9 Aug', village: 'Shankarpally', status: 'Upcoming' },
            ].map((d) => {
              if (d.isToday) {
                return (
                  <div
                    key={d.day}
                    className="w-[84px] shrink-0 p-2.5 rounded-[10px] border-2 border-[#00891D] bg-emerald-50/30 flex flex-col items-center justify-between gap-1 shadow-sm"
                  >
                    <div>
                      <span className="text-[11px] font-black text-[#00891D] block leading-none">{d.day}</span>
                      <span className="text-[9px] font-medium text-gray-400 block mt-0.5">{d.date}</span>
                    </div>

                    <div className="w-full space-y-1 my-1">
                      <div>
                        <span className="text-[8px] font-medium text-gray-400 block">Morning</span>
                        <span className="text-[9px] font-bold text-gray-800 bg-white/90 border border-gray-100 px-1 py-0.5 rounded block truncate">
                          {d.morning}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-medium text-gray-400 block">Evening</span>
                        <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-1 py-0.5 rounded block truncate">
                          {d.evening}
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] font-black text-white bg-[#00891D] px-2.5 py-0.5 rounded-full uppercase">
                      Today
                    </span>
                  </div>
                );
              }

              const isCompleted = d.status === 'Completed';
              return (
                <div
                  key={d.day}
                  className="w-[74px] shrink-0 p-2.5 rounded-[10px] border border-gray-100 bg-white flex flex-col items-center justify-between gap-1.5 shadow-none"
                >
                  <div>
                    <span className="text-[11px] font-black text-gray-900 block leading-none">{d.day}</span>
                    <span className="text-[9px] font-medium text-gray-400 block mt-0.5">{d.date}</span>
                  </div>

                  <p className="text-[9px] font-bold text-gray-700 truncate w-full px-0.5">
                    {d.village}
                  </p>

                  <div className="mt-auto">
                    {isCompleted ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-4 h-4 rounded-full border border-[#00891D] flex items-center justify-center text-[#00891D]">
                          <CheckCircle2 size={12} className="text-[#00891D]" strokeWidth={2.5} />
                        </div>
                        <span className="text-[8px] font-bold text-[#00891D]">Completed</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-blue-500">
                          <Clock size={11} strokeWidth={2.5} />
                        </div>
                        <span className="text-[8px] font-bold text-blue-500">Upcoming</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Village Title */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Today's Village</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all ${refreshing ? 'animate-spin' : 'hover:bg-violet-50 active:scale-90 hover:text-violet-600'}`}
          >
            <RefreshCw size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Today's Village Card */}
        {hasPlan ? (
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 rounded-3xl p-6 shadow-2xl shadow-emerald-600/20 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
            <div className="absolute -bottom-16 -left-8 w-32 h-32 bg-white/5 rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <MapPin size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-0.5">Today's Village</p>
                  <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{today.villageName}</h3>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-wider border border-white/10">
                  {today.routeName}
                </span>
                <span className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-wider border border-white/10 flex items-center gap-1.5">
                  {sessionName.toLowerCase().includes('evening') || sessionName.toLowerCase().includes('night') ? <Moon size={12} /> : <Sun size={12} />}
                  {sessionName} Session
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-3xl p-8 border border-dashed border-gray-200 text-center">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-base font-bold text-gray-600 mb-1">No Plan Today</h3>
            <p className="text-xs text-gray-400">No village is scheduled for today on this route.</p>
          </div>
        )}

        {/* Village Visit Controls */}
        {hasPlan && activeShift && (
          <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-gray-900 text-sm">Village Visit</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {activeVillageVisit ? 'Visit in progress...' : 'Ready to start visit?'}
                </p>
              </div>
              {activeVillageVisit && (
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black animate-pulse">LIVE</div>
              )}
            </div>
            <div className="flex gap-3">
              {!activeVillageVisit ? (
                <button
                  onClick={() => handleVillageVisit('start')}
                  disabled={villageActionLoading}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {villageActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Start Village Visit
                </button>
              ) : (
                <button
                  onClick={() => handleVillageVisit('end')}
                  disabled={villageActionLoading}
                  className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {villageActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                  End Village Visit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Coverage Tracking */}
        {hasPlan && (
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Coverage Tracking</h4>
            {(statusData.shifts || []).map((shift: any) => {
              const isDone = coverage.shiftStatus?.[shift.name] || (shift.name.toUpperCase() === 'MORNING' && coverage.morningDone) || (shift.name.toUpperCase() === 'EVENING' && coverage.eveningDone);
              const isPM = shift.startTime >= '12:00';
              return (
                <div key={shift.id || shift.name} className={`rounded-2xl p-4 border transition-all ${isDone ? 'bg-emerald-50/80 border-emerald-200 shadow-sm' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDone ? 'bg-emerald-100 text-emerald-600' : (isPM ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500')}`}>
                        {isPM ? <Moon size={22} strokeWidth={2.5} /> : <Sun size={22} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm">{shift.name}</h5>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {isDone ? 'Completed' : `${shift.startTime} - ${shift.endTime}`}
                        </p>
                      </div>
                    </div>
                    {isDone ? (
                      <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl">
                        <CheckCircle2 size={16} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMarkCoverage(shift)}
                        disabled={markingSlot === (shift.id || shift.name)}
                        className={`${isPM ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-amber-500 shadow-amber-500/20'} text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2`}
                      >
                        {markingSlot === (shift.id || shift.name) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tomorrow Preview */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Next: {tomorrowLabel || 'Tomorrow'}</h4>
          {hasTomorrow ? (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-gray-900 text-sm truncate">{tomorrow.villageName}</h5>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tomorrow.routeName}</p>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200">
              <p className="text-xs text-gray-400 text-center font-medium italic">No plan scheduled for tomorrow</p>
            </div>
          )}
        </div>
      </div>

      {/* Closure Modal */}
      {showClosureModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !actionLoading && setShowClosureModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="bg-gray-900 p-8 text-center text-white">
              <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Daily Performance</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{closureSummary?.date}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Coverage</p>
                  <p className="text-lg font-black text-gray-900">{closureSummary?.visitedCount}/{closureSummary?.totalVillages}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tight">Villages Visited</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Sales</p>
                  <p className="text-lg font-black text-gray-900">₹{closureSummary?.totalSales?.toLocaleString()}</p>
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tight">{closureSummary?.totalOrders} Orders</p>
                </div>
              </div>
              {closureSummary?.missedVillages?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    Reason for missed villages <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    rows={3}
                    placeholder="Explain why villages were missed..."
                    value={closureRemarks}
                    onChange={(e) => setClosureRemarks(e.target.value)}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => !actionLoading && setShowClosureModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEndShift}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'End Shift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
