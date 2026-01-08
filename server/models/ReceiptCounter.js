const mongoose = require('mongoose');

/**
 * ReceiptCounter
 * Atomic per-(institution, year, type) counter used to generate unique sequential numbers.
 *
 * This avoids race conditions from countDocuments() based receipt generation.
 */
const receiptCounterSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// One counter per institution/year/type
receiptCounterSchema.index({ institution: 1, year: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('ReceiptCounter', receiptCounterSchema);


