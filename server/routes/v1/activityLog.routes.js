const express = require('express');
const router = express.Router();
const activityLogController = require('../../controllers/activityLog.controller');
const { authenticate } = require('../../middleware/auth.middleware');

/**
 * Activity Log Routes - API v1
 * Base path: /api/v1/activity-logs
 */

// All routes require authentication
router.use(authenticate);

// Get activity logs with pagination and filters
router.get('/', activityLogController.getActivityLogs);

// Get recent activity logs
router.get('/recent', activityLogController.getRecentLogs);

// Get activity statistics
router.get('/stats', activityLogController.getActivityStats);

module.exports = router;
