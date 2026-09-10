import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Barcode, Zap } from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import toast from 'react-hot-toast';

const BarcodeScannerOverlay = ({ onScan, onClose }) => {
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        const testStream = await navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } });
        testStream?.getTracks().forEach(t => t.stop());

        if (!mounted) return;

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
          BarcodeFormat.QR_CODE
        ]);

        const codeReader = new BrowserMultiFormatReader(hints);
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        
        let selectedDeviceId = null;
        if (videoInputDevices.length > 0) {
          const backCamera = videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment')
          );
          selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        }

        if (videoRef.current) {
          controlsRef.current = await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            (result) => {
              if (result && mounted) {
                toast.success('Barcode scanned!');
                onScan(result.getText());
                if (controlsRef.current) {
                  controlsRef.current.stop();
                }
                onClose();
              }
            }
          );
        }
      } catch (err) {
        console.error('Scanner init info:', err);
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [onScan, onClose]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col justify-between p-4 overflow-y-auto animate-fade-in">
      <div className="max-w-[420px] mx-auto w-full space-y-6 pt-2">
        {/* Header Bar */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Barcode Scanner</h1>
        </div>

        {/* Viewfinder Card */}
        <div className="bg-white rounded-3xl p-4 border border-gray-100/90 shadow-sm space-y-4">
          <div className="relative bg-[#F9FAFB] rounded-2xl h-56 w-full overflow-hidden flex flex-col items-center justify-center border border-gray-100">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              playsInline
              muted
            />

            {/* Green Viewfinder Frame */}
            <div className="relative z-10 w-48 h-32 flex flex-col items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#00891D] rounded-tl-md" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#00891D] rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#00891D] rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#00891D] rounded-br-md" />

              {/* Center scanline */}
              <div className="w-36 h-0.5 bg-[#00891D]/70 rounded-full shadow-sm animate-pulse" />
            </div>

            <p className="relative z-10 text-[10px] font-medium text-gray-400 mt-2">
              Align barcode within the frame
            </p>
          </div>
        </div>

        {/* Enter Barcode Number Section */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-black text-gray-900 tracking-tight">
            Enter Barcode Number
          </label>
          <div className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2 focus-within:border-[#00891D] transition-colors">
            <Barcode size={16} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Enter Barcode Number"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
              className="w-full text-xs font-semibold text-gray-900 placeholder:text-gray-400 bg-transparent border-none outline-none"
            />
          </div>
        </div>

        {/* Buttons: Cancel & Scan */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-1/3 py-3.5 bg-white border border-gray-200 rounded-2xl text-xs font-extrabold text-gray-700 hover:bg-gray-50 active:scale-98 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleManualSubmit}
            className="w-2/3 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap size={14} className="fill-white" />
            <span>Scan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerOverlay;
