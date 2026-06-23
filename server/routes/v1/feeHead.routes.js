const express = require('express');
const router = express.Router();
const feeHeadController = require('../../controllers/feeHead.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Fee Head Routes - API v1
 * Base path: /api/v1/fee-heads
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by users with fee view permission
router.get('/', hasPermission(PERMISSIONS.FEES.VIEW), feeHeadController.getFeeHeads);
router.get('/priorities/available', hasPermission(PERMISSIONS.FEES.VIEW), feeHeadController.getAvailablePriorities);
router.get('/:id', hasPermission(PERMISSIONS.FEES.VIEW), feeHeadController.getFeeHeadById);

// Admin/finance manager routes - requiring fee manage permission
router.post('/', hasPermission(PERMISSIONS.FEES.MANAGE), feeHeadController.createFeeHead);
router.put('/:id', hasPermission(PERMISSIONS.FEES.MANAGE), feeHeadController.updateFeeHead);
router.put('/:id/reactivate', hasPermission(PERMISSIONS.FEES.MANAGE), feeHeadController.reactivateFeeHead);
router.delete('/:id', hasPermission(PERMISSIONS.FEES.MANAGE), feeHeadController.deleteFeeHead);

module.exports = router;
