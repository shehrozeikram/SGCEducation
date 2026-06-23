const Institution = require('../models/Institution');
const User = require('../models/User');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Institution Service - Handles institution-related business logic
 */
class InstitutionService {
  /**
   * Get all institutions
   */
  async getAllInstitutions(filters = {}, currentUser) {
    // Super admin can see all institutions
    // Other users can only see their own institution
    const query = {};

    if (currentUser.role !== 'super_admin') {
      query._id = currentUser.institution;
    }

    // Apply filters
    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.organization) query.organization = filters.organization;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const institutions = await Institution.find(query)
      .populate('createdBy', 'name email')
      .populate('organization', 'name code')
      .sort({ createdAt: -1 });

    return institutions;
  }

  /**
   * Get institution by ID
   */
  async getInstitutionById(institutionId, currentUser) {
    const institution = await Institution.findById(institutionId)
      .populate('createdBy', 'name email')
      .populate('organization', 'name code');

    if (!institution) {
      throw new ApiError(404, 'Institution not found');
    }

    // Check access permissions
    const userInstitutionId = currentUser.institution?._id
      ? currentUser.institution._id.toString()
      : currentUser.institution?.toString();

    if (currentUser.role !== 'super_admin' && institution._id.toString() !== userInstitutionId) {
      throw new ApiError(403, 'Access denied to this institution');
    }

    return institution;
  }

  /**
   * Create new institution
   */
  async createInstitution(institutionData, createdBy) {
    // Only super admin can create institutions
    if (createdBy.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can create institutions');
    }

    // Check if institution code already exists
    const existingCode = await Institution.findOne({ code: institutionData.code.toUpperCase() });
    if (existingCode) {
      throw new ApiError(400, 'Institution code already exists');
    }

    // Check if institution name already exists
    const existingName = await Institution.findOne({ name: institutionData.name });
    if (existingName) {
      throw new ApiError(400, 'Institution name already exists');
    }

    // Create institution
    const institution = await Institution.create({
      ...institutionData,
      code: institutionData.code.toUpperCase(),
      createdBy: createdBy.id
    });

    return institution;
  }

  /**
   * Update institution
   */
  async updateInstitution(institutionId, updateData, currentUser) {
    const institution = await Institution.findById(institutionId);

    if (!institution) {
      throw new ApiError(404, 'Institution not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can update institutions');
    }

    // Check if code is being changed and already exists
    if (updateData.code && updateData.code.toUpperCase() !== institution.code) {
      const existingCode = await Institution.findOne({
        code: updateData.code.toUpperCase(),
        _id: { $ne: institutionId }
      });
      if (existingCode) {
        throw new ApiError(400, 'Institution code already exists');
      }
      updateData.code = updateData.code.toUpperCase();
    }

    // Check if name is being changed and already exists
    if (updateData.name && updateData.name !== institution.name) {
      const existingName = await Institution.findOne({
        name: updateData.name,
        _id: { $ne: institutionId }
      });
      if (existingName) {
        throw new ApiError(400, 'Institution name already exists');
      }
    }

    // Filter out immutable and sensitive fields that shouldn't be updated directly
    const immutableFields = ['_id', 'createdBy', 'createdAt', 'updatedAt', '__v'];
    const filteredUpdateData = { ...updateData };
    immutableFields.forEach(field => delete filteredUpdateData[field]);

    // Update institution
    Object.assign(institution, filteredUpdateData);
    await institution.save();

    return institution;
  }

  /**
   * Delete institution (hard delete with cascade)
   */
  async deleteInstitution(institutionId, currentUser) {
    if (currentUser.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can delete institutions');
    }

    const institution = await Institution.findById(institutionId);

    if (!institution) {
      throw new ApiError(404, 'Institution not found');
    }

    // Import all required models for cascade deletion
    const Admission = require('../models/Admission');
    const Class = require('../models/Class');
    const Section = require('../models/Section');
    const Group = require('../models/Group');
    const FeeStructure = require('../models/FeeStructure');
    const FeePayment = require('../models/FeePayment');
    const FeeVoucher = require('../models/FeeVoucher');
    const SuspenseEntry = require('../models/SuspenseEntry');
    const Result = require('../models/Result');
    const StudentFee = require('../models/StudentFee');
    const Student = require('../models/Student');

    // Cascade delete all related data
    await Promise.all([
      // Delete students/admissions
      Admission.deleteMany({ institution_id: institutionId }),
      Student.deleteMany({ institution_id: institutionId }),
      
      // Delete classes, sections, groups
      Class.deleteMany({ institution_id: institutionId }),
      Section.deleteMany({ institution_id: institutionId }),
      Group.deleteMany({ institution_id: institutionId }),
      
      // Delete fee-related data (these use 'institution' field, not 'institution_id')
      FeeStructure.deleteMany({ institution_id: institutionId }),
      FeePayment.deleteMany({ institution_id: institutionId }),
      FeeVoucher.deleteMany({ institution: institutionId }),
      StudentFee.deleteMany({ institution: institutionId }),
      SuspenseEntry.deleteMany({ institution_id: institutionId }),
      
      // Delete results
      Result.deleteMany({ institution_id: institutionId }),
      
      // Delete users belonging to this institution
      User.deleteMany({ institution: institutionId }),
    ]);

    // Finally delete the institution itself
    await Institution.findByIdAndDelete(institutionId);

    return { message: 'Institution and all related data deleted successfully' };
  }

  /**
   * Toggle institution status
   */
  async toggleInstitutionStatus(institutionId, currentUser) {
    if (currentUser.role !== 'super_admin') {
      throw new ApiError(403, 'Only Super Admin can change institution status');
    }

    const institution = await Institution.findById(institutionId);

    if (!institution) {
      throw new ApiError(404, 'Institution not found');
    }

    institution.isActive = !institution.isActive;
    await institution.save();

    return institution;
  }

  /**
   * Get institution statistics
   */
  async getInstitutionStats(institutionId, currentUser) {
    // Check access
    const userInstitutionId = currentUser.institution?._id
      ? currentUser.institution._id.toString()
      : currentUser.institution?.toString();

    if (currentUser.role !== 'super_admin' && institutionId !== userInstitutionId) {
      throw new ApiError(403, 'Access denied to this institution');
    }

    const institution = await Institution.findById(institutionId);

    if (!institution) {
      throw new ApiError(404, 'Institution not found');
    }

    // Get real-time counts
    const [studentsCount, teachersCount] = await Promise.all([
      User.countDocuments({ institution: institutionId, role: 'student', isActive: true }),
      User.countDocuments({ institution: institutionId, role: 'teacher', isActive: true })
    ]);

    // Update stats
    institution.stats.totalStudents = studentsCount;
    institution.stats.totalTeachers = teachersCount;
    await institution.save();

    return institution.stats;
  }
}

module.exports = new InstitutionService();
