import { useState, useEffect } from "react";
import { X, Phone, CheckCircle, Activity } from "lucide-react";
import api from "../../api/axios";

interface ShopkeeperModalProps {
  shopkeeperId: number;
  assignedAt: string;
  timeLeft?: number;
  onClose: () => void;
}

export function ShopkeeperModal({ shopkeeperId, assignedAt, onClose }: ShopkeeperModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/shopkeepers/${shopkeeperId}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch shopkeeper details", err);
        setLoading(false);
      });
  }, [shopkeeperId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-gray-900 font-bold text-lg">Assigned Shopkeeper</h2>
          <button onClick={onClose} className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors text-gray-700">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#00891D] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : data ? (
          <div className="p-5">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mb-3 text-3xl font-bold shadow-sm border-2 border-white">
                {data.name.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{data.name}</h3>
              <p className="text-gray-500 text-sm font-medium">ID: {data.employee_id || "N/A"}</p>
              
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-100">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                {data.status}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={16} />
                  <span className="text-sm font-medium">Phone</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{data.phone || "Not Provided"}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <Activity size={16} />
                  <span className="text-sm font-medium">Active Orders</span>
                </div>
                <span className="text-sm font-bold text-[#EF5A06]">{data.active_order_count}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle size={16} />
                  <span className="text-sm font-medium">Completed Today</span>
                </div>
                <span className="text-sm font-bold text-[#00891D]">{data.orders_completed_today || 0}</span>
              </div>

              <div className="flex flex-col p-3 bg-blue-50/50 rounded-xl border border-blue-100 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Assigned At</span>
                  <span className="text-xs text-gray-700 font-semibold">{new Date(assignedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Failed to load shopkeeper details.
          </div>
        )}
      </div>
    </div>
  );
}
