/**
 * Partner Add/Edit Product form — shared validation helpers.
 * Keeps rules in one place; AddProducts.tsx wires them to steps and submit.
 */

import {
  validatePartnerFssaiLicNo,
  validatePartnerMetaDescription,
  validatePartnerMetaKeywords,
  validatePartnerMetaTitle,
  validatePartnerProductName,
} from "./productFormSeoValidation";

export interface PartnerVariantFormRow {
  id?: number;
  type: string;
  unit: string;
  measurement: string;
  variantName: string;
  sku: string;
  mrp: string;
  price: string;
  salePrice: string;
  discountType: string;
  discount: string;
  stock: string;
  lowStockThreshold: string;
  minOrderQuantity: string;
  maxOrderQuantity: string;
  primaryImage?: File | null;
}

export interface PartnerProductFormValidationInput {
  productName: string;
  description: string;
  shortDescription: string;
  productType: string;
  category: string;
  subCategory: string;
  tax: string;
  tags: string;
  brands: string;
  mainImage: File | null;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  schemaMarkup: string;
  manufacturer: string;
  madeIn: string;
  fssaiLicNo: string;
  isReturnable: string;
  maxReturnDays: string;
  isCancelable: string;
  cancellableOrderStatuses: string[];
  variants: PartnerVariantFormRow[];
}

/** Minimum visible text in description (after stripping HTML). */
const MIN_DESC_TEXT = 1;
const MAX_DESC_TEXT = 10000;
const MAX_TAGS = 500;
const MAX_SHORT_DESC = 2000;
const MAX_OPTIONAL_TEXT = 200;
const MAX_SKU_LEN = 120;
const MAX_VARIANT_TYPE_LEN = 100;
const MAX_VARIANT_UNIT_LEN = 100;
const MAX_MEASUREMENT_LEN = 12;
const MAX_VARIANT_NAME_LEN = 200;
const MAX_PRICE_LEN = 12;
const MAX_DISCOUNT_LEN = 8;
const MAX_STOCK_LEN = 8;
const MAX_ORDER_QTY_LEN = 6;

