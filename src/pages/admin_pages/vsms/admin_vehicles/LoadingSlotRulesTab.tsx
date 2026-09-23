// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Clock, ShieldCheck, CheckCircle2, AlertTriangle, Save, 
  RefreshCw, Plus, Trash2, Calendar, Eye, Info, Sparkles, Timer,
  Truck, ArrowRight, Zap, AlertCircle, Sun, Moon, ToggleLeft, ToggleRight,
  Sliders, Check, Smartphone, Package
} from 'lucide-react';
import * as routeService from '../services/routeService';
import toast from 'react-hot-toast';

interface ShiftRule {
  id?: string;
  shiftType: string;
  shiftName: string;
  loadingTime: string; // e.g. "07:00"
  cutoffMinutes: number; // e.g. 60
  maxOrders?: number; // e.g. 50 orders limit per shift
  deliveryStartTime: string; // e.g. "07:30"
  deliveryEndTime: string; // e.g. "12:30"
  isActive: boolean;
  notes?: string;
}

const DEFAULT_RULES: ShiftRule[] = [
  {
    id: 'temp_morning',
    shiftType: 'MORNING',
    shiftName: 'Morning Shift',
    loadingTime: '07:00',
    cutoffMinutes: 60,
    maxOrders: 50,
    deliveryStartTime: '07:30',
    deliveryEndTime: '12:30',
    isActive: true,
    notes: 'Vehicle loads at 07:00 AM. Customer orders cutoff at 06:00 AM. Max 50 orders.'
  },
  {
    id: 'temp_afternoon',
    shiftType: 'AFTERNOON',
    shiftName: 'Evening Shift',
    loadingTime: '15:00',
    cutoffMinutes: 60,
    maxOrders: 50,
    deliveryStartTime: '16:00',
    deliveryEndTime: '20:00',
    isActive: true,
    notes: 'Vehicle loads at 03:00 PM. Customer orders cutoff at 02:00 PM. Max 50 orders.'
  }
];

