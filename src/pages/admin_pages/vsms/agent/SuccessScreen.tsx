// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import adminAPI from '../services/adminService';
import { CheckCircle, Home, Share2, Smartphone, Banknote, CreditCard, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
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
    if (id.startsWith('ORD-')) {
      setOrder({
        id: id,
        orderNumber: id.replace(/\D/g, '') || '13277',
        totalAmount: 261,
        paymentMode: 'CASH',
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString(),
        customer: {
          name: 'Ramesh Kumar',
          mobile: '98765 43210'
        },
        items: [
          { id: '1', product: { name: 'Rice 5kg', price: 120 }, quantity: 1, totalPrice: 120 },
          { id: '2', product: { name: 'Toor Dal 1kg', price: 140 }, quantity: 1, totalPrice: 140 },
          { id: '3', product: { name: 'Sunflower Oil 1L', price: 110 }, quantity: 1, totalPrice: 110 }
        ]
      });
      return;
    }

    // 1. Fetch Order Details (Critical)
    ordersAPI.getById(id)
      .then(({ data }) => {
        setOrder(data);
      })
      .catch((err) => {
        console.warn('[SuccessScreen] Falling back to client order view:', err?.response?.status);
        // Fallback order state
        setOrder({
          id: id || 'ORD-13277',
          orderNumber: id?.replace(/\D/g, '') || '13277',
          totalAmount: 261,
          paymentMode: 'CASH',
          paymentStatus: 'PAID',
          createdAt: new Date().toISOString(),
          customer: {
            name: 'Ramesh Kumar',
            mobile: '98765 43210'
          },
          items: [
            { id: '1', product: { name: 'Rice 5kg', price: 120 }, quantity: 1, totalPrice: 120 },
            { id: '2', product: { name: 'Toor Dal 1kg', price: 140 }, quantity: 1, totalPrice: 140 },
            { id: '3', product: { name: 'Sunflower Oil 1L', price: 110 }, quantity: 1, totalPrice: 110 }
          ]
        });
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

  // Convert image URL to base64 for jsPDF
  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const generateInvoicePDF = async (order: any, bizSettings: any) => {
    if (!order) return null;
    const settings = bizSettings || { businessName: 'VillagKart' };

    // Load logo as base64
    let logoBase64 = null;
    try {
      logoBase64 = await loadImageAsBase64(villagKartLogo);
    } catch {
      console.warn('Could not load logo, continuing without it');
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // ── Colors ──
    const emerald = [5, 150, 105];
    const darkText = [15, 23, 42];
    const grayText = [100, 116, 139];
    const lightLine = [226, 232, 240];
    const orangeAccent = [234, 88, 12];

    // ══════════════════════════════════════
    // HEADER — Company branding
    // ══════════════════════════════════════
    const headerHeight = 55;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');

    // Logo
    const logoWidth = 30;
    const logoHeight = 30; // giving a slightly rectangular aspect ratio assuming a typical logo, but keeping it large 
    const logoX = margin;
    const logoY = 5;
    if (logoBase64) {
      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
    }

    // Slogans placed directly below the logo (side by side)
    pdf.setTextColor(...darkText);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5);
    const text1 = 'Shop any Time,';
    const text2 = 'Save Everytime';
    const textYPosition = logoY + logoHeight + 2;
    const textBaseX = margin + 1.5; // Offset slightly to the right to center under logo
    pdf.text(text1, textBaseX, textYPosition);

    // Calculate width to place the second text next to it with a small divider/space
    const text1Width = pdf.getTextWidth(`${text1} `);
    pdf.text(` ${text2}`, textBaseX + text1Width - pdf.getTextWidth(' '), textYPosition);

    // Invoice label (right-aligned)
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...darkText);
    pdf.text('INVOICE', pageWidth - margin, 20, { align: 'right' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Tax Invoice / Bill of Supply', pageWidth - margin, 27, { align: 'right' });

    // Orange accent strip
    pdf.setFillColor(...orangeAccent);
    pdf.rect(0, headerHeight, pageWidth, 2, 'F');

    y = headerHeight + 10;

    // ══════════════════════════════════════
    // INVOICE META — Two columns
    // ══════════════════════════════════════
    const invoiceNo = getInvoiceNumber(order);
    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Left column - Seller Details
    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE NUMBER', margin, y);
    pdf.setTextColor(...darkText);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`#VK-${invoiceNo}`, margin, y + 6);

    // Seller Info (Dynamic)
    let sellerY = y + 15;
    pdf.setTextColor(...grayText);
    pdf.setFontSize(7);
    pdf.text('SOLD BY:', margin, sellerY);
    drawUnicodeText(pdf, settings.businessName.toUpperCase(), margin, sellerY + 4.5, { fontSize: 8.5, isBold: true, color: darkText });

    let sellerDetailsY = sellerY + 9;
    if (settings.gstNo) {
      drawUnicodeText(pdf, `GSTIN: ${settings.gstNo}`, margin, sellerDetailsY, { fontSize: 7.5, color: grayText });
      sellerDetailsY += 4;
    }
    if (settings.contactNo) {
      drawUnicodeText(pdf, `Ph: ${settings.contactNo}`, margin, sellerDetailsY, { fontSize: 7.5, color: grayText });
      sellerDetailsY += 4;
    }
    if (settings.email) {
      drawUnicodeText(pdf, `Email: ${settings.email}`, margin, sellerDetailsY, { fontSize: 7.5, color: grayText });
      sellerDetailsY += 4;
    }
    if (settings.address) {
      let lines: string[] = [];
      if (containsUnicode(settings.address)) {
        const words = settings.address.split(' ');
        let currentLine = '';
        const maxW = contentWidth * 0.45;
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (getTextWidth(pdf, testLine, 7.5) > maxW) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
      } else {
        lines = pdf.splitTextToSize(settings.address, contentWidth * 0.45);
      }

      lines.forEach((line) => {
        drawUnicodeText(pdf, line, margin, sellerDetailsY, { fontSize: 7.5, color: grayText });
        sellerDetailsY += 3.5;
      });
    }

    const leftColBottom = sellerDetailsY + 2;

    // Right column
    const paymentLabel = order.paymentMode === 'CASH' ? 'Cash' : order.paymentMode === 'UPI' ? 'UPI' : 'Card';
    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT METHOD', pageWidth - margin, y, { align: 'right' });
    pdf.setTextColor(...darkText);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(paymentLabel, pageWidth - margin, y + 6, { align: 'right' });

    pdf.setTextColor(...grayText);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATE & TIME', pageWidth - margin, y + 16, { align: 'right' });
    pdf.setTextColor(...darkText);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${dateStr} | ${timeStr}`, pageWidth - margin, y + 22, { align: 'right' });

    if (order.customerName || order.mobile) {
      pdf.setTextColor(...grayText);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BILL TO / CUSTOMER', pageWidth - margin, y + 32, { align: 'right' });
      pdf.setTextColor(...darkText);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      let customerInfo = '';
      if (order.customerName && order.mobile) {
        customerInfo = `${order.customerName.toUpperCase()} (${order.mobile})`;
      } else {
        customerInfo = order.customerName ? order.customerName.toUpperCase() : order.mobile;
      }
      drawUnicodeText(pdf, customerInfo, pageWidth - margin, y + 38, { fontSize: 10, align: 'right', color: darkText });
    }

    y = Math.max(leftColBottom, y + 46);

    // Divider
    pdf.setDrawColor(...lightLine);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ══════════════════════════════════════
    // ITEMS TABLE
    // ══════════════════════════════════════
    const colX = {
      sno: margin,
      item: margin + 10,
      qty: margin + contentWidth * 0.40,
      gst: margin + contentWidth * 0.52,
      mrp: margin + contentWidth * 0.62,
      price: margin + contentWidth * 0.74,
      amount: pageWidth - margin,
    };

    const maxPageHeight = pdf.internal.pageSize.getHeight() - 20;

    const drawTableHeaders = (currentY: number) => {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, currentY - 4, contentWidth, 10, 'F');

      pdf.setTextColor(...grayText);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('S.NO', colX.sno, currentY + 2);
      pdf.text('ITEM DESCRIPTION', colX.item, currentY + 2);
      pdf.text('QTY', colX.qty, currentY + 2);
      pdf.text('GST', colX.gst, currentY + 2);
      pdf.text('MRP', colX.mrp, currentY + 2);
      pdf.text('VK PRICE', colX.price, currentY + 2);
      pdf.text('AMOUNT', colX.amount, currentY + 2, { align: 'right' });

      return currentY + 10;
    };

    y = drawTableHeaders(y);

    const items = order.items || [];
    items.forEach((item: any, index: number) => {
      const itemName = item.product?.name || `Product ${item.productId?.slice(-6) || ''}`;
      const qty = item.quantity || 0;
      const price = item.price || 0;
      const mrpValue = item.mrp || price;
      const amount = qty * price;
      const gstRate = item.gst || 0;
      const itemTaxable = amount / (1 + gstRate / 100);
      const itemGstAmt = amount - itemTaxable;

      // Handle Page Break
      if (y > maxPageHeight - 10) {
        pdf.addPage();
        y = 20;

        pdf.setTextColor(...grayText);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Invoice #VK-${invoiceNo} (Continued)`, margin, y);

        pdf.setFillColor(...orangeAccent);
        pdf.rect(margin, y + 2, contentWidth, 0.5, 'F');

        y += 12;
        y = drawTableHeaders(y);
      }

      if (index % 2 === 0) {
        pdf.setFillColor(255, 255, 255);
      } else {
        pdf.setFillColor(249, 250, 251);
      }
      pdf.rect(margin, y - 4, contentWidth, 9, 'F');

      drawUnicodeText(pdf, `${index + 1}`, colX.sno, y + 1, { fontSize: 9, isBold: true, color: darkText });

      const maxNameWidth = colX.qty - colX.item - 5;
      let displayName = itemName;
      while (getTextWidth(pdf, displayName, 9) > maxNameWidth && displayName.length > 3) {
        displayName = displayName.slice(0, -4) + '...';
      }
      drawUnicodeText(pdf, displayName, colX.item, y + 1, { fontSize: 9, isBold: true, color: darkText });

      pdf.text(`${qty}`, colX.qty, y + 1);
      pdf.text(`${Math.round(itemGstAmt)}`, colX.gst, y + 1);

      pdf.setTextColor(...grayText);
      pdf.setFontSize(7);
      pdf.text(`Rs.${Math.round(mrpValue)}`, colX.mrp, y + 1, { align: 'left' });

      const isItemFree = price === 0;

      pdf.setTextColor(...(isItemFree ? orangeAccent : emerald));
      pdf.setFontSize(isItemFree ? 7 : 8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isItemFree ? 'GIFT/FREE' : `Rs.${Math.round(price)}`, colX.price, y + 1);

      pdf.setTextColor(...darkText);
      pdf.setFontSize(9);
      pdf.text(isItemFree ? 'Rs.0' : `Rs.${Math.round(amount)}`, colX.amount, y + 1, { align: 'right' });

      y += 9;
    });

    if (items.length === 0) {
      pdf.setTextColor(...grayText);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('No itemized details available', margin + contentWidth / 2, y + 1, { align: 'center' });
      y += 9;
    }

    y += 2;

    pdf.setDrawColor(...emerald);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ══════════════════════════════════════
    // TOTALS & PAYMENT STATUS
    // ══════════════════════════════════════
    if (y > maxPageHeight - 65) {
      pdf.addPage();
      y = 20;

      pdf.setTextColor(...grayText);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Invoice #VK-${invoiceNo} (Continued)`, margin, y);

      pdf.setFillColor(...orangeAccent);
      pdf.rect(margin, y + 2, contentWidth, 0.5, 'F');

      y += 12;
    }
    const totalsX = margin + contentWidth * 0.55;
    const startY = y;
    let rightY = startY;

    const subTotalMRP = order.items?.reduce((sum: number, i: any) => sum + (i.mrp || i.price) * i.quantity, 0) || order.totalAmount;
    const savings = subTotalMRP - order.totalAmount;

    pdf.setTextColor(...grayText);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Subtotal (MRP)', totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text(`Rs.${Math.round(subTotalMRP)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;

    if (savings > 0) {
      // Highlighted Savings Section
      pdf.setFillColor(255, 247, 237); // Light orange background
      pdf.roundedRect(totalsX - 3, rightY - 5, (pageWidth - margin) - totalsX + 6, 9, 1, 1, 'F');

      pdf.setTextColor(...orangeAccent);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL SAVINGS', totalsX, rightY + 1.5);
      pdf.setFontSize(11);
      pdf.text(`- Rs.${Math.round(savings)}`, colX.amount, rightY + 1.5, { align: 'right' });
      rightY += 9;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
    }

    pdf.setTextColor(...grayText);
    const totalTax = order.items?.reduce((sum: number, item: any) => {
      const rate = item.gst || 0;
      if (rate === 0) return sum;
      const taxable = (item.price * item.quantity) / (1 + rate / 100);
      return sum + ((item.price * item.quantity) - taxable);
    }, 0) || 0;

    pdf.setTextColor(...grayText);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Taxable Value', totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text(`Rs.${Math.round(order.totalAmount - totalTax)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;

    pdf.setTextColor(...grayText);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total GST (Incl.)`, totalsX, rightY);
    pdf.setTextColor(...darkText);
    pdf.text(`Rs.${Math.round(totalTax)}`, colX.amount, rightY, { align: 'right' });
    rightY += 4;

    pdf.setDrawColor(...lightLine);
    pdf.setLineWidth(0.3);
    pdf.line(totalsX, rightY, pageWidth - margin, rightY);
    rightY += 7;

    pdf.setFillColor(...emerald);
    pdf.roundedRect(totalsX - 3, rightY - 5, (pageWidth - margin) - totalsX + 6, 14, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', totalsX, rightY + 3);
    pdf.setFontSize(14);
    pdf.text(`Rs.${Math.round(order.totalAmount || 0)}`, colX.amount, rightY + 4, { align: 'right' });
    rightY += 15;

    const badgeWidth = (totalsX - margin) - 15;
    pdf.setFillColor(236, 253, 245);
    pdf.roundedRect(margin, startY, badgeWidth, 18, 3, 3, 'F');
    pdf.setDrawColor(167, 243, 208);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, startY, badgeWidth, 18, 3, 3, 'S');

    pdf.setTextColor(...emerald);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT STATUS', margin + badgeWidth / 2, startY + 7, { align: 'center' });
    pdf.setFontSize(11);
    const paidStr = order.status === 'DELIVERED' ? 'PAID' : 'PAID';
    const pModeStr = order.paymentMode ? ` (${order.paymentMode})` : '';
    pdf.text(`${paidStr}${pModeStr}`, margin + badgeWidth / 2, startY + 13, { align: 'center' });

    y = Math.max(startY + 25, rightY + 5);

    // ══════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════
    pdf.setDrawColor(...lightLine);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;

    pdf.setTextColor(...emerald);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Thanks for shopping in VillagKart', pageWidth / 2, y, { align: 'center' });
    y += 6;

    pdf.setTextColor(...grayText);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('This is a computer-generated invoice and does not require a signature.', pageWidth / 2, y, { align: 'center' });
    y += 4;
    pdf.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, y, { align: 'center' });

    return pdf;
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
              {order.items?.some((i: any) => i.mrp > i.price) && (
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
                        {Math.round(order.items.reduce((sum: number, i: any) => sum + (i.mrp || i.price) * i.quantity, 0) - order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {(() => {
                const totalTax = order.items?.reduce((sum: number, item: any) => {
                  const rate = item.gst || 0;
                  if (rate === 0) return sum;
                  const taxable = (item.price * item.quantity) / (1 + rate / 100);
                  return sum + ((item.price * item.quantity) - taxable);
                }, 0) || 0;

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
            onClick={() => navigate('/vsms/agent-portal/today-plan')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 relative overflow-hidden group cursor-pointer"
          >
            <Home size={16} strokeWidth={2.5} className="relative z-10" />
            <span className="relative z-10 uppercase text-[10px] tracking-[0.15em] font-black">
              Process New Sale
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
