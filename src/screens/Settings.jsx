import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import {
  Settings as SettingsIcon,
  History,
  Shield,
  Save,
  Globe,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  Check,
  Bell,
  Layers,
} from 'lucide-react';

export const Settings = () => {
  const { settings, setSettings, auditLogs, currentRole, showToast } = useQR();
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'audit'
  const [formData, setFormData] = useState({
    ...settings,
    defaultTemplate: settings.defaultTemplate || 'VillagKart Branded',
    trackingDefaultEnabled: settings.trackingDefaultEnabled ?? true,
    maxAssetDimensionPx: settings.maxAssetDimensionPx || 2400,
    maxAssetSizeBytes: settings.maxAssetSizeBytes || 10485760, // 10MB
    approvalRulePolicy: settings.approvalRulePolicy || 'Sensitive & High Risk (Payments & Public Campaigns)',
    brokenDestinationThresholdPercent: settings.brokenDestinationThresholdPercent || 5,
  });
  const [auditSearch, setAuditSearch] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (currentRole !== 'Admin') {
      showToast('Only Admin role can modify enterprise QR settings', 'error');
      return;
    }
    setSettings(formData);
    showToast('Enterprise QR settings saved successfully!');
  };

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.reference.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (l.decision && l.decision.toLowerCase().includes(auditSearch.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Settings & Audit Logs</h2>
            <p className="vk-card-subtitle">
              Configure global QR routing behavior, rate limits, governance thresholds and maintain tamper-evident audit records
            </p>
          </div>

          {/* Section Tabs (Page 15) */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('settings')}
              className={`btn btn-sm ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <SettingsIcon size={14} />
              QR Settings
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <History size={14} />
              Audit Logs ({auditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* QR Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSave}>
          <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 className="vk-card-title">Global QR Governance & Routing Settings</h3>
                <p className="vk-card-subtitle">Edge redirect domains, templates, default export formats and security rules</p>
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={14} />
                Save Settings
              </button>
            </div>

            {/* Row 1: Default redirect domain & Approved destination domains */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Default Redirect Domain</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.defaultRedirectDomain}
                  onChange={(e) => setFormData({ ...formData, defaultRedirectDomain: e.target.value })}
                />
                <p className="form-helper">Immutable root domain configured for high-speed edge redirects</p>
              </div>

              <div className="form-group">
                <label className="form-label">Approved Destination Domains (Allowlist)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.approvedDomains?.join('\n') || ''}
                  onChange={(e) => setFormData({ ...formData, approvedDomains: e.target.value.split('\n') })}
                />
                <p className="form-helper">One domain per line; prevents open-redirect vulnerability</p>
              </div>
            </div>

            {/* Row 2: Default QR Template, Default Export Formats, Tracking Defaults */}
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Default QR Template</label>
                <select
                  className="form-control"
                  value={formData.defaultTemplate}
                  onChange={(e) => setFormData({ ...formData, defaultTemplate: e.target.value })}
                >
                  <option value="VillagKart Branded">VillagKart Branded (#00891D)</option>
                  <option value="App download poster">App download poster</option>
                  <option value="Village launch flyer">Village launch flyer</option>
                  <option value="Shop-on-Wheels vehicle sticker">Shop-on-Wheels vehicle sticker</option>
                  <option value="VGE referral card">VGE referral card</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Default Export Format</label>
                <select
                  className="form-control"
                  value={formData.defaultExportFormat}
                  onChange={(e) => setFormData({ ...formData, defaultExportFormat: e.target.value })}
                >
                  <option value="PDF">PDF (Print Layout)</option>
                  <option value="SVG">SVG (Vector)</option>
                  <option value="PNG">PNG (High-Res 300 DPI)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tracking Defaults</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '38px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formData.trackingDefaultEnabled}
                      onChange={(e) => setFormData({ ...formData, trackingDefaultEnabled: e.target.checked })}
                      style={{ accentColor: '#00891D', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: 600 }}>Enable Telemetry by Default</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Row 3: Campaign Attribution Windows, Retention, Max Dimensions */}
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
                Retention, Performance & Asset Limitations
              </h4>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Campaign Attribution Window</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.campaignAttributionWindowDays}
                      onChange={(e) => setFormData({ ...formData, campaignAttributionWindowDays: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Days</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Scan Event & Asset Retention</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.scanEventRetentionDays}
                      onChange={(e) => setFormData({ ...formData, scanEventRetentionDays: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Days</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Maximum Asset Size & Dimensions</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.maxAssetDimensionPx}
                      onChange={(e) => setFormData({ ...formData, maxAssetDimensionPx: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>px (10MB max)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Approval Rules, Rate Limits, Broken-Destination Alerts */}
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
                Governance, Rate Limits & Broken-Destination Alerts
              </h4>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Approval Rules Policy</label>
                  <select
                    className="form-control"
                    value={formData.approvalRulePolicy}
                    onChange={(e) => setFormData({ ...formData, approvalRulePolicy: e.target.value })}
                  >
                    <option value="Sensitive & High Risk (Payments & Public Campaigns)">
                      Sensitive & High Risk (Payments & Campaigns)
                    </option>
                    <option value="All Non-Admin Creations">All Non-Admin Creations</option>
                    <option value="Direct Hub Publication Allowed">Direct Hub Publication Allowed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rate Limits & Abuse Detection</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.rateLimitScansPerMinPerIp}
                      onChange={(e) => setFormData({ ...formData, rateLimitScansPerMinPerIp: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Scans/min/IP</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Broken-Destination Alert Threshold</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.brokenDestinationThresholdPercent}
                      onChange={(e) => setFormData({ ...formData, brokenDestinationThresholdPercent: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>% Failure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SECTION B: Immutable Audit Logs (All Page 15 Audit Requirements) */}
      {activeTab === 'audit' && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="vk-card-title">Tamper-Evident System Audit Trail</h3>
                <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={11} /> Protected Against Modification
                </span>
              </div>
              <p className="vk-card-subtitle">
                Immutable records of administrative changes, approval decisions, configuration version diffs and routing updates
              </p>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Filter audit logs by user, action or QR..."
                className="form-control"
                style={{ paddingLeft: '32px', fontSize: '12.5px', padding: '6px 10px 6px 32px' }}
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="vk-table-container">
            <table className="vk-table">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Timestamp</th>
                  <th>User / Service Identity</th>
                  <th>Action Performed</th>
                  <th>QR / Campaign Reference</th>
                  <th>Configuration Diff (Prev & New)</th>
                  <th>Approval Decision</th>
                  <th>Outcome & Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00891D' }}>
                      {log.id}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {log.timestamp}
                    </td>
                    <td style={{ fontWeight: 600, color: '#111827' }}>
                      {log.user}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {log.action}
                    </td>
                    <td>
                      <span style={{ color: '#00891D', fontWeight: 600 }}>{log.reference}</span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: '#4B5563', maxWidth: '240px' }}>
                      {log.versionDiff || 'v1.0 -> v1.1: Target routing validated'}
                    </td>
                    <td>
                      <span className="badge badge-active">
                        {log.decision || 'Approved'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        {log.outcome || 'Success (200 OK)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export { Settings as Screen15_Settings };
export default Settings;
