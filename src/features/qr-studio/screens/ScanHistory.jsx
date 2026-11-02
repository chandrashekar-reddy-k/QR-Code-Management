import React, { useState, useMemo, useEffect } from 'react';
import { useQR } from '../context/QRContext';
import {
  History,
  Search,
  Eye,
  X,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Trash2,
  ShieldCheck,
  Download,
  Sliders,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';

export const ScanHistory = () => {
  const {
    auditLogs = [],
    setActiveScreen,
    setSelectedQrId,
    showToast,
    fetchAuditEvents,
  } = useQR();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Inspection Drawer for Audit Events
  const [selectedAudit, setSelectedAudit] = useState(null);

  // Fetch fresh events on mount
  useEffect(() => {
    if (fetchAuditEvents) fetchAuditEvents();
  }, [fetchAuditEvents]);

  // Copy helper
  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (showToast) showToast(`Copied ${text} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ==========================================
  // AUDIT EVENTS STATE & FILTERING
  // ==========================================
  const [auditSearch, setAuditSearch] = useState('');
  const [actionCategoryFilter, setActionCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  const filteredAuditLogs = useMemo(() => {
    const now = Date.now();

    return auditLogs.filter((log) => {
      // 1. Search Query
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase().trim();
        const matches =
          (log.id && log.id.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.reference && log.reference.toLowerCase().includes(q)) ||
          (log.entityId && log.entityId.toLowerCase().includes(q)) ||
          (log.entityName && log.entityName.toLowerCase().includes(q)) ||
          (log.versionDiff && log.versionDiff.toLowerCase().includes(q)) ||
          (log.decision && log.decision.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // 2. Action Category Filter
      if (actionCategoryFilter !== 'all') {
        const act = (log.action || '').toLowerCase();
        if (actionCategoryFilter === 'created' && !act.includes('creat') && !act.includes('publish') && !act.includes('draft')) return false;
        if (actionCategoryFilter === 'activated' && (!act.includes('active') && !act.includes('activated'))) return false;
        if (actionCategoryFilter === 'paused' && !act.includes('pause')) return false;
        if (actionCategoryFilter === 'approval' && (!act.includes('approv') && !act.includes('accepted') && !act.includes('reject'))) return false;
        if (actionCategoryFilter === 'updated' && (!act.includes('update') && !act.includes('edit') && !act.includes('config'))) return false;
        if (actionCategoryFilter === 'export' && (!act.includes('export') && !act.includes('download'))) return false;
        if (actionCategoryFilter === 'deleted' && !act.includes('delet')) return false;
      }

      // 3. Date Filter
      if (dateFilter !== 'all') {
        const ts = String(log.timestamp || '');
        const logDatePart = ts.substring(0, 10);
        if (dateFilter === 'today') {
          const localToday = new Date().toLocaleDateString('en-CA');
          const utcToday = new Date().toISOString().substring(0, 10);
          if (logDatePart !== localToday && logDatePart !== utcToday) return false;
        } else {
          const rawDate = ts.replace(' ', 'T');
          const logTime = new Date(rawDate).getTime();
          if (!isNaN(logTime)) {
            const daysDiff = (now - logTime) / (1000 * 60 * 60 * 24);
            if (dateFilter === '7d' && (daysDiff < -0.5 || daysDiff > 7)) return false;
            if (dateFilter === '30d' && (daysDiff < -0.5 || daysDiff > 30)) return false;
          }
        }
      }

      // 4. Outcome Filter
      if (outcomeFilter !== 'all') {
        const out = (log.outcome || '').toLowerCase();
        if (outcomeFilter === 'success' && out !== 'success') return false;
        if (outcomeFilter === 'warning' && out !== 'warning') return false;
        if (outcomeFilter === 'failed' && out !== 'failed') return false;
      }

      return true;
    });
  }, [auditLogs, auditSearch, actionCategoryFilter, dateFilter, outcomeFilter]);

  // Audit Pagination
  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / auditPageSize));
  const validAuditPage = Math.min(auditPage, totalAuditPages);
  const paginatedAuditLogs = filteredAuditLogs.slice((validAuditPage - 1) * auditPageSize, validAuditPage * auditPageSize);

  const isAuditFilterActive =
    auditSearch.trim() !== '' ||
    actionCategoryFilter !== 'all' ||
    dateFilter !== 'all' ||
    outcomeFilter !== 'all';

  const handleResetAuditFilters = () => {
    setAuditSearch('');
    setActionCategoryFilter('all');
    setDateFilter('all');
    setOutcomeFilter('all');
    setAuditPage(1);
  };

  // Export Audit CSV
  const handleExportAuditCSV = () => {
    const headers = ['Audit ID', 'Timestamp', 'Action', 'Target Reference', 'Version Diff / Details', 'Decision', 'Outcome'];
    const rows = filteredAuditLogs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.reference || '').replace(/"/g, '""')}"`,
      `"${(l.versionDiff || '').replace(/"/g, '""')}"`,
      `"${(l.decision || '').replace(/"/g, '""')}"`,
      `"${(l.outcome || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `villagkart_audit_events_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast(`Exported ${filteredAuditLogs.length} audit events to CSV!`);
  };

  // Helper for Action Badge Styling
  const getActionBadge = (action = '') => {
    const a = action.toLowerCase();
    if (a.includes('accepted') || a.includes('active') || a.includes('published')) {
      return {
        bg: '#ECFDF5',
        color: '#065F46',
        border: '#A7F3D0',
        icon: <CheckCircle2 size={13} color="#059669" />,
      };
    }
    if (a.includes('rejected') || a.includes('delet') || a.includes('failed')) {
      return {
        bg: '#FEF2F2',
        color: '#991B1B',
        border: '#FECACA',
        icon: <Trash2 size={13} color="#DC2626" />,
      };
    }
    if (a.includes('paused') || a.includes('draft') || a.includes('warning')) {
      return {
        bg: '#FFFBEB',
        color: '#92400E',
        border: '#FDE68A',
        icon: <PauseCircle size={13} color="#D97706" />,
      };
    }
    if (a.includes('approv')) {
      return {
        bg: '#EEF2FF',
        color: '#3730A3',
        border: '#C7D2FE',
        icon: <ShieldCheck size={13} color="#4F46E5" />,
      };
    }
    if (a.includes('export') || a.includes('download')) {
      return {
        bg: '#F5F3FF',
        color: '#5B21B6',
        border: '#DDD6FE',
        icon: <Download size={13} color="#7C3AED" />,
      };
    }
    return {
      bg: '#F0FDF4',
      color: '#166534',
      border: '#BBF7D0',
      icon: <Sliders size={13} color="#16A34A" />,
    };
  };

  // Extract QR ID from reference string (e.g. "QR-17933... (name)")
  const extractQrId = (ref = '', entityId = '') => {
    if (entityId && entityId.startsWith('QR-')) return entityId;
    if (entityId && entityId.startsWith('VK-')) return entityId;
    const match = ref.match(/(QR-\d+|VK-QR-\d+)/);
    return match ? match[1] : null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header Card */}
      <div className="vk-card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <History size={20} color="#00891D" />
              <h2 className="vk-card-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Audit History
              </h2>
            </div>
            <p className="vk-card-subtitle" style={{ margin: 0 }}>
              Operational log of QR code publications, approvals, state transitions, and administrative events.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={async () => {
                setIsRefreshing(true);
                if (fetchAuditEvents) await fetchAuditEvents();
                setTimeout(() => setIsRefreshing(false), 400);
                if (showToast) showToast('Audit events reloaded successfully');
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Refresh audit event records"
            >
              <RotateCw size={14} className={isRefreshing ? 'vk-spin' : ''} />
              <span>Refresh Log</span>
            </button>

            <button
              type="button"
              onClick={handleExportAuditCSV}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Export audit log to CSV"
            >
              <FileSpreadsheet size={14} color="#00891D" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Multi-Filter Toolbar */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: '1 1 540px', minWidth: '380px' }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Audit ID, QR name, QR ID, or change summary..."
              value={auditSearch}
              onChange={(e) => {
                setAuditSearch(e.target.value);
                setAuditPage(1);
              }}
              className="input-field"
              style={{ paddingLeft: '38px', height: '38px', fontSize: '13px', width: '100%' }}
            />
            {auditSearch && (
              <button
                type="button"
                onClick={() => setAuditSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={14} color="#9CA3AF" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Action:</label>
            <select
              value={actionCategoryFilter}
              onChange={(e) => {
                setActionCategoryFilter(e.target.value);
                setAuditPage(1);
              }}
              className="input-field"
              style={{ height: '38px', fontSize: '13px', minWidth: '150px' }}
            >
              <option value="all">All Actions</option>
              <option value="created">Created & Published</option>
              <option value="activated">Activated</option>
              <option value="paused">Paused / Draft</option>
              <option value="approval">Governance Approvals</option>
              <option value="updated">Configuration Edits</option>
              <option value="export">Downloads & Exports</option>
              <option value="deleted">Deletions</option>
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Date:</label>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setAuditPage(1);
              }}
              className="input-field"
              style={{ height: '38px', fontSize: '13px', minWidth: '120px' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Outcome Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Outcome:</label>
            <select
              value={outcomeFilter}
              onChange={(e) => {
                setOutcomeFilter(e.target.value);
                setAuditPage(1);
              }}
              className="input-field"
              style={{ height: '38px', fontSize: '13px', minWidth: '120px' }}
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Reset Filters */}
          {isAuditFilterActive && (
            <button
              type="button"
              onClick={handleResetAuditFilters}
              className="btn btn-secondary btn-sm"
              style={{ height: '38px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#DC2626' }}
            >
              <X size={14} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Events Table */}
      <div className="vk-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vk-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>Audit ID</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>Action Performed</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>Target Entity / QR</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>Version Diff / Change Summary</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>Outcome</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: '#6B7280' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <History size={36} color="#D1D5DB" />
                      <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>No audit events found</p>
                      <p style={{ margin: 0, fontSize: '13px' }}>Try broadening your search or resetting filters.</p>
                      {isAuditFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetAuditFilters}
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: '8px' }}
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAuditLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const targetQrId = extractQrId(log.reference, log.entityId);

                  return (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s ease' }}
                      className="hover:bg-gray-50"
                    >
                      {/* Audit ID */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#1F2937' }}>
                            {log.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(log.id, log.id)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: '#9CA3AF' }}
                            title="Copy Audit ID"
                          >
                            {copiedId === log.id ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                          {log.timestamp}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          ISO Recorded
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 9px',
                            borderRadius: '14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {badge.icon}
                          <span>{log.action}</span>
                        </span>
                      </td>

                      {/* Target Entity / QR */}
                      <td style={{ padding: '12px 16px' }}>
                        {targetQrId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQrId(targetQrId);
                              setActiveScreen('details');
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              textAlign: 'left',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                            title="Click to view QR details"
                          >
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#00891D', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {log.entityName || log.reference?.split('(')[1]?.replace(')', '') || targetQrId}
                              <ExternalLink size={12} />
                            </span>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#6B7280' }}>
                              {targetQrId}
                            </span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 500 }}>
                            {log.reference || 'System Catalog'}
                          </span>
                        )}
                      </td>

                      {/* Version Diff / Details */}
                      <td style={{ padding: '12px 16px', maxWidth: '320px' }}>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#374151',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={log.versionDiff}
                        >
                          {log.versionDiff || 'State verified'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          Decision: {log.decision || 'Executed'}
                        </div>
                      </td>

                      {/* Outcome Status */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: log.outcome === 'Warning' ? '#FEF3C7' : log.outcome === 'Failed' ? '#FEE2E2' : '#DCFCE7',
                            color: log.outcome === 'Warning' ? '#B45309' : log.outcome === 'Failed' ? '#B91C1C' : '#15803D',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: log.outcome === 'Warning' ? '#D97706' : log.outcome === 'Failed' ? '#DC2626' : '#16A34A',
                            }}
                          />
                          <span>{log.outcome || 'Success'}</span>
                        </span>
                      </td>

                      {/* Actions: View Details Button */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAudit(log)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Inspect full audit event details"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredAuditLogs.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              borderTop: '1px solid #E5E7EB',
              background: '#F9FAFB',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={validAuditPage === 1}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 10px', opacity: validAuditPage === 1 ? 0.5 : 1, cursor: validAuditPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', padding: '0 8px' }}>
                {validAuditPage} / {totalAuditPages}
              </span>

              <button
                type="button"
                onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))}
                disabled={validAuditPage === totalAuditPages}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 10px', opacity: validAuditPage === totalAuditPages ? 0.5 : 1, cursor: validAuditPage === totalAuditPages ? 'not-allowed' : 'pointer' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* AUDIT EVENT INSPECTION DRAWER / MODAL */}
      {/* ============================================================ */}
      {selectedAudit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setSelectedAudit(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '100%',
              background: '#FFFFFF',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#00891D" />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                    Audit Event Details
                  </h3>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                  Reference: {selectedAudit.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>

            {/* Event Summary Grid */}
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Timestamp</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>{selectedAudit.timestamp}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Decision</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>{selectedAudit.decision || 'Executed'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Outcome</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669', marginTop: '2px' }}>{selectedAudit.outcome || 'Success'}</div>
                  </div>
                </div>
              </div>

              {/* Action & Target Entity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>Operation Performed</span>
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontWeight: 600, fontSize: '14px' }}>
                  {selectedAudit.action}
                </div>
              </div>

              {/* Target Reference */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>Target Entity</span>
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                      {selectedAudit.entityName || selectedAudit.reference}
                    </div>
                    {selectedAudit.entityId && (
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#6B7280' }}>
                        ID: {selectedAudit.entityId}
                      </div>
                    )}
                  </div>
                  {extractQrId(selectedAudit.reference, selectedAudit.entityId) && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = extractQrId(selectedAudit.reference, selectedAudit.entityId);
                        setSelectedQrId(targetId);
                        setActiveScreen('details');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>View QR</span>
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Screen09_ScanHistory = ScanHistory;
export const AuditHistory = ScanHistory;
export const Screen09_AuditHistory = ScanHistory;
export default ScanHistory;
