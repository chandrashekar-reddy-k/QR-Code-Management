import { jsPDF } from 'jspdf';
import villagKartLogo from '../assets/vk.png';

interface InvoiceOrder {
  id?: string;
  orderNumber?: string;
  createdAt?: string | Date;
  orderDate?: string | Date;
  paymentMode?: string;
  paymentMethod?: string;
  payment?: any;
  totalAmount?: number;
  deliveryCharge?: number;
  discount?: number;
  couponDiscount?: number;
  couponCode?: string | null;
  customerName?: string;
  mobile?: string;
  customerPhone?: string;
  consumer?: { name?: string; phone?: string; email?: string };
  address?: {
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    pincode?: string;
    location?: any;
  };
  deliveryDate?: string | null;
  deliverySlot?: string | null;
  items?: Array<any>;
  products?: Array<any>;
  [key: string]: any;
}

interface BizSettings {
  businessName?: string;
  gstNo?: string;
  contactNo?: string;
  address?: string;
  [key: string]: any;
}

const containsUnicode = (text: string) => /[\u0C00-\u0C7F\u0900-\u097F]/.test(text || '');

const getTextWidth = (doc: jsPDF, text: string, fontSize: number) => {
  doc.setFontSize(fontSize);
  return doc.getTextWidth(text || '');
};

const drawUnicodeText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: { fontSize?: number; isBold?: boolean; align?: 'left' | 'right' | 'center'; color?: number[] } = {}
) => {
  const { fontSize = 10, isBold = false, align = 'left', color = [15, 23, 42] } = options;
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');
  doc.setTextColor(color[0], color[1], color[2]);

  if (!text) return;

  if (containsUnicode(text)) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      doc.text(text, x, y, { align });
      return;
    }
    const scale = 4;
    const fontStr = `${isBold ? 'bold' : 'normal'} ${fontSize * scale}px "Segoe UI", Roboto, sans-serif`;
    ctx.font = fontStr;

    const metrics = ctx.measureText(text);
    const canvasWidth = Math.ceil(metrics.width) + 20;
    const canvasHeight = Math.ceil(fontSize * scale * 1.5);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.font = fontStr;
    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, 0, 0);

    const imgData = canvas.toDataURL('image/png');
    const widthMm = (canvasWidth / scale) * 0.264583;
    const heightMm = (canvasHeight / scale) * 0.264583;

    let posX = x;
    if (align === 'right') posX = x - widthMm;
    if (align === 'center') posX = x - widthMm / 2;

    doc.addImage(imgData, 'PNG', posX, y - 0.5, widthMm, heightMm);
  } else {
    doc.text(text, x, y, { align });
  }
};

const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Canvas context unavailable'));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const getInvoiceNumber = (o: InvoiceOrder) =>
  o?.orderNumber ? String(o.orderNumber) : String(o?.id || '').replace(/\D/g, '').slice(0, 6) || '000000';

