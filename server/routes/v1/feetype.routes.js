const express = require('express');
const router = express.Router();
const feeTypeController = require('../../controllers/feetype.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * FeeType Routes - API v1
 * Base path: /api/v1/fee-types
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by users with fee view permission
router.get('/', hasPermission(PERMISSIONS.FEES.VIEW), feeTypeController.getFeeTypes);

// Admin/finance manager routes - requiring fee manage permission
router.post('/', hasPermission(PERMISSIONS.FEES.MANAGE), feeTypeController.createFeeType);

module.exports = router;


