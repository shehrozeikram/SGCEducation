const express = require('express');
const router = express.Router();
const feeController = require('../../controllers/fee.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin, hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Fee Routes - API v1
 * Base path: /api/v1/fees
 */

// All routes require authentication
router.use(authenticate);

// Fee structure routes
router.get('/structures/matrix', hasPermission(PERMISSIONS.FEES.VIEW), feeController.getFeeStructureMatrix);
router.get('/structures/class/:classId', hasPermission(PERMISSIONS.FEES.VIEW), feeController.getFeeStructureByClass);
router.post('/structures/bulk-save', hasPermission(PERMISSIONS.FEES.MANAGE), feeController.bulkSaveFeeStructure);
router.post('/bulk-update', hasPermission(PERMISSIONS.FEES.MANAGE), feeController.bulkUpdateStudentFees);

// Student fee assignment routes
router.get('/students/without-fee-structure', hasPermission(PERMISSIONS.FEES.VIEW), feeController.getStudentsWithoutFeeStructure);
router.post('/assign-structure', hasPermission(PERMISSIONS.FEES.MANAGE), feeController.assignFeeStructure);
router.put('/update-structure', hasPermission(PERMISSIONS.FEES.MANAGE), feeController.updateFeeStructure);
router.get('/student-fees', hasPermission(PERMISSIONS.FEES.VIEW), feeController.getStudentFees);
router.post('/generate-vouchers', hasPermission(PERMISSIONS.FEES.MANAGE), feeController.generateVouchers);

// Payment routes
router.post('/record-payment', hasPermission(PERMISSIONS.FEES.MANAGE), feeController.recordPayment);
router.get('/outstanding-balances', hasPermission(PERMISSIONS.FEES.VIEW), feeController.getOutstandingBalances);
router.get('/payments', hasPermission(PERMISSIONS.FEES.VIEW), feeController.getPayments);
router.delete('/payments/:paymentId', hasPermission(PERMISSIONS.FEES.DELETE), feeController.reversePayment);

// Voucher routes
router.delete('/vouchers', hasPermission(PERMISSIONS.FEES.DELETE), feeController.deleteVoucher);

// Suspense management routes
router.get('/suspense', hasPermission(PERMISSIONS.FEES.VIEW), feeController.getSuspenseEntries);
router.post('/suspense', hasPermission(PERMISSIONS.FEES.MANAGE), feeController.recordSuspenseEntry);
router.post('/suspense/reconcile', hasPermission(PERMISSIONS.FEES.MANAGE), feeController.reconcileSuspenseEntry);
router.delete('/suspense/:id', hasPermission(PERMISSIONS.FEES.DELETE), feeController.deleteSuspenseEntry);

module.exports = router;