export default function LoadingSlotRulesTab({ storeId }: { storeId?: string }) {
  const [rules, setRules] = useState<ShiftRule[]>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live timer tick for real-time cutoff status
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [storeId]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await routeService.getRouteLoadingRules(storeId);
      if (res?.rules && Array.isArray(res.rules) && res.rules.length > 0) {
        setRules(res.rules);
      } else {
        setRules(DEFAULT_RULES);
      }
    } catch (err: any) {
      console.warn('Failed to fetch loading rules, using defaults:', err);
      setRules(DEFAULT_RULES);
    } finally {
      setLoading(false);
    }
  };

  const handleRuleChange = (index: number, field: keyof ShiftRule, value: any) => {
    setRules(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await routeService.saveRouteLoadingRules(rules);
      toast.success('Loading times, cutoff rules, and order limits saved successfully!');
      fetchRules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  const addCustomShift = () => {
    setRules(prev => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        shiftType: 'CUSTOM',
        shiftName: `Custom Slot ${prev.length + 1}`,
        loadingTime: '11:00',
        cutoffMinutes: 60,
        maxOrders: 50,
        deliveryStartTime: '12:00',
        deliveryEndTime: '15:00',
        isActive: true,
        notes: 'Custom scheduled slot'
      }
    ]);
  };

  const removeShift = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime12h = (time24?: string) => {
    if (!time24) return '—';
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h)) return time24;
    const hour12 = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${(m || 0).toString().padStart(2, '0')} ${ampm}`;
  };

  const calculateCutoffTime12h = (loadingTime: string, cutoffMinutes: number = 60) => {
    if (!loadingTime) return '—';
    const [h, m] = loadingTime.split(':').map(Number);
    if (isNaN(h)) return '—';
    const totalMinutes = h * 60 + (m || 0) - cutoffMinutes;
    const normalizedMinutes = totalMinutes < 0 ? 0 : totalMinutes;
    const cutoffH = Math.floor(normalizedMinutes / 60);
    const cutoffM = normalizedMinutes % 60;
    const hour12 = cutoffH % 12 || 12;
    const ampm = cutoffH >= 12 ? 'PM' : 'AM';
    return `${hour12}:${cutoffM.toString().padStart(2, '0')} ${ampm}`;
  };

  const getSlotCurrentStatus = (loadingTime: string, cutoffMinutes: number = 60, isActive: boolean = true) => {
    if (!isActive) {
      return {
        isOpen: false,
        label: 'Disabled',
        subtext: 'Slot is disabled',
        badgeBg: 'bg-gray-100 text-gray-600 border-gray-200'
      };
    }
    const [h, m] = loadingTime.split(':').map(Number);
    if (isNaN(h)) return { isOpen: true, label: 'Active', subtext: 'Always Open', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    const totalCutoffMin = h * 60 + (m || 0) - cutoffMinutes;
    const currentMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (currentMin >= totalCutoffMin) {
      return {
        isOpen: false,
        label: 'Closed for Today',
        subtext: `Cutoff passed (${calculateCutoffTime12h(loadingTime, cutoffMinutes)})`,
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
      };
    }
    const minsLeft = totalCutoffMin - currentMin;
    return {
      isOpen: true,
      label: 'Open for Booking',
      subtext: `Closes in ${minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m` : `${minsLeft}m`}`,
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-xs">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-600 mx-auto mb-2.5" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Loading delivery timing rules...</p>
      </div>
    );
  }

  const activeCount = rules.filter(r => r.isActive).length;
  const openCount = rules.filter(r => r.isActive && getSlotCurrentStatus(r.loadingTime, r.cutoffMinutes, r.isActive).isOpen).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-5 text-white shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-400/40 flex items-center gap-1.5">
                <Sparkles size={12} /> Shift Loading, Order Limits & Customer Cutoff Automation
              </span>
              <span className="bg-white/10 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border border-white/15">
                Live Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            
            <h2 className="text-lg md:text-xl font-black tracking-tight text-white">
              Vehicle Loading Schedule, Order Capacities & 1-Hour Customer Cutoff Rules
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Customers can book scheduled delivery up to <strong>1 hour before vehicle loading</strong> and within the <strong>shift order limit capacity</strong>. Past cutoff or once max orders are booked, slots lock automatically.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={addCustomShift}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            >
              <Plus size={15} strokeWidth={2.5} /> Add Slot
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save size={15} strokeWidth={2.5} />}
              Save All Rules
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Bar */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Truck size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Total Configured</p>
              <p className="text-sm font-black text-white">{rules.length} Shift Slots</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Active Shifts</p>
              <p className="text-sm font-black text-white">{activeCount} Enabled</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Open For Today</p>
              <p className="text-sm font-black text-emerald-300">{openCount} Slots Open</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Buffer Policy</p>
              <p className="text-sm font-black text-white">60 Min (1 Hr Prior)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main ERP Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Sliders size={16} className="text-emerald-600" />
              Delivery Windows, Cutoff Timetable & Order Limits
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Edit vehicle loading time, order cutoff minutes, max orders per shift, and customer delivery windows inline.
            </p>
          </div>

          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
            {rules.length} Rows
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Shift & Slot Name</th>
                <th className="py-3.5 px-4">Vehicle Loading Time</th>
                <th className="py-3.5 px-4">Order Cutoff Buffer</th>
                <th className="py-3.5 px-4">Limit of Orders</th>
                <th className="py-3.5 px-4">Customer Delivery Window</th>
                <th className="py-3.5 px-4 text-center">Today's Booking Status</th>
                <th className="py-3.5 px-4 text-center">Active</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {rules.map((rule, idx) => {
                const status = getSlotCurrentStatus(rule.loadingTime, rule.cutoffMinutes, rule.isActive);
                const isMorning = rule.shiftType === 'MORNING';
                const isAfternoon = rule.shiftType === 'AFTERNOON';

                return (
                  <tr 
                    key={rule.id || idx}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* 1. Shift & Slot Name */}
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isMorning 
                            ? 'bg-amber-50 text-amber-600 border-amber-200' 
                            : isAfternoon 
                              ? 'bg-indigo-50 text-indigo-600 border-indigo-200' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {isMorning ? <Sun size={19} strokeWidth={2.2} /> : isAfternoon ? <Moon size={19} strokeWidth={2.2} /> : <Truck size={19} strokeWidth={2.2} />}
                        </div>

                        <div className="space-y-1">
                          <input
                            type="text"
                            value={rule.shiftName}
                            onChange={(e) => handleRuleChange(idx, 'shiftName', e.target.value)}
                            className="font-black text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-emerald-600 focus:bg-white outline-none px-1 py-0.5 rounded text-sm transition-all"
                            placeholder="Shift Name"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                              {rule.shiftType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Vehicle Loading Time */}
                    <td className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 w-fit">
                          <Timer size={14} className="text-emerald-600 shrink-0" />
                          <input
                            type="time"
                            value={rule.loadingTime}
                            onChange={(e) => handleRuleChange(idx, 'loadingTime', e.target.value)}
                            className="bg-transparent text-xs font-black text-gray-900 outline-none cursor-pointer"
                          />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400">
                          Departs at <strong className="text-gray-700">{formatTime12h(rule.loadingTime)}</strong>
                        </p>
                      </div>
                    </td>

                    {/* 3. Order Cutoff Buffer */}
                    <td className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 w-fit">
                          <Clock size={14} className="text-orange-600 shrink-0" />
                          <input
                            type="number"
                            min="0"
                            max="360"
                            step="15"
                            value={rule.cutoffMinutes}
                            onChange={(e) => handleRuleChange(idx, 'cutoffMinutes', Number(e.target.value))}
                            className="w-12 bg-transparent text-xs font-black text-gray-900 outline-none text-center"
                          />
                          <span className="text-[11px] font-bold text-gray-400">mins prior</span>
                        </div>
                        <p className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md w-fit border border-orange-100">
                          Cutoff: {calculateCutoffTime12h(rule.loadingTime, rule.cutoffMinutes)}
                        </p>
                      </div>
                    </td>

                    {/* 4. Limit of Orders (Max Orders / Shift) */}
                    <td className="py-4 px-4 align-middle">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 w-fit">
                          <Package size={14} className="text-indigo-600 shrink-0" />
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            step="5"
                            value={rule.maxOrders ?? 50}
                            onChange={(e) => handleRuleChange(idx, 'maxOrders', Math.max(1, Number(e.target.value)))}
                            className="w-14 bg-transparent text-xs font-black text-gray-900 outline-none text-center"
                          />
                          <span className="text-[11px] font-bold text-gray-400">orders</span>
                        </div>
                        <p className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md w-fit border border-indigo-100">
                          Max: {rule.maxOrders ?? 50} orders / shift
                        </p>
                      </div>
                    </td>

                    {/* 5. Customer Delivery Window */}
                    <td className="py-4 px-4 align-middle">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-xs">
                          <input
                            type="time"
                            value={rule.deliveryStartTime}
                            onChange={(e) => handleRuleChange(idx, 'deliveryStartTime', e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-900 text-xs outline-none"
                          />
                          <span className="text-gray-400 font-bold px-0.5">to</span>
                          <input
                            type="time"
                            value={rule.deliveryEndTime}
                            onChange={(e) => handleRuleChange(idx, 'deliveryEndTime', e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-900 text-xs outline-none"
                          />
                        </div>
                        <span className="inline-block text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {formatTime12h(rule.deliveryStartTime)} – {formatTime12h(rule.deliveryEndTime)}
                        </span>
                      </div>
                    </td>

                    {/* 6. Today's Booking Status */}
                    <td className="py-4 px-4 align-middle text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-1 rounded-full border ${status.badgeBg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {status.label}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {status.subtext}
                        </span>
                      </div>
                    </td>

                    {/* 7. Active Toggle */}
                    <td className="py-4 px-4 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => handleRuleChange(idx, 'isActive', !rule.isActive)}
                        className={`p-1 rounded-full transition-colors cursor-pointer ${
                          rule.isActive ? 'text-emerald-600' : 'text-gray-300 hover:text-gray-400'
                        }`}
                        title={rule.isActive ? 'Deactivate Slot' : 'Activate Slot'}
                      >
                        {rule.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </td>

                    {/* 8. Actions */}
                    <td className="py-4 px-4 align-middle text-right">
                      {rules.length > 2 ? (
                        <button
                          onClick={() => removeShift(idx)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove Slot"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-300 uppercase">Core</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Action Bar */}
        <div className="bg-gray-50/70 p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <Info size={15} className="text-emerald-600 shrink-0" />
            <span>Changes take effect immediately on customer app slot availability after saving.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Customer App Live Preview & Workflow Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer App Live Slot Preview */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Smartphone size={17} />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Customer App Live Preview</h4>
                <p className="text-[11px] text-gray-400">How customers see available delivery slots right now</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Live Preview
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {rules.filter(r => r.isActive).map((r, i) => {
              const status = getSlotCurrentStatus(r.loadingTime, r.cutoffMinutes, r.isActive);
              return (
                <div 
                  key={r.id || i}
                  className={`rounded-xl p-3 border flex items-center justify-between gap-3 transition-all ${
                    status.isOpen 
                      ? 'bg-emerald-50/40 border-emerald-200 text-gray-900' 
                      : 'bg-gray-50 border-gray-200 text-gray-400 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      status.isOpen ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900">
                        {r.shiftName} ({formatTime12h(r.deliveryStartTime)} – {formatTime12h(r.deliveryEndTime)})
                      </p>
                      <p className="text-[10px] font-medium text-gray-500">
                        {status.subtext} • Capacity: <strong>{r.maxOrders ?? 50} orders</strong>
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    status.isOpen 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}>
                    {status.isOpen ? 'Available' : 'Locked Today'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logic Explanation Box */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck size={17} />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Scheduled Delivery Lifecycle</h4>
              <p className="text-[11px] text-gray-400">Automatic cutoff, order limit cap, and fulfillment stages</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-black text-gray-900">1-Hour Customer Ordering Buffer & Shift Order Limit</p>
                <p className="text-gray-500 text-[11px]">Customers can book until 1 hour prior to vehicle departure and up to the shift's order limit (e.g. 50 orders) so warehouse staff can pack crates accurately without overloading delivery vans.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-black text-gray-900">Vehicle Loading & Verification</p>
                <p className="text-gray-500 text-[11px]">Agents review the load checklist under Scheduled Deliveries tab before exiting the warehouse gate.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-black text-gray-900">Doorstep Execution & Payment</p>
                <p className="text-gray-500 text-[11px]">Orders are executed with real-time status updates and multi-mode payment collection (Cash/UPI/Udhar).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


