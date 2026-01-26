const feeService = require('../services/fee.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Fee Controller - Handles HTTP requests for fee management
 */

/**
 * @route   GET /api/v1/fees/structures/matrix
 * @desc    Get fee structure matrix
 * @access  Private
 */
const getFeeStructureMatrix = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution
  };

  const matrix = await feeService.getFeeStructureMatrix(filters, req.user);

  res.json({
    success: true,
    data: matrix
  });
});

/**
 * @route   GET /api/v1/fees/structures/class/:classId
 * @desc    Get fee structure by class ID
 * @access  Private
 */
const getFeeStructureByClass = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const feeStructure = await feeService.getFeeStructureByClass(classId, req.user);

  res.json({
    success: true,
    data: feeStructure
  });
});

/**
 * @route   POST /api/v1/fees/structures/bulk-save
 * @desc    Bulk save fee structures
 * @access  Private (Admin)
 */
const bulkSaveFeeStructure = asyncHandler(async (req, res) => {
  const result = await feeService.bulkSaveFeeStructure(req.body, req.user);

  res.json({
    success: true,
    message: 'Fee structure saved successfully',
    data: result
  });
});

/**
 * @route   GET /api/v1/fees/students/without-fee-structure
 * @desc    Get students without fee structure
 * @access  Private
 */
const getStudentsWithoutFeeStructure = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution
  };

  const students = await feeService.getStudentsWithoutFeeStructure(filters, req.user);

  res.json({
    success: true,
    data: students
  });
});

/**
 * @route   POST /api/v1/fees/assign-structure
 * @desc    Assign fee structure to a student
 * @access  Private (Admin)
 */
const assignFeeStructure = asyncHandler(async (req, res) => {
  const result = await feeService.assignFeeStructure(req.body, req.user);

  res.json({
    success: true,
    message: 'Fee structure assigned successfully',
    data: result
  });
});

/**
 * @route   GET /api/v1/fees/student-fees
 * @desc    Get students with assigned fee structures
 * @access  Private
 */
const getStudentFees = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    academicYear: req.query.academicYear,
    student: req.query.student
  };

  const studentFees = await feeService.getStudentFees(filters, req.user);

  res.json({
    success: true,
    data: studentFees
  });
});

/**
 * @route   POST /api/v1/fees/generate-vouchers
 * @desc    Generate vouchers for selected students
 * @access  Private (Admin)
 */
const generateVouchers = asyncHandler(async (req, res) => {
  const result = await feeService.generateVouchers(req.body, req.user);

  res.json({
    success: true,
    message: `Successfully generated ${result.totalGenerated} voucher(s)`,
    data: result
  });
});

/**
 * @route   POST /api/v1/fees/record-payment
 * @desc    Record a fee payment (supports partial payments)
 * @access  Private (Admin)
 */
const recordPayment = asyncHandler(async (req, res) => {
  const result = await feeService.recordPayment(req.body, req.user);

  res.json({
    success: true,
    message: 'Payment recorded successfully',
    data: result
  });
});

/**
 * @route   GET /api/v1/fees/outstanding-balances
 * @desc    Get outstanding balances for students
 * @access  Private
 */
const getOutstandingBalances = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    studentId: req.query.studentId,
    academicYear: req.query.academicYear
  };

  const result = await feeService.getOutstandingBalances(filters, req.user);

  res.json({
    success: true,
    data: result
  });
});

/**
 * @route   GET /api/v1/fees/payments
 * @desc    Get fee payments/receipts with search filters
 * @access  Private
 */
const getPayments = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    studentId: req.query.studentId,
    rollNumber: req.query.rollNumber,
    studentName: req.query.studentName,
    receiptNumber: req.query.receiptNumber,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };

  const payments = await feeService.getPayments(filters, req.user);

  res.json({
    success: true,
    data: payments
  });
});

/**
 * @route   DELETE /api/v1/fees/vouchers
 * @desc    Delete unpaid voucher for a student
 * @access  Private (Admin)
 */
const deleteVoucher = asyncHandler(async (req, res) => {
  const result = await feeService.deleteVoucher(req.body, req.user);

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

/**
 * @route   GET /api/v1/fees/suspense
 * @desc    Get unidentified payments
 * @access  Private
 */
const getSuspenseEntries = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    status: req.query.status,
    transactionId: req.query.transactionId
  };

  const entries = await feeService.getSuspenseEntries(filters, req.user);

  res.json({
    success: true,
    data: entries
  });
});

/**
 * @route   POST /api/v1/fees/suspense
 * @desc    Record an unidentified payment
 * @access  Private (Admin)
 */
const recordSuspenseEntry = asyncHandler(async (req, res) => {
  const entry = await feeService.recordSuspenseEntry(req.body, req.user);

  res.json({
    success: true,
    message: 'Suspense entry recorded successfully',
    data: entry
  });
});

/**
 * @route   POST /api/v1/fees/suspense/reconcile
 * @desc    Reconcile an unidentified payment to a student
 * @access  Private (Admin)
 */
const reconcileSuspenseEntry = asyncHandler(async (req, res) => {
  const result = await feeService.reconcileSuspenseEntry(req.body, req.user);

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

module.exports = {
  getFeeStructureMatrix,
  getFeeStructureByClass,
  bulkSaveFeeStructure,
  getStudentsWithoutFeeStructure,
  assignFeeStructure,
  getStudentFees,
  generateVouchers,
  recordPayment,
  getOutstandingBalances,
  getPayments,
  deleteVoucher,
  getSuspenseEntries,
  recordSuspenseEntry,
  reconcileSuspenseEntry
};
