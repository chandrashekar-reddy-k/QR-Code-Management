import config from '../config/config.js'

export async function healthAggregate(_req, res) {
  res.json({
    status: 'ok',
    service: config.app?.name || 'partner-api',
    timestamp: new Date().toISOString(),
    checks: {
      realtime: { ok: true, mode: 'single-node', note: 'Fan-out to consumer-api via HTTP only' }
    }
  })
}

export async function healthSocket(_req, res) {
  res.json({ ok: true, skipped: true, note: 'Sockets fan-out via consumer-api' })
}

export async function healthFirebase(_req, res) {
  try {
    const { admin, firebaseInitialized } = await import('../config/firebase.js')
    const ok = Boolean(firebaseInitialized && admin?.apps?.length > 0)
    res.status(ok ? 200 : 503).json({ ok, apps: admin?.apps?.length || 0 })
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message })
  }
}
