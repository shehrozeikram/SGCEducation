const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  eventType: {
    type: String,
    enum: ['holiday', 'exam', 'event', 'meeting', 'deadline', 'other'],
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isAllDay: {
    type: Boolean,
    default: true
  },
  location: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#667eea'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: {
      type: Number,
      default: 1
    },
    endDate: {
      type: Date
    }
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notifyBefore: {
    type: Number,
    default: 24
  },
  attachments: [{
    name: String,
    url: String
  }],
  isPublic: {
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

academicCalendarSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

academicCalendarSchema.index({ institution: 1, startDate: 1 });
academicCalendarSchema.index({ eventType: 1 });

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);
