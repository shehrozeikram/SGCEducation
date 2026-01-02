const express = require('express');
const router = express.Router();
const feeHeadController = require('../../controllers/feeHead.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

/**
 * Fee Head Routes - API v1
 * Base path: /api/v1/fee-heads
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', feeHeadController.getFeeHeads);
router.get('/priorities/available', feeHeadController.getAvailablePriorities);
router.get('/:id', feeHeadController.getFeeHeadById);

// Admin only routes
router.post('/', isAdmin, feeHeadController.createFeeHead);
router.put('/:id', isAdmin, feeHeadController.updateFeeHead);
router.put('/:id/reactivate', isAdmin, feeHeadController.reactivateFeeHead);
router.delete('/:id', isAdmin, feeHeadController.deleteFeeHead);

module.exports = router;
