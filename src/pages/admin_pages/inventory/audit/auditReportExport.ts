import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface AuditReportExportOptions {
  title?: string;
  scope?: string;
  generatedBy?: string;
}

const safeText = (val: any, fallback = '—') => {
  if (val === null || val === undefined || val === '') return fallback;
  return String(val);
};

const safeCurrency = (val: any) => {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

/**
 * Professional Single Audit PDF Generator
 */
export const exportSingleAuditPDF = (audit: any) => {
  if (!audit) return;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = 210;
  const ph = 297;
  const margin = 12;
  const printableWidth = pw - (margin * 2);
  const now = format(new Date(), 'dd MMM yyyy, hh:mm a');
  const auditNumber = audit.auditNumber || 'AUDIT-REPORT';
  const items = audit.items || [];

  let currentPage = 1;

  const drawHeader = (pg: number) => {
    // Header Dark Banner
    doc.setFillColor(15, 44, 29); // #0f2c1d Brand Dark Forest Green
    doc.rect(0, 0, pw, 32, 'F');

    // Accent line
    doc.setFillColor(16, 185, 129); // #10b981 Emerald
    doc.rect(0, 32, pw, 1.5, 'F');

    // Title & Branding
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('VILLAGKART INVENTORY AUDIT REPORT', margin, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(209, 250, 229);
    doc.text(`SESSION: ${auditNumber}  •  SCOPE: ${(audit.scope || 'ALL').replace(/_/g, ' ')}`, margin, 21);
    doc.text(`CUTOFF TIME: ${audit.cutoffTime ? format(new Date(audit.cutoffTime), 'dd MMM yyyy, hh:mm a') : 'N/A'}`, margin, 27);

    // Right-aligned status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const statusText = audit.status === 'CLOSED' ? 'CLOSED / RECONCILED' : (audit.status === 'PENDING_REVIEW' ? 'PENDING REVIEW' : 'SAVED DRAFT');
    doc.text(statusText, pw - margin, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`PAGE ${pg}`, pw - margin, 27, { align: 'right' });
  };

  const drawFooter = () => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, ph - 14, pw - margin, ph - 14);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated on ${now}  |  VillagKart Enterprise Inventory System`, margin, ph - 9);
      doc.text(`Page ${i} of ${totalPages}`, pw - margin, ph - 9, { align: 'right' });
    }
  };

  // Draw Page 1 Header
  drawHeader(currentPage);
  let y = 42;

  // Executive KPI Summary Cards
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, printableWidth, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, printableWidth, 24, 2, 2, 'D');

  const colW = printableWidth / 4;
  const kpis = [
    { label: 'TOTAL SKUS', value: String(items.length || 0) },
    { label: 'AUDITED BY', value: audit.auditor?.name || 'Assigned Staff' },
    { label: 'NET VARIANCE QTY', value: `${(audit.totalVarianceQty || 0) > 0 ? '+' : ''}${audit.totalVarianceQty || 0} Units` },
    { label: 'VARIANCE VALUE', value: safeCurrency(audit.totalVarianceVal || 0) }
  ];

  kpis.forEach((kpi, idx) => {
    const cx = margin + (idx * colW) + 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cx, y + 8);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, cx, y + 17);
  });

  y += 32;

  // Table Columns
  // Items & SKU (60) | Category (26) | Expected (22) | Counted (22) | Variance (22) | Cost (16) | Value Diff (18)
  const colWidths = [60, 26, 20, 20, 20, 20, 20];
  const headers = ['ITEM / SKU', 'CATEGORY', 'BOOK STOCK', 'COUNTED', 'VARIANCE', 'UNIT PRICE', 'VALUE DIFF'];
  const xs: number[] = [margin];
  colWidths.forEach((w, i) => {
    if (i < colWidths.length - 1) xs.push(xs[i] + w);
  });

  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY - 4, printableWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, currentY + 3, pw - margin, currentY + 3);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    headers.forEach((h, i) => {
      const align = i >= 2 ? 'right' : 'left';
      const posX = align === 'right' ? xs[i] + colWidths[i] - 2 : xs[i] + 2;
      doc.text(h, posX, currentY, { align: align as any });
    });
  };

  renderTableHeader(y);
  y += 8;

  // Table Rows
  items.forEach((item: any, idx: number) => {
    // Page overflow check
    if (y > 275) {
      currentPage++;
      doc.addPage();
      drawHeader(currentPage);
      y = 42;
      renderTableHeader(y);
      y += 8;
    }

    const isEven = idx % 2 === 1;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, printableWidth, 6.5, 'F');
    }

    const expected = item.expectedQuantity ?? 0;
    const counted = item.countedQuantity ?? 0;
    const variance = (item.varianceQuantity !== undefined && item.varianceQuantity !== null)
      ? item.varianceQuantity
      : (counted - expected);
    const unitPrice = item.unitPrice || 0;
    const valueDiff = (item.varianceValue !== undefined && item.varianceValue !== null)
      ? item.varianceValue
      : (variance * unitPrice);

    const prodName = safeText(item.product?.name, 'Product');
    const prodSku = safeText(item.product?.sku || item.product?.variants?.[0]?.sku, '');
    const itemLabel = prodSku ? `${prodName} (${prodSku})` : prodName;
    const catName = safeText(item.product?.category?.name, 'General');

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // Item name
    doc.text(itemLabel.slice(0, 38), xs[0] + 2, y);
    // Category
    doc.text(catName.slice(0, 16), xs[1] + 2, y);
    // Book Stock
    doc.text(String(expected), xs[2] + colWidths[2] - 2, y, { align: 'right' });
    // Counted
    doc.text(String(counted), xs[3] + colWidths[3] - 2, y, { align: 'right' });

    // Variance with color highlight
    if (variance < 0) {
      doc.setTextColor(220, 38, 38); // Red
    } else if (variance > 0) {
      doc.setTextColor(37, 99, 235); // Blue
    } else {
      doc.setTextColor(22, 101, 52); // Green
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`${variance > 0 ? '+' : ''}${variance}`, xs[4] + colWidths[4] - 2, y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    // Unit price
    doc.text(`₹${unitPrice}`, xs[5] + colWidths[5] - 2, y, { align: 'right' });
    // Value diff
    if (valueDiff < 0) {
      doc.setTextColor(220, 38, 38);
    } else if (valueDiff > 0) {
      doc.setTextColor(37, 99, 235);
    }
    doc.text(`₹${Math.abs(Math.round(valueDiff))}`, xs[6] + colWidths[6] - 2, y, { align: 'right' });

    y += 6.5;
  });

  // Review Notes / Manager signoff if closed
  if (y > 250) {
    currentPage++;
    doc.addPage();
    drawHeader(currentPage);
    y = 42;
  }

  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('AUDIT SIGN-OFF & RECONCILIATION SUMMARY', margin, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Manager Notes: ${audit.reviewNotes || 'Standard periodic cycle verification complete.'}`, margin, y);
  y += 4;
  doc.text(`Reviewed By: ${audit.reviewer?.name || 'Store Operations Manager'}  •  Date: ${audit.completedAt ? format(new Date(audit.completedAt), 'dd MMM yyyy') : now}`, margin, y);

  drawFooter();
  doc.save(`${auditNumber}_audit_report.pdf`);
};

