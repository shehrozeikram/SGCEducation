const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Please provide class']
  },
  feeType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeType',
    required: [true, 'Please provide fee type']
  },
  amount: {
    type: Number,
    required: [true, 'Please provide fee amount'],
    min: 0
  },
  dueDate: {
    type: Date,
    required: [true, 'Please provide due date']
  },
  frequency: {
    type: String,
    enum: ['one-time', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
    default: 'monthly'
  },
  isOptional: {
    type: Boolean,
    default: false
  },
  description: {
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

// Update timestamp on save
feeStructureSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Indexes for better query performance
feeStructureSchema.index({ institution: 1, academicYear: 1, class: 1 });
feeStructureSchema.index({ institution: 1, class: 1, isActive: 1 });
feeStructureSchema.index({ feeType: 1 });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);




