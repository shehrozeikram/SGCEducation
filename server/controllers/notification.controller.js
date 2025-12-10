const notificationService = require('../services/notification.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { isRead, type, page = 1, limit = 20 } = req.query;

  const result = await notificationService.getUserNotifications(
    req.user.id,
    { isRead, type },
    parseInt(page),
    parseInt(limit)
  );

  res.json({
    success: true,
    ...result
  });
});

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);

  res.json({
    success: true,
    data: result
  });
});

/**
 * @route   POST /api/v1/notifications
 * @desc    Create notification (Super Admin only)
 * @access  Private (Super Admin)
 */
const createNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.createNotification(
    req.body,
    req.user
  );

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: notification
  });
});

/**
 * @route   POST /api/v1/notifications/bulk
 * @desc    Create bulk notifications (Super Admin only)
 * @access  Private (Super Admin)
 */
const createBulkNotifications = asyncHandler(async (req, res) => {
  const { recipients, ...notificationData } = req.body;

  const result = await notificationService.createBulkNotifications(
    recipients,
    notificationData,
    req.user
  );

  res.status(201).json({
    success: true,
    message: 'Bulk notifications created successfully',
    data: result
  });
});

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.params.id,
    req.user.id
  );

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
});

/**
 * @route   PUT /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);

  res.json({
    success: true,
    message: 'All notifications marked as read',
    data: result
  });
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(
    req.params.id,
    req.user.id
  );

  res.json({
    success: true,
    ...result
  });
});

/**
 * @route   DELETE /api/v1/notifications/read
 * @desc    Delete all read notifications
 * @access  Private
 */
const deleteAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteAllRead(req.user.id);

  res.json({
    success: true,
    message: `${result.deleted} read notifications deleted`,
    data: result
  });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
};
