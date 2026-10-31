import React from 'react';
import { useQR } from '../context/QRContext';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export const DeleteConfirmModal = () => {
  const { deleteModal, closeDeleteModal, confirmDeleteQR } = useQR();

  if (!deleteModal?.isOpen || !deleteModal?.qr) return null;

  const qr = deleteModal.qr;
  const shortlink = `villagkart.com/${qr.destination?.redirectCode || qr.id}`;

  return (
    <div
      className="modal-overlay"
      onClick={closeDeleteModal}
      style={{
        zIndex: 1050,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: '490px',
          width: '100%',
          borderRadius: '16px',
          background: '#FFFFFF',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #FEE2E2',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trash2 size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#111827',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Permanently Delete QR Code?
              </h3>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '3px 0 0 0' }}>
                This operational governance action cannot be reversed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDeleteModal}
            className="btn btn-ghost"
            style={{ padding: '4px', color: '#9CA3AF' }}
            title="Cancel and close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Warning Message Banner */}
          <div
            style={{
              background: '#FFF5F5',
              border: '1px solid #FECDD3',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle
              size={18}
              color="#DC2626"
              style={{ flexShrink: 0, marginTop: '2px' }}
            />
            <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.45 }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: '#7F1D1D' }}>{qr.name}</strong> (
              <code
                style={{
                  fontFamily: 'monospace',
                  background: '#FEE2E2',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#991B1B',
                }}
              >
                {qr.id}
              </code>
              )? All printed posters, stickers, flyers, vehicle vinyls, and redirect routing links will
              immediately stop functioning.
            </div>
          </div>

          {/* QR Summary Card */}
          <div
            style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12.5px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #F3F4F6',
                paddingBottom: '8px',
              }}
            >
              <span style={{ color: '#6B7280', fontWeight: 500 }}>Entity Name</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>{qr.name}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #F3F4F6',
                paddingBottom: '8px',
              }}
            >
              <span style={{ color: '#6B7280', fontWeight: 500 }}>Unique ID & Version</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00891D' }}>
                {qr.id} · {qr.version || 'v1.0'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #F3F4F6',
                paddingBottom: '8px',
              }}
            >
              <span style={{ color: '#6B7280', fontWeight: 500 }}>Lifecycle Status</span>
              <span
                className={`badge badge-${qr.status?.toLowerCase().replace(' ', '-')}`}
                style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 700 }}
              >
                {qr.status}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#6B7280', fontWeight: 500 }}>Shortlink Target</span>
              <span
                style={{
                  fontFamily: 'monospace',
                  color: '#4B5563',
                  fontSize: '11.5px',
                  maxWidth: '260px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={shortlink}
              >
                {shortlink}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            background: '#F9FAFB',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={closeDeleteModal}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 600, padding: '7px 16px' }}
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-delete-qr"
            onClick={confirmDeleteQR}
            className="btn btn-sm"
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              border: '1px solid #B91C1C',
              padding: '7px 18px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)',
            }}
          >
            <Trash2 size={14} />
            <span>Permanently Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
