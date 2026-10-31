import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import * as wfCtr from '../../controllers/packing/workflowController.js';

const router = express.Router();

router.use(authMiddleware);

// Material Issue
router.post('/material-issue', wfCtr.createMaterialIssue);
router.post('/material-issues', wfCtr.createMaterialIssue);
router.get('/material-issue/:woId', wfCtr.getMaterialIssueByWoId);
router.get('/material-issues/:woId', wfCtr.getMaterialIssueByWoId);

// Quality Check
router.get('/quality-checks', wfCtr.getQualityChecks);
router.get('/quality-checks/:woId', wfCtr.getQualityCheckByWoId);
router.post('/quality-checks', wfCtr.submitQualityCheck);

// Finished Goods
router.get('/finished-goods', wfCtr.getFinishedGoods);
router.post('/finished-goods', wfCtr.postFinishedGoods);

// Repacking
router.get('/repacking', wfCtr.getRepackingLogs);
router.post('/repacking/start', wfCtr.startRepacking);
router.patch('/repacking/:id', wfCtr.updateRepacking);
router.post('/repacking', wfCtr.createRepackingLog);

export default router;
