import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import * as issueCtr from '../../controllers/packing/issueController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', issueCtr.getIssues);
router.post('/', issueCtr.reportIssue);

export default router;
