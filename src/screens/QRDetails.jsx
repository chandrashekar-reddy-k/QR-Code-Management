import React, { useState } from 'react';
import QRCode from 'qrcode';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
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
} from 'lucide-react';

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
              <div>Routing Target: <strong style={{ color: '#111827' }}>{dest.fallbackUrl || dest.androidUrl || 'Direct Destination'}</strong></div>
              <div>Attribution: <strong style={{ color: '#00891D' }}>Enabled (Mobile Deep Link)</strong></div>
              <div>Lifespan: <span style={{
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
              }}>∞ Permanent Dynamic QR</span></div>
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
              {(metrics.uniqueVisitors || 0).toLocaleString()} Unique Devices Tracked
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
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Unique Devices</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{(metrics.uniqueVisitors || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Total Scans</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#00891D' }}>{(metrics.scans || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>First Orders</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#00A322' }}>{(metrics.firstOrders || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Edge Routing Reliability</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#00891D' }}>99.98%</div>
              </div>
            </div>
          </div>

          <div className="vk-card">
            <h3 className="vk-card-title">Design & Artwork Specifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
                <span style={{ color: '#6B7280' }}>Badge Style</span>
                <span style={{ fontWeight: 600 }}>Square Emblem Badge</span>
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
    </div>
  );
};
 
export { QRDetails as Screen08_Details };
export default QRDetails;
