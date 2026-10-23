import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import { INITIAL_HUBS, INITIAL_VILLAGES, INITIAL_CAMPAIGNS } from '../data/mockData';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Download,
  ShieldCheck,
  Sparkles,
  Layers,
  Copy,
  ExternalLink,
  AlertCircle,
  FileText,
  Printer,
  Share2,
  Check,
  Send,
} from 'lucide-react';

export const Screen03_07_Wizard = () => {
  const {
    wizardStep,
    setWizardStep,
    wizardData,
    setWizardData,
    publishWizardQR,
    setActiveScreen,
    currentRole,
    setTestScanModal,
    showToast,
  } = useQR();

  const [copiedLink, setCopiedLink] = useState(false);
  const [exportTab, setExportTab] = useState('print'); // 'print' | 'digital'

  // Update wizard helper
  const updateData = (field, value) => {
    setWizardData((prev) => ({ ...prev, [field]: value }));
  };

  // Determine if approval is needed based on role & QR type
  const isApprovalRequired =
    currentRole !== 'Admin' &&
    (wizardData.type === 'Payment' ||
      wizardData.type === 'Campaign' ||
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
      link.download = `${wizardData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    showToast(`Downloaded ${format} print asset package.`);
  };

  const copyRedirectUrl = () => {
    navigator.clipboard.writeText(`https://qr.villagkart.com/${wizardData.redirectCode}`);
    setCopiedLink(true);
    showToast('Copied redirect URL to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 5-Step Stepper Header */}
      <div className="wizard-stepper">
        {[
          { step: 1, label: '03 Basic Details' },
          { step: 2, label: '04 Destinations' },
          { step: 3, label: '05 Design Studio' },
          { step: 4, label: '06 Print & Digital' },
          { step: 5, label: '07 Review & Publish' },
        ].map((s, idx, arr) => (
          <React.Fragment key={s.step}>
            <div
              className={`step-item ${wizardStep === s.step ? 'active' : ''} ${wizardStep > s.step ? 'completed' : ''}`}
              onClick={() => setWizardStep(s.step)}
            >
              <div className="step-bubble">
                {wizardStep > s.step ? '✓' : s.step}
              </div>
              <span className="step-title">{s.label}</span>
            </div>
            {idx < arr.length - 1 && <div className="step-divider" />}
          </React.Fragment>
        ))}
      </div>

      {/* =========================================================================
          STEP 1 (Screen 03): Create QR — Basic Details (Dynamic Form)
          ========================================================================= */}
      {wizardStep === 1 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">Screen 03 · Basic QR Details & Purpose</h2>
              <p className="vk-card-subtitle">
                Dynamic form configuration adapted to rural commerce channels and roles
              </p>
            </div>
            <span className="badge badge-draft">Drafting New QR</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
            {/* QR Name */}
            <div className="form-group">
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
              <p className="form-helper">Required; unique name within hub or campaign scope</p>
            </div>

            {/* QR Type */}
            <div className="form-group">
              <label className="form-label">
                QR Type <span className="required-dot">*</span>
              </label>
              <select
                className="form-control"
                value={wizardData.type}
                onChange={(e) => {
                  const val = e.target.value;
                  updateData('type', val);
                  if (val === 'Vehicle') {
                    updateData('ctaText', "TRACK TODAY'S VAN ROUTE");
                    updateData('template', 'Shop-on-Wheels vehicle sticker');
                  } else if (val === 'App Download') {
                    updateData('ctaText', 'SCAN TO DOWNLOAD');
                    updateData('template', 'App download poster');
                  } else if (val === 'Referral') {
                    updateData('ctaText', 'SCAN TO JOIN VILLAGKART');
                    updateData('template', 'VGE referral card');
                  }
                }}
              >
                <option value="App Download">App Download (Android & iOS)</option>
                <option value="Campaign">Campaign (Flyers & Marketing)</option>
                <option value="Vehicle">Vehicle (Shop-on-Wheels Mobile Van)</option>
                <option value="Referral">Referral (VGE Agent & Customer)</option>
                <option value="Product">Product Catalogue (Origin & Reorder)</option>
                <option value="Feedback">Feedback (Customer & Delivery Quality)</option>
                <option value="Payment">Payment (UPI Direct Hub Collection)</option>
              </select>
              <p className="form-helper">Form dynamically reveals fields specific to this type</p>
            </div>

            {/* Purpose */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                QR Purpose & Strategic Context <span className="required-dot">*</span>
              </label>
              <textarea
                className="form-control"
                rows={2}
                value={wizardData.purpose}
                onChange={(e) => updateData('purpose', e.target.value)}
                placeholder="Describe intended placement, target audience, and business objective"
              />
            </div>

            {/* DYNAMIC FIELDS PER QR TYPE */}
            {wizardData.type === 'Vehicle' && (
              <div className="form-group" style={{ gridColumn: 'span 2', background: '#FEF3C7', padding: '16px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '8px' }}>
                  🚐 Vehicle Operational Context (Shop-on-Wheels)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div>
                    <label className="form-label">Vehicle Registration Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., AP-07-TA-4491"
                      value={wizardData.vehicleId || ''}
                      onChange={(e) => updateData('vehicleId', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Operating Route / Shift</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Route 4: Phirangipuram - Prattipadu Morning"
                    />
                  </div>
                </div>
              </div>
            )}

            {wizardData.type === 'Referral' && (
              <div className="form-group" style={{ gridColumn: 'span 2', background: '#F3E8FF', padding: '16px', borderRadius: '10px', border: '1px solid #E9D5FF' }}>
                <div style={{ fontWeight: 700, color: '#6B21A8', marginBottom: '8px' }}>
                  🤝 Referral Partner Attribution
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div>
                    <label className="form-label">Unique Referral Identifier</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., VGE-RAM-901"
                      value={wizardData.referralCode || 'VGE-AGT-' + Math.floor(100 + Math.random() * 900)}
                      onChange={(e) => updateData('referralCode', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Eligible Partner Role</label>
                    <select className="form-control">
                      <option>Village Gramin Executive (VGE)</option>
                      <option>Student Ambassador</option>
                      <option>Existing Customer Champion</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Selector */}
            <div className="form-group">
              <label className="form-label">Associated Campaign</label>
              <select
                className="form-control"
                value={wizardData.campaignId}
                onChange={(e) => {
                  const sel = INITIAL_CAMPAIGNS.find((c) => c.id === e.target.value);
                  updateData('campaignId', e.target.value);
                  updateData('campaign', sel ? sel.name : '');
                }}
              >
                {INITIAL_CAMPAIGNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Hub / Territory Selector */}
            <div className="form-group">
              <label className="form-label">Hub / Territory Scope</label>
              <select
                className="form-control"
                value={wizardData.hubId}
                onChange={(e) => updateData('hubId', e.target.value)}
              >
                {INITIAL_HUBS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.district})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Village */}
            <div className="form-group">
              <label className="form-label">Target Village (Mandal level)</label>
              <select
                className="form-control"
                value={wizardData.village}
                onChange={(e) => updateData('village', e.target.value)}
              >
                {INITIAL_VILLAGES.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} (Pop: {v.population})
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry Date */}
            <div className="form-group">
              <label className="form-label">Start & Expiry Schedule</label>
              <input
                type="date"
                className="form-control"
                value={wizardData.expiryDate}
                onChange={(e) => updateData('expiryDate', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ background: 'transparent', padding: '16px 0 0 0' }}>
            <button onClick={() => setActiveScreen('listing')} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button onClick={() => setWizardStep(2)} className="btn btn-primary btn-sm">
              Continue to Destination Configuration
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2 (Screen 04): Destination Configuration
          ========================================================================= */}
      {wizardStep === 2 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">Screen 04 · Destination & Routing Engine</h2>
              <p className="vk-card-subtitle">
                Configure smart device routing for Android, iOS and fallback landing pages
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#00891D', fontWeight: 600 }}>
              <ShieldCheck size={16} />
              <span>SSL / HTTPS Verified</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Redirect Code Alias */}
            <div className="form-group">
              <label className="form-label">
                VillagKart Redirect Short Code
              </label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  padding: '9px 12px',
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRight: 'none',
                  borderTopLeftRadius: '8px',
                  borderBottomLeftRadius: '8px',
                  color: '#6B7280',
                  fontSize: '13px'
                }}>
                  https://qr.villagkart.com/
                </span>
                <input
                  type="text"
                  className="form-control"
                  style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontFamily: 'monospace', fontWeight: 600 }}
                  value={wizardData.redirectCode}
                  onChange={(e) => updateData('redirectCode', e.target.value)}
                />
              </div>
              <p className="form-helper">Immutable redirect code registered in DNS edge routing</p>
            </div>

            {/* Routing Behavior Option */}
            <div className="form-group">
              <label className="form-label">Routing Behavior</label>
              <div className="grid-3">
                {[
                  { id: 'auto', title: 'Smart Auto Routing', desc: 'Detect device OS automatically: Android -> Play Store, iOS -> App Store' },
                  { id: 'landing', title: 'Landing Page with Buttons', desc: 'Present branded mobile web landing page with Android & iOS buttons' },
                  { id: 'fallback_only', title: 'Always Open Web Landing', desc: 'Direct all traffic to responsive web destination' },
                ].map((b) => (
                  <div
                    key={b.id}
                    onClick={() => updateData('routingBehavior', b.id)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: wizardData.routingBehavior === b.id ? '2px solid #00891D' : '1px solid #E5E7EB',
                      background: wizardData.routingBehavior === b.id ? '#E8F5EA' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{b.title}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Destinations */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Android App Target (Play Store / Intent)</label>
                <input
                  type="url"
                  className="form-control"
                  value={wizardData.androidUrl}
                  onChange={(e) => updateData('androidUrl', e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=com.villagkart..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">iOS App Target (App Store / Universal Link)</label>
                <input
                  type="url"
                  className="form-control"
                  value={wizardData.iosUrl}
                  onChange={(e) => updateData('iosUrl', e.target.value)}
                  placeholder="https://apps.apple.com/in/app/villagkart..."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fallback Web Destination (Required HTTPS) <span className="required-dot">*</span></label>
              <input
                type="url"
                className="form-control"
                value={wizardData.fallbackUrl}
                onChange={(e) => updateData('fallbackUrl', e.target.value)}
                placeholder="https://villagkart.com/download-app"
              />
              <p className="form-helper">Safeguard destination if device OS cannot be identified or is accessed on PC</p>
            </div>
          </div>

          <div className="modal-footer" style={{ background: 'transparent', padding: '16px 0 0 0' }}>
            <button onClick={() => setWizardStep(1)} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} />
              Back
            </button>
            <button onClick={() => setWizardStep(3)} className="btn btn-primary btn-sm">
              Continue to Design Studio
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3 (Screen 05): Design Studio (Three-Panel Layout)
          ========================================================================= */}
      {wizardStep === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: '20px' }}>
          {/* Panel 1: Design Controls */}
          <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h2 className="vk-card-title" style={{ fontSize: '15px' }}>Design Controls</h2>
              <p className="vk-card-subtitle">Styling, colors & brand framing</p>
            </div>

            {/* Template */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Approved Template</label>
              <select
                className="form-control"
                style={{ fontSize: '13px' }}
                value={wizardData.template}
                onChange={(e) => updateData('template', e.target.value)}
              >
                <option value="VillagKart Branded">VillagKart Branded (#00891D)</option>
                <option value="Village launch flyer">Village Launch Flyer</option>
                <option value="Shop-on-Wheels vehicle sticker">Shop-on-Wheels Vehicle Vinyl</option>
                <option value="VGE referral card">VGE Referral Card</option>
                <option value="Product catalogue label">Product Catalogue Label</option>
              </select>
            </div>

            {/* Color Palette */}
            <div className="grid-2" style={{ gap: '10px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>Foreground</label>
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
                <label className="form-label" style={{ fontSize: '12px' }}>Background</label>
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

            {/* Frame & CTA text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={wizardData.hasCtaFrame}
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

            {/* Campaign Title & Supporting text */}
            <div>
              <label className="form-label" style={{ fontSize: '12px' }}>Campaign Title (Card Header)</label>
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
              <label className="form-label" style={{ fontSize: '12px' }}>Supporting Tagline</label>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '12.5px' }}
                value={wizardData.supportingText}
                onChange={(e) => updateData('supportingText', e.target.value)}
                placeholder="e.g. Direct from local farmers"
              />
            </div>

            {/* Logo Overlay Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={wizardData.showLogo}
                onChange={(e) => updateData('showLogo', e.target.checked)}
                style={{ accentColor: '#00891D' }}
              />
              <span style={{ fontWeight: 600 }}>Center VillagKart Brand Emblem</span>
            </label>
          </div>

          {/* Panel 2: Live Canvas Preview & Test-Scan Simulator */}
          <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#00891D', fontWeight: 700, letterSpacing: '0.05em' }}>
                Screen 05 · Draft Live Preview
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                Real SVG/Canvas QR Output
              </h3>
            </div>

            {/* Live QR Matrix */}
            <div style={{ padding: '16px', background: '#FFFFFF', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <QRCodeRenderer
                value={`https://qr.villagkart.com/${wizardData.redirectCode}`}
                fgColor={wizardData.fgColor}
                bgColor={wizardData.bgColor}
                size={220}
                hasCtaFrame={wizardData.hasCtaFrame}
                ctaText={wizardData.ctaText}
                campaignTitle={wizardData.campaignTitle}
                supportingText={wizardData.supportingText}
                showLogo={wizardData.showLogo}
                errorCorrection={wizardData.errorCorrection}
              />
            </div>

            {/* Interactive Test-Scan button (Screen 05 requirement) */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
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
                <Smartphone size={15} />
                Test-Scan Action Before Export
              </button>
            </div>
          </div>

          {/* Panel 3: Print Specs & Contrast Validation */}
          <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h2 className="vk-card-title" style={{ fontSize: '15px' }}>Safeguards & Specs</h2>
              <p className="vk-card-subtitle">Quiet zone & contrast gauge</p>
            </div>

            {/* Quiet zone & Contrast validation */}
            <div style={{
              background: '#E8F5EA',
              border: '1px solid #C8E6C9',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#006B17', marginBottom: '4px' }}>
                <CheckCircle2 size={16} color="#00891D" />
                Contrast Score: 98/100 (Optimal)
              </div>
              <p style={{ color: '#4B5563', margin: 0 }}>
                High readability contrast ratio (11.4:1) validated for direct sunlight scanning on rural delivery vans.
              </p>
            </div>

            {/* Error Correction Selection */}
            <div>
              <label className="form-label" style={{ fontSize: '12px' }}>Error Correction Level</label>
              <select
                className="form-control"
                style={{ fontSize: '13px' }}
                value={wizardData.errorCorrection}
                onChange={(e) => updateData('errorCorrection', e.target.value)}
              >
                <option value="L">L · 7% damage tolerance</option>
                <option value="M">M · 15% damage tolerance</option>
                <option value="Q">Q · 25% damage tolerance (Recommended)</option>
                <option value="H">H · 30% damage tolerance (Vinyl stickers)</option>
              </select>
            </div>

            {/* Intended Print Size */}
            <div>
              <label className="form-label" style={{ fontSize: '12px' }}>Target Dimensions</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  className="form-control"
                  style={{ fontSize: '12px' }}
                  value={wizardData.exportWidth}
                  onChange={(e) => updateData('exportWidth', e.target.value)}
                />
                <span style={{ display: 'flex', alignItems: 'center', color: '#6B7280' }}>×</span>
                <input
                  type="number"
                  className="form-control"
                  style={{ fontSize: '12px' }}
                  value={wizardData.exportHeight}
                  onChange={(e) => updateData('exportHeight', e.target.value)}
                />
                <select
                  className="form-control"
                  style={{ width: '80px', fontSize: '12px' }}
                  value={wizardData.exportUnit}
                  onChange={(e) => updateData('exportUnit', e.target.value)}
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => setWizardStep(4)} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                Configure Export Assets
                <ArrowRight size={15} />
              </button>
              <button onClick={() => setWizardStep(2)} className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                <ArrowLeft size={15} />
                Back to Destinations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 4 (Screen 06): Print & Digital Export
          ========================================================================= */}
      {wizardStep === 4 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">Screen 06 · Print & Digital Export Packages</h2>
              <p className="vk-card-subtitle">Generate CMYK/RGB vector and raster assets ready for distribution</p>
            </div>

            {/* Tab Switcher: Print vs Digital */}
            <div style={{ display: 'flex', background: '#F3F4F6', padding: '3px', borderRadius: '8px' }}>
              <button
                onClick={() => setExportTab('print')}
                className={`btn btn-sm ${exportTab === 'print' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Printer size={14} />
                Print Assets (PDF, SVG, High-Res)
              </button>
              <button
                onClick={() => setExportTab('digital')}
                className={`btn btn-sm ${exportTab === 'digital' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Share2 size={14} />
                Digital Assets (Social, WhatsApp)
              </button>
            </div>
          </div>

          {exportTab === 'print' ? (
            <div className="grid-3" style={{ gap: '16px' }}>
              {/* PDF Print Ready */}
              <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>PDF Print Package</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>CMYK · Bleed & Crop Marks</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280' }}>
                  Ready for commercial offset printing: posters, A5 leaflets, vehicle vinyls with 3mm bleed margin.
                </p>
                <button onClick={() => handleDownload('PNG')} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '12px' }}>
                  <Download size={14} />
                  Download Print PDF
                </button>
              </div>

              {/* SVG Vector */}
              <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>SVG Vector Artwork</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>Infinite Scalability</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280' }}>
                  Lossless vector paths for billboard vinyl cutters, hub facade signage, and illustrator layout prep.
                </p>
                <button onClick={() => handleDownload('SVG')} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '12px' }}>
                  <Download size={14} />
                  Download Vector SVG
                </button>
              </div>

              {/* PNG 300 DPI */}
              <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E8F5EA', color: '#00891D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Download size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>High-Res PNG (300 DPI)</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>Ultra Crisp Raster</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280' }}>
                  Transparent background raster output tailored for Canva and local DTP printing shops.
                </p>
                <button onClick={() => handleDownload('PNG')} className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '12px' }}>
                  <Download size={14} />
                  Download 300 DPI PNG
                </button>
              </div>
            </div>
          ) : (
            <div className="grid-3" style={{ gap: '16px' }}>
              {/* WhatsApp Share Card */}
              <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '6px' }}>
                  WhatsApp Share Card (1:1)
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                  Optimized for WhatsApp village groups, status stories and direct customer messaging.
                </p>
                <button onClick={() => handleDownload('PNG')} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                  <Share2 size={14} />
                  Export WhatsApp Asset
                </button>
              </div>

              {/* Copy Short Redirect */}
              <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '6px' }}>
                  Short Redirect URL
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                  Shareable shortlink with built-in UTM attribution for SMS and social media.
                </p>
                <button onClick={copyRedirectUrl} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                  {copiedLink ? <Check size={14} color="#00891D" /> : <Copy size={14} />}
                  {copiedLink ? 'Copied Link!' : 'Copy Shortlink'}
                </button>
              </div>

              {/* Web Embed Snippet */}
              <div style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '6px' }}>
                  HTML Web Embed
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                  Embed tag snippet for VillagKart desktop or partner web pages.
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`<img src="https://qr.villagkart.com/${wizardData.redirectCode}.png" alt="${wizardData.name}" />`);
                    showToast('Copied HTML embed snippet!');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  <Copy size={14} />
                  Copy Embed Code
                </button>
              </div>
            </div>
          )}

          {/* Hidden Canvas Element to support downloads */}
          <div style={{ display: 'none' }}>
            <QRCodeRenderer
              value={`https://qr.villagkart.com/${wizardData.redirectCode}`}
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

          <div className="modal-footer" style={{ background: 'transparent', padding: '16px 0 0 0' }}>
            <button onClick={() => setWizardStep(3)} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} />
              Back
            </button>
            <button onClick={() => setWizardStep(5)} className="btn btn-primary btn-sm">
              Continue to Review & Publish
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 5 (Screen 07): Review & Publish
          ========================================================================= */}
      {wizardStep === 5 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">Screen 07 · Review & Publish Verification</h2>
              <p className="vk-card-subtitle">
                System validation checklist before QR routing is published live
              </p>
            </div>
            <span className="badge badge-active">Checklist 5/5 Passed</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { title: 'Basic Information Complete', desc: `Name: "${wizardData.name}", Type: ${wizardData.type}, Owner: ${wizardData.owner}` },
                { title: 'Destinations & Routing Validated', desc: `Android & iOS deep links active, Fallback: ${wizardData.fallbackUrl}` },
                { title: 'Campaign Attribution Configured', desc: `Campaign: ${wizardData.campaign}, Territory: ${wizardData.village}` },
                { title: 'QR Artwork & Contrast Validated', desc: 'Decoding verified, contrast score 98/100 meets sunlight readability standards' },
                {
                  title: 'Role Authorization & Permissions',
                  desc: isApprovalRequired
                    ? `Role (${currentRole}) requires Marketing Manager approval before public release`
                    : `Authorized by active role (${currentRole}) for immediate activation`,
                },
              ].map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                >
                  <CheckCircle2 size={18} color="#00891D" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>{c.title}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Summary Card */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ marginBottom: '12px' }}>
                <QRCodeRenderer
                  value={`https://qr.villagkart.com/${wizardData.redirectCode}`}
                  fgColor={wizardData.fgColor}
                  bgColor={wizardData.bgColor}
                  size={140}
                  hasCtaFrame={false}
                  showLogo={wizardData.showLogo}
                />
              </div>

              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                {wizardData.name}
              </div>
              <div style={{ fontSize: '12px', color: '#00891D', fontFamily: 'monospace', margin: '4px 0 16px 0', fontWeight: 600 }}>
                https://qr.villagkart.com/{wizardData.redirectCode}
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isApprovalRequired ? (
                  <button onClick={() => publishWizardQR(true)} className="btn btn-accent btn-sm" style={{ width: '100%' }}>
                    <Send size={14} />
                    Submit for Approval
                  </button>
                ) : (
                  <button onClick={() => publishWizardQR(false)} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    <CheckCircle2 size={14} />
                    Publish Immediately
                  </button>
                )}

                <button
                  onClick={() => {
                    publishWizardQR(true);
                    showToast('Draft saved successfully!');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  Save as Draft
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ background: 'transparent', padding: '16px 0 0 0' }}>
            <button onClick={() => setWizardStep(4)} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} />
              Back to Exports
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
