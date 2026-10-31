import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

export function runWithAuditContext(context, callback) {
  return storage.run(context, callback)
}
// shdafg
export function getAuditContext() {
  return storage.getStore() || null
}

export function patchAuditContext(values = {}) {
  const store = storage.getStore()
  if (!store || typeof store !== 'object') return
  Object.assign(store, values)
}
