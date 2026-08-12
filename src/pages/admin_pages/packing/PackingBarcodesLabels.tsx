import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Printer, RefreshCw, Barcode, ClipboardList, CheckCircle, AlertTriangle, UserCheck, Clock } from 'lucide-react';
import { authService, User } from '../../../api/packing/authService';
import { workOrderService, WorkOrder, WoStatus } from '../../../api/packing/workOrderService';
import { barcodeService } from '../../../api/packing/barcodeService';

const PRINTERS = [
  'Zebra ZD420 (Thermal)',
  'TSC TE244 (Thermal)',
  'Brother TD-4420DN',
  'Bluetooth Portable Printer',
  'Generic Thermal Print Head',
];

interface PrintJob {
  id: string;
  woNo: string;
  sku: string;
  batchNo: string;
  printedQty: number;
  printer: string;
  timestamp: string;
  printedBy: string;
  status: 'Printed' | 'Reprinted';
  reprintReason?: string;
  assignedOperator?: string;
}

// Code 128 Barcode drawing function on Canvas
const drawBarcode128 = (canvas: HTMLCanvasElement | null, text: string) => {
  if (!canvas || !text) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const PATTERNS: number[][] = [
    [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3],
    [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2],
    [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2],
    [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], [1, 1, 3, 2, 2, 2],
    [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2],
    [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1],
    [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2],
    [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1],
    [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1],
    [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3],
    [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1],
    [1, 3, 2, 1, 3, 1], [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1],
    [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3],
    [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1],
    [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1],
    [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4],
    [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2],
    [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4],
    [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], [2, 4, 1, 2, 1, 1],
    [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1],
    [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2],
    [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2],
    [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1], [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1],
    [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3],
    [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1],
    [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2],
    [2, 1, 1, 2, 1, 4], [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1, 2]
  ];

  const getCharValue = (char: string) => {
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 126) return code - 32;
    return 0;
  };

  const startValue = 104;
  let checksum = startValue;
  const codes = [startValue];

  for (let i = 0; i < text.length; i++) {
    const val = getCharValue(text[i]);
    codes.push(val);
    checksum += val * (i + 1);
  }

  const stopValue = 106;
  codes.push(checksum % 103);
  codes.push(stopValue);

  let bars: number[] = [];
  codes.forEach((c) => {
    if (PATTERNS[c]) {
      bars = bars.concat(PATTERNS[c]);
    }
  });
  bars = bars.concat(PATTERNS[106]);

  const scale = 3;
  const barcodeWidth = bars.reduce((acc, curr) => acc + curr, 0) * scale;

  canvas.width = Math.max(barcodeWidth, 200);
  canvas.height = 100;

  let x = 0;
  let isBar = true;

  bars.forEach((width) => {
    const w = width * scale;
    if (isBar) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, 0, w, 100);
    }
    x += w;
    isBar = !isBar;
  });
};

