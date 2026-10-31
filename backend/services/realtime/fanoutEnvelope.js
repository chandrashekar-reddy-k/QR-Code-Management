import { z } from 'zod'

const FanoutEmitSchema = z.object({
  namespace: z.string().min(1).max(64),
  room: z.string().min(1).max(256),
  event: z.string().min(1).max(128),
  payload: z.any().optional()
})

const FanoutEnvelopeSchema = z.object({
  correlationId: z.string().min(8).max(128).optional(),
  emits: z.array(FanoutEmitSchema).min(1).max(64)
})

export function assertValidFanoutEnvelope(envelope) {
  const r = FanoutEnvelopeSchema.safeParse(envelope)
  if (!r.success) {
    const err = new Error(`Invalid fan-out envelope: ${r.error.message}`)
    err.cause = r.error
    throw err
  }
  return r.data
}
