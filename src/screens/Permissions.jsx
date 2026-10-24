import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Send,
  MessageSquare,
  Lock,
  UserCheck,
  Edit2,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  Shield,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { INITIAL_PERMISSIONS_MATRIX } from '../data/mockData';

export const Permissions = () => {
  const {
    permissionsMatrix,
    setPermissionsMatrix,
    approvals,
    handleApprovalAction,
    currentRole,
    showToast,
    addAuditLog,
  } = useQR();

  const [activeTab, setActiveTab] = useState('matrix'); // Default to 'matrix' for Role Permissions
  const [commentInputs, setCommentInputs] = useState({});

  // Permissions Matrix Editing State
  const [isEditingMatrix, setIsEditingMatrix] = useState(false);
  const [draftMatrix, setDraftMatrix] = useState(() => JSON.parse(JSON.stringify(permissionsMatrix)));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all'); // 'all' | 'marketing' | 'hubManager' | 'vge'

  // Add Custom Permission Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPermName, setNewPermName] = useState('');
  const [newPermNotes, setNewPermNotes] = useState('');
  const [newPermRoleDefaults, setNewPermRoleDefaults] = useState({
    marketing: true,
    hubManager: false,
    vge: false,
  });

  const pendingApprovals = approvals.filter((a) => a.status === 'Pending');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'Pending');

  const handleCommentChange = (id, text) => {
    setCommentInputs((prev) => ({ ...prev, [id]: text }));
  };

  // Start Edit Mode
  const handleStartEdit = () => {
    if (currentRole !== 'Admin') {
      showToast('Only Admin role can edit the system permissions matrix', 'error');
      return;
    }
    setDraftMatrix(JSON.parse(JSON.stringify(permissionsMatrix)));
    setIsEditingMatrix(true);
    showToast('Permissions edit mode enabled. Make adjustments and click Save Changes.');
  };

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    setIsEditingMatrix(false);
    setDraftMatrix(JSON.parse(JSON.stringify(permissionsMatrix)));
  };

  // Save Edit Mode Changes
  const handleSaveMatrix = () => {
    setPermissionsMatrix(draftMatrix);
    setIsEditingMatrix(false);
    if (addAuditLog) {
      addAuditLog(
        'Updated Role Permissions Matrix',
        'System Access Governance',
        'Admin saved custom operational role capabilities'
      );
    }
    showToast('Role Permissions matrix saved and updated live!');
  };

  // Reset to Factory Specification Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all role permissions to factory system defaults (Specification Page 20)?')) {
      const freshDefaults = JSON.parse(JSON.stringify(INITIAL_PERMISSIONS_MATRIX));
      setPermissionsMatrix(freshDefaults);
      setDraftMatrix(freshDefaults);
      if (addAuditLog) {
        addAuditLog(
          'Reset Permissions to Defaults',
          'System Access Governance',
          'Restored factory Page 20 role capabilities matrix'
        );
      }
      showToast('Permissions matrix restored to factory defaults');
    }
  };

  // Toggle cell in Draft Mode
  const handleToggleDraftCell = (permName, roleKey) => {
    setDraftMatrix((prev) =>
      prev.map((row) => {
        if (row.permission === permName) {
          return { ...row, [roleKey]: !row[roleKey] };
        }
        return row;
      })
    );
  };

  // Update note in Draft Mode
  const handleNoteChange = (permName, noteField, value) => {
    setDraftMatrix((prev) =>
      prev.map((row) => {
        if (row.permission === permName) {
          return { ...row, [noteField]: value };
        }
        return row;
      })
    );
  };

  // Direct toggle cell in View Mode
  const toggleMatrixCell = (permName, roleKey) => {
    if (currentRole !== 'Admin') {
      showToast('Only Admin role can modify the permissions matrix', 'error');
      return;
    }
    setPermissionsMatrix((prev) =>
      prev.map((row) => {
        if (row.permission === permName) {
          const nextVal = !row[roleKey];
          return { ...row, [roleKey]: nextVal };
        }
        return row;
      })
    );
    if (addAuditLog) {
      addAuditLog(
        `Toggled Permission: ${permName}`,
        `Role: ${roleKey}`,
        `Admin toggled capability for ${roleKey}`
      );
    }
    showToast(`Updated permission "${permName}" for ${roleKey}`);
  };

  // Add Custom Permission
  const handleAddCustomPermission = (e) => {
    e.preventDefault();
    if (!newPermName.trim()) {
      showToast('Please enter a valid permission name', 'error');
      return;
    }
    const newRow = {
      permission: newPermName.trim(),
      admin: true,
      marketing: newPermRoleDefaults.marketing,
      hubManager: newPermRoleDefaults.hubManager,
      vge: newPermRoleDefaults.vge,
      marketingNote: newPermRoleDefaults.marketing && newPermNotes ? newPermNotes : undefined,
      isCustom: true,
    };
    setPermissionsMatrix((prev) => [...prev, newRow]);
    setDraftMatrix((prev) => [...prev, newRow]);
    if (addAuditLog) {
      addAuditLog('Created Custom Permission', newPermName.trim(), 'Added custom operational governance rule');
    }
    setNewPermName('');
    setNewPermNotes('');
    setShowAddModal(false);
    showToast(`Added custom permission: "${newRow.permission}"`);
  };

  // Delete Custom Permission
  const handleDeleteCustomPermission = (permName) => {
    setPermissionsMatrix((prev) => prev.filter((r) => r.permission !== permName));
    setDraftMatrix((prev) => prev.filter((r) => r.permission !== permName));
    if (addAuditLog) {
      addAuditLog('Deleted Custom Permission', permName, 'Removed custom permission rule');
    }
    showToast(`Removed custom permission "${permName}"`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div className="vk-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="vk-card-title">Permissions & Publication Approvals</h2>
            <p className="vk-card-subtitle">
              Role-based access matrix and pending review queue for sensitive operational & financial QR codes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`btn btn-sm ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Role Permissions
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`btn btn-sm ${activeTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Approval Queue ({pendingApprovals.length})
            </button>
          </div>
        </div>
      </div>

      {/* Approval Queue */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="vk-card">
            <h3 className="vk-card-title">Approval Queue</h3>
            <p className="vk-card-subtitle">
              Screen 07 submissions tied to reviewed configuration version and security validation
            </p>

            {pendingApprovals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: '#6B7280' }}>
                <CheckCircle2 size={36} color="#00891D" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  Approval queue is clear
                </div>
                <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                  No QR codes currently pending administrative review.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                {pendingApprovals.map((app) => (
                  <div
                    key={app.id}
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: '10px',
                      padding: '16px',
                      background: '#FFFFFF',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-pending">Pending Review</span>
                          <span className="badge badge-outline">{app.type}</span>
                          <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace' }}>
                            {app.qrId} · {app.configVersion}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '6px 0 2px 0' }}>
                          {app.qrName}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#4B5563' }}>
                          Submitted by <strong>{app.requestingUser}</strong> on {app.submittedDate}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: app.riskClassification.includes('High') ? '#FEE2E2' : '#FEF3C7',
                          color: app.riskClassification.includes('High') ? '#DC2626' : '#D97706',
                        }}>
                          {app.riskClassification}
                        </span>
                      </div>
                    </div>

                    {/* Pre-export validation indicators */}
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      background: '#F9FAFB',
                      borderRadius: '8px',
                      display: 'flex',
                      gap: '16px',
                      fontSize: '12px',
                      flexWrap: 'wrap',
                      color: '#00891D',
                      fontWeight: 600,
                    }}>
                      <span>✓ QR decodes successfully</span>
                      <span>✓ SSL/HTTPS target verified</span>
                      <span>✓ Contrast score 98/100</span>
                      <span>✓ UTM parameters preserved</span>
                    </div>

                    {/* Reviewer Action Bar */}
                    <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Add optional reviewer comment or revision guidance..."
                        className="form-control"
                        style={{ fontSize: '12.5px' }}
                        value={commentInputs[app.id] || ''}
                        onChange={(e) => handleCommentChange(app.id, e.target.value)}
                      />

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleApprovalAction(app.id, 'request_changes', commentInputs[app.id])}
                          className="btn btn-secondary btn-sm"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => handleApprovalAction(app.id, 'reject', commentInputs[app.id])}
                          className="btn btn-danger btn-sm"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprovalAction(app.id, 'approve', commentInputs[app.id])}
                          className="btn btn-primary btn-sm"
                        >
                          <CheckCircle2 size={14} />
                          Approve & Publish Live
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Processed Decisions */}
          {resolvedApprovals.length > 0 && (
            <div className="vk-card">
              <h4 className="vk-card-title" style={{ fontSize: '14px' }}>Recently Processed Decisions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {resolvedApprovals.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#F9FAFB', borderRadius: '6px', fontSize: '12.5px' }}>
                    <div>
                      <strong>{r.qrName}</strong> ({r.qrId})
                      {r.reviewerComments && <span style={{ color: '#6B7280' }}> — "{r.reviewerComments}"</span>}
                    </div>
                    <span className={`badge badge-${r.status === 'Approved' ? 'active' : 'expired'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Role Permission Matrix */}
      {activeTab === 'matrix' && (
        <div className="vk-card">
          <div className="vk-card-header" style={{ alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="vk-card-title">Role Permissions Matrix</h3>
                {isEditingMatrix && (
                  <span className="badge badge-pending" style={{ fontSize: '11px', animation: 'pulse 1.5s infinite' }}>
                    ✏️ Editing Mode
                  </span>
                )}
              </div>
              <p className="vk-card-subtitle">
                System specification default matrix (Page 20). Admin users can toggle permissions to configure live governance.
              </p>
            </div>

            {/* Matrix Action Buttons: Edit, Save, Cancel, Add, Reset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {!isEditingMatrix ? (
                <>
                  <button
                    onClick={handleStartEdit}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Enter interactive permissions editing mode"
                  >
                    <Edit2 size={14} />
                    Edit Permissions
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Add a new custom operational permission"
                  >
                    <Plus size={14} />
                    Add Permission
                  </button>
                  <button
                    onClick={handleResetDefaults}
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280' }}
                    title="Restore Page 20 factory defaults"
                  >
                    <RotateCcw size={13} />
                    Reset Defaults
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveMatrix}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#00891D', borderColor: '#00891D' }}
                  >
                    <Save size={14} />
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <X size={14} />
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} />
                    Add Permission
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Edit Mode Active Banner */}
          {isEditingMatrix && (
            <div style={{
              background: '#E8F5EA',
              border: '1px solid #A5D6A7',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '12.5px',
              color: '#1B5E20',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} color="#00891D" />
                <span>
                  <strong>Edit Mode Active:</strong> Toggle any capability switch below for Marketing, Hub Manager, or VGE. You can also specify conditional notes (e.g., <em>"Assigned scope only"</em>).
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveMatrix}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                >
                  <Check size={13} /> Apply & Save
                </button>
              </div>
            </div>
          )}

          {/* Search & Role Filters Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px 14px',
            background: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
          }}>
            {/* Search input */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '320px' }}>
              <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search permissions..."
                className="form-control"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '12.5px', height: '34px' }}
              />
            </div>

            {/* Role Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B7280', marginRight: '4px' }}>
                View Focus:
              </span>
              {[
                { id: 'all', label: 'All Roles (Full Matrix)' },
                { id: 'marketing', label: 'Marketing' },
                { id: 'hubManager', label: 'Hub Manager' },
                { id: 'vge', label: 'VGE (Field Executive)' },
              ].map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => setSelectedRoleFilter(rf.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: selectedRoleFilter === rf.id ? '1px solid #00891D' : '1px solid #D1D5DB',
                    background: selectedRoleFilter === rf.id ? '#00891D' : '#FFFFFF',
                    color: selectedRoleFilter === rf.id ? '#FFFFFF' : '#4B5563',
                  }}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="vk-table-container">
            {(() => {
              const activeRows = (isEditingMatrix ? draftMatrix : permissionsMatrix).filter((row) => {
                if (searchTerm.trim() && !row.permission.toLowerCase().includes(searchTerm.toLowerCase())) {
                  return false;
                }
                return true;
              });

              return (
                <table className="vk-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '220px' }}>Permission Name</th>
                      {(selectedRoleFilter === 'all') && <th style={{ minWidth: '120px' }}>Admin</th>}
                      {(selectedRoleFilter === 'all' || selectedRoleFilter === 'marketing') && <th style={{ minWidth: '160px' }}>Marketing</th>}
                      {(selectedRoleFilter === 'all' || selectedRoleFilter === 'hubManager') && <th style={{ minWidth: '160px' }}>Hub Manager</th>}
                      {(selectedRoleFilter === 'all' || selectedRoleFilter === 'vge') && <th style={{ minWidth: '180px' }}>VGE (Field Executive)</th>}
                      <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                          No permissions match your search filter "{searchTerm}".
                        </td>
                      </tr>
                    ) : (
                      activeRows.map((row) => (
                        <tr key={row.permission} style={{ background: row.isCustom ? '#FAFDF9' : undefined }}>
                          {/* Permission Name */}
                          <td>
                            <div style={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{row.permission}</span>
                              {row.isCustom && (
                                <span className="badge badge-outline" style={{ fontSize: '9.5px', padding: '1px 5px', color: '#00891D', borderColor: '#86EFAC' }}>
                                  Custom
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                              {row.permission.includes('Create') ? 'Authoring & Generation' :
                               row.permission.includes('analytics') ? 'Telemetry & Reporting' :
                               row.permission.includes('Approve') ? 'Review & Governance' :
                               row.permission.includes('Edit') ? 'Configuration Updates' : 'Operational Governance'}
                            </div>
                          </td>

                          {/* Admin (Superuser locked) */}
                          {selectedRoleFilter === 'all' && (
                            <td>
                              <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                                <Lock size={11} /> Yes (Locked)
                              </span>
                            </td>
                          )}

                          {/* Marketing */}
                          {(selectedRoleFilter === 'all' || selectedRoleFilter === 'marketing') && (
                            <td>
                              {isEditingMatrix ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDraftCell(row.permission, 'marketing')}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '4px 10px',
                                      borderRadius: '20px',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      border: row.marketing ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                                      background: row.marketing ? '#E8F5EA' : '#F3F4F6',
                                      color: row.marketing ? '#006B17' : '#6B7280',
                                      width: 'fit-content',
                                    }}
                                  >
                                    {row.marketing ? <Check size={12} color="#00891D" /> : <X size={12} color="#9CA3AF" />}
                                    <span>{row.marketing ? 'Allowed' : 'Denied'}</span>
                                  </button>
                                  {row.marketing && (
                                    <input
                                      type="text"
                                      placeholder="Optional condition note..."
                                      value={row.marketingNote || ''}
                                      onChange={(e) => handleNoteChange(row.permission, 'marketingNote', e.target.value)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '3px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #D1D5DB',
                                        width: '130px',
                                      }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleMatrixCell(row.permission, 'marketing')}
                                  className={`badge ${row.marketing ? 'badge-active' : 'badge-paused'}`}
                                  style={{ cursor: currentRole === 'Admin' ? 'pointer' : 'default', border: 'none' }}
                                  title={currentRole === 'Admin' ? 'Click to toggle permission for Marketing' : undefined}
                                >
                                  {row.marketing ? (row.marketingNote ? `Yes (${row.marketingNote})` : 'Yes') : 'No'}
                                </button>
                              )}
                            </td>
                          )}

                          {/* Hub Manager */}
                          {(selectedRoleFilter === 'all' || selectedRoleFilter === 'hubManager') && (
                            <td>
                              {isEditingMatrix ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDraftCell(row.permission, 'hubManager')}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '4px 10px',
                                      borderRadius: '20px',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      border: row.hubManager ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                                      background: row.hubManager ? '#E8F5EA' : '#F3F4F6',
                                      color: row.hubManager ? '#006B17' : '#6B7280',
                                      width: 'fit-content',
                                    }}
                                  >
                                    {row.hubManager ? <Check size={12} color="#00891D" /> : <X size={12} color="#9CA3AF" />}
                                    <span>{row.hubManager ? 'Allowed' : 'Denied'}</span>
                                  </button>
                                  {row.hubManager && (
                                    <input
                                      type="text"
                                      placeholder="Optional condition note..."
                                      value={row.hubManagerNote || ''}
                                      onChange={(e) => handleNoteChange(row.permission, 'hubManagerNote', e.target.value)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '3px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #D1D5DB',
                                        width: '130px',
                                      }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleMatrixCell(row.permission, 'hubManager')}
                                  className={`badge ${row.hubManager ? 'badge-active' : 'badge-paused'}`}
                                  style={{ cursor: currentRole === 'Admin' ? 'pointer' : 'default', border: 'none' }}
                                  title={currentRole === 'Admin' ? 'Click to toggle permission for Hub Manager' : undefined}
                                >
                                  {row.hubManager ? (row.hubManagerNote ? `Yes (${row.hubManagerNote})` : 'Yes') : 'No'}
                                </button>
                              )}
                            </td>
                          )}

                          {/* VGE (Field Executive) */}
                          {(selectedRoleFilter === 'all' || selectedRoleFilter === 'vge') && (
                            <td>
                              {isEditingMatrix ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleDraftCell(row.permission, 'vge')}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '4px 10px',
                                      borderRadius: '20px',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      border: row.vge ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                                      background: row.vge ? '#E8F5EA' : '#F3F4F6',
                                      color: row.vge ? '#006B17' : '#6B7280',
                                      width: 'fit-content',
                                    }}
                                  >
                                    {row.vge ? <Check size={12} color="#00891D" /> : <X size={12} color="#9CA3AF" />}
                                    <span>{row.vge ? 'Allowed' : 'Denied'}</span>
                                  </button>
                                  {row.vge && (
                                    <input
                                      type="text"
                                      placeholder="Optional condition note..."
                                      value={row.vgeNote || ''}
                                      onChange={(e) => handleNoteChange(row.permission, 'vgeNote', e.target.value)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '3px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #D1D5DB',
                                        width: '130px',
                                      }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleMatrixCell(row.permission, 'vge')}
                                  className={`badge ${row.vge ? 'badge-active' : 'badge-paused'}`}
                                  style={{ cursor: currentRole === 'Admin' ? 'pointer' : 'default', border: 'none' }}
                                  title={currentRole === 'Admin' ? 'Click to toggle permission for VGE' : undefined}
                                >
                                  {row.vge ? (row.vgeNote ? `Yes (${row.vgeNote})` : 'Yes') : 'No'}
                                </button>
                              )}
                            </td>
                          )}

                          {/* Row Action (Edit / Delete) */}
                          <td style={{ textAlign: 'right' }}>
                            {row.isCustom ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomPermission(row.permission)}
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '4px', color: '#DC2626' }}
                                title={`Delete custom permission: ${row.permission}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>System</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add Custom Permission Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: '#E8F5EA',
                  color: '#00891D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#111827' }}>
                    Add Custom Permission Rule
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                    Define a new capability in the governance access matrix
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn btn-ghost"
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomPermission}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Permission Name <span className="required-dot">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Export High-Res Vector SVG / EPS"
                    value={newPermName}
                    onChange={(e) => setNewPermName(e.target.value)}
                    required
                    autoFocus
                  />
                  <p className="form-helper">Unique descriptive name for the capability</p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Optional Scope / Condition Note
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Assigned hub scope only"
                    value={newPermNotes}
                    onChange={(e) => setNewPermNotes(e.target.value)}
                  />
                  <p className="form-helper">Specifies any policy restriction or conditional limit</p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Initial Granted Roles:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#6B7280' }}>
                      <input type="checkbox" checked disabled style={{ accentColor: '#00891D' }} />
                      <span><strong>Admin:</strong> Always Allowed (Locked Superuser Root)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer', color: '#111827' }}>
                      <input
                        type="checkbox"
                        checked={newPermRoleDefaults.marketing}
                        onChange={(e) => setNewPermRoleDefaults((prev) => ({ ...prev, marketing: e.target.checked }))}
                        style={{ accentColor: '#00891D' }}
                      />
                      <span><strong>Marketing:</strong> Allow capability for marketing creators</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer', color: '#111827' }}>
                      <input
                        type="checkbox"
                        checked={newPermRoleDefaults.hubManager}
                        onChange={(e) => setNewPermRoleDefaults((prev) => ({ ...prev, hubManager: e.target.checked }))}
                        style={{ accentColor: '#00891D' }}
                      />
                      <span><strong>Hub Manager:</strong> Allow capability for rural hub managers</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer', color: '#111827' }}>
                      <input
                        type="checkbox"
                        checked={newPermRoleDefaults.vge}
                        onChange={(e) => setNewPermRoleDefaults((prev) => ({ ...prev, vge: e.target.checked }))}
                        style={{ accentColor: '#00891D' }}
                      />
                      <span><strong>VGE (Field Executive):</strong> Allow capability for field agents</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #E5E7EB' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} />
                  Add Permission Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
 
export { Permissions as Screen14_Permissions };
export default Permissions;
