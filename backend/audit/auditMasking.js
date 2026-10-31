const EMAIL_KEYS = new Set(['email'])
const PHONE_KEYS = new Set(['phone', 'mobile', 'alternateMobileNumber'.toLowerCase()])
const EXACT_SENSITIVE_KEYS = new Set([
  'password',
  'otp',
  'otphash',
  'authorization',
  'refreshtoken',
  'x-internal-sync-key',
  'internal_sync_key',
  'pickupotp',
  'deliveryotp',
  'verificationcode',
  'accesstoken',
  'gst',
  'gstin',
  'pan',
  'pannumber',
  'ifsc',
  'ifsccode',
  'accountnumber',
  'bankaccountnumber',
  'bankname',
  'beneficiaryname',
  'upi',
  'upiid'
])

const SUBSTRING_PATTERNS = [
  'token',
  'secret',
  'credential',
  'otp',
  'verificationcode',
  'authorization',
  'gst',
  'pan',
  'ifsc',
  'account',
  'bank',
  'vendorfinancial',
  'payout',
  'settlement'
]
const ADDRESS_GEO_KEYS = new Set([
  'line1',
  'line2',
  'address',
  'fulladdress',
  'location',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'geo',
  'geopoint',
  'geopolygon'
])

function isSensitiveKey(lowered) {
  if (EXACT_SENSITIVE_KEYS.has(lowered)) return true
  if (EMAIL_KEYS.has(lowered) || PHONE_KEYS.has(lowered)) return true
  if (ADDRESS_GEO_KEYS.has(lowered)) return true
  return SUBSTRING_PATTERNS.some((pattern) => lowered.includes(pattern))
}

function maskValue(key, value) {
  const lowered = key.toLowerCase()
  if (!isSensitiveKey(lowered)) return value
  if (value == null) return value
  if (EMAIL_KEYS.has(lowered)) {
    const parts = String(value).split('@')
    if (parts.length !== 2) return '***'
    return `${parts[0].slice(0, 2)}***@${parts[1]}`
  }
  if (PHONE_KEYS.has(lowered)) {
    const str = String(value)
    return str.length > 4 ? `******${str.slice(-4)}` : '***'
  }
  return '***'
}

export function maskSensitiveData(input) {
  if (input === null || input === undefined) return input
  if (Array.isArray(input)) return input.map(maskSensitiveData)
  if (typeof input !== 'object') return input
  const out = {}
  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === 'object') {
      out[key] = maskSensitiveData(value)
      continue
    }
    out[key] = maskValue(key, value)
  }
  return out
}
