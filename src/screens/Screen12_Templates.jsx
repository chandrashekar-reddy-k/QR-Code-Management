import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import {
  Layers,
  Lock,
  Unlock,
  Copy,
  Plus,
  CheckCircle2,
  Download,
  Filter,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const Screen12_Templates = () => {
  const { templates, setTemplates, setActiveScreen, setWizardData, showToast } = useQR();
  const [filterCategory, setFilterCategory] = useState('all');

  const filtered = templates.filter(
    (t) => filterCategory === 'all' || t.category.toLowerCase().includes(filterCategory.toLowerCase())
  );

  const handleUseTemplate = (tpl) => {
    setWizardData((prev) => ({
      ...prev,
      template: tpl.name,
      fgColor: tpl.previewBg || '#00891D',
      name: `${tpl.name} - ${new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`,
      type: tpl.permittedQrTypes[0] || 'Campaign',
    }));
    setActiveScreen('wizard');
    showToast(`Loaded template "${tpl.name}" into QR Studio.`);
  };

  const handleCloneTemplate = (tpl) => {
    const cloned = {
      ...tpl,
      id: 'TPL-0' + (templates.length + 1),
      name: `${tpl.name} (Custom Copy)`,
      approvalStatus: 'Draft Customization',
      lockedBrandElements: false,
      owner: 'Current User',
      downloadsCount: 0,
    };
    setTemplates((prev) => [cloned, ...prev]);
    showToast(`Template "${tpl.name}" cloned successfully! Brand guidelines preserved.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Brand QR Templates Library</h2>
            <p className="vk-card-subtitle">
              Approved brand gallery for posters, vehicle vinyls, flyers and WhatsApp campaign assets
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'poster', 'flyer', 'sticker', 'card', 'digital'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates Grid (10 Approved Templates from Screen 12 Specification) */}
      <div className="grid-3" style={{ gap: '16px' }}>
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            className="vk-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              border: '1px solid #E5E7EB',
              transition: 'all 0.15s ease-in-out',
            }}
          >
            {/* Visual Card Preview */}
            <div
              style={{
                height: '130px',
                borderRadius: '8px',
                background: tpl.previewBg,
                color: '#FFFFFF',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: 'inset 0 0 16px rgba(0,0,0,0.15)',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tpl.category}
                </span>
                {tpl.lockedBrandElements ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                    <Lock size={11} /> Locked Brand
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                    <Unlock size={11} /> Customizable
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.02em' }}>
                  {tpl.previewText}
                </div>
                <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                  {tpl.dimensions}
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {tpl.name}
                </h3>
                <span className="badge badge-active" style={{ fontSize: '10.5px' }}>
                  {tpl.approvalStatus}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 10px 0' }}>
                Permitted Types: <strong>{tpl.permittedQrTypes.join(', ')}</strong>
              </div>

              <div style={{ fontSize: '11.5px', color: '#4B5563', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>
                <span>Owner: {tpl.owner}</span>
                <span>{tpl.downloadsCount} downloads</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
              <button
                onClick={() => handleUseTemplate(tpl)}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                Use in Studio
                <ArrowRight size={13} />
              </button>
              <button
                onClick={() => handleCloneTemplate(tpl)}
                className="btn btn-secondary btn-sm"
                title="Clone this template"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