export const PackingBarcodesLabels: React.FC = () => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  // Printer Status State
  const [printerStatus, setPrinterStatus] = useState<'Online' | 'Offline'>('Online');

  // Operators for Assignment
  const [operators, setOperators] = useState<User[]>([]);
  const [assignedOperatorId, setAssignedOperatorId] = useState<string>('');

  // Configuration Panel Fields
  const [selectedPrinter, setSelectedPrinter] = useState(PRINTERS[0]);
  const [labelTemplate, setLabelTemplate] = useState<'Retail Label' | 'Bulk Label' | 'Export Label'>('Retail Label');
  const [barcodeType, setBarcodeType] = useState<'Code 128' | 'EAN-13' | 'QR Code' | 'GS1-128'>('Code 128');

  // Input Fields
  const [sku, setSku] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [mrp, setMrp] = useState(60);
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [printQty, setPrintQty] = useState(1);

  // Validation / Notice states
  const [validationError, setValidationError] = useState('');
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{
    totalPrinted: number;
    timestamp: string;
    printer: string;
    jobId: string;
  } | null>(null);

  // History state (24-hour window)
  const [history, setHistory] = useState<PrintJob[]>([]);
  const [labelsPrinted, setLabelsPrinted] = useState(0);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    batchNo || sku || '9031123456789'
  )}`;

  const fetchWorkOrders = async () => {
    try {
      const res = await workOrderService.getWorkOrders();
      const data = res.data || [];
      setWorkOrders(data);
    } catch (err) {
      console.error('Failed to fetch work orders in PackingBarcodesLabels:', err);
    }
  };

  const fetchOperators = async () => {
    try {
      const ops = await authService.getOperators();
      setOperators(ops || []);
    } catch (err) {
      console.error('Failed to fetch operators:', err);
    }
  };

  const filterHistoryFor24h = (jobs: PrintJob[]): PrintJob[] => {
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return jobs.filter((job) => {
      const jobTime = new Date(job.timestamp).getTime();
      return !isNaN(jobTime) && now - jobTime <= oneDayMs;
    });
  };

  const fetchPrintHistory = async () => {
    try {
      const res = await barcodeService.getPrintHistory();
      if (res && (res.success || res.data) && Array.isArray(res.data || res)) {
        const jobs = res.data || res;
        const filtered = filterHistoryFor24h(jobs);
        setHistory(filtered);
        localStorage.setItem('reprint_history_logs_24h', JSON.stringify(filtered));
        return;
      }
    } catch (err) {
      console.error('Failed to fetch print history from API, fallback to cache:', err);
    }

    try {
      const cached = localStorage.getItem('reprint_history_logs_24h');
      if (cached) {
        const parsed: PrintJob[] = JSON.parse(cached);
        const filtered = filterHistoryFor24h(parsed);
        setHistory(filtered);
      }
    } catch (e) {
      console.error('Failed to parse cached history:', e);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchOperators();
    fetchPrintHistory();
  }, []);

  // Filter to eligible label work orders (PACKING_COMPLETED, repacking relabeling, or label workflow statuses)
  const selectableWOs = useMemo(() => {
    const eligibleStatuses: WoStatus[] = [
      'PACKING_COMPLETED',   // Standard flow
      'REPACKING_COMPLETED', // Repacking with relabeling required — arrives here via workflowService
      'LABEL_APPLICATION_ASSIGNED',
      'LABEL_APPLICATION_IN_PROGRESS',
      'LABELS_APPLIED',
      'QC_PENDING',
    ];
    return workOrders.filter((w) => eligibleStatuses.includes(w.status));
  }, [workOrders]);

  // Sync initial selection & updates
  useEffect(() => {
    if (selectableWOs.length > 0 && !selectedWO) {
      setSelectedWO(selectableWOs[0]);
    } else if (selectedWO) {
      const updated = workOrders.find((w) => w.id === selectedWO.id);
      if (updated) {
        setSelectedWO(updated);
      }
    }
  }, [selectableWOs, selectedWO, workOrders]);

  // Sync inputs when selected WO changes
  useEffect(() => {
    if (selectedWO) {
      const recipe = selectedWO.recipe;
      const product = selectedWO.product;

      setSku(product?.sku || recipe?.code || 'SKU-SM500');
      setBatchNo(selectedWO.batchNumber || `BATCH-${selectedWO.woNumber}`);
      setLotNo(`LOT-${selectedWO.woNumber}`);
      setMrp((product as any)?.mrp || 60);

      const reqCount = selectedWO.actualProduced || selectedWO.requiredQty;
      setPrintQty(reqCount);
      if (selectedWO.operatorId) {
        setAssignedOperatorId(selectedWO.operatorId);
      } else if (selectedWO.operator?.id) {
        setAssignedOperatorId(selectedWO.operator.id);
      }

      const today = new Date().toISOString().split('T')[0];
      setMfgDate(today);
      const exp = new Date();
      exp.setDate(exp.getDate() + 180);
      setExpiryDate(exp.toISOString().split('T')[0]);
    }
  }, [selectedWO]);

  // Draw barcode on preview canvas
  useEffect(() => {
    if (barcodeType !== 'QR Code' && previewCanvasRef.current) {
      drawBarcode128(previewCanvasRef.current, batchNo || sku || '9031123456789');
    }
  }, [batchNo, sku, barcodeType, selectedWO]);

  useEffect(() => {
    if (printerStatus === 'Offline') {
      setValidationError('Printer is Offline. Please check printer connection.');
    } else {
      setValidationError('');
    }
  }, [printerStatus]);

  const labelsRequired = selectedWO
    ? selectedWO.actualProduced ?? selectedWO.requiredQty ?? 0
    : 0;

  const handleGeneratePreview = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError('');
    setSuccessBanner(null);
    if (!selectedWO) return setValidationError('Please select a Work Order to preview.');
    if (!sku) return setValidationError('SKU is required.');
    if (!batchNo) return setValidationError('Batch Number is required.');
    if (mrp <= 0) return setValidationError('MRP must be greater than 0.');
    if (!mfgDate) return setValidationError('Manufacturing Date is required.');
    if (!expiryDate) return setValidationError('Expiry Date is required.');

    if (barcodeType !== 'QR Code' && previewCanvasRef.current) {
      drawBarcode128(previewCanvasRef.current, batchNo || sku || '9031123456789');
    }

    setPreviewNotice(
      `Label preview generated successfully for ${selectedWO.product?.name || sku}!`
    );
    setTimeout(() => setPreviewNotice(null), 4000);

    const previewElement = document.getElementById('label-preview-card');
    if (previewElement) {
      previewElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const printLabels = (job: PrintJob, _template: string, type: string) => {
    let barcodeDataUrl = '';
    if (type !== 'QR Code') {
      const offCanvas = document.createElement('canvas');
      drawBarcode128(offCanvas, job.batchNo || job.sku || '9031123456789');
      barcodeDataUrl = offCanvas.toDataURL('image/png');
    }

    const labelCards: string[] = [];
    const productName = selectedWO?.product?.name || 'Product Name';

    const cardBody = `
      <div class="label-card" style="width: 100mm; height: 50mm; display:flex; flex-direction:column; justify-space-between; padding:10px 14px; font-family:'Segoe UI',Arial,sans-serif; background:#fff; overflow:hidden; page-break-after:always; break-after:page; border:none; box-sizing:border-box;">
        <div style="text-align:center; font-size:18px; font-weight:900; color:#00891D; letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid #e5e7eb; padding-bottom:6px; margin-bottom:0;">
          VILLAGKART RETAIL
        </div>
        <div style="text-align:center; font-size:13px; font-weight:700; color:#111827; margin-bottom:0; margin-top:4px;">
          ${productName}
        </div>
        <div style="font-size:10px; color:#111827; line-height:1.4; padding:0 8%; flex-grow:1; display:flex; flex-direction:column; justify-content:center; margin:2px 0;">
          <div style="display:flex; justify-content:space-between;">
            <span>SKU: <b>${job.sku}</b></span>
            <span>Batch: <b>${job.batchNo}</b></span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Lot: <b>${lotNo || 'N/A'}</b></span>
            <span>MRP: <b>₹${mrp || 0}.00</b></span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>MFG: ${mfgDate}</span>
            <span>EXP: ${expiryDate}</span>
          </div>
        </div>
        <div style="border-top:1px solid #e5e7eb; padding-top:6px; margin-top:auto;">
          ${
            type !== 'QR Code'
              ? `<img src="${barcodeDataUrl}" style="width:100%; height:28px; image-rendering:pixelated; display:block;" alt="barcode" />`
              : `<div style="display:flex;justify-content:center;"><img src="${qrCodeUrl}" style="width:35px;height:35px;" alt="QR" /></div>`
          }
        </div>
      </div>
    `;

    for (let i = 0; i < job.printedQty; i++) {
      labelCards.push(cardBody);
    }
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      document.body.removeChild(iframe);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            @page { size: 100mm 50mm; margin: 0; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background: #fff;
              width: 100mm;
            }
            .label-grid { display: block; }
            @media print { body { background: #fff; } }
          </style>
        </head>
        <body>
          <div class="label-grid">${labelCards.join('')}</div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() { 
                  if (window.frameElement && window.frameElement.parentNode) {
                    window.frameElement.parentNode.removeChild(window.frameElement);
                  }
                }, 500);
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrint = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setValidationError('');
    setSuccessBanner(null);
    setPreviewNotice(null);

    if (!selectedWO) {
      setValidationError('Please select a Work Order first.');
      return;
    }
    if (printerStatus === 'Offline') {
      setValidationError('Printer is Offline. Please check printer connection.');
      return;
    }
    if (!batchNo) {
      setValidationError('Batch Number is required.');
      return;
    }
    if (mrp <= 0) {
      setValidationError('MRP must be configured (> 0).');
      return;
    }
    if (!mfgDate) {
      setValidationError('Manufacturing Date is required.');
      return;
    }
    if (!expiryDate) {
      setValidationError('Expiry Date is required.');
      return;
    }
    if (printQty <= 0) {
      setValidationError('Print quantity must be greater than 0.');
      return;
    }

    const operator = operators.find((o) => o.id === assignedOperatorId);
    let createdJob: PrintJob | null = null;

    try {
      const res = await barcodeService.printLabels({
        workOrderId: selectedWO.id,
        batchNumber: batchNo,
        barcodeType,
        printedQty: printQty,
        operatorId: assignedOperatorId,
        printer: selectedPrinter,
        labelTemplate,
      });

      if (res && res.data) {
        createdJob = {
          id: res.data.id || `PRT-${Math.floor(100 + Math.random() * 900)}`,
          woNo: res.data.woNo || selectedWO.woNumber,
          sku: res.data.sku || sku,
          batchNo: res.data.batchNo || batchNo,
          printedQty: res.data.printedQty || printQty,
          printer: selectedPrinter,
          timestamp: res.data.timestamp || new Date().toISOString(),
          printedBy: res.data.printedBy || selectedWO.supervisor?.name || 'Admin Manager',
          status: 'Printed',
          assignedOperator: operator ? operator.name : 'Assigned Operator',
        };
      }
    } catch (err) {
      console.error('Print API call error, using local fallback:', err);
    }

    if (!createdJob) {
      createdJob = {
        id: `PRT-${Math.floor(100 + Math.random() * 900)}`,
        woNo: selectedWO.woNumber,
        sku,
        batchNo,
        printedQty: printQty,
        printer: selectedPrinter,
        timestamp: new Date().toISOString(),
        printedBy: selectedWO.supervisor?.name || 'Admin Manager',
        status: 'Printed',
        assignedOperator: operator ? operator.name : 'Assigned Operator',
      };
    }

    setHistory((prev) => {
      const updated = filterHistoryFor24h([createdJob!, ...prev]);
      localStorage.setItem('reprint_history_logs_24h', JSON.stringify(updated));
      return updated;
    });
    setLabelsPrinted((prev) => prev + printQty);

    setSuccessBanner({
      totalPrinted: printQty,
      timestamp: new Date(createdJob.timestamp).toLocaleString(),
      printer: selectedPrinter,
      jobId: createdJob.id,
    });

    // Update Work Order status to LABEL_APPLICATION_ASSIGNED
    try {
      await workOrderService.updateWorkOrderStatus(selectedWO.id, 'LABEL_APPLICATION_ASSIGNED', {
        labelsPrinted: printQty,
        operatorId: assignedOperatorId,
      });
      fetchWorkOrders();
    } catch (err) {
      console.error('Failed to update work order status via API:', err);
    }

    // Trigger Print
    printLabels(createdJob, labelTemplate, barcodeType);
  };

  const handleReprint = async (job: PrintJob) => {
    const reason = prompt('Please enter the reprint reason:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Reprint reason is required.');
      return;
    }

    let reprintJob: PrintJob | null = null;

    try {
      const res = await barcodeService.reprintLabels({
        jobId: job.id,
        reprintReason: reason,
        printedQty: job.printedQty,
      });

      if (res && res.data) {
        reprintJob = {
          ...job,
          id: res.data.id || `PRT-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: res.data.timestamp || new Date().toISOString(),
          status: 'Reprinted',
          reprintReason: reason,
        };
      }
    } catch (err) {
      console.error('Reprint API call error, using local fallback:', err);
    }

    if (!reprintJob) {
      reprintJob = {
        ...job,
        id: `PRT-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        status: 'Reprinted',
        reprintReason: reason,
      };
    }

    setHistory((prev) => {
      const updated = filterHistoryFor24h([reprintJob!, ...prev]);
      localStorage.setItem('reprint_history_logs_24h', JSON.stringify(updated));
      return updated;
    });

    setSuccessBanner({
      totalPrinted: job.printedQty,
      timestamp: new Date(reprintJob.timestamp).toLocaleString(),
      printer: job.printer,
      jobId: reprintJob.id,
    });

    printLabels(reprintJob, labelTemplate, barcodeType);
  };

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Top Section: Selector & Header */}
      <div className="bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-slate-100 dark:border-gray-700 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              Barcode & Label Generation
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-400">
              Select a completed work order to generate and print product labels.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-sm bg-slate-50 dark:bg-gray-900 text-slate-800 dark:text-white focus:ring-1 focus:ring-[#00891D]"
              value={selectedWO?.id || ''}
              onChange={(e) => {
                const wo = selectableWOs.find((w) => w.id === e.target.value);
                if (wo) setSelectedWO(wo);
              }}
            >
              {selectableWOs.length === 0 && (
                <option value="">No packed products available for label printing</option>
              )}
              {selectableWOs.map((w) => (
                <option key={w.id} value={w.id} className="dark:bg-gray-800">
                  {w.woNumber} - {w.product?.name || 'Product'} ({w.status.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                fetchWorkOrders();
                fetchPrintHistory();
              }}
              title="Refresh Data"
              className="p-2 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {selectedWO && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl text-xs border border-slate-200 dark:border-gray-700">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Work Order Number
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-white">
                {selectedWO.woNumber}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Product Name
              </span>
              <span className="font-semibold text-slate-800 dark:text-white truncate block">
                {selectedWO.product?.name || '-'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Product BOM
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-white truncate block">
                {selectedWO.recipe?.code || selectedWO.recipeId}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Batch Number
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-white">
                {batchNo || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Packed Quantity
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {selectedWO.actualProduced || selectedWO.requiredQty} Units
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Packing Status
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 whitespace-nowrap">
                {selectedWO.status}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Workflow Status
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                {selectedWO.status === 'LABELS_APPLIED'
                  ? 'Labels Applied'
                  : selectedWO.status === 'LABEL_APPLICATION_IN_PROGRESS'
                  ? 'Application In Progress'
                  : selectedWO.status === 'LABEL_APPLICATION_ASSIGNED'
                  ? 'Application Assigned'
                  : 'Pending Printing'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Completion Success Banner */}
      {successBanner && (
        <div className="bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900/30 text-green-800 dark:text-green-400 p-4 rounded-xl flex items-start gap-3">
          <CheckCircle className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" size={18} />
          <div className="text-xs space-y-1">
            <span className="font-bold text-sm block">Labels Generated Successfully</span>
            <div>
              <span className="font-medium text-slate-500 dark:text-gray-400">Total Labels Printed:</span>{' '}
              <span className="font-bold text-slate-800 dark:text-gray-200">{successBanner.totalPrinted} units</span>
            </div>
            <div>
              <span className="font-medium text-slate-500 dark:text-gray-400">Print Timestamp:</span>{' '}
              <span className="font-bold text-slate-800 dark:text-gray-200">{successBanner.timestamp}</span>
            </div>
            <div>
              <span className="font-medium text-slate-500 dark:text-gray-400">Printer Used:</span>{' '}
              <span className="font-bold text-slate-800 dark:text-gray-200">{successBanner.printer}</span>
            </div>
            <div>
              <span className="font-medium text-slate-500 dark:text-gray-400">Print Job ID:</span>{' '}
              <span className="font-bold text-slate-800 dark:text-gray-200 font-mono">{successBanner.jobId}</span>
            </div>
          </div>
        </div>
      )}

      {/* Preview Notice */}
      {previewNotice && (
        <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30 text-blue-800 dark:text-blue-400 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />
          <span className="text-xs font-bold">{previewNotice}</span>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0" size={18} />
          <span className="text-xs font-bold">{validationError}</span>
        </div>
      )}

      {/* Three Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-1 bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-gray-200 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-gray-700 pb-3">
            <Printer size={18} className="text-[#00891D]" />
            <span>Label Configuration</span>
          </h3>

          <div className="space-y-4">
            {/* Operator Assignment */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-3 rounded-lg space-y-3">
              <h4 className="font-bold text-indigo-800 dark:text-indigo-400 text-xs flex items-center gap-1.5 border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                <UserCheck size={14} />
                <span>Label Application Assignment</span>
              </h4>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                    Assign To Operator *
                  </label>
                  <select
                    className="w-full p-2 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500"
                    value={assignedOperatorId}
                    onChange={(e) => setAssignedOperatorId(e.target.value)}
                  >
                    <option value="" disabled className="dark:bg-gray-800">
                      Select Operator...
                    </option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id} className="dark:bg-gray-800">
                        {op.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Target Printer selection */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Target Printer
                </label>
                <select
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-slate-50 dark:bg-gray-900 text-slate-800 dark:text-gray-200 focus:ring-1 focus:ring-[#00891D]"
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                >
                  {PRINTERS.map((p) => (
                    <option key={p} value={p} className="dark:bg-gray-800">
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  Printer Status
                </label>
                <div
                  onClick={() => setPrinterStatus((p) => (p === 'Online' ? 'Offline' : 'Online'))}
                  className={`w-full p-2 border rounded-lg text-xs font-bold text-center select-none cursor-pointer transition-colors ${
                    printerStatus === 'Online'
                      ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30'
                      : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                  }`}
                  title="Click to toggle printer status"
                >
                  {printerStatus === 'Online' ? '🟢 Printer Online' : '🔴 Printer Offline'}
                </div>
              </div>
            </div>

            {/* Label Template & Barcode Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Label Template
                </label>
                <select
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-slate-50 dark:bg-gray-900 text-slate-800 dark:text-gray-200 focus:ring-1 focus:ring-[#00891D]"
                  value={labelTemplate}
                  onChange={(e: any) => setLabelTemplate(e.target.value)}
                >
                  <option value="Retail Label" className="dark:bg-gray-800">Retail Label</option>
                  <option value="Bulk Label" className="dark:bg-gray-800">Bulk Label</option>
                  <option value="Export Label" className="dark:bg-gray-800">Export Label</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Barcode Type
                </label>
                <select
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-slate-50 dark:bg-gray-900 text-slate-800 dark:text-gray-200 focus:ring-1 focus:ring-[#00891D]"
                  value={barcodeType}
                  onChange={(e: any) => setBarcodeType(e.target.value)}
                >
                  <option value="Code 128" className="dark:bg-gray-800">Code 128</option>
                  <option value="EAN-13" className="dark:bg-gray-800">EAN-13</option>
                  <option value="QR Code" className="dark:bg-gray-800">QR Code</option>
                  <option value="GS1-128" className="dark:bg-gray-800">GS1-128</option>
                </select>
              </div>
            </div>

            {/* SKU and Lot */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-mono bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Lot Number
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-mono bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                />
              </div>
            </div>

            {/* Batch Number */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                required
                className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-mono bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
              />
            </div>

            {/* MRP & Print Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs text-center bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-bold"
                  value={mrp}
                  onChange={(e) => setMrp(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Print Quantity *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs text-center bg-white dark:bg-gray-900 text-slate-800 dark:text-white font-bold text-[#00891D]"
                  value={printQty}
                  onChange={(e) => setPrintQty(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Mfg & Expiry Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Mfg Date *
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleGeneratePreview}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 border border-slate-200 dark:border-gray-600 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Generate Preview</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={printerStatus === 'Offline'}
                className="w-full bg-[#00891D] hover:bg-[#00891D]/90 disabled:bg-rose-50 disabled:text-rose-450 disabled:border disabled:border-rose-100 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={14} />
                <span>Generate & Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: Label Preview */}
        <div
          id="label-preview-card"
          className="lg:col-span-1 bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
        >
          <div>
            <h3 className="font-bold text-slate-800 dark:text-gray-200 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-gray-700 pb-3 mb-4">
              <Barcode size={18} className="text-[#00891D]" />
              <span>Label Preview Template</span>
            </h3>

            {/* Label preview */}
            <div
              style={{
                background: '#fff',
                border: '1.5px solid #d1d5db',
                borderRadius: 12,
                padding: '14px 18px',
                maxWidth: 380,
                margin: '0 auto',
                fontFamily: "'Segoe UI', Arial, sans-serif",
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 220,
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#00891D',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  borderBottom: '1.5px solid #e5e7eb',
                  paddingBottom: 8,
                  marginBottom: 0,
                }}
              >
                VILLAGKART RETAIL
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 0,
                  marginTop: 6,
                }}
              >
                {selectedWO?.product?.name || 'Select a Work Order'}
              </div>

              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#111827',
                  padding: '0 8%',
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  margin: '4px 0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    SKU: <b>{sku || '—'}</b>
                  </span>
                  <span>
                    Batch:{' '}
                    <b style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {batchNo || '—'}
                    </b>
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    Lot: <b style={{ fontFamily: 'monospace' }}>{lotNo || '—'}</b>
                  </span>
                  <span>
                    MRP: <b>₹{mrp || 0}.00</b>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#374151',
                  }}
                >
                  <span>MFG: {mfgDate || 'YYYY-MM-DD'}</span>
                  <span>EXP: {expiryDate || 'YYYY-MM-DD'}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 'auto', paddingTop: 8 }}>
                {barcodeType !== 'QR Code' ? (
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      width: '100%',
                      height: 72,
                      display: 'block',
                      imageRendering: 'pixelated',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <img src={qrCodeUrl} style={{ width: 80, height: 80 }} alt="QR" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Print Summary Card */}
          <div className="bg-slate-50 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-700 p-4 rounded-xl text-xs space-y-2">
            <span className="font-bold text-slate-500 dark:text-gray-400 block uppercase text-[10px] tracking-wider">
              Print Summary
            </span>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Required
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">
                  {labelsRequired}
                </span>
              </div>
              <div className="border-x border-slate-200 dark:border-gray-700">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Printed
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {labelsPrinted}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Remaining
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">
                  {Math.max(0, labelsRequired - labelsPrinted)}
                </span>
              </div>
            </div>
          </div>

          {/* Label Application Progress Card */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-xl text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-indigo-800 dark:text-indigo-400 block uppercase text-[10px] tracking-wider">
                Application Task Progress
              </span>
              <span className="text-[9px] text-indigo-500 font-medium">Auto-updating</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center pt-1 mb-2">
              <div className="bg-white dark:bg-gray-900 p-2 rounded border border-indigo-50 dark:border-indigo-900/50">
                <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-semibold">
                  Assigned Operator
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white truncate block">
                  {operators.find((o) => o.id === assignedOperatorId)?.name || 'Not Assigned'}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2 rounded border border-indigo-50 dark:border-indigo-900/50">
                <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-semibold">
                  Current Status
                </span>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block">
                  {selectedWO?.status === 'LABELS_APPLIED'
                    ? 'Complete'
                    : selectedWO?.status === 'LABEL_APPLICATION_IN_PROGRESS'
                    ? 'In Progress'
                    : 'Assigned'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-indigo-100 dark:border-indigo-900/50 mt-2">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-semibold">
                  Printed
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">
                  {labelsPrinted}
                </span>
              </div>
              <div className="border-x border-indigo-100 dark:border-indigo-900/50">
                <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-semibold">
                  Applied
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedWO?.labelsApplied || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-semibold">
                  Remaining
                </span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {Math.max(0, labelsPrinted - (selectedWO?.labelsApplied || 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Print History & Logs */}
        <div className="lg:col-span-1 bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-gray-700 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-gray-200 text-sm flex items-center gap-2">
              <ClipboardList size={18} className="text-slate-500" />
              <span>Reprint History & Logs</span>
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <Clock size={10} /> 24h Window
            </span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="text-center text-slate-400 dark:text-gray-500 py-8 text-xs">
                No print jobs in the last 24 hours.
              </div>
            ) : (
              history.map((job) => (
                <div
                  key={job.id}
                  className="p-3 border border-slate-200 dark:border-gray-700 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700/30 text-xs space-y-1.5 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-slate-500 dark:text-gray-400">
                      {job.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        job.status === 'Reprinted'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-slate-600 dark:text-gray-300 text-[11px]">
                    <div>
                      <span className="text-slate-400">WO:</span>{' '}
                      <span className="font-medium">{job.woNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">SKU:</span>{' '}
                      <span className="font-medium">{job.sku}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Batch:</span>{' '}
                      <span className="font-mono">{job.batchNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Printed:</span>{' '}
                      <span className="font-bold">{job.printedQty} labels</span>
                    </div>
                    <div>
                      <span className="text-slate-400">By:</span>{' '}
                      <span className="font-medium">{job.printedBy}</span>
                    </div>
                    <div className="col-span-2 mt-1">
                      <span className="text-slate-400">Assigned To:</span>{' '}
                      <span className="font-bold text-indigo-700 dark:text-indigo-400">
                        {job.assignedOperator || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {job.reprintReason && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-100 dark:border-amber-900/30 text-[10px] text-amber-800 dark:text-amber-300 mt-1.5 font-medium">
                      <span className="font-bold">Reason:</span> {job.reprintReason}
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-gray-700 pt-2 mt-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(job.timestamp).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleReprint(job)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      title="Reprint Job"
                    >
                      <RefreshCw size={11} />
                      <span>Reprint</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingBarcodesLabels;
