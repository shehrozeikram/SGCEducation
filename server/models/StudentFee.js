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
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  dueDate: {
    type: Date
  },
  lastPaymentDate: {
    type: Date
  },
  academicYear: {
    type: String,
    trim: true,
    default: ''
  },
  vouchers: [{
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    voucherNumber: {
      type: String,
      trim: true
    }
  }],
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
    // Reset paidAmount and remainingAmount when finalAmount changes
    if (this.isNew || this.isModified('finalAmount')) {
      this.paidAmount = 0;
      this.remainingAmount = this.finalAmount;
      this.status = 'pending';
    }
  }
  
  // Calculate remaining amount and update status
  if (this.isModified('paidAmount') || this.isModified('finalAmount')) {
    this.remainingAmount = Math.max(0, this.finalAmount - this.paidAmount);
    
    // Update status based on payment
    if (this.remainingAmount <= 0) {
      this.status = 'paid';
    } else if (this.paidAmount > 0) {
      this.status = 'partial';
    } else {
      // Check if overdue
      if (this.dueDate && new Date() > this.dueDate) {
        this.status = 'overdue';
      } else {
        this.status = 'pending';
      }
    }
  }
  
  // Update status to overdue if due date has passed
  if (this.dueDate && this.status !== 'paid' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
});

// Indexes for better query performance
studentFeeSchema.index({ student: 1, isActive: 1 });
studentFeeSchema.index({ institution: 1, student: 1 });
studentFeeSchema.index({ feeStructure: 1 });
studentFeeSchema.index({ class: 1, feeHead: 1 });
studentFeeSchema.index({ academicYear: 1 });

module.exports = mongoose.model('StudentFee', studentFeeSchema);
