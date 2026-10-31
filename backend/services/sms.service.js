/**
 * MSG91 OTP SMS via official Node SDK (`msg91` npm) — Flow API.
 *
 * Modeled after villagkart-consumer-apis/services/sms.service.js
 *
 * Usage: initialize(authKey), getSMS().send(flowId, { mobile, var1, var2 }, { senderId, shortURL })
 * SDK posts to https://api.msg91.com/api/v5/flow/
 *
 * Variable keys: default `var1`/`var2` for DLT ##var1##/##var2##; set MSG91_USE_UPPERCASE_FLOW_VARS=true for VAR1/VAR2.
 *
 * @see https://github.com/Walkover-Web-Solution/SendSMS-node-MSG91
 */

import msg91Import from 'msg91';
import logger from '../utils/logger.js';

/** ESM interop: package exposes nested default */
const msg91Client = msg91Import.default ?? msg91Import;

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;
/** DLT variable length safety */
const VAR1_MAX_LEN = 40;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build MSG91 mobile string: country code digits + phone digits (e.g. 917569520716)
 */
export function normalizeMsg91Mobile(phone, countryCode = '+91') {
  const cc = String(countryCode || '').replace(/\D/g, '');
  const num = String(phone || '').replace(/\D/g, '');
  return `${cc}${num}`;
}

function maskMobileForLog(mobile) {
  if (!mobile || String(mobile).length < 5) return '***';
  return String(mobile).replace(/\d(?=\d{4})/g, 'X');
}

function ensureMsg91Initialized(authKey) {
  if (!authKey) return;
  try {
    if (!msg91Client.initialized) {
      msg91Client.initialize({ authKey });
    }
  } catch (err) {
    if (!String(err.message || '').includes('already initialized')) {
      throw err;
    }
  }
}

function sdkErrorMessage(err) {
  if (err == null) return 'SMS gateway request failed';
  if (typeof err.message === 'string' && err.message) return err.message;
  const data = err.response?.data;
  if (data && typeof data.message === 'string') return data.message;
  return String(err);
}

/**
 * Send OTP SMS via MSG91 Flow API (DLT: name → var1, OTP → var2).
 * @param {{ mobile: string, name: string, otp: string }} params
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendOTP({ mobile, name, otp }) {
  const authKey = process.env.MSG91_AUTH_KEY || '';
  const flowId = process.env.MSG91_FLOW_ID || process.env.MSG91_TEMPLATE_ID || '';
  const sender = process.env.MSG91_SENDER_ID || 'VLGKRT';
  const env = process.env.NODE_ENV || 'development';

  if (!authKey) {
    logger.warn('MSG91 SMS skipped: MSG91_AUTH_KEY not set', { env, mobile: maskMobileForLog(mobile) });
    console.log(`🔑 [SMS Dev Bypass - No AuthKey] OTP for ${mobile}: ${otp}`);
    return { ok: true, skipped: true };
  }

  if (!flowId) {
    logger.error('MSG91 SMS skipped: MSG91_FLOW_ID not set', { mobile: maskMobileForLog(mobile) });
    console.log(`🔑 [SMS Dev Bypass - No FlowId] OTP for ${mobile}: ${otp}`);
    return { ok: true, skipped: true };
  }

  let var1 = String(name || 'Partner').trim() || 'Partner';
  if (var1.length > VAR1_MAX_LEN) {
    var1 = var1.slice(0, VAR1_MAX_LEN);
  }
  const var2 = String(otp || '').trim();
  if (!var2) {
    return { ok: false, error: 'Invalid OTP payload' };
  }

  const useUppercase =
    process.env.MSG91_USE_UPPERCASE_FLOW_VARS === 'true' ||
    process.env.MSG91_USE_UPPERCASE_FLOW_VARS === '1';

  const recipient = {
    mobile,
    ...(useUppercase ? { VAR1: var1, VAR2: var2 } : { var1, var2 })
  };

  const route = process.env.MSG91_ROUTE;
  if (route != null && String(route).length > 0) {
    recipient.route = route;
  }

  const unicode = process.env.MSG91_UNICODE;
  if (unicode != null && String(unicode).length > 0) {
    const u = parseInt(String(unicode), 10);
    if (!Number.isNaN(u)) recipient.unicode = u;
  }

  const sendOptions = {
    senderId: sender,
    shortURL: false
  };

  const mobileMasked = maskMobileForLog(mobile);
  logger.info('MSG91 Flow dispatch (official SDK)', {
    flowId,
    senderId: sender,
    flowVarKeys: useUppercase ? 'VAR1,VAR2' : 'var1,var2',
    mobile: mobileMasked,
    maxAttempts: MAX_ATTEMPTS,
    env
  });

  ensureMsg91Initialized(authKey);
  const sms = msg91Client.getSMS();

  let lastError = 'SMS gateway request failed';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptStart = Date.now();
    try {
      const result = await sms.send(String(flowId), recipient, sendOptions);
      const elapsedMs = Date.now() - attemptStart;
      const requestId =
        result && typeof result.message === 'string' ? result.message : undefined;

      if (requestId) {
        logger.info('MSG91 OTP SMS accepted by gateway', {
          mobile: mobileMasked,
          attempt,
          elapsedMs,
          requestId
        });
        return { ok: true };
      }

      lastError = 'Unexpected MSG91 response (no message id)';
      logger.warn('MSG91 SDK unexpected success shape', { attempt, result });
    } catch (err) {
      const elapsedMs = Date.now() - attemptStart;
      lastError = sdkErrorMessage(err);
      logger.warn('MSG91 SDK send error', { attempt, elapsedMs, error: lastError });
    }

    if (attempt < MAX_ATTEMPTS) {
      const delayMs = BASE_DELAY_MS * attempt;
      await sleep(delayMs);
    }
  }

  logger.error('MSG91 OTP SMS exhausted retries', { error: lastError, mobile: mobileMasked, flowId });

  if (env !== 'production') {
    console.log(`🔑 [SMS Dev Fallback] OTP for ${mobile}: ${otp}`);
    return { ok: true, skipped: true };
  }

  return { ok: false, error: lastError };
}
