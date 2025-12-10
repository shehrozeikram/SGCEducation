const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware to log user activities
 */
const logActivity = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after response
    res.json = function(data) {
      // Call original json method
      originalJson(data);

      // Log activity asynchronously (don't wait)
      if (req.user) {
        const logData = {
          user: req.user.id,
          action,
          resource,
          resourceId: req.params.id || data.data?._id,
          details: `${action} ${resource}`,
          metadata: {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body),
            query: req.query,
            statusCode: res.statusCode
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: data.success ? 'success' : 'failed'
        };

        ActivityLog.create(logData).catch(err => {
          console.error('Activity log error:', err);
        });
      }
    };

    next();
  };
};

/**
 * Remove sensitive data from body
 */
const sanitizeBody = (body) => {
  if (!body) return {};

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'secret'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Manual activity logging function
 */
const createActivityLog = async (userId, action, resource, details, metadata = {}) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      resource,
      details,
      metadata,
      status: 'success'
    });
  } catch (error) {
    console.error('Activity log error:', error);
  }
};

module.exports = {
  logActivity,
  createActivityLog
};
