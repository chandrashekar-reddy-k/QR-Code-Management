/**
 * Sanitize variant pricing / inventory text fields: no minus sign, no negative values via typing.
 */

/** Decimals allowed (landing price, MRP, discount). */
export function sanitizeNonNegativeDecimalInput(raw: string): string {
  if (raw === "") return "";
  const noMinus = raw.replace(/-/g, "");
  let s = noMinus.replace(/[^0-9.]/g, "");
  const idx = s.indexOf(".");
  if (idx !== -1) {
    s = s.slice(0, idx + 1) + s.slice(idx + 1).replace(/\./g, "");
  }
  return s;
}

/** Integers only (stock, thresholds, order qty). */
export function sanitizeNonNegativeIntInput(raw: string): string {
  if (raw === "") return "";
  return raw.replace(/-/g, "").replace(/\D/g, "");
}
