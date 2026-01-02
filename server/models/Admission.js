const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  // Application Details
  applicationNumber: {
    type: String,
    unique: true,
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

  // Personal Information
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'Please provide first name'],
      trim: true
    },
    middleName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Please provide last name'],
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
      required: [true, 'Please provide email'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Please provide phone number'],
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
    const year = new Date().getFullYear();
    const count = await mongoose.model('Admission').countDocuments({
      institution: this.institution
    });
    this.applicationNumber = `ADM${year}${String(count + 1).padStart(6, '0')}`;
  }
});

// Indexes for better query performance
admissionSchema.index({ institution: 1 });
admissionSchema.index({ status: 1 });
admissionSchema.index({ academicYear: 1 });
admissionSchema.index({ applicationNumber: 1 }, { unique: true });
admissionSchema.index({ 'contactInfo.email': 1 });
admissionSchema.index({ createdAt: -1 });

// Virtual for full name
admissionSchema.virtual('fullName').get(function() {
  const parts = [
    this.personalInfo.firstName,
    this.personalInfo.middleName,
    this.personalInfo.lastName
  ].filter(Boolean);
  return parts.join(' ');
});

// Enable virtuals in JSON
admissionSchema.set('toJSON', { virtuals: true });
admissionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Admission', admissionSchema);
