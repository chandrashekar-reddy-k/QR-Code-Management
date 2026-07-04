import { useState, useEffect } from "react";
import { Users, Search, RefreshCw, AlertCircle, ShoppingBag, CheckCircle, Package, ArrowLeft, Calendar } from "lucide-react";
import api from "../../api/axios";

interface ActiveOrder {
  orderId: string;
  orderNumber: string;
  fulfillmentType: string;
  status: string;
  pickingCompletedAt: string | null;
  trayNumber: string | null;
  customerName: string;
  itemCount: number;
  pickedCount: number;
}

interface StaffMember {
  id: string;
  name: string;
  employeeId: string | null;
  phone: string | null;
  status: "Busy" | "Idle";
  activeOrder: ActiveOrder | null;
}

interface DetailedOrder {
  id: string;
  orderNumber: string;
  fulfillmentType: string;
  status: string;
  trayNumber: string | null;
  customerName: string;
  itemCount: number;
  pickedCount: number;
  createdAt: string;
}

interface DetailedStaff {
  id: string;
  name: string;
  employeeId: string | null;
  phone: string | null;
  status: string;
  activeOrderCount: number;
  orders: DetailedOrder[];
}

export function StaffTracker() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Busy" | "Idle">("All");
  
  // Detailed Modal View State
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [detailedStaff, setDetailedStaff] = useState<DetailedStaff | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/shopkeepers/tracker");
      setStaff(res.data);
    } catch (err: any) {
      console.error("Failed to fetch staff tracker data:", err);
      setError(err?.response?.data?.message || "Failed to load staff statuses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const res = await api.get(`/shopkeepers/${id}`);
      setDetailedStaff(res.data);
    } catch (err) {
      console.error("Failed to fetch staff details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchStaffDetails(selectedStaffId);
    } else {
      setDetailedStaff(null);
    }
  }, [selectedStaffId]);

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.employeeId && s.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.phone && s.phone.includes(searchQuery));

    const matchesStatus = statusFilter === "All" || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: staff.length,
    busy: staff.filter((s) => s.status === "Busy").length,
    idle: staff.filter((s) => s.status === "Idle").length,
  };

  if (detailedStaff) {
    return (
      <div className="w-full flex flex-col gap-6" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
        {/* Detail View Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedStaffId(null)}
              className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{detailedStaff.name}</h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Employee ID: {detailedStaff.employeeId || "N/A"} • Phone: {detailedStaff.phone || "N/A"}
              </p>
            </div>
          </div>
          <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold ${
            detailedStaff.orders.some(o => ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'].includes(o.status))
              ? "bg-red-50 text-red-600 border border-red-100" 
              : "bg-green-50 text-green-600 border border-green-100"
          }`}>
            {detailedStaff.orders.some(o => ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'].includes(o.status)) ? "Busy" : "Idle"}
          </span>
        </div>

        {/* Detailed Orders Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="text-[#00891D]" size={20} />
            Assigned Order History
          </h3>

          {loadingDetails ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="animate-spin text-[#00891D]" size={24} />
            </div>
          ) : detailedStaff.orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No orders have been assigned to this staff member yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {detailedStaff.orders.map((order) => (
                <div key={order.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 text-sm">Order #{order.orderNumber}</span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded uppercase">
                        {order.fulfillmentType === "STORE_PICKUP" ? "Self Pickup" : "Home Delivery"}
                      </span>
                      {order.trayNumber && (
                        <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded border border-orange-100">
                          Tray {order.trayNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">Customer: {order.customerName}</span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                      <Calendar size={12} />
                      {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      ['DELIVERED', 'OUT_FOR_DELIVERY'].includes(order.status)
                        ? "bg-green-50 text-green-600"
                        : order.status === "CANCELLED"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-orange-50 text-orange-600"
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      Items Picked: {order.pickedCount} / {order.itemCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-[#00891D]" size={24} />
            Staff Status Tracker
          </h2>
          <p className="text-gray-500 text-sm mt-1">Real-time status tracking of all shopkeeper staff members</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 text-center min-w-[80px]">
            <p className="text-gray-800 font-bold text-lg">{stats.total}</p>
            <p className="text-gray-400 text-[10px] font-semibold uppercase">Total Staff</p>
          </div>
          <div className="bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 text-center min-w-[80px]">
            <p className="text-red-600 font-bold text-lg">{stats.busy}</p>
            <p className="text-red-500 text-[10px] font-semibold uppercase">Busy</p>
          </div>
          <div className="bg-green-50 px-4 py-2.5 rounded-xl border border-green-100 text-center min-w-[80px]">
            <p className="text-green-600 font-bold text-lg">{stats.idle}</p>
            <p className="text-green-500 text-[10px] font-semibold uppercase">Idle</p>
          </div>
          <button 
            onClick={fetchStaffData}
            disabled={loading}
            className="p-3 bg-[#00891D]/10 hover:bg-[#00891D]/20 text-[#00891D] rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by staff name, ID or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-150 focus:outline-none focus:border-[#00891D] text-sm text-gray-700"
          />
        </div>
        <div className="flex gap-2">
          {(["All", "Busy", "Idle"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                statusFilter === filter
                  ? "bg-[#00891D] text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Grid/List - Updated to Row Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[300px]">
          <RefreshCw className="animate-spin text-[#00891D] mb-3" size={32} />
          <p className="text-gray-500 text-sm">Loading staff status data...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[300px]">
          <Users className="text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 text-sm">No staff members found matching criteria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredStaff.map((member) => (
            <div 
              key={member.id}
              onClick={() => setSelectedStaffId(member.id)}
              className={`bg-white rounded-2xl border transition-all p-5 shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                member.status === "Busy" ? "border-red-100 hover:border-red-200" : "border-gray-100 hover:border-gray-200"
              }`}
            >
              {/* Staff Personal Info */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-800 text-base">{member.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    member.status === "Busy" 
                      ? "bg-red-50 text-red-600 border border-red-100" 
                      : "bg-green-50 text-green-600 border border-green-100"
                  }`}>
                    {member.status}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  ID: {member.employeeId || "N/A"} • Phone: {member.phone || "No phone"}
                </p>
              </div>

              {/* Active Order Details */}
              <div className="flex-[2] min-w-[300px]">
                {member.status === "Busy" && member.activeOrder ? (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                        <ShoppingBag size={13} className="text-[#00891D]" />
                        #{member.activeOrder.orderNumber}
                        <span className="text-[9px] bg-gray-100 text-gray-400 font-bold px-1.5 py-0.25 rounded uppercase">
                          {member.activeOrder.fulfillmentType === "STORE_PICKUP" ? "Self Pickup" : "Home Delivery"}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">Customer: {member.activeOrder.customerName}</span>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        {member.activeOrder.trayNumber && (
                          <span className="bg-orange-50 text-orange-600 font-bold px-1.5 py-0.25 rounded text-[9px] border border-orange-100">
                            Tray {member.activeOrder.trayNumber}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 font-bold uppercase">{member.activeOrder.status}</span>
                      </div>
                      
                      {/* Mini Progress bar */}
                      <div className="w-32 flex flex-col gap-1">
                        <div className="flex justify-between text-[8px] text-gray-400 font-bold">
                          <span>PROGRESS</span>
                          <span>{member.activeOrder.pickedCount}/{member.activeOrder.itemCount}</span>
                        </div>
                        <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#00891D] h-full rounded-full"
                            style={{ width: `${(member.activeOrder.pickedCount / member.activeOrder.itemCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span>Idle • Ready for assignment</span>
                  </div>
                )}
              </div>

              {/* Action or indicator */}
              <div className="text-right text-xs text-gray-400 border-t md:border-t-0 pt-3 md:pt-0">
                <span className="bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-100 text-[#00891D] font-bold">
                  View History
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
