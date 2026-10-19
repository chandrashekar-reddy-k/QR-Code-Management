import { toast } from "react-toastify";
import villagKartLogo from "../assets/vk.png";
import { getInvoiceNumber } from "./generateInvoicePDF";

export interface ThermalOrderData {
  id?: string;
  orderNumber?: string;
  createdAt?: string | Date;
  orderDate?: string | Date;
  deliveryDate?: string | Date | null;
  deliverySlot?: string | null;
  status?: string;
  totalAmount?: number;
  deliveryCharge?: number;
  discount?: number;
  couponDiscount?: number;
  couponCode?: string | null;
  paymentMode?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  payment?: any;
  cashAmount?: number;
  upiAmount?: number;
  deliveryType?: string;
  specialInstructions?: string | null;
  assignedAgent?: string | null;
  agentId?: string | null;
  consumer?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  customerName?: string;
  mobile?: string;
  customerPhone?: string;
  address?: any;
  deliveryAddress?: string;
  items?: Array<any>;
  products?: Array<any>;
  store?: any;
  pickupStore?: any;
  warehouse?: any;
  [key: string]: any;
}

export interface ThermalBizSettings {
  businessName?: string;
  gstNo?: string;
  contactNo?: string;
  email?: string;
  address?: string;
  fullAddress?: string;
  fssaiNo?: string;
  [key: string]: any;
}

/**
 * Format address into a clean single string
 */
export const formatAddressToString = (addr: any): string => {
  if (!addr) return "";
  if (typeof addr === "string") return addr.trim();
  if (typeof addr === "object") {
    if (addr.fullAddress && typeof addr.fullAddress === "string") return addr.fullAddress.trim();
    if (addr.address && typeof addr.address === "string") return addr.address.trim();

    const door =
      addr.line1 ||
      addr.doorNo ||
      addr.permDoorNo ||
      addr.commDoorNo ||
      addr.houseNo ||
      addr.flatNo ||
      addr.addressLine1 ||
      addr.building ||
      "";
    const street =
      addr.line2 ||
      addr.street ||
      addr.roadNo ||
      addr.permRoadNo ||
      addr.commRoadNo ||
      addr.addressLine2 ||
      "";
    const colony =
      addr.colony ||
      addr.permColony ||
      addr.commColony ||
      addr.locality ||
      addr.area ||
      addr.village ||
      "";
    const landmark = addr.landmark ? `(Near ${addr.landmark})` : "";
    const mandal = addr.mandal || addr.permMandal || addr.commMandal || addr.tehsil || "";
    const city = addr.city || addr.district || addr.permCity || addr.commCity || addr.town || "";
    const state = addr.state || addr.permState || addr.commState || "";
    const pincode =
      addr.pincode || addr.permPincode || addr.commPincode || addr.zipCode || addr.postalCode || "";

    const parts = [door, street, colony, landmark, mandal, city, state, pincode]
      .map((s) => String(s || "").trim())
      .filter(Boolean);

    if (parts.length > 0) return parts.join(", ");
  }
  return "";
};

/**
 * Generates and triggers the 80mm thermal receipt print window
 */
