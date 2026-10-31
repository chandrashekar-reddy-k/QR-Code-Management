import express from 'express';
import {
  getAuditDashboard,
  listAudits,
  getAuditById,
  initiateAudit,
  recordPhysicalCount,
  submitAuditCount,
  approveAndReconcileAudit
} from '../../controllers/inventory/auditController.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware
router.use(authMiddleware);

// 1. Dashboard Metrics
router.get('/dashboard', getAuditDashboard);

// 2. List & Query Audits
router.get('/', listAudits);

// 3. Initiate New Audit (Captures Snapshot)
router.post('/initiate', initiateAudit);

// 4. View Single Audit
router.get('/:id', getAuditById);

// 5. Record Physical Count Lines
router.post('/:id/count', recordPhysicalCount);

// 6. Submit Count (Lock edits & compute variance)
router.post('/:id/submit', submitAuditCount);

// 7. Approve & Post Ledger Adjustment
router.post('/:id/approve', approveAndReconcileAudit);

export default router;
