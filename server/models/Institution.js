const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide institution name'],
    trim: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['school', 'college'],
    required: [true, 'Please specify institution type']
  },
  code: {
    type: String,
    required: [true, 'Please provide institution code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide institution email'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    trim: true
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'Pakistan' },
    zipCode: { type: String, trim: true }
  },
  principal: {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true }
  },
  establishedYear: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear()
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String,
    trim: true
  },
  settings: {
    academicYearStart: {
      type: Number,
      min: 1,
      max: 12,
      default: 4  // April
    },
    academicYearEnd: {
      type: Number,
      min: 1,
      max: 12,
      default: 3  // March
    },
    currency: {
      type: String,
      default: 'INR'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  stats: {
    totalStudents: { type: Number, default: 0 },
    totalTeachers: { type: Number, default: 0 },
    totalDepartments: { type: Number, default: 0 },
    totalClasses: { type: Number, default: 0 }
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
institutionSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

// Indexes for better query performance
institutionSchema.index({ code: 1 });
institutionSchema.index({ type: 1 });
institutionSchema.index({ isActive: 1 });
institutionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Institution', institutionSchema);
