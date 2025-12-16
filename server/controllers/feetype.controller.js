const feeTypeService = require('../services/feetype.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Get all fee types
 */
const getFeeTypes = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    search: req.query.search
  };

  const feeTypes = await feeTypeService.getAllFeeTypes(filters, req.user);
  res.json({
    success: true,
    data: feeTypes
  });
});

/**
 * Create new fee type
 */
const createFeeType = asyncHandler(async (req, res) => {
  const feeType = await feeTypeService.createFeeType(req.body, req.user);
  res.status(201).json({
    success: true,
    data: feeType
  });
});

module.exports = {
  getFeeTypes,
  createFeeType
};


