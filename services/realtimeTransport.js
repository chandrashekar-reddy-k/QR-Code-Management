import crypto from 'crypto'
import logger from '../utils/logger.js'
import { assertValidFanoutEnvelope } from './realtime/fanoutEnvelope.js'

const CUSTOMER_API_BASE_URL = (process.env.CUSTOMER_API_BASE_URL || '').replace(/\/$/, '')
const INTERNAL_SYNC_KEY = process.env.DELIVERY_API_SYNC_KEY || ''

const DEFAULT_RETRIES = parseInt(process.env.INTERNAL_FANOUT_MAX_RETRIES || '4', 10)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithRetry(url, init, { retries = DEFAULT_RETRIES, label = 'fanout' } = {}) {
  let lastErr = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.ok) return res
      const text = await res.text().catch(() => '')
      lastErr = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
      if (attempt === retries) {
        logger.warn('[RealtimeTransport] HTTP attempt failed', { label, attempt, status: res.status })
      }
    } catch (e) {
      lastErr = e
      if (attempt === retries) {
        // Only log on final failure to reduce console spam when dependent APIs are not running
        logger.warn('[RealtimeTransport] fetch error', { label, message: e.message })
      }
    }
    if (attempt < retries) await sleep(200 * Math.pow(2, attempt - 1))
  }
  throw lastErr || new Error('fetchWithRetry exhausted')
}

export async function postConsumerInternalFanout(envelope) {
  if (!CUSTOMER_API_BASE_URL || !INTERNAL_SYNC_KEY) {
    logger.warn('[RealtimeTransport] CUSTOMER_API_BASE_URL or DELIVERY_API_SYNC_KEY missing — skip fan-out')
    return
  }
  const body = JSON.stringify(envelope)
  const syncTs = Date.now().toString()
  const signature = crypto.createHmac('sha256', INTERNAL_SYNC_KEY).update(`${syncTs}.${body}`).digest('hex')
  const url = `${CUSTOMER_API_BASE_URL}/internal/realtime/fanout`
  await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-sync-key': INTERNAL_SYNC_KEY,
        'x-sync-ts': syncTs,
        'x-sync-signature': signature
      },
      body
    },
    { label: 'partner-fanout' }
  )
}

export async function publishOrHttpFanout(envelope) {
  let env
  try {
    env = assertValidFanoutEnvelope(envelope)
  } catch (e) {
    logger.error('[RealtimeTransport] invalid fan-out envelope', { message: e.message })
    return
  }
  try {
    await postConsumerInternalFanout(env)
  } catch (e) {
    if (e.message.includes('fetch failed') || e.message.includes('ECONNREFUSED')) {
      // Suppress spammy errors when local consumer API isn't running
      logger.debug('[RealtimeTransport] fanout skipped (consumer API unreachable)')
    } else {
      logger.error('[RealtimeTransport] fanout exhausted retries', { message: e.message })
    }
  }
}
