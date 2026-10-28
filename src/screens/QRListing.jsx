import React, { useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import {
  Search,
  Plus,
  Download,
  Pause,
  Play,
  ExternalLink,
  CheckSquare,
  Square,
  Eye,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const QRListing = () => {
  const {
    qrCodes,
    setActiveScreen,
    setSelectedQrId,
    setDetailsViewMode,
    startNewQRCode,
    startEditQRCode,
    togglePauseQR,
    requestDeleteQR,
    setTestScanModal,
    showToast,
    currentRole,
    listingStatusFilter,
    setListingStatusFilter,
  } = useQR();

  const [searchQuery, setSearchQuery] = useState('');
  const statusFilter = listingStatusFilter;
  const setStatusFilter = (val) => {
    setListingStatusFilter(val);
    setCurrentPage(1);
  };
  const [selectedIds, setSelectedIds] = useState([]);

  // Counts for Lifecycle Tabs
  const countAll = qrCodes.length;
  const countActive = qrCodes.filter((q) => q.status === 'Active').length;
  const countDraft = qrCodes.filter((q) => q.status === 'Draft').length;
  const countPending = qrCodes.filter((q) => q.status === 'Pending Approval').length;
  const countPaused = qrCodes.filter((q) => q.status === 'Paused').length;
  const countExpired = qrCodes.filter((q) => q.status === 'Expired').length;

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Filter logic: Active, Draft, Pending Approval, Paused, Expired
  const filteredList = useMemo(() => {
    return qrCodes.filter((item) => {
      // Role scope filter
      if (currentRole === 'Hub Manager' && item.hubId && item.hubId !== 'HUB-01') {
        return false;
      }
      if (currentRole === 'VGE' && item.type !== 'Referral' && item.owner !== 'Kiran Kumar (VGE)') {
        return false;
      }

      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        (item.destination?.redirectCode && item.destination.redirectCode.toLowerCase().includes(term)) ||
        (item.destination?.fallbackUrl && item.destination.fallbackUrl.toLowerCase().includes(term)) ||
        (item.destination?.androidUrl && item.destination.androidUrl.toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [qrCodes, searchQuery, statusFilter, currentRole]);

  // Total pages and sliced data for pagination
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, validPage, pageSize]);

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedList.map((q) => q.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkPause = () => {
    selectedIds.forEach((id) => togglePauseQR(id));
    showToast(`Bulk updated status for ${selectedIds.length} QR codes.`);
    setSelectedIds([]);
  };

  const handleBulkExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Name,Destination,Status,Scans,Registrations']
        .concat(
          filteredList
            .filter((q) => selectedIds.length === 0 || selectedIds.includes(q.id))
            .map(
              (q) =>
                `"${q.id}","${q.name}","${q.destination?.fallbackUrl || q.destination?.androidUrl || ''}","${q.status}",${q.metrics?.scans || 0},${q.metrics?.verifiedRegistrations || 0}`
            )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `villagkart_qr_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV dataset successfully!');
  };

  // Individual Row Actions: Directly download high-res QR asset
  const handleDownloadQR = (qr) => {
    if (!qr) return;
    const targetUrl =
      qr.destination?.fallbackUrl ||
      qr.destination?.androidUrl ||
      `https://qr.villagkart.com/${qr.destination?.redirectCode || qr.id}`;

    const canvas = document.createElement('canvas');
    QRCode.toCanvas(
      canvas,
      targetUrl,
      {
        width: 1000,
        margin: 2,
        color: {
          dark: qr.design?.fgColor || '#00891D',
          light: qr.design?.bgColor || '#FFFFFF',
        },
        errorCorrectionLevel: qr.design?.showLogo ? 'H' : qr.design?.errorCorrection || 'Q',
      },
      (err) => {
        if (err) {
          showToast(`Error generating download asset: ${err.message}`, 'error');
          return;
        }

        // Draw centered VK brand emblem if showLogo is true
        if (qr.design?.showLogo ?? true) {
          const ctx = canvas.getContext('2d');
          const cx = 500;
          const cy = 500;
          const squareSize = Math.round(1000 * 0.24);
          const squareX = Math.round(cx - squareSize / 2);
          const squareY = Math.round(cy - squareSize / 2);
          const cornerR = Math.max(Math.round(squareSize * 0.14), 14);

          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.16)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 2;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerR);
          } else {
            ctx.rect(squareX, squareY, squareSize, squareSize);
          }
          ctx.fill();
          ctx.restore();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 5;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerR);
          } else {
            ctx.rect(squareX, squareY, squareSize, squareSize);
          }
          ctx.stroke();

          ctx.fillStyle = qr.design?.fgColor || '#00891D';
          ctx.font = '800 110px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('VK', cx, cy);
        }

        const link = document.createElement('a');
        link.download = `${(qr.name || qr.id).toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Downloaded QR asset for ${qr.name}!`);
      }
    );
  };

  const handleEditQR = (qr) => {
    startEditQRCode(qr);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title Card */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">QR Management</h2>
            <p className="vk-card-subtitle">
              Central operations catalog for creating, dynamic routing, lifecycle tracking and asset exports
            </p>
          </div>
          <button
            id="btn-create-qr"
            onClick={() => startNewQRCode()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '8px 16px', fontSize: '13px' }}
          >
            <Plus size={16} />
            <span>Create QR</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="vk-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Lifecycle Status Tabs: All, Active, Paused, Pending for Approval */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          borderBottom: '1px solid #F1F5F9',
        }}>
          {[
            { id: 'all', label: 'All QR Codes', count: countAll, color: '#374151', bg: '#F3F4F6' },
            { id: 'Active', label: 'Active', count: countActive, color: '#15803D', bg: '#DCFCE7' },
            { id: 'Draft', label: 'Drafts', count: countDraft, color: '#4338CA', bg: '#EEF2FF' },
            { id: 'Pending Approval', label: 'Pending for Approval', count: countPending, color: '#C2410C', bg: '#FFEDD5', isAlert: countPending > 0 },
            { id: 'Paused', label: 'Paused', count: countPaused, color: '#92400E', bg: '#FEF3C7' },
            { id: 'Expired', label: 'Expired', count: countExpired, color: '#B91C1C', bg: '#FEE2E2' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? '1.5px solid #00891D' : '1px solid #E5E7EB',
                  background: isActive ? '#F0FDF4' : '#FFFFFF',
                  color: isActive ? '#006B17' : '#4B5563',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: tab.isAlert ? tab.bg : isActive ? '#00891D' : '#F3F4F6',
                  color: tab.isAlert ? tab.color : isActive ? '#FFFFFF' : '#4B5563',
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '260px' }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by QR name, unique ID, or destination URL..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', color: '#6B7280', fontWeight: 500 }}>
              Showing {filteredList.length} of {qrCodes.length} QR codes
            </span>
            <button onClick={handleBulkExportCSV} className="btn btn-secondary btn-sm" title="Export CSV summary of QR codes">
              <FileSpreadsheet size={15} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: '#E8F5EA',
            border: '1px solid #C8E6C9',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '13px',
          }}>
            <div style={{ fontWeight: 700, color: '#006B17' }}>
              ✓ {selectedIds.length} QR code{selectedIds.length > 1 ? 's' : ''} selected
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={handleBulkPause} className="btn btn-secondary btn-sm">
                <Pause size={13} />
                Pause
              </button>
              <button onClick={handleBulkExportCSV} className="btn btn-secondary btn-sm">
                <Download size={13} />
                Download Assets
              </button>
              <button onClick={handleBulkExportCSV} className="btn btn-primary btn-sm">
                <FileSpreadsheet size={13} />
                Export CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Production Table */}
      <div className="vk-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="vk-table-container" style={{ margin: 0, border: 'none' }}>
          <table className="vk-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <button
                    onClick={handleSelectAll}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    title="Select All on page"
                  >
                    {selectedIds.length > 0 && selectedIds.length === paginatedList.length ? (
                      <CheckSquare size={17} color="#00891D" />
                    ) : (
                      <Square size={17} color="#9CA3AF" />
                    )}
                  </button>
                </th>
                <th>QR Preview</th>
                <th>Name & Unique ID</th>
                <th>Destination</th>
                <th style={{ minWidth: '170px' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Scans</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ maxWidth: '380px', margin: '0 auto', color: '#6B7280' }}>
                      <AlertCircle size={36} color="#9CA3AF" style={{ marginBottom: '10px' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>No QR codes found</div>
                      <p style={{ fontSize: '13px', margin: '6px 0 16px 0' }}>
                        No QR codes match the current filter criteria or search query.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                          setCurrentPage(1);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Clear search and filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((qr) => {
                  const isSelected = selectedIds.includes(qr.id);
                  return (
                    <tr key={qr.id} style={isSelected ? { background: '#E8F5EA' } : {}}>
                      {/* Checkbox */}
                      <td>
                        <button
                          onClick={() => handleToggleSelect(qr.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                          {isSelected ? (
                            <CheckSquare size={17} color="#00891D" />
                          ) : (
                            <Square size={17} color="#9CA3AF" />
                          )}
                        </button>
                      </td>

                      {/* QR Preview Thumbnail */}
                      <td>
                        <div
                          onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            overflow: 'hidden',
                          }}
                          title="Click to test-scan in simulator"
                        >
                          <QRCodeRenderer
                            value={qr.destination?.fallbackUrl || qr.destination?.androidUrl || `https://qr.villagkart.com/${qr.destination?.redirectCode || qr.id}`}
                            fgColor={qr.design?.fgColor || '#00891D'}
                            bgColor="#FFFFFF"
                            size={38}
                            hasCtaFrame={false}
                            showLogo={false}
                          />
                        </div>
                      </td>

                      {/* Name & Unique ID */}
                      <td>
                        <div
                          onClick={() => {
                            setSelectedQrId(qr.id);
                            setDetailsViewMode('detail');
                            setActiveScreen('details');
                          }}
                          style={{ fontWeight: 700, color: '#00891D', cursor: 'pointer', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={qr.name}
                        >
                          {qr.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'monospace' }}>
                          {qr.id} · {qr.version || 'v1.0'}
                        </div>
                      </td>

                      {/* Destination */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{ fontSize: '11px', color: '#00891D', background: '#E8F5EA', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              /{qr.destination?.redirectCode || 'target'}
                            </code>
                            {(qr.destination?.fallbackUrl || qr.destination?.androidUrl) && (
                              <a
                                href={qr.destination.fallbackUrl || qr.destination.androidUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', color: '#00891D' }}
                                title={`Open target destination in new tab: ${qr.destination.fallbackUrl || qr.destination.androidUrl}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '10.5px',
                              color: '#6B7280',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={qr.destination?.fallbackUrl || qr.destination?.androidUrl || 'No target configured'}
                          >
                            {qr.destination?.fallbackUrl || qr.destination?.androidUrl || 'Direct Destination'}
                          </div>
                        </div>
                      </td>

                      {/* Status Column: Keep only Active, Paused, and Pending for Approval */}
                      <td style={{ verticalAlign: 'middle' }}>
                        {qr.status === 'Pending Approval' ? (
                          <span
                            className="badge badge-pending"
                            style={{
                              fontSize: '11px',
                              padding: '3px 9px',
                              fontWeight: 700,
                              background: '#FFEDD5',
                              color: '#C2410C',
                              border: '1px solid #FDBA74',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                            title="Pending Governance Review — click View icon in Actions to inspect and accept"
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EA580C' }} />
                            Pending for Approval
                          </span>
                        ) : qr.status === 'Paused' ? (
                          <span
                            className="badge badge-paused"
                            style={{
                              fontSize: '11px',
                              padding: '3px 9px',
                              fontWeight: 700,
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FCD34D',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                            title="Traffic Temporarily Paused"
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} />
                            Paused
                          </span>
                        ) : (
                          <span
                            className="badge badge-active"
                            style={{
                              fontSize: '11px',
                              padding: '3px 9px',
                              fontWeight: 700,
                              background: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                            title="Active Dynamic Traffic"
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Scans */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#111827', textAlign: 'center' }}>
                          {(qr.metrics?.scans || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Row Actions: View Details, Download, Edit, Pause, Delete (Uniform for all rows) */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>

                          {/* View Details */}
                          <button
                            id={`btn-view-${qr.id}`}
                            onClick={() => {
                              setSelectedQrId(qr.id);
                              setDetailsViewMode('detail');
                              setActiveScreen('details');
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{
                              padding: '5px',
                              ...(qr.status === 'Pending Approval' ? { background: '#FFEDD5', color: '#C2410C', border: '1px solid #FDBA74', borderRadius: '6px' } : {}),
                            }}
                            title={qr.status === 'Pending Approval' ? 'View & Accept Pending QR Code' : 'View Details'}
                          >
                            <Eye size={14} color={qr.status === 'Pending Approval' ? '#C2410C' : '#00891D'} />
                          </button>

                          {/* Download */}
                          <button
                            onClick={() => handleDownloadQR(qr)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px' }}
                            title="Download Assets"
                          >
                            <Download size={14} color="#4B5563" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEditQR(qr)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px' }}
                            title="Edit QR Configuration"
                          >
                            <Edit2 size={14} color="#4B5563" />
                          </button>

                          {/* Pause / Resume */}
                          <button
                            onClick={() => togglePauseQR(qr.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px' }}
                            title={qr.status === 'Active' ? 'Pause QR' : 'Resume QR'}
                          >
                            {qr.status === 'Active' ? <Pause size={14} color="#D97706" /> : <Play size={14} color="#00891D" />}
                          </button>

                          {/* Delete */}
                          {(currentRole === 'Admin' || qr.status === 'Draft' || qr.status === 'Rejected') && (
                            <button
                              onClick={() => requestDeleteQR(qr)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '5px' }}
                              title="Delete QR Permanently"
                            >
                              <Trash2 size={14} color="#DC2626" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{
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
        }}>
          <div>
            Showing <strong>{filteredList.length === 0 ? 0 : (validPage - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(validPage * pageSize, filteredList.length)}</strong> of <strong>{filteredList.length}</strong> QR codes
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
                style={{ width: '70px', padding: '4px 8px', fontSize: '12.5px' }}
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validPage <= 1}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              <span style={{ padding: '0 8px', fontWeight: 600, color: '#111827' }}>
                Page {validPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage >= totalPages}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
                title="Next Page"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { QRListing as Screen02_Listing };
export default QRListing;
