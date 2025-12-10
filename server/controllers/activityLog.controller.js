const activityLogService = require('../services/activityLog.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/v1/activity-logs
 * @desc    Get activity logs with pagination
 * @access  Private
 */
const getActivityLogs = asyncHandler(async (req, res) => {
  const { user, action, resource, status, startDate, endDate, page = 1, limit = 50 } = req.query;

  const result = await activityLogService.getActivityLogs(
    { user, action, resource, status, startDate, endDate },
    req.user,
    parseInt(page),
    parseInt(limit)
  );

  res.json({
    success: true,
    ...result
  });
});

/**
 * @route   GET /api/v1/activity-logs/recent
 * @desc    Get recent activity logs
 * @access  Private
 */
const getRecentLogs = asyncHandler(async (req, res) => {
  const { limit = 10, institution } = req.query;

  const logs = await activityLogService.getRecentLogs(req.user, parseInt(limit), institution);

  res.json({
    success: true,
    data: logs
  });
});

/**
 * @route   GET /api/v1/activity-logs/stats
 * @desc    Get activity statistics
 * @access  Private (Super Admin)
 */
const getActivityStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const stats = await activityLogService.getActivityStats(req.user, parseInt(days));

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getActivityLogs,
  getRecentLogs,
  getActivityStats
};
