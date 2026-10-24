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
} from 'lucide-react';

export const Settings = () => {
  const { settings, setSettings, auditLogs, currentRole, showToast } = useQR();
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'audit'
  const [formData, setFormData] = useState({ ...settings });
  const [auditSearch, setAuditSearch] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (currentRole !== 'Admin') {
      showToast('Only Admin role can modify enterprise QR settings', 'error');
      return;
    }
    setSettings(formData);
    showToast('Enterprise settings saved successfully!');
  };

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.reference.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Settings & Immutable Audit Logs</h2>
            <p className="vk-card-subtitle">
              System redirect domain rules, abuse rate limits, retention windows and tamper-evident audit logs
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('settings')}
              className={`btn btn-sm ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <SettingsIcon size={14} />
              System QR Settings
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <History size={14} />
              Audit Log ({auditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* Settings Form Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSave}>
          <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="vk-card-title">Routing & DNS Configuration</h3>
                <p className="vk-card-subtitle">Edge routing domains and destination security allowlists</p>
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={14} />
                Save Settings
              </button>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Default Redirect Domain</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.defaultRedirectDomain}
                  onChange={(e) => setFormData({ ...formData, defaultRedirectDomain: e.target.value })}
                />
                <p className="form-helper">Configured across all Cloudflare / AWS edge workers</p>
              </div>

              <div className="form-group">
                <label className="form-label">Default Export Format</label>
                <select
                  className="form-control"
                  value={formData.defaultExportFormat}
                  onChange={(e) => setFormData({ ...formData, defaultExportFormat: e.target.value })}
                >
                  <option value="SVG">SVG (Vector)</option>
                  <option value="PNG">PNG (High-Res 300 DPI)</option>
                  <option value="PDF">PDF (Print Layout)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Approved Destination Domains (Allowlist)</label>
              <textarea
                className="form-control"
                rows={3}
                value={formData.approvedDomains?.join('\n') || ''}
                onChange={(e) => setFormData({ ...formData, approvedDomains: e.target.value.split('\n') })}
              />
              <p className="form-helper">Wildcard domains permitted in Screen 04 destination routing engine</p>
            </div>

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <h3 className="vk-card-title" style={{ marginBottom: '14px' }}>Security, Abuse & Retention Rules</h3>
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
                  <label className="form-label">Scan Event Retention</label>
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
                  <label className="form-label">Rate Limit per IP</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.rateLimitScansPerMinPerIp}
                      onChange={(e) => setFormData({ ...formData, rateLimitScansPerMinPerIp: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Scans/min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Immutable Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Tamper-Evident System Audit Trail</h3>
              <p className="vk-card-subtitle">
                Immutable records of QR creations, destination versioning, approval actions and exports
              </p>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Filter audit logs..."
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
                  <th>User / Service</th>
                  <th>Action Performed</th>
                  <th>QR Reference</th>
                  <th>Configuration Diff / Details</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00891D' }}>
                      {log.id}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px' }}>
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
                    <td style={{ fontSize: '12px', color: '#4B5563', maxWidth: '280px' }}>
                      {log.versionDiff}
                    </td>
                    <td>
                      <span className="badge badge-active">{log.outcome}</span>
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
