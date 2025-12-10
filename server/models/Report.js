const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['institution', 'user', 'financial', 'activity', 'custom'],
    required: true
  },
  format: {
    type: String,
    enum: ['pdf', 'excel', 'csv', 'json'],
    default: 'pdf'
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'monthly'
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    time: {
      type: String,
      default: '09:00'
    },
    lastRun: {
      type: Date
    },
    nextRun: {
      type: Date
    }
  },
  recipients: [{
    type: String,
    trim: true
  }],
  template: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
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

reportSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

reportSchema.index({ createdBy: 1, type: 1 });
reportSchema.index({ isActive: 1 });

module.exports = mongoose.model('Report', reportSchema);
