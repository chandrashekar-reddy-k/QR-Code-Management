import { barcodeService } from '../../services/packing/barcodeService.js';

export const getPrintHistory = async (req, res, next) => {
  try {
    const data = await barcodeService.getPrintHistory();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const printLabels = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await barcodeService.printLabels(req.body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const reprintLabels = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await barcodeService.reprintLabels(req.body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMyTasks = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await barcodeService.getMyTasks(userId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const completeTask = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await barcodeService.completeTask(req.body, userId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
