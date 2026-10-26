import React, { useState, useMemo } from 'react';
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
  MapPin,
  HelpCircle,
} from 'lucide-react';

export const Dashboard = () => {
  const {
    qrCodes,
    scanEvents,
    approvals,
    auditLogs,
    setActiveScreen,
    setSelectedQrId,
    openCreateQRModal,
    setWizardData,
    setWizardStep,
    setTestScanModal,
    currentRole,
    showToast,
  } = useQR();

  const [dateRange, setDateRange] = useState('30d');
  const [selectedHub, setSelectedHub] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-24');
  const [showScopeFilters, setShowScopeFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pendingApprovalsCount = approvals.filter((a) => {
    if (a.status !== 'Pending') return false;
    const matchingQr = qrCodes?.find((q) => q.id === a.qrId);
    if (matchingQr && matchingQr.status === 'Draft') return false;
    return true;
  }).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Filter QR codes by scope filters (Organization, Hub, Village, Campaign, Owner)
  const filteredQRs = useMemo(() => {
    return qrCodes.filter((q) => {
      if (selectedHub !== 'all' && q.hubId && q.hubId !== selectedHub) return false;
      if (selectedVillage !== 'all' && q.village && !q.village.includes(selectedVillage)) return false;
      if (selectedCampaign !== 'all' && q.campaign && !q.campaign.includes(selectedCampaign)) return false;
      if (selectedOwner !== 'all' && q.owner && !q.owner.includes(selectedOwner)) return false;
      return true;
    });
  }, [qrCodes, selectedHub, selectedVillage, selectedCampaign, selectedOwner]);

  // Compute live metrics from filteredQRs
  const totalCodes = filteredQRs.length;
  const activeCodes = filteredQRs.filter((q) => q.status === 'Active').length;
  const pendingCodes = filteredQRs.filter((q) => q.status === 'Pending Approval').length;
  const expiredCodes = filteredQRs.filter((q) => q.status === 'Expired').length;

  const totalScans = filteredQRs.reduce((acc, q) => acc + (q.metrics?.scans || 0), 0);
  const totalRegistrations = filteredQRs.reduce((acc, q) => acc + (q.metrics?.verifiedRegistrations || 0), 0);
  const totalFirstOrders = filteredQRs.reduce((acc, q) => acc + (q.metrics?.firstOrders || 0), 0);

  // Top performing QR codes
  const topQrCodes = [...filteredQRs]
    .sort((a, b) => (b.metrics?.scans || 0) - (a.metrics?.scans || 0))
    .slice(0, 4);

  // Quick Action Handler to launch Create QR modal with preset
  const handleQuickCreate = (type, cta, title, template) => {
    openCreateQRModal({
      type,
      name: `${type} QR - ${new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`,
      ctaText: cta,
      campaignTitle: title,
      template: template || 'VillagKart Branded',
      fgColor: '#00891D',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Welcome & Filter Control Bar (Clean ERP Card) */}
      <div className="vk-card" style={{ padding: '22px 26px', background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFCFA 100%)', borderTop: '3px solid #00891D' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          {/* Left Context: Live Status, Title, Subtitle */}
          <div style={{ flex: '1 1 480px', minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <div style={{
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
                border: '1px solid #C8E6C9'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#00891D',
                  boxShadow: '0 0 0 2px rgba(0, 137, 29, 0.25)',
                  display: 'inline-block'
                }} />
                VillagKart QR Studio · Production Live
              </div>
              <span style={{ fontSize: '12px', color: '#D1D5DB' }}>|</span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#4B5563' }}>
                Enterprise Operations Overview
              </span>
            </div>

            <h2 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#111827',
              margin: '0 0 6px 0',
              letterSpacing: '-0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{getGreeting()}, {currentRole === 'Admin' ? 'Operations Lead' : currentRole}</span>
              <span style={{ fontSize: '20px' }}>👋</span>
            </h2>

            <p style={{
              color: '#4B5563',
              fontSize: '13.5px',
              margin: 0,
              maxWidth: '680px',
              lineHeight: 1.5
            }}>
              Manage QR codes, campaigns and customer acquisition across rural collection hubs, Shop-on-Wheels vehicles and field executives.
            </p>
          </div>

          {/* Right Controls: Modern Segmented Timeframe & Hub Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Segmented Timeframe Pill Switcher */}
            <div style={{
              display: 'inline-flex',
              background: '#F3F4F6',
              padding: '3px',
              borderRadius: '9px',
              border: '1px solid #E5E7EB',
              gap: '2px'
            }}>
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'custom', label: 'Custom' },
              ].map((item) => {
                const isActive = dateRange === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDateRange(item.id);
                      if (showToast) showToast(`Date filter set to: ${item.label}`);
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

            {/* Scope Filter Toggle Button */}
            <button
              onClick={() => setShowScopeFilters(!showScopeFilters)}
              className={`btn btn-sm ${showScopeFilters ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Scope Filters: Organization, Hub, Village, Campaign, Owner"
            >
              <Filter size={14} />
              <span>Scope Filters</span>
              {(selectedOrg !== 'all' || selectedHub !== 'all' || selectedVillage !== 'all' || selectedCampaign !== 'all' || selectedOwner !== 'all') && (
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: showScopeFilters ? '#FFFFFF' : '#00891D' }} />
              )}
            </button>

            {/* Live Sync / Refresh Action Button */}
            <button
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 600);
                if (showToast) showToast('Dashboard metrics refreshed in real-time!');
              }}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '7px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px'
              }}
              title="Refresh live metrics"
            >
              <RotateCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {dateRange === 'custom' && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            fontSize: '12.5px'
          }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>Custom Date Scope:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ color: '#6B7280' }}>From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="form-control"
                style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ color: '#6B7280' }}>To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="form-control"
                style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
              />
            </div>
            <button
              onClick={() => {
                if (showToast) showToast(`Custom scope applied: ${customStartDate} to ${customEndDate}`);
              }}
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 10px', fontSize: '11.5px' }}
            >
              Apply Range
            </button>
          </div>
        )}

        {/* Scope Filters (Organization, Hub, Village, Campaign, Owner) */}
        {showScopeFilters && (
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            background: '#F9FAFB',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            {/* Organization */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Organization
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="form-control"
                style={{ fontSize: '12.5px', padding: '6px 8px' }}
              >
                <option value="all">All Organizations (VillagKart)</option>
                <option value="retail">VillagKart Retail Pvt Ltd</option>
                <option value="supply">VillagKart Agro Supply Chain</option>
              </select>
            </div>

            {/* Hub / Territory */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Hub / Territory
              </label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="form-control"
                style={{ fontSize: '12.5px', padding: '6px 8px' }}
              >
                <option value="all">Select All</option>
                <option value="HUB-01">Phirangipuram Hub</option>
                <option value="HUB-02">Guntur Central Hub</option>
                <option value="HUB-03">Tenali Rural Hub</option>
                <option value="HUB-04">Narasaraopet Hub</option>
                <option value="HUB-05">Bapatla Coastal Hub</option>
              </select>
            </div>

            {/* Village */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Village
              </label>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="form-control"
                style={{ fontSize: '12.5px', padding: '6px 8px' }}
              >
                <option value="all">Select All</option>
                <option value="Phirangipuram">Phirangipuram Village</option>
                <option value="Prattipadu">Prattipadu Village</option>
                <option value="Siripuram">Siripuram Village</option>
                <option value="Tenali">Tenali Rural</option>
                <option value="Bapatla">Bapatla Coastal</option>
              </select>
            </div>

            {/* Campaign */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Campaign
              </label>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="form-control"
                style={{ fontSize: '12.5px', padding: '6px 8px' }}
              >
                <option value="all">Select All</option>
                <option value="Village Launch">Village Launch Festival</option>
                <option value="Mobile App">VillagKart Mobile App</option>
                <option value="Tenali">Tenali Festival Agro Promo</option>
                <option value="Shop-on-Wheels">Shop-on-Wheels Daily</option>
              </select>
            </div>

            {/* Owner */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Owner / Executive
              </label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="form-control"
                style={{ fontSize: '12.5px', padding: '6px 8px' }}
              >
                <option value="all">All Owners</option>
                <option value="Marketing Team">Marketing Team</option>
                <option value="Logistics Fleet Lead">Logistics Fleet Lead</option>
                <option value="Kiran Kumar">Kiran Kumar (VGE)</option>
                <option value="Ramesh Naidu">Ramesh Naidu (Hub Mgr)</option>
              </select>
            </div>
          </div>
        )}
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
            <span className="kpi-title">Total Scans ({dateRange === 'today' ? 'Today' : dateRange === '7d' ? '7 Days' : dateRange === '30d' ? '30 Days' : 'Custom Scope'})</span>
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
        <div className="kpi-card" title="Verified customer accounts registered within the 30-day attribution window after scanning this QR code">
          <div className="kpi-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="kpi-title">Attributed Registrations</span>
              <HelpCircle size={13} color="#9CA3AF" />
            </div>
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
        <div className="kpi-card" title="First-time rural grocery and fresh produce purchase orders completed by customers who scanned this QR code">
          <div className="kpi-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="kpi-title">Attributed First Orders</span>
              <HelpCircle size={13} color="#9CA3AF" />
            </div>
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

      {/* Operational Health & Alert Status (Pending Approvals, Expired Codes, Destination Failures) - Positioned after KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
      }}>
        {/* Pending Approvals */}
        <div
          onClick={() => setActiveScreen('permissions')}
          style={{
            padding: '14px 18px',
            background: pendingApprovalsCount > 0 ? '#FFFBEB' : '#FFFFFF',
            border: pendingApprovalsCount > 0 ? '1px solid #FCD34D' : '1px solid #E5E7EB',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Pending Approvals</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                {pendingApprovalsCount} QR code{pendingApprovalsCount === 1 ? '' : 's'} awaiting review
              </div>
            </div>
          </div>
          <span className="badge badge-pending">Review</span>
        </div>

        {/* Expired Codes */}
        <div
          onClick={() => setActiveScreen('listing')}
          style={{
            padding: '14px 18px',
            background: expiredCodes > 0 ? '#FEF2F2' : '#FFFFFF',
            border: expiredCodes > 0 ? '1px solid #FECACA' : '1px solid #E5E7EB',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Expired QR Codes</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                {expiredCodes} inactive asset{expiredCodes === 1 ? '' : 's'} past validity
              </div>
            </div>
          </div>
          <span className="badge badge-outline">Manage</span>
        </div>

        {/* Destination Failures */}
        <div
          style={{
            padding: '14px 18px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Destination Health</div>
              <div style={{ fontSize: '12px', color: '#15803D', fontWeight: 600 }}>
                0 Broken Endpoints · 100% Reachable
              </div>
            </div>
          </div>
          <span className="badge badge-active">Live Healthy</span>
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
