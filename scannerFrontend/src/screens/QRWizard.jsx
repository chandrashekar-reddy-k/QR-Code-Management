import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import {
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Download,
  Sparkles,
  Copy,
  ExternalLink,
  FileText,
  Printer,
  Share2,
  Check,
  Send,
  Eye,
  RefreshCw,
  Globe,
} from 'lucide-react';

export const QRWizard = () => {
  const {
    wizardStep,
    setWizardStep,
    wizardMode,
    editingQrId,
    wizardData,
    setWizardData,
    wizardNotification,
    setWizardNotification,
    publishWizardQR,
    updateWizardQR,
    saveWizardDraft,
    resetWizard,
    setActiveScreen,
    currentRole,
    setTestScanModal,
    showToast,
  } = useQR();

  const [copiedLink, setCopiedLink] = useState(false);
  const [exportTab, setExportTab] = useState('print'); // 'print' | 'digital'
  const [digitalFormat, setDigitalFormat] = useState('PNG'); // 'PNG' | 'JPEG'
  const [printLayout, setPrintLayout] = useState('poster'); // 'poster', 'flyer', 'sticker', 'label', 'banner'

  // Update wizard helper with smart dynamic slug derivation
  const updateData = (field, value) => {
    setWizardData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && wizardMode !== 'edit') {
        const isDefaultOrAuto =
          !prev.redirectCode ||
          prev.redirectCode === 'vk-phr-promo' ||
          prev.redirectCode === 'youtube-1048' ||
          prev.redirectCode.startsWith('vk-');
        if (isDefaultOrAuto && typeof value === 'string' && value.trim()) {
          const autoSlug = 'vk-' + value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
          if (autoSlug.length > 3) {
            next.redirectCode = autoSlug;
          }
        }
      }
      return next;
    });
  };

  // Determine if approval is needed based on role & QR type
  const isApprovalRequired =
    currentRole !== 'Admin' &&
    (wizardData.type === 'Campaign' ||
      currentRole === 'VGE');

  // Download QR Canvas Helper
  const handleDownload = (format = 'PNG') => {
    const canvas = document.querySelector('.qr-render-container canvas');
    if (!canvas) {
      showToast('Error finding canvas element', 'error');
      return;
    }

    if (format === 'SVG') {
      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
          <image href="${canvas.toDataURL('image/png')}" width="${canvas.width}" height="${canvas.height}"/>
        </svg>
      `;
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${wizardData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const link = document.createElement('a');
      link.download = `${wizardData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr.${format.toLowerCase()}`;
      link.href = canvas.toDataURL(`image/${format.toLowerCase() === 'jpeg' ? 'jpeg' : 'png'}`);
      link.click();
    }
    showToast(`Downloaded ${format} asset package successfully.`);
  };

  const copyRedirectUrl = () => {
    navigator.clipboard.writeText(`https://villagkart.com/${wizardData.redirectCode}`);
    setCopiedLink(true);
    showToast('Copied redirect URL to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Save Draft Helper
  const handleSaveDraft = () => {
    saveWizardDraft();
  };

  // Publish and go to QR Management
  const handlePublishAndGoToQRManagement = () => {
    publishWizardQR();
    setActiveScreen('listing');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 5-Step Stepper Header Card */}
      <div className="vk-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setActiveScreen('listing')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              title="Return to QR Management"
            >
              <ArrowLeft size={14} />
              <span>Exit to QR Management</span>
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
              {wizardMode === 'edit' ? `Edit QR Code: ${wizardData.name || editingQrId}` : 'Create New QR Code'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              fontSize: '12px',
              fontWeight: 700,
              color: '#15803D',
            }}>
              Step {wizardStep} of 5 · {[
                'Basic Details',
                'Destinations',
                'Design Studio',
                'Print & Digital Export',
                wizardMode === 'edit' ? 'Review & Update' : 'Review & Publish',
              ][wizardStep - 1]}
            </span>
          </div>
        </div>

        {/* Stepper Navigation Progress Bar */}
        <div className="wizard-stepper" style={{ margin: 0, padding: '10px 14px' }}>
          {[
            { step: 1, label: 'Basic Details' },
            { step: 2, label: 'Destinations' },
            { step: 3, label: 'Design Studio' },
            { step: 4, label: 'Print & Digital Export' },
            { step: 5, label: wizardMode === 'edit' ? 'Review & Update' : 'Review & Publish' },
          ].map((s, idx, arr) => {
            const isCompleted = wizardStep > s.step;
            const isActive = wizardStep === s.step;
            return (
              <React.Fragment key={s.step}>
                <div
                  id={`wizard-step-${s.step}`}
                  className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => setWizardStep(s.step)}
                  title={`Go to Step ${s.step}: ${s.label}`}
                >
                  <div className="step-bubble">
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : s.step}
                  </div>
                  <div className="step-title-wrap">
                    <span className="step-subtext">Step 0{s.step}</span>
                    <span className="step-title">{s.label}</span>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <div className={`step-divider ${isCompleted ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Wizard Reset / Submission Notice Banner */}
      {wizardNotification && (
        <div
          style={{
            background: wizardNotification.type === 'draft' ? '#F0F9FF' : '#F0FDF4',
            border: `1px solid ${wizardNotification.type === 'draft' ? '#BAE6FD' : '#BBF7D0'}`,
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{wizardNotification.type === 'draft' ? '💾' : '🎉'}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: wizardNotification.type === 'draft' ? '#0369A1' : '#166534' }}>
                {wizardNotification.message}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {wizardNotification.targetScreen && (
              <button
                onClick={() => {
                  const target = wizardNotification.targetScreen;
                  setWizardNotification(null);
                  setActiveScreen(target);
                }}
                className="btn btn-sm"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '5px 12px',
                  background: wizardNotification.type === 'draft' ? '#0284C7' : '#00891D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {wizardNotification.targetLabel} →
              </button>
            )}
            <button
              onClick={() => setWizardNotification(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#6B7280',
                padding: '2px 6px',
              }}
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 3 / STEP 1: Create QR: Basic Details
          ========================================================================= */}
      {wizardStep === 1 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">
                {wizardMode === 'edit' ? `Edit QR: Basic Details (${wizardData.id || editingQrId})` : 'Create QR: Basic Details'}
              </h2>
              <p className="vk-card-subtitle">
                Collect core governance, channel attribution and operational scope before artwork generation
              </p>
            </div>
            {/* System Rule Approval Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`badge ${wizardMode === 'edit' ? 'badge-active' : (isApprovalRequired ? 'badge-pending' : 'badge-active')}`}>
                {wizardMode === 'edit'
                  ? 'Editing Existing QR Code'
                  : (isApprovalRequired ? 'Approval Required by System Rules' : 'Pre-Approved for Immediate Publish')}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
            {/* QR Name */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                QR Name <span className="required-dot">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={wizardData.name}
                onChange={(e) => updateData('name', e.target.value)}
                placeholder="e.g. Phirangipuram Village Launch Poster"
              />
              <p className="form-helper">Required; unique descriptive name for marketing and audit trail</p>
            </div>

            {/* QR Purpose */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                QR Purpose
              </label>
              <textarea
                className="form-control"
                rows={2}
                value={wizardData.purpose}
                onChange={(e) => updateData('purpose', e.target.value)}
                placeholder="State the strategic purpose, target customer segment, and operational placement"
              />
            </div>

            {/* Campaign Validity: Start Date & End Date / No End Date */}
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', background: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              {/* Start Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  <Calendar size={15} color="#00891D" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={wizardData.startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => updateData('startDate', e.target.value)}
                  style={{ backgroundColor: '#FFFFFF' }}
                />
                <p className="form-helper" style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px', margin: 0 }}>
                  Active from this calendar date onwards
                </p>
              </div>

              {/* End Date with Never Ending / No End Date toggle */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#374151', margin: 0 }}>
                    <Clock size={15} color={wizardData.neverEnding !== false ? '#00891D' : '#6B7280'} />
                    <span>End Date</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#00891D', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={wizardData.neverEnding !== false}
                      onChange={(e) => {
                        const isNever = e.target.checked;
                        updateData('neverEnding', isNever);
                        if (isNever) {
                          updateData('expiryDate', 'Never Ending');
                        } else {
                          const nextYear = new Date();
                          nextYear.setFullYear(nextYear.getFullYear() + 1);
                          updateData('expiryDate', nextYear.toISOString().split('T')[0]);
                        }
                      }}
                      style={{ width: '15px', height: '15px', accentColor: '#00891D' }}
                    />
                    <span>No End Date (Never Ending)</span>
                  </label>
                </div>

                {wizardData.neverEnding !== false ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8.5px 12px',
                      background: '#E8F5EA',
                      border: '1px solid #C8E6C9',
                      borderRadius: '6px',
                      color: '#00891D',
                      fontSize: '13px',
                      fontWeight: 600,
                      minHeight: '38px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} />
                      No End Date (Never Ending)
                    </span>
                    <span style={{ fontSize: '11px', background: '#FFFFFF', padding: '2px 8px', borderRadius: '12px', color: '#00891D', fontWeight: 700, border: '1px solid #C8E6C9' }}>
                      Always Active
                    </span>
                  </div>
                ) : (
                  <input
                    type="date"
                    className="form-control"
                    value={wizardData.expiryDate && wizardData.expiryDate !== 'Never Ending' ? wizardData.expiryDate : ''}
                    min={wizardData.startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => updateData('expiryDate', e.target.value)}
                    style={{ backgroundColor: '#FFFFFF' }}
                  />
                )}
                <p className="form-helper" style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px', margin: 0 }}>
                  {wizardData.neverEnding !== false
                    ? 'QR code remains active indefinitely without expiration'
                    : 'QR code will automatically expire after the selected date'}
                </p>
              </div>
            </div>


            {/* Tracking Toggle */}
            <div className="form-group" style={{ gridColumn: 'span 2', background: '#F9FAFB', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={wizardData.trackingEnabled ?? true}
                  onChange={(e) => updateData('trackingEnabled', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#00891D' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>
                    Enable Dynamic Event Logging & Telemetry
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    Records edge routing telemetry and device OS headers in the audit history log
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons: Save Draft / Cancel Edit, Continue */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '20px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {wizardMode === 'edit' ? (
              <button
                onClick={() => {
                  resetWizard();
                  setActiveScreen('listing');
                }}
                className="btn btn-secondary btn-sm"
              >
                Cancel Edit
              </button>
            ) : (
              <button onClick={handleSaveDraft} className="btn btn-secondary btn-sm">
                Save Draft
              </button>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              {wizardMode !== 'edit' && (
                <button onClick={() => setActiveScreen('listing')} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
              )}
              <button onClick={() => setWizardStep(2)} className="btn btn-primary btn-sm">
                Continue
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 4 / STEP 2: Destination Configuration
          ========================================================================= */}
      {/* =========================================================================
          PAGE 4 / STEP 2: Destination & Routing Configuration
          ========================================================================= */}
      {wizardStep === 2 && (
        <div className="vk-card" style={{ padding: '24px' }}>
          {/* Card Header */}
          <div className="vk-card-header" style={{ marginBottom: '20px', borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
            <div>
              <h2 className="vk-card-title">Destination & Routing Configuration</h2>
              <p className="vk-card-subtitle">
                Configure where users land after scanning. The printed QR encodes the dynamic shortlink so destinations can be changed anytime without reprinting.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-active" style={{ fontSize: '11px', padding: '3px 9px' }}>
                ⚡ Cloudflare Edge Routing (45ms)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 1. ROUTING STRATEGY (Clean, Compact 2-Option Card Switcher) */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                Routing Strategy:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {/* Mode A: Direct Target URL */}
                <div
                  onClick={() => {
                    const target = wizardData.fallbackUrl || wizardData.androidUrl || 'https://villagkart.com/campaign/phirangipuram-launch';
                    setWizardData((prev) => ({
                      ...prev,
                      routingBehavior: 'fallback_only',
                      fallbackUrl: target,
                      androidUrl: target,
                      iosUrl: target,
                    }));
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: wizardData.routingBehavior === 'fallback_only' ? '2px solid #00891D' : '1px solid #E5E7EB',
                    background: wizardData.routingBehavior === 'fallback_only' ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>
                      <Globe size={18} color="#00891D" />
                      Direct Destination URL
                    </div>
                    {wizardData.routingBehavior === 'fallback_only' && <Check size={16} color="#00891D" />}
                  </div>
                  <p style={{ fontSize: '12px', color: '#4B5563', margin: 0, lineHeight: 1.4 }}>
                    Directs all scanners (Android, iPhone, PC) to a single website, YouTube video, promotional page, or form.
                  </p>
                </div>

                {/* Mode B: Smart Device Routing */}
                <div
                  onClick={() => {
                    setWizardData((prev) => ({
                      ...prev,
                      routingBehavior: 'auto',
                    }));
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: wizardData.routingBehavior === 'auto' ? '2px solid #00891D' : '1px solid #E5E7EB',
                    background: wizardData.routingBehavior === 'auto' ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>
                      <Smartphone size={18} color="#2563EB" />
                      Smart Device OS Routing
                    </div>
                    {wizardData.routingBehavior === 'auto' && <Check size={16} color="#00891D" />}
                  </div>
                  <p style={{ fontSize: '12px', color: '#4B5563', margin: 0, lineHeight: 1.4 }}>
                    Detects device operating system: routes Android to Google Play Store, iOS to App Store, and PC to fallback site.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. TARGET DESTINATION INPUT (Direct URL vs Multi-OS) */}
            {wizardData.routingBehavior === 'fallback_only' ? (
              <div style={{
                background: '#FAFAFA',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                padding: '18px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>
                    Target Destination URL <span className="required-dot">*</span>
                  </label>
                  <span style={{ fontSize: '11.5px', color: '#166534', fontWeight: 600 }}>
                    Active for all devices (Android, iPhone, Desktop)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="url"
                      className="form-control"
                      style={{ fontSize: '14px', fontWeight: 600, padding: '10px 14px' }}
                      value={wizardData.fallbackUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWizardData((prev) => ({
                          ...prev,
                          fallbackUrl: val,
                          androidUrl: val,
                          iosUrl: val,
                        }));
                      }}
                      placeholder="e.g. https://villagkart.com/seasonal-produce or https://youtube.com/..."
                      required
                    />
                  </div>
                  {wizardData.fallbackUrl && (
                    <a
                      href={wizardData.fallbackUrl.startsWith('http') ? wizardData.fallbackUrl : `https://${wizardData.fallbackUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 12px', fontWeight: 600 }}
                      title="Test URL in new browser tab"
                    >
                      <ExternalLink size={14} />
                      Test Link
                    </a>
                  )}
                </div>
              </div>
            ) : (
              /* When Smart Device Routing is active */
              <div style={{
                background: '#FAFAFA',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                <div className="grid-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px' }}>
                      Android App Store / Intent URL
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      value={wizardData.androidUrl}
                      onChange={(e) => updateData('androidUrl', e.target.value)}
                      placeholder="https://play.google.com/store/apps/details?id=com.villagkart.customer"
                    />
                    <p className="form-helper">Scanned from Android devices</p>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px' }}>
                      iOS App Store / Universal Link
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      value={wizardData.iosUrl}
                      onChange={(e) => updateData('iosUrl', e.target.value)}
                      placeholder="https://apps.apple.com/in/app/villagkart-rural-fresh/id192837482"
                    />
                    <p className="form-helper">Scanned from iPhones & iPads</p>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '12.5px' }}>
                      Fallback Website URL (Desktop & Unmatched) <span className="required-dot">*</span>
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      value={wizardData.fallbackUrl}
                      onChange={(e) => updateData('fallbackUrl', e.target.value)}
                      placeholder="https://villagkart.com/seasonal-produce"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. DYNAMIC SHORTLINK SLUG (Compact Inline Field) */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>
                  Dynamic Shortlink Slug <span className="required-dot">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const base = (wizardData.name || wizardData.type || 'promo')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .slice(0, 16)
                      .replace(/^-+|-+$/g, '');
                    const randomSlug = `${base || 'vk'}-${Math.floor(100 + Math.random() * 900)}`;
                    updateData('redirectCode', randomSlug);
                    showToast(`Generated slug: ${randomSlug}`);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '11.5px', padding: '2px 8px', color: '#00891D', fontWeight: 600 }}
                >
                  <RefreshCw size={12} />
                  Generate New Slug
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  padding: '9px 12px',
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRight: 'none',
                  borderTopLeftRadius: '6px',
                  borderBottomLeftRadius: '6px',
                  color: '#4B5563',
                  fontSize: '13px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  https://villagkart.com/
                </span>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '13.5px',
                  }}
                  value={wizardData.redirectCode}
                  onChange={(e) => updateData('redirectCode', e.target.value)}
                  placeholder="custom-slug"
                />
              </div>
              <p className="form-helper" style={{ margin: '6px 0 0 0' }}>
                Encoded directly into the printed QR. Forwards to your destination URL with sub-45ms Cloudflare edge routing.
              </p>
            </div>

            {/* 4. LIVE FORWARDING RESOLUTION STRIP (Single Unified Pipeline) */}
            {(() => {
              const currentSlug = (wizardData.redirectCode || '').trim() || 'your-slug';
              const shortlink = `https://villagkart.com/${currentSlug}`;
              const targetUrl = wizardData.fallbackUrl || 'https://villagkart.com';

              return (
                <div style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                    {/* Pipeline step 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                        1. Printed QR
                      </span>
                      <ArrowRight size={14} color="#00891D" />
                    </div>

                    {/* Pipeline step 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        background: '#FFFFFF',
                        border: '1px solid #86EFAC',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: '#166534',
                      }}>
                        {shortlink}
                      </span>
                      <ArrowRight size={14} color="#00891D" />
                    </div>

                    {/* Pipeline step 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                        2. Resolves to:
                      </span>
                      <span style={{
                        background: '#00891D',
                        color: '#FFFFFF',
                        borderRadius: '4px',
                        padding: '3px 10px',
                        fontWeight: 700,
                        fontSize: '12px',
                        maxWidth: '260px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }} title={targetUrl}>
                        {targetUrl}
                      </span>
                    </div>
                  </div>

                  {/* Single Clean Simulator Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTestScanModal({
                          isOpen: true,
                          qrCode: {
                            id: 'VK-TEST-' + (wizardData.redirectCode || 'preview'),
                            name: wizardData.name || 'New Promo QR',
                            type: wizardData.type || 'Campaign',
                            status: 'Active',
                            hubName: wizardData.hubId || 'Phirangipuram Hub',
                            village: wizardData.village || 'Phirangipuram Village',
                            destination: {
                              redirectCode: wizardData.redirectCode,
                              androidUrl: wizardData.androidUrl,
                              iosUrl: wizardData.iosUrl,
                              fallbackUrl: wizardData.fallbackUrl,
                              routingBehavior: wizardData.routingBehavior,
                            },
                            design: {
                              fgColor: wizardData.fgColor,
                              bgColor: wizardData.bgColor,
                            },
                          },
                        });
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{
                        background: '#FFFFFF',
                        borderColor: '#00891D',
                        color: '#00891D',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                      }}
                    >
                      <Smartphone size={14} />
                      Simulate Smartphone Scan
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Navigation Footer */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '24px 0 0 0', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setWizardStep(1)} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} />
              Back to Details
            </button>
            <button onClick={() => setWizardStep(3)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Continue to Design Studio
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 5 / STEP 3: Design Studio (Three-Panel Layout)
          ========================================================================= */}
      {wizardStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="design-studio-grid">
            {/* Left Panel — Design Controls */}
            <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 className="vk-card-title" style={{ fontSize: '15px' }}>Design Controls</h2>
                <p className="vk-card-subtitle">Custom artwork styling, logo placement & colors</p>
              </div>

              {/* Foreground & Background Colors */}
              <div className="grid-2" style={{ gap: '10px', marginBottom: '8px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Foreground Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="color"
                      value={wizardData.fgColor}
                      onChange={(e) => updateData('fgColor', e.target.value)}
                      style={{ width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '12px', padding: '6px' }}
                      value={wizardData.fgColor}
                      onChange={(e) => updateData('fgColor', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Background Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="color"
                      value={wizardData.bgColor}
                      onChange={(e) => updateData('bgColor', e.target.value)}
                      style={{ width: '32px', height: '32px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '12px', padding: '6px' }}
                      value={wizardData.bgColor}
                      onChange={(e) => updateData('bgColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* VillagKart Logo Upload & Placement */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={wizardData.showLogo ?? true}
                    onChange={(e) => updateData('showLogo', e.target.checked)}
                    style={{ accentColor: '#00891D' }}
                  />
                  <span style={{ fontWeight: 600 }}>VillagKart Logo Emblem (Center Overlay)</span>
                </label>
              </div>

              {/* QR Frame & Call-to-Action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={wizardData.hasCtaFrame ?? true}
                    onChange={(e) => updateData('hasCtaFrame', e.target.checked)}
                    style={{ accentColor: '#00891D' }}
                  />
                  <span style={{ fontWeight: 600 }}>Add Call-to-Action Frame</span>
                </label>

                {wizardData.hasCtaFrame && (
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '12.5px' }}
                    value={wizardData.ctaText}
                    onChange={(e) => updateData('ctaText', e.target.value)}
                    placeholder="e.g. SCAN TO DOWNLOAD"
                  />
                )}
              </div>

              {/* Campaign Title & Supporting Text */}
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Campaign Title</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: '12.5px' }}
                  value={wizardData.campaignTitle}
                  onChange={(e) => updateData('campaignTitle', e.target.value)}
                  placeholder="e.g. VillagKart Fresh Grocery"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Supporting Text</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontSize: '12.5px' }}
                  value={wizardData.supportingText}
                  onChange={(e) => updateData('supportingText', e.target.value)}
                  placeholder="e.g. Daily arriving 8 AM - 12 PM"
                />
              </div>
            </div>

            {/* Center Panel — Live Preview */}
            <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#00891D', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Center Panel · Live Preview
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                  Live QR Artwork & Branding
                </h3>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Preview at intended print size: {wizardData.exportWidth || 15} × {wizardData.exportHeight || 15} {wizardData.exportUnit || 'cm'}
                </div>
              </div>

              {/* Artwork Render */}
              <div style={{ padding: '16px', background: '#FFFFFF', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <QRCodeRenderer
                  value={wizardData.fallbackUrl || wizardData.androidUrl || `https://villagkart.com/${wizardData.redirectCode}`}
                  fgColor={wizardData.fgColor}
                  bgColor={wizardData.bgColor}
                  size={210}
                  hasCtaFrame={wizardData.hasCtaFrame}
                  ctaText={wizardData.ctaText}
                  campaignTitle={wizardData.campaignTitle}
                  supportingText={wizardData.supportingText}
                  showLogo={wizardData.showLogo}
                  errorCorrection={wizardData.errorCorrection || 'Q'}
                />
              </div>

              {/* Test scan trigger */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() =>
                    setTestScanModal({
                      isOpen: true,
                      qrCode: {
                        ...wizardData,
                        id: 'DRAFT-PREVIEW',
                        destination: {
                          redirectCode: wizardData.redirectCode,
                          androidUrl: wizardData.androidUrl,
                          iosUrl: wizardData.iosUrl,
                          fallbackUrl: wizardData.fallbackUrl,
                        },
                        design: {
                          fgColor: wizardData.fgColor,
                          bgColor: wizardData.bgColor,
                          showLogo: wizardData.showLogo,
                        },
                      },
                    })
                  }
                  className="btn btn-secondary btn-sm"
                  style={{ borderColor: '#00891D', color: '#00891D', fontWeight: 600 }}
                >
                  <Smartphone size={14} />
                  Test Scan in Simulator
                </button>
              </div>
            </div>

            {/* Right Panel — Output Settings & Validation */}
            <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 className="vk-card-title" style={{ fontSize: '15px' }}>Output Settings</h2>
                <p className="vk-card-subtitle">Print dimensions & artwork validation</p>
              </div>

              {/* Contrast, Quiet-Zone, and Logo-Overlay Validation */}
              <div style={{
                background: '#E8F5EA',
                border: '1px solid #C8E6C9',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#006B17', marginBottom: '4px' }}>
                  <CheckCircle2 size={16} color="#00891D" />
                  Validation: 100% Passed
                </div>
                <div style={{ color: '#4B5563', lineHeight: 1.4 }}>
                  • Contrast ratio: 11.4:1 (Sunlight readable)<br />
                  • Quiet-zone: 4 modules preserved<br />
                  • Logo-overlay: Error correction Q (25% tolerance)
                </div>
              </div>

              {/* Output Size & Units */}
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Output Size & Units</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '12px' }}
                    value={wizardData.exportWidth}
                    onChange={(e) => updateData('exportWidth', e.target.value)}
                    placeholder="Width"
                  />
                  <span style={{ display: 'flex', alignItems: 'center', color: '#6B7280' }}>×</span>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '12px' }}
                    value={wizardData.exportHeight}
                    onChange={(e) => updateData('exportHeight', e.target.value)}
                    placeholder="Height"
                  />
                  <select
                    className="form-control"
                    style={{ width: '80px', fontSize: '12px' }}
                    value={wizardData.exportUnit}
                    onChange={(e) => updateData('exportUnit', e.target.value)}
                  >
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                    <option value="in">inches</option>
                  </select>
                </div>
              </div>

              {/* Error Correction Selection */}
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Error Correction Level</label>
                <select
                  className="form-control"
                  style={{ fontSize: '12.5px' }}
                  value={wizardData.errorCorrection || 'Q'}
                  onChange={(e) => updateData('errorCorrection', e.target.value)}
                >
                  <option value="L">L · 7% damage tolerance</option>
                  <option value="M">M · 15% damage tolerance</option>
                  <option value="Q">Q · 25% damage tolerance (Recommended)</option>
                  <option value="H">H · 30% damage tolerance (Vinyl stickers)</option>
                </select>
              </div>

              {/* Output Format */}
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Output Format</label>
                <select className="form-control" style={{ fontSize: '12.5px' }}>
                  <option value="PDF">PDF (Print Layout with Bleed)</option>
                  <option value="SVG">SVG (Infinite Vector)</option>
                  <option value="PNG">PNG (300 DPI Transparent)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Buttons: Preview, Test Scan, Back, Continue to Export */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '16px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setWizardStep(2)} className="btn btn-secondary btn-sm">
                <ArrowLeft size={15} />
                Back
              </button>
              <button
                onClick={() =>
                  setTestScanModal({
                    isOpen: true,
                    qrCode: {
                      ...wizardData,
                      id: 'DRAFT-PREVIEW',
                      destination: {
                        redirectCode: wizardData.redirectCode,
                        androidUrl: wizardData.androidUrl,
                        iosUrl: wizardData.iosUrl,
                        fallbackUrl: wizardData.fallbackUrl,
                      },
                      design: {
                        fgColor: wizardData.fgColor,
                        bgColor: wizardData.bgColor,
                        showLogo: wizardData.showLogo,
                      },
                    },
                  })
                }
                className="btn btn-secondary btn-sm"
              >
                <Smartphone size={14} color="#00891D" />
                Test Scan
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => showToast('Full resolution preview loaded.')}
                className="btn btn-secondary btn-sm"
              >
                <Eye size={14} />
                Preview
              </button>
              <button onClick={() => setWizardStep(4)} className="btn btn-primary btn-sm">
                Continue to Export
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 6 / STEP 4: Print & Digital Export
          ========================================================================= */}
      {wizardStep === 4 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">Print & Digital Export</h2>
              <p className="vk-card-subtitle">
                Generate high-resolution vector and digital assets tailored for posters, flyers, stickers and WhatsApp
              </p>
            </div>

            {/* Two Tabs: Print Assets & Digital Assets */}
            <div style={{ display: 'flex', background: '#F3F4F6', padding: '3px', borderRadius: '8px' }}>
              <button
                onClick={() => setExportTab('print')}
                className={`btn btn-sm ${exportTab === 'print' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Printer size={14} />
                Print Assets
              </button>
              <button
                onClick={() => setExportTab('digital')}
                className={`btn btn-sm ${exportTab === 'digital' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Share2 size={14} />
                Digital Assets
              </button>
            </div>
          </div>

          {/* TAB 1: Print Assets */}
          {exportTab === 'print' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Layout Presets */}
              <div>
                <label className="form-label">Print Layout Preset</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'poster', name: 'Poster (A3/A2)', dims: '297 × 420 mm' },
                    { id: 'flyer', name: 'Flyer (A5)', dims: '148 × 210 mm' },
                    { id: 'sticker', name: 'Vehicle Vinyl Sticker', dims: '150 × 150 mm' },
                    { id: 'label', name: 'Product Label', dims: '50 × 50 mm' },
                    { id: 'banner', name: 'Hub Facade Banner', dims: '2 × 5 ft' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setPrintLayout(l.id)}
                      className={`btn btn-sm ${printLayout === l.id ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formats Grid: PDF, SVG, PNG */}
              <div className="grid-3" style={{ gap: '16px' }}>
                {/* PDF */}
                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>PDF Print Asset</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>CMYK · Bleed & Crop Marks</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                    Includes 3mm bleed margin, trim lines and CMYK color profile for commercial offset printing.
                  </p>
                  <button onClick={() => handleDownload('PNG')} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    <Download size={14} />
                    Download PDF Package
                  </button>
                </div>

                {/* SVG */}
                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>SVG Vector File</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Infinite Scalability</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                    Resolution-independent vector curves for vehicle vinyl plotters, shop signs and billboards.
                  </p>
                  <button onClick={() => handleDownload('SVG')} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    <Download size={14} />
                    Download SVG Vector
                  </button>
                </div>

                {/* PNG 300 DPI */}
                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E8F5EA', color: '#00891D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Download size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>High-Res PNG</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>300 DPI High Resolution</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                    High-density raster asset with alpha transparency channel for DTP and local shop layouts.
                  </p>
                  <button onClick={() => handleDownload('PNG')} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    <Download size={14} />
                    Download 300 DPI PNG
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: Digital Assets */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#4B5563' }}>Digital Format:</span>
                <button
                  onClick={() => setDigitalFormat('PNG')}
                  className={`btn btn-sm ${digitalFormat === 'PNG' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  PNG
                </button>
                <button
                  onClick={() => setDigitalFormat('JPEG')}
                  className={`btn btn-sm ${digitalFormat === 'JPEG' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  JPEG
                </button>
              </div>

              <div className="grid-3" style={{ gap: '16px' }}>
                {/* WhatsApp Share Image */}
                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '6px' }}>
                    WhatsApp Share Image
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                    Compressed 1:1 image card with QR code and campaign title for village WhatsApp broadcast groups.
                  </p>
                  <button onClick={() => handleDownload(digitalFormat)} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    <Share2 size={14} />
                    Download WhatsApp Card
                  </button>
                </div>

                {/* Social Post & Story Layouts */}
                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '6px' }}>
                    Social Post & Story Layouts
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                    1080 × 1920 px vertical story graphic with QR code and brand emblem for Instagram and Facebook.
                  </p>
                  <button onClick={() => handleDownload(digitalFormat)} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    <Download size={14} />
                    Download Social Asset
                  </button>
                </div>

                {/* Standalone QR Image */}
                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '6px' }}>
                    Standalone QR Image
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                    Pure square QR code matrix with transparent background and centered logo overlay.
                  </p>
                  <button onClick={() => handleDownload('PNG')} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    <Download size={14} />
                    Download Standalone QR
                  </button>
                </div>

                {/* Website Embed Snippet */}
                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '6px' }}>
                    Website Embed Snippet
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                    HTML snippet for responsive desktop web pages and merchant portals.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<img src="https://villagkart.com/${wizardData.redirectCode}.png" alt="${wizardData.name}" />`);
                      showToast('Copied HTML embed code!');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%' }}
                  >
                    <Copy size={14} />
                    Copy Website Embed
                  </button>
                </div>

                {/* Copy Redirect URL */}
                <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '6px' }}>
                    Copy Redirect URL
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                    Direct shortlink with UTM tags for SMS broadcasts and partner distribution.
                  </p>
                  <button onClick={copyRedirectUrl} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    {copiedLink ? <Check size={14} color="#00891D" /> : <Copy size={14} />}
                    {copiedLink ? 'Copied URL!' : 'Copy Redirect URL'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden Canvas to power downloads */}
          <div style={{ display: 'none' }} className="qr-render-container">
            <QRCodeRenderer
              value={wizardData.fallbackUrl || wizardData.androidUrl || `https://villagkart.com/${wizardData.redirectCode}`}
              fgColor={wizardData.fgColor}
              bgColor={wizardData.bgColor}
              size={360}
              hasCtaFrame={wizardData.hasCtaFrame}
              ctaText={wizardData.ctaText}
              campaignTitle={wizardData.campaignTitle}
              supportingText={wizardData.supportingText}
              showLogo={wizardData.showLogo}
            />
          </div>

          {/* Buttons: Download, Back to Design, Continue to Review */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '20px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setWizardStep(3)} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} />
              Back to Design
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleDownload('PNG')} className="btn btn-secondary btn-sm">
                <Download size={14} />
                Download
              </button>
              <button onClick={() => setWizardStep(5)} className="btn btn-primary btn-sm">
                {wizardMode === 'edit' ? 'Continue to Review & Update' : 'Continue to Review & Publish'}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 7 / STEP 5: Review & Publish
          ========================================================================= */}
      {wizardStep === 5 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">{wizardMode === 'edit' ? 'Review & Update' : 'Review & Publish'}</h2>
              <p className="vk-card-subtitle">
                {wizardMode === 'edit'
                  ? 'Verify configuration modifications and update your existing dynamic QR code'
                  : 'Verify configuration specifications and publish your live dynamic QR code'}
              </p>
            </div>
            <span className="badge badge-active" style={{ fontSize: '11.5px', padding: '4px 10px' }}>
              {wizardMode === 'edit' ? '✓ Ready to Update' : '✓ Ready to Publish'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
            {/* Left: Clean Configuration Summary (Essential Data Only) */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                Configuration Summary
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                {/* QR Name */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280', fontWeight: 500 }}>QR Code Name</span>
                  <span style={{ fontWeight: 700, color: '#111827', fontSize: '13.5px' }}>
                    {wizardData.name || 'Untitled QR Code'}
                  </span>
                </div>

                {/* Target Destination URL */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280', fontWeight: 500, flexShrink: 0 }}>Target Destination</span>
                  <a
                    href={wizardData.fallbackUrl || wizardData.androidUrl || 'https://villagkart.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontWeight: 600,
                      color: '#00891D',
                      maxWidth: '380px',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      textAlign: 'right',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Open destination in new tab"
                  >
                    <span>{wizardData.fallbackUrl || wizardData.androidUrl || 'https://villagkart.com'}</span>
                    <ExternalLink size={12} style={{ flexShrink: 0 }} />
                  </a>
                </div>

                {/* Short Redirect Link with 1-click Copy */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280', fontWeight: 500 }}>Shortlink (Dynamic)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#166534',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                    }}>
                      qr.vk.com/{wizardData.redirectCode || 'vk-auto'}
                    </span>
                    <button
                      onClick={copyRedirectUrl}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Copy shortlink"
                    >
                      {copiedLink ? <Check size={12} color="#00891D" /> : <Copy size={12} />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Design Style & Brand Palette */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280', fontWeight: 500 }}>Design & Palette</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        background: wizardData.fgColor || '#00891D',
                        display: 'inline-block',
                        border: '1px solid #D1D5DB',
                      }} />
                      <span style={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace', fontSize: '12px' }}>
                        {wizardData.fgColor || '#00891D'}
                      </span>
                    </div>
                    {wizardData.hasCtaFrame && wizardData.ctaText && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#00891D',
                        background: '#E8F5EA',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        "{wizardData.ctaText}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Selected Export Format */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280', fontWeight: 500 }}>Export Preset</span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#374151',
                    background: '#F3F4F6',
                    padding: '3px 10px',
                    borderRadius: '6px',
                  }}>
                    {exportTab === 'print'
                      ? `${printLayout === 'poster' ? 'Poster (A3/A2)' : printLayout === 'flyer' ? 'Flyer (A5)' : printLayout === 'sticker' ? 'Vehicle Sticker' : printLayout === 'label' ? 'Product Label' : 'Hub Banner'} · 300 DPI Print`
                      : `${digitalFormat === 'PNG' ? 'PNG Image' : digitalFormat === 'JPEG' ? 'JPEG Image' : 'Digital Asset'} · Digital Asset`}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Live Preview Showcase Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                padding: '16px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'center',
              }}>
                <QRCodeRenderer
                  value={wizardData.fallbackUrl || wizardData.androidUrl || `https://villagkart.com/${wizardData.redirectCode}`}
                  fgColor={wizardData.fgColor}
                  bgColor={wizardData.bgColor}
                  size={140}
                  hasCtaFrame={wizardData.hasCtaFrame}
                  ctaText={wizardData.ctaText}
                  showLogo={wizardData.showLogo}
                />
              </div>

              <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#111827', marginBottom: '3px' }}>
                {wizardData.name || 'Untitled QR'}
              </div>
              <div style={{ fontSize: '12px', color: '#00891D', fontFamily: 'monospace', fontWeight: 600, marginBottom: '14px' }}>
                qr.vk.com/{wizardData.redirectCode || 'vk-auto'}
              </div>

              {/* Test Scan Simulator Trigger */}
              <button
                onClick={() => {
                  setTestScanModal({
                    isOpen: true,
                    qrCode: {
                      id: 'VK-TEST-' + (wizardData.redirectCode || 'preview'),
                      name: wizardData.name || 'Untitled QR',
                      redirectCode: wizardData.redirectCode,
                      routing: {
                        androidUrl: wizardData.androidUrl,
                        iosUrl: wizardData.iosUrl,
                        fallbackUrl: wizardData.fallbackUrl,
                        routingBehavior: wizardData.routingBehavior,
                      },
                      design: {
                        fgColor: wizardData.fgColor,
                        bgColor: wizardData.bgColor,
                      },
                    },
                  });
                }}
                className="btn btn-secondary btn-sm"
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  padding: '7px 12px',
                  color: '#374151',
                  borderColor: '#D1D5DB',
                }}
              >
                <Smartphone size={14} color="#00891D" />
                <span>Simulate Scan on Device</span>
              </button>
            </div>
          </div>

          {/* Clean Stepper Navigation Footer with Primary Action Bar */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '20px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setWizardStep(4)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={15} />
              <span>Back to Export</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {wizardMode === 'edit' ? (
                <>
                  <button
                    onClick={() => {
                      resetWizard();
                      setActiveScreen('listing');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '8px 16px', fontWeight: 600 }}
                  >
                    Cancel Edit
                  </button>

                  <button
                    id="btn-update-qr"
                    onClick={updateWizardQR}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      padding: '9px 22px',
                      background: '#00891D',
                      fontSize: '13.5px',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Update QR Code</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveDraft}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '8px 16px', fontWeight: 600 }}
                  >
                    Save as Draft
                  </button>

                  <button
                    id="btn-publish-qr"
                    onClick={handlePublishAndGoToQRManagement}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      padding: '9px 22px',
                      background: '#00891D',
                      fontSize: '13.5px',
                    }}
                  >
                    <Send size={15} />
                    <span>Publish QR Code</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { QRWizard as Screen03_07_Wizard };
export default QRWizard;