function stripHtml(html: string): string {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePositiveNumber(raw: string): number | null {
  const n = parseFloat(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseNonNegativeNumber(raw: string): number | null {
  const n = parseFloat(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseNonNegInt(raw: string): number | null {
  const n = parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Step 1 — Basic Information */
export function validatePartnerProductStep1(
  form: PartnerProductFormValidationInput,
  opts: { isEditMode: boolean; mainImagePreview: string | null }
): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameErr = validatePartnerProductName(form.productName);
  if (nameErr) {
    errors.productName = nameErr;
  }

  const descText = stripHtml(form.description);
  if (!descText || descText.length < MIN_DESC_TEXT) {
    errors.description = "Description is required";
  } else if (descText.length > MAX_DESC_TEXT) {
    errors.description = `Description cannot exceed ${MAX_DESC_TEXT} characters`;
  }

  if (!form.productType?.trim()) {
    errors.productType = "Product type is required";
  }
  if (!form.category?.trim()) {
    errors.category = "Category is required";
  }
  if (!form.subCategory?.trim()) {
    errors.subCategory = "Sub-Category is required";
  }

  if (opts.isEditMode) {
    if (!form.mainImage && !opts.mainImagePreview) {
      errors.mainImage = "Primary image is required";
    }
  } else if (!form.mainImage) {
    errors.mainImage = "Primary image is required";
  }

  const taxRaw = String(form.tax ?? "").trim();
  if (taxRaw !== "") {
    const t = parseFloat(taxRaw);
    if (!Number.isFinite(t) || t < 0 || t > 100) {
      errors.tax = "Tax must be between 0 and 100%";
    }
  }

  if (form.tags && form.tags.length > MAX_TAGS) {
    errors.tags = `Tags cannot exceed ${MAX_TAGS} characters`;
  }

  const short = String(form.shortDescription ?? "").trim();
  if (short.length > MAX_SHORT_DESC) {
    errors.shortDescription = `Short description cannot exceed ${MAX_SHORT_DESC} characters`;
  }

  return errors;
}

export type VariantImagePreviews = Record<
  number,
  { primary?: string | null; secondary?: string | null; barcode?: string | null }
>;

/** Stable React error key per variant row + field (use with TextInput/SelectInput `error`). */
export function variantFieldErrorKey(variantId: number | string, field: string): string {
  return `varField_${variantId}_${field}`;
}

function collectVariantFieldErrors(
  variant: PartnerVariantFormRow,
  index: number,
  options: {
    requirePrimaryImage: boolean;
    variantImagePreviews: VariantImagePreviews;
    isEditVariantMode: boolean;
    /** When true, variant name/SKU are auto-generated (hidden UI); do not require manual entry. */
    skipVariantNameSku?: boolean;
  }
): Record<string, string> {
  const id = variant.id ?? index;
  const k = (field: string) => variantFieldErrorKey(id, field);
  const out: Record<string, string> = {};

  if (!variant.type?.trim()) {
    out[k("type")] = "Unit type is required";
  } else if (String(variant.type).trim().length > MAX_VARIANT_TYPE_LEN) {
    out[k("type")] = `Unit type cannot exceed ${MAX_VARIANT_TYPE_LEN} characters`;
  }
  if (!variant.unit?.trim()) {
    out[k("unit")] = "Unit is required";
  } else if (String(variant.unit).trim().length > MAX_VARIANT_UNIT_LEN) {
    out[k("unit")] = `Unit cannot exceed ${MAX_VARIANT_UNIT_LEN} characters`;
  }
  const meas = String(variant.measurement ?? "").trim();
  if (!meas) {
    out[k("measurement")] = "Measurement is required";
  } else if (meas.length > MAX_MEASUREMENT_LEN) {
    out[k("measurement")] = `Measurement cannot exceed ${MAX_MEASUREMENT_LEN} characters`;
  } else if (!variant.type?.trim()) {
    out[k("measurement")] = "Select unit type first";
  } else if (!/^(?:\d+|\d+\.\d+)$/.test(meas)) {
    out[k("measurement")] = "Use a valid number (e.g. 1 or 1.2)";
  }

  if (!options.skipVariantNameSku) {
    const vn = String(variant.variantName ?? "").trim();
    if (!vn) {
      out[k("variantName")] = "Variant name is required";
    } else if (vn.length > MAX_VARIANT_NAME_LEN) {
      out[k("variantName")] = `Variant name cannot exceed ${MAX_VARIANT_NAME_LEN} characters`;
    }

    const sku = String(variant.sku ?? "").trim();
    if (!sku) {
      out[k("sku")] = "SKU is required";
    } else if (sku.length > MAX_SKU_LEN) {
      out[k("sku")] = `SKU cannot exceed ${MAX_SKU_LEN} characters`;
    }
  } else {
    const vn = String(variant.variantName ?? "").trim();
    if (vn.length > MAX_VARIANT_NAME_LEN) {
      out[k("variantName")] = `Variant name cannot exceed ${MAX_VARIANT_NAME_LEN} characters`;
    }
    const sku = String(variant.sku ?? "").trim();
    if (sku.length > MAX_SKU_LEN) {
      out[k("sku")] = `SKU cannot exceed ${MAX_SKU_LEN} characters`;
    }
  }

  const landingRaw = String(variant.mrp ?? "").trim();
  if (landingRaw.length > MAX_PRICE_LEN) {
    out[k("mrp")] = `Landing price cannot exceed ${MAX_PRICE_LEN} digits`;
  }
  const landing = parsePositiveNumber(variant.mrp);
  if (landing === null && !out[k("mrp")]) {
    out[k("mrp")] = "Enter a landing price greater than 0";
  }

  const mrpRaw = String(variant.price ?? "").trim();
  if (mrpRaw.length > MAX_PRICE_LEN) {
    out[k("price")] = `Original price / M.R.P cannot exceed ${MAX_PRICE_LEN} digits`;
  }
  const mrpList = parsePositiveNumber(variant.price);
  if (mrpList === null && !out[k("price")]) {
    out[k("price")] = "Enter M.R.P / original price greater than 0";
  }
  if (landing !== null && mrpList !== null && landing > mrpList) {
    out[k("mrp")] = "Landing Price must be less than or equal to Original Price / M.R.P";
  }

  const discountRaw = String(variant.discount ?? "").trim();
  if (discountRaw.length > MAX_DISCOUNT_LEN) {
    out[k("discount")] = `Discount cannot exceed ${MAX_DISCOUNT_LEN} digits`;
  }
  const disc = parseFloat(discountRaw);
  const discType = variant.discountType === "rupees" ? "rupees" : "percentage";
  if (discountRaw === "") {
    // Optional field: no error when left empty
  } else if (!Number.isFinite(disc) && !out[k("discount")]) {
    out[k("discount")] = "Enter a valid discount value";
  } else if (disc < 0 && !out[k("discount")]) {
    out[k("discount")] = "Discount cannot be negative";
  } else if (disc > 0 && mrpList !== null && !out[k("discount")]) {
    if (discType === "percentage" && disc > 100) {
      out[k("discount")] = "Discount percentage cannot exceed 100%";
    }
    if (discType === "rupees" && disc >= mrpList) {
      out[k("discount")] = "Discount must be less than M.R.P";
    }
  }

  const salePriceRaw = String(variant.salePrice ?? "").trim();
  if (salePriceRaw.length > MAX_PRICE_LEN) {
    out[k("salePrice")] = `Final selling price cannot exceed ${MAX_PRICE_LEN} digits`;
  }
  const finalSelling = parseNonNegativeNumber(variant.salePrice);
  if (finalSelling === null && !out[k("salePrice")]) {
    out[k("salePrice")] = "Final Selling Price is required";
  } else {
    if (mrpList !== null && finalSelling > mrpList) {
      out[k("salePrice")] =
        "Final Selling Price must be less than or equal to Original Price / M.R.P";
    }
    if (landing !== null && finalSelling < landing) {
      out[k("salePrice")] =
        "Final Selling Price must be greater than or equal to Landing Price";
    }
  }

  const stockRaw = String(variant.stock ?? "").trim();
  if (stockRaw.length > MAX_STOCK_LEN) {
    out[k("stock")] = `Stock cannot exceed ${MAX_STOCK_LEN} digits`;
  }
  const stock = parseNonNegInt(variant.stock);
  if (stock === null && !out[k("stock")]) {
    out[k("stock")] = "Enter stock (0 or more)";
  }

  const lowRaw = String(variant.lowStockThreshold ?? "").trim();
  if (lowRaw !== "") {
    if (lowRaw.length > MAX_STOCK_LEN) {
      out[k("lowStockThreshold")] = `Low stock threshold cannot exceed ${MAX_STOCK_LEN} digits`;
    }
    const low = parseNonNegInt(lowRaw);
    if (low === null && !out[k("lowStockThreshold")]) {
      out[k("lowStockThreshold")] = "Use a whole number ≥ 0";
    } else if (stock !== null && low > stock) {
      out[k("lowStockThreshold")] = "Cannot be greater than stock quantity";
    }
  }

  const minRaw = String(variant.minOrderQuantity ?? "").trim();
  const maxRaw = String(variant.maxOrderQuantity ?? "").trim();
  if (minRaw !== "" || maxRaw !== "") {
    if (minRaw.length > MAX_ORDER_QTY_LEN) {
      out[k("minOrderQuantity")] = `Minimum order quantity cannot exceed ${MAX_ORDER_QTY_LEN} digits`;
    }
    if (maxRaw.length > MAX_ORDER_QTY_LEN) {
      out[k("maxOrderQuantity")] = `Maximum order quantity cannot exceed ${MAX_ORDER_QTY_LEN} digits`;
    }
    const minQ = minRaw === "" ? null : parseInt(minRaw, 10);
    const maxQ = maxRaw === "" ? null : parseInt(maxRaw, 10);
    if (minQ !== null && (!Number.isFinite(minQ) || minQ < 1) && !out[k("minOrderQuantity")]) {
      out[k("minOrderQuantity")] = "Minimum must be at least 1 when set";
    }
    if (maxQ !== null && (!Number.isFinite(maxQ) || maxQ < 1) && !out[k("maxOrderQuantity")]) {
      out[k("maxOrderQuantity")] = "Maximum must be at least 1 when set";
    }
    if (
      minQ !== null &&
      maxQ !== null &&
      Number.isFinite(minQ) &&
      Number.isFinite(maxQ) &&
      minQ > maxQ
    ) {
      const msg = "Minimum cannot exceed maximum";
      out[k("minOrderQuantity")] = msg;
      out[k("maxOrderQuantity")] = msg;
    }
  }

  if (options.requirePrimaryImage) {
    const vid = variant.id ?? index;
    const existingPrimary =
      options.variantImagePreviews[vid]?.primary ??
      options.variantImagePreviews[Number(vid)]?.primary;
    const hasFile = !!variant.primaryImage;
    const hasPreview = !!existingPrimary;
    if (!hasFile && !(options.isEditVariantMode && hasPreview)) {
      out[k("primaryImage")] = "Primary image is required";
    }
  }

  return out;
}

function mergeVariantFieldErrors(
  form: PartnerProductFormValidationInput,
  options: {
    requirePrimaryImage: boolean;
    variantImagePreviews: VariantImagePreviews;
    isEditVariantMode: boolean;
    skipVariantNameSku?: boolean;
  }
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.variants?.length) {
    return errors;
  }
  form.variants.forEach((v, i) => {
    const row = collectVariantFieldErrors(v, i, options);
    Object.assign(errors, row);
  });
  return errors;
}

/** Step 2 — Pricing / variants (full product flow; no variant primary image required here). */
export function validatePartnerProductStep2(
  form: PartnerProductFormValidationInput,
  opts?: { skipVariantNameSku?: boolean }
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.variants?.length) {
    errors.variants = "Please add at least one variant.";
    return errors;
  }

  const fieldErrors = mergeVariantFieldErrors(form, {
    requirePrimaryImage: false,
    variantImagePreviews: {},
    isEditVariantMode: false,
    skipVariantNameSku: opts?.skipVariantNameSku,
  });
  Object.assign(errors, fieldErrors);
  return errors;
}

/** Step 3 — SEO & settings (optional fields validated only when present). */
export function validatePartnerProductStep3(form: PartnerProductFormValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};

  const mt = validatePartnerMetaTitle(
    form.metaTitle,
    form.productName,
    form.category,
    form.subCategory
  );
  if (mt) errors.metaTitle = mt;

  const mk = validatePartnerMetaKeywords(form.metaKeywords);
  if (mk) errors.metaKeywords = mk;

  const md = validatePartnerMetaDescription(form.metaDescription);
  if (md) errors.metaDescription = md;

  const schema = String(form.schemaMarkup ?? "").trim();
  if (schema) {
    try {
      JSON.parse(schema);
    } catch {
      errors.schemaMarkup = "Schema markup must be valid JSON";
    }
  }

  const man = String(form.manufacturer ?? "").trim();
  if (man.length > MAX_OPTIONAL_TEXT) {
    errors.manufacturer = `Manufacturer cannot exceed ${MAX_OPTIONAL_TEXT} characters`;
  }
  const made = String(form.madeIn ?? "").trim();
  if (made.length > MAX_OPTIONAL_TEXT) {
    errors.madeIn = `Made In cannot exceed ${MAX_OPTIONAL_TEXT} characters`;
  }
  const fssai = validatePartnerFssaiLicNo(form.fssaiLicNo);
  if (fssai) {
    errors.fssaiLicNo = fssai;
  }

  if (form.isReturnable === "yes") {
    const days = parseInt(String(form.maxReturnDays ?? "").trim(), 10);
    if (!Number.isFinite(days) || days <= 0) {
      errors.maxReturnDays = "Max return days must be a whole number greater than 0 when returnable.";
    } else if (days > 3650) {
      errors.maxReturnDays = "Max return days cannot exceed 3650.";
    }
  }

  if (form.isCancelable === "yes") {
    const list = Array.isArray(form.cancellableOrderStatuses) ? form.cancellableOrderStatuses : [];
    if (!list.length) {
      errors.cancellableOrderStatuses = "Select at least one cancellable order status when cancel-able is Yes.";
    }
  }

  return errors;
}

/** Step 4 — Add/Edit variant only (primary image required). */
export function validatePartnerProductStep4(
  form: PartnerProductFormValidationInput,
  opts: {
    variantImagePreviews: VariantImagePreviews;
    isEditVariantMode: boolean;
    skipVariantNameSku?: boolean;
  }
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.variants?.length) {
    errors.variants = "Please fill in all required variant fields.";
    return errors;
  }

  const fieldErrors = mergeVariantFieldErrors(form, {
    requirePrimaryImage: true,
    variantImagePreviews: opts.variantImagePreviews,
    isEditVariantMode: opts.isEditVariantMode,
    skipVariantNameSku: opts.skipVariantNameSku,
  });
  Object.assign(errors, fieldErrors);
  return errors;
}
