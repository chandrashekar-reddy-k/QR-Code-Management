import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import {
  Megaphone,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
  QrCode,
  Pause,
  Play,
  ArrowRight,
  ChevronRight,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const Campaigns = () => {
  const { campaigns, qrCodes, setCampaigns, setActiveScreen, setSelectedQrId, showToast } = useQR();
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]);
  const [isCreating, setIsCreating] = useState(false);

  // New Campaign Form State
  const [newCamp, setNewCamp] = useState({
    name: '',
    objective: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
    budget: 150000,
    targetHubName: 'Phirangipuram Hub',
    targetVillages: 'Phirangipuram, Prattipadu',
    source: 'Posters & Leaflets',
    medium: 'Offline Print QR',
  });

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!newCamp.name) {
      showToast('Campaign name is required', 'error');
      return;
    }

    const newId = 'CMP-00' + (campaigns.length + 1);
    const created = {
      id: newId,
      name: newCamp.name,
      objective: newCamp.objective,
      startDate: newCamp.startDate,
      endDate: newCamp.endDate,
      owner: 'Marketing Team',
      budget: Number(newCamp.budget),
      spent: 0,
      targetHub: 'HUB-01',
      targetHubName: newCamp.targetHubName,
      targetVillages: newCamp.targetVillages.split(',').map((s) => s.trim()),
      source: newCamp.source,
      medium: newCamp.medium,
      status: 'Active',
      totalQrCodes: 0,
      metrics: {
        totalScans: 0,
        verifiedRegistrations: 0,
        firstOrders: 0,
        costPerRegistration: 0,
        costPerFirstOrder: 0,
      },
    };

    setCampaigns((prev) => [created, ...prev]);
    setSelectedCampaign(created);
    setIsCreating(false);
    showToast(`Campaign ${newCamp.name} created successfully!`);
  };

  const associatedQRs = qrCodes.filter((q) => q.campaignId === selectedCampaign?.id || q.campaign === selectedCampaign?.name);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Campaign Management</h2>
            <p className="vk-card-subtitle">
              Group multiple QR assets under a single marketing initiative, budget & territory attribution
            </p>
          </div>
          <button onClick={() => setIsCreating(true)} className="btn btn-primary btn-sm">
            <Plus size={15} />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Creation Modal */}
      {isCreating && (
        <div className="modal-overlay" onClick={() => setIsCreating(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Create Marketing Campaign</h3>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Campaign Name <span className="required-dot">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Tenali Festival Agro Promo"
                    value={newCamp.name}
                    onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Objective</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Describe target user behavior and customer acquisition goals"
                    value={newCamp.objective}
                    onChange={(e) => setNewCamp({ ...newCamp, objective: e.target.value })}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Budget (INR ₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newCamp.budget}
                      onChange={(e) => setNewCamp({ ...newCamp, budget: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Hub</label>
                    <select
                      className="form-control"
                      value={newCamp.targetHubName}
                      onChange={(e) => setNewCamp({ ...newCamp, targetHubName: e.target.value })}
                    >
                      <option>Phirangipuram Hub</option>
                      <option>Guntur Central Hub</option>
                      <option>Tenali Rural Hub</option>
                      <option>Narasaraopet Hub</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newCamp.startDate}
                      onChange={(e) => setNewCamp({ ...newCamp, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newCamp.endDate}
                      onChange={(e) => setNewCamp({ ...newCamp, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsCreating(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Campaign Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>
        {/* Campaign List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {campaigns.map((camp) => {
            const isSelected = selectedCampaign?.id === camp.id;
            return (
              <div
                key={camp.id}
                onClick={() => setSelectedCampaign(camp)}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #00891D' : '1px solid #E5E7EB',
                  background: isSelected ? '#E8F5EA' : '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span className="badge badge-outline" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    {camp.id}
                  </span>
                  <span className={`badge badge-${camp.status === 'Active' ? 'active' : 'draft'}`}>
                    {camp.status}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>{camp.name}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 10px 0' }}>
                  Target: {camp.targetHubName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#374151', borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>
                  <span>{(camp.metrics?.totalScans || 0).toLocaleString()} Scans</span>
                  <span style={{ fontWeight: 700, color: '#00891D' }}>
                    {(camp.metrics?.verifiedRegistrations || 0).toLocaleString()} Reg
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Campaign Detail */}
        {selectedCampaign && (
          <div className="vk-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="vk-card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-outline" style={{ fontFamily: 'monospace' }}>{selectedCampaign.id}</span>
                  <span className="badge badge-active">{selectedCampaign.status}</span>
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: '6px 0 2px 0' }}>
                  {selectedCampaign.name}
                </h2>
                <p style={{ fontSize: '13px', color: '#4B5563', margin: 0 }}>
                  {selectedCampaign.objective}
                </p>
              </div>
            </div>

            {/* Campaign Metrics Grid */}
            <div className="grid-4">
              <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Total Campaign Scans</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827' }}>
                  {(selectedCampaign.metrics?.totalScans || 0).toLocaleString()}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>App Registrations</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#00891D' }}>
                  {(selectedCampaign.metrics?.verifiedRegistrations || 0).toLocaleString()}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Cost per Registration</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#00A322' }}>
                  ₹{selectedCampaign.metrics?.costPerRegistration || 0}
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Budget & Spend</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
                  ₹{(selectedCampaign.spent || 0).toLocaleString()} / ₹{(selectedCampaign.budget || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Associated QR Assets */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 className="vk-card-title">
                  <QrCode size={17} color="#00891D" />
                  Associated QR Assets ({associatedQRs.length})
                </h3>
                <button
                  onClick={() => setActiveScreen('wizard')}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus size={14} /> Add QR to Campaign
                </button>
              </div>

              <div className="vk-table-container">
                <table className="vk-table">
                  <thead>
                    <tr>
                      <th>QR Name & ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Scans</th>
                      <th>Registrations</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {associatedQRs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                          No QR codes linked to this campaign yet.
                        </td>
                      </tr>
                    ) : (
                      associatedQRs.map((q) => (
                        <tr key={q.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#00891D' }}>{q.name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'monospace' }}>{q.id}</div>
                          </td>
                          <td><span className="badge badge-outline">{q.type}</span></td>
                          <td><span className={`badge badge-${q.status?.toLowerCase().replace(' ', '-')}`}>{q.status}</span></td>
                          <td style={{ fontWeight: 700 }}>{(q.metrics?.scans || 0).toLocaleString()}</td>
                          <td style={{ color: '#00891D', fontWeight: 700 }}>{(q.metrics?.verifiedRegistrations || 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setSelectedQrId(q.id);
                                setActiveScreen('details');
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
 
export { Campaigns as Screen11_Campaigns };
export default Campaigns;
