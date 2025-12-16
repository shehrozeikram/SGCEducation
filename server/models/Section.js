const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide section name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide section code'],
    uppercase: true,
    trim: true
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Please provide class']
  },
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
  },
  capacity: {
    type: Number,
    default: 40,
    min: 1
  },
  classTeacher: {
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
  room: {
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    roomNumber: { type: String, trim: true }
  },
  schedule: {
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    days: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }]
  },
  stats: {
    totalGroups: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
    totalTeachers: { type: Number, default: 0 }
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
sectionSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Compound index for unique section code per class and academic year
sectionSchema.index({ code: 1, class: 1, academicYear: 1 }, { unique: true });

// Index for faster queries
sectionSchema.index({ institution: 1, department: 1, class: 1, academicYear: 1 });
sectionSchema.index({ isActive: 1 });

module.exports = mongoose.model('Section', sectionSchema);

