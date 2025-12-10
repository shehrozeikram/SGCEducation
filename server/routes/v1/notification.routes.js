const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notification.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin } = require('../../middleware/rbac.middleware');

/**
 * Notification Routes - API v1
 * Base path: /api/v1/notifications
 */

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all as read
router.put('/mark-all-read', notificationController.markAllAsRead);

// Delete all read notifications
router.delete('/read', notificationController.deleteAllRead);

// Super Admin only routes
router.post('/', isSuperAdmin, notificationController.createNotification);
router.post('/bulk', isSuperAdmin, notificationController.createBulkNotifications);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
