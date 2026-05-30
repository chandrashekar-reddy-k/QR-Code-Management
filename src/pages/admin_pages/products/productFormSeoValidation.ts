/**
 * Product name & SEO field rules for partner product create/edit.
 * Optional SEO fields are validated only when provided.
 */

const PRODUCT_NAME_MAX = 100;
const PRODUCT_NAME_MIN = 3;
const PRODUCT_NAME_PATTERN = /^[\p{L}\p{N}\s\-_'.,&()/%+*#:@!?]+$/u;

const META_TITLE_MIN = 30;
const META_TITLE_MAX = 60;

const META_KEYWORD_MAX_COUNT = 15;
const META_KEYWORD_MIN_LEN = 2;
const META_KEYWORD_MAX_LEN = 30;

const META_DESC_MIN = 120;
const META_DESC_MAX = 160;
const META_DESC_MIN_WORDS = 8;
const META_DESC_MAX_REPEAT = 4;
const OPAQUE_ID_RE = /^[0-9a-f-]{8,}$/i;

export function validatePartnerProductName(value: string): string {
  const t = String(value ?? "").trim();
  if (!t) return "Product name is required";
  if (t.length < PRODUCT_NAME_MIN) {
    return `Product name must be at least ${PRODUCT_NAME_MIN} characters`;
  }
  if (t.length > PRODUCT_NAME_MAX) {
    return `Product name cannot exceed ${PRODUCT_NAME_MAX} characters`;
  }
  if (!PRODUCT_NAME_PATTERN.test(t)) {
    return "Use only letters, numbers, spaces, and basic symbols (- _ ' . , & ( ) / % + * # : @ ! ?)";
  }
  return "";
}

export function validatePartnerMetaTitle(
  value: string,
  productName: string,
  categoryName?: string,
  subCategoryName?: string
): string {
  const t = String(value ?? "").trim();
  if (!t) return "";
  if (t.length < META_TITLE_MIN) {
    return `If provided, meta title must be at least ${META_TITLE_MIN} characters (SEO)`;
  }
  if (t.length > META_TITLE_MAX) {
    return `Meta title cannot exceed ${META_TITLE_MAX} characters (SEO)`;
  }

  const lower = t.toLowerCase();
  const candidates = [productName, categoryName ?? "", subCategoryName ?? ""]
    .map((v) => String(v ?? "").trim().toLowerCase())
    .filter((v) => v.length >= 2 && !OPAQUE_ID_RE.test(v));
  const hasHint = candidates.some((needle) => lower.includes(needle));
  if (!hasHint) {
    return "Meta title should include the product name or category / sub-category name";
  }
  return "";
}

export function validatePartnerMetaKeywords(value: string): string {
  const t = String(value ?? "").trim();
  if (!t) return "";
  const parts = t
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > META_KEYWORD_MAX_COUNT) {
    return `Use at most ${META_KEYWORD_MAX_COUNT} keywords`;
  }
  for (const k of parts) {
    if (k.length < META_KEYWORD_MIN_LEN) {
      return `Each keyword must be at least ${META_KEYWORD_MIN_LEN} characters`;
    }
    if (k.length > META_KEYWORD_MAX_LEN) {
      return `Each keyword must be at most ${META_KEYWORD_MAX_LEN} characters`;
    }
  }
  return "";
}

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export function validatePartnerMetaDescription(value: string): string {
  const t = String(value ?? "").trim();
  if (!t) return "";
  if (t.length < META_DESC_MIN) {
    return `If provided, meta description must be at least ${META_DESC_MIN} characters`;
  }
  if (t.length > META_DESC_MAX) {
    return `Meta description cannot exceed ${META_DESC_MAX} characters`;
  }

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < META_DESC_MIN_WORDS) {
    return `Meta description should be a meaningful sentence (at least ${META_DESC_MIN_WORDS} words)`;
  }

  const counts = new Map<string, number>();
  for (const w of words) {
    const key = normalizeWord(w);
    if (key.length < 4) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [word, n] of counts) {
    if (n > META_DESC_MAX_REPEAT) {
      return `Avoid repeating "${word}" too often (keyword stuffing)`;
    }
  }
  return "";
}

export function validatePartnerFssaiLicNo(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length !== 14) {
    return "FSSAI license number must be exactly 14 digits";
  }
  if (!/^\d{14}$/.test(digitsOnly)) {
    return "FSSAI license number must contain only numbers";
  }
  return "";
}
