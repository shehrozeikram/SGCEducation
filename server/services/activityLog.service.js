const ActivityLog = require('../models/ActivityLog');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Activity Log Service
 */
class ActivityLogService {
  /**
   * Get activity logs with filters
   */
  async getActivityLogs(filters = {}, currentUser, page = 1, limit = 50) {
    const query = {};

    // Super admin can see all logs
    // Others can only see their institution's logs
    if (currentUser.role !== 'super_admin' && currentUser.institution) {
      // Need to populate user and filter by institution
      // For now, just filter by user if not super admin
      query.user = currentUser.id;
    }

    // Apply filters
    if (filters.user) query.user = filters.user;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.status) query.status = filters.status;

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get recent activity logs for dashboard
   */
  async getRecentLogs(currentUser, limit = 10, institution = null) {
    const query = {};

    // Filter by institution if provided
    if (institution) {
      // For super admin viewing specific institution
      if (currentUser.role === 'super_admin') {
        // Populate user and filter by institution
        const logs = await ActivityLog.find(query)
          .populate({
            path: 'user',
            match: { institution: institution },
            select: 'name email'
          })
          .sort({ createdAt: -1 })
          .limit(limit * 2) // Get more to filter nulls
          .lean();

        // Filter out null users (didn't match institution)
        return logs.filter(log => log.user).slice(0, limit);
      }
    }

    // For regular admin (scoped to their institution)
    if (currentUser.role !== 'super_admin' && currentUser.institution) {
      const logs = await ActivityLog.find(query)
        .populate({
          path: 'user',
          match: { institution: currentUser.institution },
          select: 'name email'
        })
        .sort({ createdAt: -1 })
        .limit(limit * 2)
        .lean();

      return logs.filter(log => log.user).slice(0, limit);
    }

    // Super admin viewing all
    const logs = await ActivityLog.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs;
  }

  /**
   * Get activity stats
   */
  async getActivityStats(currentUser, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = {
      createdAt: { $gte: startDate }
    };

    // Filter by user if not super admin
    if (currentUser.role !== 'super_admin') {
      query.user = currentUser.id;
    }

    const [actionStats, resourceStats, dailyStats] = await Promise.all([
      // Action breakdown
      ActivityLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Resource breakdown
      ActivityLog.aggregate([
        { $match: query },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Daily activity
      ActivityLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    return {
      actionBreakdown: actionStats,
      resourceBreakdown: resourceStats,
      dailyActivity: dailyStats
    };
  }

  /**
   * Delete old logs (cleanup)
   */
  async cleanupOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await ActivityLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return { deleted: result.deletedCount };
  }
}

module.exports = new ActivityLogService();
