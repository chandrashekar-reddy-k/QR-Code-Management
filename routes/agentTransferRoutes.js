import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as agentTransferCtr from '../controllers/vsms/agentTransferController.js';

const router = express.Router();

// Direct routes for /api/v1/agent-transfers
router.get('/active-agents', authMiddleware, agentTransferCtr.getActiveAgents);
router.get('/active-vehicles', authMiddleware, agentTransferCtr.getActiveVehicles);
router.post('/', authMiddleware, agentTransferCtr.createTransfer);
router.get('/', authMiddleware, agentTransferCtr.getTransfers);
router.get('/:id', authMiddleware, agentTransferCtr.getTransferById);
router.put('/:id/approve', authMiddleware, agentTransferCtr.approveTransfer);
router.post('/:id/approve', authMiddleware, agentTransferCtr.approveTransfer);
router.put('/:id/reject', authMiddleware, agentTransferCtr.rejectTransfer);
router.post('/:id/reject', authMiddleware, agentTransferCtr.rejectTransfer);

// Fallback nested routes if url is prefixed
router.get('/agent-transfers/active-agents', authMiddleware, agentTransferCtr.getActiveAgents);
router.get('/agent-transfers/active-vehicles', authMiddleware, agentTransferCtr.getActiveVehicles);
router.post('/agent-transfers', authMiddleware, agentTransferCtr.createTransfer);
router.get('/agent-transfers', authMiddleware, agentTransferCtr.getTransfers);
router.get('/agent-transfers/:id', authMiddleware, agentTransferCtr.getTransferById);
router.put('/agent-transfers/:id/approve', authMiddleware, agentTransferCtr.approveTransfer);
router.post('/agent-transfers/:id/approve', authMiddleware, agentTransferCtr.approveTransfer);
router.put('/agent-transfers/:id/reject', authMiddleware, agentTransferCtr.rejectTransfer);
router.post('/agent-transfers/:id/reject', authMiddleware, agentTransferCtr.rejectTransfer);

export default router;
