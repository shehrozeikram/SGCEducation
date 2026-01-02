const mongoose = require('mongoose');

const feeHeadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide fee head name'],
    trim: true
  },
  priority: {
    type: Number,
    required: [true, 'Please provide priority'],
    min: 1
  },
  accountType: {
    type: String,
    required: [true, 'Please provide account type'],
    enum: ['Liabilities', 'Income', 'Other Income'],
    trim: true
  },
  frequencyType: {
    type: String,
    required: [true, 'Please provide frequency type'],
    enum: ['Monthly Fee/Annual Fee', 'Once at First Fee', 'Not Defined(e.g Paper Charges)'],
    trim: true
  },
  glAccount: {
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
feeHeadSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Generate GL Account if not provided
feeHeadSchema.pre('save', function(next) {
  if (!this.glAccount && this.accountType && this.name) {
    // Generate GL Account code based on account type and name
    const accountTypeCode = this.accountType === 'Liabilities' ? 'L' : 
                           this.accountType === 'Income' ? 'I' : 'OI';
    const nameCode = this.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    this.glAccount = `${accountTypeCode}-${nameCode}-${this.priority}`;
  }
  next();
});

// Indexes for better query performance
feeHeadSchema.index({ institution: 1, isActive: 1 });
feeHeadSchema.index({ priority: 1, institution: 1 });

module.exports = mongoose.model('FeeHead', feeHeadSchema);
