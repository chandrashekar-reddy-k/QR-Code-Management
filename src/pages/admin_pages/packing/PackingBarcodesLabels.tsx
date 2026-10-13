import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer, RefreshCw, Barcode, ClipboardList, CheckCircle, AlertTriangle, UserCheck, Clock } from 'lucide-react';
import { authService, User } from '../../../api/packing/authService';
import { workOrderService, WorkOrder, WoStatus } from '../../../api/packing/workOrderService';
import { barcodeService } from '../../../api/packing/barcodeService';

const DEFAULT_PRINTERS = [
  'Zebra ZD420 (Thermal Roll)',
  'HP LaserJet Tank (Office Sheet)',
  'TSC TE244 (Thermal Roll)',
  'Brother TD-4420DN',
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

// Deterministic 13-digit barcode generator from SKU
const generateBarcodeFromSKU = (sku: string): string => {
  if (!sku) return '8901234567890';
  let hash = 5381;
  for (let i = 0; i < sku.length; i++) {
    hash = ((hash << 5) + hash) + sku.charCodeAt(i);
  }
  let result = '890'; // Prefix (e.g., India GS1)
  let seed = Math.abs(hash);
  for (let i = 0; i < 9; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    result += Math.floor((seed / 233280) * 10).toString();
  }
  
  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(result[i]);
    if (i % 2 === 0) oddSum += digit;
    else evenSum += digit;
  }
  const checksum = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
  return result + checksum.toString();
};

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

  const scale = 2; // crisp 2x module scaling for thermal printing
  const barcodeWidth = bars.reduce((acc, curr) => acc + curr, 0) * scale;

  canvas.width = barcodeWidth + 24;
  canvas.height = 70;
  
  const barcodeHeight = 48;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let x = (canvas.width - barcodeWidth) / 2;
  let isBar = true;

  bars.forEach((width) => {
    const w = width * scale;
    if (isBar) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, 0, w, barcodeHeight);
    }
    x += w;
    isBar = !isBar;
  });

  // Draw text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, barcodeHeight + 15);
};

export interface WOProductItem {
  id?: string;
  name: string;
  sku?: string;
  batch?: string;
  mrp?: number;
  qty?: number;
  printUnits?: number;
  uom?: string;
}

