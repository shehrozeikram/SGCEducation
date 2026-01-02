const feeHeadService = require('../services/feeHead.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * FeeHead Controller - Handles HTTP requests for fee head management
 */

/**
 * @route   GET /api/v1/fee-heads
 * @desc    Get all fee heads
 * @access  Private
 */
const getFeeHeads = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    search: req.query.search
  };

  const feeHeads = await feeHeadService.getAllFeeHeads(filters, req.user);

  res.json({
    success: true,
    count: feeHeads.length,
    data: feeHeads
  });
});

/**
 * @route   GET /api/v1/fee-heads/:id
 * @desc    Get fee head by ID
 * @access  Private
 */
const getFeeHeadById = asyncHandler(async (req, res) => {
  const feeHead = await feeHeadService.getFeeHeadById(req.params.id, req.user);

  res.json({
    success: true,
    data: feeHead
  });
});

/**
 * @route   POST /api/v1/fee-heads
 * @desc    Create new fee head
 * @access  Private (Admin)
 */
const createFeeHead = asyncHandler(async (req, res) => {
  const feeHead = await feeHeadService.createFeeHead(req.body, req.user);

  res.status(201).json({
    success: true,
    message: 'Fee head created successfully',
    data: feeHead
  });
});

/**
 * @route   PUT /api/v1/fee-heads/:id
 * @desc    Update fee head
 * @access  Private (Admin)
 */
const updateFeeHead = asyncHandler(async (req, res) => {
  const feeHead = await feeHeadService.updateFeeHead(
    req.params.id,
    req.body,
    req.user
  );

  res.json({
    success: true,
    message: 'Fee head updated successfully',
    data: feeHead
  });
});

/**
 * @route   DELETE /api/v1/fee-heads/:id
 * @desc    Delete fee head (soft delete)
 * @access  Private (Admin)
 */
const deleteFeeHead = asyncHandler(async (req, res) => {
  const result = await feeHeadService.deleteFeeHead(req.params.id, req.user);

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * @route   PUT /api/v1/fee-heads/:id/reactivate
 * @desc    Reactivate fee head
 * @access  Private (Admin)
 */
const reactivateFeeHead = asyncHandler(async (req, res) => {
  const feeHead = await feeHeadService.reactivateFeeHead(req.params.id, req.user);

  res.json({
    success: true,
    message: 'Fee head reactivated successfully',
    data: feeHead
  });
});

/**
 * @route   GET /api/v1/fee-heads/priorities/available
 * @desc    Get available priorities
 * @access  Private
 */
const getAvailablePriorities = asyncHandler(async (req, res) => {
  const priorities = await feeHeadService.getAvailablePriorities(req.user);

  res.json({
    success: true,
    data: priorities
  });
});

module.exports = {
  getFeeHeads,
  getFeeHeadById,
  createFeeHead,
  updateFeeHead,
  deleteFeeHead,
  reactivateFeeHead,
  getAvailablePriorities
};
