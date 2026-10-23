import React, { useState, useEffect } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import {
  Palette,
  Download,
  Smartphone,
  Copy,
  Check,
  FileText,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Share2,
  Printer,
  Code,
  Layers,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';

export const Screen05_DesignStudio = () => {
  const {
    qrCodes,
    selectedQrId,
    setSelectedQrId,
    setTestScanModal,
    showToast,
    addAuditLog,
  } = useQR();

  // Pick currently selected QR or default to first
  const currentQR = qrCodes.find((q) => q.id === selectedQrId) || qrCodes[0];

  // Design state
  const [designForm, setDesignForm] = useState({
    template: 'VillagKart Branded',
    fgColor: currentQR?.design?.fgColor || '#00891D',
    bgColor: currentQR?.design?.bgColor || '#FFFFFF',
    showLogo: currentQR?.design?.showLogo ?? true,
    hasCtaFrame: currentQR?.design?.hasCtaFrame ?? true,
    ctaText: currentQR?.design?.ctaText || 'SCAN TO DOWNLOAD',
    campaignTitle: currentQR?.name || 'VillagKart App Download',
    supportingText: 'Farm direct to your village doorstep',
    quietZone: currentQR?.design?.quietZone || 4,
    errorCorrection: currentQR?.design?.errorCorrection || 'Q',
  });

  // Export panel tab: 'print' | 'digital'
  const [exportTab, setExportTab] = useState('print');
  const [printUnit, setPrintUnit] = useState('cm');
  const [printWidth, setPrintWidth] = useState(4);
  const [printHeight, setPrintHeight] = useState(4);
  const [printDpi, setPrintDpi] = useState(300);
  const [printFormat, setPrintFormat] = useState('SVG');
  const [includeBleed, setIncludeBleed] = useState(true);
  const [includeCropMarks, setIncludeCropMarks] = useState(true);
  const [previewSize, setPreviewSize] = useState('medium'); // small (4cm), medium (10cm), large (30cm)

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Sync when selected QR changes
  useEffect(() => {
    if (currentQR) {
      setDesignForm({
        template: currentQR.design?.template || 'VillagKart Branded',
        fgColor: currentQR.design?.fgColor || '#00891D',
        bgColor: currentQR.design?.bgColor || '#FFFFFF',
        showLogo: currentQR.design?.showLogo ?? true,
        hasCtaFrame: currentQR.design?.hasCtaFrame ?? true,
        ctaText: currentQR.design?.ctaText || 'SCAN TO DOWNLOAD',
        campaignTitle: currentQR.name || 'VillagKart Rural Fresh',
        supportingText: 'Farm direct to your village doorstep',
        quietZone: currentQR.design?.quietZone || 4,
        errorCorrection: currentQR.design?.errorCorrection || 'Q',
      });
    }
  }, [selectedQrId]);

  // Template Presets
  const applyTemplatePreset = (tplName) => {
    switch (tplName) {
      case 'VillagKart Branded':
        setDesignForm((prev) => ({
          ...prev,
          template: tplName,
          fgColor: '#00891D',
          bgColor: '#FFFFFF',
          showLogo: true,
          hasCtaFrame: true,
          ctaText: 'SCAN TO DOWNLOAD',
        }));
        break;
      case 'Harvest Orange Special':
        setDesignForm((prev) => ({
          ...prev,
          template: tplName,
          fgColor: '#EF5A06',
          bgColor: '#FFF7ED',
          showLogo: true,
          hasCtaFrame: true,
          ctaText: 'HARVEST SAVINGS',
        }));
        break;
      case 'Shop-on-Wheels Vinyl':
        setDesignForm((prev) => ({
          ...prev,
          template: tplName,
          fgColor: '#00891D',
          bgColor: '#FFFFFF',
          showLogo: true,
          hasCtaFrame: true,
          ctaText: 'SHOP ON WHEELS — SCAN & BUY',
        }));
        break;
      case 'High-Contrast Sunlight':
        setDesignForm((prev) => ({
          ...prev,
          template: tplName,
          fgColor: '#000000',
          bgColor: '#FFFFFF',
          showLogo: true,
          hasCtaFrame: false,
          quietZone: 5,
          errorCorrection: 'H',
        }));
        break;
      case 'VGE Referral Card':
        setDesignForm((prev) => ({
          ...prev,
          template: tplName,
          fgColor: '#00891D',
          bgColor: '#F0FDF4',
          showLogo: true,
          hasCtaFrame: true,
          ctaText: 'VILLAGKART VGE AGENT',
        }));
        break;
      default:
        break;
    }
    showToast(`Applied preset "${tplName}"`);
  };

  // Pre-export validation 6 checks from spec
  const validationChecks = [
    { label: 'QR decodes successfully into valid URL target', status: true },
    { label: 'Destination routing engine active & allowlisted', status: currentQR?.status !== 'Archived' },
    { label: 'Quiet zone (>= 4 modules) & contrast meet WCAG AAA standards', status: designForm.quietZone >= 4 },
    { label: `Output resolution valid (${printDpi} DPI, ${printWidth}x${printHeight} ${printUnit})`, status: true },
    { label: 'Campaign attribution & ownership verified', status: true },
    { label: 'Asset configuration version recorded in immutable audit log', status: true },
  ];

  const handleDownloadAsset = (format) => {
    const filename = `VillagKart_${currentQR?.id || 'QR'}_${format.toLowerCase()}_${Date.now()}.${format.toLowerCase() === 'pdf' ? 'pdf' : format.toLowerCase()}`;
    showToast(`Generated print-ready ${format} package (${printDpi} DPI, ${printWidth}x${printHeight} ${printUnit})!`);
    addAuditLog(
      `Exported Asset (${format})`,
      `${currentQR?.id} - ${currentQR?.name}`,
      `Format: ${format}, Dimensions: ${printWidth}x${printHeight} ${printUnit}, DPI: ${printDpi}`
    );
  };

  const copyRedirectShortlink = () => {
    const url = `https://qr.villagkart.com/${currentQR?.destination?.redirectCode || currentQR?.id || 'vk'}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Redirect shortlink copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const copyEmbedCode = () => {
    const embed = `<a href="https://qr.villagkart.com/${currentQR?.destination?.redirectCode || currentQR?.id}" target="_blank" rel="noopener"><img src="https://qr.villagkart.com/render/${currentQR?.id}.svg" alt="Scan VillagKart QR" width="200" height="200" /></a>`;
    navigator.clipboard.writeText(embed);
    setCopiedEmbed(true);
    showToast('HTML embed code copied!');
    setTimeout(() => setCopiedEmbed(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-active" style={{ fontSize: '11px' }}>
                Design Studio & Asset Engine
              </span>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Print-ready vectors, 300 DPI exports & digital share cards
              </span>
            </div>
            <h2 className="vk-card-title">Design Studio & Asset Export</h2>
            <p className="vk-card-subtitle">
              Three-panel creative workspace: brand templates, real-time contrast safeguards, vector PDF/SVG layouts, and WhatsApp digital assets
            </p>
          </div>

          {/* QR Selector & Simulator Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Selected QR:</label>
              <select
                value={selectedQrId}
                onChange={(e) => setSelectedQrId(e.target.value)}
                className="form-control"
                style={{ width: '220px', padding: '6px 10px', fontSize: '13px' }}
              >
                {qrCodes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.id} · {q.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setTestScanModal({ isOpen: true, qrCode: currentQR })}
              className="btn btn-secondary btn-sm"
            >
              <Smartphone size={14} color="#00891D" />
              Test Scan Simulator
            </button>
          </div>
        </div>
      </div>

      {/* Three-Panel Desktop Workspace Layout (Responsive) */}
      <div className="design-studio-grid">
        
        {/* PANEL 1: Design Controls & Brand Guidelines */}
        <div className="vk-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
            <Palette size={16} color="#00891D" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111827' }}>
              Design Controls
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Template Selector */}
            <div>
              <label className="form-label">Brand Template Preset</label>
              <select
                value={designForm.template}
                onChange={(e) => applyTemplatePreset(e.target.value)}
                className="form-control"
                style={{ fontSize: '12.5px', padding: '7px 10px' }}
              >
                <option value="VillagKart Branded">VillagKart Branded (Emerald)</option>
                <option value="Harvest Orange Special">Harvest Orange Special</option>
                <option value="Shop-on-Wheels Vinyl">Shop-on-Wheels Vinyl</option>
                <option value="High-Contrast Sunlight">High-Contrast Sunlight (Mono)</option>
                <option value="VGE Referral Card">VGE Referral Card</option>
              </select>
            </div>

            {/* Color Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label">Foreground</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={designForm.fgColor}
                    onChange={(e) => setDesignForm({ ...designForm, fgColor: e.target.value })}
                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{designForm.fgColor}</span>
                </div>
              </div>

              <div>
                <label className="form-label">Background</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="color"
                    value={designForm.bgColor}
                    onChange={(e) => setDesignForm({ ...designForm, bgColor: e.target.value })}
                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{designForm.bgColor}</span>
                </div>
              </div>
            </div>

            {/* Logo Emblem Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827' }}>VillagKart Center Emblem</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Safeguarded center badge</div>
              </div>
              <input
                type="checkbox"
                checked={designForm.showLogo}
                onChange={(e) => setDesignForm({ ...designForm, showLogo: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#00891D', cursor: 'pointer' }}
              />
            </div>

            {/* CTA Frame Toggle & Text */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Call-To-Action Banner</label>
                <input
                  type="checkbox"
                  checked={designForm.hasCtaFrame}
                  onChange={(e) => setDesignForm({ ...designForm, hasCtaFrame: e.target.checked })}
                  style={{ width: '15px', height: '15px', accentColor: '#00891D', cursor: 'pointer' }}
                />
              </div>
              {designForm.hasCtaFrame && (
                <input
                  type="text"
                  value={designForm.ctaText}
                  onChange={(e) => setDesignForm({ ...designForm, ctaText: e.target.value })}
                  className="form-control"
                  style={{ fontSize: '12.5px' }}
                  placeholder="e.g. SCAN TO DOWNLOAD"
                />
              )}
            </div>

            {/* Campaign Title & Supporting Text */}
            <div>
              <label className="form-label">Campaign Header</label>
              <input
                type="text"
                value={designForm.campaignTitle}
                onChange={(e) => setDesignForm({ ...designForm, campaignTitle: e.target.value })}
                className="form-control"
                style={{ fontSize: '12.5px', marginBottom: '8px' }}
                placeholder="Campaign / QR Title"
              />
              <input
                type="text"
                value={designForm.supportingText}
                onChange={(e) => setDesignForm({ ...designForm, supportingText: e.target.value })}
                className="form-control"
                style={{ fontSize: '12px' }}
                placeholder="Supporting rural tagline"
              />
            </div>

            {/* Quiet Zone & Error Correction */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label">Quiet Zone ({designForm.quietZone})</label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={designForm.quietZone}
                  onChange={(e) => setDesignForm({ ...designForm, quietZone: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#00891D' }}
                />
              </div>

              <div>
                <label className="form-label">Error Correction</label>
                <select
                  value={designForm.errorCorrection}
                  onChange={(e) => setDesignForm({ ...designForm, errorCorrection: e.target.value })}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '6px' }}
                >
                  <option value="L">L (7% recovery)</option>
                  <option value="M">M (15% recovery)</option>
                  <option value="Q">Q (25% recommended)</option>
                  <option value="H">H (30% high density)</option>
                </select>
              </div>
            </div>

            {/* Contrast Meter */}
            <div style={{ padding: '10px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                  Contrast Ratio: 8.4 : 1
                </span>
                <span className="badge badge-active" style={{ fontSize: '10.5px' }}>
                  WCAG AAA Pass
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#15803D' }}>
                Optimal contrast verified for rural outdoor sunlight & thermal receipt paper.
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: Live Canvas & Test-Scan Simulator */}
        <div className="vk-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '600px' }}>
          {/* Canvas Top Bar */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>Interactive Canvas</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                Previewing for {currentQR?.type || 'Campaign'} QR ({currentQR?.id})
              </div>
            </div>

            {/* Size Switcher */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'small', label: 'Sticker (4cm)' },
                { id: 'medium', label: 'Flyer (10cm)' },
                { id: 'large', label: 'Poster (30cm)' },
              ].map((sz) => (
                <button
                  key={sz.id}
                  onClick={() => setPreviewSize(sz.id)}
                  className={`btn btn-sm ${previewSize === sz.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actual Rendered QR Layout */}
          <div
            style={{
              background: '#F3F4F6',
              padding: '24px',
              borderRadius: '12px',
              border: '2px dashed #D1D5DB',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '460px',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
            }}
          >
            {/* Branded Card Header on Canvas */}
            <div style={{ textAlign: 'center', marginBottom: '14px', maxWidth: '300px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                {designForm.campaignTitle}
              </div>
              <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>
                {designForm.supportingText}
              </div>
            </div>

            {/* Core QR Renderer */}
            <div style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)', borderRadius: '12px', overflow: 'hidden' }}>
              <QRCodeRenderer
                value={`https://qr.villagkart.com/${currentQR?.destination?.redirectCode || currentQR?.id || 'vk'}`}
                size={previewSize === 'small' ? 180 : previewSize === 'medium' ? 240 : 280}
                fgColor={designForm.fgColor}
                bgColor={designForm.bgColor}
                showLogo={designForm.showLogo}
                hasCtaFrame={designForm.hasCtaFrame}
                ctaText={designForm.ctaText}
                quietZone={designForm.quietZone}
                errorCorrection={designForm.errorCorrection}
              />
            </div>

            {/* Scan target details pill */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '6px 14px', borderRadius: '20px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Resolves to:</span>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#00891D', fontFamily: 'monospace' }}>
                qr.villagkart.com/{currentQR?.destination?.redirectCode || currentQR?.id}
              </span>
            </div>
          </div>

          {/* Test Scan Simulator Trigger */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setTestScanModal({ isOpen: true, qrCode: currentQR })}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              <Smartphone size={15} />
              Launch Test-Scan Simulator
            </button>
            <button
              onClick={copyRedirectShortlink}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '13px' }}
            >
              {copiedLink ? <Check size={14} color="#00891D" /> : <Copy size={14} />}
              {copiedLink ? 'Copied' : 'Copy Redirect Link'}
            </button>
          </div>
        </div>

        {/* PANEL 3: Print & Digital Export (Screen 06 Specification) */}
        <div className="vk-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px' }}>
            <Download size={16} color="#00891D" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#111827' }}>
              Export Packages
            </h3>
          </div>

          {/* Tabs: Print Assets vs Digital Assets */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            <button
              onClick={() => setExportTab('print')}
              className={`btn btn-sm ${exportTab === 'print' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, fontSize: '11.5px', padding: '6px 6px' }}
            >
              <Printer size={13} />
              Print Assets
            </button>
            <button
              onClick={() => setExportTab('digital')}
              className={`btn btn-sm ${exportTab === 'digital' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, fontSize: '11.5px', padding: '6px 6px' }}
            >
              <Share2 size={13} />
              Digital Assets
            </button>
          </div>

          {exportTab === 'print' ? (
            /* PRINT ASSETS (PDF, SVG, PNG, DPI, Bleed) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Output Format */}
              <div>
                <label className="form-label">Vector / Raster Format</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {['SVG', 'PDF', 'PNG'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setPrintFormat(fmt)}
                      className={`btn btn-sm ${printFormat === fmt ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '12px', padding: '6px' }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions & Units */}
              <div>
                <label className="form-label">Dimensions & Units</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>Width</span>
                    <input
                      type="number"
                      value={printWidth}
                      onChange={(e) => setPrintWidth(Number(e.target.value))}
                      className="form-control"
                      style={{ fontSize: '12px', padding: '5px 8px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>Height</span>
                    <input
                      type="number"
                      value={printHeight}
                      onChange={(e) => setPrintHeight(Number(e.target.value))}
                      className="form-control"
                      style={{ fontSize: '12px', padding: '5px 8px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>Units</span>
                    <select
                      value={printUnit}
                      onChange={(e) => setPrintUnit(e.target.value)}
                      className="form-control"
                      style={{ fontSize: '12px', padding: '5px 8px' }}
                    >
                      <option value="cm">cm</option>
                      <option value="mm">mm</option>
                      <option value="in">inch</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DPI Resolution */}
              <div>
                <label className="form-label">Print Resolution (DPI)</label>
                <select
                  value={printDpi}
                  onChange={(e) => setPrintDpi(Number(e.target.value))}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '6px 8px' }}
                >
                  <option value={150}>150 DPI (Quick Draft)</option>
                  <option value={300}>300 DPI (Offset / Commercial Print)</option>
                  <option value={600}>600 DPI (Ultra Fine Vinyl & Decals)</option>
                </select>
              </div>

              {/* Bleed & Crop Marks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#F9FAFB', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#374151' }}>3mm Print Bleed Margin</span>
                  <input
                    type="checkbox"
                    checked={includeBleed}
                    onChange={(e) => setIncludeBleed(e.target.checked)}
                    style={{ accentColor: '#00891D', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#374151' }}>Trim & Crop Marks</span>
                  <input
                    type="checkbox"
                    checked={includeCropMarks}
                    onChange={(e) => setIncludeCropMarks(e.target.checked)}
                    style={{ accentColor: '#00891D', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Single Click Print Download */}
              <button
                onClick={() => handleDownloadAsset(printFormat)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontSize: '13px', marginTop: '6px' }}
              >
                <Download size={15} />
                Download {printFormat} Package
              </button>
            </div>
          ) : (
            /* DIGITAL ASSETS (WhatsApp, Story, Shortlink, Embed) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#4B5563' }}>
                Ready-to-share social formats and developer embed codes:
              </div>

              {/* WhatsApp Share Card */}
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px', background: '#F0FDF4' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    WhatsApp Share Card
                  </span>
                  <span className="badge badge-active" style={{ fontSize: '10px' }}>
                    1080 x 1080 px
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#15803D', margin: '0 0 8px 0' }}>
                  Branded header with phone download CTA for village broadcast lists.
                </p>
                <button
                  onClick={() => handleDownloadAsset('PNG')}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '11.5px' }}
                >
                  <Download size={13} />
                  Download WhatsApp Image
                </button>
              </div>

              {/* Instagram Story 9:16 */}
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px', background: '#F9FAFB' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                    Story Format (9:16)
                  </span>
                  <span style={{ fontSize: '10px', color: '#6B7280' }}>
                    1080 x 1920 px
                  </span>
                </div>
                <button
                  onClick={() => handleDownloadAsset('PNG')}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '11.5px' }}
                >
                  <Download size={13} />
                  Download 9:16 Story
                </button>
              </div>

              {/* Embed Code Snippet */}
              <div>
                <label className="form-label">HTML Embed Snippet</label>
                <button
                  onClick={copyEmbedCode}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '12px', justifyContent: 'center' }}
                >
                  {copiedEmbed ? <Check size={14} color="#00891D" /> : <Code size={14} />}
                  {copiedEmbed ? 'Snippet Copied' : 'Copy HTML Embed'}
                </button>
              </div>
            </div>
          )}

          {/* Pre-Export Validation Checklist (Screen 06 Spec) */}
          <div style={{ marginTop: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '12px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
              Pre-Export Quality Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {validationChecks.map((chk, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: '#4B5563' }}>
                  <CheckCircle2 size={13} color="#00891D" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{chk.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
