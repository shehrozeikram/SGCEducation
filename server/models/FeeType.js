const mongoose = require('mongoose');

const feeTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide fee type name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide fee type code'],
    uppercase: true,
    trim: true
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
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
feeTypeSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Index for faster queries
feeTypeSchema.index({ institution: 1, isActive: 1 });

module.exports = mongoose.model('FeeType', feeTypeSchema);


