import React, { useState, useEffect } from 'react';
import { History, Play, StopCircle, Clock, MapPin, Wallet, TrendingUp, AlertCircle, Loader2, Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TripManagementSection({ storeId, vehicles }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    startOdometer: '',
    openingCash: '0',
    shift: 1,
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [endData, setEndData] = useState({
    endOdometer: '',
    closingCash: '0',
    totalSales: '0',
    totalExpenses: '0'
  });

  const [editData, setEditData] = useState({
    vehicleId: '',
    startOdometer: '',
    endOdometer: '',
    openingCash: '0',
    closingCash: '0',
    totalSales: '0',
    totalExpenses: '0',
    shift: 1,
    date: '',
    status: 'OPEN'
  });

  useEffect(() => {
    loadTrips();
  }, [storeId]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getVehicleOpsTrips({ storeId });
      setTrips(res.data);
    } catch (error) {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminAPI.startVehicleTrip(formData);
      toast.success('Trip started successfully');
      setShowStartModal(false);
      loadTrips();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndTrip = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminAPI.endVehicleTrip(selectedTrip.id, endData);
      toast.success('Trip ended and reconciled');
      setShowEndModal(false);
      loadTrips();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to end trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (trip) => {
    setSelectedTrip(trip);
    setEditData({
      vehicleId: trip.vehicleId || '',
      startOdometer: trip.startOdometer !== undefined && trip.startOdometer !== null ? String(trip.startOdometer) : '',
      endOdometer: trip.endOdometer !== undefined && trip.endOdometer !== null ? String(trip.endOdometer) : '',
      openingCash: trip.openingCash !== undefined && trip.openingCash !== null ? String(trip.openingCash) : '0',
      closingCash: trip.closingCash !== undefined && trip.closingCash !== null ? String(trip.closingCash) : '0',
      totalSales: trip.totalSales !== undefined && trip.totalSales !== null ? String(trip.totalSales) : '0',
      totalExpenses: trip.totalExpenses !== undefined && trip.totalExpenses !== null ? String(trip.totalExpenses) : '0',
      shift: trip.shift || 1,
      date: trip.date || format(new Date(), 'yyyy-MM-dd'),
      status: trip.status || 'OPEN'
    });
    setShowEditModal(true);
  };

  const handleUpdateTrip = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;
    try {
      setIsSubmitting(true);
      await adminAPI.updateVehicleTrip(selectedTrip.id, editData);
      toast.success('Trip updated successfully');
      setShowEditModal(false);
      loadTrips();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return;
    try {
      await adminAPI.deleteVehicleTrip(tripId);
      toast.success('Trip deleted successfully');
      loadTrips();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete trip');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Loading Trip Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Shift & Trip Management</h3>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Control vehicle operational lifecycle</p>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <Play size={16} fill="currentColor" />
          Start New Trip
        </button>
      </div>

      {/* Trip List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
            <History size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No trip history found for this store</p>
          </div>
        ) : (
          trips.map(trip => (
            <div 
              key={trip.id}
              className={`bg-white rounded-[2rem] border transition-all p-6 relative overflow-hidden group shadow-sm hover:shadow-xl ${trip.status === 'OPEN' ? 'border-emerald-200' : 'border-gray-100'}`}
            >
              {trip.status === 'OPEN' && (
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Active Trip
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${trip.status === 'OPEN' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  <History size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 leading-tight">{trip.vehicle?.vehicleNumber || trip.vehicleId}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{trip.user?.name || 'Assigned Driver'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Start ODO</p>
                  <p className="text-sm font-black text-gray-800">{trip.startOdometer} km</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">End ODO</p>
                  <p className="text-sm font-black text-gray-800">{trip.endOdometer || '--'} km</p>
                </div>
              </div>

              {trip.status === 'CLOSED' && (
                <div className="space-y-3 mb-6 bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/30">
                   <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Distance</span>
                    <span className="text-emerald-600 font-black">{((trip.endOdometer || 0) - (trip.startOdometer || 0)).toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Total Sales</span>
                    <span className="text-emerald-600 font-black">₹{trip.totalSales?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <Calendar size={12} />
                  {trip.date}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(trip)}
                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Edit Trip Details"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteTrip(trip.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Trip"
                  >
                    <Trash2 size={14} />
                  </button>
                  {trip.status === 'OPEN' ? (
                    <button 
                      onClick={() => { setSelectedTrip(trip); setShowEndModal(true); }}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/20"
                    >
                      Close Trip
                    </button>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-2.5 py-1 bg-gray-100 rounded-lg">Completed</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Start Trip Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-gray-100 bg-emerald-600 text-white">
              <h3 className="text-2xl font-black tracking-tight">Initialize Shift</h3>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1">Setup vehicle and starting parameters</p>
            </div>
            
            <form onSubmit={handleStartTrip} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Select Vehicle</label>
                <select 
                  required
                  value={formData.vehicleId}
                  onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                >
                  <option value="">Choose Vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Start Odometer</label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    placeholder="0.0"
                    value={formData.startOdometer}
                    onChange={e => setFormData({...formData, startOdometer: e.target.value})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Shift</label>
                  <select 
                    value={formData.shift}
                    onChange={e => setFormData({...formData, shift: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  >
                    <option value={1}>Morning (1)</option>
                    <option value={2}>Evening (2)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Opening Cash</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input 
                    type="number"
                    required
                    value={formData.openingCash}
                    onChange={e => setFormData({...formData, openingCash: e.target.value})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 pl-8 pr-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Initialize Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {showEditModal && selectedTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black tracking-tight">Edit Trip Details</h3>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-0.5">
                  Update parameters for {selectedTrip.vehicle?.vehicleNumber || selectedTrip.vehicleId}
                </p>
              </div>
            </div>
            
            <form onSubmit={handleUpdateTrip} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Vehicle</label>
                  <select 
                    required
                    value={editData.vehicleId}
                    onChange={e => setEditData({...editData, vehicleId: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Choose Vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleName})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Trip Status</label>
                  <select 
                    value={editData.status}
                    onChange={e => setEditData({...editData, status: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
                  <input 
                    type="date"
                    required
                    value={editData.date}
                    onChange={e => setEditData({...editData, date: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Shift</label>
                  <select 
                    value={editData.shift}
                    onChange={e => setEditData({...editData, shift: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={1}>Morning (1)</option>
                    <option value={2}>Evening (2)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Start Odometer (KM)</label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    value={editData.startOdometer}
                    onChange={e => setEditData({...editData, startOdometer: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">End Odometer (KM)</label>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="Leave empty if open"
                    value={editData.endOdometer}
                    onChange={e => setEditData({...editData, endOdometer: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Opening Cash (₹)</label>
                  <input 
                    type="number"
                    required
                    value={editData.openingCash}
                    onChange={e => setEditData({...editData, openingCash: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Closing Cash (₹)</label>
                  <input 
                    type="number"
                    value={editData.closingCash}
                    onChange={e => setEditData({...editData, closingCash: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Total Sales (₹)</label>
                  <input 
                    type="number"
                    value={editData.totalSales}
                    onChange={e => setEditData({...editData, totalSales: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Total Expenses (₹)</label>
                  <input 
                    type="number"
                    value={editData.totalExpenses}
                    onChange={e => setEditData({...editData, totalExpenses: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 text-gray-500 font-black uppercase tracking-wider text-[10px] border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] rounded-xl shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Trip Modal */}
      {showEndModal && selectedTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-gray-100 bg-rose-600 text-white">
              <h3 className="text-2xl font-black tracking-tight">Shift Reconciliation</h3>
              <p className="text-rose-100 text-xs font-bold uppercase tracking-widest mt-1">Close active trip for {selectedTrip.vehicle?.vehicleNumber || selectedTrip.vehicleId}</p>
            </div>
            
            <form onSubmit={handleEndTrip} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">End Odometer (Min: {selectedTrip.startOdometer} km)</label>
                <input 
                  type="number"
                  step="0.1"
                  required
                  min={selectedTrip.startOdometer}
                  value={endData.endOdometer}
                  onChange={e => setEndData({...endData, endOdometer: e.target.value})}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Closing Cash</label>
                  <input 
                    type="number"
                    required
                    value={endData.closingCash}
                    onChange={e => setEndData({...endData, closingCash: e.target.value})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Total Sales</label>
                  <input 
                    type="number"
                    required
                    value={endData.totalSales}
                    onChange={e => setEndData({...endData, totalSales: e.target.value})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowEndModal(false)}
                  className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Complete Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

