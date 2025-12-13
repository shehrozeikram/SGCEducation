const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboard.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

/**
 * Dashboard Routes - API v1
 * Base path: /api/v1/dashboard
 */

// All routes require authentication and admin role (super_admin, admin)
router.use(authenticate);
router.use(isAdmin);

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get analytics data (trends, charts)
router.get('/analytics', dashboardController.getAnalytics);

module.exports = router;
