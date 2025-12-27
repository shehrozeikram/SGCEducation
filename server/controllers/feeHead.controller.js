const feeHeadService = require('../services/feeHead.service');
const { asyncHandler } = require('../middleware/error.middleware');

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
 * @desc    Create fee head
 * @access  Private (Admin, Super Admin)
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
 * @access  Private (Admin, Super Admin)
 */
const updateFeeHead = asyncHandler(async (req, res) => {
  const feeHead = await feeHeadService.updateFeeHead(req.params.id, req.body, req.user);
  res.json({
    success: true,
    message: 'Fee head updated successfully',
    data: feeHead
  });
});

/**
 * @route   DELETE /api/v1/fee-heads/:id
 * @desc    Delete fee head
 * @access  Private (Admin, Super Admin)
 */
const deleteFeeHead = asyncHandler(async (req, res) => {
  await feeHeadService.deleteFeeHead(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Fee head deleted successfully'
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

/**
 * @route   PUT /api/v1/fee-heads/:id/reactivate
 * @desc    Reactivate fee head
 * @access  Private (Admin, Super Admin)
 */
const reactivateFeeHead = asyncHandler(async (req, res) => {
  const feeHead = await feeHeadService.reactivateFeeHead(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Fee head reactivated successfully',
    data: feeHead
  });
});

module.exports = {
  getFeeHeads,
  getFeeHeadById,
  createFeeHead,
  updateFeeHead,
  deleteFeeHead,
  getAvailablePriorities,
  reactivateFeeHead
};




