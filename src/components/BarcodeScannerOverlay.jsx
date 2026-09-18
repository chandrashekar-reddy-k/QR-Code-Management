import React, { useState, useEffect } from 'react';
import { Camera, X, Scan, AlertCircle } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import toast from 'react-hot-toast';

const BarcodeScannerOverlay = ({ onScan, onClose }) => {
  const [status, setStatus] = useState('Initializing scanner...');
  const [errorMsg, setErrorMsg] = useState('');
  const [noCamera, setNoCamera] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const videoRef = React.useRef(null);
  const controlsRef = React.useRef(null);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        // Step 1: Try to get camera permission — back-facing first, then any camera
        let stream = null;
        try {
          setStatus('Requesting camera permission...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
          });
        } catch (envErr) {
          // No back camera (desktop/laptop) — try any camera
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (anyErr) {
            if (mounted) {
              setNoCamera(true);
              setStatus('No camera found');
              setErrorMsg('No camera detected. Please type the barcode manually below.');
            }
            return;
          }
        }

        // Stop the test stream before handing control to ZXing
        if (stream) stream.getTracks().forEach(t => t.stop());

        if (!mounted) return;
        setStatus('Starting scanner...');

        // Step 2: Configure ZXing hints
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.CODABAR,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.ITF,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.QR_CODE
        ]);

        const codeReader = new BrowserMultiFormatReader(hints);

        // Step 3: Enumerate video devices
        let videoInputDevices = [];
        try {
          videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        } catch (_) {}

        let selectedDeviceId = null;
        if (videoInputDevices.length > 0) {
          const backCamera = videoInputDevices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        }

        // Step 4a: No device ID — fall back to constraints-based decoding
        if (!selectedDeviceId) {
          if (videoRef.current && mounted) {
            try {
              controlsRef.current = await codeReader.decodeFromConstraints(
                { video: { facingMode: { ideal: 'environment' } } },
                videoRef.current,
                (result) => {
                  if (result && mounted) {
                    toast.success('Barcode scanned!');
                    onScan(result.getText());
                    controlsRef.current?.stop();
                    onClose();
                  }
                }
              );
              if (mounted) setStatus('Scanning… point at a barcode');
            } catch (constraintErr) {
              if (mounted) {
                setNoCamera(true);
                setStatus('No camera found');
                setErrorMsg('No camera detected. Please type the barcode manually below.');
              }
            }
          }
          return;
        }

        // Step 4b: Decode from the selected device ID
        if (videoRef.current && mounted) {
          controlsRef.current = await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result) => {
              if (result && mounted) {
                toast.success('Barcode scanned!');
                onScan(result.getText());
                controlsRef.current?.stop();
                onClose();
              }
            }
          );
          if (mounted) setStatus('Scanning… point at a barcode');
        }

      } catch (err) {
        console.error('ZXing Scanner Error:', err);
        if (!mounted) return;
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setNoCamera(true);
          setStatus('No camera found');
          setErrorMsg('No camera detected on this device. Enter the barcode manually.');
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatus('Camera permission denied');
          setErrorMsg('Camera access denied. Allow camera in browser settings, or enter the barcode manually.');
        } else {
          setStatus('Scanner error');
          setErrorMsg('Could not start the scanner. Please enter the barcode manually.');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      controlsRef.current?.stop();
    };
  }, []);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl" style={{ animation: 'fadeIn 0.3s ease-out' }}>

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${noCamera ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {noCamera ? <AlertCircle size={20} /> : <Camera size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none">Barcode Scanner</h3>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${errorMsg ? 'text-rose-500' : noCamera ? 'text-amber-500' : 'text-indigo-600'}`}>
                {status}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-rose-50 rounded-2xl text-gray-400 hover:text-rose-500 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Camera viewfinder — hidden when no camera */}
          {!noCamera && (
            <div className="relative bg-gray-900 rounded-[2rem] overflow-hidden border-4 border-gray-50 flex items-center justify-center shadow-inner" style={{ minHeight: '260px' }}>
              <video ref={videoRef} className="w-full h-full object-cover rounded-[1.5rem]" style={{ maxHeight: '55vh' }} />
              {/* Corner markers */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[70%] h-[50%] border-2 border-indigo-500/50 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 -mt-0.5 -ml-0.5 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 -mt-0.5 -mr-0.5 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 -mb-0.5 -ml-0.5 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 -mb-0.5 -mr-0.5 rounded-br-lg"></div>
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-rose-500/60 animate-bounce"></div>
                </div>
              </div>
            </div>
          )}

          {/* No-camera placeholder */}
          {noCamera && (
            <div className="flex flex-col items-center justify-center py-10 bg-amber-50 rounded-[2rem] border-2 border-amber-100">
              <Scan size={48} className="text-amber-300 mb-3" />
              <p className="text-sm font-black text-amber-700 text-center">No camera detected</p>
              <p className="text-xs text-amber-500 text-center px-6 mt-1">Enter the barcode manually using the field below</p>
            </div>
          )}

          {/* Error state (camera exists but failed) */}
          {errorMsg && !noCamera && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <p className="text-xs text-rose-700 font-bold">{errorMsg}</p>
            </div>
          )}

          {/* Manual barcode entry */}
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder={noCamera ? 'Enter barcode here...' : 'Or type barcode manually...'}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
              autoFocus={noCamera}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              Use
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <button
            onClick={onClose}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-gray-800 transition-all active:scale-[0.98]"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerOverlay;
