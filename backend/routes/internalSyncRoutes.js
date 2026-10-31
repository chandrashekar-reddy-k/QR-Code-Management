import express from 'express'
import { syncOrderStatusFromDelivery, syncUserFromHrms, getVehicles, getUserDetailsForAdmin, updateUserDetailsForAdmin, deleteUserDetailsForAdmin, cancelBroadcast, triggerBroadcasts, debugEmit, syncUnassignedTimeoutFromDelivery } from '../controllers/internalSyncController.js'
import { idempotencyMiddleware } from '../middlewares/idempotencyMiddleware.js'

const router = express.Router()

router.post('/order-sync/status', idempotencyMiddleware('internal-order-sync-status'), syncOrderStatusFromDelivery)
router.post('/order-sync/unassigned-timeout', syncUnassignedTimeoutFromDelivery)
router.post('/broadcast/cancel', cancelBroadcast)
router.post('/broadcast/trigger', triggerBroadcasts)
router.post('/broadcast/debug-emit', debugEmit)
router.post('/user-sync', syncUserFromHrms)
router.get('/vehicles', getVehicles)
router.get('/users/:id', getUserDetailsForAdmin)
router.put('/users/:id', updateUserDetailsForAdmin)
router.delete('/users/:id', deleteUserDetailsForAdmin)

export default router
