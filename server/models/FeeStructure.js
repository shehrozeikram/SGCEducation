const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Please provide class']
  },
  feeHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeHead',
    required: [true, 'Please provide fee head']
  },
  academicYear: {
    type: String,
    trim: true,
    default: ''
  },
  amount: {
    type: Number,
    required: [true, 'Please provide amount'],
    min: 0,
    default: 0
  },
  // Fee structures are shared globally (not institution-specific)
  // Institution is stored for reference but structures are shared across all institutions
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
feeStructureSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Compound index for unique fee structure per class and fee head (academic year removed)
feeStructureSchema.index({ class: 1, feeHead: 1 }, { unique: true });

// Indexes for better query performance
feeStructureSchema.index({ class: 1 });
feeStructureSchema.index({ feeHead: 1 });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
