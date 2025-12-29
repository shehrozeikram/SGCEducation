const mongoose = require('mongoose');

const studentPromotionSchema = new mongoose.Schema({
  // Student Reference
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please provide student reference']
  },
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission',
    required: [true, 'Please provide admission reference']
  },

  // Operation Type
  operationType: {
    type: String,
    enum: ['promote', 'transfer', 'passout'],
    required: [true, 'Please provide operation type']
  },

  // FROM Details (Previous Class/Section/Institution)
  from: {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    academicYear: {
      type: String,
      required: true
    }
  },

  // TO Details (New Class/Section/Institution) - Optional for passout
  to: {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution'
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section'
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    academicYear: {
      type: String
    }
  },

  // Operation Details
  operationDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    trim: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },

  // Performed By
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Metadata
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
studentPromotionSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Indexes for better query performance
studentPromotionSchema.index({ student: 1, operationDate: -1 });
studentPromotionSchema.index({ admission: 1 });
studentPromotionSchema.index({ operationType: 1 });
studentPromotionSchema.index({ 'from.institution': 1 });
studentPromotionSchema.index({ 'to.institution': 1 });
studentPromotionSchema.index({ operationDate: -1 });
studentPromotionSchema.index({ status: 1 });

module.exports = mongoose.model('StudentPromotion', studentPromotionSchema);






