import { issueService } from '../../services/packing/issueService.js';

export const getIssues = async (req, res, next) => {
  try {
    const data = await issueService.getIssues(req.query);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const reportIssue = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const data = await issueService.reportIssue(req.body, userId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
