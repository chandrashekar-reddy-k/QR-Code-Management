import React, { useState, useMemo } from 'react';
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
  Search,
  Edit2,
  X,
  Shield,
} from 'lucide-react';

export const Templates = () => {
  const { templates, setTemplates, setActiveScreen, setWizardData, currentRole, showToast } = useQR();
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory =
        filterCategory === 'all' || t.category.toLowerCase().includes(filterCategory.toLowerCase());
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.permittedQrTypes.some((pt) => pt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.owner.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, filterCategory, searchQuery]);

  const handleUseTemplate = (tpl) => {
    setWizardData((prev) => ({
      ...prev,
      template: tpl.name,
      fgColor: tpl.previewBg || '#00891D',
      name: `${tpl.name} - ${new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`,
      type: tpl.permittedQrTypes[0] || 'Campaign',
    }));
    setActiveScreen('wizard');
    showToast(`Loaded template "${tpl.name}" into Design Studio.`);
  };

  const handleCloneTemplate = (tpl) => {
    const cloned = {
      ...tpl,
      id: 'TPL-0' + (templates.length + 1),
      name: `${tpl.name} (Custom Copy)`,
      approvalStatus: 'Draft Customization',
      lockedBrandElements: false,
      owner: currentRole,
      downloadsCount: 0,
    };
    setTemplates((prev) => [cloned, ...prev]);
    showToast(`Template "${tpl.name}" cloned successfully! Brand guidelines preserved.`);
  };

  const handleSaveEditedTemplate = (e) => {
    e.preventDefault();
    if (!editingTemplate) return;

    if (editingTemplate.lockedBrandElements && currentRole !== 'Admin') {
      showToast('Locked brand elements are protected and can only be modified by Brand Admin', 'error');
      return;
    }

    setTemplates((prev) =>
      prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t))
    );
    showToast(`Template "${editingTemplate.name}" updated successfully!`);
    setEditingTemplate(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">QR Templates Library</h2>
            <p className="vk-card-subtitle">
              Reuse approved brand designs, dimensions and locked governance rather than designing from scratch
            </p>
          </div>
          <span className="badge badge-active">Brand Safety Shield Active</span>
        </div>
      </div>

      {/* Search and Filter Controls (Page 12 Requirement) */}
      <div className="vk-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by template name, category or QR type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'poster', 'flyer', 'sticker', 'card', 'digital', 'label'].map((cat) => (
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

      {/* Templates Gallery Grid (10 Approved Templates) */}
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: '4px' }}>
                    <Lock size={11} /> Locked Brand
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: '4px' }}>
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

            {/* Template Info: Name, Permitted QR Types, Dimensions, Owner, Approval Status */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {tpl.name}
                </h3>
                <span className="badge badge-active" style={{ fontSize: '10.5px' }}>
                  {tpl.approvalStatus}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 8px 0' }}>
                Permitted Types: <strong>{tpl.permittedQrTypes.join(', ')}</strong>
              </div>

              <div style={{ fontSize: '11.5px', color: '#4B5563', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>
                <span>Owner: <strong>{tpl.owner}</strong></span>
                <span>{tpl.downloadsCount} downloads</span>
              </div>
            </div>

            {/* Actions: Use in Studio, Clone Template, Edit/Manage */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
              <button
                onClick={() => handleUseTemplate(tpl)}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                title="Use template in QR Design Studio"
              >
                Use in Studio
                <ArrowRight size={13} />
              </button>
              <button
                onClick={() => handleCloneTemplate(tpl)}
                className="btn btn-secondary btn-sm"
                title="Clone Template"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => setEditingTemplate({ ...tpl })}
                className="btn btn-secondary btn-sm"
                title="Edit / Manage Template (Authorized Users)"
              >
                <Edit2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Manage Template Modal */}
      {editingTemplate && (
        <div className="modal-overlay" onClick={() => setEditingTemplate(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#00891D" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Manage Template · {editingTemplate.id}</h3>
              </div>
              <button onClick={() => setEditingTemplate(null)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEditedTemplate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {editingTemplate.lockedBrandElements && (
                  <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', gap: '8px' }}>
                    <Lock size={15} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ color: '#92400E' }}>
                      <strong>Locked Brand Elements:</strong> Core colors and logo placement are locked by brand lead.
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Template Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Intended Dimensions</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTemplate.dimensions}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, dimensions: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preview Text / Frame Callout</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTemplate.previewText}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, previewText: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEditingTemplate(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { Templates as Screen12_Templates };
export default Templates;
