import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Users,
  ShoppingBag,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  Eye,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const Analytics = () => {
  const { qrCodes, campaigns, currentRole, setSelectedQrId, setActiveScreen, showToast } = useQR();
  const [timeframe, setTimeframe] = useState('30d');
  const [comparePeriod, setComparePeriod] = useState(false);

  // Scoped calculation based on currentRole
  const scopedQrs = qrCodes.filter((q) => {
    if (currentRole === 'Hub Manager' && q.hubId && q.hubId !== 'HUB-01') return false;
    if (currentRole === 'VGE' && q.type !== 'Referral' && q.owner !== 'Kiran Kumar (VGE)') return false;
    return true;
  });

  const totalScans = scopedQrs.reduce((acc, q) => acc + (q.metrics?.scans || 0), 0);
  const totalUnique = scopedQrs.reduce((acc, q) => acc + (q.metrics?.uniqueVisitors || 0), 0);
  const totalRegistrations = scopedQrs.reduce((acc, q) => acc + (q.metrics?.verifiedRegistrations || 0), 0);
  const totalFirstOrders = scopedQrs.reduce((acc, q) => acc + (q.metrics?.firstOrders || 0), 0);

  const totalBudgetSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const avgCPA = totalRegistrations > 0 ? (totalBudgetSpent / totalRegistrations).toFixed(2) : '0';

  // Sorted Top Performing QRs
  const topQrs = [...scopedQrs]
    .sort((a, b) => (b.metrics?.scans || 0) - (a.metrics?.scans || 0))
    .slice(0, 5);

  const handleExportAnalyticsCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Metric,Value',
        `Role Data Scope,${currentRole}`,
        `Total Scans,${totalScans}`,
        `Estimated Unique Visitors,${totalUnique}`,
        `Verified Registrations,${totalRegistrations}`,
        `First Orders,${totalFirstOrders}`,
        `Average Cost Per Acquisition (CPA),INR ${avgCPA}`,
        'Redirect Failures,0',
        'Bot Scans Filtered,42',
      ]
        .concat(['\nTop QR Codes,ID,Type,Scans,Registrations,Orders'])
        .concat(
          topQrs.map(
            (q) =>
              `"${q.name}","${q.id}","${q.type}",${q.metrics?.scans || 0},${q.metrics?.verifiedRegistrations || 0},${q.metrics?.firstOrders || 0}`
          )
        )
        .join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `villagkart_analytics_report_${Date.now()}.csv`;
    link.click();
    showToast('Exported Analytics Report CSV successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Controls Bar (Page 10: Date comparison, CSV export, role-based data scope) */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="vk-card-title">Analytics Dashboard</h2>
              <span className="badge badge-outline" style={{ fontSize: '11.5px' }}>
                Scope: {currentRole === 'Admin' ? 'Global Organization' : currentRole === 'Hub Manager' ? 'Phirangipuram Hub' : 'Field Executive'}
              </span>
            </div>
            <p className="vk-card-subtitle">
              Comprehensive acquisition intelligence: scan volume over time, conversion funnels, channels & territory performance
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Date Comparison Control */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#4B5563', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={comparePeriod}
                onChange={(e) => setComparePeriod(e.target.checked)}
                style={{ accentColor: '#00891D' }}
              />
              <span style={{ fontWeight: 600 }}>Compare with previous period</span>
            </label>

            {/* Timeframe Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#00891D" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="form-control"
                style={{ fontSize: '13px', padding: '6px 10px', width: '130px' }}
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>

            <button onClick={handleExportAnalyticsCSV} className="btn btn-secondary btn-sm">
              <Download size={14} />
              CSV Export
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Volume, Unique, Registrations, Orders, Cost per Registration, Redirect Failures */}
      <div className="grid-4">
        {/* Scan Volume */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Scan Volume</span>
            <div className="kpi-icon"><BarChart3 size={18} /></div>
          </div>
          <div className="kpi-value">{totalScans.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <ArrowUpRight size={14} />
            <span>+22.8% vs {comparePeriod ? 'prior month' : 'benchmark'}</span>
          </div>
        </div>

        {/* Estimated Unique Visitors */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Estimated Unique Visitors</span>
            <div className="kpi-icon"><Users size={18} /></div>
          </div>
          <div className="kpi-value">{totalUnique.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span style={{ color: '#4B5563' }}>81.2% distinct smartphone devices</span>
          </div>
        </div>

        {/* App Registrations & CPA */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Attributed Registrations</span>
            <div className="kpi-icon"><CheckCircle2 size={18} /></div>
          </div>
          <div className="kpi-value">{totalRegistrations.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span style={{ fontWeight: 700, color: '#00891D' }}>
              Cost / Reg: ₹{avgCPA}
            </span>
          </div>
        </div>

        {/* Redirect Failures & Invalid Bot Traffic */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Redirect Failures & Bot Traffic</span>
            <div className="kpi-icon"><ShieldCheck size={18} color="#00891D" /></div>
          </div>
          <div className="kpi-value" style={{ color: '#00891D' }}>0 Failures</div>
          <div className="kpi-trend trend-up">
            <span style={{ color: '#6B7280' }}>42 automated bots filtered out</span>
          </div>
        </div>
      </div>

      {/* Row 2: Scan Volume Over Time Chart */}
      <div className="vk-card">
        <div className="vk-card-header">
          <div>
            <h3 className="vk-card-title">Scan Volume Over Time</h3>
            <p className="vk-card-subtitle">
              Daily scan frequency across rural collection hubs and Shop-on-Wheels vehicles ({timeframe})
            </p>
          </div>
          <span className="badge badge-active">Live Telemetry Synchronized</span>
        </div>

        {/* Bar chart visualization */}
        <div style={{ height: '170px', display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '10px' }}>
          {[
            { day: 'Day 1', scans: 1420, h: 45 },
            { day: 'Day 2', scans: 1680, h: 52 },
            { day: 'Day 3', scans: 1940, h: 60 },
            { day: 'Day 4', scans: 2450, h: 74 },
            { day: 'Day 5', scans: 3100, h: 88 },
            { day: 'Day 6', scans: 2890, h: 82 },
            { day: 'Day 7', scans: 3410, h: 96 },
            { day: 'Day 8', scans: 3020, h: 85 },
            { day: 'Day 9', scans: 3650, h: 100 },
          ].map((bar, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '10.5px', color: '#6B7280', marginBottom: '4px', fontWeight: 600 }}>
                {bar.scans}
              </div>
              <div
                style={{
                  width: '100%',
                  height: `${bar.h}%`,
                  background: 'linear-gradient(180deg, #00891D 0%, #15803D 100%)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s ease',
                }}
                title={`${bar.day}: ${bar.scans} verified scans`}
              />
              <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '6px', whiteSpace: 'nowrap' }}>
                {bar.day}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Conversion Funnels & Android vs iOS Distribution */}
      <div className="grid-2">
        {/* Scan-to-registration & Registration-to-first-order funnels */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Customer Acquisition Funnel</h3>
              <p className="vk-card-subtitle">Scan-to-registration and registration-to-first-order conversion</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>1. Scanned Offline QR Asset</span>
                <span>{totalScans.toLocaleString()} (100%)</span>
              </div>
              <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#00891D' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>2. Store Redirect / Landing View</span>
                <span>{Math.round(totalScans * 0.77).toLocaleString()} (77.3%)</span>
              </div>
              <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '77.3%', height: '100%', background: '#00A322' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>3. Verified App Registration</span>
                <span>{totalRegistrations.toLocaleString()} (27.8%)</span>
              </div>
              <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '27.8%', height: '100%', background: '#4CAF50' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>4. First Grocery Order Placed</span>
                <span>{totalFirstOrders.toLocaleString()} (12.7%)</span>
              </div>
              <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '12.7%', height: '100%', background: '#81C784' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Android vs iOS Distribution Donut */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Android vs iOS Distribution</h3>
              <p className="vk-card-subtitle">Device operating system market breakdown in rural mandals</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '12px' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'conic-gradient(#00891D 0% 82.4%, #4CAF50 82.4% 96.6%, #9CA3AF 96.6% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#00891D' }}>82.4%</span>
                <span style={{ fontSize: '10px', color: '#6B7280' }}>Android</span>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#00891D' }} />
                  <span>Android (Redmi, Realme, Samsung)</span>
                </div>
                <span style={{ fontWeight: 700 }}>82.4%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#4CAF50' }} />
                  <span>Apple iOS (iPhone)</span>
                </div>
                <span style={{ fontWeight: 700 }}>14.2%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#9CA3AF' }} />
                  <span>Web Fallback / Desktop</span>
                </div>
                <span style={{ fontWeight: 700 }}>3.4%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Source & Medium Performance + Top Performing QR Codes */}
      <div className="grid-2">
        {/* Source and Medium Performance */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Source & Medium Performance</h3>
              <p className="vk-card-subtitle">Acquisition channels ranking by scan volume and conversions</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {[
              { source: 'Vehicle Van Vinyls', medium: 'Fleet Branding', scans: '14,200', conv: '3,840', rate: '27.0%' },
              { source: 'VGE Referral Cards', medium: 'Direct Agent', scans: '11,800', conv: '4,120', rate: '34.9%' },
              { source: 'Village Posters & Leaflets', medium: 'Print Outdoor', scans: '9,450', conv: '2,150', rate: '22.7%' },
              { source: 'WhatsApp Campaign Share', medium: 'Viral Social', scans: '8,210', conv: '2,490', rate: '30.3%' },
              { source: 'Product Box Labels', medium: 'Packaging QR', scans: '4,520', conv: '810', rate: '17.9%' },
            ].map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{s.source}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{s.medium}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{s.scans} scans</div>
                  <div style={{ fontSize: '11.5px', color: '#00891D', fontWeight: 600 }}>{s.conv} reg ({s.rate})</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing QR Codes */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Top-Performing QR Codes</h3>
              <p className="vk-card-subtitle">Highest customer acquisition assets in active circulation</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {topQrs.map((qr) => (
              <div
                key={qr.id}
                onClick={() => {
                  setSelectedQrId(qr.id);
                  setActiveScreen('details');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: '#FFFFFF',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#00891D', fontSize: '13px' }}>
                    {qr.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>
                    {qr.id} · {qr.type} · {qr.hubName}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: '#111827' }}>
                    {(qr.metrics?.scans || 0).toLocaleString()} scans
                  </div>
                  <div style={{ fontSize: '11px', color: '#00891D', fontWeight: 600 }}>
                    {(qr.metrics?.verifiedRegistrations || 0).toLocaleString()} registrations
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Hub and Village Performance Table */}
      <div className="vk-card">
        <div className="vk-card-header">
          <div>
            <h3 className="vk-card-title">Hub and Village Performance</h3>
            <p className="vk-card-subtitle">Scans, app registrations and conversion rankings per collection hub</p>
          </div>
        </div>

        <div className="vk-table-container">
          <table className="vk-table">
            <thead>
              <tr>
                <th>Hub / Territory</th>
                <th>District / Mandal</th>
                <th>Total Scans</th>
                <th>Unique Customers</th>
                <th>Verified Registrations</th>
                <th>First Orders</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#00891D' }}>Phirangipuram Hub</td>
                <td>Guntur · Phirangipuram</td>
                <td>21,250</td>
                <td>16,550</td>
                <td>6,040</td>
                <td>2,730</td>
                <td><span className="badge badge-active">28.4%</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#00891D' }}>Guntur Central Hub</td>
                <td>Guntur · Urban</td>
                <td>12,400</td>
                <td>9,800</td>
                <td>3,200</td>
                <td>1,540</td>
                <td><span className="badge badge-active">25.8%</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#00891D' }}>Tenali Rural Hub</td>
                <td>Guntur · Tenali</td>
                <td>6,800</td>
                <td>5,400</td>
                <td>2,750</td>
                <td>1,240</td>
                <td><span className="badge badge-active">40.4%</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#00891D' }}>Narasaraopet Hub</td>
                <td>Palnadu · Narasaraopet</td>
                <td>3,410</td>
                <td>2,890</td>
                <td>420</td>
                <td>512</td>
                <td><span className="badge badge-draft">12.3%</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#00891D' }}>Bapatla Coastal Hub</td>
                <td>Bapatla · Coastal</td>
                <td>4,200</td>
                <td>3,650</td>
                <td>910</td>
                <td>430</td>
                <td><span className="badge badge-active">21.6%</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export { Analytics as Screen10_Analytics };
export default Analytics;
