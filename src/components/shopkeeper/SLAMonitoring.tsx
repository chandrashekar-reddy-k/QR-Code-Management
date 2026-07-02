import { useState, useEffect } from "react";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, Loader2, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import api from "../../api/axios";

interface SLAMonitoringProps {
  onBack: () => void;
}

const GREEN = "#00891D";
const ORANGE = "#EF5A06";
const GREEN_LIGHT = "#E8F5E9";
const ORANGE_LIGHT = "#FFF3E0";

export function SLAMonitoring({ onBack }: SLAMonitoringProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    api.get('/sla').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center">
        <Loader2 className="animate-spin" size={40} style={{ color: ORANGE }} />
      </div>
    );
  }

  const breaches = data?.breaches || [];
  const summary = data?.summary || { active_breaches: 0, at_risk: 0, active_orders: 0, avg_fulfillment: 0 };
  const hourlyData = data?.hourlyData || [];
  const processingTimes = data?.processingTimes || [];

  const onTimeCount = Math.max(0, summary.active_orders - summary.at_risk - summary.active_breaches);

  let complianceRate = 100;
  if (summary.active_orders > 0) {
    complianceRate = (onTimeCount / summary.active_orders) * 100;
  }
  const atRiskPct = summary.active_orders > 0 ? (summary.at_risk / summary.active_orders) * 100 : 0;
  const breachedPct = summary.active_orders > 0 ? (summary.active_breaches / summary.active_orders) * 100 : 0;

  const noChartData = hourlyData.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      {/* Header — green gradient */}
      <div style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #005C12 100%)` }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>SLA Monitoring</h1>
            <p className="text-white/70" style={{ fontSize: "12px" }}>Operations Command Center · Today</p>
          </div>
          <div className="bg-white/20 rounded-full px-2.5 py-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#4CAF50" }} />
            <span className="text-white" style={{ fontWeight: 600, fontSize: "11px" }}>Live</span>
          </div>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: "Active Orders", value: summary.active_orders, color: "white" },
            { label: "On Track",      value: onTimeCount,             color: "#A5D6A7" },
            { label: "At Risk",       value: summary.at_risk,         color: "#FFD54F" },
            { label: "Breached",      value: summary.active_breaches, color: ORANGE },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
              <p style={{ color: s.color, fontWeight: 700, fontSize: "16px" }}>{s.value}</p>
              <p className="text-white/70" style={{ fontSize: "9px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Compliance bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "13px" }}>SLA Compliance Rate</h3>
            <span style={{ fontWeight: 700, fontSize: "14px", color: complianceRate >= 80 ? GREEN : ORANGE }}>
              {complianceRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className="h-full flex">
              <div style={{ width: `${complianceRate}%`, backgroundColor: GREEN, transition: "width 0.6s ease" }} />
              <div style={{ width: `${atRiskPct}%`,   backgroundColor: ORANGE, opacity: 0.6 }} />
              <div style={{ width: `${breachedPct}%`, backgroundColor: ORANGE }} />
            </div>
          </div>
          <div className="flex gap-5">
            {[
              { label: "On Track", color: GREEN },
              { label: "At Risk",  color: ORANGE, opacity: 0.6 },
              { label: "Breached", color: ORANGE },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: l.color, opacity: l.opacity ?? 1 }} />
                <span className="text-gray-400" style={{ fontSize: "10px" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Avg fulfillment */}
        {summary.avg_fulfillment && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: ORANGE_LIGHT }}>
              <Clock size={20} color={ORANGE} />
            </div>
            <div>
              <p className="text-gray-500" style={{ fontSize: "11px" }}>Avg Fulfillment Time Today</p>
              <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "20px" }}>{summary.avg_fulfillment} min</p>
            </div>
          </div>
        )}

        {/* Breach alerts */}
        {breaches.length > 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} color={ORANGE} />
              <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "13px" }}>SLA Breach Alerts</h3>
              <span
                className="ml-auto rounded-full px-2 py-0.5"
                style={{ fontSize: "11px", fontWeight: 600, backgroundColor: ORANGE_LIGHT, color: ORANGE }}
              >
                {breaches.length} active
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {breaches.map((breach: any) => (
                <div
                  key={breach.order_number}
                  className="rounded-xl p-3"
                  style={{ backgroundColor: breach.delay_minutes > 15 ? ORANGE_LIGHT : "#FFFDE7" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-gray-800" style={{ fontWeight: 700, fontSize: "13px" }}>#{breach.order_number}</span>
                      <span className="ml-2 text-gray-500" style={{ fontSize: "11px" }}>{breach.customer_name}</span>
                    </div>
                    <span style={{ color: ORANGE, fontWeight: 700, fontSize: "13px" }}>+{breach.delay_minutes}m</span>
                  </div>
                  <p className="text-gray-500" style={{ fontSize: "11px" }}>
                    {breach.order_type} · Stage: <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{breach.status}</span> · SLA: {breach.sla_minutes}m
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: GREEN_LIGHT }}>
              <CheckCircle size={20} color={GREEN} />
            </div>
            <p style={{ fontWeight: 600, fontSize: "13px", color: GREEN }}>No SLA breaches right now 🎉</p>
          </div>
        )}

        {/* Hourly order volume bar chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "13px" }}>Hourly Order Volume</h3>
          {noChartData ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Package size={32} color="#BDBDBD" />
              <p className="text-gray-400" style={{ fontSize: "12px" }}>No orders in the last 6 hours</p>
            </div>
          ) : (
            <>
              <div style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} barSize={18}>
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#9E9E9E" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="onTime"   stackId="a" fill={GREEN}  radius={[0, 0, 2, 2]} name="On Time" />
                    <Bar dataKey="breached" stackId="a" fill={ORANGE} radius={[2, 2, 0, 0]} name="Breached" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2">
                {[{ label: "On Time", color: GREEN }, { label: "Breached", color: ORANGE }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                    <span className="text-gray-400" style={{ fontSize: "10px" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Stage time trend line chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm pb-10">
          <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "13px" }}>Stage Time Trend (minutes)</h3>
          {noChartData ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Package size={32} color="#BDBDBD" />
              <p className="text-gray-400" style={{ fontSize: "12px" }}>No dispatched orders to chart yet</p>
            </div>
          ) : (
            <>
              <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processingTimes}>
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#9E9E9E" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} formatter={(v: any) => [`${v} min`]} />
                    <Line type="monotone" dataKey="picking" stroke={GREEN}  strokeWidth={2} dot={false} name="Picking" />
                    <Line type="monotone" dataKey="packing" stroke={ORANGE} strokeWidth={2} dot={false} name="Packing" />
                    <Line type="monotone" dataKey="handover" stroke={GREEN} strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Handover" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-5 mt-2">
                {[
                  { label: "Picking",  color: GREEN,  dash: false },
                  { label: "Packing",  color: ORANGE, dash: false },
                  { label: "Handover", color: GREEN,  dash: true },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: l.color, opacity: l.dash ? 0.6 : 1 }} />
                    <span className="text-gray-400" style={{ fontSize: "10px" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
