// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { URL as configURL } from '../../config';
import { generateInvoicePDF, getInvoiceNumber } from '../../utils/generateInvoicePDF';
import villagKartLogo from '../../assets/vk.png';
import {
  Loader2,
  Download,
  Printer,
  CheckCircle,
  ExternalLink,
  Receipt,
  FileText,
  Share2,
  Copy,
  Check,
  CreditCard,
  Calendar,
  User,
  Phone,
  Package,
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function PublicInvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'receipt' | 'pdf'>('receipt');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    const baseCandidates = [
      configURL,
      (import.meta as any).env?.VITE_URL,
      (import.meta as any).env?.VITE_URL_ADMIN,
      'http://localhost:3004/api/v1',
      'http://localhost:3001/api/v1'
    ].filter(Boolean);

    const fetchEndpoints: string[] = [];
    baseCandidates.forEach((b) => {
      const clean = String(b).replace(/\/+$/, '');
      if (!fetchEndpoints.includes(`${clean}/vsms/orders/${id}`)) {
        fetchEndpoints.push(`${clean}/vsms/orders/${id}`);
      }
      if (!fetchEndpoints.includes(`${clean}/orders/${id}`)) {
        fetchEndpoints.push(`${clean}/orders/${id}`);
      }
      if (!fetchEndpoints.includes(`${clean}/agent/orders/${id}`)) {
        fetchEndpoints.push(`${clean}/agent/orders/${id}`);
      }
    });

    const fetchOrder = async () => {
      for (const endpoint of fetchEndpoints) {
        try {
          const res = await axios.get(endpoint);
          const data = res.data?.data || res.data;
          if (data && (data.id || data.orderNumber)) {
            setOrder(data);
            setLoading(false);
            return;
          }
        } catch {
          // Continue to next endpoint
        }
      }
      setError('Invoice could not be loaded or expired.');
      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  // Generate exact PDF blob for preview
  useEffect(() => {
    if (!order) return;
    let isMounted = true;
    setIsPdfLoading(true);

    generateInvoicePDF(order)
      .then((pdf) => {
        if (pdf && isMounted) {
          const blob = pdf.output('blob');
          const url = window.URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        }
      })
      .catch((err) => {
        console.warn('PDF blob generation error:', err);
      })
      .finally(() => {
        if (isMounted) setIsPdfLoading(false);
      });

    return () => {
      isMounted = false;
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [order]);

  const invoiceNo = useMemo(() => (order ? getInvoiceNumber(order) : ''), [order]);

  const handleDownloadPDF = async () => {
    if (!order) return;
    try {
      setIsDownloading(true);
      const pdf = await generateInvoicePDF(order);
      if (pdf) {
        pdf.save(`VillagKart_Invoice_VK-${invoiceNo}.pdf`);
      }
    } catch (err) {
      console.error('Download PDF error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!order) return;
    try {
      setIsDownloading(true);
      const pdf = await generateInvoicePDF(order);
      if (pdf) {
        pdf.autoPrint();
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank');
      }
    } catch (err) {
      console.error('Print PDF error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const currentUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `VillagKart Invoice #VK-${invoiceNo}`,
          text: `Official Bill Receipt for Order #VK-${invoiceNo}`,
          url: currentUrl
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
          <Loader2 size={32} className="text-emerald-600 animate-spin" />
        </div>
        <p className="text-sm font-bold text-slate-800 tracking-wide mb-1">Loading Official Invoice</p>
        <p className="text-xs text-slate-400">Fetching verified receipt from VillagKart...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">Invoice Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'This invoice link may have expired or is invalid.'}
          </p>
        </div>
      </div>
    );
  }

  // Calculations
  const rawItems = order.items || [];
  const totalAmount = Number(order.totalAmount || 0);
  const deliveryFee = Number(order.deliveryCharge || 0);
  const couponDiscount = Number(order.couponDiscount || (order.couponCode ? order.discount : 0) || 0);
  const couponCode = order.couponCode ? String(order.couponCode).toUpperCase() : null;

  const subTotalMRP = rawItems.reduce((sum: number, i: any) => {
    const q = Number(i.quantity || 1);
    const isFree = i.isFree === true || i.product?.isFree === true;
    const itemPrice =
      i.sellingPrice !== undefined && i.sellingPrice !== null ? Number(i.sellingPrice) :
      i.finalPrice !== undefined && i.finalPrice !== null ? Number(i.finalPrice) :
      i.unitPrice !== undefined && i.unitPrice !== null ? Number(i.unitPrice) :
      i.price !== undefined && i.price !== null ? Number(i.price) :
      i.totalPrice !== undefined && i.totalPrice !== null ? Number(i.totalPrice) / q :
      Number(i.product?.sellingPrice ?? i.product?.finalPrice ?? i.product?.price ?? 0);
    const p = isFree ? 0 : itemPrice;
    const rawProdPrice = Number(i.product?.price ?? 0);
    const m = Number(i.mrp ?? i.product?.mrp ?? (i.discount ? p + Number(i.discount) : (rawProdPrice > p ? rawProdPrice : p)));
    return sum + (m > 0 ? m : p) * q;
  }, 0) || totalAmount;

  const totalSavings = Math.max(0, subTotalMRP - (totalAmount - deliveryFee));
  const productDiscount = Math.max(0, totalSavings - couponDiscount);

  const totalTax = rawItems.reduce((sum: number, item: any) => {
    const rate = Number(item.gst || item.taxRate || item.product?.taxRate || 0);
    const q = Number(item.quantity || 1);
    const isFree = item.isFree === true || item.product?.isFree === true;
    const p = isFree ? 0 : Number(
      item.unitPrice ?? item.sellingPrice ?? item.finalPrice ?? item.price ??
      (item.totalPrice !== undefined ? Number(item.totalPrice) / q : null) ??
      item.product?.sellingPrice ?? item.product?.price ?? 0
    );
    if (rate <= 0 || p === 0) return sum;
    const taxable = (p * q) / (1 + rate / 100);
    return sum + ((p * q) - taxable);
  }, 0);

  const taxableAmount = Math.max(0, totalAmount - deliveryFee - totalTax);

  const orderDateObj = new Date(order.createdAt || order.orderDate || Date.now());
  const dateFormatted = orderDateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeFormatted = orderDateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const cleanInvoiceNo = invoiceNo.startsWith('VK-') ? invoiceNo : `VK-${invoiceNo}`;

  const customerName = order.customerName || order.consumer?.name || order.customer?.name || '';
  const customerMobile = order.mobile || order.customerMobile || order.consumer?.phone || order.customer?.mobile || '';

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col antialiased selection:bg-emerald-500 selection:text-white pb-24 md:pb-12">
      {/* ── Sticky Top Header ── */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200/80 sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Invoice Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <img
              src={villagKartLogo}
              alt="VillagKart Logo"
              className="h-8 sm:h-10 w-auto object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-lg truncate">
                  VillagKart
                </span>
                <span className="hidden xs:inline-flex items-center text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Tax Invoice
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
                #{cleanInvoiceNo} &bull; {dateFormatted}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Share / Copy */}
            <button
              onClick={handleShare}
              title="Share Invoice Link"
              className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} />}
              <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Share'}</span>
            </button>

            {/* Print (Hidden on small mobile) */}
            <button
              onClick={handlePrint}
              disabled={isDownloading}
              title="Print Invoice"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            {/* Download PDF Button (Desktop & Header) */}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mode Switcher & Content ── */}
      <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 flex-1 flex flex-col gap-4 sm:gap-6">
        {/* Responsive Segmented Tabs */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl border border-slate-300/60 shadow-inner">
            <button
              onClick={() => setActiveTab('receipt')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'receipt'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt size={16} className={activeTab === 'receipt' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Digital Receipt</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={16} className={activeTab === 'pdf' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Official PDF Document</span>
            </button>
          </div>

          {/* Quick Note */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <CheckCircle size={14} className="text-emerald-600" />
            <span>Verified Official Tax Invoice</span>
          </div>
        </div>

        {/* ── TAB 1: DIGITAL RECEIPT VIEW ── */}
        {activeTab === 'receipt' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Left Column (8 cols): Order Items & Savings */}
            <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
              {/* Savings Announcement Banner (if any) */}
              {totalSavings > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 text-amber-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Total Savings on this Bill
                      </p>
                      <p className="text-base sm:text-lg font-black text-amber-950">
                        ₹{Math.round(totalSavings)} Saved
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold bg-amber-100/80 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
                    VillagKart Member Price
                  </span>
                </div>
              )}

              {/* Items Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <Package size={17} className="text-emerald-600" />
                    <span>Purchased Items ({rawItems.length})</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    Price Breakdown
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {rawItems.map((item: any, idx: number) => {
                    const name = item.product?.name || item.name || item.productName || 'Product';
                    const qty = Number(item.quantity || item.qty || 1);
                    const isExplicitFree = item.isFree === true || item.product?.isFree === true;
                    const rawItemPrice =
                      item.sellingPrice !== undefined && item.sellingPrice !== null ? Number(item.sellingPrice) :
                      item.finalPrice !== undefined && item.finalPrice !== null ? Number(item.finalPrice) :
                      item.unitPrice !== undefined && item.unitPrice !== null ? Number(item.unitPrice) :
                      item.price !== undefined && item.price !== null ? Number(item.price) :
                      item.totalPrice !== undefined && item.totalPrice !== null ? Number(item.totalPrice) / qty :
                      null;
                    const rawProductPrice = Number(item.product?.sellingPrice ?? item.product?.finalPrice ?? item.product?.price ?? 0);
                    const price = isExplicitFree ? 0 : (rawItemPrice !== null && !isNaN(rawItemPrice) ? rawItemPrice : rawProductPrice);
                    const isItemFree = isExplicitFree || price === 0;
                    const rawMrp = Number(item.mrp ?? item.product?.mrp ?? 0);
                    const mrp = Math.round(rawMrp > 0 ? rawMrp : (item.discount ? price + Number(item.discount) : (rawProductPrice > price ? rawProductPrice : price)));
                    const itemTotal = isItemFree ? 0 : Math.round(price * qty);
                    const itemImage = item.product?.image || item.product?.images?.[0] || item.image;
                    const gstRate = Number(item.gst || item.taxRate || item.product?.taxRate || 0);

                    return (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Item Image / Fallback Icon */}
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/70 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package size={20} className="text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-medium">
                              <span className="font-bold text-slate-700">Qty: {qty}</span>
                              <span>&bull;</span>
                              <span>{isItemFree ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${Math.round(price)} each`}</span>
                              {mrp > price && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span className="line-through text-slate-400">MRP ₹{mrp}</span>
                                </>
                              )}
                              {gstRate > 0 && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold ml-1">
                                  GST {gstRate}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm sm:text-base font-black text-slate-900">
                            {isItemFree ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${itemTotal}`}
                          </p>
                          {mrp > price && (
                            <p className="text-[10px] font-bold text-emerald-600">
                              Save ₹{(mrp - price) * qty}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column (4 cols): Bill Summary & Metadata */}
            <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
              {/* Payment & Bill Summary Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Bill Summary
                  </h3>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle size={12} />
                    {order.paymentMode ? `PAID (${order.paymentMode})` : 'PAID'}
                  </span>
                </div>

                {/* Subtotals List */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Subtotal (MRP)</span>
                    <span className="font-bold text-slate-800">₹{Math.round(subTotalMRP)}</span>
                  </div>

                  {productDiscount > 0 && (
                    <div className="flex justify-between items-center text-amber-700 font-semibold">
                      <span>Product Discount</span>
                      <span className="font-bold">- ₹{Math.round(productDiscount)}</span>
                    </div>
                  )}

                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 font-semibold">
                      <span>Coupon {couponCode ? `(${couponCode})` : 'Discount'}</span>
                      <span className="font-bold">- ₹{Math.round(couponDiscount)}</span>
                    </div>
                  )}

                  {deliveryFee > 0 && (
                    <div className="flex justify-between items-center text-slate-600 font-medium">
                      <span>Delivery Fee</span>
                      <span className="font-bold text-slate-800">₹{Math.round(deliveryFee)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-500 font-medium">
                    <span>Taxable Value</span>
                    <span>₹{Math.round(taxableAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 font-medium">
                    <span>Total GST (Included)</span>
                    <span>₹{Math.round(totalTax)}</span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="flex justify-between items-center text-amber-800 font-semibold bg-amber-50/80 p-2 rounded-xl border border-amber-200/60">
                      <span>Total Savings</span>
                      <span className="font-bold">₹{Math.round(totalSavings)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <div>
                      <p className="text-xs uppercase font-extrabold tracking-wider text-slate-600">
                        Grand Total
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">Inclusive of all taxes</p>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 tracking-tight">
                      ₹{Math.round(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Download PDF CTA Inside Card */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-3 px-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span>Download Official PDF Invoice</span>
                </button>
              </div>

              {/* Order Meta Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3.5 text-xs">
                <h4 className="text-xs uppercase font-black tracking-wider text-slate-400">
                  Order Details
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <Calendar size={15} className="text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-slate-500">Date:</span>
                    <span className="font-bold ml-auto">{dateFormatted} &bull; {timeFormatted}</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-700">
                    <CreditCard size={15} className="text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-slate-500">Payment Mode:</span>
                    <span className="font-bold ml-auto">{order.paymentMode || 'CASH'}</span>
                  </div>

                  {order.deliverySlot && (
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                      </svg>
                      <span className="font-medium text-slate-500">Delivery Slot:</span>
                      <span className="font-bold ml-auto">{order.deliverySlot}</span>
                    </div>
                  )}

                  {customerName && (
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <User size={15} className="text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-500">Customer:</span>
                      <span className="font-bold ml-auto truncate max-w-[140px]">{customerName}</span>
                    </div>
                  )}

                  {customerMobile && (
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <Phone size={15} className="text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-500">Mobile:</span>
                      <span className="font-bold ml-auto">{customerMobile}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: OFFICIAL PDF VIEW ── */}
        {activeTab === 'pdf' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* PDF Toolbar */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-600" />
                <span>VillagKart Tax Invoice (A4 Standard)</span>
              </div>

              <div className="flex items-center gap-2">
                {pdfBlobUrl && (
                  <a
                    href={pdfBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    <span>Open Fullscreen</span>
                  </a>
                )}

                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>Save PDF</span>
                </button>
              </div>
            </div>

            {/* Embedded PDF container */}
            <div className="w-full bg-slate-200/80 p-2 sm:p-5 flex justify-center min-h-[500px]">
              {isPdfLoading ? (
                <div className="flex flex-col items-center justify-center p-16">
                  <Loader2 size={32} className="text-emerald-600 animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Generating Official PDF...
                  </p>
                </div>
              ) : pdfBlobUrl ? (
                <iframe
                  src={`${pdfBlobUrl}#view=FitH`}
                  title={`VillagKart Tax Invoice VK-${invoiceNo}`}
                  className="w-full max-w-4xl h-[650px] sm:h-[850px] rounded-2xl border border-slate-300 shadow-lg bg-white"
                />
              ) : (
                <div className="text-center p-12">
                  <p className="text-sm text-slate-500 mb-3">Unable to display PDF preview directly.</p>
                  <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                  >
                    Download Invoice PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Sticky Mobile Bottom CTA Bar (App-style 1-tap download on phones) ── */}
      <aside aria-label="Mobile actions" className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Paid</p>
            <p className="text-lg font-black text-emerald-600 leading-none">
              ₹{Math.round(totalAmount)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              title="Share Bill"
            >
              {copied ? <Check size={18} className="text-emerald-600" /> : <Share2 size={18} />}
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Footer ── */}
      <footer className="mt-auto py-6 text-center text-slate-400 text-xs font-semibold">
        &copy; {new Date().getFullYear()} VillagKart &bull; Shop any Time, Save Everytime
      </footer>
    </div>
  );
}
