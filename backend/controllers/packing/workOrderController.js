import { workOrderService } from '../../services/packing/workOrderService.js';

export const getWorkOrders = async (req, res, next) => {
  try {
    const result = await workOrderService.getWorkOrders(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const createWorkOrder = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await workOrderService.createWorkOrder(req.body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('CRITICAL ERROR in createWorkOrder:', err);
    return res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
};

export const getWorkOrderById = async (req, res, next) => {
  try {
    const data = await workOrderService.getWorkOrderById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Work order not found' });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateWorkOrder = async (req, res, next) => {
  try {
    const data = await workOrderService.updateWorkOrder(req.params.id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateWorkOrderStatus = async (req, res, next) => {
  try {
    const { status, targetWoStatus, extra: nestedExtra, ...restExtra } = req.body;
    const targetStatus = status || targetWoStatus || req.body.status;
    const extra = { ...(nestedExtra || {}), ...restExtra };
    const data = await workOrderService.updateWorkOrderStatus(req.params.id, targetStatus, extra);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const pauseWorkOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const data = await workOrderService.pauseWorkOrder(req.params.id, reason);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const resumeWorkOrder = async (req, res, next) => {
  try {
    const data = await workOrderService.resumeWorkOrder(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteWorkOrder = async (req, res, next) => {
  try {
    const data = await workOrderService.deleteWorkOrder(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