const getWOProducts = (wo: any): WOProductItem[] => {
  if (!wo) return [];
  const list: WOProductItem[] = [];
  const seenNames = new Set<string>();

  const addProduct = (item: WOProductItem) => {
    if (item.name && item.name.trim() && !seenNames.has(item.name.trim().toLowerCase())) {
      seenNames.add(item.name.trim().toLowerCase());
      list.push({
        ...item,
        name: item.name.trim(),
      });
    }
  };

  // 1. Check outputAllocations FIRST (Target packed products generated for labeling)
  if (Array.isArray(wo.outputAllocations) && wo.outputAllocations.length > 0) {
    wo.outputAllocations.forEach((item: any, idx: number) => {
      const name = item.skuName || item.sourceProductName || item.name;

      // Calculate total weight / quantity in KG (e.g. 2 units * 26 kg = 52 KG)
      const totalQtyVal =
        item.totalQtyKg !== undefined && item.totalQtyKg !== null
          ? Number(item.totalQtyKg)
          : item.plannedUnits && item.packSizeKg
          ? Number(item.plannedUnits) * Number(item.packSizeKg)
          : item.packedQty ?? item.actualProduced ?? item.plannedUnits ?? item.quantity ?? item.qty;

      // Extract unit (e.g. "KG", "P", "Units") from packSizeText like "26 KG" or uom
      const parts = item.packSizeText ? item.packSizeText.trim().split(/\s+/) : [];
      const extractedUnit = parts.length > 1 ? parts.slice(1).join(' ') : (item.uom || 'KG');

      const packedUnitsVal = (item.packedUnits !== '' && item.packedUnits !== null && item.packedUnits !== undefined) ? Number(item.packedUnits) : NaN;
      const printUnitsCount = (!isNaN(packedUnitsVal) && packedUnitsVal > 0) ? packedUnitsVal : (Number(item.plannedUnits) || undefined);

      const skuCode =
        item.sku ||
        item.skuCode ||
        item.code ||
        item.sourceProductSku ||
        (Array.isArray(wo.sourceItems) && wo.sourceItems[idx]?.sku) ||
        wo.product?.sku ||
        '';

      if (name) {
        addProduct({
          id: item.sourceProductId || `out-${idx}`,
          name,
          sku: skuCode,
          batch: item.batch || item.batchNo || wo.batchNumber,
          mrp: item.mrp || (wo.product as any)?.mrp || 60,
          qty: totalQtyVal !== undefined ? Number(totalQtyVal) || totalQtyVal : undefined,
          printUnits: printUnitsCount,
          uom: extractedUnit,
        });
      }
    });
    if (list.length > 0) return list;
  }

  // 2. Otherwise check sourceItems (STRICTLY WITHOUT raw stock availableQty)
  if (Array.isArray(wo.sourceItems) && wo.sourceItems.length > 0) {
    wo.sourceItems.forEach((item: any, idx: number) => {
      const name = item.product || item.productName || item.name;
      // Strictly ONLY packed quantity fields (NEVER availableQty!)
      const packedQtyVal =
        item.packedQty ??
        item.packedUnits ??
        item.actualProduced ??
        item.producedQty ??
        item.packed;

      const skuCode = item.sku || item.skuCode || item.code || wo.product?.sku || '';

      if (name) {
        addProduct({
          id: item.id || item.productId || `src-${idx}`,
          name,
          sku: skuCode,
          batch: item.batch || item.batchNo || wo.batchNumber,
          mrp: item.mrp || (wo.product as any)?.mrp || 60,
          qty: packedQtyVal !== undefined ? Number(packedQtyVal) || packedQtyVal : undefined,
          uom: item.uom || 'Units',
        });
      }
    });
    if (list.length > 0) return list;
  }

  // 3. Otherwise check items array
  if (Array.isArray(wo.items) && wo.items.length > 0) {
    wo.items.forEach((item: any, idx: number) => {
      const name = item.product || item.productName || item.name || item.sku;
      if (name) {
        addProduct({
          id: item.id || `item-${idx}`,
          name,
          sku: item.sku || wo.product?.sku || '',
          mrp: item.mrp || (wo.product as any)?.mrp || 60,
        });
      }
    });
    if (list.length > 0) return list;
  }

  // 4. Otherwise check products array
  if (Array.isArray(wo.products) && wo.products.length > 0) {
    wo.products.forEach((item: any, idx: number) => {
      const name = typeof item === 'string' ? item : item.name || item.product;
      if (name) {
        addProduct({
          id: item.id || `prod-${idx}`,
          name,
          sku: item.sku || wo.product?.sku || '',
          mrp: item.mrp || (wo.product as any)?.mrp || 60,
        });
      }
    });
    if (list.length > 0) return list;
  }

  // 5. Fallback to main product
  if (wo.product?.name) {
    addProduct({
      id: wo.product.id || wo.productId,
      name: wo.product.name,
      sku: wo.product.sku || '',
      mrp: (wo.product as any)?.mrp || 60,
    });
  }

  if (list.length === 0) {
    list.push({
      name: wo.product?.name || 'Product',
      sku: wo.product?.sku || 'SKU-SM500',
      mrp: (wo.product as any)?.mrp || 60,
    });
  }

  return list;
};

