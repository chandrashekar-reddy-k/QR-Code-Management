import React, { useState, useMemo } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import { INITIAL_USERS } from '../data/mockData';
import {
  Search,
  Filter,
  Plus,
  Smartphone,
  Download,
  Pause,
  Play,
  Archive,
  ExternalLink,
  MoreVertical,
  CheckSquare,
  Square,
  Eye,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  Edit2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';

export const QRListing = () => {
  const {
    qrCodes,
    setQrCodes,
    setActiveScreen,
    setSelectedQrId,
    setWizardData,
    setWizardStep,
    togglePauseQR,
    archiveQR,
    setTestScanModal,
    showToast,
    hasPermission,
    currentRole,
  } = useQR();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Bulk Assign Owner Modal State
  const [isAssignOwnerOpen, setIsAssignOwnerOpen] = useState(false);
  const [targetOwner, setTargetOwner] = useState(INITIAL_USERS[1]?.name || 'Anita Rao');

  // Filter logic
  const filteredList = useMemo(() => {
    return qrCodes.filter((item) => {
      // Role scope filter
      if (currentRole === 'Hub Manager' && item.hubId && item.hubId !== 'HUB-01') {
        return false;
      }
      if (currentRole === 'VGE' && item.type !== 'Referral' && item.owner !== 'Kiran Kumar (VGE)') {
        return false;
      }

      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.campaign && item.campaign.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.owner.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [qrCodes, searchQuery, typeFilter, statusFilter, currentRole]);

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

  const handleBulkArchive = () => {
    selectedIds.forEach((id) => archiveQR(id));
    showToast(`Bulk archived ${selectedIds.length} QR codes.`);
    setSelectedIds([]);
  };

  const handleBulkAssignOwnerSubmit = () => {
    setQrCodes((prev) =>
      prev.map((q) => (selectedIds.includes(q.id) ? { ...q, owner: targetOwner } : q))
    );
    showToast(`Assigned ${selectedIds.length} QR codes to ${targetOwner}.`);
    setIsAssignOwnerOpen(false);
    setSelectedIds([]);
  };

  const handleBulkExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Name,Type,Status,Campaign,Hub,Owner,Scans,Registrations,Orders']
        .concat(
          filteredList
            .filter((q) => selectedIds.length === 0 || selectedIds.includes(q.id))
            .map(
              (q) =>
                `"${q.id}","${q.name}","${q.type}","${q.status}","${q.campaign || ''}","${q.hubName || ''}","${q.owner || ''}",${q.metrics?.scans || 0},${q.metrics?.verifiedRegistrations || 0},${q.metrics?.firstOrders || 0}`
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

  // Individual Row Actions
  const handleDownloadQR = (qr) => {
    showToast(`Generating downloadable print & digital package for ${qr.name}...`);
    setSelectedQrId(qr.id);
    setActiveScreen('details');
  };

  const handleEditQR = (qr) => {
    setWizardData({
      name: qr.name,
      type: qr.type,
      purpose: qr.purpose || `Strategic distribution for ${qr.name}`,
      owner: qr.owner,
      department: qr.department || 'Operations',
      campaignId: qr.campaignId || 'CMP-001',
      campaign: qr.campaign || 'Direct Distribution',
      hubId: qr.hubId || 'HUB-01',
      village: qr.village || 'Phirangipuram Village',
      expiryDate: qr.expiryDate || '2026-12-31',
      redirectCode: qr.destination?.redirectCode || qr.id.toLowerCase(),
      androidUrl: qr.destination?.androidUrl || '',
      iosUrl: qr.destination?.iosUrl || '',
      fallbackUrl: qr.destination?.fallbackUrl || 'https://villagkart.com',
      routingBehavior: qr.destination?.routingBehavior || 'auto',
      template: qr.design?.template || 'VillagKart Branded',
      fgColor: qr.design?.fgColor || '#00891D',
      bgColor: qr.design?.bgColor || '#FFFFFF',
      showLogo: qr.design?.showLogo ?? true,
      hasCtaFrame: qr.design?.hasCtaFrame ?? true,
      ctaText: qr.design?.ctaText || 'SCAN TO CONNECT',
      campaignTitle: qr.design?.campaignTitle || qr.name,
      supportingText: qr.design?.supportingText || 'VillagKart Rural Commerce',
      errorCorrection: qr.design?.errorCorrection || 'Q',
      exportWidth: 15,
      exportHeight: 15,
      exportUnit: 'cm',
    });
    setWizardStep(1);
    setActiveScreen('wizard');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title Card */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">QR Code Inventory</h2>
            <p className="vk-card-subtitle">
              Central catalog for managing dynamic routing, lifecycle states, bulk operations and asset exports
            </p>
          </div>
          <button
            onClick={() => {
              setWizardStep(1);
              setActiveScreen('wizard');
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={15} />
            Create QR
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '260px' }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by QR name, ID, campaign or owner..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>QR Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-control"
              style={{ width: '160px', padding: '7px 10px', fontSize: '13px' }}
            >
              <option value="all">All Types (7)</option>
              <option value="App Download">App Download</option>
              <option value="Campaign">Campaign</option>
              <option value="Vehicle">Vehicle (Shop-on-Wheels)</option>
              <option value="Referral">Referral</option>
              <option value="Product">Product Catalogue</option>
              <option value="Feedback">Feedback</option>
              <option value="Payment">Payment (UPI)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-control"
              style={{ width: '150px', padding: '7px 10px', fontSize: '13px' }}
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Paused">Paused</option>
              <option value="Expired">Expired</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* Export Action button */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleBulkExportCSV} className="btn btn-secondary btn-sm" title="Export CSV summary of QR codes">
              <FileSpreadsheet size={15} />
              Export
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
              <button onClick={() => setIsAssignOwnerOpen(true)} className="btn btn-secondary btn-sm">
                <UserPlus size={13} />
                Assign Owner
              </button>
              <button onClick={handleBulkPause} className="btn btn-secondary btn-sm">
                <Pause size={13} />
                Pause
              </button>
              <button onClick={handleBulkArchive} className="btn btn-secondary btn-sm" style={{ color: '#DC2626' }}>
                <Archive size={13} />
                Archive
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
                <th>Type</th>
                <th>Destination</th>
                <th>Campaign</th>
                <th>Territory</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Scans</th>
                <th>Conversions</th>
                <th>Last Modified</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ maxWidth: '380px', margin: '0 auto', color: '#6B7280' }}>
                      <AlertCircle size={36} color="#9CA3AF" style={{ marginBottom: '10px' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>No QR codes found</div>
                      <p style={{ fontSize: '13px', margin: '6px 0 16px 0' }}>
                        No QR codes match the current filter criteria or search query.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('all');
                          setStatusFilter('all');
                          setCurrentPage(1);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Clear all filters
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
                          }}
                          title="Click to test-scan in simulator"
                        >
                          <QRCodeRenderer
                            value={`https://qr.villagkart.com/${qr.destination?.redirectCode || qr.id}`}
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
                            setActiveScreen('details');
                          }}
                          style={{ fontWeight: 700, color: '#00891D', cursor: 'pointer', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={qr.name}
                        >
                          {qr.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'monospace' }}>
                          {qr.id} · {qr.version || 'v1.0'}
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <span className="badge badge-outline" style={{ fontWeight: 600 }}>
                          {qr.type}
                        </span>
                      </td>

                      {/* Destination */}
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#4B5563', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <code>/{qr.destination?.redirectCode || 'target'}</code>
                        </div>
                      </td>

                      {/* Campaign */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#111827', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {qr.campaign || 'Direct Distribution'}
                        </div>
                      </td>

                      {/* Territory */}
                      <td>
                        <div style={{ fontSize: '12px', color: '#374151' }}>
                          {qr.hubName || 'Phirangipuram Hub'}
                        </div>
                      </td>

                      {/* Owner */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#374151' }}>{qr.owner}</div>
                        <div style={{ fontSize: '10.5px', color: '#9CA3AF' }}>{qr.department}</div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge badge-${qr.status?.toLowerCase().replace(' ', '-')}`}>
                          {qr.status}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                          {qr.expiryDate || 'Unlimited'}
                        </div>
                      </td>

                      {/* Scans */}
                      <td>
                        <div style={{ fontWeight: 800, color: '#111827' }}>
                          {(qr.metrics?.scans || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Conversions */}
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#00891D', fontWeight: 700 }}>
                          {(qr.metrics?.verifiedRegistrations || 0).toLocaleString()} ({qr.metrics?.conversionRate || 0}%)
                        </div>
                      </td>

                      {/* Last Modified */}
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                          {qr.lastModified}
                        </div>
                      </td>

                      {/* Row Actions: View Details, Download, Edit, Pause, Archive */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          {/* View Details */}
                          <button
                            onClick={() => {
                              setSelectedQrId(qr.id);
                              setActiveScreen('details');
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px' }}
                            title="View Details"
                          >
                            <Eye size={14} color="#00891D" />
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

                          {/* Archive */}
                          <button
                            onClick={() => archiveQR(qr.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px' }}
                            title="Archive QR"
                          >
                            <Archive size={14} color="#DC2626" />
                          </button>
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

      {/* Bulk Assign Owner Modal */}
      {isAssignOwnerOpen && (
        <div className="modal-overlay" onClick={() => setIsAssignOwnerOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="#00891D" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Assign Owner</h3>
              </div>
              <button onClick={() => setIsAssignOwnerOpen(false)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#4B5563' }}>
                Assign <strong>{selectedIds.length}</strong> selected QR code{selectedIds.length > 1 ? 's' : ''} to an authorized team member:
              </p>
              <div className="form-group">
                <label className="form-label">Select Authorized Owner</label>
                <select
                  value={targetOwner}
                  onChange={(e) => setTargetOwner(e.target.value)}
                  className="form-control"
                >
                  {INITIAL_USERS.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role} · {u.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsAssignOwnerOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleBulkAssignOwnerSubmit} className="btn btn-primary btn-sm">
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { QRListing as Screen02_Listing };
export default QRListing;
