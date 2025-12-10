const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'cancelled', 'expired'],
    default: 'active'
  },
  pricing: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    }
  },
  features: {
    maxStudents: {
      type: Number,
      default: 100
    },
    maxTeachers: {
      type: Number,
      default: 10
    },
    maxDepartments: {
      type: Number,
      default: 5
    },
    storageGB: {
      type: Number,
      default: 5
    },
    customDomain: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    advancedReports: {
      type: Boolean,
      default: false
    }
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  nextBillingDate: {
    type: Date
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  trialEndsAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
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
subscriptionSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Indexes
subscriptionSchema.index({ institution: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
