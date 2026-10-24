import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import {
  QrCode,
  Smartphone,
  Truck,
  Users,
  Megaphone,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  Calendar,
  Layers,
  Activity,
  Play,
  RotateCw,
} from 'lucide-react';

export const Dashboard = () => {
  const {
    qrCodes,
    scanEvents,
    approvals,
    auditLogs,
    setActiveScreen,
    setSelectedQrId,
    setWizardData,
    setWizardStep,
    setTestScanModal,
  } = useQR();

  const [dateRange, setDateRange] = useState('30d');
  const [selectedHub, setSelectedHub] = useState('all');

  // Compute live metrics from qrCodes & scanEvents
  const totalCodes = qrCodes.length;
  const activeCodes = qrCodes.filter((q) => q.status === 'Active').length;
  const pendingCodes = qrCodes.filter((q) => q.status === 'Pending Approval').length;
  const expiredCodes = qrCodes.filter((q) => q.status === 'Expired').length;

  const totalScans = qrCodes.reduce((acc, q) => acc + (q.metrics?.scans || 0), 0);
  const totalRegistrations = qrCodes.reduce((acc, q) => acc + (q.metrics?.verifiedRegistrations || 0), 0);
  const totalFirstOrders = qrCodes.reduce((acc, q) => acc + (q.metrics?.firstOrders || 0), 0);

  // Top performing QR codes
  const topQrCodes = [...qrCodes]
    .sort((a, b) => (b.metrics?.scans || 0) - (a.metrics?.scans || 0))
    .slice(0, 4);

  // Quick Action Handler to launch wizard with prefilled type
  const handleQuickCreate = (type, cta, title, template) => {
    setWizardData((prev) => ({
      ...prev,
      type,
      name: `${type} QR - ${new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`,
      ctaText: cta,
      campaignTitle: title,
      template: template || 'VillagKart Branded',
      fgColor: '#00891D',
    }));
    setWizardStep(1);
    setActiveScreen('wizard');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Welcome & Filter Control Bar (Clean ERP Card) */}
      <div className="vk-card" style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-active" style={{ fontSize: '11px' }}>
                VillagKart QR Studio · Production Live
              </span>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Enterprise Operations Overview</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Good morning
            </h2>
            <p style={{ color: '#4B5563', fontSize: '13.5px', marginTop: '4px', maxWidth: '680px' }}>
              Manage QR codes, campaigns and customer acquisition across rural collection hubs, Shop-on-Wheels vehicles and field executives.
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#F9FAFB',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#00891D" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#111827',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="custom">Custom Scope</option>
              </select>
            </div>

            <div style={{ width: '1px', height: '16px', background: '#D1D5DB' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="#00891D" />
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#111827',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Hubs & Territories</option>
                <option value="HUB-01">Phirangipuram Hub</option>
                <option value="HUB-02">Guntur Central Hub</option>
                <option value="HUB-03">Tenali Rural Hub</option>
                <option value="HUB-04">Narasaraopet Hub</option>
                <option value="HUB-05">Bapatla Coastal Hub</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (VillagKart Admin StatCard Theme) */}
      <div className="grid-4">
        {/* Total QR Codes */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total QR Codes</span>
            <div className="kpi-icon">
              <QrCode size={18} />
            </div>
          </div>
          <div className="kpi-value">{totalCodes}</div>
          <div className="kpi-trend trend-up">
            <span style={{ color: '#00891D', fontWeight: 600 }}>{activeCodes} Active</span>
            <span style={{ color: '#6B7280' }}>· {pendingCodes} Pending · {expiredCodes} Expired</span>
          </div>
        </div>

        {/* Total Scans */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Scans (30 Days)</span>
            <div className="kpi-icon">
              <Activity size={18} />
            </div>
          </div>
          <div className="kpi-value">{totalScans.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <ArrowUpRight size={14} />
            <span>+18.4% vs previous 30 days</span>
          </div>
        </div>

        {/* Attributed Registrations */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Attributed Registrations</span>
            <div className="kpi-icon">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{totalRegistrations.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <ArrowUpRight size={14} />
            <span>+24.1% verified customer apps</span>
          </div>
        </div>

        {/* Attributed Orders */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Attributed First Orders</span>
            <div className="kpi-icon">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value">{totalFirstOrders.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <ArrowUpRight size={14} />
            <span>+31.6% rural village grocery orders</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Shortcuts (Screen 01 spec: App download, Campaign, Vehicle, Referral) */}
      <div className="vk-card">
        <div className="vk-card-header">
          <div>
            <h2 className="vk-card-title">
              <Sparkles size={17} color="#00891D" />
              Quick Actions — Create Specialized QR
            </h2>
            <p className="vk-card-subtitle">
              One-click preset templates pre-configured for rural commerce channels
            </p>
          </div>
        </div>

        <div className="grid-4">
          {/* App download QR */}
          <div
            onClick={() => handleQuickCreate('App Download', 'SCAN TO DOWNLOAD', 'VillagKart Mobile App', 'App download poster')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00891D';
              e.currentTarget.style.background = '#F9FBFA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E8F5EA', color: '#00891D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>App download QR</div>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              Android + iOS smart routing with Play Store and App Store fallback
            </p>
          </div>

          {/* Campaign QR */}
          <div
            onClick={() => handleQuickCreate('Campaign', 'GET ₹100 OFF', 'Village Launch Festival', 'Village launch flyer')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00891D';
              e.currentTarget.style.background = '#F9FBFA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>Campaign QR</div>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              Village flyers, tea-stall banners, print collateral with voucher codes
            </p>
          </div>

          {/* Vehicle QR */}
          <div
            onClick={() => handleQuickCreate('Vehicle', 'TRACK TODAY\'S VAN ROUTE', 'VillagKart Shop-on-Wheels', 'Shop-on-Wheels vehicle sticker')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00891D';
              e.currentTarget.style.background = '#F9FBFA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>Vehicle QR</div>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              Shop-on-Wheels mobile grocery vans with daily schedule lookup
            </p>
          </div>

          {/* Referral QR */}
          <div
            onClick={() => handleQuickCreate('Referral', 'JOIN VILLAGKART', 'Assisted by VGE Partner', 'VGE referral card')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00891D';
              e.currentTarget.style.background = '#F9FBFA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#F3E8FF', color: '#7E22CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>Referral QR</div>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              VGE field agent and customer referral badges with anti-fraud tracking
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics & Top Performers */}
      <div className="grid-2">
        {/* Scan Trend & Conversion Funnel */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">
                <TrendingUp size={17} color="#00891D" />
                Scan Trend & Acquisition Funnel
              </h2>
              <p className="vk-card-subtitle">Last 30 days scan trajectory across all rural collection hubs</p>
            </div>
          </div>

          {/* Interactive Trend Chart */}
          <div style={{ height: '170px', width: '100%', position: 'relative', marginTop: '10px' }}>
            <svg viewBox="0 0 500 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00891D" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00891D" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="30" x2="500" y2="30" stroke="#E5E7EB" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#E5E7EB" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#E5E7EB" strokeDasharray="3 3" />
              <polygon
                points="0,120 40,105 90,110 140,85 190,95 240,65 290,75 340,45 390,50 440,30 500,20 500,130 0,130"
                fill="url(#trendGrad)"
              />
              <polyline
                points="0,120 40,105 90,110 140,85 190,95 240,65 290,75 340,45 390,50 440,30 500,20"
                fill="none"
                stroke="#00891D"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[[40, 105], [140, 85], [240, 65], [340, 45], [440, 30], [500, 20]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="#FFFFFF" stroke="#00891D" strokeWidth="2.5" />
              ))}
            </svg>
          </div>

          {/* Funnel Progress Bars */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                <span>1. Total Scans</span>
                <span>{totalScans.toLocaleString()} (100%)</span>
              </div>
              <div style={{ height: '7px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#00891D' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                <span>2. App Store / Landing Views</span>
                <span>{Math.round(totalScans * 0.77).toLocaleString()} (77.3%)</span>
              </div>
              <div style={{ height: '7px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '77.3%', height: '100%', background: '#00A322' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                <span>3. Verified App Registrations</span>
                <span>{totalRegistrations.toLocaleString()} (27.8%)</span>
              </div>
              <div style={{ height: '7px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '27.8%', height: '100%', background: '#4CAF50' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                <span>4. First Grocery Orders</span>
                <span>{totalFirstOrders.toLocaleString()} (12.7%)</span>
              </div>
              <div style={{ height: '7px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '12.7%', height: '100%', background: '#81C784' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Top-Performing QR Codes */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">
                <QrCode size={17} color="#00891D" />
                Top Performing QR Codes
              </h2>
              <p className="vk-card-subtitle">Ranked by verified scans & registration conversion</p>
            </div>
            <button
              onClick={() => setActiveScreen('listing')}
              className="btn btn-ghost btn-sm"
              style={{ color: '#00891D', fontWeight: 600 }}
            >
              View all {totalCodes}
              <ChevronRight size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topQrCodes.map((qr) => (
              <div
                key={qr.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#E8F5EA',
                    border: '1px solid #C8E6C9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: '#00891D',
                    fontSize: '12px'
                  }}>
                    QR
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#111827' }}>
                      {qr.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{qr.id}</span> · {qr.type} · {qr.campaign || 'Direct'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                      {(qr.metrics?.scans || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#00891D', fontWeight: 600 }}>
                      {qr.metrics?.conversionRate || 0}% conv.
                    </div>
                  </div>

                  <button
                    onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px 10px' }}
                  >
                    <Smartphone size={13} color="#00891D" />
                    Test
                  </button>

                  <button
                    onClick={() => {
                      setSelectedQrId(qr.id);
                      setActiveScreen('details');
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed (Clean Table View) */}
      <div className="vk-card">
        <div className="vk-card-header">
          <div>
            <h2 className="vk-card-title">
              <Clock size={17} color="#00891D" />
              Recent Operations & Audit Trail
            </h2>
            <p className="vk-card-subtitle">Real-time log of published changes, downloads and approvals</p>
          </div>
          <button
            onClick={() => setActiveScreen('settings')}
            className="btn btn-secondary btn-sm"
          >
            Audit Log Console
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {auditLogs.slice(0, 4).map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: log.outcome === 'Live Updated' ? '#00891D' : '#EF5A06'
                }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>
                    {log.action}: <span style={{ color: '#00891D', fontWeight: 500 }}>{log.reference}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {log.versionDiff}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', color: '#374151' }}>
                  {log.user}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {log.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
 
export { Dashboard as Screen01_Dashboard };
export default Dashboard;
