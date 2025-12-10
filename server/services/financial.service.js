const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Institution = require('../models/Institution');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Financial Service
 */
class FinancialService {
  /**
   * Get all subscriptions
   */
  async getSubscriptions(filters = {}) {
    const query = {};

    if (filters.plan) query.plan = filters.plan;
    if (filters.status) query.status = filters.status;
    if (filters.institution) query.institution = filters.institution;

    const subscriptions = await Subscription.find(query)
      .populate('institution', 'name code type')
      .sort({ createdAt: -1 });

    return subscriptions;
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(id) {
    const subscription = await Subscription.findById(id)
      .populate('institution', 'name code type email');

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    return subscription;
  }

  /**
   * Create or update subscription
   */
  async upsertSubscription(institutionId, data) {
    const institution = await Institution.findById(institutionId);
    if (!institution) {
      throw new ApiError(404, 'Institution not found');
    }

    let subscription = await Subscription.findOne({ institution: institutionId });

    if (subscription) {
      // Update existing
      Object.assign(subscription, data);
      await subscription.save();
    } else {
      // Create new
      subscription = await Subscription.create({
        institution: institutionId,
        ...data
      });
    }

    return subscription;
  }

  /**
   * Get financial overview
   */
  async getFinancialOverview(institution = null) {
    // Build match filter for institution
    const institutionMatch = institution ? { institution } : {};

    const [
      totalRevenue,
      monthlyRevenue,
      subscriptionStats,
      paymentStats,
      recentPayments
    ] = await Promise.all([
      // Total revenue
      Payment.aggregate([
        { $match: { ...institutionMatch, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Monthly revenue (last 12 months)
      Payment.aggregate([
        {
          $match: {
            ...institutionMatch,
            status: 'completed',
            paidDate: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$paidDate' } },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Subscription stats
      Subscription.aggregate([
        ...(institution ? [{ $match: institutionMatch }] : []),
        {
          $group: {
            _id: '$plan',
            count: { $sum: 1 },
            revenue: { $sum: '$pricing.amount' }
          }
        }
      ]),

      // Payment stats
      Payment.aggregate([
        ...(institution ? [{ $match: institutionMatch }] : []),
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ]),

      // Recent payments
      Payment.find(institutionMatch)
        .populate('institution', 'name code')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    return {
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue,
      subscriptionStats,
      paymentStats,
      recentPayments
    };
  }

  /**
   * Get all payments
   */
  async getPayments(filters = {}, page = 1, limit = 50) {
    const query = {};

    if (filters.institution) query.institution = filters.institution;
    if (filters.status) query.status = filters.status;
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

    // Date range
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('institution', 'name code')
        .populate('subscription', 'plan')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query)
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create payment
   */
  async createPayment(data, createdBy) {
    const institution = await Institution.findById(data.institution);
    if (!institution) {
      throw new ApiError(404, 'Institution not found');
    }

    // Generate invoice number
    const count = await Payment.countDocuments();
    const invoiceNumber = `INV-${Date.now()}-${count + 1}`;

    const payment = await Payment.create({
      ...data,
      invoiceNumber,
      createdBy: createdBy.id
    });

    return payment;
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentId, status, transactionData = {}) {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    payment.status = status;

    if (status === 'completed' && !payment.paidDate) {
      payment.paidDate = new Date();
    }

    if (transactionData.transactionId) {
      payment.transactionId = transactionData.transactionId;
    }

    if (transactionData.gatewayResponse) {
      payment.gatewayResponse = transactionData.gatewayResponse;
    }

    await payment.save();

    return payment;
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidDate' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return stats;
  }
}

module.exports = new FinancialService();
