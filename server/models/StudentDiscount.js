const mongoose = require('mongoose');

/**
 * StudentDiscount
 * Persistent discount applied to all upcoming monthly vouchers.
 *
 * If feeHead is null → applies to the overall voucher amount (distributed across items).
 * If feeHead is set → applies only to that fee head item.
 */
const studentDiscountSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    feeHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeHead',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['amount', 'percentage'],
      required: true,
      default: 'amount',
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
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

studentDiscountSchema.index({ institution: 1, student: 1, feeHead: 1, isActive: 1 });

module.exports = mongoose.model('StudentDiscount', studentDiscountSchema);


