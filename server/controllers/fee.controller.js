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
    academicYear: req.query.academicYear
  };

  const studentFees = await feeService.getStudentFees(filters, req.user);

  res.json({
    success: true,
    data: studentFees
  });
});

module.exports = {
  getFeeStructureMatrix,
  bulkSaveFeeStructure,
  getStudentsWithoutFeeStructure,
  assignFeeStructure,
  getStudentFees
};
