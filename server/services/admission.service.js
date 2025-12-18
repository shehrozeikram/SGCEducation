const Admission = require('../models/Admission');
const Student = require('../models/Student');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { ApiError } = require('../middleware/error.middleware');
const mongoose = require('mongoose');

/**
 * Admission Service - Handles admission-related business logic
 */
class AdmissionService {
  /**
   * Get all admissions (filtered by user role and institution)
   */
  async getAllAdmissions(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      query.institution = currentUser.institution;
    } else if (filters.institution) {
      query.institution = filters.institution;
    }

    // Apply additional filters
    if (filters.status) query.status = filters.status;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    if (filters.search) {
      query.$or = [
        { applicationNumber: { $regex: filters.search, $options: 'i' } },
        { 'personalInfo.firstName': { $regex: filters.search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: filters.search, $options: 'i' } },
        { 'contactInfo.email': { $regex: filters.search, $options: 'i' } }
      ];
    }

    const admissions = await Admission.find(query)
      .populate('institution', 'name type code')
      .populate('reviewedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('studentId', 'enrollmentNumber rollNumber status currentClass currentSection')
      .populate('class', 'name code')
      .populate('section', 'name')
      .sort({ createdAt: -1 });

    return admissions;
  }

  /**
   * Get admission by ID
   */
  async getAdmissionById(admissionId, currentUser) {
    const admission = await Admission.findById(admissionId)
      .populate('institution', 'name type code')
      .populate('reviewedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('studentId', 'enrollmentNumber rollNumber user');

    if (!admission) {
      throw new ApiError(404, 'Admission not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin' &&
        admission.institution._id.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'Access denied to this admission');
    }

    return admission;
  }

  /**
   * Create new admission application
   */
  async createAdmission(admissionData, createdBy) {
    const { institution } = admissionData;

    // Verify institution exists
    const institutionDoc = await Institution.findById(institution);
    if (!institutionDoc) {
      throw new ApiError(404, 'Institution not found');
    }

    // Check permissions for non-super admins
    if (createdBy && createdBy.role !== 'super_admin' &&
        institution.toString() !== createdBy.institution?.toString()) {
      throw new ApiError(403, 'You can only create admissions for your institution');
    }

    // Check if email already has a pending/approved application
    const existingAdmission = await Admission.findOne({
      'contactInfo.email': admissionData.contactInfo.email,
      institution,
      status: { $in: ['pending', 'under_review', 'approved'] }
    });

    if (existingAdmission) {
      throw new ApiError(400, 'An active application already exists with this email');
    }

    // Create admission
    const admission = await Admission.create({
      ...admissionData,
      createdBy: createdBy ? createdBy.id : null,
      submittedAt: Date.now()
    });

    return await Admission.findById(admission._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email');
  }

  /**
   * Update admission application
   */
  async updateAdmission(admissionId, updateData, currentUser) {
    const admission = await Admission.findById(admissionId);

    if (!admission) {
      throw new ApiError(404, 'Admission not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' &&
        admission.institution.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'You can only update admissions in your institution');
    }

    // Prevent updating if already enrolled
    if (admission.status === 'enrolled') {
      throw new ApiError(400, 'Cannot update an enrolled admission');
    }

    // Update admission
    Object.assign(admission, updateData);
    await admission.save();

    return await Admission.findById(admission._id)
      .populate('institution', 'name type code')
      .populate('reviewedBy', 'name email')
      .populate('createdBy', 'name email');
  }

  /**
   * Update admission status
   */
  async updateAdmissionStatus(admissionId, status, remarks, currentUser) {
    const admission = await Admission.findById(admissionId);

    if (!admission) {
      throw new ApiError(404, 'Admission not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' &&
        currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admins can update admission status');
    }

    if (currentUser.role !== 'super_admin' &&
        admission.institution.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'You can only update admissions in your institution');
    }

    // Update status
    const oldStatus = admission.status;
    admission.status = status;
    admission.reviewedBy = currentUser.id;
    admission.reviewedAt = Date.now();
    admission.reviewRemarks = remarks;

    // Add to status history
    admission.statusHistory.push({
      status,
      remarks,
      changedBy: currentUser.id,
      changedAt: Date.now()
    });

    await admission.save();

    return await Admission.findById(admission._id)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate('reviewedBy', 'name email');
  }

  /**
   * Approve admission and create student record
   */
  async approveAndEnroll(admissionId, currentUser) {
    const admission = await Admission.findById(admissionId)
      .populate('institution');

    if (!admission) {
      throw new ApiError(404, 'Admission not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' &&
        currentUser.role !== 'admin') {
      throw new ApiError(403, 'Only admins can approve admissions');
    }

    if (currentUser.role !== 'super_admin' &&
        admission.institution._id.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Check if already enrolled
    if (admission.status === 'enrolled') {
      throw new ApiError(400, 'Admission already enrolled');
    }

    // Check if approved
    if (admission.status !== 'approved') {
      throw new ApiError(400, 'Admission must be approved before enrollment');
    }

    // Check if user already exists with this email
    let user = await User.findOne({ email: admission.contactInfo.email });

    if (!user) {
      // Create user account
      const tempPassword = Math.random().toString(36).slice(-8);
      user = await User.create({
        name: `${admission.personalInfo.firstName} ${admission.personalInfo.lastName}`,
        email: admission.contactInfo.email,
        password: tempPassword,
        role: 'student',
        institution: admission.institution._id,
        phone: admission.contactInfo.phone,
        dateOfBirth: admission.personalInfo.dateOfBirth,
        gender: admission.personalInfo.gender,
        address: admission.contactInfo.currentAddress?.street || ''
      });
    }

    // Create student record
    const student = await Student.create({
      user: user._id,
      institution: admission.institution._id,
      admission: admission._id,
      admissionDate: Date.now(),
      academicYear: admission.academicYear,
      program: admission.program,
      personalDetails: {
        middleName: admission.personalInfo.middleName,
        bloodGroup: admission.personalInfo.bloodGroup,
        nationality: admission.personalInfo.nationality,
        religion: admission.personalInfo.religion,
        category: admission.personalInfo.category
      },
      contactDetails: {
        alternatePhone: admission.contactInfo.alternatePhone,
        currentAddress: admission.contactInfo.currentAddress,
        permanentAddress: admission.contactInfo.permanentAddress
      },
      guardianInfo: admission.guardianInfo,
      academicInfo: admission.academicBackground,
      documents: admission.documents,
      createdBy: currentUser.id
    });

    // Update admission with student reference
    admission.studentId = student._id;
    admission.status = 'enrolled';
    admission.statusHistory.push({
      status: 'enrolled',
      remarks: 'Approved and enrolled successfully',
      changedBy: currentUser.id,
      changedAt: Date.now()
    });
    await admission.save();

    return {
      admission,
      student,
      user
    };
  }

  /**
   * Reject admission
   */
  async rejectAdmission(admissionId, remarks, currentUser) {
    return await this.updateAdmissionStatus(admissionId, 'rejected', remarks, currentUser);
  }

  /**
   * Delete admission (soft delete)
   */
  async deleteAdmission(admissionId, currentUser) {
    const admission = await Admission.findById(admissionId);

    if (!admission) {
      throw new ApiError(404, 'Admission not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' &&
        admission.institution.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'You can only delete admissions in your institution');
    }

    // Prevent deletion if enrolled
    if (admission.status === 'enrolled') {
      throw new ApiError(400, 'Cannot delete an enrolled admission');
    }

    admission.isActive = false;
    admission.status = 'cancelled';
    await admission.save();

    return { message: 'Admission cancelled successfully' };
  }

  /**
   * Get admission statistics
   */
  async getAdmissionStats(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      query.institution = currentUser.institution;
    } else if (filters.institution) {
      query.institution = filters.institution;
    }

    if (filters.academicYear) {
      query.academicYear = filters.academicYear;
    }

    const [
      totalApplications,
      pendingApplications,
      underReviewApplications,
      approvedApplications,
      rejectedApplications,
      enrolledApplications
    ] = await Promise.all([
      Admission.countDocuments({ ...query, isActive: true }),
      Admission.countDocuments({ ...query, status: 'pending', isActive: true }),
      Admission.countDocuments({ ...query, status: 'under_review', isActive: true }),
      Admission.countDocuments({ ...query, status: 'approved', isActive: true }),
      Admission.countDocuments({ ...query, status: 'rejected', isActive: true }),
      Admission.countDocuments({ ...query, status: 'enrolled', isActive: true })
    ]);

    return {
      totalApplications,
      pendingApplications,
      underReviewApplications,
      approvedApplications,
      rejectedApplications,
      enrolledApplications
    };
  }

  /**
   * Get detailed admission analytics for charts
   */
  async getAdmissionAnalytics(filters = {}, currentUser) {
    // Include active admissions by default but allow overriding via filters
    const query = {};
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      // For non-super-admin users, use institution from user or filters
      let institutionId = null;
      
      // First, try to get from filters (if explicitly provided)
      if (filters.institution) {
        institutionId = filters.institution;
      } 
      // Otherwise, use user's institution
      else if (currentUser.institution) {
        // Extract _id if it's an object
        if (typeof currentUser.institution === 'object') {
          institutionId = currentUser.institution._id || currentUser.institution;
        } else {
          institutionId = currentUser.institution;
        }
      }
      
      // Only set query if we have a valid institution
      if (institutionId) {
        // Convert to ObjectId if it's a valid string
        if (mongoose.Types.ObjectId.isValid(institutionId)) {
          query.institution = new mongoose.Types.ObjectId(institutionId);
        } else {
          query.institution = institutionId;
        }
      }
      // Don't throw error - just don't filter by institution if not available
    } else if (filters.institution) {
      // For super_admin, use institution from filters if provided
      if (mongoose.Types.ObjectId.isValid(filters.institution)) {
        query.institution = new mongoose.Types.ObjectId(filters.institution);
      } else {
        query.institution = filters.institution;
      }
    }

    if (filters.academicYear) {
      query.academicYear = filters.academicYear;
    }

    const days = filters.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Status breakdown
    const statusBreakdown = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Gender breakdown
    const genderBreakdown = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$personalInfo.gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Program breakdown
    const programBreakdown = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$program',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Application trends over time (last N days)
    const applicationTrends = await Admission.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Status trends over time
    const statusTrends = await Admission.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Monthly application count
    const monthlyTrends = await Admission.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Category breakdown
    const categoryBreakdown = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$personalInfo.category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Conversion rate (approved + enrolled / total)
    const totalCount = await Admission.countDocuments(query);
    const convertedCount = await Admission.countDocuments({
      ...query,
      status: { $in: ['approved', 'enrolled'] }
    });
    const conversionRate = totalCount > 0 ? ((convertedCount / totalCount) * 100).toFixed(2) : 0;

    // Build institution filter for class/section queries
    const institutionFilter = {};
    if (currentUser.role !== 'super_admin') {
      institutionFilter.institution = currentUser.institution;
    } else if (filters.institution) {
      institutionFilter.institution = new mongoose.Types.ObjectId(filters.institution);
    }

    // Student Strength Class Wise - Current School
    const classWiseStrength = await Student.aggregate([
      { $match: { ...institutionFilter, isActive: true } },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$class',
          className: { $first: '$classInfo.name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { className: 1 } }
    ]);

    // Total Seats Available and Strength in Sections
    const sectionStats = await Section.aggregate([
      { $match: institutionFilter },
      {
        $lookup: {
          from: 'students',
          let: { sectionId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$section', '$$sectionId'] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            }
          ],
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          code: 1,
          className: '$classInfo.name',
          capacity: { $ifNull: ['$capacity', 0] },
          currentStrength: { $size: '$students' },
          availableSeats: {
            $subtract: [
              { $ifNull: ['$capacity', 0] },
              { $size: '$students' }
            ]
          }
        }
      },
      { $sort: { className: 1, name: 1 } }
    ]);

    // Aggregate totals for sections
    const totalSeatsAvailable = sectionStats.reduce((sum, section) => sum + Math.max(0, section.availableSeats), 0);
    const totalSectionCapacity = sectionStats.reduce((sum, section) => sum + section.capacity, 0);
    const totalSectionStrength = sectionStats.reduce((sum, section) => sum + section.currentStrength, 0);

    return {
      statusBreakdown: statusBreakdown.map(item => ({
        status: item._id || 'unknown',
        count: item.count
      })),
      departmentBreakdown: [], // Removed - department field no longer exists
      genderBreakdown: genderBreakdown.map(item => ({
        gender: item._id || 'unknown',
        count: item.count
      })),
      programBreakdown: programBreakdown.map(item => ({
        program: item._id || 'Unknown',
        count: item.count
      })),
      applicationTrends: applicationTrends.map(item => ({
        date: item._id,
        count: item.count
      })),
      statusTrends: statusTrends.map(item => ({
        date: item._id.date,
        status: item._id.status,
        count: item.count
      })),
      monthlyTrends: monthlyTrends.map(item => ({
        month: item._id,
        count: item.count
      })),
      categoryBreakdown: categoryBreakdown.map(item => ({
        category: item._id || 'Unknown',
        count: item.count
      })),
      conversionRate: parseFloat(conversionRate),
      totalApplications: totalCount,
      convertedApplications: convertedCount,
      classWiseStrength: classWiseStrength.map(item => ({
        className: item.className || 'Unknown',
        count: item.count
      })),
      sectionStats: sectionStats.map(item => ({
        name: item.name,
        code: item.code,
        className: item.className || 'Unknown',
        capacity: item.capacity,
        currentStrength: item.currentStrength,
        availableSeats: item.availableSeats
      })),
      totalSeatsAvailable,
      totalSectionCapacity,
      totalSectionStrength
    };
  }

  /**
   * Get admission reports based on report type
   */
  async getAdmissionReports(filters, user) {
    const { reportType, startDate, endDate, month, year, institution, classId } = filters;

    // Build base query
    let query = {};
    
    // Institution filter
    if (institution) {
      query.institution = new mongoose.Types.ObjectId(institution);
    } else if (user.role !== 'super_admin' && user.institution) {
      query.institution = user.institution;
    }

    switch (reportType) {
      case 'admission-by-date':
        return await this.getAdmissionByDateReport(query, startDate, endDate);
      
      case 'admission-by-month':
        return await this.getAdmissionByMonthReport(query, month, year);
      
      case 'admission-by-year':
        return await this.getAdmissionByYearReport(query, year);
      
      case 'class-wise-comparison':
        return await this.getClassWiseComparisonReport(query, year);
      
      case 'date-wise-admission':
        return await this.getDateWiseAdmissionReport(query, startDate, endDate);
      
      default:
        throw new Error('Invalid report type');
    }
  }

  /**
   * Get admission by date report
   */
  async getAdmissionByDateReport(baseQuery, startDate, endDate) {
    const query = { ...baseQuery };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const admissions = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          enrolled: {
            $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          total: 1,
          pending: 1,
          approved: 1,
          rejected: 1,
          enrolled: 1,
          _id: 0
        }
      }
    ]);

    return admissions;
  }

