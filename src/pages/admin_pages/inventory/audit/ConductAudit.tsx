import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, Search, ScanBarcode, ArrowLeft, 
  CheckCircle, AlertTriangle, Save, RefreshCw, Send, Package, Camera,
  ChevronRight, CheckCircle2, Pause, Edit2, Trash2, Plus, Download, FileSpreadsheet, Lock
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
// @ts-ignore
import BarcodeScannerOverlay from '../../../../components/BarcodeScannerOverlay';
import { useBarcodeScanner } from '../../vsms/agent/hooks/useBarcodeScanner';
import { auditService } from './auditService';
import toast from 'react-hot-toast';

type AuditStep = 'SNAPSHOT' | 'COUNT' | 'REVIEW';

export default function ConductAudit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [audit, setAudit] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number | string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Workflow Stage: Step 3 (Snapshot), Step 4 (Count Products), Step 5 (Review Count)
  const [activeStep, setActiveStep] = useState<AuditStep>('SNAPSHOT');

  // Step 3 (Snapshot) Filter Tabs
  const [snapshotTab, setSnapshotTab] = useState<'ALL' | 'BATCHES' | 'ZERO'>('ALL');

  // Step 4 (Active item card input state)
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [activeCountInput, setActiveCountInput] = useState<string>('');
  const [activeRemarksInput, setActiveRemarksInput] = useState<string>('');
  const [lastScannedLineId, setLastScannedLineId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [countedTableSearch, setCountedTableSearch] = useState('');

  // Step 5 (Review Count) Filters
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'ALL' | 'MATCHED' | 'DISCREPANCY'>('ALL');

  // Step 6 (Confirmation modal state)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<any>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<any>(null);

  const getStorageKey = () => `audit_draft_${id}`;

  const loadAudit = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await auditService.getAuditById(id);
      if (res?.data?.success) {
        const auditData = res.data.data;
        setAudit(auditData);
        const auditItems = auditData.items || [];
        setItems(auditItems);

        // 1. First get initial counts from database
        const initialCounts: Record<string, number | string> = {};
        const initialRemarks: Record<string, string> = {};
        let hasAnyCounts = false;

        auditItems.forEach((item: any) => {
          if (item.countedQuantity !== null && item.countedQuantity !== undefined) {
            initialCounts[item.id] = item.countedQuantity;
            hasAnyCounts = true;
          }
          if (item.remarks) {
            initialRemarks[item.id] = item.remarks;
          }
        });

        // 2. Overlay any locally cached draft from localStorage so refresh never loses data
        try {
          const cachedRaw = localStorage.getItem(getStorageKey());
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached.counts) {
              Object.assign(initialCounts, cached.counts);
              if (Object.keys(cached.counts).length > 0) {
                hasAnyCounts = true;
              }
            }
            if (cached.remarks) {
              Object.assign(initialRemarks, cached.remarks);
            }
            if (cached.activeStep) {
              setActiveStep(cached.activeStep);
            }
          }
        } catch (e) {
          console.warn('Failed to parse cached audit draft', e);
        }

        setCounts(initialCounts);
        setRemarks(initialRemarks);

        // If audit already has counts, land in COUNT or REVIEW step; otherwise start at SNAPSHOT
        if (hasAnyCounts) {
          setActiveStep(prev => prev === 'SNAPSHOT' ? 'COUNT' : prev);
        }

        if (auditItems.length > 0) {
          const first = auditItems[0];
          setSelectedLineId(first.id);
          setActiveCountInput(initialCounts[first.id] !== undefined ? String(initialCounts[first.id]) : '');
          setActiveRemarksInput(initialRemarks[first.id] || '');
        }
      }
    } catch (err: any) {
      toast.error('Failed to load audit session');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [id]);

  // Persist counts, remarks, and activeStep to localStorage on any change
  useEffect(() => {
    if (!id || isLoading) return;
    try {
      localStorage.setItem(
        getStorageKey(),
        JSON.stringify({
          counts,
          remarks,
          activeStep,
          updatedAt: new Date().toISOString()
        })
      );
    } catch (e) {
      console.warn('Failed to save audit draft to localStorage', e);
    }

    // Debounced silent background save to server so both client and database stay synchronized
    if (Object.keys(counts).length > 0 && audit?.status === 'DRAFT') {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          const entries = Object.keys(counts).map(lineId => {
            const item = items.find(i => i.id === lineId);
            return {
              lineId,
              productId: item?.productId,
              countedQuantity: Number(counts[lineId]) || 0,
              remarks: remarks[lineId] || ''
            };
          });
          if (entries.length > 0) {
            await auditService.recordPhysicalCount(id, entries);
          }
        } catch (err) {
          // Silent background save
        }
      }, 1500);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [counts, remarks, activeStep, id, items, audit?.status, isLoading]);

  // Select a line item for active product counting card
  const selectItemForCounting = (lineItem: any) => {
    setSelectedLineId(lineItem.id);
    setActiveCountInput(counts[lineItem.id] !== undefined ? String(counts[lineItem.id]) : '');
    setActiveRemarksInput(remarks[lineItem.id] || '');
  };

  // Hardware / Camera Barcode Scan Handler
  const handleBarcodeScan = (scannedCode: string) => {
    const rawCode = String(scannedCode || '').trim();
    if (!rawCode) return;
    const code = rawCode.toLowerCase();

    const matchedItem = items.find((item: any) => {
      const p = item.product || {};
      const prodName = String(p.name || '').trim().toLowerCase();
      const prodBarcode = String(p.barcode || '').trim().toLowerCase();
      const prodSku = String(p.sku || '').trim().toLowerCase();
      const prodId = String(p.id || '').trim().toLowerCase();
      const lineId = String(item.id || '').trim().toLowerCase();
      const masterSku = String(p.masterProduct?.sku || '').trim().toLowerCase();
      const variantSku = String(p.variants?.[0]?.sku || '').trim().toLowerCase();

      return (
        prodBarcode === code ||
        prodSku === code ||
        prodId === code ||
        lineId === code ||
        masterSku === code ||
        variantSku === code ||
        prodName === code ||
        prodName.includes(code)
      );
    });

    if (matchedItem) {
      const currentQty = Number(counts[matchedItem.id] !== undefined && counts[matchedItem.id] !== '' ? counts[matchedItem.id] : 0);
      const newQty = currentQty + 1;
      
      setCounts(prev => ({
        ...prev,
        [matchedItem.id]: newQty
      }));

      selectItemForCounting(matchedItem);
      setActiveCountInput(String(newQty));
      setLastScannedLineId(matchedItem.id);

      toast.success(
        `Scanned: ${matchedItem.product?.name || 'Item'} (Count: ${newQty})`,
        { id: `scan-${matchedItem.id}`, duration: 2500 }
      );

      // Auto-switch to COUNT screen if scanning while in SNAPSHOT
      if (activeStep === 'SNAPSHOT') {
        setActiveStep('COUNT');
      }
    } else {
      toast.error(`Product "${rawCode}" not found in this audit section`, {
        duration: 3500
      });
    }
  };

  useBarcodeScanner(handleBarcodeScan);

  // Save active card item and proceed to next
  const handleSaveActiveCount = (proceedNext = false) => {
    if (!selectedLineId) return;
    const newQty = activeCountInput.trim() === '' ? '' : Number(activeCountInput);
    setCounts(prev => ({ ...prev, [selectedLineId]: newQty }));
    if (activeRemarksInput) {
      setRemarks(prev => ({ ...prev, [selectedLineId]: activeRemarksInput }));
    }

    toast.success('Count updated', { duration: 1500 });

    if (proceedNext) {
      const currentIndex = items.findIndex(i => i.id === selectedLineId);
      if (currentIndex >= 0 && currentIndex < items.length - 1) {
        const nextItem = items[currentIndex + 1];
        selectItemForCounting(nextItem);
      }
    }
  };

  // Quick save draft
  const handleSaveDraft = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const entries = Object.keys(counts).map(lineId => {
        const item = items.find(i => i.id === lineId);
        return {
          lineId,
          productId: item?.productId,
          countedQuantity: Number(counts[lineId]) || 0,
          remarks: remarks[lineId] || ''
        };
      });

      await auditService.recordPhysicalCount(id, entries);
      toast.success('Draft counts saved');
    } catch (err: any) {
      toast.error('Failed to save draft counts');
    } finally {
      setIsSaving(false);
    }
  };

  // Final submission of physical count
  const handleSubmitAudit = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const entries = Object.keys(counts).map(lineId => {
        const item = items.find(i => i.id === lineId);
        return {
          lineId,
          productId: item?.productId,
          countedQuantity: Number(counts[lineId]) || 0,
          remarks: remarks[lineId] || ''
        };
      });

      if (entries.length > 0) {
        await auditService.recordPhysicalCount(id, entries);
      }

      const res = await auditService.submitCount(id);
      if (res?.data?.success) {
        // Prepare Screen 6 modal summary
        const countedTotal = Object.keys(counts).filter(k => counts[k] !== '' && counts[k] !== undefined).length;
        let varianceCount = 0;
        let varianceTotalVal = 0;

        items.forEach(i => {
          const c = Number(counts[i.id] || 0);
          const diff = c - (i.expectedQuantity || 0);
          if (diff !== 0) {
            varianceCount++;
            varianceTotalVal += Math.abs(diff * (i.unitPrice || 0));
          }
        });

        setSubmittedSummary({
          auditNumber: audit?.auditNumber,
          scope: audit?.vehicle ? `Vehicle - ${audit.vehicle.vehicleNumber}` : (audit?.scope || '').replace(/_/g, ' '),
          vehicle: audit?.vehicle?.vehicleNumber || 'V001',
          itemsCounted: countedTotal,
          varianceCount,
          varianceVal: varianceTotalVal,
          submittedOn: new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          submittedBy: audit?.auditor?.name || 'Suresh'
        });

        localStorage.removeItem(getStorageKey());
        setShowConfirmationModal(true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
        <RefreshCw size={28} className="animate-spin text-emerald-600" />
        <p className="text-xs font-semibold">Loading audit session...</p>
      </div>
    );
  }

  const isBlind = audit?.countingMethod === 'BLIND';
  const activeSelectedItem = items.find(i => i.id === selectedLineId) || items[0];

  // Counted items list for Step 4 (audit added products)
  const countedItemsList = items.filter(i => counts[i.id] !== undefined && counts[i.id] !== '');

  // Filtered counted products for table search
  const filteredCountedItems = countedItemsList.filter(i => {
    if (!countedTableSearch.trim()) return true;
    const term = countedTableSearch.trim().toLowerCase();
    const name = String(i.product?.name || '').toLowerCase();
    const sku = String(i.product?.sku || '').toLowerCase();
    const barcode = String(i.product?.barcode || '').toLowerCase();
    return name.includes(term) || sku.includes(term) || barcode.includes(term);
  });

  // Top search matching suggestions (all products matching search term)
  const searchSuggestions = searchQuery.trim().length > 0 
    ? items.filter(item => {
        const term = searchQuery.trim().toLowerCase();
        const p = item.product || {};
        const name = String(p.name || '').toLowerCase();
        const sku = String(p.sku || '').toLowerCase();
        const barcode = String(p.barcode || '').toLowerCase();
        return name.includes(term) || sku.includes(term) || barcode.includes(term);
      }).slice(0, 8)
    : [];

  // Step 5 KPI metrics
  const totalVerifiedCount = items.length;
  const matchedCount = items.filter(i => {
    const c = counts[i.id];
    return c !== undefined && c !== '' && Number(c) === (i.expectedQuantity || 0);
  }).length;
  const varianceLines = items.filter(i => {
    const c = counts[i.id];
    return c !== undefined && c !== '' && Number(c) !== (i.expectedQuantity || 0);
  });
  const totalVarianceVal = varianceLines.reduce((sum, i) => {
    const diff = Number(counts[i.id] || 0) - (i.expectedQuantity || 0);
    return sum + Math.abs(diff * (i.unitPrice || 0));
  }, 0);

  return (
    <div className="w-full px-2 sm:px-4 pb-16 space-y-5 max-w-7xl mx-auto font-sans">
      
      {/* Top Breadcrumb & Step Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory/audits')}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-gray-900">{audit?.auditNumber}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                In Progress
              </span>
              {isBlind && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Blind Count
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Scope: <strong>{audit?.vehicle ? `Vehicle (${audit.vehicle.vehicleNumber})` : (audit?.scope || '').replace(/_/g, ' ')}</strong> • Auditor: {audit?.auditor?.name || 'Suresh'}
            </p>
          </div>
        </div>

        {/* 3 Step Flow Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveStep('SNAPSHOT')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeStep === 'SNAPSHOT' ? 'bg-[#0f2c1d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>3. Ledger Snapshot</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('COUNT')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeStep === 'COUNT' ? 'bg-[#0f2c1d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>4. Count Products</span>
            {countedItemsList.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">
                {countedItemsList.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('REVIEW')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeStep === 'REVIEW' ? 'bg-[#0f2c1d] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>5. Review Count</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SCREEN 3: AUDIT LEDGER SNAPSHOT (The Freeze Screen)            */}
      {/* ============================================================== */}
      {activeStep === 'SNAPSHOT' && (
        <div className="space-y-4">
          {/* Metadata Card */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Snapshot Time</span>
                <span className="font-extrabold text-gray-900 text-sm">
                  {audit?.cutoffTime ? new Date(audit.cutoffTime).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Section / Vehicle</span>
                <span className="font-extrabold text-gray-900 text-sm">
                  {audit?.vehicle ? `Vehicle - ${audit.vehicle.vehicleNumber}` : (audit?.scope || '').replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Counting Method</span>
                <span className="font-extrabold text-gray-900 text-sm">
                  {audit?.countingMethod === 'BLIND' ? 'Blind Count' : 'System-assisted'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">No. of Products</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {items.length} SKUs Frozen
                </span>
              </div>
            </div>

            {/* Informational Callout */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
              <span className="text-base">ℹ️</span>
              <div>
                <strong className="font-bold block">Authoritative Ledger Frozen at Cutoff:</strong>
                Expected quantities are retrieved from the inventory ledger including all posted receipts, sales, transfers and adjustments up to the cutoff time.
              </div>
            </div>
          </div>

          {/* Snapshot Table Header & Filter Tabs */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSnapshotTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    snapshotTab === 'ALL' ? 'bg-[#0f2c1d] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Products ({items.length})
                </button>
                <button
                  onClick={() => setSnapshotTab('BATCHES')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    snapshotTab === 'BATCHES' ? 'bg-[#0f2c1d] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  With Batches
                </button>
                <button
                  onClick={() => setSnapshotTab('ZERO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    snapshotTab === 'ZERO' ? 'bg-[#0f2c1d] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Zero Stock ({items.filter(i => (i.expectedQuantity || 0) === 0).length})
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                  type="text"
                  placeholder="Search product name, SKU, barcode..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-emerald-600 w-full sm:w-64"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">Expected Qty</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {items
                    .filter(item => {
                      if (snapshotTab === 'ZERO') return (item.expectedQuantity || 0) === 0;
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        item.product?.name?.toLowerCase().includes(q) ||
                        item.product?.sku?.toLowerCase().includes(q) ||
                        item.product?.barcode?.toLowerCase().includes(q)
                      );
                    })
                    .map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{item.product?.name}</td>
                        <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">{item.product?.sku || '—'}</td>
                        <td className="py-3 px-4 text-center font-black text-gray-800">{item.expectedQuantity ?? 0}</td>
                        <td className="py-3 px-4 text-center text-gray-500">{item.product?.unit || 'Pack'}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-700">₹{item.unitPrice || 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Footer action */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/inventory/audits')}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('COUNT')}
                className="px-6 py-2.5 bg-[#f95721] hover:bg-[#ea450f] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Start Counting →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 4: COUNT PRODUCTS (Active Product Card & Count List)    */}
      {/* ============================================================== */}
      {activeStep === 'COUNT' && (
        <div className="space-y-5">
          {/* Active Product Entry Card */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            {/* Search / Scan input with live autocomplete dropdown */}
            <div className="flex items-center gap-2 relative">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Scan barcode or type product name to select..."
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleBarcodeScan(searchQuery.trim());
                      setSearchQuery('');
                      setIsSearchFocused(false);
                      e.preventDefault();
                    } else if (e.key === 'Escape') {
                      setIsSearchFocused(false);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-inner"
                />

                {/* Autocomplete Dropdown when searching product name */}
                {isSearchFocused && searchSuggestions.length > 0 && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsSearchFocused(false)} 
                    />
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-20 max-h-72 overflow-y-auto divide-y divide-gray-100">
                      <div className="p-2 bg-gray-50/90 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Matching Products ({searchSuggestions.length})</span>
                        <span className="text-[10px] text-gray-400 font-normal">Click to count</span>
                      </div>
                      {searchSuggestions.map(item => {
                        const isAlreadyCounted = counts[item.id] !== undefined && counts[item.id] !== '';
                        return (
                          <div
                            key={item.id}
                            onMouseDown={(e) => {
                              e.preventDefault(); // prevent blur
                              selectItemForCounting(item);
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            className="p-3 hover:bg-emerald-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-xs">
                                {item.product?.name ? item.product.name[0].toUpperCase() : 'P'}
                              </div>
                              <div className="truncate">
                                <p className="font-bold text-gray-900 truncate">{item.product?.name}</p>
                                <p className="text-[11px] text-gray-400 font-mono">
                                  SKU: {item.product?.sku || '—'} {item.product?.barcode ? `• Barcode: ${item.product.barcode}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {isAlreadyCounted ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  Counted: {counts[item.id]}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                  Expected: {item.expectedQuantity ?? 0}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <Camera size={15} className="text-emerald-600" />
                <span>Camera Scan</span>
              </button>

              <div 
                className="px-3 py-2.5 rounded-2xl bg-gray-50 text-gray-600 border border-gray-200 hidden md:flex items-center gap-1.5 text-xs font-semibold select-none shrink-0"
                title="USB scanner ready - scan any barcode"
              >
                <ScanBarcode size={15} className="text-emerald-600" />
                <span>USB Ready</span>
              </div>
            </div>

            {/* Active Selected Product Details Card */}
            {activeSelectedItem && (
              <div className="p-5 rounded-2xl bg-[#fafbfc] border border-gray-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center p-1.5 shadow-sm overflow-hidden shrink-0">
                      <span className="text-2xl font-black text-emerald-700">
                        {activeSelectedItem.product?.name ? activeSelectedItem.product.name[0].toUpperCase() : 'P'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-sm sm:text-base">
                        {activeSelectedItem.product?.name}
                      </h3>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">
                        SKU: {activeSelectedItem.product?.sku || '—'} • Barcode: {activeSelectedItem.product?.barcode || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Quantity and Variance Inputs */}
                  <div className="flex items-center gap-4">
                    {!isBlind && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide">Expected Qty</span>
                        <span className="text-base font-black text-gray-800">
                          {activeSelectedItem.expectedQuantity ?? 0} {activeSelectedItem.product?.unit || 'packs'}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide mb-1">Counted Qty *</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={activeCountInput}
                        onChange={e => setActiveCountInput(e.target.value)}
                        className="w-24 text-center py-1.5 px-2 bg-white border-2 border-emerald-500 rounded-xl text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    {!isBlind && (
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide mb-1">Variance</span>
                        {activeCountInput !== '' ? (
                          (() => {
                            const diff = Number(activeCountInput) - (activeSelectedItem.expectedQuantity || 0);
                            return (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-block ${
                                diff < 0 ? 'bg-red-50 text-red-700 border border-red-200' :
                                diff > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {diff > 0 ? `+${diff}` : diff} packs
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-gray-300 font-mono text-xs">—</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Batch & Remarks Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200/60 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Batch / Lot (Optional)</label>
                    <input
                      type="text"
                      placeholder="Select or enter batch..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Remarks (Optional)</label>
                    <input
                      type="text"
                      placeholder="Add investigation remarks..."
                      value={activeRemarksInput}
                      onChange={e => setActiveRemarksInput(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveActiveCount(true)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors"
                  >
                    Save & Next
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveActiveCount(false)}
                    className="px-5 py-2 bg-[#f95721] hover:bg-[#ea450f] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    Add to Audit List
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Table: Only Audit Added Products */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-2">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-extrabold text-gray-900 text-sm">
                  Audit Added Products ({countedItemsList.length} of {items.length})
                </h3>
                {countedItemsList.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {Math.round((countedItemsList.length / (items.length || 1)) * 100)}% Counted
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Search added products by name */}
                {countedItemsList.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search counted products..."
                      value={countedTableSearch}
                      onChange={e => setCountedTableSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-emerald-600 w-48 sm:w-56"
                    />
                  </div>
                )}

                {countedItemsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear all recorded physical counts?')) {
                        setCounts({});
                        toast.success('Count sheet cleared');
                      }
                    }}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {countedItemsList.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <Package size={24} />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="font-extrabold text-gray-800 text-sm">No products added to audit yet</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Search a product name above or scan barcode to record its physical count into this audit list.
                  </p>
                </div>
              </div>
            ) : filteredCountedItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No counted products matched "{countedTableSearch}".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">SKU</th>
                      {!isBlind && <th className="py-3 px-4 text-center">Expected</th>}
                      <th className="py-3 px-4 text-center">Counted</th>
                      {!isBlind && <th className="py-3 px-4 text-center">Variance</th>}
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredCountedItems.map((item, idx) => {
                      const countedVal = counts[item.id];
                      const hasCount = countedVal !== undefined && countedVal !== '';
                      const diff = Number(countedVal || 0) - (item.expectedQuantity || 0);
                      const isSelected = selectedLineId === item.id;

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => selectItemForCounting(item)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50/60 ring-1 ring-emerald-500/40' :
                            hasCount ? 'bg-emerald-50/10 hover:bg-emerald-50/30' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{item.product?.name}</td>
                          <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">{item.product?.sku || '—'}</td>
                          {!isBlind && <td className="py-3 px-4 text-center font-bold text-gray-700">{item.expectedQuantity ?? 0}</td>}
                          <td className="py-3 px-4 text-center font-black text-gray-900">
                            {hasCount ? countedVal : <span className="text-gray-300 font-mono">—</span>}
                          </td>
                          {!isBlind && (
                            <td className="py-3 px-4 text-center">
                              {hasCount ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                  diff < 0 ? 'bg-red-50 text-red-700 border border-red-200' :
                                  diff > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {diff > 0 ? `+${diff}` : diff}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-mono">—</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 text-gray-500">{remarks[item.id] || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectItemForCounting(item);
                              }}
                              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-emerald-700"
                              title="Edit count"
                            >
                              <Edit2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 flex items-center gap-1.5"
              >
                <Pause size={14} />
                <span>{isSaving ? 'Saving...' : 'Pause Audit (Save Draft)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep('REVIEW')}
                className="px-6 py-2.5 bg-[#f95721] hover:bg-[#ea450f] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Review Count →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SCREEN 5: REVIEW COUNT (Auditor Pre-Submission Check)          */}
      {/* ============================================================== */}
      {activeStep === 'REVIEW' && (
        <div className="space-y-5">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Total Products</span>
              <div className="text-2xl font-black text-gray-900">{totalVerifiedCount}</div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Matched</span>
              <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
                {matchedCount} <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">With Variance</span>
              <div className="text-2xl font-black text-amber-600 flex items-center gap-1.5">
                {varianceLines.length} <AlertTriangle size={18} className="text-amber-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Variance Value</span>
              <div 
                className="text-xl sm:text-2xl font-black text-gray-900 truncate tracking-tight"
                title={`₹ ${Math.round(totalVarianceVal).toLocaleString('en-IN')}`}
              >
                {(() => {
                  const val = Math.round(totalVarianceVal);
                  if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
                  if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
                  if (val >= 10000) return `₹ ${(val / 1000).toFixed(1)}k`;
                  return `₹ ${val.toLocaleString('en-IN')}`;
                })()}
              </div>
              <span className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                {Math.round(totalVarianceVal) >= 100000 
                  ? `₹${Math.round(totalVarianceVal).toLocaleString('en-IN')}` 
                  : 'Total net discrepancy'}
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-2">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={reviewStatusFilter}
                  onChange={e => setReviewStatusFilter(e.target.value as any)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  <option value="ALL">All Status</option>
                  <option value="MATCHED">Matched Only</option>
                  <option value="DISCREPANCY">Needs Review (Variance)</option>
                </select>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                  type="text"
                  placeholder="Search product..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-emerald-600 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">Expected</th>
                    <th className="py-3 px-4 text-center">Counted</th>
                    <th className="py-3 px-4 text-center">Variance</th>
                    <th className="py-3 px-4 text-right">Value (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {items
                    .filter(item => {
                      const countedVal = counts[item.id];
                      const diff = Number(countedVal || 0) - (item.expectedQuantity || 0);
                      if (reviewStatusFilter === 'MATCHED') return diff === 0;
                      if (reviewStatusFilter === 'DISCREPANCY') return diff !== 0;
                      return true;
                    })
                    .map((item, idx) => {
                      const countedVal = counts[item.id];
                      const hasCount = countedVal !== undefined && countedVal !== '';
                      const diff = Number(countedVal || 0) - (item.expectedQuantity || 0);
                      const isMatched = hasCount && diff === 0;
                      const valueDiff = Math.abs(diff * (item.unitPrice || 0));

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-gray-900">{item.product?.name}</td>
                          <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">{item.product?.sku || '—'}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-700">{item.expectedQuantity ?? 0}</td>
                          <td className="py-3.5 px-4 text-center font-black text-gray-900">
                            {hasCount ? countedVal : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black">
                            {hasCount ? (
                              <span className={diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-700'}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-gray-900">
                            ₹{Math.round(valueDiff)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isMatched ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {isMatched ? '✓ Matched' : '⚠ Needs Review'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                selectItemForCounting(item);
                                setActiveStep('COUNT');
                              }}
                              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-emerald-700"
                            >
                              <Edit2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveStep('COUNT')}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100"
              >
                ← Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100"
                >
                  {isSaving ? 'Saving...' : 'Save as Draft'}
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAudit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#f95721] hover:bg-[#ea450f] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span>{isSubmitting ? 'Locking & Submitting...' : 'Submit for Review →'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Overlay Modal */}
      {isScannerOpen && (
        <BarcodeScannerOverlay
          onScan={(code: string) => {
            const cleanCode = String(code || '').trim();
            if (cleanCode) {
              handleBarcodeScan(cleanCode);
            }
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* ============================================================== */}
      {/* SCREEN 6: SUBMISSION CONFIRMATION MODAL                        */}
      {/* ============================================================== */}
      {showConfirmationModal && submittedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200 p-6 space-y-5 text-center">
            
            {/* Green check icon badge */}
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>

            <div>
              <h2 className="text-lg font-black text-gray-900">Audit Submitted Successfully</h2>
              <p className="text-xs text-gray-500 mt-1">Audit physical count is complete and forwarded for review.</p>
            </div>

            {/* Audit Details Summary List */}
            <div className="bg-gray-50 rounded-2xl p-4 text-xs text-left space-y-2 border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-400">Audit ID</span>
                <span className="font-bold text-gray-800">{submittedSummary.auditNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Scope</span>
                <span className="font-bold text-gray-800">{submittedSummary.scope}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Items Counted</span>
                <span className="font-bold text-gray-800">{submittedSummary.itemsCounted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Items with Variance</span>
                <span className="font-bold text-amber-600">{submittedSummary.varianceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Variance Value</span>
                <span className="font-bold text-gray-800">₹{submittedSummary.varianceVal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Submitted On</span>
                <span className="font-medium text-gray-600">{submittedSummary.submittedOn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Submitted By</span>
                <span className="font-bold text-gray-800">{submittedSummary.submittedBy}</span>
              </div>
            </div>

            {/* Lock notification pill */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 flex items-center gap-2 text-left">
              <Lock size={15} className="text-blue-700 shrink-0" />
              <span>The audit is now locked and pending review. You will be notified once it is reviewed.</span>
            </div>

            {/* Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/inventory/audits/${id}/review`)}
                className="w-full py-2.5 bg-[#0f2c1d] hover:bg-[#091f13] text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                View Audit Details
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventory/audits')}
                className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors"
              >
                Go to Audit Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
