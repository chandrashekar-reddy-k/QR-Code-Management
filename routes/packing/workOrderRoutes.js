import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import * as woCtr from '../../controllers/packing/workOrderController.js';
import { createMaterialIssue } from '../../controllers/packing/workflowController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', woCtr.getWorkOrders);
router.post('/', woCtr.createWorkOrder);
router.get('/:id', woCtr.getWorkOrderById);
router.delete('/:id', woCtr.deleteWorkOrder);
router.patch('/:id', woCtr.updateWorkOrder);
router.put('/:id', woCtr.updateWorkOrder);
router.put('/:id/status', woCtr.updateWorkOrderStatus);
router.patch('/:id/status', woCtr.updateWorkOrderStatus);
router.post('/:id/pause', woCtr.pauseWorkOrder);
router.post('/:id/resume', woCtr.resumeWorkOrder);
router.post('/:woId/issue-materials', createMaterialIssue);
router.post('/:id/start-packing', (req, res, next) => { req.body.status = 'PACKING_STARTED'; return woCtr.updateWorkOrderStatus(req, res, next); });
router.patch('/:id/update-quantity', woCtr.updateWorkOrder);
router.post('/:id/complete', (req, res, next) => { req.body.status = 'PACKING_COMPLETED'; return woCtr.updateWorkOrderStatus(req, res, next); });

export default router;
