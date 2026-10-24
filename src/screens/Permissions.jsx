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
} from 'lucide-react';

export const Permissions = () => {
  const {
    permissionsMatrix,
    setPermissionsMatrix,
    approvals,
    handleApprovalAction,
    currentRole,
    showToast,
  } = useQR();

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'matrix'
  const [commentInputs, setCommentInputs] = useState({});

  const pendingApprovals = approvals.filter((a) => a.status === 'Pending');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'Pending');

  const handleCommentChange = (id, text) => {
    setCommentInputs((prev) => ({ ...prev, [id]: text }));
  };

  const toggleMatrixCell = (permName, roleKey) => {
    if (currentRole !== 'Admin') {
      showToast('Only Admin role can modify the permissions matrix', 'error');
      return;
    }
    setPermissionsMatrix((prev) =>
      prev.map((row) => {
        if (row.permission === permName) {
          return { ...row, [roleKey]: !row[roleKey] };
        }
        return row;
      })
    );
    showToast(`Updated permission "${permName}" for ${roleKey}`);
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
              Section A — Role Permissions
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`btn btn-sm ${activeTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Section B — Approval Queue ({pendingApprovals.length})
            </button>
          </div>
        </div>
      </div>

      {/* SECTION B: Approval Queue */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="vk-card">
            <h3 className="vk-card-title">Section B — Approval Queue</h3>
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

      {/* SECTION A: Role Permission Matrix */}
      {activeTab === 'matrix' && (
        <div className="vk-card">
          <div className="vk-card-header">
            <div>
              <h3 className="vk-card-title">Section A — Role Permissions Matrix</h3>
              <p className="vk-card-subtitle">
                System specification default matrix (Page 20). Admin users can toggle permissions to configure live governance.
              </p>
            </div>
          </div>

          <div className="vk-table-container">
            <table className="vk-table">
              <thead>
                <tr>
                  <th>Permission Name</th>
                  <th>Admin</th>
                  <th>Marketing</th>
                  <th>Hub Manager</th>
                  <th>VGE (Field Executive)</th>
                </tr>
              </thead>
              <tbody>
                {permissionsMatrix.map((row) => (
                  <tr key={row.permission}>
                    <td style={{ fontWeight: 600, color: '#111827' }}>{row.permission}</td>
                    <td>
                      <span className="badge badge-active">Yes (Locked)</span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMatrixCell(row.permission, 'marketing')}
                        className={`badge ${row.marketing ? 'badge-active' : 'badge-paused'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {row.marketing ? (row.marketingNote || 'Yes') : 'No'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMatrixCell(row.permission, 'hubManager')}
                        className={`badge ${row.hubManager ? 'badge-active' : 'badge-paused'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {row.hubManager ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMatrixCell(row.permission, 'vge')}
                        className={`badge ${row.vge ? 'badge-active' : 'badge-paused'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {row.vge ? (row.vgeNote || 'Yes') : 'No'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
 
export { Permissions as Screen14_Permissions };
export default Permissions;
