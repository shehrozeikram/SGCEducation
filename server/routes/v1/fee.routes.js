const express = require('express');
const router = express.Router();
const {
  getFeeStructures,
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getFeeStructureMatrix,
  bulkSaveFeeStructureMatrix,
  generateStudentFees,
  getStudentFees,
  getStudentFeeById,
  createFeePayment,
  getFeePayments,
  getFeeStatistics,
  getMiscOperationsStudents,
  generateVouchers,
  getStudentsWithoutFeeStructure,
  assignFeeStructureToStudent
} = require('../../controllers/fee.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize, isAdmin } = require('../../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * Fee Structure Routes
 */
router.get('/structures', getFeeStructures);
router.get('/structures/matrix', getFeeStructureMatrix);
router.get('/structures/:id', getFeeStructureById);
router.post('/structures', isAdmin, createFeeStructure);
router.post('/structures/bulk-save', isAdmin, bulkSaveFeeStructureMatrix);
router.put('/structures/:id', isAdmin, updateFeeStructure);
router.delete('/structures/:id', isAdmin, deleteFeeStructure);

/**
 * Student Fee Routes
 */
router.post('/generate', isAdmin, generateStudentFees);
router.get('/student-fees', getStudentFees);
router.get('/student-fees/:id', getStudentFeeById);

/**
 * Fee Payment Routes
 */
router.post('/payments', isAdmin, createFeePayment);
router.get('/payments', getFeePayments);

/**
 * Statistics Routes
 */
router.get('/statistics', getFeeStatistics);

/**
 * Misc Operations Routes
 */
router.get('/misc-operations/students', getMiscOperationsStudents);

/**
 * Voucher Generation Routes
 */
router.post('/generate-vouchers', isAdmin, generateVouchers);

/**
 * Assign Fee Structure Routes
 */
router.get('/students/without-fee-structure', getStudentsWithoutFeeStructure);
router.post('/assign-structure', isAdmin, assignFeeStructureToStudent);

module.exports = router;



