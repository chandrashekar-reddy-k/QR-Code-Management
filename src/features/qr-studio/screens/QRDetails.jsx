import React, { useState } from 'react';
import QRCode from 'qrcode';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer, VILLAGKART_ICON_DATA_URL } from '../components/QRCodeRenderer';
import {
  ArrowLeft,
  Smartphone,
  Download,
  Pause,
  Play,
  Copy,
  Check,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

const getErrorCorrectionLabel = (level) => {
  switch (String(level || 'Q').toUpperCase()) {
    case 'L':
      return 'Level L (7% damage recovery)';
    case 'M':
      return 'Level M (15% standard damage recovery)';
    case 'H':
      return 'Level H (30% high damage recovery)';
    case 'Q':
    default:
      return 'Level Q (25% damage recovery)';
  }
};

export const QRDetails = () => {
  const {
    selectedQrId,
    setActiveScreen,
    startEditQRCode,
    qrCodes,
    setQrCodes,
    togglePauseQR,
    requestDeleteQR,
    scanEvents,
    auditLogs,
    addAuditLog,
    setTestScanModal,
    showToast,
    handleApprovalAction,
  } = useQR();

  const [activeTab, setActiveTab] = useState('overview'); // overview, destinations, assets, history, analytics, audit
  const [copiedLink, setCopiedLink] = useState(false);

  // Destination Version Editing state
  const [editingDest, setEditingDest] = useState(false);
  const [newFallbackUrl, setNewFallbackUrl] = useState('');


  const qr = qrCodes.find((q) => q.id === selectedQrId) || qrCodes[0];
  if (!qr) return <div style={{ padding: '24px' }}>QR code not found.</div>;

  const dest = qr.destination || {};
  const hasExpiry = Boolean(qr.expiryDate && qr.expiryDate !== 'Never Ending' && qr.neverEnding !== true);
  const metrics = qr.metrics || { scans: 0, uniqueVisitors: 0, verifiedRegistrations: 0, firstOrders: 0 };
  const qrEvents = scanEvents.filter((e) => e.qrId === qr.id);
  const qrAudit = auditLogs.filter((l) => l.reference.includes(qr.id));

  const copyUrl = () => {
    navigator.clipboard.writeText(`https://villagkart.com/${dest.redirectCode || qr.id}`);
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
    const targetUrl = dest.fallbackUrl || dest.androidUrl || `https://villagkart.com/${dest.redirectCode || qr.id}`;
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
    const targetUrl = dest.fallbackUrl || dest.androidUrl || `https://villagkart.com/${dest.redirectCode || qr.id}`;
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
          const squareSize = Math.round(1200 * 0.25);
          const squareX = Math.round(cx - squareSize / 2);
          const squareY = Math.round(cy - squareSize / 2);
          const cornerR = Math.max(Math.round(squareSize * 0.14), 16);

          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.18)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 3;
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
          ctx.lineWidth = 6;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerR);
          } else {
            ctx.rect(squareX, squareY, squareSize, squareSize);
          }
          ctx.stroke();

          ctx.strokeStyle = 'rgba(0,0,0,0.08)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(squareX, squareY, squareSize, squareSize, cornerR);
          } else {
            ctx.rect(squareX, squareY, squareSize, squareSize);
          }
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
    const targetUrl = dest.fallbackUrl || dest.androidUrl || `https://villagkart.com/${dest.redirectCode || qr.id}`;
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

        const triggerDownload = () => {
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
        };

        const logoImg = new Image();
        logoImg.onload = () => {
          const emblemSize = 72;
          ctx.drawImage(logoImg, cx - emblemSize / 2, cy - emblemSize / 2, emblemSize, emblemSize);
          triggerDownload();
        };
        logoImg.onerror = () => {
          ctx.fillStyle = qr.design?.fgColor || '#00891D';
          ctx.font = 'bold 38px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('VK', cx, cy);
          triggerDownload();
        };
        logoImg.src = VILLAGKART_ICON_DATA_URL;
      }
    );
  };

  const handleEdit = () => {
    startEditQRCode(qr);
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
      {/* Top Bar: Back to QR Management & Actions */}
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
        </div>

            {/* Actions: Edit, Download, Copy URL, Pause/Resume (when applicable), Test Scan, Delete */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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

              {/* Pause / Resume only for Active or Paused lifecycle */}
              {(qr.status === 'Active' || qr.status === 'Paused') && (
                <button
                  onClick={() => togglePauseQR(qr.id)}
                  className="btn btn-secondary btn-sm"
                  title={qr.status === 'Active' ? 'Pause QR' : 'Resume QR'}
                >
                  {qr.status === 'Active' ? <Pause size={14} color="#D97706" /> : <Play size={14} color="#00891D" />}
                  {qr.status === 'Active' ? 'Pause' : 'Resume'}
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

              <button
                onClick={() => requestDeleteQR(qr, () => setActiveScreen('listing'))}
                className="btn btn-secondary btn-sm"
                style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Delete Permanently"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          {/* Pending Governance Approval Banner */}
          {qr.status === 'Pending Approval' && (
            <div
              style={{
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: '1 1 420px', minWidth: '280px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#FFEDD5',
                    color: '#EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#9A3412' }}>
                      This QR Code is Pending for Approval
                    </span>
                    <span className="badge badge-pending-approval" style={{ fontSize: '11px' }}>
                      Awaiting Review
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#C2410C', marginTop: '3px' }}>
                    Verify destination target (<code style={{ background: '#FFEDD5', padding: '2px 6px', borderRadius: '4px', color: '#9A3412', fontWeight: 600 }}>{dest.fallbackUrl || dest.androidUrl || 'No target configured'}</code>) and design specs, then choose an action.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    handleApprovalAction(qr.id, 'reject', 'Rejected via QR Details');
                  }}
                  className="btn btn-secondary"
                  style={{
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    padding: '8px 16px',
                    background: '#FFFFFF',
                    borderColor: '#DC2626',
                    color: '#DC2626',
                  }}
                  title="Reject this QR code"
                >
                  <XCircle size={15} />
                  Reject QR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApprovalAction(qr.id, 'approve', 'Accepted & activated via QR Details');
                  }}
                  className="btn btn-primary"
                  style={{
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    padding: '8px 18px',
                    background: '#00891D',
                    borderColor: '#00891D',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 6px rgba(0,137,29,0.2)',
                  }}
                  title="Accept and activate this pending QR code"
                >
                  <CheckCircle2 size={15} />
                  Accept & Activate QR
                </button>
              </div>
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

      {qr.status === 'Rejected' && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #FECDD3',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: '1 1 420px', minWidth: '280px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <XCircle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#991B1B' }}>
                  This QR Code has been Rejected
                </span>
                <span className="badge badge-rejected" style={{ fontSize: '11px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
                  Rejected
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '3px' }}>
                {qr.reviewerComments || 'Governance rejected this QR Code. You can review destination and re-approve when ready.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                handleApprovalAction(qr.id, 'approve', 'Re-approved & activated via QR Details');
              }}
              className="btn btn-primary"
              style={{
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                padding: '8px 18px',
                background: '#00891D',
                borderColor: '#00891D',
                color: '#FFFFFF',
              }}
              title="Re-approve and activate this QR code"
            >
              <CheckCircle2 size={15} />
              Re-approve & Activate
            </button>
          </div>
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
              value={dest.fallbackUrl || dest.androidUrl || `https://villagkart.com/${dest.redirectCode || qr.id}`}
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
              https://villagkart.com/{dest.redirectCode || qr.id}
            </div>

            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '12.5px', color: '#4B5563' }}>
              <div>Routing Target: <strong style={{ color: '#111827' }}>{dest.fallbackUrl || dest.androidUrl || 'Direct Destination'}</strong></div>
              <div>Attribution: <strong style={{ color: '#00891D' }}>Enabled (Mobile Deep Link)</strong></div>
              <div>Lifespan: {hasExpiry ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FCD34D',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>Valid until {qr.expiryDate}</span>
              ) : (
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
                }}>∞ Permanent Dynamic QR</span>
              )}</div>
            </div>
          </div>

          {/* Quick Lifecycle Status Badge */}
          <div style={{
            background: qr.status === 'Rejected' ? '#FEE2E2' : qr.status === 'Pending Approval' ? '#FFEDD5' : qr.status === 'Paused' ? '#FEF3C7' : qr.status === 'Draft' ? '#EEF2FF' : qr.status === 'Expired' ? '#F3F4F6' : '#E8F5EA',
            border: `1px solid ${qr.status === 'Rejected' ? '#FCA5A5' : qr.status === 'Pending Approval' ? '#FDBA74' : qr.status === 'Paused' ? '#FCD34D' : qr.status === 'Draft' ? '#C7D2FE' : qr.status === 'Expired' ? '#E5E7EB' : '#C8E6C9'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: '11.5px', color: qr.status === 'Rejected' ? '#DC2626' : qr.status === 'Pending Approval' ? '#C2410C' : qr.status === 'Paused' ? '#92400E' : qr.status === 'Draft' ? '#4338CA' : qr.status === 'Expired' ? '#6B7280' : '#006B17', fontWeight: 700, textTransform: 'uppercase' }}>
              Lifecycle Status
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: qr.status === 'Rejected' ? '#DC2626' : qr.status === 'Pending Approval' ? '#C2410C' : qr.status === 'Paused' ? '#92400E' : qr.status === 'Draft' ? '#4338CA' : qr.status === 'Expired' ? '#6B7280' : '#00891D' }}>
              {qr.status || 'Active'}
            </div>
            <div style={{ fontSize: '12px', color: qr.status === 'Rejected' ? '#991B1B' : qr.status === 'Pending Approval' ? '#9A3412' : qr.status === 'Paused' ? '#78350F' : qr.status === 'Draft' ? '#3730A3' : qr.status === 'Expired' ? '#4B5563' : '#006B17', fontWeight: 600 }}>
              {qr.type || 'Dynamic'} · Version {qr.version || 'v1.0'}
            </div>
          </div>
        </div>

        {/* 6 Detail Tabs */}
        <div className="tabs-nav" style={{ marginTop: '24px', marginBottom: 0 }}>
          {[
            { id: 'overview', label: 'Overview & Operations' },
            { id: 'destinations', label: 'Destinations & Routing' },
            { id: 'assets', label: 'Assets & Print Specs' },
            { id: 'history', label: `Event History (${qrEvents.length})` },
            { id: 'analytics', label: 'Device & Territory Breakdown' },
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
        <div className="vk-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
            <div>
              <h3 className="vk-card-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#111827' }}>
                QR Specifications & Creation Summary
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Core parameters, destinations, and design specifications configured during QR creation
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '4px 12px', borderRadius: '14px', border: '1px solid #BBF7D0', letterSpacing: '0.3px' }}>
              {qr.type || 'Dynamic'} QR
            </span>
          </div>

          {/* Section 1: Core Identity Tiles */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
              Core Identity & Timeline
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {/* 1. QR Name */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                  QR Name
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', wordBreak: 'break-word' }}>
                  {qr.name || 'Untitled QR'}
                </div>
              </div>

              {/* 2. Campaign Title */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                  Title / Campaign
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', wordBreak: 'break-word' }}>
                  {qr.design?.campaignTitle || qr.campaign || qr.name || 'VillagKart QR'}
                </div>
              </div>

              {/* 3. Created Date */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                  Created Date
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  {qr.createdAt ? (new Date(qr.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })) : (qr.startDate || '—')}
                </div>
              </div>

              {/* 4. Lifespan */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                  Lifespan / Validity
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: hasExpiry ? '#92400E' : '#15803D' }}>
                  {hasExpiry ? `Valid until ${qr.expiryDate}` : '∞ Permanent (Never Ending)'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Description Box */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '4px solid #00891D', borderRadius: '10px', padding: '14px 18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              Description & Strategic Purpose
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: '1.55', fontWeight: 500 }}>
              {qr.purpose || qr.design?.purpose || qr.design?.supportingText || qr.reviewerComments || 'Direct Campaign Routing'}
            </p>
          </div>

          {/* Section 3: Target & Routing */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
              Destination & Routing Configuration
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {/* Destination URL */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                    Destination URL (Target)
                  </div>
                  <a
                    href={dest.fallbackUrl || dest.androidUrl || qr.destinationUrl || 'https://villagkart.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 700, color: '#00891D', wordBreak: 'break-all', textDecoration: 'none' }}
                  >
                    <span>{dest.fallbackUrl || dest.androidUrl || qr.destinationUrl || 'https://villagkart.com'}</span>
                    <ExternalLink size={13} style={{ flexShrink: 0 }} />
                  </a>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '10px' }}>
                  Routing Strategy: <strong style={{ color: '#0F172A' }}>{dest.routingBehavior === 'auto' ? 'Smart Device OS Routing' : 'Direct URL Redirection'}</strong>
                </div>
              </div>

              {/* Redirect Shortlink */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                    Dynamic Shortlink Slug
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                      villagkart.com/{dest.redirectCode || qr.id}
                    </code>
                    <button
                      onClick={copyUrl}
                      className="btn btn-secondary btn-xs"
                      style={{ padding: '3px 9px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedLink ? <Check size={12} color="#00891D" /> : <Copy size={12} />}
                      {copiedLink ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '10px' }}>
                  Attribution: <strong style={{ color: '#00891D' }}>Enabled (Mobile Deep Link)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Design & Artwork Specifications */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
              Design & Artwork Specifications
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {/* CTA Text Frame */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                  CTA Frame Text
                </div>
                <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 800, color: '#00891D', background: '#DCFCE7', padding: '3px 10px', borderRadius: '6px', border: '1px solid #BBF7D0', letterSpacing: '0.4px' }}>
                  {qr.design?.ctaText || 'SCAN TO DOWNLOAD'}
                </span>
              </div>

              {/* Brand Colors */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                  Brand Colors
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                    <span style={{ width: '13px', height: '13px', borderRadius: '3px', background: qr.design?.fgColor || '#00891D', border: '1px solid rgba(0,0,0,0.15)' }} />
                    {qr.design?.fgColor || '#00891D'}
                  </span>
                  <span style={{ color: '#CBD5E1' }}>/</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                    <span style={{ width: '13px', height: '13px', borderRadius: '3px', background: qr.design?.bgColor || '#FFFFFF', border: '1px solid #CBD5E1' }} />
                    {qr.design?.bgColor || '#FFFFFF'}
                  </span>
                </div>
              </div>

              {/* Logo Emblem */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                  Central Emblem
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  {qr.design?.showLogo !== false ? 'VillagKart Emblem Included' : 'No Logo'}
                </div>
              </div>

              {/* Error Correction */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                  Error Correction
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  {getErrorCorrectionLabel(qr.design?.errorCorrection || 'Q')}
                </div>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {qrEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                      No activity events recorded yet for this QR code.
                    </td>
                  </tr>
                ) : (
                  qrEvents.map((evt) => (
                    <tr key={evt.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{evt.id}</td>
                      <td>{evt.timestamp}</td>
                      <td
                        onClick={() => setTestScanModal({ isOpen: true, qrCode: qr, device: 'Desktop' })}
                        style={{ cursor: 'pointer' }}
                        title="Click to launch test simulator on our device"
                      >
                        <span style={{ color: '#00891D', fontWeight: 600 }}>{evt.source}</span> · {evt.medium}
                      </td>
                      <td>{evt.device}</td>
                      <td>
                        <span className={`badge ${evt.outcome === 'Redirected' ? 'badge-active' : 'badge-draft'}`}>
                          {evt.outcome}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#00891D' }}>Active</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

            {/* Tab 5: Analytics */}
      {activeTab === 'analytics' && (() => {
        const total = qrEvents.length;
        let android = 0, ios = 0, desktop = 0;
        const villageCounts = {};
        qrEvents.forEach((e) => {
          const d = (e.device || '').toLowerCase();
          if (d.includes('android')) android++;
          else if (d.includes('ios') || d.includes('apple') || d.includes('iphone')) ios++;
          else desktop++;
          const v = e.village || qr.village || 'General';
          villageCounts[v] = (villageCounts[v] || 0) + 1;
        });

        const androidPct = total > 0 ? ((android / total) * 100).toFixed(1) : '0.0';
        const iosPct = total > 0 ? ((ios / total) * 100).toFixed(1) : '0.0';
        const desktopPct = total > 0 ? ((desktop / total) * 100).toFixed(1) : '0.0';

        const topVillages = Object.entries(villageCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        return (
          <div className="vk-card">
            <h3 className="vk-card-title">Device & Territory Analytics</h3>
            <div className="grid-2" style={{ marginTop: '16px' }}>
              <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '10px' }}>Operating System Distribution</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span>Android (Google Play)</span>
                      <span style={{ fontWeight: 600 }}>{androidPct}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${androidPct}%`, height: '100%', background: '#00891D' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span>Apple iOS (App Store)</span>
                      <span style={{ fontWeight: 600 }}>{iosPct}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${iosPct}%`, height: '100%', background: '#4CAF50' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span>Web Desktop Fallback</span>
                      <span style={{ fontWeight: 600 }}>{desktopPct}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${desktopPct}%`, height: '100%', background: '#9CA3AF' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '10px' }}>Village Cluster Performance</div>
                {topVillages.length === 0 ? (
                  <p style={{ fontSize: '12.5px', color: '#6B7280' }}>No location events recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {topVillages.map(([vName, cnt]) => {
                      const pct = total > 0 ? ((cnt / total) * 100).toFixed(0) : 0;
                      return (
                        <div key={vName} style={{ fontSize: '12.5px', color: '#4B5563' }}>
                          <strong>{vName}</strong>: {pct}% territory share
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                  {log.user && log.user !== 'Admin User' && (
                    <div style={{ fontSize: '11px', color: '#00891D', fontWeight: 600, marginTop: '2px' }}>Executed by {log.user}</div>
                  )}
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
