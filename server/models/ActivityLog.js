const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'update',
      'delete',
      'login',
      'logout',
      'activate',
      'deactivate',
      'toggle_status',
      'change_password',
      'bulk_import',
      'bulk_export',
      'other'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: ['user', 'institution', 'department', 'course', 'student', 'teacher', 'admin', 'setting', 'other']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes for better query performance
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ resource: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

// TTL index - automatically delete logs older than 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
