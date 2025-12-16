const express = require('express');
const router = express.Router();
const feeTypeController = require('../../controllers/feetype.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

/**
 * FeeType Routes - API v1
 * Base path: /api/v1/fee-types
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', feeTypeController.getFeeTypes);

// Admin only routes
router.post('/', isAdmin, feeTypeController.createFeeType);

module.exports = router;