export const generateInvoicePDF = async (order: InvoiceOrder, bizSettings?: BizSettings): Promise<jsPDF | null> => {
  if (!order) return null;
  const currentSettings: BizSettings = bizSettings || { businessName: 'VillagKart' };

  let logoBase64: string | null = null;
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

  // Colors
  const emerald = [5, 150, 105];
  const darkText = [15, 23, 42];
  const grayText = [100, 116, 139];
  const lightLine = [226, 232, 240];
  const orangeAccent = [234, 88, 12];

  // Header Branding
  const headerHeight = 55;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');

  const logoWidth = 30;
  const logoHeight = 30;
  const logoX = margin;
  const logoY = 5;
  if (logoBase64) {
    pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
  }

  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5);
  const text1 = 'Shop any Time,';
  const text2 = 'Save Everytime';
  const textYPosition = logoY + logoHeight + 2;
  const textBaseX = margin + 1.5;
  pdf.text(text1, textBaseX, textYPosition);
  const text1Width = pdf.getTextWidth(`${text1} `);
  pdf.text(` ${text2}`, textBaseX + text1Width - pdf.getTextWidth(' '), textYPosition);

  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text('INVOICE', pageWidth - margin, 20, { align: 'right' });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Tax Invoice / Bill of Supply', pageWidth - margin, 27, { align: 'right' });

  pdf.setFillColor(orangeAccent[0], orangeAccent[1], orangeAccent[2]);
  pdf.rect(0, headerHeight, pageWidth, 2, 'F');

  y = headerHeight + 10;

  // Invoice Meta & Seller Info
  const invoiceNo = getInvoiceNumber(order);
  const orderDate = new Date(order.createdAt || order.orderDate || Date.now());
  const dateStr = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE NUMBER', margin, y);
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`#VK-${invoiceNo}`, margin, y + 6);

  let sellerY = y + 15;
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFontSize(7);
  pdf.text('SOLD BY:', margin, sellerY);
  drawUnicodeText(pdf, (currentSettings.businessName || 'VillagKart').toUpperCase(), margin, sellerY + 4.5, { fontSize: 8.5, isBold: true, color: darkText });

  let sellerDetailsY = sellerY + 9;
  if (currentSettings.gstNo) {
    drawUnicodeText(pdf, `GSTIN: ${currentSettings.gstNo}`, margin, sellerDetailsY, { fontSize: 7.5, color: grayText });
    sellerDetailsY += 4;
  }
  if (currentSettings.contactNo) {
    drawUnicodeText(pdf, `Ph: ${currentSettings.contactNo}`, margin, sellerDetailsY, { fontSize: 7.5, color: grayText });
    sellerDetailsY += 4;
  }
  if (currentSettings.address) {
    let lines: string[] = [];
    if (containsUnicode(currentSettings.address)) {
      const words = currentSettings.address.split(' ');
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
      lines = pdf.splitTextToSize(currentSettings.address, contentWidth * 0.45);
    }

    lines.forEach((line) => {
      drawUnicodeText(pdf, line, margin, sellerDetailsY, { fontSize: 7.5, color: grayText });
      sellerDetailsY += 3.5;
    });
  }

  const leftColBottom = sellerDetailsY + 2;

  // Right column - Payment & Customer
  const modeRaw = order.paymentMode || order.paymentMethod || order.payment?.paymentMode || order.payment?.method || 'CASH';
  const paymentLabel = modeRaw === 'CASH' ? 'Cash' : modeRaw === 'UPI' ? 'UPI' : modeRaw === 'CASH_UPI' ? 'Split (Cash+UPI)' : modeRaw === 'CREDIT' ? 'Credit (Udhar)' : 'Online / Card';

  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PAYMENT METHOD', pageWidth - margin, y, { align: 'right' });
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(paymentLabel, pageWidth - margin, y + 6, { align: 'right' });

  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DATE & TIME', pageWidth - margin, y + 16, { align: 'right' });
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${dateStr} | ${timeStr}`, pageWidth - margin, y + 22, { align: 'right' });

  const cName = order.customerName || order.consumer?.name;
  const cPhone = order.mobile || order.customerPhone || order.consumer?.phone;
  if (cName || cPhone) {
    pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BILL TO / CUSTOMER', pageWidth - margin, y + 32, { align: 'right' });
    let customerInfo = '';
    if (cName && cPhone) {
      customerInfo = `${cName.toUpperCase()} (${cPhone})`;
    } else {
      customerInfo = cName ? cName.toUpperCase() : (cPhone || '');
    }
    drawUnicodeText(pdf, customerInfo, pageWidth - margin, y + 38, { fontSize: 10, align: 'right', color: darkText });
  }

  // Delivery Address if available
  if (order.address) {
    const addrStr = `${order.address.line1 || ''}${order.address.line2 ? ', ' + order.address.line2 : ''}, ${order.address.city || ''}, ${order.address.state || ''} ${order.address.pincode || ''}`;
    drawUnicodeText(pdf, `Delivery: ${addrStr}`, pageWidth - margin, y + 44, { fontSize: 7.5, align: 'right', color: grayText });
  }

  y = Math.max(leftColBottom, y + 50);

  // Divider
  pdf.setDrawColor(lightLine[0], lightLine[1], lightLine[2]);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Items Table
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
    pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('#', colX.sno, currentY + 2);
    pdf.text('ITEM DESCRIPTION', colX.item, currentY + 2);
    pdf.text('QTY', colX.qty, currentY + 2);
    pdf.text('GST %', colX.gst, currentY + 2);
    pdf.text('MRP', colX.mrp, currentY + 2);
    pdf.text('VK PRICE', colX.price, currentY + 2);
    pdf.text('AMOUNT', colX.amount, currentY + 2, { align: 'right' });
    return currentY + 10;
  };

  y = drawTableHeaders(y);

  const rawItems = order.items || order.products || [];
  rawItems.forEach((item, index) => {
    const itemName = item.product?.name || item.name || item.productName || `Item ${index + 1}`;
    const qty = Number(item.quantity || item.qty || 1);

    const unitP = item.unitPrice && Number(item.unitPrice) > 0 ? Number(item.unitPrice) : null;
    const itemP = item.price && Number(item.price) > 0 ? Number(item.price) : null;
    const totP = item.totalPrice && Number(item.totalPrice) > 0 ? Number(item.totalPrice) / qty : null;

    const price = Number(
      item.sellingPrice ??
      item.finalPrice ??
      item.posPrice ??
      unitP ??
      itemP ??
      totP ??
      item.product?.sellingPrice ??
      item.product?.finalPrice ??
      item.product?.posPrice ??
      item.product?.price ??
      0
    );

    const rawMrp = Number(item.mrp ?? item.product?.mrp ?? 0);
    const mrpValue = rawMrp > 0 ? rawMrp : (item.discount ? price + Number(item.discount) : price);
    const amount = qty * price;
    const gstRate = Number(item.gst ?? item.product?.gst ?? item.taxRate ?? item.product?.taxRate ?? 0);
    const isItemFree = (item.isFree === true || item.product?.isFree === true) || (price === 0 && item.isFree !== false && rawMrp === 0);

    if (y > maxPageHeight - 10) {
      pdf.addPage();
      y = 20;
      pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Invoice #${invoiceNo} (Contd.)`, margin, y);
      y += 8;
      y = drawTableHeaders(y);
    }

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
    pdf.text(String(index + 1), colX.sno, y + 1);

    const maxItemWidth = contentWidth * 0.32;
    let itemLines: string[] = [];
    if (containsUnicode(itemName)) {
      const words = itemName.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (getTextWidth(pdf, testLine, 8) > maxItemWidth) {
          if (line) itemLines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) itemLines.push(line);
    } else {
      itemLines = pdf.splitTextToSize(itemName, maxItemWidth);
    }

    const itemLineHeight = 3.5;
    itemLines.forEach((lineText, idx) => {
      drawUnicodeText(pdf, lineText, colX.item, y + 1 + idx * itemLineHeight, { fontSize: 8, color: darkText });
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
    pdf.text(`${qty}`, colX.qty, y + 1);

    pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
    pdf.text(gstRate > 0 ? `${gstRate}%` : '0%', colX.gst, y + 1);

    if (mrpValue > price && !isItemFree) {
      pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
      pdf.text(`Rs.${mrpValue.toFixed(2)}`, colX.mrp, y + 1);
    } else {
      pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
      pdf.text(`Rs.${price.toFixed(2)}`, colX.mrp, y + 1);
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
    pdf.text(isItemFree ? 'GIFT/FREE' : `Rs.${price.toFixed(2)}`, colX.price, y + 1);

    pdf.text(isItemFree ? 'Rs.0.00' : `Rs.${amount.toFixed(2)}`, colX.amount, y + 1, { align: 'right' });

    const totalItemHeight = Math.max(1, itemLines.length) * itemLineHeight + 2;
    pdf.setDrawColor(241, 245, 249);
    pdf.line(margin, y + totalItemHeight - 1, pageWidth - margin, y + totalItemHeight - 1);
    y += totalItemHeight + 2;
  });

  // Summary & Totals
  if (y > maxPageHeight - 40) {
    pdf.addPage();
    y = 25;
  } else {
    y += 6;
  }

  const totalsX = margin + contentWidth * 0.55;

  const subTotalMRP = rawItems.reduce((sum, i) => {
    const q = i.quantity || i.qty || 1;
    const p = Number(i.sellingPrice ?? i.finalPrice ?? i.posPrice ?? i.unitPrice ?? i.price ?? i.product?.sellingPrice ?? i.product?.finalPrice ?? i.product?.posPrice ?? i.product?.price ?? 0);
    const m = Number(i.mrp ?? i.product?.mrp ?? p);
    return sum + m * q;
  }, 0) || Number(order.totalAmount || 0);

  const totalOrderAmount = Number(order.totalAmount || 0);
  const savings = Math.max(0, subTotalMRP - totalOrderAmount);

  let rightY = y;
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Subtotal (MRP)', totalsX, rightY);
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text(`Rs.${subTotalMRP.toFixed(2)}`, colX.amount, rightY, { align: 'right' });
  rightY += 7;

  if (savings > 0) {
    pdf.setFillColor(255, 247, 237);
    pdf.roundedRect(totalsX - 3, rightY - 5, (pageWidth - margin) - totalsX + 6, 9, 1, 1, 'F');
    pdf.setTextColor(orangeAccent[0], orangeAccent[1], orangeAccent[2]);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL SAVINGS', totalsX, rightY + 1.5);
    pdf.setFontSize(11);
    pdf.text(`- Rs.${savings.toFixed(2)}`, colX.amount, rightY + 1.5, { align: 'right' });
    rightY += 9;
  }

  const totalTax = rawItems.reduce((sum, item) => {
    if (item.taxAmount && Number(item.taxAmount) > 0) {
      return sum + Number(item.taxAmount);
    }
    if (item.cgst || item.sgst) {
      return sum + Number(item.cgst || 0) + Number(item.sgst || 0);
    }
    const q = item.quantity || item.qty || 1;
    const p = Number(item.sellingPrice ?? item.finalPrice ?? item.posPrice ?? item.unitPrice ?? item.price ?? item.product?.sellingPrice ?? item.product?.finalPrice ?? item.product?.posPrice ?? item.product?.price ?? 0);
    const rate = Number(item.gst ?? item.product?.gst ?? item.taxRate ?? item.product?.taxRate ?? 0);
    if (rate === 0) return sum;
    const tot = p * q;
    const taxable = tot / (1 + rate / 100);
    return sum + (tot - taxable);
  }, 0);

  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Taxable Value', totalsX, rightY);
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text(`Rs.${(totalOrderAmount - totalTax).toFixed(2)}`, colX.amount, rightY, { align: 'right' });
  rightY += 7;

  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`CGST (Incl.)`, totalsX, rightY);
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text(`Rs.${(totalTax / 2).toFixed(2)}`, colX.amount, rightY, { align: 'right' });
  rightY += 7;

  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`SGST (Incl.)`, totalsX, rightY);
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text(`Rs.${(totalTax / 2).toFixed(2)}`, colX.amount, rightY, { align: 'right' });
  rightY += 7;

  const deliveryFee = Number(order.deliveryCharge || 0);
  if (deliveryFee > 0) {
    pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Delivery Fee', totalsX, rightY);
    pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
    pdf.text(`Rs.${deliveryFee.toFixed(2)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;
  }

  const couponDiscount = Number(order.couponDiscount || (order.couponCode ? order.discount : 0) || 0);
  const couponCode = order.couponCode ? String(order.couponCode).toUpperCase() : null;
  if (couponDiscount > 0) {
    pdf.setTextColor(emerald[0], emerald[1], emerald[2]);
    pdf.setFont('helvetica', 'bold');
    const couponLabel = couponCode ? `Coupon (${couponCode})` : 'Coupon Discount';
    pdf.text(couponLabel, totalsX, rightY);
    pdf.text(`- Rs.${couponDiscount.toFixed(2)}`, colX.amount, rightY, { align: 'right' });
    rightY += 7;
  }

  pdf.setDrawColor(lightLine[0], lightLine[1], lightLine[2]);
  pdf.line(totalsX, rightY, pageWidth - margin, rightY);
  rightY += 7;

  pdf.setFillColor(emerald[0], emerald[1], emerald[2]);
  pdf.roundedRect(totalsX - 3, rightY - 5, (pageWidth - margin) - totalsX + 6, 14, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GRAND TOTAL', totalsX, rightY + 3);
  pdf.setFontSize(14);
  pdf.text(`Rs.${totalOrderAmount.toFixed(2)}`, colX.amount, rightY + 4, { align: 'right' });
  rightY += 15;

  const badgeWidth = totalsX - margin - 15;

  // Delivery Schedule Badge
  if (order.deliveryDate || order.deliverySlot) {
    const scheduleY = y + 22;
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(margin, scheduleY, badgeWidth, 18, 3, 3, 'F');
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(margin, scheduleY, badgeWidth, 18, 3, 3, 'S');
    pdf.setTextColor(30, 64, 175);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DELIVERY SCHEDULE', margin + 5, scheduleY + 7);
    pdf.setTextColor(30, 58, 138);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const dateText = order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Standard Date';
    pdf.text(`${dateText} | ${order.deliverySlot || 'Standard Slot'}`, margin + 5, scheduleY + 13);
  }

  // Payment Status Badge
  const isCredit = modeRaw === 'CREDIT';
  pdf.setFillColor(isCredit ? 254 : 236, isCredit ? 242 : 253, isCredit ? 242 : 245);
  pdf.roundedRect(margin, y, badgeWidth, 18, 3, 3, 'F');
  pdf.setDrawColor(isCredit ? 252 : 167, isCredit ? 165 : 243, isCredit ? 165 : 208);
  pdf.roundedRect(margin, y, badgeWidth, 18, 3, 3, 'S');
  pdf.setTextColor(isCredit ? 220 : emerald[0], isCredit ? 38 : emerald[1], isCredit ? 38 : emerald[2]);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PAYMENT STATUS', margin + badgeWidth / 2, y + 7, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(isCredit ? 'CREDIT / UNPAID' : 'PAID', margin + badgeWidth / 2, y + 13, { align: 'center' });

  y = Math.max(y + 25, rightY + 5);

  // Footer
  pdf.setDrawColor(lightLine[0], lightLine[1], lightLine[2]);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 12;
  pdf.setTextColor(emerald[0], emerald[1], emerald[2]);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Thanks for shopping with VillagKart', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.setTextColor(grayText[0], grayText[1], grayText[2]);
  pdf.setFontSize(7);
  pdf.text('This is a computer-generated invoice and does not require a signature.', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, y, { align: 'center' });

  return pdf;
};
