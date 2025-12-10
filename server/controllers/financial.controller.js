const financialService = require('../services/financial.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/v1/financial/overview
 * @desc    Get financial overview (institution-filtered)
 * @access  Private (Super Admin and Admin)
 */
const getFinancialOverview = asyncHandler(async (req, res) => {
  const { institution } = req.query;

  // Filter by institution if provided (for super admin)
  // Regular admins should have institution from their user object
  const institutionFilter = institution || (req.user.role !== 'super_admin' ? req.user.institution : null);

  const overview = await financialService.getFinancialOverview(institutionFilter);

  res.json({
    success: true,
    data: overview
  });
});

/**
 * @route   GET /api/v1/financial/subscriptions
 * @desc    Get all subscriptions
 * @access  Private (Super Admin)
 */
const getSubscriptions = asyncHandler(async (req, res) => {
  const { plan, status, institution } = req.query;

  const subscriptions = await financialService.getSubscriptions({
    plan,
    status,
    institution
  });

  res.json({
    success: true,
    count: subscriptions.length,
    data: subscriptions
  });
});

/**
 * @route   GET /api/v1/financial/subscriptions/:id
 * @desc    Get subscription by ID
 * @access  Private (Super Admin)
 */
const getSubscriptionById = asyncHandler(async (req, res) => {
  const subscription = await financialService.getSubscriptionById(req.params.id);

  res.json({
    success: true,
    data: subscription
  });
});

/**
 * @route   POST /api/v1/financial/subscriptions
 * @desc    Create or update subscription
 * @access  Private (Super Admin)
 */
const upsertSubscription = asyncHandler(async (req, res) => {
  const { institution, ...data } = req.body;

  const subscription = await financialService.upsertSubscription(institution, data);

  res.json({
    success: true,
    message: 'Subscription saved successfully',
    data: subscription
  });
});

/**
 * @route   GET /api/v1/financial/payments
 * @desc    Get all payments
 * @access  Private (Super Admin)
 */
const getPayments = asyncHandler(async (req, res) => {
  const { institution, status, paymentMethod, startDate, endDate, page = 1, limit = 50 } = req.query;

  const result = await financialService.getPayments(
    { institution, status, paymentMethod, startDate, endDate },
    parseInt(page),
    parseInt(limit)
  );

  res.json({
    success: true,
    ...result
  });
});

/**
 * @route   POST /api/v1/financial/payments
 * @desc    Create payment
 * @access  Private (Super Admin)
 */
const createPayment = asyncHandler(async (req, res) => {
  const payment = await financialService.createPayment(req.body, req.user);

  res.status(201).json({
    success: true,
    message: 'Payment created successfully',
    data: payment
  });
});

/**
 * @route   PUT /api/v1/financial/payments/:id/status
 * @desc    Update payment status
 * @access  Private (Super Admin)
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status, transactionId, gatewayResponse } = req.body;

  const payment = await financialService.updatePaymentStatus(
    req.params.id,
    status,
    { transactionId, gatewayResponse }
  );

  res.json({
    success: true,
    message: 'Payment status updated',
    data: payment
  });
});

/**
 * @route   GET /api/v1/financial/revenue-stats
 * @desc    Get revenue statistics
 * @access  Private (Super Admin)
 */
const getRevenueStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const stats = await financialService.getRevenueStats(parseInt(days));

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getFinancialOverview,
  getSubscriptions,
  getSubscriptionById,
  upsertSubscription,
  getPayments,
  createPayment,
  updatePaymentStatus,
  getRevenueStats
};
