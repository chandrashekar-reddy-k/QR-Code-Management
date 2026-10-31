import { randomUUID } from 'crypto'
import pkg from '@prisma/client'
import { refundPayment } from '../utils/razorpayUtils.js'
import logger from '../utils/logger.js'
import { validatePaymentLifecycleTransition } from './lifecycle/transitionRegistry.js'

const { RefundTransactionStatus } = pkg

/**
 * Gateway-confirmed refunds with durable ledger + idempotency key.
 * Mirrors villagkart-consumer-api/services/refundOrchestrationService.js for admin parity.
 *
 * @param {object} params
 * @param {import('@prisma/client').PrismaClient} params.prisma
 * @param {object} params.payment - Payment row (must include id, status, amount, razorpayPaymentId, method)
 * @param {string} params.orderId
 * @param {string} params.orderNumber
 * @param {string} [params.reason]
 * @param {string|null} [params.requestedBy]
 * @param {string} [params.idempotencyKey]
 * @param {number} [params.refundAmountRupees] - optional partial refund (<= payment.amount)
 */
export async function orchestrateOnlineRefund({
  prisma,
  payment,
  orderId,
  orderNumber,
  reason,
  requestedBy,
  idempotencyKey,
  refundAmountRupees
}) {
  const key = idempotencyKey || `refund:${payment.id}:${orderId}`
  const amountNum = Number(payment.amount)
  const refundRupees =
    refundAmountRupees != null && Number.isFinite(Number(refundAmountRupees))
      ? Math.min(Number(refundAmountRupees), amountNum)
      : amountNum
  if (refundRupees <= 0) {
    return { ok: false, error: 'Invalid refund amount' }
  }

  const existing = await prisma.refundTransaction.findUnique({
    where: { idempotencyKey: key }
  })
  if (existing?.status === RefundTransactionStatus.SUCCEEDED) {
    return { ok: true, replay: true, gatewayRefundId: existing.gatewayRefundId }
  }

  const pre = validatePaymentLifecycleTransition(payment.status, 'REFUND_PENDING')
  if (!pre.valid && payment.status !== 'REFUND_PENDING') {
    return { ok: false, error: pre.error || 'Payment not refundable from current status' }
  }

  if (payment.status === 'SUCCESS') {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUND_PENDING' }
      })
      await tx.paymentStatusHistory.create({
        data: {
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: 'REFUND_PENDING',
          changedBy: requestedBy || null,
          reason: reason || 'Refund initiated (admin)',
          metadata: { orderId, idempotencyKey: key, refundRupees }
        }
      })
      await tx.refundTransaction.upsert({
        where: { idempotencyKey: key },
        create: {
          id: randomUUID(),
          paymentId: payment.id,
          orderId,
          idempotencyKey: key,
          amount: refundRupees,
          status: RefundTransactionStatus.PENDING,
          requestedBy: requestedBy || null
        },
        update: {
          status: RefundTransactionStatus.PROCESSING,
          amount: refundRupees,
          updatedAt: new Date()
        }
      })
    })
  }

  if (!payment.razorpayPaymentId) {
    return { ok: false, error: 'Missing razorpayPaymentId for online refund' }
  }

  try {
    const refund = await refundPayment(payment.razorpayPaymentId, refundRupees, {
      orderId,
      orderNumber,
      reason: reason || 'Order refund (admin)'
    })

    await prisma.$transaction(async (tx) => {
      await tx.refundTransaction.update({
        where: { idempotencyKey: key },
        data: {
          status: RefundTransactionStatus.SUCCEEDED,
          gatewayRefundId: refund.id,
          finalizedAt: new Date(),
          rawResponse: refund,
          updatedAt: new Date()
        }
      })
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          razorpayRefundId: refund.id,
          refundedAt: new Date()
        }
      })
      await tx.paymentStatusHistory.create({
        data: {
          paymentId: payment.id,
          fromStatus: 'REFUND_PENDING',
          toStatus: 'REFUNDED',
          changedBy: requestedBy || null,
          reason: reason || 'Refund confirmed by gateway',
          metadata: { orderId, gatewayRefundId: refund.id }
        }
      })
    })

    logger.info('[RefundOrchestrator][admin] Refund finalized', {
      orderId,
      paymentId: payment.id,
      refundId: refund.id
    })
    return { ok: true, replay: false, gatewayRefundId: refund.id }
  } catch (error) {
    logger.error('[RefundOrchestrator][admin] Gateway refund failed', {
      message: error.message,
      orderId,
      paymentId: payment.id
    })
    await prisma.refundTransaction.updateMany({
      where: { idempotencyKey: key },
      data: {
        status: RefundTransactionStatus.FAILED,
        rawResponse: { message: error.message },
        updatedAt: new Date()
      }
    })
    return { ok: false, error: error.message }
  }
}
