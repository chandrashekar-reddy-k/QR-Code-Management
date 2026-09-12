import React, { useState, useEffect } from "react";
import { Clock, Plus, Edit, Trash2, ArrowLeft, Loader2, Save, FileText, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import adminAPI from "../vsms/services/adminService";
// @ts-expect-error - AdminLateEntryConfig is a JSX module without d.ts declarations
import AdminLateEntryConfig from "../vsms/agent/admin/AdminLateEntryConfig";

interface ShiftSessionItem {
  startTime: string;
  endTime: string;
}

interface ShiftItem {
  id: string;
  shiftName?: string;
  name?: string;
  shiftType?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  sessions?: ShiftSessionItem[];
}

export default function ShiftManagementSection() {
  const [activeTab, setActiveTab] = useState<"shifts" | "lateRules">("shifts");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<{ shifts: ShiftItem[]; shiftMode: string }>({
    shifts: [],
    shiftMode: "STANDARD",
  });

  const [isCreatingShift, setIsCreatingShift] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<{
    type: string;
    name: string;
    isActive: boolean;
    sessions: ShiftSessionItem[];
  }>({
    type: "STANDARD",
    name: "",
    isActive: true,
    sessions: [{ startTime: "09:00", endTime: "18:00" }],
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getShiftConfigs();
      if (res?.data?.success) {
        setSettings({
          shifts: res.data.data || [],
          shiftMode: "STANDARD",
        });
      } else {
        // Fallback to settings API if shift-configs is empty
        const fallbackRes = await adminAPI.getSettings();
        if (fallbackRes?.data?.data) {
          setSettings({
            shifts: fallbackRes.data.data.shifts || [],
            shiftMode: fallbackRes.data.data.shiftMode || "STANDARD",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load shift configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime12h = (time24?: string) => {
    if (!time24) return "N/A";
    const [hours, minutes] = time24.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const handleAddSession = () => {
    if (shiftForm.sessions.length >= 5) return toast.error("Maximum 5 sessions allowed");
    setShiftForm({
      ...shiftForm,
      sessions: [...shiftForm.sessions, { startTime: "14:00", endTime: "18:00" }],
    });
  };

  const handleRemoveSession = (index: number) => {
    if (shiftForm.sessions.length <= 1) return;
    setShiftForm({
      ...shiftForm,
      sessions: shiftForm.sessions.filter((_, i) => i !== index),
    });
  };

  const handleSessionChange = (index: number, field: keyof ShiftSessionItem, value: string) => {
    const newSessions = [...shiftForm.sessions];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setShiftForm({ ...shiftForm, sessions: newSessions });
  };

  const validateShiftForm = () => {
    if (!shiftForm.name) return "Shift name is required";
    if (!shiftForm.type) return "Shift type is required";

    for (let i = 0; i < shiftForm.sessions.length; i++) {
      const s = shiftForm.sessions[i];
      if (s.startTime >= s.endTime) return `Session ${i + 1}: End time must be after start time`;

      for (let j = i + 1; j < shiftForm.sessions.length; j++) {
        const s2 = shiftForm.sessions[j];
        if (s.startTime < s2.endTime && s.endTime > s2.startTime) {
          return `Overlap detected between Session ${i + 1} and Session ${j + 1}`;
        }
      }
    }
    return null;
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateShiftForm();
    if (error) return toast.error(error);

    setSaving(true);
    try {
      const allStarts = shiftForm.sessions.map((s) => s.startTime).sort();
      const allEnds = shiftForm.sessions.map((s) => s.endTime).sort();

      const payload = {
        shiftName: shiftForm.name,
        shiftType: shiftForm.type,
        startTime: allStarts[0],
        endTime: allEnds[allEnds.length - 1],
        sessions: shiftForm.sessions,
        isActive: shiftForm.isActive,
      };

      let response;
      if (editingShiftId) {
        response = await adminAPI.updateShiftConfig(editingShiftId, payload);
      } else {
        response = await adminAPI.createShiftConfig(payload);
      }

      if (response?.data?.success) {
        toast.success(editingShiftId ? "Shift Updated ✅" : "Shift Configuration Saved ✅");
        setIsCreatingShift(false);
        setEditingShiftId(null);
        setShiftForm({ type: "STANDARD", name: "", isActive: true, sessions: [{ startTime: "09:00", endTime: "18:00" }] });
        fetchSettings();
      } else {
        toast.success("Shift configuration saved");
        setIsCreatingShift(false);
        fetchSettings();
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : null;
      toast.error(msg || "Failed to save shift");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    try {
      await adminAPI.deleteShiftConfig(id);
      toast.success("Shift deleted");
      fetchSettings();
    } catch {
      toast.error("Failed to delete shift");
    }
  };

  const handleToggleShiftStatus = async (id: string) => {
    const shift = settings.shifts.find((s) => s.id === id);
    if (!shift) return;
    try {
      await adminAPI.updateShiftConfig(id, { isActive: !shift.isActive });
      toast.success("Shift status updated");
      fetchSettings();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleEditShift = (shift: ShiftItem) => {
    setShiftForm({
      type: shift.shiftType || (shift.sessions && shift.sessions.length > 1 ? "MULTI_SESSION" : "STANDARD"),
      name: shift.shiftName || shift.name || "",
      isActive: shift.isActive !== undefined ? shift.isActive : true,
      sessions: shift.sessions || [{ startTime: shift.startTime || "09:00", endTime: shift.endTime || "18:00" }],
    });
    setEditingShiftId(shift.id);
    setIsCreatingShift(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-gray-500 font-medium tracking-wide text-sm">Loading Shift Configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub Tab Header */}
      {!isCreatingShift && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
          <div className="bg-white rounded-xl p-1.5 border border-gray-200/80 shadow-sm flex max-w-md w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("shifts")}
              className={`flex-1 sm:flex-initial py-2 px-5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                activeTab === "shifts" ? "bg-emerald-600 text-white shadow-md" : "text-gray-600 hover:text-emerald-700"
              }`}
            >
              <Clock size={14} /> Timing & Shifts
            </button>
            <button
              onClick={() => setActiveTab("lateRules")}
              className={`flex-1 sm:flex-initial py-2 px-5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                activeTab === "lateRules" ? "bg-emerald-600 text-white shadow-md" : "text-gray-600 hover:text-emerald-700"
              }`}
            >
              <ShieldCheck size={14} /> Late Entry Rules
            </button>
          </div>

          {activeTab === "shifts" && (
            <button
              onClick={() => setIsCreatingShift(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/15 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} strokeWidth={2.5} /> Create Shift
            </button>
          )}
        </div>
      )}

      {/* Create / Edit Shift Sub-Form */}
      {isCreatingShift ? (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsCreatingShift(false);
                  setEditingShiftId(null);
                  setShiftForm({ type: "STANDARD", name: "", isActive: true, sessions: [{ startTime: "09:00", endTime: "18:00" }] });
                }}
                className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-emerald-600 transition-all shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingShiftId ? "Edit Shift Configuration" : "Create Shift Configuration"}</h2>
                <p className="text-xs text-gray-500">{editingShiftId ? "Update shift timing & session params" : "Define operational shift timing & split sessions"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Shift Type</label>
                <select
                  value={shiftForm.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setShiftForm({
                      ...shiftForm,
                      type,
                      sessions: type === "STANDARD" ? [{ startTime: "09:00", endTime: "18:00" }] : [{ startTime: "09:00", endTime: "13:00" }, { startTime: "15:00", endTime: "19:00" }],
                    });
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="STANDARD">Standard Shift (Full Day)</option>
                  <option value="MULTI_SESSION">Multi-Session Shift (Split)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Shift Name</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="e.g. Morning Delivery Shift"
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShiftForm({ ...shiftForm, isActive: !shiftForm.isActive })}
                    className={`px-4 rounded-xl border text-xs font-bold transition-all ${
                      shiftForm.isActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-600"
                    }`}
                  >
                    {shiftForm.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-emerald-600" /> Time Configuration
                </h4>
                {shiftForm.type === "MULTI_SESSION" && (
                  <button onClick={handleAddSession} className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                    <Plus size={14} /> Add Session
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {shiftForm.sessions.map((session, idx) => (
                  <div key={idx} className="bg-gray-50/70 rounded-xl p-4 border border-gray-200/80 relative group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {shiftForm.type === "STANDARD" ? "Operational Hours" : `Session ${idx + 1}`}
                      </span>
                      {shiftForm.type === "MULTI_SESSION" && shiftForm.sessions.length > 1 && (
                        <button onClick={() => handleRemoveSession(idx)} className="text-rose-500 hover:text-rose-700 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase">Start Time</label>
                        <input
                          type="time"
                          value={session.startTime}
                          onChange={(e) => handleSessionChange(idx, "startTime", e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 uppercase">End Time</label>
                        <input
                          type="time"
                          value={session.endTime}
                          onChange={(e) => handleSessionChange(idx, "endTime", e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-emerald-700" />
                <p className="text-xs font-medium text-emerald-800">
                  {shiftForm.sessions.length > 1
                    ? `Split shift with ${shiftForm.sessions.length} sessions`
                    : `Standard shift: ${formatTime12h(shiftForm.sessions[0].startTime)} to ${formatTime12h(shiftForm.sessions[0].endTime)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCreatingShift(false);
                    setEditingShiftId(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveShift}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingShiftId ? "Update Shift" : "Save Shift"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {activeTab === "shifts" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(settings.shifts || []).map((shift: ShiftItem) => (
                  <div key={shift.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 relative group hover:border-emerald-300 transition-all">
                    <div className="absolute top-4 right-4 flex gap-1">
                      <button onClick={() => handleEditShift(shift)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteShift(shift.id)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                      <Clock size={20} />
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-gray-900">{shift.shiftName || shift.name}</h4>
                      <button
                        onClick={() => handleToggleShiftStatus(shift.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                          shift.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {shift.isActive !== false ? "Active" : "Inactive"}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">
                      {(shift.shiftType || shift.type) === "MULTI_SESSION" ? "Multi-Session Shift" : "Standard Shift"}
                    </p>

                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      {(shift.sessions || [{ startTime: shift.startTime || "09:00", endTime: shift.endTime || "18:00" }]).map((s: ShiftSessionItem, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs font-medium text-gray-600">
                          <span>{(shift.shiftType || shift.type) === "MULTI_SESSION" ? `Session ${i + 1}` : "Timing"}</span>
                          <span className="text-gray-900 font-bold">{formatTime12h(s.startTime)} - {formatTime12h(s.endTime)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {(!settings.shifts || settings.shifts.length === 0) && (
                <div className="py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <Clock size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider italic">No shifts configured yet</p>
                  <button
                    onClick={() => setIsCreatingShift(true)}
                    className="mt-3 text-xs font-bold text-emerald-600 hover:underline"
                  >
                    + Create First Shift Configuration
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "lateRules" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <AdminLateEntryConfig />
            </div>
          )}
        </>
      )}
    </div>
  );
}
