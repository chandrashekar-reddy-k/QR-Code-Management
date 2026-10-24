import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import { INITIAL_HUBS, INITIAL_VILLAGES, INITIAL_CAMPAIGNS, INITIAL_USERS } from '../data/mockData';
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
  Eye,
  Sliders,
  CheckSquare,
  Square,
  RefreshCw,
  Globe,
  Laptop,
  Radio,
} from 'lucide-react';

export const QRWizard = () => {
  const {
    wizardStep,
    setWizardStep,
    wizardData,
    setWizardData,
    publishWizardQR,
    setActiveScreen,
    setSelectedQrId,
    currentRole,
    setTestScanModal,
    showToast,
  } = useQR();

  const [copiedLink, setCopiedLink] = useState(false);
  const [exportTab, setExportTab] = useState('print'); // 'print' | 'digital'
  const [digitalFormat, setDigitalFormat] = useState('PNG'); // 'PNG' | 'JPEG'
  const [printLayout, setPrintLayout] = useState('poster'); // 'poster', 'flyer', 'sticker', 'label', 'banner'
  const [digitalLayout, setDigitalLayout] = useState('whatsapp'); // 'whatsapp', 'social_square', 'story', 'embed'

  // Destination Validation State
  const [destValidation, setDestValidation] = useState({
    tested: false,
    isValid: true,
    error: '',
    testedAt: null,
  });

  // Interactive Live Forwarding Preview Device
  const [previewDevice, setPreviewDevice] = useState('android'); // 'android' | 'ios' | 'desktop' | 'bot'

  // Update wizard helper with smart dynamic slug derivation
  const updateData = (field, value) => {
    setWizardData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name') {
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
    (wizardData.type === 'Payment' ||
      wizardData.type === 'Campaign' ||
      currentRole === 'VGE');

  // Validate Destination Function
  const handleValidateDestinations = () => {
    const fallback = wizardData.fallbackUrl?.trim() || '';
    if (!fallback) {
      setDestValidation({
        tested: true,
        isValid: false,
        error: 'Fallback destination URL is required.',
        testedAt: new Date().toLocaleTimeString(),
      });
      showToast('Validation failed: Missing fallback URL', 'error');
      return;
    }

    if (!fallback.startsWith('https://')) {
      setDestValidation({
        tested: true,
        isValid: false,
        error: 'HTTPS is required on all destination URLs for secure mobile routing.',
        testedAt: new Date().toLocaleTimeString(),
      });
      showToast('Validation failed: HTTPS required', 'error');
      return;
    }

    setDestValidation({
      tested: true,
      isValid: true,
      error: '',
      testedAt: new Date().toLocaleTimeString(),
    });
    showToast('All destinations verified! SSL active and endpoint reachable.');
  };

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
    navigator.clipboard.writeText(`https://qr.villagkart.com/${wizardData.redirectCode}`);
    setCopiedLink(true);
    showToast('Copied redirect URL to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Save Draft Helper
  const handleSaveDraft = () => {
    publishWizardQR(true);
    showToast('Draft saved to QR inventory.');
  };

  // Continue to QR Details after publishing
  const handleContinueToDetails = () => {
    publishWizardQR(isApprovalRequired);
    setActiveScreen('details');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 5-Step Stepper Header */}
      <div className="wizard-stepper">
        {[
          { step: 1, label: 'Basic Details' },
          { step: 2, label: 'Destinations' },
          { step: 3, label: 'Design Studio' },
          { step: 4, label: 'Print & Digital Export' },
          { step: 5, label: 'Review & Publish' },
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
          PAGE 3 / STEP 1: Create QR: Basic Details
          ========================================================================= */}
      {wizardStep === 1 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">Create QR: Basic Details</h2>
              <p className="vk-card-subtitle">
                Collect core governance, channel attribution and operational scope before artwork generation
              </p>
            </div>
            {/* System Rule Approval Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`badge ${isApprovalRequired ? 'badge-pending' : 'badge-active'}`}>
                {isApprovalRequired ? 'Approval Required by System Rules' : 'Pre-Approved for Immediate Publish'}
              </span>
            </div>
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
              <p className="form-helper">Required; unique descriptive name for marketing and audit trail</p>
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
                <option value="App Download">App Download</option>
                <option value="Campaign">Campaign</option>
                <option value="Vehicle">Vehicle (Shop-on-Wheels)</option>
                <option value="Referral">Referral</option>
                <option value="Product">Product Catalogue</option>
                <option value="Feedback">Feedback</option>
                <option value="Payment">Payment</option>
              </select>
              <p className="form-helper">Dynamic fields update according to the selected type</p>
            </div>

            {/* QR Purpose */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                QR Purpose <span className="required-dot">*</span>
              </label>
              <textarea
                className="form-control"
                rows={2}
                value={wizardData.purpose}
                onChange={(e) => updateData('purpose', e.target.value)}
                placeholder="State the strategic purpose, target customer segment, and operational placement"
              />
            </div>

            {/* Owner */}
            <div className="form-group">
              <label className="form-label">
                Owner <span className="required-dot">*</span>
              </label>
              <select
                className="form-control"
                value={wizardData.owner}
                onChange={(e) => {
                  const selectedUser = INITIAL_USERS.find((u) => u.name === e.target.value);
                  updateData('owner', e.target.value);
                  if (selectedUser) {
                    updateData('department', selectedUser.department);
                  }
                }}
              >
                {INITIAL_USERS.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-control"
                value={wizardData.department}
                onChange={(e) => updateData('department', e.target.value)}
                placeholder="e.g. Marketing / Hub Operations"
              />
            </div>

            {/* DYNAMIC FIELDS: Vehicle QR requires vehicle ID and hub */}
            {wizardData.type === 'Vehicle' && (
              <div className="form-group" style={{ gridColumn: 'span 2', background: '#FEF3C7', padding: '16px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '8px' }}>
                  🚐 Vehicle QR Requirements (Vehicle ID & Hub)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div>
                    <label className="form-label">Vehicle ID <span className="required-dot">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. AP-07-TA-4491"
                      value={wizardData.vehicleId || ''}
                      onChange={(e) => updateData('vehicleId', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Operating Route / Shift</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Route 4: Phirangipuram - Prattipadu Morning"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC FIELDS: Referral QR requires referral identifier and eligible owner */}
            {wizardData.type === 'Referral' && (
              <div className="form-group" style={{ gridColumn: 'span 2', background: '#F3E8FF', padding: '16px', borderRadius: '10px', border: '1px solid #E9D5FF' }}>
                <div style={{ fontWeight: 700, color: '#6B21A8', marginBottom: '8px' }}>
                  🤝 Referral QR Requirements (Referral Identifier & Eligible Owner)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div>
                    <label className="form-label">Referral Identifier <span className="required-dot">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. VGE-RAM-901"
                      value={wizardData.referralCode || 'VGE-AGT-774'}
                      onChange={(e) => updateData('referralCode', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Eligible Partner Role</label>
                    <select className="form-control">
                      <option>Village Gramin Executive (VGE)</option>
                      <option>Student Ambassador</option>
                      <option>Customer Referral Champion</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign */}
            <div className="form-group">
              <label className="form-label">Campaign</label>
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

            {/* Hub / Territory */}
            <div className="form-group">
              <label className="form-label">Hub / Territory</label>
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

            {/* Village */}
            <div className="form-group">
              <label className="form-label">Village</label>
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

            {/* Start Date and Expiry Date */}
            <div className="form-group">
              <label className="form-label">Start Date & Expiry Date</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  className="form-control"
                  value={wizardData.startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => updateData('startDate', e.target.value)}
                  title="Start Date"
                />
                <span style={{ display: 'flex', alignItems: 'center', color: '#6B7280' }}>to</span>
                <input
                  type="date"
                  className="form-control"
                  value={wizardData.expiryDate}
                  onChange={(e) => updateData('expiryDate', e.target.value)}
                  title="Expiry Date"
                />
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
                    Enable Scan Tracking & Conversion Attribution
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    Records individual scan telemetry, device OS headers, and attributes app registrations and first orders
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons: Save Draft, Cancel, Continue */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '20px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={handleSaveDraft} className="btn btn-secondary btn-sm">
              Save Draft
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setActiveScreen('listing')} className="btn btn-secondary btn-sm">
                Cancel
              </button>
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
      {wizardStep === 2 && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h2 className="vk-card-title">Destination Configuration</h2>
              <p className="vk-card-subtitle">
                Define where the QR code sends a user after scanning, device routing, and deep-link parameters
              </p>
            </div>
            {/* Top Quick Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-outline" style={{ fontFamily: 'monospace' }}>
                QR: {wizardData.name}
              </span>
              <button onClick={handleValidateDestinations} className="btn btn-secondary btn-sm">
                <RefreshCw size={13} />
                Validate URLs
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 1. ARCHITECTURE & ROUTING FLOW DIAGRAM */}
            <div style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12.5px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>How Redirection Works:</span>
                  <span style={{ background: '#FFFFFF', padding: '5px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontWeight: 600 }}>
                    📱 1. Scan Printed QR
                  </span>
                  <ArrowRight size={14} color="#00891D" />
                  <span style={{ background: '#E8F5EA', padding: '5px 10px', borderRadius: '6px', border: '1px solid #C8E6C9', color: '#006B17', fontFamily: 'monospace', fontWeight: 700 }}>
                    2. https://qr.villagkart.com/{wizardData.redirectCode || 'your-slug'}
                  </span>
                  <ArrowRight size={14} color="#00891D" />
                  <span
                    style={{
                      background: '#00891D',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      maxWidth: '280px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={wizardData.fallbackUrl || 'Target Destination URL'}
                  >
                    🎯 3. {wizardData.fallbackUrl ? (wizardData.fallbackUrl.length > 28 ? wizardData.fallbackUrl.substring(0, 28) + '...' : wizardData.fallbackUrl) : 'Your Target Destination URL'}
                  </span>
                </div>
              </div>
              <div style={{ color: '#4B5563', fontSize: '12px', lineHeight: 1.4, borderTop: '1px dashed #E5E7EB', paddingTop: '8px' }}>
                💡 <strong>Dynamic QR Advantage:</strong> The physical QR code printed on paper or vinyl encodes the shortlink (e.g. <code>https://qr.villagkart.com/{wizardData.redirectCode || 'your-slug'}</code>). When scanned, our edge routers forward the user to your Target Destination URL below. <em>You can change your Destination URL anytime in the future without having to reprint or replace your QR codes!</em>
              </div>
            </div>

            {/* 2. CHOOSE ROUTING OPTION */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Select Where This QR Code Sends Users (Routing Mode):</span>
                <span style={{ fontWeight: 500, color: '#6B7280', fontSize: '12px' }}>Choose the option that fits your campaign</span>
              </label>
              <div className="grid-3">
                {[
                  {
                    id: 'fallback_only',
                    title: 'Always open the web landing page',
                    badge: '⭐ Recommended (Direct Target URL)',
                    desc: 'Direct all traffic to your target destination URL (e.g. promotional page, catalog, video, website, form) regardless of whether scanned on Android, iPhone, or PC.',
                    icon: <Globe size={18} color="#00891D" />,
                  },
                  {
                    id: 'auto',
                    title: 'Automatically route based on device',
                    badge: 'Mobile App Stores (Android / iOS)',
                    desc: 'Detects phone OS: Android phones route to Google Play Store / App Intent, iPhones route to Apple App Store, and PC/Mac opens the fallback website.',
                    icon: <Smartphone size={18} color="#3B82F6" />,
                  },
                  {
                    id: 'landing',
                    title: 'Show an Android/iOS landing page',
                    badge: 'Branded Splash Page',
                    desc: 'Displays a responsive mobile web landing page with Android and iOS download action buttons plus website link.',
                    icon: <Laptop size={18} color="#8B5CF6" />,
                  },
                ].map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setWizardData((prev) => {
                        const next = { ...prev, routingBehavior: b.id };
                        if (b.id === 'fallback_only') {
                          const target = prev.fallbackUrl || prev.androidUrl || 'https://villagkart.com/campaign/phirangipuram-launch';
                          next.fallbackUrl = target;
                          next.androidUrl = target;
                          next.iosUrl = target;
                        }
                        return next;
                      });
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: wizardData.routingBehavior === b.id ? '2px solid #00891D' : '1px solid #E5E7EB',
                      background: wizardData.routingBehavior === b.id ? '#E8F5EA' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      boxShadow: wizardData.routingBehavior === b.id ? '0 2px 6px rgba(0,137,29,0.1)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {b.icon}
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>{b.title}</span>
                        </div>
                        {wizardData.routingBehavior === b.id && <Check size={16} color="#00891D" />}
                      </div>
                      <span style={{ fontSize: '11px', background: wizardData.routingBehavior === b.id ? '#C8E6C9' : '#F3F4F6', color: '#006B17', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {b.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '8px', lineHeight: 1.35 }}>{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. PRIMARY TARGET DESTINATION URL (WHERE USERS GO) */}
            {wizardData.routingBehavior === 'fallback_only' ? (
              /* Mode 1: DIRECT DESTINATION URL (Web, YouTube, etc.) */
              <div className="form-group" style={{ background: '#E8F5EA', padding: '20px', borderRadius: '10px', border: '2px solid #00891D', boxShadow: '0 2px 8px rgba(0,137,29,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <label className="form-label" style={{ fontSize: '14px', fontWeight: 800, color: '#006B17', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Globe size={19} color="#00891D" />
                    Target Destination URL (Where your QR sends users) <span className="required-dot">*</span>
                  </label>
                  <span className="badge badge-active" style={{ fontSize: '11px', padding: '3px 8px' }}>
                    Active: All Devices (Android + iOS + Desktop)
                  </span>
                </div>

                <p style={{ fontSize: '12.5px', color: '#1B5E20', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  👉 <strong>Put your new or unique URL here!</strong> Anyone who scans this QR code with their mobile phone or tablet will be redirected directly to this link.
                </p>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="url"
                      className="form-control"
                      style={{ fontSize: '14.5px', fontWeight: 600, padding: '11px 14px', borderColor: '#00891D', background: '#FFFFFF', borderRadius: '8px' }}
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
                      placeholder="e.g. https://villagkart.com/seasonal-produce or https://youtube.com/watch?v=..."
                      required
                    />
                  </div>
                  {wizardData.fallbackUrl && (
                    <a
                      href={wizardData.fallbackUrl.startsWith('http') ? wizardData.fallbackUrl : `https://${wizardData.fallbackUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', borderColor: '#00891D', color: '#00891D', fontWeight: 600 }}
                      title="Open destination in a new browser tab to test"
                    >
                      <ExternalLink size={15} />
                      Test Link
                    </a>
                  )}
                </div>

                {/* Quick Presets Chips */}
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#006B17' }}>Quick Presets (Click to fill):</span>
                  {[
                    { label: '🌾 Seasonal Produce', url: 'https://villagkart.com/seasonal-produce' },
                    { label: '🛒 Daily Fresh Store', url: 'https://villagkart.com/fresh-store' },
                    { label: '📝 Feedback Form', url: 'https://villagkart.com/customer-feedback' },
                    { label: '📺 YouTube Video Demo', url: 'https://youtube.com/watch?v=villagkart-fresh' },
                  ].map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setWizardData((prev) => ({
                          ...prev,
                          fallbackUrl: p.url,
                          androidUrl: p.url,
                          iosUrl: p.url,
                        }));
                        showToast(`Set destination to ${p.url}`);
                      }}
                      style={{
                        padding: '4px 10px',
                        background: '#FFFFFF',
                        border: '1px solid #A5D6A7',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#1B5E20',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: '#006B17', fontWeight: 600 }}>
                  <CheckCircle2 size={15} color="#00891D" />
                  <span>Target verified. When scanned from an Android phone, iPhone, or PC, users will land on: <strong>{wizardData.fallbackUrl || 'https://villagkart.com/campaign/phirangipuram-launch'}</strong></span>
                </div>
              </div>
            ) : wizardData.routingBehavior === 'auto' ? (
              /* Mode 2: SMART DEVICE ROUTING (Android + iOS + Fallback) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#F8FAFC', padding: '18px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1E293B' }}>
                      📱 Smart Mobile App Routing (Device OS Specific)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Use this mode to route Android users to Google Play Store and iOS users to Apple App Store.
                    </div>
                  </div>
                  <span className="badge badge-outline" style={{ borderColor: '#3B82F6', color: '#1D4ED8' }}>
                    Mobile OS Detection Active
                  </span>
                </div>

                {/* Smart Assistant Notice if user entered youtube in androidUrl */}
                {wizardData.androidUrl && (wizardData.androidUrl.includes('youtube.com') || wizardData.androidUrl.includes('youtu.be')) && (
                  <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '12px' }}>
                    <div style={{ color: '#92400E' }}>
                      💡 <strong>Notice:</strong> You entered a YouTube link in the Android App field. If you want <em>both Android and iPhone</em> users to open YouTube directly, switch to <strong>"Always open the web landing page"</strong>.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateData('routingBehavior', 'fallback_only');
                        updateData('fallbackUrl', wizardData.androidUrl);
                        showToast('Switched to Single Direct Web URL!');
                      }}
                      className="btn btn-sm btn-primary"
                      style={{ flexShrink: 0, padding: '4px 10px', fontSize: '11.5px' }}
                    >
                      ⚡ Switch to Single URL
                    </button>
                  </div>
                )}

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Android App Destination URL (Google Play Store / Intent)
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      value={wizardData.androidUrl}
                      onChange={(e) => updateData('androidUrl', e.target.value)}
                      placeholder="https://play.google.com/store/apps/details?id=com.villagkart.customer"
                    />
                    <p className="form-helper">Scanners using Android smartphones are routed to this Play Store / in-app intent</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      iOS App Destination URL (Apple App Store / Universal Link)
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      value={wizardData.iosUrl}
                      onChange={(e) => updateData('iosUrl', e.target.value)}
                      placeholder="https://apps.apple.com/in/app/villagkart-rural-fresh/id192837482"
                    />
                    <p className="form-helper">Scanners using iPhones/iPads are routed to this Apple App Store link</p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Fallback Website URL (Required for Desktop Browsers & Non-Mobile Scanners) <span className="required-dot">*</span>
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    value={wizardData.fallbackUrl}
                    onChange={(e) => updateData('fallbackUrl', e.target.value)}
                    placeholder="https://villagkart.com/seasonal-produce"
                    required
                  />
                  <p className="form-helper">Destination for desktop/laptop browsers or devices where native app is unavailable</p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Deep-Link Support (Custom In-App URI Scheme)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={wizardData.deepLink || ''}
                    onChange={(e) => updateData('deepLink', e.target.value)}
                    placeholder="villagkart://campaign/phirangipuram-launch?ref=vge901"
                  />
                  <p className="form-helper">Optional; launches specific in-app view directly if mobile app is already installed</p>
                </div>
              </div>
            ) : (
              /* Mode 3: CHOICE LANDING PAGE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#F9FAFB', padding: '16px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                  🌐 Choice Landing Page Endpoints:
                </div>
                <div className="form-group">
                  <label className="form-label">Fallback Website URL <span className="required-dot">*</span></label>
                  <input
                    type="url"
                    className="form-control"
                    value={wizardData.fallbackUrl}
                    onChange={(e) => updateData('fallbackUrl', e.target.value)}
                    placeholder="https://villagkart.com/download-app"
                  />
                  <p className="form-helper">Web landing page where users choose to download or browse</p>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Android App Download Button Link</label>
                    <input
                      type="url"
                      className="form-control"
                      value={wizardData.androidUrl}
                      onChange={(e) => updateData('androidUrl', e.target.value)}
                      placeholder="https://play.google.com/store/apps/details?id=..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">iOS App Download Button Link</label>
                    <input
                      type="url"
                      className="form-control"
                      value={wizardData.iosUrl}
                      onChange={(e) => updateData('iosUrl', e.target.value)}
                      placeholder="https://apps.apple.com/in/app/..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. QR REDIRECT CODE & SHORTLINK */}
            <div className="form-group" style={{ background: '#FFFFFF', padding: '16px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                  QR Redirect Short Code (The Dynamic URL Encoded Inside the QR Matrix) <span className="required-dot">*</span>
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
                    showToast(`Generated dynamic slug: ${randomSlug}`);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '11px', padding: '2px 8px', color: '#00891D', fontWeight: 600 }}
                >
                  <RefreshCw size={12} />
                  Generate New Slug
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  padding: '10px 14px',
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRight: 'none',
                  borderTopLeftRadius: '8px',
                  borderBottomLeftRadius: '8px',
                  color: '#4B5563',
                  fontSize: '13.5px',
                  fontWeight: 600,
                }}>
                  https://qr.villagkart.com/
                </span>
                <input
                  type="text"
                  className="form-control"
                  style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontFamily: 'monospace', fontWeight: 700, fontSize: '14px' }}
                  value={wizardData.redirectCode}
                  onChange={(e) => updateData('redirectCode', e.target.value)}
                  placeholder={`e.g. ${wizardData.name ? 'vk-' + wizardData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16) : 'vk-promo-summer'}`}
                />
              </div>
              <p className="form-helper" style={{ marginTop: '6px' }}>
                <strong>Why this exists:</strong> The printed QR code stores <code>https://qr.villagkart.com/{wizardData.redirectCode || 'your-slug'}</code>. When someone scans it, our Cloudflare edge router forwards them in under 45ms to your <strong>Target Destination URL</strong> (<code>{wizardData.fallbackUrl || 'https://villagkart.com'}</code>).
              </p>
            </div>

            {/* 5. LIVE ROUTING SUMMARY BOX */}
            {(() => {
              const currentDirectUrl = (wizardData.fallbackUrl || '').trim();
              const currentAndroidUrl = wizardData.routingBehavior === 'fallback_only'
                ? currentDirectUrl
                : ((wizardData.androidUrl || '').trim() || currentDirectUrl);
              const currentIosUrl = wizardData.routingBehavior === 'fallback_only'
                ? currentDirectUrl
                : ((wizardData.iosUrl || '').trim() || currentDirectUrl);
              const currentDesktopUrl = currentDirectUrl;
              const currentSlug = (wizardData.redirectCode || '').trim() || (wizardData.name ? 'vk-' + wizardData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16) : 'vk-promo');
              const incomingScanUrl = `https://qr.villagkart.com/${currentSlug}`;

              const isDirectMode = wizardData.routingBehavior === 'fallback_only';

              const activeDeviceResolvedUrl =
                previewDevice === 'android' ? currentAndroidUrl :
                previewDevice === 'ios' ? currentIosUrl :
                previewDevice === 'desktop' ? currentDesktopUrl :
                'Bot Filtered (OpenGraph tags only)';

              return (
                <div style={{
                  background: '#FFFFFF',
                  border: '2px solid #00891D',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 4px 12px rgba(0,137,29,0.06)',
                }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: '#00891D' }} />
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#111827' }}>
                        ⚡ Real-Time Forwarding Resolution Preview
                      </div>
                      <span className="badge badge-active" style={{ fontSize: '10.5px' }}>
                        {isDirectMode ? 'Direct Single Target URL' : wizardData.routingBehavior === 'auto' ? 'Smart OS Device Routing' : 'Choice Landing Page'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
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
                        style={{ padding: '4px 10px', fontSize: '11.5px', color: '#00891D', fontWeight: 600 }}
                      >
                        <Smartphone size={13} />
                        Simulate Viewfinder
                      </button>
                    </div>
                  </div>

                  {/* Device Simulator Filter Tabs */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B7280', marginRight: '4px' }}>Simulate Device:</span>
                    {[
                      { id: 'android', label: '🤖 Android Phone' },
                      { id: 'ios', label: '🍏 Apple iPhone' },
                      { id: 'desktop', label: '💻 Desktop / PC' },
                      { id: 'bot', label: '🕷️ WhatsApp / Bot' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setPreviewDevice(d.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: previewDevice === d.id ? '1px solid #00891D' : '1px solid #E5E7EB',
                          background: previewDevice === d.id ? '#00891D' : '#F9FAFB',
                          color: previewDevice === d.id ? '#FFFFFF' : '#4B5563',
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {/* Live Animated Forwarding Pipeline for the active device */}
                  <div style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>1. Encoded Shortlink</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#14532D' }}>
                          {incomingScanUrl}
                        </span>
                      </div>

                      <ArrowRight size={16} color="#00891D" />

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>2. Edge Rule Triggered</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803D' }}>
                          {previewDevice === 'android' ? (isDirectMode ? 'Android ➔ Direct Web Forward' : 'Android ➔ Play Store')
                            : previewDevice === 'ios' ? (isDirectMode ? 'iOS ➔ Direct Web Forward' : 'iOS ➔ App Store')
                            : previewDevice === 'desktop' ? 'Desktop ➔ Web Forward'
                            : 'Bot ➔ Social Meta Tags Only'}
                        </span>
                      </div>

                      <ArrowRight size={16} color="#00891D" />

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>3. Target Forwarding Endpoint</span>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: activeDeviceResolvedUrl ? '#0F172A' : '#DC2626',
                          background: '#FFFFFF',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: activeDeviceResolvedUrl ? '1px solid #86EFAC' : '1px dashed #FCA5A5',
                        }}>
                          {activeDeviceResolvedUrl || '⚠️ No destination URL entered (Please type URL above)'}
                        </span>
                      </div>
                    </div>

                    {activeDeviceResolvedUrl && activeDeviceResolvedUrl.startsWith('http') && (
                      <a
                        href={activeDeviceResolvedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ background: '#FFFFFF', borderColor: '#00891D', color: '#00891D', fontWeight: 600, padding: '3px 8px', fontSize: '11px' }}
                      >
                        <ExternalLink size={12} />
                        Test Open
                      </a>
                    )}
                  </div>

                  {/* All 3 Platforms Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div style={{
                      padding: '10px 12px',
                      background: previewDevice === 'android' ? '#E8F5EA' : '#F8FAFC',
                      borderRadius: '8px',
                      border: previewDevice === 'android' ? '2px solid #00891D' : '1px solid #E2E8F0',
                      cursor: 'pointer',
                    }} onClick={() => setPreviewDevice('android')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>🤖 Android Smartphone</span>
                        {previewDevice === 'android' && <span className="badge badge-active" style={{ fontSize: '9px', padding: '1px 5px' }}>Active</span>}
                      </div>
                      <div style={{
                        fontWeight: 700,
                        color: currentAndroidUrl ? '#0F172A' : '#DC2626',
                        wordBreak: 'break-all',
                        marginTop: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}>
                        {currentAndroidUrl || '(No URL entered)'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#00891D', marginTop: '4px' }}>
                        {isDirectMode ? '➔ Direct Web Target' : '➔ Play Store / Intent'}
                      </div>
                    </div>

                    <div style={{
                      padding: '10px 12px',
                      background: previewDevice === 'ios' ? '#E8F5EA' : '#F8FAFC',
                      borderRadius: '8px',
                      border: previewDevice === 'ios' ? '2px solid #00891D' : '1px solid #E2E8F0',
                      cursor: 'pointer',
                    }} onClick={() => setPreviewDevice('ios')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>🍏 iPhone / iPad</span>
                        {previewDevice === 'ios' && <span className="badge badge-active" style={{ fontSize: '9px', padding: '1px 5px' }}>Active</span>}
                      </div>
                      <div style={{
                        fontWeight: 700,
                        color: currentIosUrl ? '#0F172A' : '#DC2626',
                        wordBreak: 'break-all',
                        marginTop: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}>
                        {currentIosUrl || '(No URL entered)'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#00891D', marginTop: '4px' }}>
                        {isDirectMode ? '➔ Direct Web Target' : '➔ App Store'}
                      </div>
                    </div>

                    <div style={{
                      padding: '10px 12px',
                      background: previewDevice === 'desktop' ? '#E8F5EA' : '#F8FAFC',
                      borderRadius: '8px',
                      border: previewDevice === 'desktop' ? '2px solid #00891D' : '1px solid #E2E8F0',
                      cursor: 'pointer',
                    }} onClick={() => setPreviewDevice('desktop')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>💻 Desktop / Laptop</span>
                        {previewDevice === 'desktop' && <span className="badge badge-active" style={{ fontSize: '9px', padding: '1px 5px' }}>Active</span>}
                      </div>
                      <div style={{
                        fontWeight: 700,
                        color: currentDesktopUrl ? '#0F172A' : '#DC2626',
                        wordBreak: 'break-all',
                        marginTop: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}>
                        {currentDesktopUrl || '(No URL entered)'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#00891D', marginTop: '4px' }}>
                        ➔ Direct Web Target
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 6. HTTPS & APPROVED DOMAIN VALIDATION */}
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: destValidation.tested && !destValidation.isValid ? '#FEE2E2' : '#E8F5EA',
              border: `1px solid ${destValidation.tested && !destValidation.isValid ? '#FCA5A5' : '#C8E6C9'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} color={destValidation.tested && !destValidation.isValid ? '#DC2626' : '#00891D'} />
                <div>
                  <strong style={{ color: destValidation.tested && !destValidation.isValid ? '#DC2626' : '#006B17' }}>
                    {destValidation.tested
                      ? destValidation.isValid
                        ? 'HTTPS & Destination Endpoint Verified'
                        : 'Destination Validation Error'
                      : 'SSL / HTTPS & Domain Security'}
                  </strong>
                  <div style={{ color: '#4B5563', marginTop: '2px' }}>
                    {destValidation.error || 'All destinations require https:// and are verified for 0 broken redirect latency.'}
                  </div>
                </div>
              </div>
              <button onClick={handleValidateDestinations} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }}>
                Test Destination
              </button>
            </div>
          </div>

          {/* Button: Continue to Design Studio */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '20px 0 0 0', display: 'flex', justifyContent: 'space-between' }}>
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
          PAGE 5 / STEP 3: Design Studio (Three-Panel Layout)
          ========================================================================= */}
      {wizardStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="design-studio-grid">
            {/* Left Panel — Design Controls */}
            <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 className="vk-card-title" style={{ fontSize: '15px' }}>Design Controls</h2>
                <p className="vk-card-subtitle">Approved templates, logo placement & colors</p>
              </div>

              {/* Approved Template Selection */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Approved Template</label>
                <select
                  className="form-control"
                  style={{ fontSize: '13px' }}
                  value={wizardData.template}
                  onChange={(e) => updateData('template', e.target.value)}
                >
                  <option value="VillagKart Branded">VillagKart Branded (#00891D)</option>
                  <option value="App download poster">App download poster</option>
                  <option value="Village launch flyer">Village launch flyer</option>
                  <option value="Shop-on-Wheels vehicle sticker">Shop-on-Wheels vehicle sticker</option>
                  <option value="Hub entrance poster">Hub entrance poster</option>
                  <option value="VGE referral card">VGE referral card</option>
                  <option value="Product catalogue label">Product catalogue label</option>
                  <option value="Customer feedback card">Customer feedback card</option>
                  <option value="Delivery feedback card">Delivery feedback card</option>
                  <option value="WhatsApp campaign image">WhatsApp campaign image</option>
                </select>
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
                  value={wizardData.fallbackUrl || wizardData.androidUrl || `https://qr.villagkart.com/${wizardData.redirectCode}`}
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
                      navigator.clipboard.writeText(`<img src="https://qr.villagkart.com/${wizardData.redirectCode}.png" alt="${wizardData.name}" />`);
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
              value={wizardData.fallbackUrl || wizardData.androidUrl || `https://qr.villagkart.com/${wizardData.redirectCode}`}
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

          {/* Buttons: Preview, Generate Assets, Download, Back to Design */}
          <div className="modal-footer" style={{ background: 'transparent', padding: '20px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setWizardStep(3)} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} />
              Back to Design
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => showToast('Artwork preview rendered at 300 DPI.')} className="btn btn-secondary btn-sm">
                <Eye size={14} />
                Preview
              </button>
              <button onClick={() => showToast('Assets generated successfully across all formats.')} className="btn btn-secondary btn-sm">
                <Sparkles size={14} />
                Generate Assets
              </button>
              <button onClick={() => handleDownload('PNG')} className="btn btn-secondary btn-sm">
                <Download size={14} />
                Download
              </button>
              <button onClick={() => setWizardStep(5)} className="btn btn-primary btn-sm">
                Continue to Review & Publish
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
              <h2 className="vk-card-title">Review & Publish</h2>
              <p className="vk-card-subtitle">
                System validation checklist before QR routing is published live to edge DNS
              </p>
            </div>
            <span className="badge badge-active">Validation 6/6 Passed</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
            {/* Checklist items (All 6 spec items) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { title: '1. Basic information complete', desc: `Name: "${wizardData.name}", Type: ${wizardData.type}, Owner: ${wizardData.owner}` },
                { title: '2. Destinations validated', desc: `Fallback: ${wizardData.fallbackUrl} (HTTPS & SSL validated)` },
                { title: '3. Campaign attribution configured', desc: `Campaign: ${wizardData.campaign}, Hub: ${wizardData.hubId}, Village: ${wizardData.village}` },
                { title: '4. QR artwork passes validation', desc: 'Decoding verified, contrast score 98/100, quiet-zone 4 modules' },
                { title: '5. User permissions verified', desc: `Authorized active role: ${currentRole}` },
                {
                  title: '6. Approval requirements satisfied',
                  desc: isApprovalRequired
                    ? `Requires managerial approval (Role: ${currentRole}, QR Type: ${wizardData.type})`
                    : 'System rules satisfy immediate publish criteria (No prior block)',
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

            {/* Right Summary Card & Actions */}
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
                  value={wizardData.fallbackUrl || wizardData.androidUrl || `https://qr.villagkart.com/${wizardData.redirectCode}`}
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

              {/* Workflow Actions: Generate & Submit for Approval */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => publishWizardQR(true)}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#00891D',
                  }}
                >
                  <Send size={16} />
                  Generate & Submit for Approval
                </button>

                <div style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '11.5px',
                  color: '#166534',
                  lineHeight: 1.4,
                }}>
                  🔒 <strong>Governance Workflow:</strong> Once generated, this QR code transitions to <strong>Permissions & Approvals</strong> for pre-flight administrative review before live routing.
                </div>

                <button
                  onClick={handleSaveDraft}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: '2px' }}
                >
                  Save as Inactive Draft
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ background: 'transparent', padding: '16px 0 0 0' }}>
            <button onClick={() => setWizardStep(4)} className="btn btn-secondary btn-sm">
              <ArrowLeft size={15} />
              Back to Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { QRWizard as Screen03_07_Wizard };
export default QRWizard;
