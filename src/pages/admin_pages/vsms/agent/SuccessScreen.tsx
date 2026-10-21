// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import adminAPI from '../services/adminService';
import { CheckCircle, Home, Share2, Smartphone, Banknote, CreditCard, Download, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateInvoicePDF, getInvoiceNumber } from '../../../../utils/generateInvoicePDF';
import villagKartLogo from '../../../../assets/vk.png';

const containsUnicode = (str: string) => /[^\x00-\x7F]/.test(str);

const getTextWidth = (pdf: any, text: string, fontSize: number) => {
  if (!containsUnicode(text)) {
    pdf.setFontSize(fontSize);
    return pdf.getTextWidth(text);
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = `${fontSize}px "Segoe UI", "Noto Sans Telugu", "Gidugu", Arial, sans-serif`;
  return ctx.measureText(text).width * 0.264583;
};

const drawUnicodeText = (pdf: any, text: string, x: number, y: number, options: any = {}) => {
  const fontSize = options.fontSize || 9;
  const isBold = options.isBold || false;
  const align = options.align || 'left';
  const color = options.color || [15, 23, 42]; // default darkText

  if (!containsUnicode(text)) {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    pdf.text(text, x, y, { align: align === 'right' ? 'right' : 'left' });
    return;
  }

  // Draw Unicode text to canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Set scale for high resolution rendering
  const scale = 4;
  const canvasFontSize = fontSize * scale;
  ctx.font = `${isBold ? 'bold' : 'normal'} ${canvasFontSize}px "Segoe UI", "Noto Sans Telugu", "Gidugu", "Helvetica Neue", Arial, sans-serif`;
  
  // Measure text
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = canvasFontSize * 1.25;
  
  canvas.width = textWidth + 10;
  canvas.height = textHeight + 10;
  
  // Re-apply style
  ctx.font = `${isBold ? 'bold' : 'normal'} ${canvasFontSize}px "Segoe UI", "Noto Sans Telugu", "Gidugu", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgb(${color.join(',')})`;
  ctx.fillText(text, 5, canvas.height / 2);
  
  const imgData = canvas.toDataURL('image/png');
  
  // Convert canvas size to PDF mm dimensions
  const heightInMm = fontSize * 0.352778 * 1.25;
  const widthInMm = (textWidth / canvasFontSize) * fontSize * 0.352778;
  
  let targetX = x;
  if (align === 'right') {
    targetX = x - widthInMm;
  } else if (align === 'center') {
    targetX = x - (widthInMm / 2);
  }
  
  // Base offset to align nicely with pdf.text baseline
  const targetY = y - (heightInMm * 0.72);
  
  pdf.addImage(imgData, 'PNG', targetX, targetY, widthInMm, heightInMm);
};

export default function SuccessScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const getInvoiceNumber = (o: any) => o?.orderNumber ? String(o.orderNumber) : String(o?.id).replace(/\D/g, '').slice(0, 6) || '000000';

  useEffect(() => {
    if (!id) return;

    // 1. Fetch Order Details (Critical)
    ordersAPI.getById(id)
      .then(({ data }) => {
        setOrder(data);
      })
      .catch((err) => {
        console.warn('[SuccessScreen] Falling back to client order view:', err?.response?.status);
      });

    // 2. Fetch Business Settings (Optional - Don't block order)
    adminAPI.getSettings()
      .then(({ data }) => {
        if (data && data.success) {
          setSettings(data.data);
        }
      })
      .catch((err) => {
        console.warn('[SuccessScreen] Settings Fetch Failed (Likely Permission):', err.response?.status);
        // We don't toast error here because the app survives without these
      });
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!order) return;
    try {
      setIsDownloading(true);
      const pdf = await generateInvoicePDF(order, settings);
      if (!pdf) return;

      const invoiceNo = getInvoiceNumber(order);
      pdf.save(`VillagKart_Invoice_VK-${invoiceNo}.pdf`);
      toast.success('Invoice PDF downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!order) return;

    const invoiceNo = getInvoiceNumber(order);
    
    // Extract customer mobile from all possible order properties
    let rawMobile = order.mobile || order.customerMobile || order.customer?.mobile || '';
    let cleanMobile = String(rawMobile).replace(/\D/g, '');

    // If no mobile number was entered on the order, prompt the agent for it
    if (!cleanMobile || cleanMobile.length < 10) {
      const enteredPhone = window.prompt('Enter customer mobile number for WhatsApp invoice:', cleanMobile || '');
      if (!enteredPhone) return;
      cleanMobile = String(enteredPhone).replace(/\D/g, '');
    }

    if (!cleanMobile || cleanMobile.length < 10) {
      toast.error('Please provide a valid 10-digit mobile number');
      return;
    }

    // Format phone with Indian country code 91 if 10 digits
    const formattedPhone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

    // Detailed receipt text for WhatsApp
    const itemsList = order.items && order.items.length > 0
      ? order.items.map((i: any) => `• ${i.product?.name || i.name || 'Item'} x ${i.quantity || 1} = ₹${Math.round((i.price || i.unitPrice || 0) * (i.quantity || 1))}`).join('\n')
      : '';

    // Generate public invoice URL from .env (fallback to current origin)
    const baseUrl = ((import.meta as any).env?.VITE_PUBLIC_WEB_URL || window.location.origin).replace(/\/+$/, '');
    const publicInvoiceUrl = `${baseUrl}/invoice/${order.id || id}`;

    const text = `🚐 *VillagKart Official Bill Receipt*\n━━━━━━━━━━━━━━━━━━━━\n📄 *Invoice No:* #VK-${invoiceNo}\n📅 *Date:* ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}\n💳 *Payment Mode:* ${order.paymentMode || 'CASH'}\n${itemsList ? `\n🛒 *Items Purchased:*\n${itemsList}\n` : ''}\n💰 *Total Paid:* ₹${Math.round(order.totalAmount || 0)}\n━━━━━━━━━━━━━━━━━━━━\n📥 *View & Download PDF Invoice:*\n👉 ${publicInvoiceUrl}\n━━━━━━━━━━━━━━━━━━━━\n🙏 *Thank you for shopping with VillagKart!*`;

    try {
      setIsDownloading(true);
      const pdf = await generateInvoicePDF(order, settings);
      const fileName = `Invoice_VK-${invoiceNo}.pdf`;

      if (pdf) {
        // Automatically save/download the PDF invoice to the agent's device
        pdf.save(fileName);
      }

      // Direct WhatsApp redirect to the customer's phone number
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
      toast.success('Redirecting directly to WhatsApp with Invoice details!');
    } catch (err) {
      console.error('Share error:', err);
      toast.error('Could not prepare invoice');
    } finally {
      setIsDownloading(false);
    }
  };

  const getPaymentIcon = (mode: string) => {
    switch (mode) {
      case 'CASH': return <Banknote size={16} className="text-emerald-600" />;
      case 'UPI': return <Smartphone size={16} className="text-orange-600" />;
      case 'CARD': return <CreditCard size={16} className="text-emerald-700" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-4 px-4 relative overflow-y-auto">
      {/* Immersive Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-500/10 blur-[80px]" />
      </div>

      <div className="z-10 max-w-[380px] w-full space-y-3 animate-slide-up flex flex-col items-center my-auto">
        {/* Success Icon */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/25 mb-2 border-4 border-white relative">
            <CheckCircle size={32} className="text-white drop-shadow-md relative z-10" strokeWidth={2.5} />
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-125 animate-pulse" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-black text-emerald-950 tracking-tight">Payment Successful!</h1>
          </div>
        </div>

        {/* Order Details */}
        {order ? (
          <div className="glass rounded-3xl p-4 shadow-xl shadow-emerald-900/5 border border-white/80 bg-white/70 space-y-2.5 w-full">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-100/50">
              <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">Transaction ID</span>
              <span className="font-mono font-black text-emerald-900 text-[0.8rem] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">#VK-{getInvoiceNumber(order)}</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">Order Amount</span>
                <span className="font-black text-2xl text-emerald-950 tracking-tighter">₹{Math.round(order.totalAmount || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-emerald-50/50 rounded-xl border border-emerald-50/50">
                <span className="text-[10px] font-black text-emerald-800/50 uppercase tracking-widest ml-1">Payment</span>
                <div className="flex items-center gap-2 font-black text-emerald-900 bg-white border border-emerald-100 px-2 py-1 rounded-lg text-[10px] shadow-sm shadow-emerald-900/5">
                  {getPaymentIcon(order.paymentMode)}
                  <span className="capitalize">{order.paymentMode?.toLowerCase()}</span>
                </div>
              </div>
              {(() => {
                const rawItems = order.items || [];
                const subTotalMRP = rawItems.reduce((sum: number, i: any) => {
                  const q = Number(i.quantity || i.qty || 1);
                  const p = Number(i.price ?? i.unitPrice ?? i.sellingPrice ?? 0);
                  const m = Number(i.mrp ?? i.product?.mrp ?? (p + Number(i.discount || 0)));
                  return sum + (m > 0 ? m : p) * q;
                }, 0) || Number(order.totalAmount || 0);

                const totalPaid = Number(order.totalAmount || 0);
                const deliveryCharge = Number(order.deliveryCharge || 0);
                const savings = Math.max(0, subTotalMRP - (totalPaid - deliveryCharge));

                if (savings <= 0) return null;

                return (
                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/10 border border-emerald-400 group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 transform translate-x-1 -translate-y-1">
                      <CheckCircle size={36} strokeWidth={1} />
                    </div>
                    <div className="relative z-10 flex items-center justify-between px-1">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/70 uppercase tracking-[0.2em]">Extra Benefit</span>
                        <h3 className="text-white font-black text-[10px] uppercase tracking-widest opacity-90">Total Savings</h3>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-white text-xs font-bold">₹</span>
                        <span className="text-xl font-black text-white tracking-tighter">
                          {savings.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const rawItems = order.items || [];
                const totalTax = rawItems.reduce((sum: number, item: any) => {
                  const q = Number(item.quantity || item.qty || 1);
                  const p = Number(item.price ?? item.unitPrice ?? item.sellingPrice ?? 0);
                  const tot = p * q;

                  if (item.taxAmount && Number(item.taxAmount) > 0) {
                    return sum + Number(item.taxAmount);
                  }
                  if (item.cgst || item.sgst) {
                    return sum + Number(item.cgst || 0) + Number(item.sgst || 0);
                  }
                  const rate = Number(
                    item.gst ??
                    item.taxRate ??
                    item.product?.gst ??
                    item.product?.taxRate ??
                    item.taxPercent ??
                    item.product?.taxPercent ??
                    0
                  );
                  if (rate === 0 || tot === 0) return sum;
                  const taxable = tot / (1 + rate / 100);
                  return sum + (tot - taxable);
                }, 0);

                if (totalTax > 0) {
                  return (
                    <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-xl border border-blue-100/30">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Total GST (Included)</span>
                      </div>
                      <span className="font-black text-sm text-blue-600 tracking-tight">₹{totalTax.toFixed(2)}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="pt-2 border-t border-emerald-100/50 text-[9px] font-black text-emerald-800/30 text-center uppercase tracking-widest">
              {new Date(order.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        ) : (
          <div className="glass rounded-[2rem] p-8 flex justify-center bg-white/70 border border-white/80 shadow-xl shadow-emerald-900/5">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1 w-full">
          {order && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleShare}
                className="w-full bg-white text-emerald-700 font-black text-xs py-3 rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-emerald-900/5 border border-emerald-100 hover:bg-emerald-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 size={16} strokeWidth={2.5} />
                <span>Share</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="w-full bg-white text-emerald-700 font-black text-xs py-3 rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-emerald-900/5 border border-emerald-100 hover:bg-emerald-50 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Download size={16} strokeWidth={2.5} />
                <span>{isDownloading ? 'Saving...' : 'PDF'}</span>
              </button>
            </div>
          )}
          <button
            id="new-sale-btn"
            onClick={() => navigate('/vsms/agent-portal/sales')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 relative overflow-hidden group cursor-pointer"
          >
            <ShoppingCart size={16} strokeWidth={2.5} className="relative z-10" />
            <span className="relative z-10 uppercase text-[10px] tracking-[0.15em] font-black">
              Process New Sale
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
