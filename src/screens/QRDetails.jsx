import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  XCircle,
  HelpCircle,
  QrCode,
  Search,
} from 'lucide-react';

export const QRDetails = () => {
  const {
    selectedQrId,
    setSelectedQrId,
    setActiveScreen,
    setWizardData,
    setWizardStep,
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

  // 3 Governance Options: Select QR (All), Change Req, Rejected (Removed 'Normal')
  const changesQrs = qrCodes.filter((q) => q.status === 'Changes Requested');
  const rejectedQrs = qrCodes.filter((q) => q.status === 'Rejected');
  const selectAllQrs = qrCodes;

  const [categoryFilter, setCategoryFilter] = useState(() => {
    const cur = qrCodes.find((q) => q.id === selectedQrId);
    if (cur?.status === 'Changes Requested') return 'changes';
    if (cur?.status === 'Rejected') return 'rejected';
    return 'select_qr';
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Keep category in sync if selectedQrId changes from outside
  useEffect(() => {
    const cur = qrCodes.find((q) => q.id === selectedQrId);
    if (cur?.status === 'Changes Requested') setCategoryFilter('changes');
    else if (cur?.status === 'Rejected') setCategoryFilter('rejected');
    else if (cur) setCategoryFilter('select_qr');
  }, [selectedQrId, qrCodes]);

  const handleCategorySelect = (cat) => {
    setCategoryFilter(cat);
    const targetList = cat === 'changes' ? changesQrs : cat === 'rejected' ? rejectedQrs : selectAllQrs;
    if (targetList.length > 0 && !targetList.some((q) => q.id === selectedQrId)) {
      setSelectedQrId(targetList[0].id);
    }
  };

  const rawCategoryQrs = categoryFilter === 'changes' ? changesQrs : categoryFilter === 'rejected' ? rejectedQrs : selectAllQrs;
  const currentCategoryQrs = rawCategoryQrs.filter((q) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      q.name.toLowerCase().includes(term) ||
      q.id.toLowerCase().includes(term) ||
      (q.village && q.village.toLowerCase().includes(term)) ||
      (q.hubName && q.hubName.toLowerCase().includes(term))
    );
  });

  const qr = qrCodes.find((q) => q.id === selectedQrId) || rawCategoryQrs[0] || qrCodes[0];
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

  const handleDownload = () => {
    const canvas = document.querySelector('.details-qr-preview canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${qr.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    showToast(`Downloaded QR asset package for ${qr.name}.`);
  };

  const handleEdit = () => {
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
      {/* Top Back & Quick Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setActiveScreen('listing')}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={15} />
            Back to QR Inventory
          </button>
        </div>

        {/* Page 8 Required Actions: Edit, Download, Copy URL, Pause, Archive */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleEdit}
            className="btn btn-secondary btn-sm"
            title="Edit QR Configuration"
          >
            <Edit3 size={14} color="#00891D" />
            Edit
          </button>
          <button
            onClick={handleDownload}
            className="btn btn-secondary btn-sm"
            title="Download QR Asset Package"
          >
            <Download size={14} />
            Download
          </button>
          <button
            onClick={copyUrl}
            className="btn btn-secondary btn-sm"
            title="Copy Redirect URL"
          >
            {copiedLink ? <Check size={14} color="#00891D" /> : <Copy size={14} />}
            {copiedLink ? 'Copied' : 'Copy URL'}
          </button>
          <button
            onClick={() => togglePauseQR(qr.id)}
            className="btn btn-secondary btn-sm"
            title={qr.status === 'Active' ? 'Pause QR' : 'Resume QR'}
          >
            {qr.status === 'Active' ? <Pause size={14} color="#D97706" /> : <Play size={14} color="#00891D" />}
            {qr.status === 'Active' ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={() => archiveQR(qr.id)}
            className="btn btn-secondary btn-sm"
            style={{ color: '#DC2626' }}
            title="Archive QR Code"
          >
            <Archive size={14} />
            Archive
          </button>
          <button
            onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
            className="btn btn-secondary btn-sm"
            title="Open Interactive Smartphone Simulator"
          >
            <Smartphone size={14} color="#00891D" />
            Test Scan
          </button>
        </div>
      </div>

      {/* 3 Options QR Governance Selector: Select QR, Change Req, Rejected */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {/* Category Filter Buttons & Quick Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', marginRight: '4px' }}>
              Category:
            </span>

            {/* Option 1: Select QR */}
            <button
              type="button"
              onClick={() => handleCategorySelect('select_qr')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                border: categoryFilter === 'select_qr' ? '1px solid #00891D' : '1px solid #D1D5DB',
                background: categoryFilter === 'select_qr' ? '#E8F5EA' : '#FFFFFF',
                color: categoryFilter === 'select_qr' ? '#006B17' : '#4B5563',
              }}
            >
              <QrCode size={14} color={categoryFilter === 'select_qr' ? '#00891D' : '#6B7280'} />
              <span>Select QR</span>
              <span style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                background: categoryFilter === 'select_qr' ? '#00891D' : '#F3F4F6',
                color: categoryFilter === 'select_qr' ? '#FFFFFF' : '#6B7280',
              }}>
                {selectAllQrs.length}
              </span>
            </button>

            {/* Option 2: Change Req */}
            <button
              type="button"
              onClick={() => handleCategorySelect('changes')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                border: categoryFilter === 'changes' ? '1px solid #F59E0B' : '1px solid #D1D5DB',
                background: categoryFilter === 'changes' ? '#FEF3C7' : '#FFFFFF',
                color: categoryFilter === 'changes' ? '#B45309' : '#4B5563',
              }}
            >
              <AlertTriangle size={14} color={categoryFilter === 'changes' ? '#D97706' : '#6B7280'} />
              <span>Change Req</span>
              <span style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                background: categoryFilter === 'changes' ? '#D97706' : '#F3F4F6',
                color: categoryFilter === 'changes' ? '#FFFFFF' : '#6B7280',
              }}>
                {changesQrs.length}
              </span>
            </button>

            {/* Option 3: Rejected */}
            <button
              type="button"
              onClick={() => handleCategorySelect('rejected')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                border: categoryFilter === 'rejected' ? '1px solid #EF4444' : '1px solid #D1D5DB',
                background: categoryFilter === 'rejected' ? '#FEE2E2' : '#FFFFFF',
                color: categoryFilter === 'rejected' ? '#DC2626' : '#4B5563',
              }}
            >
              <XCircle size={14} color={categoryFilter === 'rejected' ? '#DC2626' : '#6B7280'} />
              <span>Rejected</span>
              <span style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                background: categoryFilter === 'rejected' ? '#DC2626' : '#F3F4F6',
                color: categoryFilter === 'rejected' ? '#FFFFFF' : '#6B7280',
              }}>
                {rejectedQrs.length}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder={`Filter in ${categoryFilter === 'changes' ? 'Change Req' : categoryFilter === 'rejected' ? 'Rejected' : 'Select QR'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '30px', fontSize: '12px', height: '32px' }}
            />
          </div>
        </div>

        {/* Display ALL QR Codes in this Category */}
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
          <div style={{
            fontSize: '12px',
            color: '#4B5563',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>
              Displaying all <strong>{currentCategoryQrs.length}</strong> QR code{currentCategoryQrs.length === 1 ? '' : 's'} in{' '}
              <strong style={{ color: categoryFilter === 'changes' ? '#B45309' : categoryFilter === 'rejected' ? '#DC2626' : '#00891D' }}>
                {categoryFilter === 'changes' ? 'Change Req' : categoryFilter === 'rejected' ? 'Rejected' : 'Select QR'}
              </strong>
              {' '}— click any card to inspect in full detail below:
            </span>
          </div>

          {currentCategoryQrs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
              No QR codes found matching this category filter.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '10px',
              maxHeight: categoryFilter === 'select_qr' ? '280px' : 'auto',
              overflowY: categoryFilter === 'select_qr' ? 'auto' : 'visible',
              paddingRight: categoryFilter === 'select_qr' ? '4px' : '0',
            }}>
              {currentCategoryQrs.map((item) => {
                const isSelected = item.id === qr.id;
                let activeBorder = '#00891D';
                let activeBg = '#F0FDF4';
                if (item.status === 'Changes Requested') {
                  activeBorder = '#F59E0B';
                  activeBg = '#FFFBEB';
                } else if (item.status === 'Rejected') {
                  activeBorder = '#EF4444';
                  activeBg = '#FEF2F2';
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedQrId(item.id)}
                    style={{
                      border: isSelected ? `2px solid ${activeBorder}` : '1px solid #E5E7EB',
                      background: isSelected ? activeBg : '#FFFFFF',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#374151' }}>
                        {item.id}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge badge-${item.status?.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                          {item.status}
                        </span>
                        {isSelected && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: activeBorder,
                            background: '#FFFFFF',
                            border: `1px solid ${activeBorder}`,
                            borderRadius: '10px',
                            padding: '1px 6px',
                          }}>
                            ● Viewing Below
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isSelected ? '#111827' : '#374151',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                        {item.hubName || item.village || 'Phirangipuram Hub'} · {item.type}
                      </div>
                    </div>

                    {item.reviewerComments && (item.status === 'Changes Requested' || item.status === 'Rejected') ? (
                      <div style={{
                        fontSize: '11px',
                        color: item.status === 'Rejected' ? '#B91C1C' : '#92400E',
                        background: item.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        lineHeight: 1.35,
                      }}>
                        {item.status === 'Rejected' ? '⛔ ' : '⚠️ '}
                        {item.reviewerComments.replace(/^(Reviewer Feedback:|Rejected by Security Approver:|Rejected by Financial Approver:)\s*/i, '').slice(0, 95)}...
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '10.5px',
                        color: '#6B7280',
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        /{item.destination?.redirectCode || 'target'} ➔ {item.destination?.fallbackUrl}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected QR Detail Section Anchor */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Inspecting Details:
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
            {qr.id} — {qr.name}
          </span>
          <span className={`badge badge-${qr.status?.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '11px' }}>
            {qr.status}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#6B7280' }}>
          {qr.hubName || 'Phirangipuram Hub'} · {qr.village}
        </div>
      </div>

      {/* Governance Status Reflection Banners */}
      {qr.status === 'Changes Requested' && (
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', gap: '14px', maxWidth: '780px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#92400E' }}>
                Reviewer Requested Changes (Action Required)
              </div>
              <div style={{ fontSize: '13px', color: '#B45309', marginTop: '4px', lineHeight: 1.5 }}>
                "{qr.reviewerComments || 'Reviewer requested adjustments to target destination URL, artwork branding, or campaign attribution parameters.'}"
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                Status: <span className="badge badge-changes-requested">Changes Requested</span> · Make updates in Create QR Code and resubmit for approval.
              </div>
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="btn btn-primary btn-sm"
            style={{
              background: '#D97706',
              borderColor: '#D97706',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              padding: '8px 14px',
            }}
          >
            <Edit3 size={15} />
            Edit & Resubmit in Create QR Code
          </button>
        </div>
      )}

      {qr.status === 'Rejected' && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', gap: '14px', maxWidth: '780px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <XCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>
                QR Code Rejected by Governance Reviewer
              </div>
              <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '4px', lineHeight: 1.5 }}>
                "{qr.reviewerComments || 'Destination or content failed security/compliance checks and cannot be authorized for distribution.'}"
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                Status: <span className="badge badge-rejected">Rejected</span> · 🚫 Physical printing & edge redirection are blocked for this code.
              </div>
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="btn btn-secondary btn-sm"
            style={{
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              padding: '8px 14px',
            }}
          >
            <RotateCw size={15} />
            Reconfigure in Create QR Code
          </button>
        </div>
      )}

      {qr.status === 'Active' && (
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '10px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '13px',
          color: '#166534',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#00891D" />
            <span>
              <strong>Approved & Live in Production:</strong> Scans route to <code style={{ background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', color: '#166534' }}>{dest.fallbackUrl || dest.androidUrl}</code>
            </span>
          </div>
          <button
            onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
            className="btn btn-sm btn-ghost"
            style={{ color: '#00891D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Smartphone size={14} />
            Test Scan Now
          </button>
        </div>
      )}

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
              value={dest.fallbackUrl || dest.androidUrl || `https://qr.villagkart.com/${dest.redirectCode || qr.id}`}
              fgColor={qr.design?.fgColor || '#00891D'}
              bgColor="#FFFFFF"
              size={110}
              hasCtaFrame={false}
              showLogo={qr.design?.showLogo ?? true}
            />
          </div>

          {/* Core Info */}
          <div style={{ minWidth: 0 }}>
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
              <div>Created: <strong>{qr.createdAt || '2026-03-01'}</strong></div>
              <div>Last Modified: <strong>{qr.lastModified || '2026-03-20'}</strong></div>
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
            { id: 'overview', label: 'Overview & Performance' },
            { id: 'destinations', label: 'Destinations & Routing' },
            { id: 'assets', label: 'Assets & Print Specs' },
            { id: 'history', label: `Scan History (${qrEvents.length})` },
            { id: 'analytics', label: 'Analytics Breakdown' },
            { id: 'audit', label: `Audit Trail (${qrAudit.length})` },
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
 
export { QRDetails as Screen08_Details };
export default QRDetails;
