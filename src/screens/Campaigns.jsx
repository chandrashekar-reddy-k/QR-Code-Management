import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import { INITIAL_HUBS, INITIAL_VILLAGES, INITIAL_USERS } from '../data/mockData';
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
  X,
  Target,
  FileSpreadsheet,
} from 'lucide-react';

export const Campaigns = () => {
  const { campaigns, qrCodes, setCampaigns, setActiveScreen, setSelectedQrId, showToast } = useQR();
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]);
  const [isCreating, setIsCreating] = useState(false);

  // New Campaign Form State (Page 11 Creation Fields)
  const [newCamp, setNewCamp] = useState({
    name: '',
    objective: '',
    marketingOwner: 'Anita Rao',
    budget: 150000,
    targetHubName: 'Phirangipuram Hub',
    targetMandal: 'Phirangipuram',
    targetVillage: 'Phirangipuram Village',
    source: 'Posters, Leaflets & Grocery Stalls',
    medium: 'Offline Print QR + WhatsApp Viral',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
    attributionWindowDays: 30,
    targetRegistrations: 2500,
    targetFirstOrders: 1000,
    linkedQrIds: ['QR-00001'],
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
      objective: newCamp.objective || 'Accelerate village customer acquisition and app onboarding',
      owner: newCamp.marketingOwner,
      budget: Number(newCamp.budget) || 0,
      spent: 0,
      targetHub: 'HUB-01',
      targetHubName: newCamp.targetHubName,
      targetVillages: [newCamp.targetVillage],
      source: newCamp.source,
      medium: newCamp.medium,
      startDate: newCamp.startDate,
      endDate: newCamp.endDate,
      attributionWindowDays: Number(newCamp.attributionWindowDays),
      conversionGoals: {
        registrations: Number(newCamp.targetRegistrations),
        firstOrders: Number(newCamp.targetFirstOrders),
      },
      status: 'Active',
      totalQrCodes: newCamp.linkedQrIds.length,
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
    showToast(`Campaign "${newCamp.name}" created successfully!`);
  };

  const handleExportCampaign = () => {
    if (!selectedCampaign) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Campaign ID,Name,Objective,Owner,Status,Start Date,End Date,Budget,Spent,Scans,Registrations,First Orders,CPA',
        `"${selectedCampaign.id}","${selectedCampaign.name}","${selectedCampaign.objective}","${selectedCampaign.owner}","${selectedCampaign.status}","${selectedCampaign.startDate}","${selectedCampaign.endDate}",${selectedCampaign.budget || 0},${selectedCampaign.spent || 0},${selectedCampaign.metrics?.totalScans || 0},${selectedCampaign.metrics?.verifiedRegistrations || 0},${selectedCampaign.metrics?.firstOrders || 0},${selectedCampaign.metrics?.costPerRegistration || 0}`,
      ]
        .concat(['\nAssociated QR Codes,ID,Type,Status,Scans,Registrations'])
        .concat(
          associatedQRs.map(
            (q) =>
              `"${q.name}","${q.id}","${q.type}","${q.status}",${q.metrics?.scans || 0},${q.metrics?.verifiedRegistrations || 0}`
          )
        )
        .join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `campaign_${selectedCampaign.id}_report_${Date.now()}.csv`;
    link.click();
    showToast(`Exported ${selectedCampaign.name} report CSV!`);
  };

  const associatedQRs = qrCodes.filter(
    (q) => q.campaignId === selectedCampaign?.id || q.campaign === selectedCampaign?.name
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Campaign Management</h2>
            <p className="vk-card-subtitle">
              Group and measure multiple QR codes under marketing initiatives, budgets, attribution windows & conversion targets
            </p>
          </div>
          <button onClick={() => setIsCreating(true)} className="btn btn-primary btn-sm">
            <Plus size={15} />
            + Create Campaign
          </button>
        </div>
      </div>

      {/* Campaign Creation Modal (All Page 11 Creation Fields) */}
      {isCreating && (
        <div className="modal-overlay" onClick={() => setIsCreating(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={18} color="#00891D" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Create Marketing Campaign</h3>
              </div>
              <button onClick={() => setIsCreating(false)} className="btn btn-ghost" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Campaign name and objective */}
                <div className="form-group">
                  <label className="form-label">Campaign Name <span className="required-dot">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Tenali Festival Agro Promo"
                    value={newCamp.name}
                    onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Objective</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="State customer acquisition goals, promotional discounts, and target behavior"
                    value={newCamp.objective}
                    onChange={(e) => setNewCamp({ ...newCamp, objective: e.target.value })}
                  />
                </div>

                {/* Marketing Owner and Budget (Optional) */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Marketing Owner</label>
                    <select
                      className="form-control"
                      value={newCamp.marketingOwner}
                      onChange={(e) => setNewCamp({ ...newCamp, marketingOwner: e.target.value })}
                    >
                      {INITIAL_USERS.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Budget (INR ₹, optional)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newCamp.budget}
                      onChange={(e) => setNewCamp({ ...newCamp, budget: e.target.value })}
                      placeholder="e.g. 150000"
                    />
                  </div>
                </div>

                {/* Hub, Mandal, and Village */}
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Hub</label>
                    <select
                      className="form-control"
                      value={newCamp.targetHubName}
                      onChange={(e) => setNewCamp({ ...newCamp, targetHubName: e.target.value })}
                    >
                      {INITIAL_HUBS.map((h) => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mandal</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newCamp.targetMandal}
                      onChange={(e) => setNewCamp({ ...newCamp, targetMandal: e.target.value })}
                      placeholder="e.g. Phirangipuram"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Village</label>
                    <select
                      className="form-control"
                      value={newCamp.targetVillage}
                      onChange={(e) => setNewCamp({ ...newCamp, targetVillage: e.target.value })}
                    >
                      {INITIAL_VILLAGES.map((v) => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Source and Medium */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Source</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newCamp.source}
                      onChange={(e) => setNewCamp({ ...newCamp, source: e.target.value })}
                      placeholder="e.g. Vehicle Vinyls, Posters"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Medium</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newCamp.medium}
                      onChange={(e) => setNewCamp({ ...newCamp, medium: e.target.value })}
                      placeholder="e.g. Offline Print QR"
                    />
                  </div>
                </div>

                {/* Start Date and End Date */}
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

                {/* Attribution Window and Conversion Goals */}
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Attribution Window</label>
                    <select
                      className="form-control"
                      value={newCamp.attributionWindowDays}
                      onChange={(e) => setNewCamp({ ...newCamp, attributionWindowDays: Number(e.target.value) })}
                    >
                      <option value={7}>7 Days</option>
                      <option value={14}>14 Days</option>
                      <option value={30}>30 Days (Standard)</option>
                      <option value={60}>60 Days</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Registrations</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newCamp.targetRegistrations}
                      onChange={(e) => setNewCamp({ ...newCamp, targetRegistrations: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target First Orders</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newCamp.targetFirstOrders}
                      onChange={(e) => setNewCamp({ ...newCamp, targetFirstOrders: e.target.value })}
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
        {/* Campaign List (Page 11: Name, Objective, Owner, Start/end dates, Status, Associated QR codes, Metrics) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {campaigns.map((camp) => {
            const isSelected = selectedCampaign?.id === camp.id;
            const campQrCount = qrCodes.filter((q) => q.campaignId === camp.id || q.campaign === camp.name).length;
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
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{camp.name}</div>
                <div style={{ fontSize: '12px', color: '#4B5563', margin: '4px 0 8px 0', lineHeight: 1.3 }}>
                  {camp.objective}
                </div>
                <div style={{ fontSize: '11.5px', color: '#6B7280', marginBottom: '8px' }}>
                  Owner: <strong>{camp.owner}</strong> · {camp.startDate} to {camp.endDate}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#374151', borderTop: '1px solid #E5E7EB', paddingTop: '8px' }}>
                  <span>{campQrCount} QR Codes · {(camp.metrics?.totalScans || 0).toLocaleString()} Scans</span>
                  <span style={{ fontWeight: 700, color: '#00891D' }}>
                    {(camp.metrics?.verifiedRegistrations || 0).toLocaleString()} Reg
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Campaign Detail Page (Page 11: Timeline, performance, spend, CPA, export actions) */}
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
                  {selectedCampaign.objective} · Managed by <strong>{selectedCampaign.owner}</strong>
                </p>
              </div>

              {/* Export Action */}
              <button onClick={handleExportCampaign} className="btn btn-secondary btn-sm">
                <FileSpreadsheet size={14} />
                Export Campaign CSV
              </button>
            </div>

            {/* Campaign Timeline Progress */}
            <div style={{ background: '#F9FAFB', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#4B5563', marginBottom: '6px' }}>
                <span><strong>Timeline:</strong> {selectedCampaign.startDate}</span>
                <span><strong>Hub:</strong> {selectedCampaign.targetHubName}</span>
                <span><strong>End:</strong> {selectedCampaign.endDate}</span>
              </div>
              <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '45%', height: '100%', background: '#00891D' }} />
              </div>
            </div>

            {/* Campaign Metrics Grid: Spend, Scans, Registrations, CPA */}
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
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Cost per Acquisition (CPA)</div>
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

            {/* Associated QR Codes */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 className="vk-card-title">
                  <QrCode size={17} color="#00891D" />
                  Associated QR Codes ({associatedQRs.length})
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
                              Manage Details
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
