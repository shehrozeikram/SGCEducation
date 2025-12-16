const Admission = require('../models/Admission');
const Student = require('../models/Student');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Department = require('../models/Department');
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
    if (filters.department) query.department = filters.department;
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
      .populate('department', 'name code')
      .populate('reviewedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return admissions;
  }

  /**
   * Get admission by ID
   */
  async getAdmissionById(admissionId, currentUser) {
    const admission = await Admission.findById(admissionId)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
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
    const { institution, department } = admissionData;

    // Verify institution exists
    const institutionDoc = await Institution.findById(institution);
    if (!institutionDoc) {
      throw new ApiError(404, 'Institution not found');
    }

    // Verify department exists
    const departmentDoc = await Department.findById(department);
    if (!departmentDoc) {
      throw new ApiError(404, 'Department not found');
    }

    // Check if department belongs to institution
    if (departmentDoc.institution.toString() !== institution.toString()) {
      throw new ApiError(400, 'Department does not belong to the selected institution');
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
      .populate('department', 'name code')
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
      .populate('department', 'name code')
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
      .populate('institution')
      .populate('department');

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
        department: admission.department._id,
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
      department: admission.department._id,
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
   * Get admissions by department
   */
  async getAdmissionsByDepartment(departmentId, currentUser) {
    const department = await Department.findById(departmentId);

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' &&
        department.institution.toString() !== currentUser.institution?.toString()) {
      throw new ApiError(403, 'Access denied to this department');
    }

    const admissions = await Admission.find({
      department: departmentId,
      isActive: true
    })
      .populate('institution', 'name type')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return admissions;
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
      // For non-super-admin users, require institution
      if (!currentUser.institution) {
        throw new ApiError(400, 'User institution not set. Please contact administrator.');
      }
      query.institution = currentUser.institution;
    } else if (filters.institution) {
      // Convert string to ObjectId for superadmin queries
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

    // Department breakdown
    const departmentBreakdown = await Admission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Populate department names
    const departmentIds = departmentBreakdown.map(d => d._id);
    const departments = await Department.find({ _id: { $in: departmentIds } }).select('name');
    const departmentMap = {};
    departments.forEach(dept => {
      departmentMap[dept._id.toString()] = dept.name;
    });

    const departmentData = departmentBreakdown.map(item => ({
      name: departmentMap[item._id?.toString()] || 'Unknown',
      count: item.count
    }));

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
      departmentBreakdown: departmentData,
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
}

module.exports = new AdmissionService();
