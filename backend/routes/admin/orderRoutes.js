import express from 'express'
import {
  authMiddleware,
  requireRole
} from '../../middlewares/authMiddleware.js'
import {
  getAdminOrderById,
  listAdminOrders,
  listPartnerWarehouses,
  patchAdminOrderStatus
} from '../../controllers/admin/orderController.js'
import {
  assignOrderToDeliveryAgent,
  listDeliveryAgentsByWarehouse
} from '../../controllers/admin/orderAssignmentController.js'
import {
  adminStatusUpdateValidator,
  listAdminOrdersValidator,
  orderIdParamValidator,
  partnerWarehouseDiscoveryValidator,
  validateAdminRequest
} from '../../validators/admin/orderValidator.js'
import {
  assignDeliveryAgentValidator,
  listDeliveryAgentsByWarehouseValidator
} from '../../validators/admin/orderAssignmentValidator.js'

const router = express.Router()
const adminOrderWriteRoles = ['SUPER_ADMIN', 'OPERATIONAL_ADMIN', 'OPS_ADMIN']

router.get(
  '/',
  authMiddleware,
  requireRole(...adminOrderWriteRoles),
  listAdminOrdersValidator,
  validateAdminRequest,
  listAdminOrders
)

router.get(
  '/partners',
  authMiddleware,
  requireRole(...adminOrderWriteRoles),
  partnerWarehouseDiscoveryValidator,
  validateAdminRequest,
  listPartnerWarehouses
)

router.get(
  '/delivery-agents',
  authMiddleware,
  requireRole(...adminOrderWriteRoles),
  listDeliveryAgentsByWarehouseValidator,
  validateAdminRequest,
  listDeliveryAgentsByWarehouse
)

router.get(
  '/:orderId',
  authMiddleware,
  requireRole(...adminOrderWriteRoles),
  orderIdParamValidator,
  validateAdminRequest,
  getAdminOrderById
)

router.patch(
  '/:orderId/status',
  authMiddleware,
  requireRole(...adminOrderWriteRoles),
  orderIdParamValidator,
  adminStatusUpdateValidator,
  validateAdminRequest,
  patchAdminOrderStatus
)

router.put(
  '/:orderId/status',
  authMiddleware,
  requireRole(...adminOrderWriteRoles),
  orderIdParamValidator,
  adminStatusUpdateValidator,
  validateAdminRequest,
  patchAdminOrderStatus
)

router.post(
  '/:orderId/assign-delivery-agent',
  authMiddleware,
  requireRole(...adminOrderWriteRoles),
  assignDeliveryAgentValidator,
  validateAdminRequest,
  assignOrderToDeliveryAgent
)

export default router
