/**
 * Auto-generate variant display name and SKU (aligned with vilagkart_new_admin)
 * when Basic Information / Status sections are hidden.
 */

export function buildAutoVariantLabel(
  productName: string,
  measurement: string,
  unitLabel: string
): string {
  return [productName, measurement, unitLabel]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstFourLettersUpper(productName: string): string {
  const letters = productName.replace(/[^a-zA-Z]/g, "");
  const four = letters.slice(0, 4).toUpperCase();
  return four || "ITEM";
}

function skuSegmentMeasurement(measurement: string): string {
  const t = measurement.trim().replace(/\s+/g, "");
  return t || "0";
}

function skuSegmentUnit(unitLabel: string): string {
  const u = unitLabel.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return u || "U";
}

export interface BuildAutoVariantSkuOptions {
  /** When multiple variants may share the same base SKU, append this (e.g. variant id). */
  suffixWhenMultiple?: number | string;
}

/** Example: product "Milk", measurement "500", unit label "ML" → MILK-500-ML */
export function buildAutoVariantSku(
  productName: string,
  measurement: string,
  unitLabel: string,
  opts?: BuildAutoVariantSkuOptions
): string {
  const prefix = firstFourLettersUpper(productName);
  const mid = skuSegmentMeasurement(measurement);
  const u = skuSegmentUnit(unitLabel);
  let base = `${prefix}-${mid}-${u}`;
  const suf = opts?.suffixWhenMultiple;
  if (suf != null && String(suf).trim() !== "") {
    base = `${base}-${suf}`;
  }
  return base;
}
