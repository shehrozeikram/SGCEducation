const express = require('express');
const router = express.Router();
const feeController = require('../../controllers/fee.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

/**
 * Fee Routes - API v1
 * Base path: /api/v1/fees
 */

// All routes require authentication
router.use(authenticate);

// Fee structure routes
router.get('/structures/matrix', feeController.getFeeStructureMatrix);
router.post('/structures/bulk-save', isAdmin, feeController.bulkSaveFeeStructure);

module.exports = router;
