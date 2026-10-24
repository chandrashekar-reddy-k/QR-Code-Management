import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from '../components/QRCodeRenderer';
import {
  Smartphone,
  Share2,
  Download,
  Award,
  Users,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';

export const MobileFieldMode = () => {
  const {
    qrCodes,
    currentRole,
    setTestScanModal,
    showToast,
    setActiveScreen,
    setSelectedQrId,
  } = useQR();

  const [search, setSearch] = useState('');

  // VGE & Hub Manager mobile scoped QR codes
  const fieldQrs = qrCodes.filter((q) => {
    if (currentRole === 'VGE') {
      return q.type === 'Referral' || q.owner.includes('VGE');
    }
    if (currentRole === 'Hub Manager') {
      return q.hubId === 'HUB-01';
    }
    return true;
  });

  const filtered = fieldQrs.filter(
    (q) => q.name.toLowerCase().includes(search.toLowerCase()) || q.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleShareWhatsApp = (qr) => {
    const text = encodeURIComponent(
      `Join VillagKart using this official link: https://qr.villagkart.com/${qr.destination?.redirectCode || qr.id}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    showToast(`Shared ${qr.name} to WhatsApp!`);
  };

  return (
    <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '0 12px 20px 12px' }}>
      {/* Mobile Header Banner (VillagKart ERP Style) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <img src="/villagekart_logo.svg" alt="VillagKart" style={{ height: '24px', objectFit: 'contain' }} />
          <span className="badge badge-active" style={{ fontSize: '10.5px' }}>
            {currentRole} Mode
          </span>
        </div>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>QR Field Pocket</h2>
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '3px 0 0 0' }}>
          One-tap access, WhatsApp instant sharing & field test scans
        </p>
      </div>

      {/* Field Performance Summary Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '14px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>Field Acquisition Stats</span>
          <Award size={15} color="#00891D" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
          <div style={{ background: '#F9FAFB', padding: '10px 4px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>Assigned QRs</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{fieldQrs.length}</div>
          </div>
          <div style={{ background: '#F9FAFB', padding: '10px 4px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>Total Scans</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#00891D' }}>
              {fieldQrs.reduce((a, b) => a + (b.metrics?.scans || 0), 0).toLocaleString()}
            </div>
          </div>
          <div style={{ background: '#F9FAFB', padding: '10px 4px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>Conversions</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#00891D' }}>
              {fieldQrs.reduce((a, b) => a + (b.metrics?.verifiedRegistrations || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div style={{ position: 'relative' }}>
        <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search assigned QR codes..."
          className="form-control"
          style={{ paddingLeft: '34px', fontSize: '12.5px', borderRadius: '8px' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Assigned QR Code Pocket Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((qr) => (
          <div
            key={qr.id}
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* QR Thumbnail */}
              <div
                onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <QRCodeRenderer
                  value={qr.destination?.fallbackUrl || qr.destination?.androidUrl || `https://qr.villagkart.com/${qr.destination?.redirectCode || qr.id}`}
                  fgColor={qr.design?.fgColor || '#00891D'}
                  bgColor="#FFFFFF"
                  size={48}
                  hasCtaFrame={false}
                  showLogo={false}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-active" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    {qr.status}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#6B7280' }}>
                    {qr.id}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {qr.name}
                </div>
                <div style={{ fontSize: '11.5px', color: '#00891D', fontWeight: 600, marginTop: '2px' }}>
                  {(qr.metrics?.scans || 0).toLocaleString()} Scans · {(qr.metrics?.verifiedRegistrations || 0)} Reg
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
              <button
                onClick={() => handleShareWhatsApp(qr)}
                className="btn btn-secondary btn-sm"
                style={{ borderColor: '#25D366', color: '#128C7E', fontSize: '12px', padding: '5px' }}
              >
                <Share2 size={13} />
                WhatsApp Share
              </button>

              <button
                onClick={() => setTestScanModal({ isOpen: true, qrCode: qr })}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12px', padding: '5px' }}
              >
                <Smartphone size={13} />
                Scan & Test
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
 
export { MobileFieldMode as Screen18_MobileFieldMode };
export default MobileFieldMode;
