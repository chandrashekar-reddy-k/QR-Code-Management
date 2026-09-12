// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  Fuel,
  TrendingUp,
  Camera,
  CheckCircle2,
  ArrowLeft,
  Pencil,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import adminAPI from '../services/adminService';

interface FuelLog {
  id: string;
  vehicleId: string;
  tripId?: string | null;
  date: string;
  odometer: number | string;
  liters: number | string;
  rate: number | string;
  totalAmount: number | string;
  paymentMode: string;
  billImage?: string | null;
  vehicle?: {
    vehicleNumber: string;
  };
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
}

interface FuelLogsSectionProps {
  storeId?: string;
  vehicles?: Vehicle[];
}

export default function FuelLogsSection({ storeId, vehicles = [] }: FuelLogsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const initialFormState = {
    vehicleId: '',
    odometer: '',
    liters: '',
    rate: '',
    totalAmount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    paymentMode: 'CASH',
    billImage: null as File | string | null
  };

  const [formData, setFormData] = useState(initialFormState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await adminAPI.getFuelLogs(storeId ? { storeId } : {});
      if (response.data?.success) {
        setLogs(response.data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching fuel logs:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const calculateTotal = (litersVal: string | number, rateVal: string | number) => {
    const l = parseFloat(String(litersVal)) || 0;
    const r = parseFloat(String(rateVal)) || 0;
    setFormData(prev => ({ ...prev, totalAmount: (l * r).toFixed(2) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, billImage: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenCreateForm = () => {
    setEditingLogId(null);
    setFormData({
      vehicleId: vehicles[0]?.id || '',
      odometer: '',
      liters: '',
      rate: '',
      totalAmount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMode: 'CASH',
      billImage: null
    });
    setPreviewUrl(null);
    setShowForm(true);
  };

  const handleOpenEditForm = (log: FuelLog) => {
    setEditingLogId(log.id);
    setFormData({
      vehicleId: log.vehicleId || '',
      odometer: log.odometer ? String(log.odometer) : '',
      liters: log.liters ? String(log.liters) : '',
      rate: log.rate ? String(log.rate) : '',
      totalAmount: log.totalAmount ? String(log.totalAmount) : '',
      date: log.date ? format(new Date(log.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      paymentMode: log.paymentMode || 'CASH',
      billImage: log.billImage || null
    });
    setPreviewUrl(log.billImage || null);
    setShowForm(true);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Are you sure you want to delete this fuel log?')) return;

    try {
      const response = await adminAPI.deleteFuelLog(logId);
      if (response.data?.success) {
        toast.success('Fuel log deleted successfully');
        fetchLogs();
      } else {
        toast.error(response.data?.message || 'Failed to delete fuel log');
      }
    } catch (error: any) {
      console.error('Delete Fuel Log Error:', error);
      toast.error(error.response?.data?.message || 'Error deleting fuel log');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'billImage') {
          if (formData.billImage instanceof File) {
            form.append('billImage', formData.billImage);
          }
        } else if (formData[key] !== null && formData[key] !== undefined) {
          form.append(key, formData[key]);
        }
      });

      let response;
      if (editingLogId) {
        response = await adminAPI.updateFuelLog(editingLogId, form);
      } else {
        response = await adminAPI.addFuelLog(form);
      }

      if (response.data?.success) {
        toast.success(editingLogId ? 'Fuel log updated successfully!' : 'Fuel log recorded!');
        setFormData(initialFormState);
        setPreviewUrl(null);
        setShowForm(false);
        setEditingLogId(null);
        fetchLogs();
      } else {
        toast.error(response.data?.message || 'Failed to save fuel log');
      }
    } catch (error: any) {
      console.error('Fuel Submission Error:', error);
      toast.error(error.response?.data?.message || 'Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Analyzing Fuel Efficiency...</p>
      </div>
    );
  }

  const totalExpenditure = logs.reduce((acc, l) => acc + (Number(l.totalAmount) || 0), 0);
  const totalLiters = logs.reduce((acc, l) => acc + (Number(l.liters) || 0), 0);

  return (
    <div className="h-full">
      {showForm ? (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col flex-1">
            {/* Ultra Compact Header */}
            <div className="px-8 py-6 bg-emerald-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingLogId(null);
                  }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h4 className="text-lg font-bold tracking-tight leading-none">
                    {editingLogId ? 'Edit Fuel Entry' : 'Fuel Entry Details'}
                  </h4>
                  <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                    {editingLogId ? 'Update refueling record' : 'Record refueling event & generate expense'}
                  </p>
                </div>
              </div>
              <TrendingUp size={28} className="opacity-20" />
            </div>

            <form onSubmit={handleSubmit} className="p-8 flex flex-col flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                {/* Column 1: Vehicle & Date */}
                <div className="space-y-5">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-3 block">
                      Identity & Timeline
                    </label>
                    <div className="space-y-4">
                      <select
                        required
                        value={formData.vehicleId}
                        onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                        className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      >
                        <option value="">Select Vehicle...</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-3 block">
                      Mileage Tracking
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.odometer}
                      onChange={e => setFormData({ ...formData, odometer: e.target.value })}
                      className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      placeholder="ODO Reading (km)"
                    />
                  </div>
                </div>

                {/* Column 2: Consumption & Rates */}
                <div className="space-y-5">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-3 block">
                      Fuel Data
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.liters}
                        onChange={e => {
                          setFormData({ ...formData, liters: e.target.value });
                          calculateTotal(e.target.value, formData.rate);
                        }}
                        className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                        placeholder="Liters"
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.rate}
                        onChange={e => {
                          setFormData({ ...formData, rate: e.target.value });
                          calculateTotal(formData.liters, e.target.value);
                        }}
                        className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                        placeholder="Rate/L"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50/30 dark:bg-emerald-950/20 p-5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/50">
                    <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 block">
                      Total Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 font-bold">₹</span>
                      <input
                        type="number"
                        required
                        value={formData.totalAmount}
                        onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                        className="w-full bg-white dark:bg-gray-900 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl py-3.5 pl-8 pr-4 text-lg font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-3 block">
                      Payment Info
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                      className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    >
                      <option value="CASH">Cash (In-Hand)</option>
                      <option value="UPI">UPI / Digital</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>
                </div>

                {/* Column 3: Documentation */}
                <div className="flex flex-col">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 flex flex-col min-h-[240px]">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-4 block">
                      Receipt Verification
                    </label>
                    <input
                      type="file"
                      id="fuel-bill-compact"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    <label
                      htmlFor="fuel-bill-compact"
                      className="w-full min-h-[150px] bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-emerald-300 rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group"
                    >
                      {previewUrl ? (
                        <div className="flex flex-col items-center gap-3">
                          <img src={previewUrl} className="h-32 w-auto rounded-xl object-cover border-2 border-emerald-500" alt="Preview" />
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Change File</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera size={24} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center px-4">
                            Click to upload fuel receipt
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingLogId(null);
                  }}
                  className="px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-gray-200 transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-emerald-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <CheckCircle2 size={18} />
                      {editingLogId ? 'Update Refueling Log' : 'Log Refueling & Create Expense'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Compact Header for History View */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-lg flex items-center justify-center">
                <Fuel size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Fuel Management</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consumption & Efficiency Tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex gap-4 border-r border-gray-200 dark:border-gray-700 pr-6">
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Spend</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{totalExpenditure.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Liters</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalLiters.toFixed(2)} L</p>
                </div>
              </div>

              <button
                onClick={handleOpenCreateForm}
                className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <Plus size={16} /> Log New Fuel
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-4 text-left">Vehicle / Date</th>
                    <th className="px-8 py-4 text-center">Quantity</th>
                    <th className="px-8 py-4 text-center">Odometer</th>
                    <th className="px-8 py-4 text-right">Total Amount</th>
                    <th className="px-8 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-medium italic text-xs">
                        No fuel logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 tracking-tight">
                            {log.date ? format(new Date(log.date), 'dd MMM yyyy') : '--'}
                          </p>
                          <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">
                            {log.vehicle?.vehicleNumber || 'Vehicle'}
                          </p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{log.liters} L</span>
                            <span className="text-[9px] font-bold text-gray-400">@ ₹{log.rate}/L</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{log.odometer} km</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              ₹{(Number(log.totalAmount) || 0).toLocaleString()}
                            </p>
                            {log.billImage && (
                              <a
                                href={log.billImage}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1 uppercase tracking-widest"
                              >
                                View Receipt
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditForm(log)}
                              title="Edit Fuel Log"
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              title="Delete Fuel Log"
                              className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
