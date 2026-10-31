import express from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import * as barcodeCtr from '../../controllers/packing/barcodeController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/history', barcodeCtr.getPrintHistory);
router.post('/print', barcodeCtr.printLabels);
router.post('/reprint', barcodeCtr.reprintLabels);
router.get('/my-tasks', barcodeCtr.getMyTasks);
router.post('/complete-task', barcodeCtr.completeTask);

export default router;
