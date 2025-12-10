const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cash', 'cheque', 'bank_transfer', 'other'],
    default: 'other'
  },
  transactionId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  paymentDate: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  paidDate: {
    type: Date
  },
  description: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  invoiceUrl: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundDate: {
    type: Date
  },
  refundReason: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
paymentSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Indexes
paymentSchema.index({ institution: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
