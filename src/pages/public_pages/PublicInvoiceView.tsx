// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { URL as configURL } from '../../config';
import { jsPDF } from 'jspdf';
import villagKartLogo from '../../assets/vk.png';
import { Loader2, Download, Printer, CheckCircle, Package } from 'lucide-react';

const containsUnicode = (str: string) => /[^\x00-\x7F]/.test(str);

const drawUnicodeText = (pdf: any, text: string, x: number, y: number, options: any = {}) => {
  const fontSize = options.fontSize || 9;
  const isBold = options.isBold || false;
  const align = options.align || 'left';
  const color = options.color || [15, 23, 42];

  if (!containsUnicode(text)) {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    pdf.text(text, x, y, { align: align === 'right' ? 'right' : 'left' });
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scale = 4;
  const canvasFontSize = fontSize * scale;
  ctx.font = `${isBold ? 'bold' : 'normal'} ${canvasFontSize}px "Segoe UI", "Noto Sans Telugu", "Gidugu", "Helvetica Neue", Arial, sans-serif`;

  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = canvasFontSize * 1.25;

  canvas.width = textWidth + 10;
  canvas.height = textHeight + 10;

  ctx.font = `${isBold ? 'bold' : 'normal'} ${canvasFontSize}px "Segoe UI", "Noto Sans Telugu", "Gidugu", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgb(${color.join(',')})`;
  ctx.fillText(text, 5, canvas.height / 2);

  const imgData = canvas.toDataURL('image/png');
  const heightInMm = fontSize * 0.352778 * 1.25;
  const widthInMm = (textWidth / canvasFontSize) * fontSize * 0.352778;

  let targetX = x;
  if (align === 'right') {
    targetX = x - widthInMm;
  } else if (align === 'center') {
    targetX = x - (widthInMm / 2);
  }

  const targetY = y - (heightInMm * 0.72);
  pdf.addImage(imgData, 'PNG', targetX, targetY, widthInMm, heightInMm);
};

export default function PublicInvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const rawBase = (configURL || '').replace(/\/+$/, '');
    
    // Clean and normalize order endpoint
    const fetchEndpoints = [
      `${rawBase}/vsms/orders/${id}`,
      `${rawBase}/orders/${id}`,
      `${rawBase}/agent/orders/${id}`
    ];

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
        } catch (err) {
          console.warn(`Failed fetching from ${endpoint}:`, err?.response?.status || err?.message);
        }
      }
      setError('Invoice could not be loaded or expired.');
      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  const getInvoiceNumber = (o: any) => o?.orderNumber ? String(o.orderNumber) : String(o?.id).replace(/\D/g, '').slice(0, 6) || '000000';

  const downloadPDF = async () => {
    if (!order) return;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const margin = 14;

    pdf.setFillColor(16, 185, 129);
    pdf.rect(0, 0, pageWidth, 24, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VILLAGKART TAX INVOICE', margin, 16);

    pdf.setFontSize(10);
    pdf.text(`#VK-${getInvoiceNumber(order)}`, pageWidth - margin, 16, { align: 'right' });

    let y = 36;
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Customer: ${order.customerName || order.customer?.name || 'Customer'}`, margin, y);
    pdf.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
    y += 8;

    pdf.text(`Mobile: ${order.customerMobile || order.mobile || order.customer?.mobile || 'N/A'}`, margin, y);
    pdf.text(`Payment: ${order.paymentMode || 'CASH'}`, pageWidth - margin, y, { align: 'right' });
    y += 14;

    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y - 6, pageWidth - margin * 2, 8, 'F');
    pdf.text('Item Description', margin + 2, y);
    pdf.text('Qty', 140, y, { align: 'center' });
    pdf.text('Amount (Rs.)', pageWidth - margin - 2, y, { align: 'right' });
    y += 8;

    (order.items || []).forEach((item: any) => {
      const name = item.product?.name || item.name || 'Product';
      const qty = item.quantity || 1;
      const amt = (item.price || item.unitPrice || 0) * qty;

      drawUnicodeText(pdf, name, margin + 2, y, { fontSize: 9 });
      pdf.text(String(qty), 140, y, { align: 'center' });
      pdf.text(`Rs. ${Math.round(amt)}`, pageWidth - margin - 2, y, { align: 'right' });
      y += 8;
    });

    y += 6;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(16, 185, 129);
    pdf.text('Total Amount Paid:', margin + 2, y);
    pdf.text(`Rs. ${Math.round(order.totalAmount || 0)}`, pageWidth - margin - 2, y, { align: 'right' });

    pdf.save(`VillagKart_Invoice_VK-${getInvoiceNumber(order)}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 size={36} className="text-emerald-600 animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading invoice...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-sm text-center">
          <p className="text-sm font-bold text-slate-800">{error || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 flex flex-col items-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-black">VillagKart Invoice</h1>
          <p className="text-xs text-emerald-100 font-medium">#VK-{getInvoiceNumber(order)}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Date & Time</p>
              <p className="font-semibold text-slate-700">{new Date(order.createdAt || Date.now()).toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Payment</p>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
                {order.paymentMode || 'PAID'}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <p className="text-xs uppercase font-black text-slate-400 tracking-wider">Purchased Items</p>
            <div className="divide-y divide-slate-100">
              {(order.items || []).map((item: any, idx: number) => (
                <div key={idx} className="py-2.5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800 text-xs">{item.product?.name || item.name || 'Item'}</p>
                    <p className="text-[11px] text-slate-400">Qty: {item.quantity || 1} × ₹{Math.round(item.price || item.unitPrice || 0)}</p>
                  </div>
                  <span className="font-bold text-slate-800 text-sm">
                    ₹{Math.round((item.price || item.unitPrice || 0) * (item.quantity || 1))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
            <span className="font-bold text-slate-600">Total Paid</span>
            <span className="text-2xl font-black text-emerald-600">₹{Math.round(order.totalAmount || 0)}</span>
          </div>

          {/* Actions */}
          <div className="pt-3">
            <button
              onClick={downloadPDF}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download size={18} />
              <span>Download Official PDF Invoice</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-50 py-3 text-center border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Thank you for shopping with VillagKart!
        </div>
      </div>
    </div>
  );
}
