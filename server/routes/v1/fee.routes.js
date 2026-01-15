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
router.get('/structures/class/:classId', feeController.getFeeStructureByClass);
router.post('/structures/bulk-save', isAdmin, feeController.bulkSaveFeeStructure);

// Student fee assignment routes
router.get('/students/without-fee-structure', feeController.getStudentsWithoutFeeStructure);
router.post('/assign-structure', isAdmin, feeController.assignFeeStructure);
router.get('/student-fees', feeController.getStudentFees);
router.post('/generate-vouchers', isAdmin, feeController.generateVouchers);

// Payment routes
router.post('/record-payment', isAdmin, feeController.recordPayment);
router.get('/outstanding-balances', feeController.getOutstandingBalances);
router.get('/payments', feeController.getPayments);

// Voucher routes
router.delete('/vouchers', isAdmin, feeController.deleteVoucher);

module.exports = router;
