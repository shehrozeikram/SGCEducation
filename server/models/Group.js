const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide group name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide group code'],
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Study', 'Project', 'Lab', 'Sports', 'Cultural', 'Other'],
    default: 'Study'
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please provide department']
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    default: 10,
    min: 1
  },
  leader: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    }
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['Member', 'Co-Leader', 'Secretary', 'Treasurer'],
      default: 'Member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  supervisor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    }
  },
  stats: {
    totalMembers: { type: Number, default: 0 }
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
groupSchema.pre('save', function() {
  this.updatedAt = Date.now();
  
  // Update totalMembers count
  if (this.members && Array.isArray(this.members)) {
    this.stats.totalMembers = this.members.length;
  }
});

// Compound index for unique group code per section and academic year
groupSchema.index({ code: 1, section: 1, academicYear: 1 }, { unique: true });

// Index for faster queries
groupSchema.index({ institution: 1, department: 1, section: 1, academicYear: 1 });
groupSchema.index({ isActive: 1 });
groupSchema.index({ type: 1 });

module.exports = mongoose.model('Group', groupSchema);

