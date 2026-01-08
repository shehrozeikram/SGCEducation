const mongoose = require('mongoose');

/**
 * InstallmentPlan
 * Controls how much of the current month's fee is billed on voucher generation.
 *
 * Example: billPercent=50 → bill 50% now, defer remaining 50% to next month as arrears.
 * Plans are institution-scoped, but can be global (institution=null).
 */
const installmentPlanSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    billPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

installmentPlanSchema.index({ institution: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('InstallmentPlan', installmentPlanSchema);


