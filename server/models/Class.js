const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide class name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide class code'],
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
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
  },
  level: {
    type: Number,
    min: 1,
    trim: true
  },
  grade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grade',
    required: [true, 'Please provide grade']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Please provide group']
  },
  feeType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeType',
    required: [true, 'Please provide fee type']
  },
  description: {
    type: String,
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
    totalSections: { type: Number, default: 0 },
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
classSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Compound index for unique class code per department and academic year
classSchema.index({ code: 1, department: 1, academicYear: 1 }, { unique: true });

// Index for faster queries
classSchema.index({ institution: 1, department: 1, academicYear: 1 });
classSchema.index({ isActive: 1 });

module.exports = mongoose.model('Class', classSchema);

