import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
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
  RotateCcw,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  QrCode,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const QRDetails = () => {
  const {
    selectedQrId,
    setSelectedQrId,
    detailsViewMode,
    setDetailsViewMode,
    selectedCampaignId,
    setSelectedCampaignId,
    campaigns,
    setActiveScreen,
    setWizardData,
    setWizardStep,
    qrCodes,
    setQrCodes,
    togglePauseQR,
    archiveQR,
    restoreQR,
    deleteQR,
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

  // 3 Governance Options: Select QR (All), Change Request, Rejected (Removed 'Normal')
  const changesQrs = qrCodes.filter((q) => q.status === 'Changes Requested');
  const rejectedQrs = qrCodes.filter((q) => q.status === 'Rejected');
  const selectAllQrs = qrCodes;

  const [categoryFilter, setCategoryFilter] = useState(() => {
    const cur = qrCodes.find((q) => q.id === selectedQrId);
    if (cur?.status === 'Changes Requested') return 'changes';
    if (cur?.status === 'Rejected') return 'rejected';
    return 'select_qr';
  });

  // View Mode: 'grid' (show all category boxes) | 'detail' (show complete entity page in full screen)
  const viewMode = detailsViewMode || 'grid';
  const setViewMode = setDetailsViewMode;
  const [searchQuery, setSearchQuery] = useState('');

  // Sync category when selectedQrId changes
  useEffect(() => {
    const cur = qrCodes.find((q) => q.id === selectedQrId);
    if (cur?.status === 'Changes Requested') setCategoryFilter('changes');
    else if (cur?.status === 'Rejected') setCategoryFilter('rejected');
    else if (cur) setCategoryFilter('select_qr');
  }, [selectedQrId, qrCodes]);

  const handleCategorySelect = (cat) => {
    setCategoryFilter(cat);
    setDetailsViewMode('grid');
  };

  const handleBoxClick = (id) => {
    setSelectedQrId(id);
    setDetailsViewMode('detail');
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
      link.download = `${(qr.name || qr.id).toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast(`Downloaded QR asset PNG for ${qr.name}.`);
    } else {
      showToast(`QR canvas generated.`);
    }
  };

  const handleDownloadSvg = () => {
    const targetUrl = dest.fallbackUrl || dest.androidUrl || `https://qr.villagkart.com/${dest.redirectCode || qr.id}`;
    QRCode.toString(
      targetUrl,
      {
        type: 'svg',
        color: {
          dark: qr.design?.fgColor || '#00891D',
          light: qr.design?.bgColor || '#FFFFFF',
        },
        errorCorrectionLevel: qr.design?.showLogo ? 'H' : (qr.design?.errorCorrection || 'Q'),
        margin: 2,
        width: 600,
      },
      (err, svgString) => {
        if (err) {
          showToast('Error generating SVG: ' + err.message);
          return;
        }
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(qr.name || qr.id).toLowerCase().replace(/[^a-z0-9]/g, '_')}_vector.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Downloaded production vector SVG for ${qr.name}!`);
      }
    );
  };

  const handleDownloadHighResPng = () => {
    const targetUrl = dest.fallbackUrl || dest.androidUrl || `https://qr.villagkart.com/${dest.redirectCode || qr.id}`;
    const highResCanvas = document.createElement('canvas');
    QRCode.toCanvas(
      highResCanvas,
      targetUrl,
      {
        width: 1200,
        margin: 2,
        color: {
          dark: qr.design?.fgColor || '#00891D',
          light: qr.design?.bgColor || '#FFFFFF',
        },
        errorCorrectionLevel: qr.design?.showLogo ? 'H' : (qr.design?.errorCorrection || 'Q'),
      },
      (err) => {
        if (err) {
          handleDownload();
          return;
        }
        if (qr.design?.showLogo) {
          const ctx = highResCanvas.getContext('2d');
          const cx = 600;
          const cy = 600;
          const r = Math.round(1200 * 0.135);
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.18)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 3;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(0,0,0,0.08)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = qr.design?.fgColor || '#00891D';
          ctx.font = '800 135px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('VK', cx, cy);
        }

        const link = document.createElement('a');
        link.download = `${(qr.name || qr.id).toLowerCase().replace(/[^a-z0-9]/g, '_')}_300dpi.png`;
        link.href = highResCanvas.toDataURL('image/png');
        link.click();
        showToast(`Downloaded 300 DPI high-res print PNG for ${qr.name}!`);
      }
    );
  };

  const handleDownloadSocialCard = () => {
    const targetUrl = dest.fallbackUrl || dest.androidUrl || `https://qr.villagkart.com/${dest.redirectCode || qr.id}`;
    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 1080;
    cardCanvas.height = 1080;
    const ctx = cardCanvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1080);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, '#F3FBF5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Header branding
    ctx.fillStyle = qr.design?.fgColor || '#00891D';
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VILLAGKART', 540, 110);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.fillText(qr.name || 'VillagKart QR Campaign', 540, 175);

    ctx.fillStyle = '#6B7280';
    ctx.font = '500 24px "Segoe UI", sans-serif';
    ctx.fillText(qr.campaign || 'Direct from Village Farmers to Doorstep', 540, 220);

    // Generate QR code onto offscreen canvas
    const qrTemp = document.createElement('canvas');
    QRCode.toCanvas(
      qrTemp,
      targetUrl,
      {
        width: 580,
        margin: 2,
        color: {
          dark: qr.design?.fgColor || '#00891D',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      },
      (err) => {
        if (err) {
          showToast('Error generating social card: ' + err.message);
          return;
        }

        // Draw card around QR
        ctx.fillStyle = '#FFFFFF';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(220, 260, 640, 640, 32);
          ctx.fill();
          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          ctx.fillRect(220, 260, 640, 640);
        }

        // Draw QR
        ctx.drawImage(qrTemp, 250, 290, 580, 580);

        // Center emblem
        const cx = 540;
        const cy = 580;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, 54, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = qr.design?.fgColor || '#00891D';
        ctx.font = 'bold 38px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VK', cx, cy);

        // Footer CTA
        ctx.fillStyle = qr.design?.fgColor || '#00891D';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(260, 930, 560, 70, 35);
          ctx.fill();
        } else {
          ctx.fillRect(260, 930, 560, 70);
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SCAN WITH ANY CAMERA TO CONNECT', 540, 965);

        // Trigger download
        const link = document.createElement('a');
        link.download = `${(qr.name || qr.id).toLowerCase().replace(/[^a-z0-9]/g, '_')}_social_card.png`;
        link.href = cardCanvas.toDataURL('image/png');
        link.click();
        showToast(`Downloaded WhatsApp & social pack card for ${qr.name}!`);
      }
    );
  };

  const handleEdit = () => {
    setSelectedQrId(qr.id);
    setActiveScreen('design-studio');
  };

  const handleSaveDestinationVersion = () => {
    const currentVersionNum = parseFloat(qr.version?.replace('v', '') || '1.0');
    const newVersion = `v${(currentVersionNum + 0.1).toFixed(1)}`;
    const targetUrl = newFallbackUrl?.trim() || dest.fallbackUrl;

    setQrCodes((prev) =>
      prev.map((item) => {
        if (item.id === qr.id) {
          return {
            ...item,
            version: newVersion,
            destination: {
              ...item.destination,
              fallbackUrl: targetUrl,
            },
            lastModified: new Date().toISOString().split('T')[0],
          };
        }
        return item;
      })
    );

    addAuditLog(
      'Destination Modified (New Version)',
      `${qr.id} (${qr.name})`,
      `${qr.version} -> ${newVersion}: Fallback updated to ${targetUrl}`
    );

    showToast(`Published configuration version ${newVersion} with audited rollback protection.`);
    setEditingDest(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* =========================================================================
          VIEW MODE 1: GRID OF ALL BOXES IN CATEGORY (Select QR, Change Request, Rejected)
          ========================================================================= */}
      {viewMode === 'grid' && (
        <>
          {/* Top Bar: Back to Inventory */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setActiveScreen('listing')}
                className="btn btn-secondary btn-sm"
              >
                <ArrowLeft size={15} />
                Back to QR Management
              </button>
            </div>
            <div style={{ fontSize: '12.5px', color: '#6B7280' }}>
              Click any box below to inspect its details completely in full screen
            </div>
          </div>

          {/* 3 Options QR Governance Selector: Select QR, Change Request, Rejected */}
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
                    border: categoryFilter === 'select_qr' ? '1.5px solid #00891D' : '1px solid #CBD5E1',
                    background: categoryFilter === 'select_qr' ? '#F0FDF4' : '#FFFFFF',
                    color: categoryFilter === 'select_qr' ? '#006B17' : '#475569',
                  }}
                >
                  <QrCode size={14} color={categoryFilter === 'select_qr' ? '#00891D' : '#6B7280'} />
                  <span>Select QR</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: categoryFilter === 'select_qr' ? '#00891D' : '#F1F5F9',
                    color: categoryFilter === 'select_qr' ? '#FFFFFF' : '#475569',
                  }}>
                    {selectAllQrs.length}
                  </span>
                </button>

                {/* Option 2: Change Request (Updated: Warm Amber-Orange) */}
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
                    border: categoryFilter === 'changes' ? '1.5px solid #EA580C' : '1px solid #CBD5E1',
                    background: categoryFilter === 'changes' ? '#FFF7ED' : '#FFFFFF',
                    color: categoryFilter === 'changes' ? '#C2410C' : '#475569',
                  }}
                >
                  <AlertTriangle size={14} color={categoryFilter === 'changes' ? '#EA580C' : '#6B7280'} />
                  <span>Change Request</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: categoryFilter === 'changes' ? '#EA580C' : '#F1F5F9',
                    color: categoryFilter === 'changes' ? '#FFFFFF' : '#475569',
                  }}>
                    {changesQrs.length}
                  </span>
                </button>

                {/* Option 3: Rejected (Updated: Rich Rose-Crimson) */}
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
                    border: categoryFilter === 'rejected' ? '1.5px solid #E11D48' : '1px solid #CBD5E1',
                    background: categoryFilter === 'rejected' ? '#FFF1F2' : '#FFFFFF',
                    color: categoryFilter === 'rejected' ? '#BE123C' : '#475569',
                  }}
                >
                  <XCircle size={14} color={categoryFilter === 'rejected' ? '#E11D48' : '#6B7280'} />
                  <span>Rejected</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: categoryFilter === 'rejected' ? '#E11D48' : '#F1F5F9',
                    color: categoryFilter === 'rejected' ? '#FFFFFF' : '#475569',
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
                  placeholder={`Filter in ${categoryFilter === 'changes' ? 'Change Request' : categoryFilter === 'rejected' ? 'Rejected' : 'Select QR'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '30px', fontSize: '12px', height: '32px' }}
                />
              </div>
            </div>

            {/* Display ALL QR Boxes in this Category */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
              <div style={{
                fontSize: '12px',
                color: '#4B5563',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>
                  Showing all <strong>{currentCategoryQrs.length}</strong> box{currentCategoryQrs.length === 1 ? '' : 'es'} in{' '}
                  <strong style={{ color: categoryFilter === 'changes' ? '#C2410C' : categoryFilter === 'rejected' ? '#BE123C' : '#00891D' }}>
                    {categoryFilter === 'changes' ? 'Change Request' : categoryFilter === 'rejected' ? 'Rejected' : 'Select QR'}
                  </strong>
                  {' '}— click any box to open its details completely in full screen:
                </span>
              </div>

              {currentCategoryQrs.length === 0 ? (
                <div style={{
                  padding: '44px 24px',
                  textAlign: 'center',
                  background: '#F9FAFB',
                  borderRadius: '12px',
                  border: '1px dashed #E5E7EB',
                  margin: '10px 0',
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: categoryFilter === 'changes' ? '#ECFDF5' : '#F3F4F6',
                    color: categoryFilter === 'changes' ? '#00891D' : '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                  }}>
                    {categoryFilter === 'changes' ? <CheckCircle2 size={22} color="#00891D" /> : <HelpCircle size={22} />}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937', marginBottom: '4px' }}>
                    {categoryFilter === 'changes' ? 'No Change Requests Found' : 'No QR Codes Found'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
                    {categoryFilter === 'changes'
                      ? 'All active and published QR routing destinations currently satisfy operational compliance standards.'
                      : 'No QR codes found matching this category filter.'}
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                  gap: '14px',
                }}>
                  {currentCategoryQrs.map((item) => {
                    let cardBorder = '#E2E8F0';
                    let cardBg = '#FFFFFF';
                    let cardHoverBorder = '#00891D';
                    let tagBg = '#F1F5F9';
                    let tagColor = '#475569';
                    let noteBg = '#F8FAFC';
                    let noteColor = '#334155';
                    let noteBorder = '#E2E8F0';

                    if (item.status === 'Changes Requested') {
                      cardBorder = '#FED7AA';
                      cardBg = '#FFFAF5';
                      cardHoverBorder = '#EA580C';
                      tagBg = '#FFEDD5';
                      tagColor = '#9A3412';
                      noteBg = '#FFF7ED';
                      noteColor = '#9A3412';
                      noteBorder = '#FED7AA';
                    } else if (item.status === 'Rejected') {
                      cardBorder = '#FECDD3';
                      cardBg = '#FFF5F6';
                      cardHoverBorder = '#E11D48';
                      tagBg = '#FFE4E6';
                      tagColor = '#9F1239';
                      noteBg = '#FFF1F2';
                      noteColor = '#9F1239';
                      noteBorder = '#FECDD3';
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleBoxClick(item.id)}
                        style={{
                          border: `1.5px solid ${cardBorder}`,
                          background: cardBg,
                          borderRadius: '12px',
                          padding: '16px 18px',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px',
                          minHeight: '165px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = cardHoverBorder;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = cardBorder;
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11.5px', fontFamily: 'monospace', fontWeight: 700, color: '#374151' }}>
                              {item.id}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: tagBg,
                              color: tagColor,
                              border: `1px solid ${noteBorder}`,
                            }}>
                              {item.status}
                            </span>
                          </div>

                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#111827',
                            lineHeight: 1.35,
                          }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px' }}>
                            {item.hubName || item.village || 'Phirangipuram Hub'} · {item.type}
                          </div>
                        </div>

                        {item.reviewerComments && (item.status === 'Changes Requested' || item.status === 'Rejected') ? (
                          <div style={{
                            fontSize: '11.5px',
                            color: noteColor,
                            background: noteBg,
                            border: `1px solid ${noteBorder}`,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            lineHeight: 1.4,
                          }}>
                            {item.status === 'Rejected' ? '⛔ ' : '⚠️ '}
                            {item.reviewerComments.replace(/^(Reviewer Feedback:|Rejected by Security Approver:|Rejected by Financial Approver:)\s*/i, '').slice(0, 105)}...
                          </div>
                        ) : (
                          <div style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            background: '#F8FAFC',
                            padding: '6px 8px',
                            borderRadius: '6px',
                          }}>
                            /{item.destination?.redirectCode || 'target'} ➔ {item.destination?.fallbackUrl}
                          </div>
                        )}

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid #F1F5F9',
                          fontSize: '11.5px',
                          color: cardHoverBorder,
                          fontWeight: 700,
                        }}>
                          <span>Click to open full-screen details</span>
                          <span>→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          VIEW MODE 2: FULL-SCREEN DETAIL OF 1 BOX (Hides all other boxes & data)
          ========================================================================= */}
      {viewMode === 'detail' && (
        <>
          {/* Top Bar: Back to Category Boxes & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setActiveScreen('listing')}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={15} />
                Back to QR Management
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                title="View All QR Cards in Grid View"
              >
                <Layers size={14} color="#00891D" />
                All QR Cards Grid ({currentCategoryQrs.length})
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
              {qr.status !== 'Archived' && (
                <button
                  onClick={() => togglePauseQR(qr.id)}
                  className="btn btn-secondary btn-sm"
                  title={qr.status === 'Active' ? 'Pause QR' : 'Resume QR'}
                >
                  {qr.status === 'Active' ? <Pause size={14} color="#D97706" /> : <Play size={14} color="#00891D" />}
                  {qr.status === 'Active' ? 'Pause' : 'Resume'}
                </button>
              )}
              {qr.status === 'Archived' ? (
                <>
                  <button
                    onClick={() => restoreQR(qr.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#00891D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Restore QR Code to Active"
                  >
                    <RotateCcw size={14} />
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Permanently delete QR code ${qr.id}?`)) {
                        deleteQR(qr.id);
                        setActiveScreen('listing');
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Delete Permanently"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </>
              ) : (
                <button
                  onClick={() => archiveQR(qr.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Archive QR Code"
                >
                  <Archive size={14} />
                  Archive
                </button>
              )}
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

          {/* QR Navigation & Quick Switcher Strip */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}>
            {/* Left: Quick Dropdown Switcher with Prev/Next */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
                Select QR Code:
              </label>
              <select
                value={qr.id}
                onChange={(e) => {
                  setSelectedQrId(e.target.value);
                  lastQrIdRef.current = e.target.value;
                  setViewMode('detail');
                }}
                className="form-control"
                style={{ width: '260px', padding: '6px 10px', fontSize: '13px', fontWeight: 600 }}
              >
                {qrCodes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} · {item.name} ({item.status})
                  </option>
                ))}
              </select>

              {/* Prev / Next buttons */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = qrCodes.findIndex((q) => q.id === qr.id);
                    if (currentIndex > 0) {
                      const prevId = qrCodes[currentIndex - 1].id;
                      setSelectedQrId(prevId);
                      lastQrIdRef.current = prevId;
                    }
                  }}
                  disabled={qrCodes.findIndex((q) => q.id === qr.id) <= 0}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '5px 8px' }}
                  title="Previous QR Code"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = qrCodes.findIndex((q) => q.id === qr.id);
                    if (currentIndex < qrCodes.length - 1) {
                      const nextId = qrCodes[currentIndex + 1].id;
                      setSelectedQrId(nextId);
                      lastQrIdRef.current = nextId;
                    }
                  }}
                  disabled={qrCodes.findIndex((q) => q.id === qr.id) >= qrCodes.length - 1}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '5px 8px' }}
                  title="Next QR Code"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Right: Category Filter Quick Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Category Cards:</span>
              <button
                type="button"
                onClick={() => handleCategorySelect('select_qr')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11.5px', padding: '4px 10px', border: '1px solid #E5E7EB' }}
              >
                All ({selectAllQrs.length})
              </button>
              <button
                type="button"
                onClick={() => handleCategorySelect('changes')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11.5px', padding: '4px 10px', border: '1px solid #FED7AA', color: '#EA580C', background: '#FFF7ED' }}
              >
                Changes Requested ({changesQrs.length})
              </button>
              <button
                type="button"
                onClick={() => handleCategorySelect('rejected')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11.5px', padding: '4px 10px', border: '1px solid #FECDD3', color: '#E11D48', background: '#FFF1F2' }}
              >
                Rejected ({rejectedQrs.length})
              </button>
            </div>
          </div>

          {/* Selected QR Detail Section Anchor */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 2px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Full-Screen Detail View:
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
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

          {/* Governance Status Reflection Banners (Updated Warm Amber & Rose Colors) */}
          {qr.status === 'Changes Requested' && (
            <div style={{
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
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
                  background: '#FFEDD5',
                  color: '#EA580C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#9A3412' }}>
                    Reviewer Requested Changes (Action Required)
                  </div>
                  <div style={{ fontSize: '13px', color: '#C2410C', marginTop: '4px', lineHeight: 1.5 }}>
                    "{qr.reviewerComments || 'Reviewer requested adjustments to target destination URL, artwork branding, or campaign attribution parameters.'}"
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                    Status: <span className="badge badge-changes-requested">Changes Requested</span> · Make updates in Design Studio and resubmit for approval.
                  </div>
                </div>
              </div>
              <button
                onClick={handleEdit}
                className="btn btn-primary btn-sm"
                style={{
                  background: '#EA580C',
                  borderColor: '#EA580C',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  padding: '8px 14px',
                }}
              >
                <Edit3 size={15} />
                Edit & Resubmit in Design Studio
              </button>
            </div>
          )}

          {qr.status === 'Rejected' && (
            <div style={{
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
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
                  background: '#FFE4E6',
                  color: '#E11D48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <XCircle size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#9F1239' }}>
                    QR Code Rejected by Governance Reviewer
                  </div>
                  <div style={{ fontSize: '13px', color: '#BE123C', marginTop: '4px', lineHeight: 1.5 }}>
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
                  background: '#BE123C',
                  borderColor: '#BE123C',
                  color: '#FFFFFF',
                }}
              >
                <RotateCw size={15} />
                Reconfigure in Design Studio
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
            className="details-qr-preview"
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
              <div>
                Campaign:{' '}
                <strong
                  onClick={() => {
                    const camp = campaigns?.find((c) => c.id === qr.campaignId || c.name === qr.campaign);
                    if (camp) {
                      setSelectedCampaignId(camp.id);
                      setActiveScreen('campaigns');
                    }
                  }}
                  style={{ color: '#00891D', cursor: 'pointer', textDecoration: 'underline' }}
                  title="Open Campaign entity page"
                >
                  {qr.campaign || 'Direct'}
                </strong>
              </div>
              <div>Hub: <strong>{qr.hubName || 'Phirangipuram Hub'}</strong></div>
              <div>Owner: <strong>{qr.owner}</strong> ({qr.department})</div>
              <div>Created: <strong>{qr.createdAt || '2026-03-01'}</strong></div>
              <div>
                Expiry: {qr.expiryDate === 'Never Ending' || !qr.expiryDate || qr.expiryDate === 'Unlimited' ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: '#F0FDF4',
                    color: '#15803D',
                    border: '1px solid #BBF7D0',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginLeft: '4px',
                  }}>
                    ∞ Never Ending
                  </span>
                ) : (
                  <strong>{qr.expiryDate}</strong>
                )}
              </div>
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
                onClick={handleDownloadSvg}
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
                onClick={handleDownloadHighResPng}
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
                onClick={handleDownloadSocialCard}
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
        </>
      )}
    </div>
  );
};
 
export { QRDetails as Screen08_Details };
export default QRDetails;
