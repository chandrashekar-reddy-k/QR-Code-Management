import React, { useState, useMemo, useEffect } from 'react';
import { useQR } from '../context/QRContext';
import {
  History,
  Search,
  Eye,
  X,
  AlertTriangle,
  Lock,
  Radio,
  FileSpreadsheet,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

export const ScanHistory = () => {
  const { scanEvents, qrCodes, setTestScanModal, showToast, fetchScanEvents } = useQR();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (fetchScanEvents) {
      fetchScanEvents();
    }
  }, [fetchScanEvents]);

  // Search & Filter States for Scan Events
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');

  // Pagination & Drawer State for Scan Events
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [referenceTime] = useState(() => ({
    now: Date.now(),
    todayStr: new Date().toISOString().split('T')[0],
  }));

  // Valid Active Filtering Logic for Scan Events
  const filteredEvents = useMemo(() => {
    const { now, todayStr } = referenceTime;

    return scanEvents.filter((evt) => {
      // 1. Search Query: matches across event ID, QR name, QR ID, campaign, source, device, hub, conversion
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          (evt.id && evt.id.toLowerCase().includes(q)) ||
          (evt.qrName && evt.qrName.toLowerCase().includes(q)) ||
          (evt.qrId && evt.qrId.toLowerCase().includes(q)) ||
          (evt.campaign && evt.campaign.toLowerCase().includes(q)) ||
          (evt.source && evt.source.toLowerCase().includes(q)) ||
          (evt.medium && evt.medium.toLowerCase().includes(q)) ||
          (evt.device && evt.device.toLowerCase().includes(q)) ||
          (evt.hub && evt.hub.toLowerCase().includes(q)) ||
          (evt.conversion && evt.conversion.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Date Filter: active chronological validation
      if (dateFilter !== 'all') {
        const ts = String(evt.timestamp || '');
        const evtDatePart = ts.substring(0, 10);
        if (dateFilter === 'today') {
          const localToday = new Date().toLocaleDateString('en-CA');
          const utcToday = new Date().toISOString().substring(0, 10);
          if (evtDatePart !== localToday && evtDatePart !== utcToday) return false;
        } else {
          const rawDate = ts.replace(' ', 'T');
          const evtTime = new Date(rawDate).getTime();
          if (!isNaN(evtTime)) {
            const daysDiff = (now - evtTime) / (1000 * 60 * 60 * 24);
            if (dateFilter === '7d' && (daysDiff < -0.5 || daysDiff > 7)) return false;
            if (dateFilter === '30d' && (daysDiff < -0.5 || daysDiff > 30)) return false;
          }
        }
      }

      // 3. Source & Medium Filter
      if (sourceFilter !== 'all') {
        const fullSource = `${evt.source || ''} ${evt.medium || ''}`.toLowerCase();
        if (sourceFilter === 'Flyer') {
          if (!fullSource.includes('flyer') && !fullSource.includes('leaflet')) return false;
        } else if (sourceFilter === 'Poster') {
          if (!fullSource.includes('poster')) return false;
        } else if (sourceFilter === 'Vehicle') {
          if (!fullSource.includes('vehic') && !fullSource.includes('van') && !fullSource.includes('vinyl')) return false;
        } else if (sourceFilter === 'Product') {
          if (!fullSource.includes('prod') && !fullSource.includes('label') && !fullSource.includes('pack')) return false;
        } else if (sourceFilter === 'Hub') {
          if (!fullSource.includes('hub') && !fullSource.includes('facade') && !fullSource.includes('banner')) return false;
        }
      }

      // 4. Device OS Filter
      if (deviceFilter !== 'all') {
        const d = (evt.device || '').toLowerCase();
        if (deviceFilter === 'Desktop') {
          if (!d.includes('desktop') && !d.includes('windows') && !d.includes('mac') && !d.includes('pc') && !d.includes('browser')) return false;
        } else if (deviceFilter === 'Android') {
          if (!d.includes('android')) return false;
        } else if (deviceFilter === 'Apple' || deviceFilter === 'iOS') {
          if (!d.includes('apple') && !d.includes('ios') && !d.includes('iphone') && !d.includes('ipad')) return false;
        }
      }

      return true;
    });
  }, [scanEvents, searchQuery, dateFilter, sourceFilter, deviceFilter, referenceTime]);

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    dateFilter !== 'all' ||
    sourceFilter !== 'all' ||
    deviceFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setSourceFilter('all');
    setDeviceFilter('all');
    setCurrentPage(1);
  };

  // Pagination calculation for Scan Events
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedEvents = filteredEvents.slice((validPage - 1) * pageSize, validPage * pageSize);

  // Export Filtered Scan Dataset to CSV
  const handleExportCSV = () => {
    const headers = [
      'Event ID',
      'Timestamp',
      'QR Code ID',
      'QR Code Name',
      'Campaign',
      'Source',
      'Medium',
      'Collection Hub',
      'Village',
      'Device Forensics',
      'Outcome',
      'Attribution Result',
      'Execution Latency (ms)',
    ];

    const rows = filteredEvents.map((evt) => [
      `"${evt.id}"`,
      `"${evt.timestamp}"`,
      `"${evt.qrId}"`,
      `"${(evt.qrName || '').replace(/"/g, '""')}"`,
      `"${(evt.campaign || '').replace(/"/g, '""')}"`,
      `"${(evt.source || '').replace(/"/g, '""')}"`,
      `"${(evt.medium || '').replace(/"/g, '""')}"`,
      `"${(evt.hub || '').replace(/"/g, '""')}"`,
      `"${(evt.village || '').replace(/"/g, '""')}"`,
      `"${(evt.device || '').replace(/"/g, '""')}"`,
      `"${evt.outcome || ''}"`,
      `"${(evt.conversion || '').replace(/"/g, '""')}"`,
      evt.durationMs || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `villagkart_scan_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast(`Exported ${filteredEvents.length} scan event records to CSV!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title Card with Primary Actions */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Audit History</h2>
            <p className="vk-card-subtitle">
              Live event activity stream, device forensics, and routing execution logs
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={async () => {
                if (fetchScanEvents) {
                  setIsRefreshing(true);
                  await fetchScanEvents();
                  setTimeout(() => setIsRefreshing(false), 400);
                  if (showToast) showToast('Audit history reloaded from database');
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Refresh audit event logs from database"
            >
              <RotateCw size={14} className={isRefreshing ? 'vk-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (qrCodes.length > 0) {
                  setTestScanModal({ isOpen: true, qrCode: qrCodes[0] });
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Launch smartphone scanner simulator"
            >
              <Radio size={14} color="#00891D" />
              <span>Simulate Real-time Scan</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Export filtered scan events to CSV"
            >
              <FileSpreadsheet size={14} color="#00891D" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Valid Multi-Parameter Filters Card */}
          <div className="vk-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Row 1: Search Input & Results Summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ position: 'relative', flex: '1 1 320px', minWidth: '260px' }}>
                <Search
                  size={16}
                  color="#9CA3AF"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Search by event ID, QR name, source, or device..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control"
                  style={{ paddingLeft: '36px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12.5px', color: '#6B7280', fontWeight: 500 }}>
                  Showing <strong>{filteredEvents.length}</strong> of <strong>{scanEvents.length}</strong> events
                </span>
                {isAnyFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', padding: '4px 10px' }}
                    title="Reset all search filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Clean Valid Select Dropdowns */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '10px',
                alignItems: 'center',
                paddingTop: '6px',
                borderTop: '1px solid #F3F4F6',
              }}
            >
              {/* 1. Date Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Date
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              {/* 2. Source & Medium Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Source & Medium
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="all">All Sources</option>
                  <option value="Flyer">Flyer / Print Leaflet</option>
                  <option value="Poster">Poster / Wall Mount</option>
                  <option value="Vehicle">Vehicle Vinyl Sticker</option>
                  <option value="Product">Product Label</option>
                  <option value="Hub">Hub Facade Banner</option>
                </select>
              </div>

              {/* 3. Device OS Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Device OS
                </label>
                <select
                  value={deviceFilter}
                  onChange={(e) => {
                    setDeviceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="all">All Devices</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Android">Android</option>
                  <option value="Apple">Apple / iOS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Production Scan History Table */}
          <div className="vk-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="vk-table-container" style={{ margin: 0, border: 'none' }}>
              <table className="vk-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap', width: '110px' }}>Event ID</th>
                    <th style={{ whiteSpace: 'nowrap', width: '160px' }}>Timestamp</th>
                    <th>QR Code</th>
                    <th>Source & Medium</th>
                    <th>Device</th>
                    <th style={{ textAlign: 'right', width: '110px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <div style={{ maxWidth: '380px', margin: '0 auto', color: '#6B7280' }}>
                          <AlertTriangle size={36} color="#9CA3AF" style={{ marginBottom: '10px' }} />
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                            No scan events found
                          </div>
                          <p style={{ fontSize: '13px', margin: '6px 0 16px 0' }}>
                            No events matched your current search filters.
                          </p>
                          <button type="button" onClick={handleResetFilters} className="btn btn-secondary btn-sm">
                            Clear all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedEvents.map((evt) => {
                      return (
                        <tr
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Event ID with strict nowrap */}
                          <td style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontWeight: 700, color: '#00891D' }}>
                            {evt.id}
                          </td>

                          {/* Timestamp */}
                          <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#4B5563' }}>
                            {evt.timestamp}
                          </td>

                          {/* QR Code details */}
                          <td>
                            <div style={{ fontWeight: 700, color: '#111827', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={evt.qrName}>
                              {evt.qrName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#00891D', fontFamily: 'monospace' }}>
                              {evt.qrId}
                            </div>
                          </td>

                          {/* Source & Medium */}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              const matchedQr = qrCodes.find((q) => q.id === evt.qrId) || qrCodes[0];
                              if (matchedQr) {
                                setTestScanModal({
                                  isOpen: true,
                                  qrCode: matchedQr,
                                  device: 'Desktop',
                                });
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                            title="Click to launch scan simulator on our device"
                          >
                            <span className="badge badge-outline" style={{ fontSize: '11px', padding: '2px 8px', transition: 'all 0.15s ease' }}>
                              {evt.source}
                            </span>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                              {evt.medium}
                            </div>
                          </td>

                          {/* Device & Location */}
                          <td>
                            <div style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                              {evt.device}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              {evt.ipCountry || 'India (AP/Guntur)'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="View Technical Diagnostics"
                            >
                              <Eye size={12} />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer for Scan Events */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '14px 20px',
                borderTop: '1px solid #E5E7EB',
                background: '#F9FAFB',
                fontSize: '13px',
                color: '#4B5563',
              }}
            >
              <div>
                Showing{' '}
                <strong>
                  {filteredEvents.length === 0 ? 0 : (validPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong>
                  {Math.min(validPage * pageSize, filteredEvents.length)}
                </strong>{' '}
                of <strong>{filteredEvents.length}</strong> events
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="form-control"
                    style={{ width: '70px', padding: '4px 8px', fontSize: '12px' }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                    title="Previous page"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', padding: '0 4px' }}>
                    Page {validPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px' }}
                    title="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

      {/* Slide-out Event Detail Diagnostics Drawer */}
      {selectedEvent && (() => {
        const matchedQr = qrCodes.find((q) => q.id === selectedEvent.qrId) || qrCodes[0];
        const destinationUrl = matchedQr?.destinationUrl || matchedQr?.fallbackUrl || matchedQr?.destination?.fallbackUrl || matchedQr?.destination?.androidUrl;
        return (
          <div className="drawer-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} color="#00891D" />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                    Event Diagnostics · {selectedEvent.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="btn btn-ghost"
                  style={{ padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '10px' }}>
                    Forensics & Routing Diagnostics
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                      <span style={{ color: '#6B7280' }}>Event ID</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00891D' }}>{selectedEvent.id}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                      <span style={{ color: '#6B7280' }}>Timestamp</span>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{selectedEvent.timestamp}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                      <span style={{ color: '#6B7280' }}>QR Code</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{selectedEvent.qrName || matchedQr?.name || 'Villagkart'}</div>
                        <div style={{ fontSize: '11px', color: '#00891D', fontFamily: 'monospace' }}>{selectedEvent.qrId || matchedQr?.id}</div>
                      </div>
                    </div>

                    {destinationUrl && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                        <span style={{ color: '#6B7280' }}>Destination Target</span>
                        <a
                          href={destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#00891D', fontWeight: 600, wordBreak: 'break-all', maxWidth: '60%', textAlign: 'right', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                        >
                          <span>{destinationUrl}</span>
                          <ExternalLink size={12} style={{ flexShrink: 0 }} />
                        </a>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                      <span style={{ color: '#6B7280' }}>Source & Medium</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (matchedQr) {
                            setTestScanModal({
                              isOpen: true,
                              qrCode: matchedQr,
                              device: selectedEvent.device?.includes('Android') ? 'Android' : selectedEvent.device?.includes('iOS') ? 'Apple' : 'Desktop',
                            });
                          }
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '11.5px', color: '#00891D', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Open simulator on our device"
                      >
                        <span>{selectedEvent.source || 'Direct Print / Flyer'} ({selectedEvent.medium || 'QR Scan Event'})</span>
                        <Smartphone size={12} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                      <span style={{ color: '#6B7280' }}>Device & Platform</span>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{selectedEvent.device || 'Desktop'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                      <span style={{ color: '#6B7280' }}>Location / Region</span>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{selectedEvent.ipCountry || selectedEvent.city || 'India (Andhra Pradesh)'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                      <span style={{ color: '#6B7280' }}>Execution Latency</span>
                      <span style={{ fontWeight: 600, color: '#15803D' }}>{selectedEvent.durationMs || 201} ms</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                      <span style={{ color: '#6B7280' }}>Scan Outcome</span>
                      <span style={{ fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', border: '1px solid #BBF7D0' }}>
                        {selectedEvent.outcome || 'Redirected'}
                      </span>
                    </div>

                    {selectedEvent.conversion && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                        <span style={{ color: '#6B7280' }}>Conversion Status</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{selectedEvent.conversion}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export { ScanHistory as Screen09_ScanHistory };
export default ScanHistory;
