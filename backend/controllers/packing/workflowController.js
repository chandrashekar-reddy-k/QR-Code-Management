import { workflowService } from '../../services/packing/workflowService.js';

// Material Issue
export const createMaterialIssue = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const payloadData = { ...req.body, woId: req.params.woId || req.params.id || req.body.woId || req.body.id };
    const data = await workflowService.createMaterialIssue(payloadData, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMaterialIssueByWoId = async (req, res, next) => {
  try {
    const data = await workflowService.getMaterialIssueByWoId(req.params.woId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Quality Check
export const getQualityChecks = async (req, res, next) => {
  try {
    const result = await workflowService.getQualityChecks(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getQualityCheckByWoId = async (req, res, next) => {
  try {
    const data = await workflowService.getQualityCheckByWoId(req.params.woId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const submitQualityCheck = async (req, res, next) => {
  try {
    const inspectorId = req.user?.id || req.user?.userId;
    const data = await workflowService.submitQualityCheck(req.body, inspectorId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Finished Goods
export const getFinishedGoods = async (req, res, next) => {
  try {
    const result = await workflowService.getFinishedGoods(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const postFinishedGoods = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await workflowService.postFinishedGoods(req.body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Repacking
export const getRepackingLogs = async (req, res, next) => {
  try {
    const result = await workflowService.getRepackingLogs(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const startRepacking = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await workflowService.startRepacking(req.body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateRepacking = async (req, res, next) => {
  try {
    const data = await workflowService.updateRepacking(req.params.id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createRepackingLog = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await workflowService.createRepackingLog(req.body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
