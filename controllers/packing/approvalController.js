import { approvalService } from '../../services/packing/approvalService.js';

export const getApprovals = async (req, res, next) => {
  try {
    const data = await approvalService.getApprovals(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
// gsdfjhsd
export const createApproval = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await approvalService.createApproval(req.body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const processApprovalAction = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { action, comments } = req.body;
    const data = await approvalService.processApproval(req.params.id, action, comments, userId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
