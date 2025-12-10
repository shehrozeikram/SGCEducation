const express = require('express');
const router = express.Router();
const performanceController = require('../../controllers/performance.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(isSuperAdmin);

router.get('/system-health', performanceController.getSystemHealth);
router.get('/database-stats', performanceController.getDatabaseStats);
router.get('/active-sessions', performanceController.getActiveSessions);
router.get('/error-rates', performanceController.getErrorRates);
router.get('/metrics', performanceController.getPerformanceMetrics);

module.exports = router;
