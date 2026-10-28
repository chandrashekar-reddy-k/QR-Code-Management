import React, { useState, useMemo } from 'react';
import { useQR } from '../context/QRContext';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  RotateCw,
  BarChart3,
  Pause,
  Edit3,
} from 'lucide-react';

export const Dashboard = () => {
  const {
    qrCodes,
    auditLogs,
    setActiveScreen,
    setSelectedQrId,
    setDetailsViewMode,
    setTestScanModal,
    showToast,
    goToListingWithStatus,
    currentRole,
  } = useQR();

  const [dateRange, setDateRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [referenceTime] = useState(() => ({
    hour: new Date().getHours(),
    nowTime: Date.now(),
  }));

  const greeting = useMemo(() => {
    const hour = referenceTime.hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, [referenceTime.hour]);

  // Compute live inventory metrics from actual qrCodes state (Active, Draft, Pending Approval, Paused, Expired)
  const { totalCodes, activeCodes, draftCodes, pendingCodes, pausedCodes, expiredCodes } = useMemo(() => {
    const nowTime = referenceTime.nowTime;
    let total = qrCodes.length;
    let active = 0;
    let draft = 0;
    let pending = 0;
    let paused = 0;
    let expired = 0;

    for (const q of qrCodes) {
      if (q.status === 'Active' || q.status === 'Accepted') active++;
      if (q.status === 'Draft') draft++;
      if (q.status === 'Pending Approval' || q.status === 'Pending' || q.status === 'Under Review') pending++;
      if (q.status === 'Paused') paused++;
      if (q.status === 'Expired' || (q.expiryDate && new Date(q.expiryDate).getTime() < nowTime)) expired++;
    }

    return {
      totalCodes: total,
      activeCodes: active,
      draftCodes: draft,
      pendingCodes: pending,
      pausedCodes: paused,
      expiredCodes: expired,
    };
  }, [qrCodes, referenceTime.nowTime]);



  // QR Type Breakdown computed directly from qrCodes
  const typeMetrics = useMemo(() => {
    const types = [
      { key: 'Campaign', label: 'Marketing Campaigns', color: '#00891D' },
      { key: 'App Download', label: 'App Install Posters', color: '#0284C7' },
      { key: 'Vehicle', label: 'Shop-on-Wheels Vans', color: '#D97706' },
      { key: 'Referral', label: 'VGE Partner Cards', color: '#7C3AED' },
      { key: 'Product', label: 'Product Packaging Labels', color: '#16A34A' },
      { key: 'Feedback', label: 'Customer Feedback Promos', color: '#EA580C' },
    ];
    const total = qrCodes.reduce((acc, q) => acc + (q.metrics?.scans || 0), 0) || 1;
    return types
      .map((t) => {
        const matching = qrCodes.filter((q) => q.type === t.key);
        const scans = matching.reduce((acc, q) => acc + (q.metrics?.scans || 0), 0);
        const count = matching.length;
        const pct = Math.max(1, Math.round((scans / total) * 100));
        return { ...t, count, scans, pct };
      })
      .filter((t) => t.count > 0);
  }, [qrCodes]);

  // Top performing QR codes
  const topQrCodes = useMemo(() => {
    return [...qrCodes]
      .sort((a, b) => (b.metrics?.scans || 0) - (a.metrics?.scans || 0))
      .slice(0, 4);
  }, [qrCodes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Welcome & Filter Control Bar */}
      <div
        className="vk-card"
        style={{
          padding: '22px 26px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFCFA 100%)',
          borderTop: '3px solid #00891D',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          {/* Left Context: Live Status, Title, Subtitle */}
          <div style={{ flex: '1 1 480px', minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#E8F5EA',
                  color: '#00891D',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.2px',
                  border: '1px solid #C8E6C9',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#00891D',
                    boxShadow: '0 0 0 2px rgba(0, 137, 29, 0.25)',
                    display: 'inline-block',
                  }}
                />
                VillagKart QR Studio · Production Live
              </div>
              <span style={{ fontSize: '12px', color: '#D1D5DB' }}>|</span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#4B5563' }}>
                Central Operations Dashboard
              </span>
            </div>

            <h2
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#111827',
                margin: '0 0 6px 0',
                letterSpacing: '-0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{greeting}, {currentRole === 'Admin' ? 'Operations Lead' : currentRole}</span>
              <span style={{ fontSize: '20px' }}>👋</span>
            </h2>

            <p
              style={{
                color: '#4B5563',
                fontSize: '13.5px',
                margin: 0,
                maxWidth: '680px',
                lineHeight: 1.5,
              }}
            >
              Real-time monitoring for QR generation, dynamic edge routing, territory reach and scan activity across rural collection hubs.
            </p>
          </div>

          {/* Right Controls: Segmented Timeframe & Sync */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                background: '#F3F4F6',
                padding: '3px',
                borderRadius: '9px',
                border: '1px solid #E5E7EB',
                gap: '2px',
              }}
            >
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
              ].map((item) => {
                const isActive = dateRange === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDateRange(item.id);
                      if (showToast) showToast(`Scope set to: ${item.label}`);
                    }}
                    style={{
                      padding: '6px 13px',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#00891D' : '#4B5563',
                      background: isActive ? '#FFFFFF' : 'transparent',
                      border: 'none',
                      borderRadius: '7px',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 500);
                if (showToast) showToast('Live QR metrics synchronized!');
              }}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '7px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
              }}
              title="Synchronize live metrics"
            >
              <RotateCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (Single Row Layout with 6 Exact Lifecycle Operations KPIs) */}
      <div className="kpi-single-row">
        {/* Card 1: Total QR Codes */}
        <div
          className="kpi-card"
          onClick={() => goToListingWithStatus('all')}
          style={{ cursor: 'pointer', padding: '14px 13px' }}
          title="Click to inspect all QR codes in QR Management"
        >
          <div className="kpi-header" style={{ marginBottom: '6px' }}>
            <span className="kpi-title" style={{ fontSize: '11px', fontWeight: 700 }}>Total QR Codes</span>
            <div className="kpi-icon" style={{ width: '28px', height: '28px', background: '#F3F4F6', color: '#374151' }}>
              <QrCode size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px' }}>{totalCodes}</div>
          <div className="kpi-trend" style={{ fontSize: '10.5px', color: '#4B5563', fontWeight: 600 }}>
            <span>System Master Records</span>
          </div>
        </div>

        {/* Card 2: Active QR Codes */}
        <div
          className="kpi-card"
          onClick={() => goToListingWithStatus('Active')}
          style={{ cursor: 'pointer', padding: '14px 13px', borderColor: '#BBF7D0' }}
          title="Click to view Active QR codes in circulation"
        >
          <div className="kpi-header" style={{ marginBottom: '6px' }}>
            <span className="kpi-title" style={{ fontSize: '11px', fontWeight: 700, color: '#15803D' }}>Active QR Codes</span>
            <div className="kpi-icon" style={{ width: '28px', height: '28px', background: '#DCFCE7', color: '#15803D' }}>
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px', color: '#15803D' }}>{activeCodes}</div>
          <div className="kpi-trend" style={{ fontSize: '10.5px', color: '#15803D', fontWeight: 600 }}>
            <span>Live & Routing Scans</span>
          </div>
        </div>

        {/* Card 3: Draft QR Codes */}
        <div
          className="kpi-card"
          onClick={() => goToListingWithStatus('Draft')}
          style={{ cursor: 'pointer', padding: '14px 13px' }}
          title="Click to view saved unpublished draft QR codes"
        >
          <div className="kpi-header" style={{ marginBottom: '6px' }}>
            <span className="kpi-title" style={{ fontSize: '11px', fontWeight: 700, color: '#4338CA' }}>Draft QR Codes</span>
            <div className="kpi-icon" style={{ width: '28px', height: '28px', background: '#EEF2FF', color: '#4338CA' }}>
              <Edit3 size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px', color: '#4338CA' }}>{draftCodes}</div>
          <div className="kpi-trend" style={{ fontSize: '10.5px', color: '#4338CA', fontWeight: 600 }}>
            <span>Saved & Unpublished</span>
          </div>
        </div>

        {/* Card 4: Pending Approvals */}
        <div
          className="kpi-card"
          onClick={() => goToListingWithStatus('Pending Approval')}
          style={{ cursor: 'pointer', padding: '14px 13px', borderColor: pendingCodes > 0 ? '#FED7AA' : '#E5E7EB' }}
          title="Click to review QR codes awaiting approval"
        >
          <div className="kpi-header" style={{ marginBottom: '6px' }}>
            <span className="kpi-title" style={{ fontSize: '11px', fontWeight: 700, color: '#C2410C' }}>Pending Approvals</span>
            <div className="kpi-icon" style={{ width: '28px', height: '28px', background: '#FFEDD5', color: '#EA580C' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px', color: '#C2410C' }}>{pendingCodes}</div>
          <div className="kpi-trend" style={{ fontSize: '10.5px', color: '#C2410C', fontWeight: 600 }}>
            <span>Awaiting Review</span>
          </div>
        </div>

        {/* Card 5: Paused QR Codes */}
        <div
          className="kpi-card"
          onClick={() => goToListingWithStatus('Paused')}
          style={{ cursor: 'pointer', padding: '14px 13px' }}
          title="Click to view intentionally paused QR codes"
        >
          <div className="kpi-header" style={{ marginBottom: '6px' }}>
            <span className="kpi-title" style={{ fontSize: '11px', fontWeight: 700, color: '#92400E' }}>Paused QR Codes</span>
            <div className="kpi-icon" style={{ width: '28px', height: '28px', background: '#FEF3C7', color: '#D97706' }}>
              <Pause size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px', color: '#92400E' }}>{pausedCodes}</div>
          <div className="kpi-trend" style={{ fontSize: '10.5px', color: '#92400E', fontWeight: 600 }}>
            <span>Halted Routing Traffic</span>
          </div>
        </div>

        {/* Card 6: Expired QR Codes */}
        <div
          className="kpi-card"
          onClick={() => goToListingWithStatus('Expired')}
          style={{ cursor: 'pointer', padding: '14px 13px' }}
          title="Click to view expired QR codes whose campaign has ended"
        >
          <div className="kpi-header" style={{ marginBottom: '6px' }}>
            <span className="kpi-title" style={{ fontSize: '11px', fontWeight: 700, color: '#B91C1C' }}>Expired QR Codes</span>
            <div className="kpi-icon" style={{ width: '28px', height: '28px', background: '#FEE2E2', color: '#DC2626' }}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px', color: '#B91C1C' }}>{expiredCodes}</div>
          <div className="kpi-trend" style={{ fontSize: '10.5px', color: '#B91C1C', fontWeight: 600 }}>
            <span>Validity Period Ended</span>
          </div>
        </div>
      </div>

      {/* Two-Column Section: Top Performers & Distribution */}
      <div className="grid-2">
        {/* Top-Performing QR Codes */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">
                <QrCode size={17} color="#00891D" />
                Top Performing QR Codes
              </h2>
              <p className="vk-card-subtitle">Ranked by real-time scan volume and audience engagement</p>
            </div>
            <button
              onClick={() => setActiveScreen('listing')}
              className="btn btn-ghost btn-sm"
              style={{ color: '#00891D', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View all {totalCodes}</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topQrCodes.map((qr) => (
              <div
                key={qr.id}
                onClick={() => {
                  setSelectedQrId(qr.id);
                  setDetailsViewMode('detail');
                  setActiveScreen('details');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00891D';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 137, 29, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title={`Click to view full details for ${qr.name} (${qr.id})`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: '#E8F5EA',
                      border: '1px solid #C8E6C9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#00891D',
                      fontSize: '11px',
                      flexShrink: 0,
                    }}
                  >
                    QR
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {qr.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#111827', flexShrink: 0 }}>{qr.id}</span>
                      <span>·</span>
                      <span style={{ color: '#00891D', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        qr.vk.com/{qr.destination?.redirectCode || 'vk-auto'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#111827' }}>
                      {(qr.metrics?.scans || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#00891D', fontWeight: 600 }}>
                      scans tracked
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTestScanModal({ isOpen: true, qrCode: qr });
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Simulate scan on mobile device"
                  >
                    <Smartphone size={13} color="#00891D" />
                    <span>Test</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQrId(qr.id);
                      setDetailsViewMode('detail');
                      setActiveScreen('details');
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px', color: '#00891D' }}
                    title={`View full details for ${qr.name}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Breakdown by QR Category (Computed Dynamically) */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">
                <BarChart3 size={17} color="#00891D" />
                Scan Share by QR Category
              </h2>
              <p className="vk-card-subtitle">Distribution of scans across campaigns, app downloads & fleet</p>
            </div>
            <span className="badge badge-active">{typeMetrics.length} Categories</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            {typeMetrics.map((item) => (
              <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '2px',
                        background: item.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontWeight: 600, color: '#111827' }}>{item.label}</span>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>({item.count} QRs)</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>
                    {item.scans.toLocaleString()} scans <span style={{ color: '#6B7280', fontWeight: 500 }}>({item.pct}%)</span>
                  </div>
                </div>

                <div style={{ height: '7px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.pct}%`,
                      height: '100%',
                      background: item.color,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Row 5: Recent Operations & Governance Log */}
      <div>
        {/* Recent Operations & Audit Trail */}
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">
                <Clock size={17} color="#00891D" />
                Recent Operations & Governance Log
              </h2>
              <p className="vk-card-subtitle">Audit log of approvals, publications and exports</p>
            </div>
            <span className="badge badge-outline">Live Audit</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {auditLogs.slice(0, 4).map((log) => {
              const isReject = log.action?.includes('Reject') || log.outcome?.includes('block');
              const isPublish = log.action?.includes('Publish') || log.action?.includes('Approved');
              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isReject ? '#DC2626' : isPublish ? '#00891D' : '#0284C7',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.action}: <span style={{ color: '#00891D', fontWeight: 600 }}>{log.reference}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        {log.versionDiff?.replace(/Changes Requested/g, 'Rejected')}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '11.5px', color: '#374151' }}>
                      {log.user}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#9CA3AF' }}>
                      {log.timestamp?.substring(0, 10)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Dashboard as Screen01_Dashboard };
export default Dashboard;
