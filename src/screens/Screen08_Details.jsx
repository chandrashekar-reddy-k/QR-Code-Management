import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import {
  ArrowLeft,
  Smartphone,
  Download,
  Pause,
  Play,
  Archive,
  Copy,
  ExternalLink,
  Layers,
  History,
  BarChart2,
  FileText,
  ShieldCheck,
  Check,
  Edit3,
  Calendar,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

export const Screen08_Details = () => {
  const {
    selectedQrId,
    setSelectedQrId,
    setActiveScreen,
    qrCodes,
    togglePauseQR,
    archiveQR,
    scanEvents,
    auditLogs,
    addAuditLog,
    setTestScanModal,
    showToast,
  } = useQR();

  const [activeTab, setActiveTab] = useState('overview'); // overview, destinations, assets, history, analytics, audit
  const [copiedLink, setCopiedLink] = useState(false);

  // Destination Version Editing state
  const [editingDest, setEditingDest] = useState(false);
  const [newFallbackUrl, setNewFallbackUrl] = useState('');

  const qr = qrCodes.find((q) => q.id === selectedQrId) || qrCodes[0];
  if (!qr) return <div>QR code not found.</div>;

  const dest = qr.destination || {};
  const metrics = qr.metrics || { scans: 0, uniqueVisitors: 0, verifiedRegistrations: 0, firstOrders: 0 };
  const qrEvents = scanEvents.filter((e) => e.qrId === qr.id);
  const qrAudit = auditLogs.filter((l) => l.reference.includes(qr.id));

  const copyUrl = () => {
    navigator.clipboard.writeText(`https://qr.villagkart.com/${dest.redirectCode || qr.id}`);
    setCopiedLink(true);
    showToast('Redirect shortlink copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSaveDestinationVersion = () => {
    const currentVersionNum = parseFloat(qr.version?.replace('v', '') || '1.0');
    const newVersion = `v${(currentVersionNum + 0.1).toFixed(1)}`;

    addAuditLog(
      'Destination Modified (New Version)',
      `${qr.id} (${qr.name})`,
      `${qr.version} -> ${newVersion}: Fallback updated to ${newFallbackUrl || dest.fallbackUrl}`
    );

    showToast(`Published configuration version ${newVersion} with audited rollback protection.`);
    setEditingDest(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Back & QR Selector Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setActiveScreen('listing')}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={15} />
            Back to QR Inventory
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Select QR:</label>
            <select
              value={qr.id}
              onChange={(e) => setSelectedQrId(e.target.value)}
              className="form-control"
              style={{ width: '220px', padding: '6px 10px', fontSize: '12.5px' }}
            >
              {qrCodes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id} · {q.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setSelectedQrId(qr.id);
              setActiveScreen('design-studio');
            }}
            className="btn btn-secondary btn-sm"
          >
            <Edit3 size={14} color="#00891D" />
            Customize in Design Studio
          </button>
          <button
            onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
            className="btn btn-secondary btn-sm"
          >
            <Smartphone size={14} color="#00891D" />
            Test Scan Simulator
          </button>
          <button
            onClick={copyUrl}
            className="btn btn-secondary btn-sm"
          >
            {copiedLink ? <Check size={14} color="#00891D" /> : <Copy size={14} />}
            {copiedLink ? 'Copied' : 'Copy Shortlink'}
          </button>
          <button
            onClick={() => togglePauseQR(qr.id)}
            className="btn btn-secondary btn-sm"
          >
            {qr.status === 'Active' ? <Pause size={14} color="#D97706" /> : <Play size={14} color="#00891D" />}
            {qr.status === 'Active' ? 'Pause QR' : 'Resume QR'}
          </button>
          <button
            onClick={() => archiveQR(qr.id)}
            className="btn btn-secondary btn-sm"
            style={{ color: '#DC2626' }}
          >
            <Archive size={14} />
            Archive
          </button>
        </div>
      </div>

      {/* Header Management Card (Screen 08 Specification) */}
      <div className="vk-card" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: '24px', alignItems: 'center' }}>
          {/* QR Canvas Preview */}
          <div
            onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
            style={{
              padding: '8px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              textAlign: 'center',
            }}
            title="Click to launch interactive test-scan"
          >
            <QRCodeRenderer
              value={`https://qr.villagkart.com/${dest.redirectCode || qr.id}`}
              fgColor={qr.design?.fgColor || '#00891D'}
              bgColor="#FFFFFF"
              size={110}
              hasCtaFrame={false}
              showLogo={qr.design?.showLogo ?? true}
            />
          </div>

          {/* Core Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                {qr.name}
              </h2>
              <span className={`badge badge-${qr.status?.toLowerCase().replace(' ', '-')}`}>
                {qr.status}
              </span>
              <span className="badge badge-outline" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {qr.version || 'v1.0'}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#00891D', fontFamily: 'monospace', fontWeight: 600, marginBottom: '8px' }}>
              https://qr.villagkart.com/{dest.redirectCode || qr.id}
            </div>

            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '12.5px', color: '#4B5563' }}>
              <div>Type: <strong>{qr.type}</strong></div>
              <div>Campaign: <strong>{qr.campaign || 'Direct'}</strong></div>
              <div>Hub: <strong>{qr.hubName || 'Phirangipuram Hub'}</strong></div>
              <div>Owner: <strong>{qr.owner}</strong> ({qr.department})</div>
              <div>Expiry: <strong>{qr.expiryDate || 'Unlimited'}</strong></div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div style={{
            background: '#E8F5EA',
            border: '1px solid #C8E6C9',
            borderRadius: '12px',
            padding: '16px 20px',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: '11.5px', color: '#006B17', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Verified Scans
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#00891D' }}>
              {metrics.scans.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#006B17', fontWeight: 600 }}>
              {metrics.verifiedRegistrations} Registrations ({metrics.conversionRate || 0}%)
            </div>
          </div>
        </div>

        {/* 6 Detail Tabs */}
        <div className="tabs-nav" style={{ marginTop: '24px', marginBottom: 0 }}>
          {[
            { id: 'overview', label: '1. Overview & Performance' },
            { id: 'destinations', label: '2. Destinations & Versions' },
            { id: 'assets', label: '3. Generated Assets & Print' },
            { id: 'history', label: `4. Scan History (${qrEvents.length})` },
            { id: 'analytics', label: '5. Analytics Breakdown' },
            { id: 'audit', label: `6. Audit Log (${qrAudit.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid-2">
          <div className="vk-card">
            <h3 className="vk-card-title">Performance Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginTop: '14px' }}>
              <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Unique Visitors</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{(metrics.uniqueVisitors || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Verified App Installs</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#00891D' }}>{(metrics.verifiedRegistrations || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>First Grocery Orders</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#00A322' }}>{(metrics.firstOrders || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Conversion Rate</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#00891D' }}>{metrics.conversionRate || 0}%</div>
              </div>
            </div>
          </div>

          <div className="vk-card">
            <h3 className="vk-card-title">Design & Artwork Specifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                <span style={{ color: '#6B7280' }}>Template</span>
                <span style={{ fontWeight: 600 }}>{qr.design?.template || 'VillagKart Branded'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                <span style={{ color: '#6B7280' }}>Brand Foreground</span>
                <span style={{ fontWeight: 600, color: qr.design?.fgColor }}>{qr.design?.fgColor || '#00891D'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                <span style={{ color: '#6B7280' }}>Error Correction</span>
                <span style={{ fontWeight: 600 }}>Level {qr.design?.errorCorrection || 'Q'} (25% damage recovery)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                <span style={{ color: '#6B7280' }}>CTA Text Frame</span>
                <span style={{ fontWeight: 600 }}>{qr.design?.ctaText || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Destinations & Versioning */}
      {activeTab === 'destinations' && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Destination Routing Rules & Version History</h3>
              <p className="vk-card-subtitle">
                Editing destinations creates an audited new configuration version without breaking printed QR codes
              </p>
            </div>
            {!editingDest && (
              <button onClick={() => setEditingDest(true)} className="btn btn-secondary btn-sm">
                <Edit3 size={14} />
                Modify Targets (Create New Version)
              </button>
            )}
          </div>

          {editingDest ? (
            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '10px' }}>
                ⚠️ Critical Behavior: Modifying published destination creates audited version {qr.version} → v{(parseFloat(qr.version?.replace('v','') || '1.0') + 0.1).toFixed(1)}
              </div>
              <div className="form-group">
                <label className="form-label">New Fallback Web Destination</label>
                <input
                  type="url"
                  className="form-control"
                  defaultValue={dest.fallbackUrl}
                  onChange={(e) => setNewFallbackUrl(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditingDest(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button onClick={handleSaveDestinationVersion} className="btn btn-primary btn-sm">
                  Publish New Version
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>Android Destination</div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#00891D', wordBreak: 'break-all', marginTop: '4px' }}>
                  {dest.androidUrl || 'Automatic Fallback'}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>iOS Destination</div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#00891D', wordBreak: 'break-all', marginTop: '4px' }}>
                  {dest.iosUrl || 'Automatic Fallback'}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>Fallback Web URL</div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#00891D', wordBreak: 'break-all', marginTop: '4px' }}>
                  {dest.fallbackUrl}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Assets */}
      {activeTab === 'assets' && (
        <div className="vk-card">
          <h3 className="vk-card-title">Production Print & Digital Assets</h3>
          <p className="vk-card-subtitle">Ready-to-print bundles formatted for this QR code</p>
          <div className="grid-3" style={{ marginTop: '16px' }}>
            <div style={{ padding: '14px', border: '1px solid #E5E7EB', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Vector SVG</div>
              <div style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 12px 0' }}>Infinite Vector Scalability</div>
              <button
                onClick={() => showToast('Downloaded production SVG vector!')}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
              >
                <Download size={14} /> Download SVG
              </button>
            </div>

            <div style={{ padding: '14px', border: '1px solid #E5E7EB', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>300 DPI High-Res PNG</div>
              <div style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 12px 0' }}>Ultra Crisp Print Raster</div>
              <button
                onClick={() => showToast('Downloaded 300 DPI high-res asset!')}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
              >
                <Download size={14} /> Download PNG
              </button>
            </div>

            <div style={{ padding: '14px', border: '1px solid #E5E7EB', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>WhatsApp Share Card</div>
              <div style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 12px 0' }}>1080×1080 Square Graphic</div>
              <button
                onClick={() => showToast('Downloaded WhatsApp card!')}
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
              >
                <Download size={14} /> Download Social Pack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Scan History */}
      {activeTab === 'history' && (
        <div className="vk-card">
          <h3 className="vk-card-title">Scan Events for {qr.id}</h3>
          <div className="vk-table-container" style={{ marginTop: '14px' }}>
            <table className="vk-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>Source / Medium</th>
                  <th>Device / OS</th>
                  <th>Outcome</th>
                  <th>Attribution</th>
                </tr>
              </thead>
              <tbody>
                {qrEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                      No scan events recorded yet for this QR code.
                    </td>
                  </tr>
                ) : (
                  qrEvents.map((evt) => (
                    <tr key={evt.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{evt.id}</td>
                      <td>{evt.timestamp}</td>
                      <td>{evt.source} · {evt.medium}</td>
                      <td>{evt.device}</td>
                      <td>
                        <span className={`badge ${evt.outcome === 'Redirected' ? 'badge-active' : 'badge-draft'}`}>
                          {evt.outcome}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#00891D' }}>{evt.conversion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Analytics */}
      {activeTab === 'analytics' && (
        <div className="vk-card">
          <h3 className="vk-card-title">Device & Territory Analytics</h3>
          <div className="grid-2" style={{ marginTop: '16px' }}>
            <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '10px' }}>Operating System Distribution</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Android (Google Play)</span>
                    <span style={{ fontWeight: 600 }}>82.4%</span>
                  </div>
                  <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '82.4%', height: '100%', background: '#00891D' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Apple iOS (App Store)</span>
                    <span style={{ fontWeight: 600 }}>14.2%</span>
                  </div>
                  <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '14.2%', height: '100%', background: '#4CAF50' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Web Desktop Fallback</span>
                    <span style={{ fontWeight: 600 }}>3.4%</span>
                  </div>
                  <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '3.4%', height: '100%', background: '#9CA3AF' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '10px' }}>Village Cluster Performance</div>
              <p style={{ fontSize: '12.5px', color: '#4B5563' }}>
                Primary engagement recorded in <strong>Phirangipuram Village</strong> (64%) and <strong>Prattipadu</strong> (28%).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Audit Log */}
      {activeTab === 'audit' && (
        <div className="vk-card">
          <h3 className="vk-card-title">Version Audit Trail for {qr.id}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            {qrAudit.length === 0 ? (
              <div style={{ color: '#6B7280', fontSize: '13px' }}>No direct audit entries recorded.</div>
            ) : (
              qrAudit.map((log) => (
                <div key={log.id} style={{ padding: '12px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{log.action}</span>
                    <span style={{ fontSize: '11.5px', color: '#6B7280' }}>{log.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '3px' }}>{log.versionDiff}</div>
                  <div style={{ fontSize: '11px', color: '#00891D', fontWeight: 600, marginTop: '2px' }}>Executed by {log.user}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
