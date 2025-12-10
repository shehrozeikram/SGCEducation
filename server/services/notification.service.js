const Notification = require('../models/Notification');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Notification Service
 */
class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(data, createdBy) {
    const notification = await Notification.create({
      ...data,
      createdBy: createdBy?.id || createdBy
    });

    return notification;
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(recipients, notificationData, createdBy) {
    const notifications = recipients.map(recipientId => ({
      ...notificationData,
      recipient: recipientId,
      createdBy: createdBy?.id || createdBy
    }));

    const result = await Notification.insertMany(notifications);
    return { created: result.length };
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, filters = {}, page = 1, limit = 20) {
    const query = { recipient: userId };

    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead === 'true';
    }

    if (filters.type) {
      query.type = filters.type;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false })
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    return notification;
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return { updated: result.modifiedCount };
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId
    });

    if (result.deletedCount === 0) {
      throw new ApiError(404, 'Notification not found');
    }

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(userId) {
    const result = await Notification.deleteMany({
      recipient: userId,
      isRead: true
    });

    return { deleted: result.deletedCount };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    return { unreadCount: count };
  }
}

module.exports = new NotificationService();
