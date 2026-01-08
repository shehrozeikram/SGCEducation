const mongoose = require('mongoose');

const voucherItemSchema = new mongoose.Schema(
  {
    feeHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeHead',
      required: true,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * FeeVoucher
 * One voucher per student per month/year.
 *
 * - `currentMonthAmount`: sum of items.finalAmount (after persistent discounts)
 * - `billedAmount`: portion billed now (based on installment plan)
 * - `deferredAmount`: portion deferred to next month as arrears (installment carry-forward)
 * - `arrearsBroughtForward`: previous vouchers' remaining + deferred
 * - `totalDue`: billedAmount + arrearsBroughtForward
 * - `paidAmount` / `remainingAmount`: payments applied to this voucher only
 */
const feeVoucherSchema = new mongoose.Schema(
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
    admission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    voucherNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    installmentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstallmentPlan',
      default: null,
    },
    items: {
      type: [voucherItemSchema],
      default: [],
    },
    currentMonthAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    billedAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    deferredAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    arrearsBroughtForward: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalDue: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['generated', 'partial', 'paid'],
      default: 'generated',
      index: true,
    },
    lastPaymentDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

feeVoucherSchema.index({ institution: 1, student: 1, year: 1, month: 1 }, { unique: true });

feeVoucherSchema.pre('save', function () {
  // Keep remaining + status consistent
  const totalDue = Number(this.totalDue || 0);
  const paid = Number(this.paidAmount || 0);
  this.remainingAmount = Math.max(0, totalDue - paid);
  if (this.remainingAmount <= 0.01 && paid > 0) {
    this.status = 'paid';
  } else if (paid > 0) {
    this.status = 'partial';
  } else {
    this.status = 'generated';
  }
});

module.exports = mongoose.model('FeeVoucher', feeVoucherSchema);


