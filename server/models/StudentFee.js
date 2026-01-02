const mongoose = require('mongoose');

const studentFeeSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please provide student']
  },
  feeStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure',
    required: [true, 'Please provide fee structure']
  },
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
  baseAmount: {
    type: Number,
    required: [true, 'Please provide base amount'],
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['amount', 'percentage'],
    default: 'amount'
  },
  discountReason: {
    type: String,
    trim: true
  },
  finalAmount: {
    type: Number,
    required: [true, 'Please provide final amount'],
    min: 0
  },
  academicYear: {
    type: String,
    trim: true,
    default: ''
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
studentFeeSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Calculate final amount before save
studentFeeSchema.pre('save', function() {
  if (this.isModified('baseAmount') || this.isModified('discountAmount') || this.isModified('discountType')) {
    if (this.discountType === 'percentage') {
      this.finalAmount = this.baseAmount - (this.baseAmount * this.discountAmount / 100);
    } else {
      this.finalAmount = this.baseAmount - this.discountAmount;
    }
    // Ensure final amount is not negative
    if (this.finalAmount < 0) {
      this.finalAmount = 0;
    }
  }
});

// Indexes for better query performance
studentFeeSchema.index({ student: 1, isActive: 1 });
studentFeeSchema.index({ institution: 1, student: 1 });
studentFeeSchema.index({ feeStructure: 1 });
studentFeeSchema.index({ class: 1, feeHead: 1 });
studentFeeSchema.index({ academicYear: 1 });

module.exports = mongoose.model('StudentFee', studentFeeSchema);
