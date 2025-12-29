const express = require('express');
const router = express.Router();
const {
  getFeeHeads,
  getFeeHeadById,
  createFeeHead,
  updateFeeHead,
  deleteFeeHead,
  getAvailablePriorities,
  reactivateFeeHead
} = require('../../controllers/feeHead.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * Fee Head Routes
 * IMPORTANT: Specific routes must come before parameterized routes (:id)
 */
router.get('/', getFeeHeads);
router.get('/priorities/available', getAvailablePriorities);
router.get('/:id', getFeeHeadById);
router.post('/', isAdmin, createFeeHead);
router.put('/:id', isAdmin, updateFeeHead);
router.put('/:id/reactivate', isAdmin, reactivateFeeHead);
router.delete('/:id', isAdmin, deleteFeeHead);

module.exports = router;




