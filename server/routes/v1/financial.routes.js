const express = require('express');
const router = express.Router();
const financialController = require('../../controllers/financial.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin } = require('../../middleware/rbac.middleware');

/**
 * Financial Management Routes - API v1
 * Base path: /api/v1/financial
 */

// All routes require authentication and super admin role
router.use(authenticate);
router.use(isSuperAdmin);

// Overview
router.get('/overview', financialController.getFinancialOverview);

// Revenue stats
router.get('/revenue-stats', financialController.getRevenueStats);

// Subscriptions
router.get('/subscriptions', financialController.getSubscriptions);
router.get('/subscriptions/:id', financialController.getSubscriptionById);
router.post('/subscriptions', financialController.upsertSubscription);

// Payments
router.get('/payments', financialController.getPayments);
router.post('/payments', financialController.createPayment);
router.put('/payments/:id/status', financialController.updatePaymentStatus);

module.exports = router;
