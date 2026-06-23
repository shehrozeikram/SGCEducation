const express = require('express');
const router = express.Router();
const activityLogController = require('../../controllers/activityLog.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Activity Log Routes - API v1
 * Base path: /api/v1/activity-logs
 */

// All routes require authentication
router.use(authenticate);

// Get activity logs with pagination and filters
router.get('/', hasPermission(PERMISSIONS.SYSTEM.MANAGE), activityLogController.getActivityLogs);

// Get recent activity logs
router.get('/recent', hasPermission(PERMISSIONS.SYSTEM.MANAGE), activityLogController.getRecentLogs);

// Get activity statistics
router.get('/stats', hasPermission(PERMISSIONS.SYSTEM.MANAGE), activityLogController.getActivityStats);

module.exports = router;
