import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import {
  Users,
  Award,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Eye,
  Download,
  Pause,
  Play,
  BarChart2,
  X,
  Search,
} from 'lucide-react';

export const Referrals = () => {
  const { qrCodes, setQrCodes, setSelectedQrId, setActiveScreen, setTestScanModal, showToast } = useQR();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerfQr, setSelectedPerfQr] = useState(null);

  const referralQrs = qrCodes.filter((q) => q.type === 'Referral');

  const filteredReferrals = referralQrs.filter((ref) => {
    return (
      (ref.referralCode && ref.referralCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ref.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ref.hubName && ref.hubName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const totalReferralScans = referralQrs.reduce((a, b) => a + (b.metrics?.scans || 0), 0);
  const totalReferralRegs = referralQrs.reduce((a, b) => a + (b.metrics?.verifiedRegistrations || 0), 0);
  const totalReferralOrders = referralQrs.reduce((a, b) => a + (b.metrics?.firstOrders || 0), 0);
  const totalRewardsDisbursed = referralQrs.reduce((a, b) => a + (b.metrics?.earnedRewards || (b.metrics?.firstOrders || 0) * 50), 0);

  // Row Actions Handlers
  const handleViewQR = (ref) => {
    setTestScanModal({ isOpen: true, qrCode: ref });
  };

  const handleDownload = (ref) => {
    showToast(`Downloading QR package for referral partner ${ref.owner}...`);
  };

  const handleToggleActivatePause = (refId) => {
    setQrCodes((prev) =>
      prev.map((q) =>
        q.id === refId ? { ...q, status: q.status === 'Active' ? 'Paused' : 'Active' } : q
      )
    );
    showToast('Toggled referral QR activation status.');
  };

  const handleViewPerformance = (ref) => {
    setSelectedPerfQr(ref);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Referral Flow Rule Banner */}
      <div className="vk-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Referral QR Management</h2>
            <p className="vk-card-subtitle">
              Manage referral QR codes assigned to Village Gramin Executives (VGEs) and customers with anti-abuse journey tracking
            </p>
          </div>
          <span className="badge badge-active">Anti-Self Referral Active</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Active Referral Partners</span>
            <div className="kpi-icon"><Users size={18} /></div>
          </div>
          <div className="kpi-value">{referralQrs.length} VGEs</div>
          <div className="kpi-trend trend-up">
            <span>Verified field executives</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Referral Scans</span>
            <div className="kpi-icon"><Smartphone size={18} /></div>
          </div>
          <div className="kpi-value">{totalReferralScans.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span>Customer assisted scans</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Verified App Registrations</span>
            <div className="kpi-icon"><CheckCircle2 size={18} /></div>
          </div>
          <div className="kpi-value">{totalReferralRegs.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span>{((totalReferralRegs / (totalReferralScans || 1)) * 100).toFixed(1)}% Conversion</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Eligible Rewards Disbursed</span>
            <div className="kpi-icon"><Award size={18} /></div>
          </div>
          <div className="kpi-value">₹{totalRewardsDisbursed.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <span>{totalReferralOrders} Completed first orders</span>
          </div>
        </div>
      </div>

      {/* Referral Records Table */}
      <div className="vk-card">
        <div className="vk-card-header">
          <div>
            <h3 className="vk-card-title">Referral Partner Performance Table</h3>
            <p className="vk-card-subtitle">
              Field executive tracking, activation status, conversion funnel and commission audit
            </p>
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search referral code or partner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '32px', fontSize: '12.5px', padding: '6px 10px 6px 32px' }}
            />
          </div>
        </div>

        <div className="vk-table-container">
          <table className="vk-table">
            <thead>
              <tr>
                <th>Referral Code & QR ID</th>
                <th>Referral Owner & Role</th>
                <th>Assigned Hub & Territory</th>
                <th>Activation Status</th>
                <th>Scans</th>
                <th>Verified Reg.</th>
                <th>First Orders</th>
                <th>Eligible Rewards & Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReferrals.map((ref) => (
                <tr key={ref.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#00891D', fontFamily: 'monospace' }}>
                      {ref.referralCode || 'VGE-REF-902'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{ref.id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{ref.owner}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{ref.referralRole || 'Village Gramin Executive (VGE)'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ref.hubName}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{ref.village}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${ref.status === 'Active' ? 'active' : 'paused'}`}>
                      {ref.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{(ref.metrics?.scans || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: '#00891D' }}>
                    {(ref.metrics?.verifiedRegistrations || 0).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 700, color: '#00A322' }}>
                    {(ref.metrics?.firstOrders || 0).toLocaleString()}
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#111827' }}>
                      ₹{(ref.metrics?.earnedRewards || (ref.metrics?.firstOrders || 0) * 50).toLocaleString()}
                    </span>
                    <div style={{ fontSize: '10.5px', color: '#00891D', fontWeight: 600 }}>Disbursed (₹50/order)</div>
                  </td>

                  {/* Actions: View QR, Download, Activate/Pause, View Performance */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      {/* View QR */}
                      <button
                        onClick={() => handleViewQR(ref)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="View QR in Simulator"
                      >
                        <Eye size={12} color="#00891D" />
                        View QR
                      </button>

                      {/* Download */}
                      <button
                        onClick={() => handleDownload(ref)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="Download Referral QR Asset"
                      >
                        <Download size={12} />
                        Download
                      </button>

                      {/* Activate / Pause */}
                      <button
                        onClick={() => handleToggleActivatePause(ref.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        title={ref.status === 'Active' ? 'Pause Referral QR' : 'Activate Referral QR'}
                      >
                        {ref.status === 'Active' ? <Pause size={12} color="#D97706" /> : <Play size={12} color="#00891D" />}
                        {ref.status === 'Active' ? 'Pause' : 'Activate'}
                      </button>

                      {/* View Performance */}
                      <button
                        onClick={() => handleViewPerformance(ref)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        title="View Performance Analytics"
                      >
                        <BarChart2 size={12} color="#00891D" />
                        Performance
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Drawer Modal */}
      {selectedPerfQr && (
        <div className="drawer-overlay" onClick={() => setSelectedPerfQr(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="#00891D" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  Referral Journey · {selectedPerfQr.referralCode}
                </h3>
              </div>
              <button onClick={() => setSelectedPerfQr(null)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Assigned Partner</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{selectedPerfQr.owner}</div>
                <div style={{ fontSize: '12px', color: '#00891D', fontWeight: 600 }}>{selectedPerfQr.hubName} · {selectedPerfQr.village}</div>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>Journey Milestones</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid #E5E7EB' }}>
                    <span>Total Telemetry Scans</span>
                    <strong>{(selectedPerfQr.metrics?.scans || 0).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid #E5E7EB' }}>
                    <span>Verified Customer Registrations</span>
                    <strong style={{ color: '#00891D' }}>{(selectedPerfQr.metrics?.verifiedRegistrations || 0).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid #E5E7EB' }}>
                    <span>Completed First Orders</span>
                    <strong style={{ color: '#00A322' }}>{(selectedPerfQr.metrics?.firstOrders || 0).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid #E5E7EB' }}>
                    <span>Earned Commission Disbursed</span>
                    <strong style={{ color: '#111827' }}>₹{(selectedPerfQr.metrics?.earnedRewards || (selectedPerfQr.metrics?.firstOrders || 0) * 50).toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setSelectedQrId(selectedPerfQr.id);
                  setActiveScreen('details');
                  setSelectedPerfQr(null);
                }}
                className="btn btn-primary btn-sm"
              >
                Open Full QR Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Referrals as Screen13_Referrals };
export default Referrals;
