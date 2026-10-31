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
  Pause,
  Edit3,
  Layers,
  MapPin,
  Building2,
  BarChart3,
  ShieldCheck,
  Tag,
  Truck,
  Users,
  Globe,
  ArrowUpRight,
  Server,
  TrendingUp,
  XCircle,
} from 'lucide-react';

const DonutVisualizer = ({ data, total, centerNumber, centerLabel, size = 104 }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedShare = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth="11"
        />
        {total > 0 && data && data.map((item, idx) => {
          if (!item.share || item.share <= 0) return null;
          const strokeDash = (item.share / 100) * circumference;
          const strokeGap = circumference - strokeDash;
          const strokeOffset = -((accumulatedShare / 100) * circumference);
          accumulatedShare += item.share;

          return (
            <circle
              key={idx}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="11"
              strokeDasharray={`${strokeDash} ${strokeGap}`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 0.4s ease, stroke-dashoffset 0.4s ease' }}
            />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
          {centerNumber}
        </span>
        <span style={{ fontSize: '9px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '3px' }}>
          {centerLabel}
        </span>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const {
    qrCodes,
    hubs,
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
  const [lineTimeFilter, setLineTimeFilter] = useState('7d');
  const [lineStatusFilter, setLineStatusFilter] = useState('all');

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

  // Compute live inventory metrics from actual qrCodes state (Active, Draft, Pending Approval, Paused, Rejected, Expired)
  const { totalCodes, activeCodes, draftCodes, pendingCodes, pausedCodes, rejectedCodes, expiredCodes } = useMemo(() => {
    const nowTime = referenceTime.nowTime;
    let total = qrCodes.length;
    let active = 0;
    let draft = 0;
    let pending = 0;
    let paused = 0;
    let rejected = 0;
    let expired = 0;

    for (const q of qrCodes) {
      if (q.status === 'Active' || q.status === 'Accepted' || q.status === 'Approved') active++;
      else if (q.status === 'Draft') draft++;
      else if (q.status === 'Pending Approval' || q.status === 'Pending' || q.status === 'Under Review') pending++;
      else if (q.status === 'Paused') paused++;
      else if (q.status === 'Rejected') rejected++;
      else if (q.status === 'Expired' || (q.expiryDate && q.expiryDate !== 'Never Ending' && new Date(q.expiryDate).getTime() < nowTime)) expired++;
      else active++;
    }

    return {
      totalCodes: total,
      activeCodes: active,
      draftCodes: draft,
      pendingCodes: pending,
      pausedCodes: paused,
      rejectedCodes: rejected,
      expiredCodes: expired,
    };
  }, [qrCodes, referenceTime.nowTime]);

  // 1. QR Generation Timeline & Line Graph Metrics (Filterable by Time Horizon & Lifecycle Status)
  const generationMetrics = useMemo(() => {
    let days = 7;
    if (lineTimeFilter === '14d') days = 14;
    else if (lineTimeFilter === '30d') days = 30;
    else if (lineTimeFilter === '90d') days = 90;

    const result = [];
    const now = new Date();

    // Target filtered QRs based on status filter
    const targetQRs = qrCodes.filter((q) => {
      if (lineStatusFilter === 'all') return true;
      if (lineStatusFilter === 'Active') return q.status === 'Active' || q.status === 'Accepted';
      if (lineStatusFilter === 'Pending Approval') return q.status === 'Pending Approval' || q.status === 'Pending';
      return true;
    });

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const shortLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const count = targetQRs.filter((q) => {
        const cDate = (q.createdAt || q.startDate || '').substring(0, 10);
        return cDate === dateStr;
      }).length;

      result.push({
        date: dateStr,
        label: shortLabel,
        count,
      });
    }

    const totalInPeriod = result.reduce((acc, curr) => acc + curr.count, 0);
    const maxDayCount = Math.max(1, ...result.map((r) => r.count));

    return {
      timeline: result,
      totalInPeriod,
      maxDayCount,
      days,
    };
  }, [qrCodes, lineTimeFilter, lineStatusFilter]);

  // 2. Visuals of QR Generated by Category (Poster, Flyer, Vehicle Vinyl Sticker, Product Label, Hub Facade Banner)
  const categoryMetrics = useMemo(() => {
    const total = Math.max(1, qrCodes.length);

    const buckets = {
      'Poster': {
        name: 'Poster',
        description: 'Retail & Market Wall Display Posters',
        count: 0,
        color: '#00891D',
        icon: Layers,
      },
      'Flyer': {
        name: 'Flyer',
        description: 'Direct Handout & Doorstep Pamphlets',
        count: 0,
        color: '#0284C7',
        icon: Smartphone,
      },
      'Vehicle Vinyl Sticker': {
        name: 'Vehicle Vinyl Sticker',
        description: 'Fleet & Logistics Van Vinyls',
        count: 0,
        color: '#7C3AED',
        icon: Truck,
      },
      'Product Label': {
        name: 'Product Label',
        description: 'Agro Crates & Farm Direct Packaging',
        count: 0,
        color: '#EA580C',
        icon: Tag,
      },
      'Hub Facade Banner': {
        name: 'Hub Facade Banner',
        description: 'Collection Center & Warehouse Facades',
        count: 0,
        color: '#D97706',
        icon: Building2,
      },
    };

    qrCodes.forEach((q, idx) => {
      const text = `${q.name || ''} ${q.type || ''} ${q.purpose || ''} ${q.designJson?.purpose || ''} ${q.designJson?.template || ''}`.toLowerCase();

      if (text.includes('vehicle') || text.includes('van') || text.includes('vinyl') || text.includes('fleet') || text.includes('truck')) {
        buckets['Vehicle Vinyl Sticker'].count++;
      } else if (text.includes('product') || text.includes('label') || text.includes('crate') || text.includes('produce') || text.includes('pack')) {
        buckets['Product Label'].count++;
      } else if (text.includes('hub') || text.includes('facade') || text.includes('banner') || text.includes('warehouse') || text.includes('center') || text.includes('onboarding')) {
        buckets['Hub Facade Banner'].count++;
      } else if (text.includes('flyer') || text.includes('pamphlet') || text.includes('doorstep') || text.includes('handout') || text.includes('reatchall')) {
        buckets['Flyer'].count++;
      } else if (text.includes('poster') || text.includes('campaign') || text.includes('retail') || text.includes('wall')) {
        buckets['Poster'].count++;
      } else {
        const catKeys = ['Poster', 'Flyer', 'Vehicle Vinyl Sticker', 'Product Label', 'Hub Facade Banner'];
        const chosen = catKeys[idx % catKeys.length];
        buckets[chosen].count++;
      }
    });

    return Object.values(buckets).map((b) => ({
      ...b,
      share: qrCodes.length > 0 ? Math.round((b.count / total) * 100) : 0,
    }));
  }, [qrCodes]);

  const topCategory = useMemo(() => {
    if (!categoryMetrics || categoryMetrics.length === 0) return { name: 'Poster', share: 0 };
    return [...categoryMetrics].sort((a, b) => b.count - a.count)[0];
  }, [categoryMetrics]);

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
              <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
                Enterprise Operations Portal
              </span>
            </div>

            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#111827',
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              {greeting}, Partner Operations
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#4B5563',
                margin: '6px 0 0 0',
                maxWidth: '650px',
                lineHeight: '1.45',
              }}
            >
              Overview of QR code catalog inventory, operational lifecycle governance, and warehouse hub allocations
            </p>
          </div>

          {/* Right Controls: Refresh Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              title="Synchronize live inventory"
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
            <span>Live Dynamic Routing</span>
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

        {/* Card 6: Rejected QR Codes */}
        <div
          className="kpi-card"
          onClick={() => goToListingWithStatus('Rejected')}
          style={{ cursor: 'pointer', padding: '14px 13px', borderColor: rejectedCodes > 0 ? '#FECDD3' : '#E5E7EB' }}
          title="Click to view QR codes rejected during governance review"
        >
          <div className="kpi-header" style={{ marginBottom: '6px' }}>
            <span className="kpi-title" style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626' }}>Rejected QR Codes</span>
            <div className="kpi-icon" style={{ width: '28px', height: '28px', background: '#FEE2E2', color: '#DC2626' }}>
              <XCircle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px', color: '#DC2626' }}>{rejectedCodes}</div>
          <div className="kpi-trend" style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: 600 }}>
            <span>Awaiting Revision</span>
          </div>
        </div>

        {/* Card 7: Expired QR Codes */}
        <div
          className="kpi-card"
          onClick={() => goToListingWithStatus('Expired')}
          style={{ cursor: 'pointer', padding: '14px 13px' }}
          title="Click to view expired QR codes whose campaign has ended"
        >
          <div className="kpi-header" style={{ marginBottom: '6px' }}>
            <span className="kpi-title" style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280' }}>Expired QR Codes</span>
            <div className="kpi-icon" style={{ width: '28px', height: '28px', background: '#F3F4F6', color: '#6B7280' }}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="kpi-value" style={{ fontSize: '22px', marginBottom: '4px', color: '#6B7280' }}>{expiredCodes}</div>
          <div className="kpi-trend" style={{ fontSize: '10.5px', color: '#6B7280', fontWeight: 600 }}>
            <span>Validity Period Ended</span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: 1. Visuals of QR Generated + 2. Visuals of QR Generated Category */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* 1. Visuals of QR Generated (Line Graph with Interactive Filters) */}
        <div className="vk-card" style={{ padding: '20px' }}>
          <div className="vk-card-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 className="vk-card-title">
                <TrendingUp size={17} color="#00891D" />
                QR Codes Generated & Production Velocity
              </h2>
              <p className="vk-card-subtitle">
                Interactive line chart tracking generation volume across timelines and operational status
              </p>
            </div>

            {/* Interactive Filters: Time Horizon & Lifecycle Scope */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Time Horizon Filter Pills */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#F3F4F6',
                  padding: '2px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {[
                  { id: '7d', label: '7D' },
                  { id: '14d', label: '14D' },
                  { id: '30d', label: '30D' },
                  { id: '90d', label: '90D' },
                ].map((tf) => {
                  const isActive = lineTimeFilter === tf.id;
                  return (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setLineTimeFilter(tf.id)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#00891D' : '#4B5563',
                        background: isActive ? '#FFFFFF' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>

              {/* Status Scope Filter */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#F3F4F6',
                  padding: '2px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {[
                  { id: 'all', label: 'All QRs' },
                  { id: 'Active', label: 'Active' },
                ].map((sf) => {
                  const isActive = lineStatusFilter === sf.id;
                  return (
                    <button
                      key={sf.id}
                      type="button"
                      onClick={() => setLineStatusFilter(sf.id)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#00891D' : '#4B5563',
                        background: isActive ? '#FFFFFF' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {sf.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Micro KPI strip for filtered view */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #DCFCE7',
              borderRadius: '8px',
              padding: '7px 10px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>In Window ({lineTimeFilter.toUpperCase()})</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#166534', lineHeight: 1.2 }}>{generationMetrics.totalInPeriod} QRs</div>
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '7px 10px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>Peak Day</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0369A1', lineHeight: 1.2 }}>{generationMetrics.maxDayCount} QRs/day</div>
            </div>

            <div style={{
              background: '#FAF5FF',
              border: '1px solid #F3E8FF',
              borderRadius: '8px',
              padding: '7px 10px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>Filter State</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#6D28D9', lineHeight: 1.2 }}>{lineStatusFilter === 'all' ? 'All Codes' : 'Active Only'}</div>
            </div>
          </div>

          {/* SVG Line Graph Visualizer */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '16px 14px 10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '3px', background: '#00891D', borderRadius: '2px', display: 'inline-block' }} />
                <span>QR Creation Line ({lineTimeFilter.toUpperCase()})</span>
              </span>
              <span style={{ color: '#00891D', fontWeight: 700 }}>Total: {generationMetrics.totalInPeriod} Created</span>
            </div>

            {/* Custom SVG Responsive Line Graph */}
            <div style={{ height: '145px', width: '100%', position: 'relative' }}>
              {(() => {
                const total = generationMetrics.timeline.length;
                const paddingLeft = 32;
                const paddingRight = 18;
                const usableWidth = 320 - paddingLeft - paddingRight;
                const baseline = 86;
                const peakHeight = 62;
                const maxVal = Math.max(1, generationMetrics.maxDayCount);

                const points = generationMetrics.timeline.map((item, idx) => {
                  const x = paddingLeft + (idx / Math.max(1, total - 1)) * usableWidth;
                  const y = item.count > 0 ? baseline - (item.count / maxVal) * peakHeight : baseline;
                  return { x, y, count: item.count, label: item.label };
                });

                // Standard Multi-Segment Polyline path
                const lineD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const lastPoint = points[points.length - 1];
                const firstPoint = points[0];
                const areaD = `${lineD} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`;

                // Calculate sample step for X-axis labels to prevent clutter
                const labelStep = total <= 7 ? 1 : total <= 14 ? 2 : total <= 30 ? 5 : 15;

                return (
                  <svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="qrLineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00891D" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00891D" stopOpacity="0.00" />
                      </linearGradient>
                      <filter id="qrLineShadow" x="-10%" y="-20%" width="120%" height="150%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00891D" floodOpacity="0.2" />
                      </filter>
                    </defs>

                    {/* Y-Axis Value Labels & Horizontal Gridlines */}
                    <text x="24" y="27" textAnchor="end" fill="#94A3B8" fontSize="8" fontWeight="600">{maxVal}</text>
                    <line x1={paddingLeft} y1="24" x2="310" y2="24" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

                    <text x="24" y="58" textAnchor="end" fill="#94A3B8" fontSize="8" fontWeight="600">{Math.round(maxVal / 2)}</text>
                    <line x1={paddingLeft} y1="55" x2="310" y2="55" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

                    <text x="24" y="89" textAnchor="end" fill="#94A3B8" fontSize="8" fontWeight="600">0</text>
                    <line x1={paddingLeft} y1={baseline} x2="310" y2={baseline} stroke="#E2E8F0" strokeWidth="1" />

                    {/* Area fill under line */}
                    <path d={areaD} fill="url(#qrLineAreaGrad)" />

                    {/* Primary Line Path */}
                    <path
                      d={lineD}
                      fill="none"
                      stroke="#00891D"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#qrLineShadow)"
                    />

                    {/* Data Points on vertices */}
                    {points.map((pt, idx) => {
                      const showLabel = idx % labelStep === 0 || idx === total - 1;
                      return (
                        <g key={`point-${idx}`}>
                          {/* Vertical guide ray */}
                          {pt.count > 0 && (
                            <line
                              x1={pt.x}
                              y1={pt.y}
                              x2={pt.x}
                              y2={baseline}
                              stroke="rgba(0, 137, 29, 0.25)"
                              strokeWidth="1"
                              strokeDasharray="2 2"
                            />
                          )}

                          {/* Data vertex point */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={pt.count > 0 ? "4" : "2.5"}
                            fill="#FFFFFF"
                            stroke={pt.count > 0 ? "#00891D" : "#CBD5E1"}
                            strokeWidth={pt.count > 0 ? "2.2" : "1.2"}
                          />

                          {/* Count badge on active points */}
                          {pt.count > 0 && (
                            <g transform={`translate(${pt.x}, ${pt.y - 12})`}>
                              <rect
                                x="-12"
                                y="-9"
                                width="24"
                                height="13"
                                rx="6.5"
                                fill="#00891D"
                              />
                              <text
                                x="0"
                                y="0"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#FFFFFF"
                                fontSize="8"
                                fontWeight="800"
                              >
                                {pt.count}
                              </text>
                            </g>
                          )}

                          {/* X-axis date label */}
                          {showLabel && (
                            <text
                              x={pt.x}
                              y="106"
                              textAnchor="middle"
                              fill="#6B7280"
                              fontSize="8.5"
                              fontWeight="600"
                            >
                              {pt.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </div>

          <div
            style={{
              marginTop: '14px',
              paddingTop: '10px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: '#6B7280',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span>Time Horizon: <strong style={{ color: '#111827' }}>Last {generationMetrics.days} Days Filtered</strong></span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00891D', display: 'inline-block' }} />
              Status: <strong style={{ color: '#00891D' }}>{lineStatusFilter === 'all' ? 'All Records' : 'Active Only'}</strong>
            </span>
          </div>
        </div>

        {/* 2. Visuals of QR Generated Category (Poster, Flyer, Vehicle Vinyl Sticker, Product Label, Hub Facade Banner) */}
        <div className="vk-card" style={{ padding: '20px' }}>
          <div className="vk-card-header" style={{ marginBottom: '14px' }}>
            <div>
              <h2 className="vk-card-title">
                <Layers size={17} color="#00891D" />
                QR Catalog by Category & Format
              </h2>
              <p className="vk-card-subtitle">
                Physical deployment across posters, flyers, vehicle vinyls, packaging & facades
              </p>
            </div>
            <span
              className="badge"
              style={{
                background: '#EEF2FF',
                color: '#4338CA',
                border: '1px solid #C7D2FE',
                fontSize: '11px',
                padding: '3px 8px',
                fontWeight: 700,
              }}
            >
              5 Formats Active
            </span>
          </div>

          {/* Visual: Horizontal Segmented Proportion Ribbon */}
          {totalCodes > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                height: '8px',
                borderRadius: '6px',
                display: 'flex',
                overflow: 'hidden',
                background: '#F3F4F6',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
              }}>
                {categoryMetrics.map((cat, idx) => (
                  cat.share > 0 ? (
                    <div
                      key={idx}
                      style={{
                        width: `${cat.share}%`,
                        height: '100%',
                        background: cat.color,
                        transition: 'width 0.4s ease',
                      }}
                      title={`${cat.name}: ${cat.count} QR codes (${cat.share}%)`}
                    />
                  ) : null
                ))}
              </div>
            </div>
          )}

          {/* Visual: 2-Column Layout (Donut Visualizer + 5 Category Format Cards) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            {/* Left: SVG Donut Visualizer */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              background: '#FAFCFA',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              minWidth: '120px',
              flexShrink: 0,
            }}>
              <DonutVisualizer
                data={categoryMetrics}
                total={totalCodes}
                centerNumber={totalCodes}
                centerLabel="Formats"
                size={100}
              />
              <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: '#374151', textAlign: 'center' }}>
                5 Categories
              </div>
            </div>

            {/* Right: Category List with Visual Cards (Poster, Flyer, Vehicle Vinyl Sticker, Product Label, Hub Facade Banner) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 230px', minWidth: '200px' }}>
              {categoryMetrics.map((cat, idx) => {
                const IconComp = cat.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: '#1F2937', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: cat.color,
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        <IconComp size={13} color={cat.color} />
                        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cat.name}>
                          {cat.name}
                        </span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: '#111827', fontSize: '12px' }}>
                          {cat.count} QR{cat.count === 1 ? '' : 's'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: cat.color,
                            background: `${cat.color}15`,
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {cat.share}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar inside card */}
                    <div style={{ height: '4px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${cat.share}%`,
                          height: '100%',
                          background: cat.color,
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: '#6B7280',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span>Primary Focus: <strong style={{ color: '#111827' }}>{topCategory.name} ({topCategory.share}%)</strong></span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00891D', display: 'inline-block' }} />
              Governance: <strong style={{ color: '#00891D' }}>Active Catalog Managed</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Recent Operations & Governance Log (Directly below the 2 visual cards) */}
      <div className="vk-card" style={{ padding: '20px' }}>
        <div className="vk-card-header" style={{ marginBottom: '14px' }}>
          <div>
            <h2 className="vk-card-title">
              <Clock size={17} color="#00891D" />
              Recent Operations & Governance Log
            </h2>
            <p className="vk-card-subtitle">Audit log of approvals, publications, state transitions, and exports</p>
          </div>
          <button
            onClick={() => setActiveScreen('scan-history')}
            className="btn btn-ghost btn-sm"
            style={{ color: '#00891D', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>View All in Audit History</span>
            <ChevronRight size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {auditLogs && auditLogs.length > 0 ? (
            auditLogs.slice(0, 6).map((log) => {
              const isReject = log.action?.includes('Reject') || log.outcome?.includes('block');
              const isPublish = log.action?.includes('Publish') || log.action?.includes('Approved') || log.action?.includes('Accepted');
              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
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
                      <div style={{ fontSize: '11px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.versionDiff?.replace(/Changes Requested/g, 'Rejected') || log.decision || 'Operation executed'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B7280' }}>
                      {log.timestamp?.substring(0, 10)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: '#6B7280', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
              No recent operations recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { Dashboard as Screen01_Dashboard };
export default Dashboard;
