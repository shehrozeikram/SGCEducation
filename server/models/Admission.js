const mongoose = require('mongoose');
const SequenceCounter = require('./SequenceCounter');

const admissionSchema = new mongoose.Schema({
  // Application Details
  applicationNumber: {
    type: String,
    uppercase: true
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: [true, 'Please provide institution']
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
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  rollNumber: {
    type: String,
    uppercase: true,
    trim: true
  },

  // Personal Information
  personalInfo: {
    name: {
      type: String,
      required: [true, 'Please provide name'],
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Please provide date of birth']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Please provide gender']
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      trim: true
    },
    nationality: {
      type: String,
      required: [true, 'Please provide nationality'],
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
    }
  },

  // Contact Information
  contactInfo: {
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
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
    },
    sameAsCurrent: {
      type: Boolean,
      default: false
    }
  },

  // Guardian Information
  guardianInfo: {
    fatherName: {
      type: String,
      trim: true
    },
    fatherCnic: {
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
    motherName: {
      type: String,
      trim: true
    },
    motherCnic: {
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
    guardianName: {
      type: String,
      trim: true
    },
    guardianRelation: {
      type: String,
      trim: true
    },
    guardianCnic: {
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

  // Academic Background
  academicBackground: {
    previousSchool: {
      type: String,
      trim: true
    },
    previousBoard: {
      type: String,
      trim: true
    },
    previousClass: {
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
      enum: ['photo', 'birth_certificate', 'previous_marksheet', 'transfer_certificate', 'caste_certificate', 'income_certificate', 'aadhar', 'other'],
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

  // Application Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'enrolled', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected', 'enrolled', 'cancelled']
    },
    remarks: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Review Information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewRemarks: {
    type: String,
    trim: true
  },

  // Fee Information
  applicationFee: {
    amount: {
      type: Number,
      default: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    },
    transactionId: {
      type: String,
      trim: true
    }
  },

  // Student Reference (after enrollment)
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },

  // Metadata
  submittedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
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

// Pre-save hook: Update timestamp and generate application number
admissionSchema.pre('save', async function() {
  // Update timestamp
  this.updatedAt = Date.now();

  // Generate unique application number if not exists
  if (!this.applicationNumber) {
    const counter = await SequenceCounter.findOneAndUpdate(
      { institution: this.institution, type: 'admission' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.applicationNumber = String(counter.seq);
  }

  // Generate roll number if not exists and it's a new admission (or missing)
  if (!this.rollNumber) {
    // Find highest roll number in Admissions and Students
    const latestAdmission = await mongoose.model('Admission').findOne({ institution: this.institution })
      .sort({ rollNumber: -1 })
      .select('rollNumber');

    const latestStudent = await mongoose.model('Student').findOne({ institution: this.institution })
      .sort({ rollNumber: -1 })
      .select('rollNumber');

    let maxRoll = 99;

    if (latestAdmission && latestAdmission.rollNumber) {
      const rollNum = parseInt(latestAdmission.rollNumber);
      if (!isNaN(rollNum)) maxRoll = Math.max(maxRoll, rollNum);
    }

    if (latestStudent && latestStudent.rollNumber) {
      const rollNum = parseInt(latestStudent.rollNumber);
      if (!isNaN(rollNum)) maxRoll = Math.max(maxRoll, rollNum);
    }

    this.rollNumber = String(maxRoll + 1);
  }
});

// Indexes for better query performance
admissionSchema.index({ institution: 1 });
admissionSchema.index({ status: 1 });
admissionSchema.index({ academicYear: 1 });
// Compound unique index: same applicationNumber allowed across different institutions
admissionSchema.index({ applicationNumber: 1, institution: 1 }, { unique: true });
admissionSchema.index({ 'contactInfo.email': 1 });
admissionSchema.index({ createdAt: -1 });

// Virtual for full name (returns the single name field)
admissionSchema.virtual('fullName').get(function() {
  return this.personalInfo?.name || '';
});

// Enable virtuals in JSON
admissionSchema.set('toJSON', { virtuals: true });
admissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Admission', admissionSchema);
