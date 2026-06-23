const express = require('express');
const router = express.Router();
const feeController = require('../../controllers/fee.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin, hasPermission, hasAnyPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Fee Routes - API v1
 * Base path: /api/v1/fees
 */

// All routes require authentication
router.use(authenticate);

// Fee structure routes
router.get('/structures/matrix', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getFeeStructureMatrix);
router.get('/structures/class/:classId', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getFeeStructureByClass);
router.post('/structures/bulk-save', hasAnyPermission(PERMISSIONS.FEES.MANAGE), feeController.bulkSaveFeeStructure);
router.post('/bulk-update', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.EDIT_VOUCHER), feeController.bulkUpdateStudentFees);

// Student fee assignment routes
router.get('/students/without-fee-structure', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getStudentsWithoutFeeStructure);
router.post('/assign-structure', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.EDIT_VOUCHER), feeController.assignFeeStructure);
router.put('/update-structure', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.EDIT_VOUCHER), feeController.updateFeeStructure);
router.get('/student-fees', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.VIEW_VOUCHER, PERMISSIONS.FEES.PRINT_VOUCHER), feeController.getStudentFees);
router.post('/generate-vouchers', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.GENERATE_VOUCHER), feeController.generateVouchers);

// Payment routes
router.post('/record-payment', hasAnyPermission(PERMISSIONS.FEES.MANAGE, PERMISSIONS.FEES.SUBMIT_VOUCHER), feeController.recordPayment);
router.get('/outstanding-balances', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getOutstandingBalances);
router.get('/payments', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getPayments);
router.delete('/payments/bulk', hasAnyPermission(PERMISSIONS.FEES.DELETE, PERMISSIONS.FEES.DELETE_VOUCHER), feeController.bulkReversePayments);
router.delete('/payments/:paymentId', hasAnyPermission(PERMISSIONS.FEES.DELETE, PERMISSIONS.FEES.DELETE_VOUCHER), feeController.reversePayment);

// Voucher routes
router.delete('/vouchers', hasAnyPermission(PERMISSIONS.FEES.DELETE, PERMISSIONS.FEES.DELETE_VOUCHER), feeController.deleteVoucher);

// Suspense management routes
router.get('/suspense', hasAnyPermission(PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.MANAGE), feeController.getSuspenseEntries);
router.post('/suspense', hasAnyPermission(PERMISSIONS.FEES.MANAGE), feeController.recordSuspenseEntry);
router.post('/suspense/reconcile', hasAnyPermission(PERMISSIONS.FEES.MANAGE), feeController.reconcileSuspenseEntry);
router.delete('/suspense/:id', hasAnyPermission(PERMISSIONS.FEES.DELETE, PERMISSIONS.FEES.DELETE_VOUCHER), feeController.deleteSuspenseEntry);

module.exports = router;
