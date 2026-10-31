import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import * as authPackingCtr from '../../controllers/packing/authPackingController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/qc-inspectors', authPackingCtr.getQcInspectors);
router.get('/users', authPackingCtr.getTeamUsers);
router.get('/operators', authPackingCtr.getOperators);

export default router;
