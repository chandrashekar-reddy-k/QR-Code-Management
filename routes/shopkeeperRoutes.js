import { Router } from 'express';
import * as ctrl from '../controllers/shopkeeperController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/orders', authMiddleware, ctrl.getOrders);
router.get('/orders/unassigned-alerts', authMiddleware, ctrl.getUnassignedDeliveryAlerts);
router.get('/orders/:id', authMiddleware, ctrl.getOrderById);
router.put('/orders/:id/accept', authMiddleware, ctrl.acceptOrder);
router.put('/orders/:id/reject', authMiddleware, ctrl.rejectOrder);
router.put('/orders/:id/status', authMiddleware, ctrl.updateOrderStatus);
router.get('/orders/:id/pickup-otp', authMiddleware, ctrl.getOrGeneratePickupOtp);
router.post('/orders/:id/pickup-otp', authMiddleware, ctrl.getOrGeneratePickupOtp);
router.put('/orders/:id/handover', authMiddleware, ctrl.handoverOrder);
router.post('/orders/:id/request-delivery-otp', authMiddleware, async (req, res) => {
  try {
    const { callDeliveryApi } = await import('../controllers/partnerOrderController.js');
    const upstream = await callDeliveryApi({
      path: '/order/agent-milestone',
      method: 'POST',
      useServiceAuth: true,
      body: {
        orderId: req.params.id,
        milestone: 'REACHED_CUSTOMER'
      }
    });
    return res.json({ success: true, message: 'Arrived at customer location. Delivery OTP sent via SMS.', data: upstream });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Failed to trigger arrival OTP' });
  }
});
router.post('/order/agent-milestone', authMiddleware, async (req, res) => {
  try {
    const { callDeliveryApi } = await import('../controllers/partnerOrderController.js');
    const upstream = await callDeliveryApi({
      path: '/order/agent-milestone',
      method: 'POST',
      useServiceAuth: true,
      body: req.body
    });
    return res.json({ success: true, message: upstream?.message || 'Milestone recorded', data: upstream });
  } catch (err) {
    return res.status(err.statusCode || 400).json({ success: false, message: err.message || 'Failed to record milestone' });
  }
});
router.post('/orders/:id/handover', authMiddleware, ctrl.handoverOrder);
router.post('/orders/:id/verify-pickup-otp', authMiddleware, ctrl.handoverOrder);
router.put('/orders/:id/verify-pickup-otp', authMiddleware, ctrl.handoverOrder);
router.patch('/orders/:id/verify-pickup-otp', authMiddleware, ctrl.handoverOrder);
router.post('/orders/verify-pickup-otp', authMiddleware, (req, res, next) => {
  if (req.body?.orderId) {
    req.params.id = req.body.orderId;
    return ctrl.handoverOrder(req, res, next);
  }
  return res.status(400).json({ success: false, message: 'orderId is required' });
});
router.patch('/orders/verify-pickup-otp', authMiddleware, (req, res, next) => {
  if (req.body?.orderId) {
    req.params.id = req.body.orderId;
    return ctrl.handoverOrder(req, res, next);
  }
  return res.status(400).json({ success: false, message: 'orderId is required' });
});
router.put('/orders/:orderId/items/:itemId/pick', authMiddleware, ctrl.pickItem);
router.put('/orders/:orderId/items/:itemId/reject', authMiddleware, ctrl.rejectItem);

router.get('/returns', authMiddleware, ctrl.getReturns);
router.post('/returns', authMiddleware, ctrl.createReturn);
router.put('/returns/:id/approve', authMiddleware, ctrl.approveReturn);
router.put('/returns/:id/reject', authMiddleware, ctrl.rejectReturn);

router.get('/shopkeepers', authMiddleware, ctrl.getShopkeepers);
router.get('/shopkeepers/tracker', authMiddleware, ctrl.getShopkeepersTracker);
router.get('/shopkeepers/:id', authMiddleware, ctrl.getShopkeeperById);
router.post('/orders/:id/allocate-shopkeeper', authMiddleware, ctrl.allocateShopkeeper);
router.get('/sla', authMiddleware, ctrl.getSLAReport);
router.get('/dashboard/stats', authMiddleware, ctrl.getStats);
router.get('/delivery-agents', authMiddleware, ctrl.getActiveDeliveryAgents);
router.post('/orders/:id/assign-rider', authMiddleware, ctrl.assignRider);

// SLA Configuration
router.get('/sla-config', authMiddleware, ctrl.getSlaConfig);
router.put('/sla-config', authMiddleware, ctrl.upsertSlaConfig);

export default router;
