import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, Printer, Package, CheckSquare, Square, Loader2 } from "lucide-react";
import api from "../../api/axios";
import { getSLAInfo } from "../../utils/slaHelper";

interface PackingScreenMobileProps {
  onNavigate: (screen: string) => void;
  onBack: () => void;
  order?: any;
}

export function PackingScreenMobile({ onNavigate, onBack, order }: PackingScreenMobileProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [labelPrinted, setLabelPrinted] = useState(false);
  const [slaInfo, setSlaInfo] = useState(() => getSLAInfo(order));

  useEffect(() => {
    const updateTimer = () => {
      setSlaInfo(getSLAInfo(order));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order]);

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
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center dark:bg-gray-900">
        <Loader2 className="animate-spin text-[#EF5A06]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
      <div style={{ background: "linear-gradient(135deg, #EF5A06 0%, #D84315 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>Packing — #{order?.order_number}</h1>
            <p className="text-white/70" style={{ fontSize: "12px" }}>Tray: {order?.tray_number || order?.tray || 'N/A'} · {order?.order_type} · SLA: {slaInfo.displayText}</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>
              {totalChecked} of {totalToPack} Packed
            </span>
            <span className="text-white/70" style={{ fontSize: "12px" }}>{totalToPack ? Math.round((totalChecked / totalToPack) * 100) : 0}%</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${totalToPack ? (totalChecked / totalToPack) * 100 : 0}%`, backgroundColor: allChecked ? "#9E9E9E" : "#FFC107" }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 pb-36">
        <div className="bg-white rounded-2xl p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                <Package size={28} color="#EF5A06" />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "11px" }}>PACKING TRAY</p>
                <p className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "22px" }}>{order?.tray_number || order?.tray || 'TBA'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex gap-3">
                <div className="text-center">
                  <p className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "18px" }}>{totalToPack}</p>
                  <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "10px" }}>Expected</p>
                </div>
                <div className="text-center">
                  <p className="text-orange-600" style={{ fontWeight: 700, fontSize: "18px" }}>{totalChecked}</p>
                  <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "10px" }}>Packed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "13px" }}>Product Verification Checklist</h3>
            <button
              onClick={() => setCheckedIds(pickedItems.map((i) => i.id))}
              className="text-green-600"
              style={{ fontSize: "12px", fontWeight: 500 }}
            >
              Check All
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {pickedItems.map((item) => {
              const isChecked = checkedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-left transition-colors border"
                  style={{
                    backgroundColor: isChecked ? "#E8F5E9" : "#F9F9F9",
                    borderColor: isChecked ? "#C8E6C9" : "transparent"
                  }}
                >
                  {isChecked ? (
                    <CheckSquare size={20} color="#2E7D32" />
                  ) : (
                    <Square size={20} color="#BDBDBD" />
                  )}
                  <div className="w-10 h-10 rounded bg-white flex items-center justify-center overflow-hidden shadow-sm dark:bg-gray-800">
                    {item.image_url ? <img src={item.image_url} alt="" /> : <span style={{ fontSize: "20px" }}>📦</span>}
                  </div>
                  <div className="flex-1">
                    <p style={{ fontWeight: 500, fontSize: "12px", color: isChecked ? "#2E7D32" : "#212121" }}>{item.name}</p>
                    <p style={{ fontSize: "10px", color: "#9E9E9E" }}>Qty: {item.quantity}</p>
                  </div>
                  {isChecked && <CheckCircle size={16} color="#2E7D32" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-100 p-2.5 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={() => setLabelPrinted(true)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 border"
            style={{ borderColor: labelPrinted ? "#00891D" : "#EF5A06", backgroundColor: labelPrinted ? "#E8F5E9" : "white" }}
          >
            <Printer size={13} color={labelPrinted ? "#00891D" : "#EF5A06"} />
            <span style={{ color: labelPrinted ? "#00891D" : "#EF5A06", fontWeight: 600, fontSize: "11px" }}>
              {labelPrinted ? "Label Printed ✓" : "Print Label"}
            </span>
          </button>
          <button
            onClick={handleCompletePacking}
            disabled={!allChecked || !labelPrinted}
            className="flex-[2] flex items-center justify-center gap-1.5 rounded-lg py-2 transition-opacity"
            style={{ backgroundColor: allChecked && labelPrinted ? "#2E7D32" : "#BDBDBD", opacity: allChecked && labelPrinted ? 1 : 0.7 }}
          >
            <CheckCircle size={13} color="white" />
            <span className="text-white" style={{ fontWeight: 600, fontSize: "12px" }}>
              {allChecked && labelPrinted ? "Complete Packing" : `Pack ${remainingToPack} more item${remainingToPack === 1 ? "" : "s"}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
