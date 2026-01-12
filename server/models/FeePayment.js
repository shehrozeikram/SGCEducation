const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
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
  studentFee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentFee',
    required: [true, 'Please provide student fee']
  },
  receiptNumber: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Please provide payment amount'],
    min: 0
  },
  paymentDate: {
    type: Date,
    required: [true, 'Please provide payment date'],
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'cheque', 'bank_transfer', 'online', 'card', 'upi', 'other'],
    required: [true, 'Please provide payment method'],
    default: 'cash'
  },
  chequeNumber: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'refunded'],
    default: 'completed'
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundDate: {
    type: Date
  },
  refundReason: {
    type: String,
    trim: true
  },
  collectedBy: {
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
feePaymentSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Generate receipt number before save (fallback if not set by service)
// Uses atomic ReceiptCounter to prevent race conditions
feePaymentSchema.pre('save', async function() {
  if (this.isNew && !this.receiptNumber) {
    const { generateReceiptNumber } = require('../utils/receiptUtils');
    this.receiptNumber = await generateReceiptNumber({
      institution: this.institution,
      year: new Date().getFullYear(),
      type: 'RCP'
    });
  }
});

// Indexes for better query performance
feePaymentSchema.index({ institution: 1, student: 1, paymentDate: -1 });
feePaymentSchema.index({ institution: 1, paymentDate: -1 });
feePaymentSchema.index({ receiptNumber: 1 });
feePaymentSchema.index({ studentFee: 1 });
feePaymentSchema.index({ status: 1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);



















