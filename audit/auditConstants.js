export const AUDIT_FLAGS = {
  enabled: process.env.AUDIT_ENABLED === 'true',
  outboxEnabled: process.env.AUDIT_OUTBOX_ENABLED !== 'false',
  canonicalEnabled: process.env.AUDIT_CANONICAL_ENABLED === 'true',
  transportEnabled: process.env.AUDIT_TRANSPORT_ENABLED === 'true',
  prismaMutationEnabled: process.env.AUDIT_PRISMA_MUTATION_ENABLED === 'true',
  flushWorkerEnabled: process.env.AUDIT_FLUSH_WORKER_ENABLED === 'true'
}

export const AUDIT_SERVICE = 'PARTNER'

export const AUDIT_ORIGIN = {
  publicApi: 'PUBLIC_API',
  internalSync: 'INTERNAL_SYNC',
  webhook: 'WEBHOOK',
  cron: 'CRON',
  worker: 'WORKER',
  system: 'SYSTEM'
}

export const AUDIT_EVENT_CATEGORY = {
  business: 'BUSINESS',
  projection: 'PROJECTION',
  transport: 'TRANSPORT'
}

export const AUDIT_SEVERITY = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  critical: 'CRITICAL'
}

export const CANONICAL_EVENTS = {
  inventoryAdjusted: 'INVENTORY_ADJUSTED',
  productUpdated: 'PRODUCT_UPDATED',
  partnerOrderAccepted: 'PARTNER_ORDER_ACCEPTED',
  partnerOrderRejected: 'PARTNER_ORDER_REJECTED',
  partnerOrderReady: 'PARTNER_ORDER_READY',
  orderStatusChanged: 'ORDER_STATUS_CHANGED'
}

export const TRANSPORT_EVENTS = {
  syncDispatchAttempted: 'SYNC_DISPATCH_ATTEMPTED',
  syncDispatchFailed: 'SYNC_DISPATCH_FAILED',
  syncDispatchRetryScheduled: 'SYNC_DISPATCH_RETRY_SCHEDULED',
  syncDispatchRetryExhausted: 'SYNC_DISPATCH_RETRY_EXHAUSTED',
  outboxReplayApplied: 'OUTBOX_REPLAY_APPLIED'
}

export const AUDIT_ACTOR_TYPE = {
  user: 'USER',
  internalService: 'INTERNAL_SERVICE',
  system: 'SYSTEM',
  worker: 'WORKER'
}

export const AUDIT_BATCH = {
  flushIntervalMs: Number(process.env.AUDIT_FLUSH_INTERVAL_MS || 1000),
  maxBatchSize: Number(process.env.AUDIT_FLUSH_BATCH_SIZE || 200),
  maxRetries: Number(process.env.AUDIT_OUTBOX_MAX_RETRIES || 12),
  retryBaseMs: Number(process.env.AUDIT_OUTBOX_RETRY_BASE_MS || 1000)
}
