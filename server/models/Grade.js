const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide grade name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide grade code'],
    uppercase: true,
    trim: true
  },
  level: {
    type: Number,
    required: [true, 'Please provide grade level'],
    min: 1
  },
  description: {
    type: String,
    trim: true
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
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

// Update timestamp on save
gradeSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Index for faster queries
gradeSchema.index({ institution: 1, isActive: 1 });
gradeSchema.index({ level: 1 });

module.exports = mongoose.model('Grade', gradeSchema);


