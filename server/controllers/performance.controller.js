const os = require('os');
const { asyncHandler } = require('../middleware/error.middleware');
const Institution = require('../models/Institution');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const getSystemHealth = asyncHandler(async (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const health = {
    status: 'healthy',
    uptime: {
      seconds: uptime,
      formatted: formatUptime(uptime)
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
      process: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      }
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0].model,
      usage: cpuUsage,
      loadAverage: os.loadavg()
    },
    platform: {
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname()
    }
  };

  res.json({
    success: true,
    data: health
  });
});

const getDatabaseStats = asyncHandler(async (req, res) => {
  const [
    institutionCount,
    userCount,
    activityCount
  ] = await Promise.all([
    Institution.countDocuments(),
    User.countDocuments(),
    ActivityLog.countDocuments()
  ]);

  const stats = {
    collections: {
      institutions: institutionCount,
      users: userCount,
      activityLogs: activityCount
    },
    totalDocuments: institutionCount + userCount + activityCount
  };

  res.json({
    success: true,
    data: stats
  });
});

const getActiveSessions = asyncHandler(async (req, res) => {
  // This is a simplified version
  // In production, you'd track sessions in Redis or similar
  const recentActivity = await ActivityLog.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
      }
    },
    {
      $group: {
        _id: '$user',
        lastActivity: { $max: '$createdAt' },
        actions: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      activeSessions: recentActivity.length,
      sessions: recentActivity
    }
  });
});

const getErrorRates = asyncHandler(async (req, res) => {
  const { hours = 24 } = req.query;
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

  const errors = await ActivityLog.aggregate([
    {
      $match: {
        status: 'failed',
        createdAt: { $gte: hoursAgo }
      }
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$createdAt' },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.hour': 1 }
    }
  ]);

  const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);
  const totalRequests = await ActivityLog.countDocuments({
    createdAt: { $gte: hoursAgo }
  });

  res.json({
    success: true,
    data: {
      totalErrors,
      totalRequests,
      errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0,
      errors
    }
  });
});

const getPerformanceMetrics = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Activity metrics
  const activityMetrics = await ActivityLog.aggregate([
    {
      $match: {
        createdAt: { $gte: daysAgo }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);

  res.json({
    success: true,
    data: {
      metrics: activityMetrics,
      period: { days, startDate: daysAgo, endDate: new Date() }
    }
  });
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = {
  getSystemHealth,
  getDatabaseStats,
  getActiveSessions,
  getErrorRates,
  getPerformanceMetrics
};
