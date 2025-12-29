const mongoose = require('mongoose');

const feeHeadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide fee head name'],
    trim: true
  },
  priority: {
    type: Number,
    required: [true, 'Please provide priority'],
    unique: true,  // Priority is globally unique across all institutions
    min: 1
  },
  accountType: {
    type: String,
    required: [true, 'Please provide account type'],
    trim: true
  },
  frequencyType: {
    type: String,
    required: [true, 'Please provide frequency type'],
    trim: true
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    default: null  // null means shared across all institutions
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
feeHeadSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Indexes for better query performance
feeHeadSchema.index({ institution: 1, isActive: 1 });
feeHeadSchema.index({ priority: 1 }, { unique: true });
feeHeadSchema.index({ isActive: 1 });

module.exports = mongoose.model('FeeHead', feeHeadSchema);
