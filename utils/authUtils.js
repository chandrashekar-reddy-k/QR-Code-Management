/**
 * Auth utilities for partner authentication
 * Handles unified emailOrPhone parsing and user resolution
 */

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PHONE_REGEX = /^\+?[\d\s-]{10,15}$/;

/**
 * Determines if the input is an email or phone number
 * @param {string} input - The emailOrPhone value
 * @returns {{ type: 'email' | 'phone', value: string } | null}
 */
export function parseEmailOrPhone(input) {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Email check: contains @ and matches email pattern
  if (trimmed.includes("@") && EMAIL_REGEX.test(trimmed)) {
    return { type: "email", value: trimmed.toLowerCase() };
  }

  // Phone: strip non-digits (except leading +) and validate length
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    // Normalize: store without country code for lookup (Indian numbers: 10 digits)
    const phoneValue =
      digitsOnly.length === 10
        ? digitsOnly
        : digitsOnly.length > 10
          ? digitsOnly.slice(-10) // Use last 10 digits (assume country code prefix)
          : digitsOnly;
    return { type: "phone", value: phoneValue };
  }

  return null;
}

/**
 * Extracts emailOrPhone from request body
 * Body: { emailOrPhone: string } (phone field removed)
 * @param {object} body - Request body
 * @returns {{ type: 'email' | 'phone', value: string } | null}
 */
export function extractEmailOrPhoneFromRequest(body) {
  if (!body || !body.emailOrPhone) return null;
  return parseEmailOrPhone(body.emailOrPhone);
}
