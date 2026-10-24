import React, { useState, useMemo } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
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
} from 'lucide-react';

export const QRListing = () => {
  const {
    qrCodes,
    setActiveScreen,
    setSelectedQrId,
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

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((q) => q.id));
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

  const handleBulkExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Name,Type,Status,Campaign,Hub,Scans,Registrations,Orders']
        .concat(
          filteredList
            .filter((q) => selectedIds.length === 0 || selectedIds.includes(q.id))
            .map(
              (q) =>
                `"${q.id}","${q.name}","${q.type}","${q.status}","${q.campaign || ''}","${q.hubName || ''}",${q.metrics?.scans || 0},${q.metrics?.verifiedRegistrations || 0},${q.metrics?.firstOrders || 0}`
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
            onClick={() => setActiveScreen('wizard')}
            className="btn btn-primary btn-sm"
          >
            <Plus size={15} />
            Create QR Code
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>QR Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value)}
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

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
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
            fontSize: '13px',
          }}>
            <div style={{ fontWeight: 700, color: '#006B17' }}>
              ✓ {selectedIds.length} QR code{selectedIds.length > 1 ? 's' : ''} selected
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleBulkPause} className="btn btn-secondary btn-sm">
                <Pause size={13} />
                Toggle Pause
              </button>
              <button onClick={handleBulkArchive} className="btn btn-secondary btn-sm" style={{ color: '#DC2626' }}>
                <Archive size={13} />
                Archive
              </button>
              <button onClick={handleBulkExportCSV} className="btn btn-primary btn-sm">
                <Download size={13} />
                Download Batch Assets
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Production Table */}
      <div className="vk-table-container">
        <table className="vk-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <button
                  onClick={handleSelectAll}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  {selectedIds.length > 0 && selectedIds.length === filteredList.length ? (
                    <CheckSquare size={17} color="#00891D" />
                  ) : (
                    <Square size={17} color="#9CA3AF" />
                  )}
                </button>
              </th>
              <th>Preview</th>
              <th>QR Name & ID</th>
              <th>Type & Routing Target</th>
              <th>Campaign & Territory</th>
              <th>Owner</th>
              <th>Status & Expiry</th>
              <th>Scans & Conv.</th>
              <th>Last Modified</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '48px 20px' }}>
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
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((qr) => {
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
                          width: '46px',
                          height: '46px',
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
                          size={40}
                          hasCtaFrame={false}
                          showLogo={false}
                        />
                      </div>
                    </td>

                    {/* QR Name and Unique ID */}
                    <td>
                      <div
                        onClick={() => {
                          setSelectedQrId(qr.id);
                          setActiveScreen('details');
                        }}
                        style={{ fontWeight: 700, color: '#00891D', cursor: 'pointer' }}
                      >
                        {qr.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#6B7280', fontFamily: 'monospace' }}>
                        {qr.id} · {qr.version || 'v1.0'}
                      </div>
                    </td>

                    {/* QR Type and Destination */}
                    <td>
                      <span className="badge badge-outline" style={{ fontWeight: 600, marginBottom: '2px' }}>
                        {qr.type}
                      </span>
                      <div style={{ fontSize: '11.5px', color: '#4B5563', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <code>/{qr.destination?.redirectCode || 'target'}</code>
                      </div>
                    </td>

                    {/* Campaign and Territory */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {qr.campaign || 'Direct Distribution'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                        {qr.hubName || 'Phirangipuram Hub'}
                      </div>
                    </td>

                    {/* Owner */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#374151' }}>{qr.owner}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{qr.department}</div>
                    </td>

                    {/* Status and Expiry */}
                    <td>
                      <span className={`badge badge-${qr.status?.toLowerCase().replace(' ', '-')}`}>
                        {qr.status}
                      </span>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                        Exp: {qr.expiryDate || 'Open'}
                      </div>
                    </td>

                    {/* Scans and Conversions */}
                    <td>
                      <div style={{ fontWeight: 800, color: '#111827' }}>
                        {(qr.metrics?.scans || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#00891D', fontWeight: 600 }}>
                        {(qr.metrics?.verifiedRegistrations || 0).toLocaleString()} reg ({qr.metrics?.conversionRate || 0}%)
                      </div>
                    </td>

                    {/* Last Modified */}
                    <td>
                      <div style={{ fontSize: '12px', color: '#4B5563' }}>{qr.lastModified}</div>
                    </td>

                    {/* Actions Menu */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Open Interactive Smartphone Test Scanner"
                        >
                          <Smartphone size={13} color="#00891D" />
                          <span>Test</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedQrId(qr.id);
                            setActiveScreen('details');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 8px' }}
                          title="Manage QR Code details, assets and versions"
                        >
                          <Eye size={13} />
                          <span>Manage</span>
                        </button>

                        <button
                          onClick={() => togglePauseQR(qr.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '5px' }}
                          title={qr.status === 'Active' ? 'Pause QR' : 'Resume QR'}
                        >
                          {qr.status === 'Active' ? <Pause size={13} color="#D97706" /> : <Play size={13} color="#00891D" />}
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
    </div>
  );
};
 
export { QRListing as Screen02_Listing };
export default QRListing;
