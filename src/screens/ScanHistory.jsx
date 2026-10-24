import React, { useState, useMemo } from 'react';
import { useQR } from '../context/QRContext';
import { INITIAL_HUBS } from '../data/mockData';
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
  Calendar,
} from 'lucide-react';

export const ScanHistory = () => {
  const { scanEvents, qrCodes, setTestScanModal } = useQR();

  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [hubFilter, setHubFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = useMemo(() => {
    return scanEvents.filter((evt) => {
      const matchesSearch =
        evt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.qrName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.device.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesOutcome =
        outcomeFilter === 'all' ||
        evt.outcome.toLowerCase().includes(outcomeFilter.toLowerCase()) ||
        (outcomeFilter === 'Failed' && evt.outcome.toLowerCase().includes('fail')) ||
        (outcomeFilter === 'Bot' && evt.outcome.toLowerCase().includes('bot'));

      const matchesSource = sourceFilter === 'all' || evt.source.toLowerCase().includes(sourceFilter.toLowerCase());

      const matchesHub = hubFilter === 'all' || (evt.hub && evt.hub.toLowerCase().includes(hubFilter.toLowerCase()));

      const matchesDevice =
        deviceFilter === 'all' ||
        (deviceFilter === 'Android' && evt.device.toLowerCase().includes('android')) ||
        (deviceFilter === 'iOS' && evt.device.toLowerCase().includes('ios')) ||
        (deviceFilter === 'Desktop' && (evt.device.toLowerCase().includes('windows') || evt.device.toLowerCase().includes('mac')));

      return matchesSearch && matchesOutcome && matchesSource && matchesHub && matchesDevice;
    });
  }, [scanEvents, searchQuery, outcomeFilter, sourceFilter, hubFilter, deviceFilter]);

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
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '13px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={20} color="#00891D" />
          <div>
            <span style={{ fontWeight: 700, color: '#006B17' }}>
              Operational Investigation & Scan Forensics · DPDP Act Compliant
            </span>
            <p style={{ margin: '2px 0 0 0', color: '#4B5563', fontSize: '12px' }}>
              Customer telephone numbers, exact GPS coordinates, and raw browser cookies are strictly masked and protected.
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

      {/* Filter Bar (Page 9: Date, QR & Campaign, Source & Medium, Hub & Village, Device & OS, Outcome & Bot) */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search box: QR code and campaign */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '200px' }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by event ID, QR or campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Date & Time Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>Date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="form-control"
              style={{ width: '120px', fontSize: '12.5px', padding: '6px 8px' }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Hub and Village Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>Hub & Village:</label>
            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              className="form-control"
              style={{ width: '160px', fontSize: '12.5px', padding: '6px 8px' }}
            >
              <option value="all">All Hubs & Villages</option>
              {INITIAL_HUBS.map((h) => (
                <option key={h.id} value={h.name}>{h.name}</option>
              ))}
            </select>
          </div>

          {/* Source and Medium Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>Source & Medium:</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="form-control"
              style={{ width: '150px', fontSize: '12.5px', padding: '6px 8px' }}
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

          {/* Device and Operating System */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>Device OS:</label>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="form-control"
              style={{ width: '130px', fontSize: '12.5px', padding: '6px 8px' }}
            >
              <option value="all">All Devices</option>
              <option value="Android">Android</option>
              <option value="iOS">Apple iOS</option>
              <option value="Desktop">Desktop / Web</option>
            </select>
          </div>

          {/* Event Outcome and Suspected Bot Traffic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>Outcome:</label>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="form-control"
              style={{ width: '140px', fontSize: '12.5px', padding: '6px 8px' }}
            >
              <option value="all">All Outcomes</option>
              <option value="Redirected">Redirected</option>
              <option value="Failed">Failed</option>
              <option value="Bot">Bot (Suspected)</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scan History Table (Page 9 Columns) */}
      <div className="vk-table-container">
        <table className="vk-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Timestamp</th>
              <th>QR / Campaign</th>
              <th>Source</th>
              <th>Device</th>
              <th>Outcome</th>
              <th>Attribution</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                  No scan events match the selected filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00891D' }}>
                    {evt.id}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {evt.timestamp}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{evt.qrName}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{evt.campaign}</div>
                  </td>
                  <td>
                    <span className="badge badge-outline">{evt.source}</span>
                    <div style={{ fontSize: '10.5px', color: '#6B7280', marginTop: '2px' }}>{evt.medium}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', color: '#374151' }}>{evt.device}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{evt.ipCountry}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        evt.outcome === 'Redirected'
                          ? 'badge-active'
                          : evt.outcome.toLowerCase().includes('bot')
                          ? 'badge-expired'
                          : evt.outcome.toLowerCase().includes('fail')
                          ? 'badge-expired'
                          : 'badge-draft'
                      }`}
                    >
                      {evt.outcome}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: evt.conversion?.includes('Registration') || evt.conversion?.includes('Order') ? '#00891D' : '#6B7280' }}>
                      {evt.conversion}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(evt);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px' }}
                    >
                      <Eye size={13} />
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
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
                  Event Diagnostics · {selectedEvent.id}
                </h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Redirect Outcome</div>
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
                    <span style={{ color: '#6B7280' }}>Device & OS</span>
                    <span style={{ fontWeight: 500 }}>{selectedEvent.device}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>Geographic Node</span>
                    <span style={{ fontWeight: 500 }}>{selectedEvent.ipCountry}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>Collection Hub</span>
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
                  <strong>Privacy Safeguard Active:</strong> Customer telephone numbers, exact GPS coordinates, and identifiable browsing history are masked by default.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedEvent(null)} className="btn btn-secondary btn-sm">
                Close Details
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
