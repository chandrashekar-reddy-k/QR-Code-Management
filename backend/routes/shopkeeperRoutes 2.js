// routes/shopkeeperRoutes.js
import { Router } from 'express';
import * as ctrl from '../controllers/shopkeeperController.js';

const router = Router();

router.get('/orders', ctrl.getOrders);
router.get('/orders/:id', ctrl.getOrderById);
router.put('/orders/:id/accept', ctrl.acceptOrder);
router.put('/orders/:id/reject', ctrl.rejectOrder);
router.put('/orders/:id/status', ctrl.updateOrderStatus);
router.put('/orders/:orderId/items/:itemId/pick', ctrl.pickItem);
router.put('/orders/:orderId/items/:itemId/reject', ctrl.rejectItem);

router.get('/returns', ctrl.getReturns);
router.post('/returns', ctrl.createReturn);
router.put('/returns/:id/approve', ctrl.approveReturn);
router.put('/returns/:id/reject', ctrl.rejectReturn);

router.get('/shopkeepers', ctrl.getShopkeepers);
router.get('/shopkeepers/:id', ctrl.getShopkeeperById);
router.post('/orders/:id/allocate-shopkeeper', ctrl.allocateShopkeeper);
router.get('/sla', ctrl.getSLAReport);
router.get('/dashboard/stats', ctrl.getStats);
router.get('/delivery-agents', ctrl.getActiveDeliveryAgents);
router.post('/orders/:id/assign-rider', ctrl.assignRider);

export default router;
