import React, { useState } from 'react';
import { useQR } from '../context/QRContext';
import { QRCodeRenderer } from './QRCodeRenderer';
import { 
  X, 
  Smartphone, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  Radio,
} from 'lucide-react';

export const TestScanModal = () => {
  const { testScanModal, setTestScanModal, simulateScan } = useQR();
  const [simulatedDevice, setSimulatedDevice] = useState('Android 14 (Redmi 12 5G)');
  const [triggerConversion, setTriggerConversion] = useState(true);
  const [scanStatus, setScanStatus] = useState('scanning'); // 'scanning', 'redirected'

  if (!testScanModal.isOpen || !testScanModal.qrCode) return null;

  const qr = testScanModal.qrCode;
  const destination = qr.destination || {};
  const isAndroid = simulatedDevice.includes('Android');
  const isIos = simulatedDevice.includes('iOS');
  const isBot = simulatedDevice.includes('Bot');

  const resolvedUrl = destination.routingBehavior === 'fallback_only'
    ? destination.fallbackUrl
    : isAndroid
    ? (destination.androidUrl || destination.fallbackUrl)
    : isIos
    ? (destination.iosUrl || destination.fallbackUrl)
    : destination.fallbackUrl;

  const handleSimulate = () => {
    setScanStatus('redirected');
    simulateScan(qr, simulatedDevice, triggerConversion);
    if (resolvedUrl && resolvedUrl.startsWith('http') && !isBot) {
      window.open(resolvedUrl, '_blank');
    }
  };

  const handleClose = () => {
    setScanStatus('scanning');
    setTestScanModal({ isOpen: false, qrCode: null });
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-card" 
        style={{ maxWidth: '640px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '8px', 
              background: '#E8F5EA', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#00891D',
            }}>
              <Smartphone size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#111827' }}>
                Interactive QR Scanner Simulator
              </h2>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                Test scan decoding & device-based routing resolution
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="btn btn-ghost" 
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ background: '#F9FAFB' }}>
          {/* Top Info Banner */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{qr.name}</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{qr.id}</span> · Type: <strong>{qr.type}</strong> · Hub: {qr.hubName || 'Phirangipuram'}
              </div>
            </div>
            <span className={`badge badge-${qr.status?.toLowerCase().replace(' ', '-')}`}>
              {qr.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: '20px', alignItems: 'center' }}>
            {/* Viewfinder simulator */}
            <div style={{
              position: 'relative',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '14px',
              border: '2px solid #E5E7EB',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <QRCodeRenderer
                value={resolvedUrl || destination.fallbackUrl || destination.androidUrl || `https://qr.villagkart.com/${destination.redirectCode || qr.id || 'test'}`}
                fgColor={qr.design?.fgColor || '#00891D'}
                bgColor="#FFFFFF"
                size={160}
                hasCtaFrame={false}
                showLogo={qr.design?.showLogo ?? true}
                quietZone={2}
              />
              <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#00891D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#00891D' }}></span>
                Scan with any phone camera
              </div>
            </div>

            {/* Test Routing Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Simulated Device & Operating System:
                </label>
                <select 
                  className="form-control" 
                  value={simulatedDevice}
                  onChange={(e) => {
                    setSimulatedDevice(e.target.value);
                    setScanStatus('scanning');
                  }}
                  style={{ fontSize: '13px' }}
                >
                  <option value="Android 14 (Redmi 12 5G)">Android 14 (Redmi 12 5G / Chrome)</option>
                  <option value="Android 13 (Samsung Galaxy M14)">Android 13 (Samsung Galaxy M14)</option>
                  <option value="iOS 18.2 (iPhone 13)">iOS 18.2 (Apple iPhone 13 / Safari)</option>
                  <option value="Desktop (Windows 11 / Chrome)">Desktop (Windows 11 / Chrome)</option>
                  <option value="Bot / Crawler (WhatsApp Image Scraper)">Bot / Web Crawler (WhatsApp Preloader)</option>
                </select>
              </div>

              {/* Routing decision card */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px'
              }}>
                <div style={{ fontWeight: 700, color: '#00891D', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} />
                  Device Routing Resolution:
                </div>
                <div style={{ color: '#4B5563', lineHeight: '1.4' }}>
                  {isBot ? (
                    <span style={{ color: '#DC2626' }}>
                      ⚠️ <strong>Bot Traffic Detected:</strong> Filtered out to protect analytics accuracy.
                    </span>
                  ) : destination.routingBehavior === 'fallback_only' ? (
                    <span>
                      🌐 <strong>Direct Target URL:</strong> All devices (Android, iOS, PC) bypass app stores and redirect directly to your target destination URL.
                    </span>
                  ) : destination.routingBehavior === 'landing' ? (
                    <span>
                      📄 <strong>Choice Landing Page:</strong> Displays responsive mobile landing page with Android and iOS download buttons.
                    </span>
                  ) : isAndroid ? (
                    <span>
                      🤖 <strong>Android OS Detected:</strong> Deep links to <code>villagkart://</code> or routes to Google Play Store with campaign UTM tags preserved.
                    </span>
                  ) : isIos ? (
                    <span>
                      🍏 <strong>iOS Detected:</strong> Routes to Apple App Store universal link with partner attribution code.
                    </span>
                  ) : (
                    <span>
                      🌐 <strong>Fallback Triggered:</strong> Shows mobile-friendly fallback landing page with store badges.
                    </span>
                  )}
                </div>

                <div style={{
                  marginTop: '8px',
                  padding: '8px 10px',
                  background: '#E8F5EA',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    wordBreak: 'break-all',
                    color: '#006B17',
                    fontWeight: 700,
                  }}>
                    Target: {resolvedUrl || 'https://villagkart.com'}
                  </div>
                  {resolvedUrl && resolvedUrl.startsWith('http') && (
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        background: '#FFFFFF',
                        borderColor: '#00891D',
                        color: '#00891D',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Open destination in a new browser tab"
                    >
                      <ExternalLink size={12} />
                      Open URL Now
                    </a>
                  )}
                </div>
              </div>

              {/* Conversion attribution toggle */}
              {!isBot && (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '12.5px', 
                  cursor: 'pointer',
                  color: '#1F2937' 
                }}>
                  <input
                    type="checkbox"
                    checked={triggerConversion}
                    onChange={(e) => setTriggerConversion(e.target.checked)}
                    style={{ accentColor: '#00891D', width: '16px', height: '16px' }}
                  />
                  <span>Simulate Verified App Registration / First Order event</span>
                </label>
              )}
            </div>
          </div>

          {/* Result state */}
          {scanStatus === 'redirected' && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#E8F5EA',
              border: '1px solid #A5D6A7',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#006B17',
              fontSize: '13px'
            }}>
              <CheckCircle2 size={18} color="#00891D" />
              <div>
                <strong>Scan Successfully Executed & Recorded!</strong> Event logged in live Scan History with IP geo and conversion attribution.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={handleClose} className="btn btn-secondary btn-sm">
            Close
          </button>
          <button onClick={handleSimulate} className="btn btn-primary btn-sm">
            <Radio size={14} />
            Simulate Scan Event
          </button>
        </div>
      </div>
    </div>
  );
};