export const PackingBarcodesLabels: React.FC = () => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(0);

  const woProducts = useMemo(() => getWOProducts(selectedWO), [selectedWO]);
  const currentProductItem = woProducts[selectedProductIndex] || woProducts[0];
  const selectedProductName = currentProductItem?.name || selectedWO?.product?.name || 'Product';

  // Printer Status State
  const [printerStatus, setPrinterStatus] = useState<'Online' | 'Offline'>('Online');

  // Operators for Assignment
  const [operators, setOperators] = useState<User[]>([]);
  const [assignedOperatorId, setAssignedOperatorId] = useState<string>('');

  // Dynamic Printers State (persisted in localStorage)
  const [printersList, setPrintersList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom_printers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved printers:', e);
    }
    return DEFAULT_PRINTERS;
  });
  const [selectedPrinter, setSelectedPrinter] = useState<string>(printersList[0] || DEFAULT_PRINTERS[0]);
  const [isAddingPrinter, setIsAddingPrinter] = useState<boolean>(false);
  const [newPrinterName, setNewPrinterName] = useState<string>('');
  const [labelTemplate, setLabelTemplate] = useState<'Retail Label' | 'Bulk Label' | 'Export Label'>('Retail Label');
  const [barcodeType, setBarcodeType] = useState<'Code 128' | 'EAN-13' | 'QR Code' | 'GS1-128'>('Code 128');

  // Media Stock & Dimensions Configuration
  // '2col_roll' = Continuous 2-column roll (Zebra ZD420 default: 104mm roll, 50x25mm labels, 0mm col gap, 2mm side margins, 31mm pitch)
  // '1col_roll' = Continuous 1-column roll
  // 'a4_sheet' = Multi-label A4 sheet (HP LaserJet: 8 labels per sheet)
  // 'custom' = Custom dimensions
  const [mediaPreset, setMediaPreset] = useState<'2col_roll' | '1col_roll' | 'a4_sheet' | 'custom'>('2col_roll');
  const [labelWidthMm, setLabelWidthMm] = useState<number>(50);
  const [labelHeightMm, setLabelHeightMm] = useState<number>(25);
  const [colGapMm, setColGapMm] = useState<number>(0);
  const [rowGapMm, setRowGapMm] = useState<number>(6);
  const [sideMarginMm, setSideMarginMm] = useState<number>(2);

  // Synchronize preset changes
  const handleMediaPresetChange = (preset: '2col_roll' | '1col_roll' | 'a4_sheet' | 'custom') => {
    setMediaPreset(preset);
    if (preset === '2col_roll') {
      setLabelWidthMm(50);
      setLabelHeightMm(25);
      setColGapMm(0);
      setRowGapMm(6);
      setSideMarginMm(2);
    } else if (preset === '1col_roll') {
      setLabelWidthMm(50);
      setLabelHeightMm(25);
      setColGapMm(0);
      setRowGapMm(6);
      setSideMarginMm(2);
    } else if (preset === 'a4_sheet') {
      setLabelWidthMm(48);
      setLabelHeightMm(25);
      setColGapMm(2);
      setRowGapMm(2);
      setSideMarginMm(5);
    }
  };

  // Total printable page width and feed height in mm
  const rollWidthMm = useMemo(() => {
    if (mediaPreset === 'a4_sheet') return 210; // A4 standard width (210mm)
    if (mediaPreset === '1col_roll') return labelWidthMm + (sideMarginMm * 2);
    // 2-column continuous roll: sideMargin + labelWidth + colGap + labelWidth + sideMargin (2 + 50 + 0 + 50 + 2 = 104mm backing width)
    return (labelWidthMm * 2) + colGapMm + (sideMarginMm * 2);
  }, [mediaPreset, labelWidthMm, colGapMm, sideMarginMm]);

  const rowFeedHeightMm = useMemo(() => {
    if (mediaPreset === 'a4_sheet') return 297; // A4 standard height (297mm)
    return labelHeightMm + rowGapMm;
  }, [mediaPreset, labelHeightMm, rowGapMm]);

  const activeWidthMm = labelWidthMm;
  const activeHeightMm = labelHeightMm;

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

  // Track printed product indices for multi-product work orders
  const [printedProductIndexesMap, setPrintedProductIndexesMap] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem('printed_product_indexes_map');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Error loading printed product indexes map:', e);
    }
    return {};
  });

  const savePrintedProductIndexesMap = (updatedMap: Record<string, number[]>) => {
    setPrintedProductIndexesMap(updatedMap);
    try {
      localStorage.setItem('printed_product_indexes_map', JSON.stringify(updatedMap));
    } catch (e) {
      console.error('Error saving printed product indexes map:', e);
    }
  };

  // History state (24-hour window)
  const [history, setHistory] = useState<PrintJob[]>([]);
  const [labelsPrinted, setLabelsPrinted] = useState(0);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    (selectedWO?.product as any)?.barcode || generateBarcodeFromSKU(sku)
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

  // Filter to eligible label work orders (Only work orders with PACKING_COMPLETED or REPACKING_COMPLETED status)
  const selectableWOs = useMemo(() => {
    const eligibleStatuses: WoStatus[] = [
      'PACKING_COMPLETED',   // Standard packing completed flow
      'REPACKING_COMPLETED', // Repacking completed flow requiring relabeling
    ];
    return workOrders.filter((w) => eligibleStatuses.includes(w.status));
  }, [workOrders]);

  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const targetId = id || searchParams.get('wo') || searchParams.get('id') || searchParams.get('woId');

  // Sync initial selection & updates
  useEffect(() => {
    if (targetId && workOrders.length > 0) {
      const found = workOrders.find((w) => w.id === targetId || w.woNumber === targetId);
      if (found) {
        setSelectedWO(found);
        return;
      }
    }
    if (selectableWOs.length > 0 && !selectedWO) {
      setSelectedWO(selectableWOs[0]);
    } else if (selectedWO) {
      const updated = workOrders.find((w) => w.id === selectedWO.id);
      if (updated) {
        setSelectedWO(updated);
      }
    }
  }, [targetId, selectableWOs, selectedWO, workOrders]);

  // Reset selected product index when selectedWO changes
  useEffect(() => {
    setSelectedProductIndex(0);
  }, [selectedWO?.id]);

  // Sync inputs when selected WO or selected product index changes
  useEffect(() => {
    if (selectedWO) {
      const curProd = woProducts[selectedProductIndex] || woProducts[0];
      const recipe = selectedWO.recipe;
      const product = selectedWO.product;

      setSku(curProd?.sku || product?.sku || recipe?.code || 'SKU-SM500');
      setBatchNo(curProd?.batch || selectedWO.batchNumber || `BATCH-${selectedWO.woNumber}`);
      setLotNo(`LOT-${selectedWO.woNumber}`);
      setMrp(curProd?.mrp || (product as any)?.mrp || 60);

      const reqCount = curProd?.qty || selectedWO.actualProduced || selectedWO.requiredQty;
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
  }, [selectedWO, selectedProductIndex, woProducts]);

  // Draw barcode on preview canvas
  useEffect(() => {
    if (barcodeType !== 'QR Code' && previewCanvasRef.current) {
      drawBarcode128(previewCanvasRef.current, (selectedWO?.product as any)?.barcode || generateBarcodeFromSKU(sku));
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
      drawBarcode128(previewCanvasRef.current, (selectedWO?.product as any)?.barcode || generateBarcodeFromSKU(sku));
    }

    setPreviewNotice(
      `Label preview generated successfully for ${selectedProductName || sku}!`
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
      drawBarcode128(offCanvas, (selectedWO?.product as any)?.barcode || generateBarcodeFromSKU(job.sku));
      barcodeDataUrl = offCanvas.toDataURL('image/png');
    }

    const productName = selectedProductName || selectedWO?.product?.name || 'Product Name';

    // Solid monochrome label card template for crisp thermal and laser printing
    const singleLabelCard = `
      <div class="label-card" style="width: ${labelWidthMm}mm; height: ${labelHeightMm}mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; padding: 1.5mm 2.2mm; font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; color: #000000; overflow: hidden; border: none;">
        <div style="text-align: center; font-size: 10px; font-weight: 900; color: #000000; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 1px; margin-bottom: 1px; line-height: 1.1;">
          VILLAGKART RETAIL
        </div>
        <div style="text-align: center; font-size: 9.5px; font-weight: 700; color: #000000; margin: 0; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${productName}
        </div>
        <div style="font-size: 6.8px; font-weight: 600; color: #000000; line-height: 1.25; margin: 1px 0; display: flex; flex-direction: column; justify-content: center; gap: 0.5px;">
          <div style="display: flex; justify-content: space-between; gap: 2px; white-space: nowrap; overflow: hidden;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 48%;">SKU: <b>${job.sku}</b></span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 52%; text-align: right;">Batch: <b>${job.batchNo}</b></span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 2px; white-space: nowrap; overflow: hidden;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">Lot: <b>${lotNo || 'N/A'}</b></span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 35%; text-align: right;">MRP: <b>₹${mrp || 0}.00</b></span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 2px; white-space: nowrap; overflow: hidden;">
            <span style="white-space: nowrap;">MFG: ${mfgDate}</span>
            <span style="white-space: nowrap; text-align: right;">EXP: ${expiryDate}</span>
          </div>
        </div>
        <div style="border-top: 1px solid #000000; padding-top: 1px; margin-top: auto;">
          ${
            type !== 'QR Code'
              ? `<div style="display: flex; justify-content: center; width: 100%;"><img src="${barcodeDataUrl}" style="max-width: 100%; height: 17px; image-rendering: pixelated; display: block;" alt="barcode" /></div>`
              : `<div style="display: flex; justify-content: center;"><img src="${qrCodeUrl}" style="width: 20px; height: 20px; display: block;" alt="QR" /></div>`
          }
        </div>
      </div>
    `;

    const emptySpacerCard = `
      <div class="label-card label-card-empty" style="width: ${labelWidthMm}mm; height: ${labelHeightMm}mm; box-sizing: border-box; visibility: hidden;"></div>
    `;

    let generatedPagesHtml = '';

    if (mediaPreset === '2col_roll' || mediaPreset === 'custom') {
      // 2 labels per row feed across the continuous roll
      const totalRows = Math.ceil(job.printedQty / 2);
      const rowElements: string[] = [];
      for (let r = 0; r < totalRows; r++) {
        const leftIdx = r * 2;
        const rightIdx = leftIdx + 1;
        const leftLabel = singleLabelCard;
        const rightLabel = rightIdx < job.printedQty ? singleLabelCard : emptySpacerCard;
        rowElements.push(`
          <div class="label-row-feed">
            ${leftLabel}
            ${rightLabel}
          </div>
        `);
      }
      generatedPagesHtml = rowElements.join('');
    } else if (mediaPreset === '1col_roll') {
      // 1 label per row feed
      const rowElements: string[] = [];
      for (let i = 0; i < job.printedQty; i++) {
        rowElements.push(`
          <div class="label-row-feed">
            ${singleLabelCard}
          </div>
        `);
      }
      generatedPagesHtml = rowElements.join('');
    } else if (mediaPreset === 'a4_sheet') {
      // A4 Sheet: 8 labels per sheet (4 columns x 2 rows)
      const labelsPerSheet = 8;
      const totalSheets = Math.ceil(job.printedQty / labelsPerSheet);
      const sheetElements: string[] = [];
      for (let s = 0; s < totalSheets; s++) {
        const sheetLabels: string[] = [];
        for (let l = 0; l < labelsPerSheet; l++) {
          const globalIdx = s * labelsPerSheet + l;
          if (globalIdx < job.printedQty) {
            sheetLabels.push(singleLabelCard);
          } else {
            sheetLabels.push(emptySpacerCard);
          }
        }
        sheetElements.push(`
          <div class="label-sheet-page">
            ${sheetLabels.join('')}
          </div>
        `);
      }
      generatedPagesHtml = sheetElements.join('');
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

    const pageCss = mediaPreset === 'a4_sheet'
      ? `
        @page {
          size: A4 portrait;
          margin: 10mm 5mm !important;
        }
        html, body {
          width: 210mm;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .label-sheet-page {
          width: 200mm;
          min-height: 270mm;
          display: grid;
          grid-template-columns: repeat(4, ${labelWidthMm}mm);
          grid-template-rows: repeat(2, ${labelHeightMm}mm);
          gap: ${colGapMm}mm;
          justify-content: center;
          align-content: start;
          page-break-inside: avoid;
          break-inside: avoid;
          box-sizing: border-box;
        }
        .label-sheet-page:not(:last-child) {
          page-break-after: always;
          break-after: page;
        }
      `
      : `
        @page {
          size: ${rollWidthMm}mm ${rowFeedHeightMm}mm;
          margin: 0 !important;
        }
        html, body {
          width: ${rollWidthMm}mm;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .label-row-feed {
          width: ${rollWidthMm}mm;
          height: ${rowFeedHeightMm}mm;
          box-sizing: border-box;
          padding-left: ${sideMarginMm}mm;
          padding-right: ${sideMarginMm}mm;
          padding-top: 0;
          padding-bottom: ${rowGapMm}mm;
          display: grid;
          grid-template-columns: ${mediaPreset === '1col_roll' ? `${labelWidthMm}mm` : `${labelWidthMm}mm ${labelWidthMm}mm`};
          column-gap: ${colGapMm}mm;
          align-items: start;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .label-row-feed:not(:last-child) {
          page-break-after: always;
          break-after: page;
        }
      `;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>VillagKart Label Print Job - ${job.batchNo}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            ${pageCss}
          </style>
        </head>
        <body>
          ${generatedPagesHtml}
          <script>
            window.onload = async function() {
              try {
                const images = Array.from(document.images);
                await Promise.all(
                  images.map(img => {
                    if (img.complete) return Promise.resolve();
                    return img.decode ? img.decode().catch(() => {}) : new Promise(res => {
                      img.onload = res;
                      img.onerror = res;
                    });
                  })
                );
              } catch (e) {}
              setTimeout(function() {
                window.focus();
                window.print();
              }, 60);
            };
            window.onafterprint = function() {
              try {
                if (window.frameElement && window.frameElement.parentNode) {
                  window.frameElement.parentNode.removeChild(window.frameElement);
                }
              } catch (e) {}
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
        labelTemplate: `${labelTemplate} (${activeWidthMm}x${activeHeightMm}mm)`,
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

    // Track printed product indices for multi-product work orders
    const woId = selectedWO.id;
    const currentPrintedIndices = printedProductIndexesMap[woId] || [];
    const updatedPrintedIndices = Array.from(new Set([...currentPrintedIndices, selectedProductIndex]));
    const newMap = { ...printedProductIndexesMap, [woId]: updatedPrintedIndices };
    savePrintedProductIndexesMap(newMap);

    const allProductsPrinted = woProducts.length === 0 || woProducts.every((_, idx) => updatedPrintedIndices.includes(idx));

    if (allProductsPrinted || woProducts.length <= 1) {
      // Update Work Order status to LABEL_APPLICATION_ASSIGNED only after ALL products in WO are printed
      try {
        await workOrderService.updateWorkOrderStatus(selectedWO.id, 'LABEL_APPLICATION_ASSIGNED', {
          labelsPrinted: printQty,
          operatorId: assignedOperatorId,
        });
        fetchWorkOrders();
      } catch (err) {
        console.error('Failed to update work order status via API:', err);
      }
    } else {
      // Find next unprinted product index and automatically switch to it
      const nextIndex = woProducts.findIndex((_, idx) => !updatedPrintedIndices.includes(idx));
      if (nextIndex !== -1) {
        setSelectedProductIndex(nextIndex);
      }
      setPreviewNotice(`Labels printed for Product ${selectedProductIndex + 1} (${selectedProductName}). Active product switched to Product ${nextIndex + 1}.`);
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
      <div className="bg-white border border-slate-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 border-b border-slate-100 dark:border-gray-700 pb-4">
          <div className="min-w-[240px]">
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Barcode & Label Generation
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-400 mt-0.5">
              Select a completed work order to generate and print product labels.
            </p>
          </div>
          <div className="flex items-center gap-2 max-w-full lg:max-w-xl w-full lg:w-auto">
            <div className="flex-1 relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Select Work Order
              </label>
              <select
                className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-gray-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#00891D] truncate"
                value={selectedWO?.id || ''}
                onChange={(e) => {
                  const wo = selectableWOs.find((w) => w.id === e.target.value);
                  if (wo) setSelectedWO(wo);
                }}
              >
                {selectableWOs.length === 0 && (
                  <option value="">No packed products available for label printing</option>
                )}
                {selectableWOs.map((w) => {
                  const prods = getWOProducts(w);
                  const primaryName = prods[0]?.name || 'Product';
                  const extraCount = prods.length - 1;
                  const labelText = extraCount > 0
                    ? `${w.woNumber} — ${primaryName} (+${extraCount} more products) • [${w.status.replace(/_/g, ' ')}]`
                    : `${w.woNumber} — ${primaryName} • [${w.status.replace(/_/g, ' ')}]`;
                  const fullProdList = prods.map((p) => p.name).join(', ');
                  return (
                    <option key={w.id} value={w.id} title={`${w.woNumber} (${fullProdList})`} className="dark:bg-gray-800">
                      {labelText}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              onClick={() => {
                fetchWorkOrders();
                fetchPrintHistory();
              }}
              title="Refresh Work Orders Data"
              className="p-2.5 mt-5 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {selectedWO && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl text-xs border border-slate-200 dark:border-gray-700">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Work Order Number
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-white text-sm">
                {selectedWO.woNumber}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Products Included
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
                {woProducts.length} {woProducts.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-wider mb-1">
                Active Product Name
              </span>
              <span className="font-semibold text-slate-800 dark:text-white truncate block" title={selectedProductName}>
                {selectedProductName}
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
                {currentProductItem?.qty !== undefined
                  ? `${currentProductItem.qty} ${currentProductItem.uom || 'Units'}`
                  : `${printQty || selectedWO.actualProduced || selectedWO.requiredQty} Units`}
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
          </div>
        )}
      </div>

      {/* Interactive Visual Product Selector Tab Strip for Multi-Product Work Orders */}
      {selectedWO && woProducts.length > 1 && (
        <div className="bg-white border border-emerald-200 dark:bg-gray-800 dark:border-emerald-900/50 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-gray-700 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00891D] animate-pulse"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-200">
                Work Order Products ({woProducts.length} Included) — Select Target Product to Label:
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Product {selectedProductIndex + 1} of {woProducts.length} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {woProducts.map((prod, idx) => {
              const isActive = selectedProductIndex === idx;
              const isPrinted = (printedProductIndexesMap[selectedWO?.id || ''] || []).includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedProductIndex(idx)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-[#00891D] ring-2 ring-[#00891D]/20 shadow-sm'
                      : 'bg-slate-50 dark:bg-gray-900/40 border-slate-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-[#00891D] text-white'
                          : 'bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300'
                      }`}
                    >
                      Product {idx + 1}
                    </span>
                    {isPrinted ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                        ✓ Printed
                      </span>
                    ) : isActive ? (
                      <span className="text-[10px] font-bold text-[#00891D] dark:text-emerald-400 flex items-center gap-1">
                        ✓ Active for Labeling
                      </span>
                    ) : null}
                  </div>

                  <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 mb-1">
                    {prod.name}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 pt-1.5 border-t border-slate-200/60 dark:border-gray-700/60 mt-1 font-mono">
                    <span>SKU: {prod.sku || 'N/A'}</span>
                    <span>PACKED QTY: {prod.qty !== undefined ? `${prod.qty} ${prod.uom || ''}` : `${selectedWO?.actualProduced || 0} Units`}</span>
                    <span>MRP: ₹{prod.mrp || 60}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

            {/* Active Target Product Summary Badge */}
            {woProducts.length > 1 && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Selected Product for Labeling
                  </span>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block truncate max-w-[200px]" title={selectedProductName}>
                    Product {selectedProductIndex + 1}: {selectedProductName}
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-[#00891D] text-white px-2.5 py-1 rounded-full shrink-0">
                  {selectedProductIndex + 1} of {woProducts.length}
                </span>
              </div>
            )}

            {/* Target Printer selection */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase">
                    Target Printer
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingPrinter((prev) => !prev)}
                    className="text-[10px] font-bold text-[#00891D] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    {isAddingPrinter ? 'Cancel' : '+ Add New'}
                  </button>
                </div>

                {!isAddingPrinter ? (
                  <select
                    className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-slate-50 dark:bg-gray-900 text-slate-800 dark:text-gray-200 focus:ring-1 focus:ring-[#00891D]"
                    value={selectedPrinter}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setIsAddingPrinter(true);
                      } else {
                        const val = e.target.value;
                        setSelectedPrinter(val);
                        if (val.toLowerCase().includes('laser') || val.toLowerCase().includes('hp') || val.toLowerCase().includes('sheet')) {
                          handleMediaPresetChange('a4_sheet');
                        } else if (val.toLowerCase().includes('zebra') || val.toLowerCase().includes('thermal') || val.toLowerCase().includes('roll')) {
                          handleMediaPresetChange('2col_roll');
                        }
                      }
                    }}
                  >
                    {printersList.map((p) => (
                      <option key={p} value={p} className="dark:bg-gray-800">
                        {p}
                      </option>
                    ))}
                    <option value="__ADD_NEW__" className="font-bold text-[#00891D] dark:bg-gray-800">
                      + Add New Printer...
                    </option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Zebra ZD420 (Thermal Roll)"
                      value={newPrinterName}
                      onChange={(e) => setNewPrinterName(e.target.value)}
                      className="w-full p-1.5 border border-[#00891D] rounded-lg text-xs bg-white dark:bg-gray-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newPrinterName.trim();
                        if (trimmed) {
                          if (!printersList.includes(trimmed)) {
                            const updated = [...printersList, trimmed];
                            setPrintersList(updated);
                            localStorage.setItem('custom_printers_list', JSON.stringify(updated));
                            setSelectedPrinter(trimmed);
                          } else {
                            setSelectedPrinter(trimmed);
                          }
                          setNewPrinterName('');
                          setIsAddingPrinter(false);
                        }
                      }}
                      className="bg-[#00891D] hover:bg-[#00891D]/90 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg cursor-pointer shrink-0"
                    >
                      Save
                    </button>
                  </div>
                )}
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

            {/* Explicit Hardware vs Chrome Print Notice */}
            <div className="bg-amber-50/80 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 p-2.5 rounded-lg text-[11px] space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Printer size={13} className="shrink-0 text-amber-700 dark:text-amber-400" />
                <span>Printer Device vs Chrome Destination:</span>
              </div>
              <p className="text-amber-800 dark:text-amber-400 text-[10.5px] leading-tight">
                ERP records <strong>{selectedPrinter}</strong> for audit logs. When Chrome's print dialog opens, ensure <strong>Destination</strong> matches your physical printer, <strong>Scale is 100%</strong>, and <strong>Margins: None</strong>.
              </p>
            </div>

            {/* Media Stock & Layout Configuration */}
            <div className="space-y-2 border border-slate-200 dark:border-gray-700 p-3 rounded-lg bg-slate-50/50 dark:bg-gray-900/30">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase">
                  Media Stock & Layout *
                </label>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {mediaPreset === '2col_roll' ? 'Continuous 2-Up Roll' : mediaPreset === 'a4_sheet' ? 'A4 Sheet (8 Labels)' : mediaPreset === '1col_roll' ? 'Continuous 1-Up Roll' : 'Custom Stock'}
                </span>
              </div>

              <select
                className="w-full p-2 border border-slate-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-200 focus:ring-1 focus:ring-[#00891D] font-medium"
                value={mediaPreset}
                onChange={(e: any) => handleMediaPresetChange(e.target.value)}
              >
                <option value="2col_roll" className="dark:bg-gray-800">
                  Continuous 2-Up Roll (Zebra ZD420 — 50×25 mm × 2 columns, 104 mm Roll, 31 mm Pitch)
                </option>
                <option value="1col_roll" className="dark:bg-gray-800">
                  Continuous 1-Up Roll (Single Column — 50×25 mm)
                </option>
                <option value="a4_sheet" className="dark:bg-gray-800">
                  A4 Paper Sheet (HP LaserJet — 8 labels: 4 cols × 2 rows)
                </option>
                <option value="custom" className="dark:bg-gray-800">
                  Custom Roll / Sheet Dimensions (mm)
                </option>
              </select>

              {/* Millimeter adjustment inputs */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold block mb-0.5">Label W (mm)</span>
                  <input
                    type="number"
                    min={20}
                    max={200}
                    value={labelWidthMm}
                    onChange={(e) => setLabelWidthMm(Number(e.target.value))}
                    className="w-full p-1 border border-slate-200 dark:border-gray-700 rounded text-xs text-center dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold block mb-0.5">Label H (mm)</span>
                  <input
                    type="number"
                    min={15}
                    max={200}
                    value={labelHeightMm}
                    onChange={(e) => setLabelHeightMm(Number(e.target.value))}
                    className="w-full p-1 border border-slate-200 dark:border-gray-700 rounded text-xs text-center dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold block mb-0.5">Col Gap (mm)</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={colGapMm}
                    onChange={(e) => setColGapMm(Number(e.target.value))}
                    className="w-full p-1 border border-slate-200 dark:border-gray-700 rounded text-xs text-center dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold block mb-0.5">Row Gap / Pitch (mm)</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={rowGapMm}
                    onChange={(e) => setRowGapMm(Number(e.target.value))}
                    className="w-full p-1 border border-slate-200 dark:border-gray-700 rounded text-xs text-center dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold block mb-0.5">Side Margin (mm)</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={sideMarginMm}
                    onChange={(e) => setSideMarginMm(Number(e.target.value))}
                    className="w-full p-1 border border-slate-200 dark:border-gray-700 rounded text-xs text-center dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="text-[10.5px] text-[#00891D] font-mono font-semibold pt-1 border-t border-slate-200/60 dark:border-gray-700 flex justify-between items-center">
                <span>Total Width: {rollWidthMm} mm</span>
                <span>Feed Pitch: {rowFeedHeightMm} mm</span>
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
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-700 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-gray-200 text-sm flex items-center gap-2">
                <Barcode size={18} className="text-[#00891D]" />
                <span>Label Preview Template</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-800 bg-slate-100 dark:bg-gray-700 dark:text-gray-200 border border-slate-300 dark:border-gray-600 px-2 py-0.5 rounded-full font-mono">
                {labelWidthMm} × {labelHeightMm} mm ({mediaPreset === '2col_roll' ? '2-Up Roll' : mediaPreset === 'a4_sheet' ? 'A4 Sheet' : '1-Up Roll'})
              </span>
            </div>

            {/* Label preview container */}
            <div
              style={{
                background: '#fff',
                border: '1.5px solid #000000',
                borderRadius: 8,
                padding: activeHeightMm <= 30 ? '10px 14px' : '14px 18px',
                maxWidth: 360,
                width: '100%',
                margin: '0 auto',
                fontFamily: "'Segoe UI', Arial, sans-serif",
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: activeHeightMm <= 30 ? 170 : 220,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  fontSize: activeHeightMm <= 30 ? 14 : 20,
                  fontWeight: 900,
                  color: '#000000',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  borderBottom: '1.5px solid #000000',
                  paddingBottom: activeHeightMm <= 30 ? 4 : 8,
                  marginBottom: 0,
                  lineHeight: 1.1,
                }}
              >
                VILLAGKART RETAIL
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: activeHeightMm <= 30 ? 12 : 15,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 0,
                  marginTop: activeHeightMm <= 30 ? 3 : 6,
                  lineHeight: 1.1,
                }}
              >
                {selectedProductName || selectedWO?.product?.name || 'Select a Work Order'}
              </div>

              <div
                style={{
                  fontSize: activeHeightMm <= 30 ? 10 : 12,
                  lineHeight: activeHeightMm <= 30 ? 1.3 : 1.5,
                  color: '#111827',
                  padding: activeHeightMm <= 30 ? '0 2%' : '0 8%',
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  margin: '4px 0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', fontSize: activeHeightMm <= 30 ? 9 : 10 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '48%' }}>
                    SKU: <b>{sku || '—'}</b>
                  </span>
                  <span style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '52%' }}>
                    Batch:{' '}
                    <b style={{ fontFamily: 'monospace', fontSize: activeHeightMm <= 30 ? 9 : 10 }}>
                      {batchNo || '—'}
                    </b>
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', fontSize: activeHeightMm <= 30 ? 9 : 11 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                    Lot: <b style={{ fontFamily: 'monospace' }}>{lotNo || '—'}</b>
                  </span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap', maxWidth: '35%' }}>
                    MRP: <b>₹{mrp || 0}.00</b>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#374151',
                    fontSize: activeHeightMm <= 30 ? 9 : 11,
                  }}
                >
                  <span>MFG: {mfgDate || 'YYYY-MM-DD'}</span>
                  <span>EXP: {expiryDate || 'YYYY-MM-DD'}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 'auto', paddingTop: activeHeightMm <= 30 ? 4 : 8 }}>
                {barcodeType !== 'QR Code' ? (
                  <canvas
                    ref={previewCanvasRef}
                    style={{
                      width: '100%',
                      height: activeHeightMm <= 30 ? 46 : 72,
                      display: 'block',
                      imageRendering: 'pixelated',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <img src={qrCodeUrl} style={{ width: activeHeightMm <= 30 ? 55 : 80, height: activeHeightMm <= 30 ? 55 : 80 }} alt="QR" />
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
