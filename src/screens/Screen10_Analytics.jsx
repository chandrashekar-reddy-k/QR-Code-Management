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
} from 'lucide-react';

export const Screen10_Analytics = () => {
  const { qrCodes, campaigns, showToast } = useQR();
  const [timeframe, setTimeframe] = useState('30d');

  const totalScans = qrCodes.reduce((acc, q) => acc + (q.metrics?.scans || 0), 0);
  const totalUnique = qrCodes.reduce((acc, q) => acc + (q.metrics?.uniqueVisitors || 0), 0);
  const totalRegistrations = qrCodes.reduce((acc, q) => acc + (q.metrics?.verifiedRegistrations || 0), 0);
  const totalFirstOrders = qrCodes.reduce((acc, q) => acc + (q.metrics?.firstOrders || 0), 0);

  const totalBudgetSpent = campaigns.reduce((acc, c) => acc + (c.spent || 0), 0);
  const avgCPA = totalRegistrations > 0 ? (totalBudgetSpent / totalRegistrations).toFixed(2) : '0';

  const handleExportAnalyticsCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Metric,Value',
       `Total Scans,${totalScans}`,
       `Unique Visitors,${totalUnique}`,
       `Verified Registrations,${totalRegistrations}`,
       `First Orders,${totalFirstOrders}`,
       `Average Cost Per Acquisition (CPA),INR ${avgCPA}`,
      ].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `villagkart_analytics_report_${Date.now()}.csv`;
    link.click();
    showToast('Exported Analytics Report CSV successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Controls Bar */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Screen 10 · Enterprise Analytics Dashboard</h2>
            <p className="vk-card-subtitle">
              Answers the 5 core questions: scan volumes, channels, app registrations, first orders & best hub assets
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
              Export Full Report (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* 5 Core Answers Metric Cards */}
      <div className="grid-4">
        {/* Q1: Scan Volume */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">1. Total Scans</span>
            <div className="kpi-icon"><BarChart3 size={18} /></div>
          </div>
          <div className="kpi-value">{totalScans.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <ArrowUpRight size={14} />
            <span>+22.8% scan volume</span>
          </div>
        </div>

        {/* Q2: Unique Visitors */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">2. Unique Visitors</span>
            <div className="kpi-icon"><Users size={18} /></div>
          </div>
          <div className="kpi-value">{totalUnique.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span style={{ color: '#4B5563' }}>81.2% distinct devices</span>
          </div>
        </div>

        {/* Q3: Registered Visitors */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">3. App Registrations</span>
            <div className="kpi-icon"><CheckCircle2 size={18} /></div>
          </div>
          <div className="kpi-value">{totalRegistrations.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span style={{ fontWeight: 700, color: '#00891D' }}>27.8% verified conversion</span>
          </div>
        </div>

        {/* Q4: First Orders & CPA */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">4. First Orders (CPA)</span>
            <div className="kpi-icon"><ShoppingBag size={18} /></div>
          </div>
          <div className="kpi-value">{totalFirstOrders.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span style={{ color: '#00891D', fontWeight: 700 }}>Avg CPA: ₹{avgCPA}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Conversion Funnel & Device Distribution */}
      <div className="grid-2">
        {/* Registration and First-Order Funnel */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Registration & Order Funnel</h3>
              <p className="vk-card-subtitle">End-to-end customer journey from print scan to completed first order</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                <span>1. Scanned Offline QR</span>
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
                <span>4. First Order Placed</span>
                <span>{totalFirstOrders.toLocaleString()} (12.7%)</span>
              </div>
              <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '12.7%', height: '100%', background: '#81C784' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Operating System & Device Routing Split */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Device & OS Routing Distribution</h3>
              <p className="vk-card-subtitle">Android Google Play vs Apple iOS vs Web Fallback</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '12px' }}>
            {/* Donut representation */}
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
                  <span>Android (Redmi, Samsung, Realme)</span>
                </div>
                <span style={{ fontWeight: 700 }}>82.4%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#4CAF50' }} />
                  <span>Apple iOS (iPhone / iPad)</span>
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

      {/* Row 3: Hub & Territory Breakdown */}
      <div className="vk-card">
        <div className="vk-card-header">
          <div>
            <h3 className="vk-card-title">Hub & Territory Performance Breakdown</h3>
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
