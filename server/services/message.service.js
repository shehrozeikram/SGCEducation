const Message = require('../models/Message');
const User = require('../models/User');
const notificationService = require('./notification.service');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Message Service
 */
class MessageService {
  /**
   * Get all messages
   */
  async getMessages(filters = {}, currentUser, page = 1, limit = 20) {
    const query = {};

    if (currentUser.role !== 'super_admin') {
      query.createdBy = currentUser.id;
    }

    if (filters.status) query.status = filters.status;
    if (filters.messageType) query.messageType = filters.messageType;

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(query)
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId) {
    const message = await Message.findById(messageId)
      .populate('createdBy', 'name email')
      .populate('targetAudience.institutions', 'name')
      .populate('targetAudience.departments', 'name code');

    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    return message;
  }

  /**
   * Create message
   */
  async createMessage(data, currentUser) {
    const message = await Message.create({
      ...data,
      createdBy: currentUser.id
    });

    return message;
  }

  /**
   * Update message
   */
  async updateMessage(messageId, data, currentUser) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    if (currentUser.role !== 'super_admin' && message.createdBy.toString() !== currentUser.id) {
      throw new ApiError(403, 'Access denied');
    }

    if (message.status === 'sent') {
      throw new ApiError(400, 'Cannot update a sent message');
    }

    Object.assign(message, data);
    await message.save();

    return message;
  }

  /**
   * Send message
   */
  async sendMessage(messageId, currentUser) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    if (currentUser.role !== 'super_admin' && message.createdBy.toString() !== currentUser.id) {
      throw new ApiError(403, 'Access denied');
    }

    if (message.status === 'sent') {
      throw new ApiError(400, 'Message already sent');
    }

    // Get recipients
    const recipients = await this.getRecipients(message.targetAudience);

    message.stats.totalRecipients = recipients.length;

    // Send based on message type
    if (message.messageType === 'notification') {
      await this.sendAsNotification(message, recipients);
    }

    message.status = 'sent';
    message.sentAt = new Date();
    message.stats.sent = recipients.length;
    message.stats.delivered = recipients.length;

    await message.save();

    return message;
  }

  /**
   * Get recipients based on target audience
   */
  async getRecipients(targetAudience) {
    const query = { isActive: true };

    switch (targetAudience.type) {
      case 'all':
        // All users
        break;

      case 'role':
        if (targetAudience.roles && targetAudience.roles.length > 0) {
          query.role = { $in: targetAudience.roles };
        }
        break;

      case 'institution':
        if (targetAudience.institutions && targetAudience.institutions.length > 0) {
          query.institution = { $in: targetAudience.institutions };
        }
        break;

      case 'department':
        if (targetAudience.departments && targetAudience.departments.length > 0) {
          query.department = { $in: targetAudience.departments };
        }
        break;

      case 'custom':
        if (targetAudience.users && targetAudience.users.length > 0) {
          query._id = { $in: targetAudience.users };
        }
        break;

      default:
        return [];
    }

    const users = await User.find(query).select('_id email name');
    return users;
  }

  /**
   * Send message as notification
   */
  async sendAsNotification(message, recipients) {
    const recipientIds = recipients.map(r => r._id);

    await notificationService.createBulkNotifications(
      recipientIds,
      {
        title: message.subject,
        message: message.body,
        type: message.priority === 'urgent' ? 'warning' : 'info',
        priority: message.priority
      },
      message.createdBy
    );
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId, currentUser) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    if (currentUser.role !== 'super_admin' && message.createdBy.toString() !== currentUser.id) {
      throw new ApiError(403, 'Access denied');
    }

    await Message.findByIdAndDelete(messageId);

    return { message: 'Message deleted successfully' };
  }

  /**
   * Get message templates
   */
  async getTemplates() {
    return [
      {
        name: 'Welcome Message',
        subject: 'Welcome to {institution_name}',
        body: 'Dear {user_name},\n\nWelcome to {institution_name}. We are excited to have you on board.\n\nBest regards,\nAdmin Team'
      },
      {
        name: 'Announcement',
        subject: 'Important Announcement',
        body: 'Dear Students and Staff,\n\n{announcement_text}\n\nThank you.'
      },
      {
        name: 'Event Reminder',
        subject: 'Reminder: {event_name}',
        body: 'Dear {user_name},\n\nThis is a reminder about {event_name} scheduled on {event_date}.\n\nBest regards'
      }
    ];
  }
}

module.exports = new MessageService();
