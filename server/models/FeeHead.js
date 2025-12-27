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
    enum: ['Liabilities', 'Income', 'Other Income'],
    required: [true, 'Please provide account type']
  },
  frequencyType: {
    type: String,
    enum: ['Monthly Fee/Annual Fee', 'Once at First Fee', 'Not Defined(e.g Paper Charges)'],
    required: [true, 'Please provide frequency type']
  },
  glAccount: {
    type: String,
    trim: true,
    unique: true
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
  
  // Generate GL Account based on priority if not set
  if (!this.glAccount && this.priority) {
    const priorityNum = this.priority - 1; // Priority 1 = 0, Priority 2 = 1, etc.
    this.glAccount = `401090${priorityNum}-101090${priorityNum}`;
  }
});

// Indexes for better query performance
feeHeadSchema.index({ institution: 1, isActive: 1 });
feeHeadSchema.index({ institution: 1, priority: 1 }, { unique: true }); // Priority unique per institution
feeHeadSchema.index({ glAccount: 1 });

module.exports = mongoose.model('FeeHead', feeHeadSchema);

