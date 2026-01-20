const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  // Institution
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
  },

  // Student Reference
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please provide student']
  },

  // Academic Information
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Please provide class']
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },

  // Exam Details
  examType: {
    type: String,
    enum: ['quiz', 'assignment', 'midterm', 'final', 'practical', 'project', 'oral', 'other'],
    required: [true, 'Please provide exam type']
  },
  examName: {
    type: String,
    required: [true, 'Please provide exam name'],
    trim: true
  },
  examDate: {
    type: Date,
    required: [true, 'Please provide exam date']
  },
  subject: {
    type: String,
    required: [true, 'Please provide subject'],
    trim: true
  },

  // Marks/Grades
  marks: {
    obtained: {
      type: Number,
      required: [true, 'Please provide obtained marks'],
      min: 0
    },
    total: {
      type: Number,
      required: [true, 'Please provide total marks'],
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'],
      trim: true
    },
    gpa: {
      type: Number,
      min: 0,
      max: 4.0
    }
  },

  // Additional Information
  remarks: {
    type: String,
    trim: true
  },
  teacherRemarks: {
    type: String,
    trim: true
  },
  isPassed: {
    type: Boolean,
    default: true
  },
  rank: {
    type: Number,
    min: 1
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Pre-save hook: Calculate percentage, grade, and GPA
resultSchema.pre('save', function() {
  this.updatedAt = Date.now();

  // Calculate percentage
  if (this.marks.obtained !== undefined && this.marks.total !== undefined && this.marks.total > 0) {
    this.marks.percentage = (this.marks.obtained / this.marks.total) * 100;
  }

  // Calculate grade based on percentage
  if (this.marks.percentage !== undefined) {
    const percentage = this.marks.percentage;
    if (percentage >= 90) this.marks.grade = 'A+';
    else if (percentage >= 85) this.marks.grade = 'A';
    else if (percentage >= 80) this.marks.grade = 'B+';
    else if (percentage >= 75) this.marks.grade = 'B';
    else if (percentage >= 70) this.marks.grade = 'C+';
    else if (percentage >= 65) this.marks.grade = 'C';
    else if (percentage >= 60) this.marks.grade = 'D+';
    else if (percentage >= 50) this.marks.grade = 'D';
    else {
      this.marks.grade = 'F';
      this.isPassed = false;
    }
  }

  // Calculate GPA (4.0 scale)
  if (this.marks.grade) {
    const gradeMap = {
      'A+': 4.0,
      'A': 3.75,
      'B+': 3.5,
      'B': 3.0,
      'C+': 2.5,
      'C': 2.0,
      'D+': 1.5,
      'D': 1.0,
      'F': 0.0
    };
    this.marks.gpa = gradeMap[this.marks.grade] || 0;
  }
});

// Indexes for better query performance
resultSchema.index({ institution: 1, academicYear: 1 });
resultSchema.index({ student: 1, academicYear: 1 });
resultSchema.index({ class: 1, examType: 1 });
resultSchema.index({ examDate: -1 });
resultSchema.index({ status: 1 });
resultSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Result', resultSchema);
