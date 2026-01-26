const mongoose = require('mongoose');

const suspenseEntrySchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },
  amount: {
    type: Number,
    required: [true, 'Please provide amount'],
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
    default: 'bank_transfer'
  },
  transactionId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  bankName: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['unidentified', 'reconciled', 'cancelled'],
    default: 'unidentified'
  },
  reconciledData: {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeePayment'
    },
    reconciledAt: Date,
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
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
suspenseEntrySchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Indexes
suspenseEntrySchema.index({ institution: 1, status: 1 });
suspenseEntrySchema.index({ transactionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('SuspenseEntry', suspenseEntrySchema);
