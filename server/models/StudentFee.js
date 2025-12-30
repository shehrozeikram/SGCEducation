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
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission',
    required: [true, 'Please provide admission']
  },
  feeStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure',
    required: [true, 'Please provide fee structure']
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
  discount: {
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
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  dueAmount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: [true, 'Please provide due date']
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'waived'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true
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

// Update timestamp and calculate amounts on save
studentFeeSchema.pre('save', function() {
  this.updatedAt = Date.now();
  
  // Calculate final amount after discount
  if (this.discount > 0) {
    if (this.discountType === 'percentage') {
      this.finalAmount = this.amount - (this.amount * this.discount / 100);
    } else {
      this.finalAmount = Math.max(0, this.amount - this.discount);
    }
  } else {
    this.finalAmount = this.amount;
  }
  
  // Calculate due amount
  this.dueAmount = Math.max(0, this.finalAmount - this.paidAmount);
  
  // Update status based on payment
  if (this.dueAmount === 0) {
    this.status = 'paid';
    if (!this.paymentDate) {
      this.paymentDate = new Date();
    }
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (new Date() > this.dueDate && this.status !== 'waived') {
    this.status = 'overdue';
  } else if (this.status === 'pending') {
    this.status = 'pending';
  }
});

// Indexes for better query performance
studentFeeSchema.index({ institution: 1, student: 1, academicYear: 1 });
studentFeeSchema.index({ institution: 1, class: 1, status: 1 });
studentFeeSchema.index({ dueDate: 1, status: 1 });
studentFeeSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model('StudentFee', studentFeeSchema);







