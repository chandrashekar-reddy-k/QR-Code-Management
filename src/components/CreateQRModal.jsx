import React from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from './QRCodeRenderer';
import {
  X,
  Plus,
  Sparkles,
  ExternalLink,
  Save,
  Palette,
  CheckCircle2,
  Calendar,
  Globe,
  Tag,
  Building,
  MapPin,
} from 'lucide-react';

export const CreateQRModal = () => {
  const {
    isCreateModalOpen,
    closeCreateQRModal,
    wizardData,
    setWizardData,
    publishWizardQR,
    saveWizardDraft,
    campaigns,
    setSelectedQrId,
    setActiveScreen,
    showToast,
  } = useQR();

  if (!isCreateModalOpen) return null;

  const updateField = (field, value) => {
    setWizardData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-update redirectCode if name changed and redirectCode was auto-derived
      if (field === 'name' && (!prev.redirectCode || prev.redirectCode.startsWith('vk-'))) {
        const slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 16);
        if (slug) updated.redirectCode = `vk-${slug}`;
      }
      return updated;
    });
  };

  const handlePublish = (e) => {
    e?.preventDefault();
    if (!wizardData.name?.trim()) {
      showToast('Please enter a name for the QR code.', 'warning');
      return;
    }
    const targetUrl = wizardData.fallbackUrl?.trim() || wizardData.androidUrl?.trim();
    if (!targetUrl) {
      showToast('Please enter a target destination URL.', 'warning');
      return;
    }
    publishWizardQR();
  };

  const handleSaveDraft = (e) => {
    e?.preventDefault();
    if (!wizardData.name?.trim()) {
      showToast('Please enter a name for the QR code draft.', 'warning');
      return;
    }
    saveWizardDraft();
  };

  const handleOpenInStudio = (e) => {
    e?.preventDefault();
    if (!wizardData.name?.trim()) {
      showToast('Please enter a name for the QR code.', 'warning');
      return;
    }
    const newId = saveWizardDraft();
    if (newId) {
      setSelectedQrId(newId);
      setActiveScreen('design-studio');
      showToast(`Loaded ${wizardData.name || newId} in Design Studio for advanced styling.`);
    }
  };

  const qrTypes = [
    'Campaign',
    'App Download',
    'Vehicle',
    'Referral',
    'Payment',
    'Product Packaging',
    'Event',
  ];

  const colorPresets = [
    { name: 'Emerald', hex: '#00891D' },
    { name: 'Harvest', hex: '#EA580C' },
    { name: 'Royal Blue', hex: '#2563EB' },
    { name: 'Dark Slate', hex: '#111827' },
    { name: 'Berry', hex: '#BE123C' },
  ];

  const resolvedTarget =
    wizardData.fallbackUrl?.trim() ||
    wizardData.androidUrl?.trim() ||
    'https://villagkart.com';

  return (
    <div className="modal-overlay" onClick={closeCreateQRModal}>
      <div
        className="modal-card"
        style={{
          maxWidth: '860px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FBFA 100%)',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#E8F5EA',
                color: '#00891D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0, 137, 29, 0.12)',
              }}
            >
              <Plus size={20} />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#111827' }}>
                Create New QR Code
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                Configure destination, routing parameters & brand preview
              </div>
            </div>
          </div>
          <button
            onClick={closeCreateQRModal}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '8px' }}
            title="Close dialog (Esc)"
          >
            <X size={20} color="#6B7280" />
          </button>
        </div>

        {/* Modal Body: 2-Column Grid */}
        <div
          className="modal-body"
          style={{
            padding: '22px 26px',
            overflowY: 'auto',
            background: '#FAFAFA',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Left Column: Form Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* QR Name */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                  QR Code Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Village Fresh Van Promo - Phirangipuram"
                  value={wizardData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  autoFocus
                />
              </div>

              {/* Type & Campaign Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                    QR Type
                  </label>
                  <select
                    className="form-control"
                    value={wizardData.type}
                    onChange={(e) => updateField('type', e.target.value)}
                  >
                    {qrTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                    Campaign
                  </label>
                  <select
                    className="form-control"
                    value={wizardData.campaignId || 'all'}
                    onChange={(e) => {
                      const cId = e.target.value;
                      if (cId === 'all') {
                        setWizardData((prev) => ({
                          ...prev,
                          campaignId: 'all',
                          campaign: 'All Campaigns',
                        }));
                      } else {
                        const cObj = campaigns?.find((c) => c.id === cId);
                        setWizardData((prev) => ({
                          ...prev,
                          campaignId: cId,
                          campaign: cObj?.name || prev.campaign,
                        }));
                      }
                    }}
                  >
                    <option value="all">Select All</option>
                    {campaigns?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Destination URL */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                  Target Destination URL <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://villagkart.com/download or /campaign"
                    value={wizardData.fallbackUrl}
                    onChange={(e) => updateField('fallbackUrl', e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                  <Globe
                    size={15}
                    color="#9CA3AF"
                    style={{ position: 'absolute', left: '10px', top: '10px' }}
                  />
                </div>
              </div>

              {/* Redirect Slug, Hub / Territory, and Village Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                    Short Redirect Slug
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                      style={{
                        background: '#F3F4F6',
                        border: '1px solid #D1D5DB',
                        borderRight: 'none',
                        padding: '6px 8px',
                        fontSize: '11px',
                        color: '#6B7280',
                        borderTopLeftRadius: '6px',
                        borderBottomLeftRadius: '6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      qr.vk.com/
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={wizardData.redirectCode}
                      onChange={(e) => updateField('redirectCode', e.target.value)}
                      style={{
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                    Hub / Territory
                  </label>
                  <select
                    className="form-control"
                    value={wizardData.hubId || 'all'}
                    onChange={(e) => updateField('hubId', e.target.value)}
                  >
                    <option value="all">Select All</option>
                    <option value="HUB-01">Guntur Central Hub</option>
                    <option value="HUB-02">Vijayawada Rural</option>
                    <option value="HUB-03">Tenali Node</option>
                    <option value="HUB-04">Narsaraopet Sub-Hub</option>
                    <option value="HUB-05">Bapatla Coastal Hub</option>
                  </select>
                </div>
              </div>

              {/* Village Selection */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                  Village
                </label>
                <select
                  className="form-control"
                  value={wizardData.village || 'all'}
                  onChange={(e) => updateField('village', e.target.value)}
                >
                  <option value="all">Select All</option>
                  <option value="Phirangipuram Village">Phirangipuram Village</option>
                  <option value="Prattipadu Village">Prattipadu Village</option>
                  <option value="Siripuram Village">Siripuram Village</option>
                  <option value="Tenali Rural">Tenali Rural</option>
                  <option value="Bapatla Coastal">Bapatla Coastal</option>
                </select>
              </div>

              {/* Start Date & Expiry Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={wizardData.startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => updateField('startDate', e.target.value)}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', margin: 0 }}>
                      Expiry Date
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#00891D' }}>
                      <input
                        type="checkbox"
                        checked={wizardData.neverEnding || wizardData.expiryDate === 'Never Ending'}
                        onChange={(e) => {
                          const isNever = e.target.checked;
                          updateField('neverEnding', isNever);
                          updateField('expiryDate', isNever ? 'Never Ending' : '2026-12-31');
                        }}
                        style={{ width: '13px', height: '13px', accentColor: '#00891D', cursor: 'pointer' }}
                      />
                      <span>Never Ending</span>
                    </label>
                  </div>
                  {(wizardData.neverEnding || wizardData.expiryDate === 'Never Ending') ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: '#F0FDF4',
                        border: '1px solid #86EFAC',
                        borderRadius: '6px',
                        height: '38px',
                        color: '#15803D',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      <span>∞ Never Ending (Permanent)</span>
                    </div>
                  ) : (
                    <input
                      type="date"
                      className="form-control"
                      value={wizardData.expiryDate && wizardData.expiryDate !== 'Never Ending' ? wizardData.expiryDate : '2026-12-31'}
                      onChange={(e) => updateField('expiryDate', e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* CTA Banner Text */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                  Call-To-Action Banner Text
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. SCAN TO DOWNLOAD"
                  value={wizardData.ctaText}
                  onChange={(e) => updateField('ctaText', e.target.value)}
                />
              </div>

              {/* Color Presets */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                  Brand Color Palette
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {colorPresets.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => updateField('fgColor', c.hex)}
                      title={c.name}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: c.hex,
                        border: wizardData.fgColor === c.hex ? '3px solid #111827' : '2px solid #FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={wizardData.fgColor || '#00891D'}
                    onChange={(e) => updateField('fgColor', e.target.value)}
                    title="Custom color"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live QR Preview Card */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Live Brand Preview
              </div>

              <div
                style={{
                  boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#FFFFFF',
                }}
              >
                <QRCodeRenderer
                  value={resolvedTarget}
                  size={190}
                  fgColor={wizardData.fgColor || '#00891D'}
                  bgColor="#FFFFFF"
                  hasCtaFrame={wizardData.hasCtaFrame ?? true}
                  ctaText={wizardData.ctaText || 'SCAN TO CONNECT'}
                  campaignTitle={wizardData.name || 'VillagKart QR'}
                  showLogo={true}
                  logoSrc="/villagekart_icon.svg"
                />
              </div>

              {/* Target URL indicator */}
              <div
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#F9FAFB',
                  padding: '5px 12px',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  maxWidth: '100%',
                }}
              >
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Resolves:</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#00891D',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '180px',
                  }}
                  title={resolvedTarget}
                >
                  {resolvedTarget.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '16px 24px',
            background: '#FFFFFF',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleSaveDraft}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={14} />
            Save as Draft
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={closeCreateQRModal}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenInStudio}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Palette size={14} color="#00891D" />
              Customize in Studio
            </button>
            <button
              type="button"
              onClick={handlePublish}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={15} />
              Create & Submit for Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
