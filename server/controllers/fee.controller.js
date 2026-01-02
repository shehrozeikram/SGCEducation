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

module.exports = {
  getFeeStructureMatrix,
  bulkSaveFeeStructure
};
