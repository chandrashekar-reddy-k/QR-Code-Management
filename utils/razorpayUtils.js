import Razorpay from 'razorpay'
import logger from './logger.js'

let razorpayInstance = null

export function getRazorpayInstance() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      logger.warn('[Razorpay] Razorpay credentials not configured')
      return null
    }
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })
  }
  return razorpayInstance
}

/**
 * Refund Razorpay payment (amount in rupees).
 */
export async function refundPayment(paymentId, amount, notes = {}) {
  if (!paymentId || paymentId.startsWith('pay_fake') || paymentId.startsWith('test_rzp')) {
    logger.info('[Razorpay] Mocking refund for dummy payment ID', { paymentId, amount })
    return {
      id: `simulated_rzp_ref_${Date.now()}`,
      payment_id: paymentId || 'pay_fake123',
      amount: Math.round(amount * 100),
      currency: 'INR',
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000)
    }
  }

  const razorpay = getRazorpayInstance()
  if (!razorpay) {
    throw new Error('Razorpay not configured')
  }
  const refundOptions = {
    amount: Math.round(amount * 100),
    notes: {
      reason: notes.reason || 'Order status update (partner)',
      ...notes
    }
  }
  const refund = await razorpay.payments.refund(paymentId, refundOptions)
  logger.info('[Razorpay] Payment refunded', { paymentId, refundId: refund.id })
  return refund
}
