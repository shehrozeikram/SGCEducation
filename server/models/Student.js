const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  // Reference to User account
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide user reference']
  },

  // Institution & Department
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

  // Student Identification
  enrollmentNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  rollNumber: {
    type: String,
    uppercase: true,
    trim: true
  },

  // Admission Details
  admission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admission'
  },
  admissionDate: {
    type: Date,
    required: [true, 'Please provide admission date'],
    default: Date.now
  },
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
  },
  program: {
    type: String,
    required: [true, 'Please provide program'],
    trim: true
  },
  batch: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    uppercase: true,
    trim: true
  },

  // Personal Details
  personalDetails: {
    middleName: {
      type: String,
      trim: true
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      trim: true
    },
    nationality: {
      type: String,
      default: 'Pakistani',
      trim: true
    },
    religion: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['General', 'OBC', 'SC', 'ST', 'Other'],
      default: 'General'
    },
    aadharNumber: {
      type: String,
      trim: true
    },
    photo: {
      type: String,
      trim: true
    }
  },

  // Contact Details (copied from User, but kept here for quick access)
  contactDetails: {
    alternateEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    alternatePhone: {
      type: String,
      trim: true
    },
    currentAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    },
    permanentAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    }
  },

  // Guardian/Parent Information
  guardianInfo: {
    fatherName: {
      type: String,
      trim: true
    },
    fatherOccupation: {
      type: String,
      trim: true
    },
    fatherPhone: {
      type: String,
      trim: true
    },
    fatherEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    motherName: {
      type: String,
      trim: true
    },
    motherOccupation: {
      type: String,
      trim: true
    },
    motherPhone: {
      type: String,
      trim: true
    },
    motherEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    guardianName: {
      type: String,
      trim: true
    },
    guardianRelation: {
      type: String,
      trim: true
    },
    guardianPhone: {
      type: String,
      trim: true
    },
    guardianEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    annualIncome: {
      type: Number
    }
  },

  // Academic Information
  academicInfo: {
    previousSchool: {
      type: String,
      trim: true
    },
    previousBoard: {
      type: String,
      trim: true
    },
    previousPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    yearOfPassing: {
      type: Number
    }
  },

  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['photo', 'birth_certificate', 'marksheet', 'transfer_certificate', 'caste_certificate', 'income_certificate', 'aadhar', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Status & Tracking
  status: {
    type: String,
    enum: ['active', 'inactive', 'transferred', 'graduated', 'expelled', 'on_leave'],
    default: 'active'
  },
  currentSemester: {
    type: Number,
    min: 1
  },
  currentYear: {
    type: Number,
    min: 1
  },

  // Performance Stats
  stats: {
    totalAttendance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageGrade: {
      type: String,
      trim: true
    },
    totalCourses: {
      type: Number,
      default: 0
    },
    completedCourses: {
      type: Number,
      default: 0
    }
  },

  // Metadata
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

// Pre-save hook: Update timestamp and generate enrollment number
studentSchema.pre('save', async function() {
  // Update timestamp
  this.updatedAt = Date.now();

  // Generate unique enrollment number if not exists
  if (!this.enrollmentNumber || this.isNew) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Student').countDocuments({
      institution: this.institution
    });
    this.enrollmentNumber = `ENR${year}${String(count + 1).padStart(6, '0')}`;
  }
});

// Indexes for better query performance
studentSchema.index({ user: 1 }, { unique: true });
studentSchema.index({ institution: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ enrollmentNumber: 1 }, { unique: true });
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ academicYear: 1 });
studentSchema.index({ batch: 1 });
studentSchema.index({ isActive: 1 });
studentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Student', studentSchema);