/**
 * Professional Single Audit Excel Export
 */
export const exportSingleAuditExcel = (audit: any) => {
  if (!audit) return;
  const items = audit.items || [];
  const auditNumber = audit.auditNumber || 'AUDIT';

  const rows = items.map((item: any, idx: number) => {
    const expected = item.expectedQuantity ?? 0;
    const counted = item.countedQuantity ?? 0;
    const variance = (item.varianceQuantity !== undefined && item.varianceQuantity !== null)
      ? item.varianceQuantity
      : (counted - expected);
    const unitPrice = item.unitPrice || 0;
    const valueDiff = (item.varianceValue !== undefined && item.varianceValue !== null)
      ? item.varianceValue
      : (variance * unitPrice);

    return {
      'S.No': idx + 1,
      'Product Name': item.product?.name || '—',
      'SKU': item.product?.sku || item.product?.variants?.[0]?.sku || '—',
      'Barcode': item.product?.barcode || '—',
      'Category': item.product?.category?.name || 'General',
      'Book Stock (Expected)': expected,
      'Physical Counted': counted,
      'Variance Quantity': variance,
      'Unit Price (INR)': unitPrice,
      'Variance Value (INR)': Math.round(valueDiff),
      'Remarks': item.remarks || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Details');
  XLSX.writeFile(wb, `${auditNumber}_audit_report.xlsx`);
};

/**
 * Consolidated Audits Table Export (PDF)
 */
export const exportAllAuditsSummaryPDF = (audits: any[], title = 'ALL AUDITS SUMMARY REPORT') => {
  if (!audits || audits.length === 0) return;
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rich overview
  const pw = 297;
  const ph = 210;
  const margin = 12;
  const printableWidth = pw - (margin * 2);
  const now = format(new Date(), 'dd MMM yyyy, hh:mm a');

  let currentPage = 1;

  const drawHeader = (pg: number) => {
    doc.setFillColor(15, 44, 29);
    doc.rect(0, 0, pw, 28, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 28, pw, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`VILLAGKART — ${title}`, margin, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(209, 250, 229);
    doc.text(`TOTAL AUDITS IN REPORT: ${audits.length}  •  GENERATED: ${now}`, margin, 21);

    doc.setFont('helvetica', 'bold');
    doc.text(`PAGE ${pg}`, pw - margin, 21, { align: 'right' });
  };

  const drawFooter = () => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, ph - 10, pw - margin, ph - 10);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`VillagKart Enterprise Master Audit System  |  Confidential`, margin, ph - 5);
      doc.text(`Page ${i} of ${totalPages}`, pw - margin, ph - 5, { align: 'right' });
    }
  };

  drawHeader(currentPage);
  let y = 38;

  // Summary Metrics Banner
  const totalVarianceQty = audits.reduce((sum, a) => sum + (a.totalVarianceQty || 0), 0);
  const totalVarianceVal = audits.reduce((sum, a) => sum + Math.abs(a.totalVarianceVal || 0), 0);
  const closedCount = audits.filter(a => a.status === 'CLOSED').length;
  const pendingCount = audits.filter(a => a.status === 'PENDING_REVIEW').length;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, printableWidth, 16, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, printableWidth, 16, 2, 2, 'D');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`AUDITS: ${audits.length} | COMPLETED: ${closedCount} | PENDING: ${pendingCount} | NET VARIANCE UNITS: ${totalVarianceQty} | TOTAL VARIANCE VALUE: ₹${Math.round(totalVarianceVal).toLocaleString()}`, margin + 6, y + 10.5);

  y += 24;

  // Columns: Audit ID (45) | Scope (45) | Status (32) | Total Items (25) | Var Qty (25) | Var Value (30) | Auditor (40) | Cutoff Date (30)
  const colWidths = [45, 45, 32, 25, 25, 30, 40, 31];
  const headers = ['AUDIT ID', 'SCOPE / SECTION', 'STATUS', 'ITEMS', 'VAR QTY', 'VAR VALUE', 'AUDITOR', 'DATE'];
  const xs: number[] = [margin];
  colWidths.forEach((w, i) => {
    if (i < colWidths.length - 1) xs.push(xs[i] + w);
  });

  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY - 4, printableWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, currentY + 3, pw - margin, currentY + 3);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    headers.forEach((h, i) => {
      const align = (i === 3 || i === 4 || i === 5) ? 'right' : 'left';
      const posX = align === 'right' ? xs[i] + colWidths[i] - 2 : xs[i] + 2;
      doc.text(h, posX, currentY, { align: align as any });
    });
  };

  renderTableHeader(y);
  y += 8;

  audits.forEach((a: any, idx: number) => {
    if (y > 190) {
      currentPage++;
      doc.addPage();
      drawHeader(currentPage);
      y = 38;
      renderTableHeader(y);
      y += 8;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, printableWidth, 6, 'F');
    }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    // ID
    doc.setFont('helvetica', 'bold');
    doc.text(a.auditNumber || a.id.slice(0, 10), xs[0] + 2, y);

    doc.setFont('helvetica', 'normal');
    // Scope
    const scopeLabel = a.vehicle ? `Vehicle (${a.vehicle.vehicleNumber})` : (a.scope || 'ALL').replace(/_/g, ' ');
    doc.text(scopeLabel.slice(0, 24), xs[1] + 2, y);

    // Status
    const statusText = a.status === 'CLOSED' ? 'Completed' : (a.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Draft');
    doc.text(statusText, xs[2] + 2, y);

    // Items
    const itemCount = a._count?.items ?? a.totalExpectedQty ?? 0;
    doc.text(String(itemCount), xs[3] + colWidths[3] - 2, y, { align: 'right' });

    // Var Qty
    const varQty = a.totalVarianceQty || 0;
    if (varQty !== 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(varQty < 0 ? 220 : 37, varQty < 0 ? 38 : 99, varQty < 0 ? 38 : 235);
    }
    doc.text(`${varQty > 0 ? '+' : ''}${varQty}`, xs[4] + colWidths[4] - 2, y, { align: 'right' });

    // Var Value
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const varVal = Math.round(a.totalVarianceVal || 0);
    doc.text(`₹${Math.abs(varVal).toLocaleString()}`, xs[5] + colWidths[5] - 2, y, { align: 'right' });

    // Auditor
    doc.text(safeText(a.auditor?.name, 'Staff').slice(0, 20), xs[6] + 2, y);

    // Date
    const dateStr = a.cutoffTime ? format(new Date(a.cutoffTime), 'dd-MM-yyyy') : '—';
    doc.text(dateStr, xs[7] + 2, y);

    y += 6;
  });

  drawFooter();
  doc.save(`villagkart_all_audits_report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
};

/**
 * Consolidated Audits Table Export (Excel)
 */
export const exportAllAuditsSummaryExcel = (audits: any[]) => {
  if (!audits || audits.length === 0) return;

  const rows = audits.map((a: any, idx: number) => ({
    'S.No': idx + 1,
    'Audit Number': a.auditNumber || '—',
    'Scope': a.vehicle ? `Vehicle - ${a.vehicle.vehicleNumber}` : (a.scope || 'ALL').replace(/_/g, ' '),
    'Status': a.status === 'CLOSED' ? 'Completed' : (a.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Draft'),
    'Method': a.countingMethod === 'BLIND' ? 'Blind Count' : 'System Assisted',
    'Total SKUs': a._count?.items ?? a.totalExpectedQty ?? 0,
    'Expected Quantity': a.totalExpectedQty || 0,
    'Counted Quantity': a.totalCountedQty || 0,
    'Variance Quantity': a.totalVarianceQty || 0,
    'Variance Value (INR)': Math.round(a.totalVarianceVal || 0),
    'Auditor': a.auditor?.name || '—',
    'Reviewer': a.reviewer?.name || '—',
    'Cutoff Date': a.cutoffTime ? format(new Date(a.cutoffTime), 'yyyy-MM-dd HH:mm') : '—',
    'Created At': a.createdAt ? format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm') : '—'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'All Audits');
  XLSX.writeFile(wb, `villagkart_audits_summary_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};
