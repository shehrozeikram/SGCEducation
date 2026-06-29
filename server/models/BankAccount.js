const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: [true, 'Please provide bank name'],
    trim: true
  },
  accountNumber: {
    type: String,
    required: [true, 'Please provide account number'],
    trim: true
  },
  accountTitle: {
    type: String,
    required: [true, 'Please provide account title'],
    trim: true
  },
  branchCode: {
    type: String,
    trim: true
  },
  institutions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bankAccountSchema.index({ institutions: 1, isActive: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
