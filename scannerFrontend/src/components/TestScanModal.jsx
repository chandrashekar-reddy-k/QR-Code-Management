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

// Detect client device for "our device by default"
const getClientDefaultDevice = () => {
  if (typeof window === 'undefined') return 'Desktop';
  const ua = (window.navigator?.userAgent || '').toLowerCase();
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'Apple';
  if (/macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) return 'Apple';
  return 'Desktop';
};

export const TestScanModal = () => {
  const {
    testScanModal,
    setTestScanModal,
    simulateScan,
    setActiveScreen,
    setSelectedQrId,
    setDetailsViewMode,
  } = useQR();
  const [userSelectedDevice, setUserSelectedDevice] = useState(null);
  const [triggerConversion, setTriggerConversion] = useState(true);
  const [scanStatus, setScanStatus] = useState('scanning'); // 'scanning', 'redirected'

  if (!testScanModal.isOpen || !testScanModal.qrCode) return null;

  const simulatedDevice = userSelectedDevice || testScanModal.device || getClientDefaultDevice();

  const qr = testScanModal.qrCode;
  const destination = qr.destination || {};
  const isAndroid = simulatedDevice === 'Android' || simulatedDevice.includes('Android');
  const isApple = simulatedDevice === 'Apple' || simulatedDevice.includes('Apple') || simulatedDevice.includes('iOS');

  const resolvedUrl = destination.routingBehavior === 'fallback_only'
    ? destination.fallbackUrl
    : isAndroid
      ? (destination.androidUrl || destination.fallbackUrl)
      : isApple
        ? (destination.iosUrl || destination.fallbackUrl)
        : destination.fallbackUrl;

  const handleSimulate = () => {
    setScanStatus('redirected');
    simulateScan(qr, simulatedDevice, triggerConversion);

    // Simulate the actual device redirect — open the resolved destination URL
    const urlToOpen = resolvedUrl
      || destination.fallbackUrl
      || destination.androidUrl
      || destination.iosUrl;
    if (urlToOpen && urlToOpen.startsWith('http')) {
      window.open(urlToOpen, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClose = () => {
    setScanStatus('scanning');
    setUserSelectedDevice(null);
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
                ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{qr.id}</span>
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
                value={resolvedUrl || destination.fallbackUrl || destination.androidUrl || `https://villagkart.com/${destination.redirectCode || qr.id || 'test'}`}
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
                    setUserSelectedDevice(e.target.value);
                    setScanStatus('scanning');
                  }}
                  style={{ fontSize: '13px' }}
                >
                  <option value="Desktop">Desktop</option>
                  <option value="Android">Android</option>
                  <option value="Apple">Apple</option>
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
                  {destination.routingBehavior === 'fallback_only' ? (
                    <span>
                      🌐 <strong>Direct Target URL:</strong> All devices (Desktop, Android, Apple) bypass app stores and redirect directly to your target destination URL.
                    </span>
                  ) : destination.routingBehavior === 'landing' ? (
                    <span>
                      📄 <strong>Choice Landing Page:</strong> Displays responsive mobile landing page with Android and Apple download buttons.
                    </span>
                  ) : isAndroid ? (
                    <span>
                      🤖 <strong>Android Detected:</strong> Deep links to <code>villagkart://</code> or routes to Google Play Store with campaign UTM tags preserved.
                    </span>
                  ) : isApple ? (
                    <span>
                      🍏 <strong>Apple Detected:</strong> Routes to Apple App Store universal link with partner attribution code.
                    </span>
                  ) : (
                    <span>
                      💻 <strong>Desktop Detected:</strong> Directs to web fallback destination URL.
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
            </div>
          </div>

          {/* Result state */}
          {scanStatus === 'redirected' && (
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              background: '#F0FDF4',
              border: '1.5px solid #BBF7D0',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#166534',
              fontSize: '13px',
              boxShadow: '0 2px 6px rgba(0, 137, 29, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle2 size={18} color="#00891D" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#15803D' }}>
                    Scan Successfully Executed & Recorded!
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px', lineHeight: 1.4 }}>
                    Logged in live <strong>Scan History</strong> for device <code>{simulatedDevice.split(' ')[0]}</code> with IP geo and verified attribution.
                  </div>
                </div>
              </div>

              {/* Navigation workflow shortcuts */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid #DCFCE7' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    setActiveScreen('scan-history');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ background: '#FFFFFF', color: '#00891D', borderColor: '#BBF7D0', fontSize: '11.5px', fontWeight: 700 }}
                >
                  View in Scan History Log ➔
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    setSelectedQrId(qr.id);
                    setDetailsViewMode('detail');
                    setActiveScreen('details');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ background: '#FFFFFF', color: '#00891D', borderColor: '#BBF7D0', fontSize: '11.5px', fontWeight: 700 }}
                >
                  Inspect Full QR Details ➔
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={handleClose} className="btn btn-secondary btn-sm">
            {scanStatus === 'redirected' ? 'Done & Close' : 'Close'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {scanStatus === 'redirected' && (
              <button
                type="button"
                onClick={() => setScanStatus('scanning')}
                className="btn btn-ghost btn-sm"
                style={{ color: '#00891D', fontWeight: 600 }}
              >
                Reset Simulator
              </button>
            )}
            <button onClick={handleSimulate} className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
              <Radio size={14} />
              {scanStatus === 'redirected' ? 'Simulate Another Scan' : 'Simulate Scan Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
