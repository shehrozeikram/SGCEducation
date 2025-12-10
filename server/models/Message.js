const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['email', 'sms', 'notification', 'announcement'],
    default: 'notification'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetAudience: {
    type: {
      type: String,
      enum: ['all', 'role', 'institution', 'department', 'custom'],
      required: true
    },
    roles: [{
      type: String,
      enum: ['super_admin', 'admin', 'teacher', 'student']
    }],
    institutions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution'
    }],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'failed'],
    default: 'draft'
  },
  scheduledAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  template: {
    type: String,
    trim: true
  },
  stats: {
    totalRecipients: {
      type: Number,
      default: 0
    },
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    }
  },
  attachments: [{
    name: String,
    url: String,
    size: Number
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

messageSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

messageSchema.index({ createdBy: 1, status: 1 });
messageSchema.index({ scheduledAt: 1 });
messageSchema.index({ sentAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
