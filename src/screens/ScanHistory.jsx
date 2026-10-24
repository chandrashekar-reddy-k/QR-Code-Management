import React, { useState, useMemo } from 'react';
import { useQR } from '../context/QRContext';
import {
  History,
  Search,
  Filter,
  Shield,
  Smartphone,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Globe,
  Radio,
} from 'lucide-react';

export const ScanHistory = () => {
  const { scanEvents, qrCodes, setTestScanModal } = useQR();

  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = useMemo(() => {
    return scanEvents.filter((evt) => {
      const matchesSearch =
        evt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.qrName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.device.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesOutcome = outcomeFilter === 'all' || evt.outcome.toLowerCase().includes(outcomeFilter.toLowerCase());
      const matchesSource = sourceFilter === 'all' || evt.source.toLowerCase().includes(sourceFilter.toLowerCase());

      return matchesSearch && matchesOutcome && matchesSource;
    });
  }, [scanEvents, searchQuery, outcomeFilter, sourceFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Privacy Notice Banner (Screen 09 Requirement) */}
      <div style={{
        background: '#E8F5EA',
        border: '1px solid #C8E6C9',
        borderRadius: '10px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={20} color="#00891D" />
          <div>
            <span style={{ fontWeight: 700, color: '#006B17' }}>
              Operational Investigation Mode · DPDP Privacy Compliance
            </span>
            <p style={{ margin: '2px 0 0 0', color: '#4B5563', fontSize: '12px' }}>
              Raw phone numbers and precise customer GPS are masked by default according to VillagKart data privacy policy.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (qrCodes.length > 0) {
              setTestScanModal({ isOpen: true, qrCode: qrCodes[0] });
            }
          }}
          className="btn btn-secondary btn-sm"
        >
          <Radio size={14} color="#00891D" />
          Simulate Real-time Scan
        </button>
      </div>

      {/* Filter Bar */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by event ID, QR name or campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#4B5563' }}>Outcome:</label>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="form-control"
              style={{ width: '150px', fontSize: '13px' }}
            >
              <option value="all">All Outcomes</option>
              <option value="Redirected">Redirected</option>
              <option value="Bot">Bot Filtered</option>
              <option value="Fallback">Fallback Used</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#4B5563' }}>Channel Source:</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="form-control"
              style={{ width: '160px', fontSize: '13px' }}
            >
              <option value="all">All Sources</option>
              <option value="Flyer">Flyer / Leaflet</option>
              <option value="Vehicle">Vehicle Van Vinyl</option>
              <option value="VGE">VGE Referral Card</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Product">Product Box</option>
              <option value="Delivery">Delivery Packaging</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scan History Table */}
      <div className="vk-table-container">
        <table className="vk-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Local Timestamp</th>
              <th>QR / Campaign Name</th>
              <th>Channel Source</th>
              <th>Device & OS</th>
              <th>Outcome</th>
              <th>Conversion Attribution</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((evt) => (
              <tr key={evt.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00891D' }}>
                  {evt.id}
                </td>
                <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px' }}>
                  {evt.timestamp}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{evt.qrName}</div>
                  <div style={{ fontSize: '11.5px', color: '#6B7280' }}>{evt.campaign}</div>
                </td>
                <td>
                  <span className="badge badge-outline">{evt.source}</span>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{evt.medium}</div>
                </td>
                <td>
                  <div style={{ fontSize: '12.5px', color: '#374151' }}>{evt.device}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{evt.ipCountry}</div>
                </td>
                <td>
                  <span
                    className={`badge ${
                      evt.outcome === 'Redirected'
                        ? 'badge-active'
                        : evt.outcome.includes('Bot')
                        ? 'badge-expired'
                        : 'badge-draft'
                    }`}
                  >
                    {evt.outcome}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 700, fontSize: '12.5px', color: evt.conversion.includes('Registration') || evt.conversion.includes('Order') ? '#00891D' : '#6B7280' }}>
                    {evt.conversion}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => setSelectedEvent(evt)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    <Eye size={13} />
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-out Event Detail Drawer */}
      {selectedEvent && (
        <div className="drawer-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#00891D" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  Event Forensics · {selectedEvent.id}
                </h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Event Status</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                  {selectedEvent.outcome}
                </div>
                <div style={{ fontSize: '12px', color: '#00891D', fontWeight: 600, marginTop: '4px' }}>
                  Attribution: {selectedEvent.conversion}
                </div>
              </div>

              {/* Technical Diagnostics */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                  Diagnostic Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>Timestamp</span>
                    <span style={{ fontWeight: 500 }}>{selectedEvent.timestamp}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>Latency / Execution</span>
                    <span style={{ fontWeight: 500 }}>{selectedEvent.durationMs} ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>Device User-Agent</span>
                    <span style={{ fontWeight: 500 }}>{selectedEvent.device}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>Location Approximation</span>
                    <span style={{ fontWeight: 500 }}>{selectedEvent.ipCountry}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>Assigned Hub</span>
                    <span style={{ fontWeight: 500 }}>{selectedEvent.hub}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>Target Village</span>
                    <span style={{ fontWeight: 500 }}>{selectedEvent.village}</span>
                  </div>
                </div>
              </div>

              {/* Privacy Safeguards notice */}
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                display: 'flex',
                gap: '8px',
              }}>
                <Lock size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ color: '#92400E' }}>
                  <strong>Privacy Safeguard Active:</strong> Customer telephone number and browser cookies are encrypted and unlinked on this screen.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedEvent(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
export { ScanHistory as Screen09_ScanHistory };
export default ScanHistory;