  /**
   * Get admission by month report
   */
  async getAdmissionByMonthReport(baseQuery, month, year) {
    const query = { ...baseQuery };
    const currentYear = year || new Date().getFullYear();

    // Filter by year
    query.createdAt = {
      $gte: new Date(`${currentYear}-01-01`),
      $lte: new Date(`${currentYear}-12-31T23:59:59.999`)
    };

    // If specific month is provided
    if (month) {
      const monthNum = parseInt(month);
      const startDate = new Date(`${currentYear}-${monthNum.toString().padStart(2, '0')}-01`);
      const endDate = new Date(currentYear, monthNum, 0, 23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const admissions = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          enrolled: {
            $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: {
            $arrayElemAt: [monthNames, { $subtract: ['$_id', 1] }]
          },
          total: 1,
          pending: 1,
          approved: 1,
          rejected: 1,
          enrolled: 1,
          _id: 0
        }
      }
    ]);

    return admissions;
  }

  /**
   * Get admission by year report
   */
  async getAdmissionByYearReport(baseQuery, year) {
    const query = { ...baseQuery };
    const currentYear = year || new Date().getFullYear();

    query.createdAt = {
      $gte: new Date(`${currentYear}-01-01`),
      $lte: new Date(`${currentYear}-12-31T23:59:59.999`)
    };

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthlyData = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: 1 },
          enrolled: {
            $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: {
            $arrayElemAt: [monthNames, { $subtract: ['$_id', 1] }]
          },
          total: 1,
          enrolled: 1,
          conversionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              {
                $round: [
                  { $multiply: [{ $divide: ['$enrolled', '$total'] }, 100] },
                  2
                ]
              }
            ]
          },
          _id: 0
        }
      }
    ]);

    // Get summary stats
    const summary = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          enrolled: {
            $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] }
          }
        }
      }
    ]);

    return {
      summary: summary[0] || { total: 0, pending: 0, approved: 0, rejected: 0, enrolled: 0 },
      monthlyData
    };
  }

  /**
   * Get class-wise comparison report
   */
  async getClassWiseComparisonReport(baseQuery, year) {
    const query = { ...baseQuery };
    const currentYear = year || new Date().getFullYear();

    query.createdAt = {
      $gte: new Date(`${currentYear}-01-01`),
      $lte: new Date(`${currentYear}-12-31T23:59:59.999`)
    };

    const classWiseData = await Admission.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$class',
          className: { $first: '$classInfo.name' },
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          enrolled: {
            $sum: { $cond: [{ $eq: ['$status', 'enrolled'] }, 1, 0] }
          }
        }
      },
      { $sort: { className: 1 } },
      {
        $project: {
          className: { $ifNull: ['$className', 'Not Assigned'] },
          total: 1,
          pending: 1,
          approved: 1,
          rejected: 1,
          enrolled: 1,
          _id: 0
        }
      }
    ]);

    return classWiseData;
  }

  /**
   * Get date-wise admission report
   */
  async getDateWiseAdmissionReport(baseQuery, startDate, endDate) {
    const query = { ...baseQuery };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const admissions = await Admission.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          applicationNumber: 1,
          studentName: '$fullName',
          className: { $ifNull: ['$classInfo.name', 'Not Assigned'] },
          date: '$createdAt',
          status: 1
        }
      },
      { $sort: { date: -1 } }
    ]);

    return admissions;
  }

  /**
   * Get admission by date detailed report with fee deposit filters
   */
  async getAdmissionByDateDetailedReport(filters, user) {
    const { institutions, startDate, endDate, reportType } = filters;

    // Build query
    const query = {};

    // Institution filter - convert comma-separated string to array of ObjectIds
    if (institutions) {
      const instArray = institutions.split(',');
      query.institution = { $in: instArray.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (user.role !== 'super_admin' && user.institution) {
      query.institution = user.institution;
    }

    // Date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    // Fee deposit filter based on report type
    if (reportType === 'fee-deposit') {
      query['applicationFee.paid'] = true;
    } else if (reportType === 'without-fee-deposit') {
      query['applicationFee.paid'] = { $ne: true };
    }

    // Get detailed admission records for printing
    const admissions = await Admission.find(query)
      .populate('institution', 'name code address')
      .populate('class', 'name code')
      .populate('section', 'name code')
      .populate('studentId', 'enrollmentNumber rollNumber program section batch')
      .sort({ createdAt: 1 })
      .lean();

    // Transform data for the report
    const reportData = admissions.map((admission, index) => {
      // Build full name from personalInfo
      const fullName = [
        admission.personalInfo?.firstName,
        admission.personalInfo?.middleName,
        admission.personalInfo?.lastName
      ].filter(Boolean).join(' ') || 'N/A';

      // Get program and section info
      const className = admission.class?.name || admission.program || 'N/A';
      const sectionName = admission.section?.name || admission.studentId?.section || 'N/A';
      const classSection = `School ${admission.institution?.name || 'N/A'}, Class ${className}, Section ${sectionName}`;

      return {
        date: admission.createdAt.toISOString().split('T')[0],
        studentId: admission.studentId?.enrollmentNumber || index + 1,
        rollNumber: admission.studentId?.rollNumber || index + 1,
        admissionNumber: admission.applicationNumber || `ADM${index + 1}`,
        admissionDate: admission.createdAt,
        studentName: fullName,
        fatherName: admission.guardianInfo?.fatherName || 'N/A',
        gender: admission.personalInfo?.gender || 'N/A',
        mobile: admission.contactInfo?.phone || 'N/A',
        classSection: classSection,
        schoolName: admission.institution?.name || 'N/A',
        feeDeposited: admission.applicationFee?.paid || false,
        status: admission.status
      };
    });

    return reportData;
  }

  /**
   * Get detailed admission by month report for export
   */
  async getAdmissionByMonthDetailedReport(filters, user) {
    const { month, year } = filters;

    // Build query
    const query = {};

    // Institution filter
    if (user.role !== 'super_admin' && user.institution) {
      query.institution = user.institution;
    }

    // Month and year filter
    if (month && year) {
      const startDate = new Date(`${year}-${month.toString().padStart(2, '0')}-01`);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Get detailed admission records
    const admissions = await Admission.find(query)
      .populate('institution', 'name code address')
      .populate('class', 'name code')
      .populate('section', 'name code')
      .populate('studentId', 'enrollmentNumber rollNumber program section batch personalDetails guardianInfo')
      .sort({ createdAt: 1 })
      .lean();

    // Calculate age from date of birth
    const calculateAge = (dateOfBirth) => {
      if (!dateOfBirth) return '';
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Transform data for the report with all required fields
    const reportData = admissions.map((admission, index) => {
      // Build full name from personalInfo
      const fullName = [
        admission.personalInfo?.firstName,
        admission.personalInfo?.middleName,
        admission.personalInfo?.lastName
      ].filter(Boolean).join(' ') || 'N/A';

      // Get guardian name (can be father, mother, or guardian)
      let guardianName = admission.guardianInfo?.fatherName || '';
      if (!guardianName && admission.guardianInfo?.motherName) {
        guardianName = admission.guardianInfo.motherName;
      }
      if (!guardianName && admission.guardianInfo?.guardianName) {
        guardianName = admission.guardianInfo.guardianName;
      }

      return {
        studentId: admission.studentId?.enrollmentNumber || index + 1,
        rollNumber: admission.studentId?.rollNumber || '',
        admissionNumber: admission.applicationNumber || `ADM${index + 1}`,
        studentName: fullName,
        schoolName: admission.institution?.name || 'N/A',
        fatherName: admission.guardianInfo?.fatherName || 'N/A',
        className: admission.class?.name || admission.program || 'N/A',
        sectionName: admission.section?.name || admission.studentId?.section || 'N/A',
        status: admission.status || 'pending',
        dateOfBirth: admission.personalInfo?.dateOfBirth 
          ? new Date(admission.personalInfo.dateOfBirth).toLocaleDateString('en-GB')
          : '',
        mobileNumber: admission.contactInfo?.phone || '',
        age: calculateAge(admission.personalInfo?.dateOfBirth),
        bloodGroup: admission.personalInfo?.bloodGroup || admission.studentId?.personalDetails?.bloodGroup || '',
        hobbies: '', // Not in current schema, add if needed
        categoryName: admission.personalInfo?.category || '',
        familyNumber: '', // Not in current schema, add if needed
        admissionDate: admission.createdAt 
          ? new Date(admission.createdAt).toLocaleDateString('en-GB')
          : '',
        admissionEffectiveDate: admission.submittedAt 
          ? new Date(admission.submittedAt).toLocaleDateString('en-GB')
          : admission.createdAt ? new Date(admission.createdAt).toLocaleDateString('en-GB') : '',
        gender: admission.personalInfo?.gender || 'N/A',
        religion: admission.personalInfo?.religion || '',
        guardian: guardianName || 'N/A',
      };
    });

    return reportData;
  }
}

module.exports = new AdmissionService();
