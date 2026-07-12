import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, Printer, Loader2, ChevronRight } from "lucide-react";
import api from "../../api/axios";
import { PackingScreenMobile } from "./PackingScreenMobile";

interface PackingScreenProps {
  onNavigate: (screen: string) => void;
  onBack: () => void;
  order?: any;
}

export function PackingScreen({ onNavigate, onBack, order }: PackingScreenProps) {
  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;

  // Staff login (SHOPKEEPER / STORE_STAFF) uses the original mobile packing screen UI
  const isStaffLogin = !userRole || userRole === "SHOPKEEPER" || userRole === "STORE_STAFF";

  if (isStaffLogin) {
    return <PackingScreenMobile onNavigate={onNavigate} onBack={onBack} order={order} />;
  }

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [labelPrinted, setLabelPrinted] = useState(false);

  useEffect(() => {
    if (!order?.id) return;
    api.get(`/orders/${order.id}`).then(res => {
      setItems(res.data.items || []);
      setCheckedIds(res.data.items?.filter((i: any) => i.is_verified).map((i: any) => i.id) || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [order?.id]);

  const pickedItems = items.filter((item) => item.is_picked);
  const totalToPack = pickedItems.length;
  const totalChecked = checkedIds.length;
  const remainingToPack = totalToPack - totalChecked;
  const allChecked = totalToPack > 0 && totalChecked === totalToPack;

  const toggle = (id: number) => {
    setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCompletePacking = async () => {
    if (allChecked && labelPrinted && order?.id) {
      try {
        await api.put(`/orders/${order.id}/status`, {
          status: 'ready',
          tray_number: order.tray_number || order.tray || 'TBA'
        });
        onNavigate("ready-orders");
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] items-center justify-center">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] pb-24">
      {/* 1. Page Header with Desktop Layout */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <nav className="text-xs text-gray-500 flex items-center gap-1 mb-2">
            <button onClick={() => onNavigate("dashboard")} className="hover:text-[#00891D] transition-colors">Home</button>
            <ChevronRight size={12} />
            <button onClick={() => onNavigate("packing-queue")} className="hover:text-[#00891D] transition-colors">Packing Queue</button>
            <ChevronRight size={12} />
            <span className="font-medium text-orange-600">Order #{order?.order_number}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Packing Order — #{order?.order_number}
              </h1>

              <div className="flex flex-wrap gap-2 mt-1.5">
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-100 text-orange-700">
                  {order.order_type || "Quick Commerce"}
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700">
                  Tray: {order.tray_number || order.tray || "N/A"}
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-100 text-green-700">
                  Status: {order.status === "packing" ? "In Progress" : (order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || "N/A")}
                </span>
              </div>
            </div>

            <button
              onClick={onBack}
              className="self-start md:self-auto flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft size={14} />
              <span>Back to Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Progress Section directly below header */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 py-2.5 border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1 text-xs sm:text-sm font-semibold text-gray-500">
              <div>
                Packed: <span className="text-gray-900 font-bold">{totalChecked}/{totalToPack}</span>
                <span className="mx-2">•</span>
                Remaining: <span className="text-gray-900 font-bold">{remainingToPack}</span>
                <span className="mx-2">•</span>
                <span className={`font-bold ${allChecked ? "text-[#00891D]" : "text-orange-600"}`}>
                  {totalToPack ? Math.round((totalChecked / totalToPack) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${totalToPack ? (totalChecked / totalToPack) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Body */}
      <div className="max-w-4xl mx-auto w-full p-4 space-y-4">

        {/* Packing Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 py-2.5 px-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <span>📦</span>
            <span>Tray {order?.tray_number || order?.tray || 'TBA'}</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500 font-semibold text-xs sm:text-sm">
            <span>|</span>
            <span>Expected: <span className="text-gray-900 font-bold">{totalToPack}</span></span>
            <span>|</span>
            <span>Packed: <span className="text-orange-600 font-bold">{totalChecked}</span></span>
            <span>|</span>
            <span>Remaining: <span className="text-gray-900 font-bold">{remainingToPack}</span></span>
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h3 className="text-gray-900 font-bold text-sm sm:text-base">Product Verification Checklist</h3>
            {allChecked ? (
              <span className="text-[#00891D] text-xs sm:text-sm font-bold flex items-center gap-1">
                ✓ All Verified
              </span>
            ) : (
              <button
                onClick={() => setCheckedIds(pickedItems.map((i) => i.id))}
                className="text-[#00891D] hover:text-[#006614] transition-colors text-xs sm:text-sm font-bold"
              >
                Verify All
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-auto text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-xs uppercase tracking-wider h-8">
                  <th className="px-4 py-1.5">Product</th>
                  <th className="px-4 py-1.5 text-center">Quantity</th>
                  <th className="px-4 py-1.5 text-center w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pickedItems.map((item) => {
                  const isChecked = checkedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer h-12"
                    >
                      <td className="px-4 py-1.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="object-cover w-full h-full" />
                          ) : (
                            <span style={{ fontSize: "14px" }}>📦</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold text-xs sm:text-sm truncate ${isChecked ? "text-green-800" : "text-gray-900"}`}>
                            {item.name}
                          </p>
                          {item.sku && <p className="text-[9px] text-gray-450 mt-0.5">SKU: {item.sku}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-center font-bold text-gray-900 text-xs sm:text-sm">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-1.5 text-center">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border transition-colors ${isChecked
                              ? "bg-green-50 text-[#00891D] border-green-200"
                              : "bg-orange-50 text-[#EF5A06] border-orange-200"
                              }`}
                          >
                            <span className={`w-1 h-1 rounded-full mr-1 ${isChecked ? "bg-[#00891D]" : "bg-[#EF5A06]"}`}></span>
                            {isChecked ? "Packed" : "Pending"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 p-4 shadow-md z-10">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button
            onClick={() => setLabelPrinted(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-3 border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} className={labelPrinted ? "text-[#00891D]" : "text-[#EF5A06]"} />
            <span className={`font-bold text-sm ${labelPrinted ? "text-[#00891D]" : "text-[#EF5A06]"}`}>
              {labelPrinted ? "Label Printed ✓" : "Print Label"}
            </span>
          </button>
          <button
            onClick={handleCompletePacking}
            disabled={!allChecked || !labelPrinted}
            className="flex-[2] flex items-center justify-center gap-2 rounded-lg py-3 transition-colors text-white font-bold text-sm shadow-sm"
            style={{
              backgroundColor: allChecked && labelPrinted ? "#00891D" : "#BDBDBD",
              cursor: allChecked && labelPrinted ? "pointer" : "not-allowed"
            }}
          >
            <CheckCircle size={16} color="white" />
            <span>
              {allChecked ? "Complete Packing" : `Pack Remaining (${remainingToPack})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