export const printThermalReceipt = (order: ThermalOrderData, bizSettings?: ThermalBizSettings) => {
  if (!order) {
    toast.error("No order data available to print thermal receipt.");
    return false;
  }

  const invoiceNo = getInvoiceNumber(order as any);
  const formattedBillNo = invoiceNo.startsWith("VK-") ? `#${invoiceNo}` : `#VK-${invoiceNo}`;
  const orderDateObj = new Date(order.createdAt || order.orderDate || Date.now());
  const dateStr = !isNaN(orderDateObj.getTime())
    ? orderDateObj.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : String(order.createdAt || order.orderDate || "N/A");

  // Business settings fallback cascade
  const settings: ThermalBizSettings = bizSettings || {
    businessName: "VillagKart",
  };

  const storeName = (
    settings.businessName ||
    order.store?.name ||
    order.pickupStore?.name ||
    order.warehouse?.name ||
    "VillagKart"
  ).toUpperCase();

  const storeAddr = formatAddressToString(
    settings.address ||
      settings.fullAddress ||
      localStorage.getItem("receiptStoreAddress") ||
      localStorage.getItem("vsms_receipt_address") ||
      order.store?.address ||
      order.store?.fullAddress ||
      order.warehouse?.address ||
      order.warehouse?.fullAddress ||
      order.pickupStore?.address
  );

  const gstNo = settings.gstNo || order.store?.gstNo || order.warehouse?.gstNo || "";
  const fssaiNo = settings.fssaiNo || "";
  const contactNo = settings.contactNo || order.store?.phone || order.warehouse?.phone || "";
  const contactEmail = settings.email || order.store?.email || "";

  // Customer info
  const customerName = (
    order.customerName ||
    order.consumer?.name ||
    order.userName ||
    "Customer"
  ).trim();

  const customerMobile = (
    order.mobile ||
    order.customerPhone ||
    order.consumer?.phone ||
    ""
  ).trim();

  const customerAddr = formatAddressToString(
    order.address ||
      order.deliveryAddress ||
      order.shippingAddress ||
      order.customerAddress ||
      order.userAddress
  );

  // Items processing
  const rawItems = order.items || order.products || [];
  const itemsList = rawItems.map((item: any, idx: number) => {
    const name = item.product?.name || item.name || item.productName || `Item #${idx + 1}`;
    const qty = Number(item.quantity || item.qty || 1);

    const isExplicitFree = item.isFree === true || item.product?.isFree === true;

    const rawItemPrice =
      item.sellingPrice !== undefined && item.sellingPrice !== null ? Number(item.sellingPrice) :
      item.finalPrice !== undefined && item.finalPrice !== null ? Number(item.finalPrice) :
      item.unitPrice !== undefined && item.unitPrice !== null ? Number(item.unitPrice) :
      item.price !== undefined && item.price !== null ? Number(item.price) :
      item.totalPrice !== undefined && item.totalPrice !== null ? Number(item.totalPrice) / (qty || 1) :
      item.posPrice !== undefined && item.posPrice !== null ? Number(item.posPrice) :
      null;

    const rawProductPrice =
      item.product?.sellingPrice !== undefined && item.product?.sellingPrice !== null ? Number(item.product.sellingPrice) :
      item.product?.finalPrice !== undefined && item.product?.finalPrice !== null ? Number(item.product.finalPrice) :
      item.product?.posPrice !== undefined && item.product?.posPrice !== null ? Number(item.product.posPrice) :
      item.product?.price !== undefined && item.product?.price !== null ? Number(item.product.price) :
      0;

    const price = isExplicitFree ? 0 : (rawItemPrice !== null && !isNaN(rawItemPrice) ? rawItemPrice : rawProductPrice);
    const isFree = isExplicitFree || price === 0;

    const rawMrp = Number(item.mrp ?? item.product?.mrp ?? 0);
    const mrp = rawMrp > 0 ? rawMrp : (item.discount ? price + Number(item.discount) : (rawProductPrice > price ? rawProductPrice : price));
    const gst = Number(item.gst ?? item.taxRate ?? item.product?.gst ?? item.product?.taxRate ?? 0);
    const hsn = item.hsnCode || item.hsn || item.product?.hsnCode || item.product?.hsn || "";
    const unit = item.unit || item.variant || item.product?.unit || "";

    const itemTot = isFree ? 0 : price * qty;
    const taxable = gst > 0 ? itemTot / (1 + gst / 100) : itemTot;
    const itemTax = itemTot - taxable;

    return {
      name,
      qty,
      unit,
      price,
      mrp,
      gst,
      hsn,
      itemTot,
      taxable,
      itemTax,
      isFree,
    };
  });

  const totalAmount = Number(order.totalAmount || 0);
  const subTotalMRP = itemsList.reduce((sum, i) => sum + (i.mrp || i.price) * i.qty, 0) || totalAmount;
  const deliveryFee = Number(order.deliveryCharge || 0);
  const couponDiscount = Number(order.couponDiscount || (order.couponCode ? order.discount : 0) || 0);
  const couponCode = order.couponCode ? String(order.couponCode).toUpperCase() : null;
  const totalSavings = Math.max(0, subTotalMRP - (totalAmount - deliveryFee));
  const savings = totalSavings;
  const productDiscount = Math.max(0, totalSavings - couponDiscount);
  const totalTax = itemsList.reduce((sum, item) => sum + item.itemTax, 0);
  const taxableValue = Math.max(0, totalAmount - totalTax - deliveryFee);

  // Delivery details
  const deliveryType = order.deliveryType || "Home Delivery";
  const deliverySlot = order.deliverySlot || null;
  const deliveryDateFormatted = order.deliveryDate
    ? new Date(order.deliveryDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  // Payment mode and status
  const modeRaw = String(
    order.paymentMode ||
    order.paymentMethod ||
    order.payment?.method ||
    order.payment?.paymentMode ||
    "COD"
  ).toUpperCase();

  const isCOD = modeRaw === "COD" || modeRaw.includes("CASH ON DELIVERY");
  const isCredit = modeRaw === "CREDIT";
  const isSplit = modeRaw === "CASH_UPI";
  const isUPI = modeRaw === "UPI" || modeRaw === "ONLINE";

  const paymentLabel = isCOD
    ? "Cash On Delivery (COD)"
    : isUPI
    ? "UPI / Online Payment"
    : isSplit
    ? "Split (Cash + UPI)"
    : isCredit
    ? "Credit (Udhar)"
    : modeRaw === "CASH"
    ? "Cash"
    : modeRaw;

  // Resolve payment status:
  // For COD orders that are placed/confirmed/out for delivery, payment is to be collected at doorstep ("COLLECT CASH").
  const rawPaymentStatus = String(
    order.paymentStatus ||
    order.payment?.status ||
    ""
  ).toUpperCase();

  let paymentStatus = "PAID";
  let statusBadgeStyle = "color: #059669;"; // green for paid

  if (isCOD) {
    if (order.status === "DELIVERED" || rawPaymentStatus === "PAID" || rawPaymentStatus === "COMPLETED") {
      paymentStatus = "PAID";
      statusBadgeStyle = "color: #059669;";
    } else {
      paymentStatus = "TO BE COLLECTED (COD)";
      statusBadgeStyle = "color: #b45309; font-weight: 900;"; // amber/warning for collection
    }
  } else if (isCredit) {
    paymentStatus = "UNPAID / DUE";
    statusBadgeStyle = "color: #dc2626; font-weight: 900;";
  } else if (rawPaymentStatus === "REFUNDED") {
    paymentStatus = "REFUNDED";
    statusBadgeStyle = "color: #dc2626;";
  } else if (rawPaymentStatus === "FAILED") {
    paymentStatus = "PAYMENT FAILED";
    statusBadgeStyle = "color: #dc2626;";
  } else if (rawPaymentStatus === "PENDING" && !isCOD) {
    paymentStatus = "PAYMENT PENDING";
    statusBadgeStyle = "color: #b45309;";
  } else {
    paymentStatus = "PAID";
    statusBadgeStyle = "color: #059669;";
  }

  const printWindow = window.open("", "_blank", "width=420,height=650");
  if (!printWindow) {
    toast.error("Pop-up blocked. Please allow pop-ups to print thermal receipts.");
    return false;
  }

  const receiptHTML = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${formattedBillNo}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            width: 72mm;
            max-width: 72mm;
            font-family: 'Courier New', Courier, monospace, 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            padding: 3mm 4mm;
            margin: 0 auto;
            color: #000;
            line-height: 1.25;
            background: #fff;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .header {
            font-size: 15px;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .subheader {
            font-size: 9px;
            color: #111;
            margin-bottom: 2px;
            word-break: break-word;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .double-divider {
            border-top: 1px double #000;
            border-bottom: 1px double #000;
            padding: 1px 0;
            margin: 5px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .item-row {
            margin-bottom: 4px;
          }
          .item-title {
            font-weight: bold;
            font-size: 11px;
            word-break: break-word;
          }
          .item-sub {
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #222;
            padding-left: 4px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            margin-top: 2px;
          }
          .grand-total {
            font-size: 14px;
            font-weight: 900;
            padding: 5px 0;
            margin-top: 5px;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
          }
          .badge {
            border: 1px solid #000;
            padding: 4px 6px;
            margin: 6px 0;
            text-align: center;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .savings-box {
            border: 1px solid #000;
            background: #f7f7f7;
            padding: 5px;
            margin: 6px 0;
            text-align: center;
            font-size: 11.5px;
            font-weight: 900;
            text-transform: uppercase;
          }
          .footer {
            margin-top: 10px;
            font-size: 8.5px;
            color: #222;
          }
          @media print {
            body {
              padding: 2mm 3mm;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="center bold header">${storeName}</div>
        ${storeAddr ? `<div class="center subheader">${storeAddr}</div>` : ""}
        ${gstNo ? `<div class="center subheader"><b>GSTIN:</b> ${gstNo}</div>` : ""}
        ${fssaiNo ? `<div class="center subheader"><b>FSSAI:</b> ${fssaiNo}</div>` : ""}
        ${contactNo ? `<div class="center subheader"><b>Ph:</b> ${contactNo}</div>` : ""}
        ${contactEmail ? `<div class="center subheader"><b>Email:</b> ${contactEmail}</div>` : ""}

        <div class="divider"></div>
        <div class="center bold" style="font-size: 11px; letter-spacing: 0.5px;">
          ${deliveryType.toUpperCase()} RECEIPT
        </div>
        <div class="divider"></div>

        <div class="row">
          <span>Bill No: <b>${formattedBillNo}</b></span>
        </div>
        <div class="row">
          <span>Date: ${dateStr}</span>
        </div>
        ${
          order.status
            ? `<div class="row"><span>Status: <b>${String(order.status).toUpperCase()}</b></span></div>`
            : ""
        }

        <div class="divider"></div>

        <div class="row bold" style="font-size: 10px;">
          <span>CUSTOMER / DELIVERY DETAILS</span>
        </div>
        <div class="row">
          <span>Name: <b>${customerName.toUpperCase()}</b></span>
        </div>
        ${
          customerMobile
            ? `<div class="row"><span>Mobile: <b>${customerMobile}</b></span></div>`
            : ""
        }
        ${
          customerAddr
            ? `<div style="font-size: 9.5px; margin-top: 2px; word-break: break-word;"><b>Address:</b> ${customerAddr}</div>`
            : ""
        }
        ${
          deliveryDateFormatted || deliverySlot
            ? `
          <div style="font-size: 9.5px; margin-top: 2px;">
            <b>Slot:</b> ${deliveryDateFormatted || "Standard"} ${deliverySlot ? `(${deliverySlot})` : ""}
          </div>
        `
            : ""
        }
        ${
          order.specialInstructions
            ? `
          <div style="font-size: 9px; margin-top: 2px; font-style: italic;">
            <b>Note:</b> ${order.specialInstructions}
          </div>
        `
            : ""
        }

        <div class="divider"></div>
        <div class="row bold" style="font-size: 9.5px;">
          <span>ITEM</span>
          <span>AMOUNT</span>
        </div>
        <div class="divider"></div>

        ${itemsList
          .map(
            (item, idx) => `
          <div class="item-row">
            <div class="item-title">
              ${idx + 1}. ${item.name}
              ${item.unit ? `<span style="font-size: 9px; font-weight: normal;"> (${item.unit})</span>` : ""}
              ${item.hsn ? `<span style="font-size: 8.5px; font-weight: normal; color: #444;"> [HSN:${item.hsn}]</span>` : ""}
            </div>
            <div class="item-sub">
              <span>${item.qty} x Rs.${item.price.toFixed(2)} ${item.gst > 0 ? `(GST ${item.gst}%)` : ""}</span>
              <span class="bold">${item.isFree ? "FREE" : `Rs.${item.itemTot.toFixed(2)}`}</span>
            </div>
          </div>
        `
          )
          .join("")}

        <div class="divider"></div>

        <div class="total-row">
          <span>Subtotal (MRP)</span>
          <span>Rs.${subTotalMRP.toFixed(2)}</span>
        </div>

        ${
          productDiscount > 0
            ? `
          <div class="total-row" style="color: #111;">
            <span>Product Discount</span>
            <span>- Rs.${productDiscount.toFixed(2)}</span>
          </div>
        `
            : ""
        }

        ${
          couponDiscount > 0
            ? `
          <div class="total-row">
            <span>Coupon ${couponCode ? `(${couponCode})` : ""}</span>
            <span>- Rs.${couponDiscount.toFixed(2)}</span>
          </div>
        `
            : ""
        }

        ${
          deliveryFee > 0
            ? `
          <div class="total-row">
            <span>Delivery Fee</span>
            <span>Rs.${deliveryFee.toFixed(2)}</span>
          </div>
        `
            : `
          <div class="total-row">
            <span>Delivery Fee</span>
            <span>FREE</span>
          </div>
        `
        }

        <div class="total-row">
          <span>Taxable Value</span>
          <span>Rs.${taxableValue.toFixed(2)}</span>
        </div>

        ${
          totalTax > 0
            ? `
          <div class="total-row">
            <span>CGST (Incl.)</span>
            <span>Rs.${(totalTax / 2).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>SGST (Incl.)</span>
            <span>Rs.${(totalTax / 2).toFixed(2)}</span>
          </div>
        `
            : ""
        }

        <div class="total-row grand-total">
          <span>GRAND TOTAL</span>
          <span>Rs.${totalAmount.toFixed(2)}</span>
        </div>

        ${
          totalSavings > 0
            ? `
          <div class="total-row bold" style="color: #166534; background: #f0fdf4; padding: 4px; border-radius: 4px; margin-top: 4px;">
            <span>TOTAL SAVINGS</span>
            <span>Rs.${totalSavings.toFixed(2)}</span>
          </div>
        `
            : ""
        }

        <div class="row bold" style="font-size: 10px; margin-top: 6px;">
          <span>Payment: <b>${paymentLabel}</b></span>
          <span style="${statusBadgeStyle}">[${paymentStatus}]</span>
        </div>

        ${
          modeRaw === "CASH_UPI"
            ? `
          <div class="row" style="font-size: 9px; padding-left: 6px;">
            <span>Cash: Rs.${Number(order.cashAmount || 0).toFixed(2)}</span>
            <span>UPI: Rs.${Number(order.upiAmount || 0).toFixed(2)}</span>
          </div>
        `
            : ""
        }

        ${
          totalSavings > 0
            ? `
          <div class="savings-box">
            YOU SAVED: Rs.${totalSavings.toFixed(2)}
          </div>
        `
            : ""
        }

        <div class="divider"></div>
        <div class="center footer">
          <div class="bold" style="font-size: 10.5px;">Thank You for Shopping with VillagKart!</div>
          <div style="margin-top: 2px;">Fresh from Village to Your Doorstep</div>
          <div style="margin-top: 5px; font-size: 8px; color: #555;">Computer Generated Thermal Receipt</div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(receiptHTML);
  printWindow.document.close();

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 350);

  return true;
};
