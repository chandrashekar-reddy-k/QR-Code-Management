import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, Search, ScanBarcode, ArrowLeft, 
  CheckCircle, AlertTriangle, Save, RefreshCw, Send, Package, Camera
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
// @ts-ignore
import BarcodeScannerOverlay from '../../../../components/BarcodeScannerOverlay';
import { useBarcodeScanner } from '../../vsms/agent/hooks/useBarcodeScanner';
import { auditService } from './auditService';
import toast from 'react-hot-toast';

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
  const [lastScannedLineId, setLastScannedLineId] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadAudit = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await auditService.getAuditById(id);
      if (res?.data?.success) {
        const auditData = res.data.data;
        setAudit(auditData);
        setItems(auditData.items || []);

        const initialCounts: Record<string, number | string> = {};
        const initialRemarks: Record<string, string> = {};
        (auditData.items || []).forEach((item: any) => {
          if (item.countedQuantity !== null && item.countedQuantity !== undefined) {
            initialCounts[item.id] = item.countedQuantity;
          }
          if (item.remarks) {
            initialRemarks[item.id] = item.remarks;
          }
        });
        setCounts(initialCounts);
        setRemarks(initialRemarks);
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

  // Handle barcode scanned from camera, hardware scanner, or search submit
  const handleBarcodeScan = (scannedCode: string) => {
    const rawCode = String(scannedCode || '').trim();
    if (!rawCode) return;
    const code = rawCode.toLowerCase();

    // Match by barcode, SKU, product ID or variant codes
    const matchedItem = items.find((item: any) => {
      const p = item.product || {};
      const prodBarcode = String(p.barcode || '').trim().toLowerCase();
      const prodSku = String(p.sku || '').trim().toLowerCase();
      const prodId = String(p.id || '').trim().toLowerCase();
      const lineId = String(item.id || '').trim().toLowerCase();
      const masterSku = String(p.masterProduct?.sku || '').trim().toLowerCase();
      const variantSku = String(p.variants?.[0]?.sku || '').trim().toLowerCase();
      const variantBarcode = String(p.variants?.[0]?.barcode || '').trim().toLowerCase();

      return (
        prodBarcode === code ||
        prodSku === code ||
        prodId === code ||
        lineId === code ||
        masterSku === code ||
        variantSku === code ||
        variantBarcode === code
      );
    });

    if (matchedItem) {
      const currentQty = Number(counts[matchedItem.id] !== undefined && counts[matchedItem.id] !== '' ? counts[matchedItem.id] : 0);
      const newQty = currentQty + 1;
      
      setCounts(prev => ({
        ...prev,
        [matchedItem.id]: newQty
      }));

      setLastScannedLineId(matchedItem.id);
      toast.success(
        `Scanned: ${matchedItem.product?.name || 'Item'} (Count: ${newQty})`,
        { id: `scan-${matchedItem.id}`, duration: 2500 }
      );

      // Scroll row into view smoothly
      setTimeout(() => {
        const el = document.getElementById(`audit-row-${matchedItem.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    } else {
      toast.error(`Barcode / SKU "${rawCode}" not found in this audit session`, {
        duration: 3500
      });
    }
  };

  // Hardware barcode scanner listener
  useBarcodeScanner(handleBarcodeScan);

  // Handle single count change
  const handleCountChange = (lineId: string, value: string) => {
    setCounts(prev => ({ ...prev, [lineId]: value }));
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

  // Submit count for manager review
  const handleSubmitAudit = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to submit the physical count? This locks the count and calculates variances for manager review.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      // First save all current entries
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
        toast.success(res.data.message);
        navigate(`/inventory/audits/${id}/review`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter items by search
  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.product?.name && item.product.name.toLowerCase().includes(q)) ||
      (item.product?.sku && item.product.sku.toLowerCase().includes(q)) ||
      (item.product?.barcode && item.product.barcode.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
        <RefreshCw size={28} className="animate-spin text-emerald-600" />
        <p className="text-xs font-semibold">Loading audit count session...</p>
      </div>
    );
  }

  const isBlind = audit?.countingMethod === 'BLIND';

  return (
    <div className="w-full px-2 sm:px-4 pb-12 space-y-5">
      {/* Top Navigation & Session Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory/audits')}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900">{audit?.auditNumber}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {audit?.scope?.replace('_', ' ')}
              </span>
              {isBlind && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Blind Count
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Cutoff Time: {new Date(audit?.cutoffTime).toLocaleString()} • Auditor: {audit?.auditor?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleSubmitAudit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-100"
          >
            <Send size={14} />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Count for Review'}</span>
          </button>
        </div>
      </div>

      {/* Screen 2 Barcode Scanner & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search product, SKU or scan barcode (Press Enter to count)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleBarcodeScan(searchQuery.trim());
                  setSearchQuery('');
                  e.preventDefault();
                }
              }}
              className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-emerald-500 w-full font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
            title="Scan barcode with camera"
          >
            <Camera size={15} className="text-emerald-600" />
            <span>Camera Scan</span>
          </button>

          <div 
            className="p-2 rounded-xl bg-gray-50 text-gray-600 border border-gray-200 hidden md:flex items-center gap-1.5 text-[11px] font-semibold select-none"
            title="USB / Bluetooth barcode scanner active - scan any barcode at any time"
          >
            <ScanBarcode size={15} className="text-emerald-600" />
            <span>USB Scanner Ready</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 font-semibold self-end sm:self-auto">
          Showing <span className="text-gray-900 font-bold">{filteredItems.length}</span> of {items.length} items
        </div>
      </div>

      {/* Camera Barcode Scanner Overlay */}
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

      {/* Physical Counting Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Item & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                {!isBlind && <th className="py-3 px-4 text-center">Expected Book Stock</th>}
                <th className="py-3 px-4 text-center w-36">Physical Count</th>
                {!isBlind && <th className="py-3 px-4 text-center">Variance</th>}
                <th className="py-3 px-4">Remarks / Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const countedVal = counts[item.id];
                const hasCount = countedVal !== undefined && countedVal !== '';
                const countedNum = Number(countedVal || 0);
                const diff = countedNum - (item.expectedQuantity || 0);

                const displaySku = item.product?.sku || item.product?.variants?.[0]?.sku || item.product?.masterProduct?.sku || 'N/A';
                const displayUnit = item.product?.unit || 'Units';

                const isLastScanned = lastScannedLineId === item.id;

                return (
                  <tr 
                    key={item.id} 
                    id={`audit-row-${item.id}`}
                    className={`transition-colors duration-500 ${
                      isLastScanned 
                        ? 'bg-emerald-100/70 ring-2 ring-emerald-500/50' 
                        : 'hover:bg-emerald-50/20'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        {item.product?.name}
                        {isLastScanned && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-600 text-white animate-pulse">
                            JUST SCANNED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-gray-400">
                        SKU: {displaySku}
                        {item.product?.barcode && (
                          <span className="ml-2 text-gray-400 font-mono">
                            • Barcode: {item.product.barcode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-medium text-[11px]">
                        {item.product?.category?.name || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">
                      ₹{item.unitPrice || 0}
                    </td>

                    {!isBlind && (
                      <td className="py-3 px-4 text-center">
                        <span className="font-black text-gray-800 text-sm">
                          {item.expectedQuantity}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-normal">
                          {displayUnit}
                        </span>
                      </td>
                    )}

                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter count"
                        value={counts[item.id] ?? ''}
                        onChange={(e) => handleCountChange(item.id, e.target.value)}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className={`w-28 text-center py-1.5 px-2 rounded-xl text-xs font-black border transition-all focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          hasCount
                            ? 'bg-emerald-50/40 border-emerald-400 text-emerald-950 focus:ring-2 focus:ring-emerald-500'
                            : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-emerald-500'
                        }`}
                      />
                    </td>

                    {!isBlind && (
                      <td className="py-3 px-4 text-center">
                        {hasCount ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
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

                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        value={remarks[item.id] || ''}
                        onChange={(e) => setRemarks(r => ({ ...r, [item.id]: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
