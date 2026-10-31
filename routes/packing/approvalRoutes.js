import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import * as approvalCtr from '../../controllers/packing/approvalController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', approvalCtr.getApprovals);
router.post('/', approvalCtr.createApproval);
router.post('/:id/action', approvalCtr.processApprovalAction);

export default router;
