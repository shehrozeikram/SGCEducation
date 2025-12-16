const Section = require('../models/Section');
const Class = require('../models/Class');
const Department = require('../models/Department');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Section Service - Handles section-related business logic
 */
class SectionService {
  /**
   * Get all sections (filtered by user role and institution)
   */
  async getAllSections(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      query.institution = currentUser.institution;
    } else if (filters.institution) {
      query.institution = filters.institution;
    }

    // Apply additional filters
    if (filters.department) query.department = filters.department;
    if (filters.class) query.class = filters.class;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const sections = await Section.find(query)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate({
        path: 'class',
        select: 'name code level grade',
        populate: {
          path: 'grade',
          select: 'name code level'
        }
      })
      .populate('classTeacher.userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ 'class.level': 1, code: 1 });

    return sections;
  }

  /**
   * Get section by ID
   */
  async getSectionById(sectionId, currentUser) {
    const section = await Section.findById(sectionId)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate({
        path: 'class',
        select: 'name code level grade',
        populate: {
          path: 'grade',
          select: 'name code level'
        }
      })
      .populate('classTeacher.userId', 'name email')
      .populate('createdBy', 'name email');

    if (!section) {
      throw new ApiError(404, 'Section not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && section.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    return section;
  }

  /**
   * Create new section
   */
  async createSection(sectionData, currentUser) {
    // Verify class exists and user has access
    const classDoc = await Class.findById(sectionData.class);
    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && classDoc.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Set institution and department from class
    sectionData.institution = classDoc.institution;
    // Only set department if the class has one
    if (classDoc.department) {
      sectionData.department = classDoc.department;
    } else {
      // Remove department if not provided to avoid validation errors
      delete sectionData.department;
    }
    sectionData.createdBy = currentUser._id;

    // Check for duplicate code
    const existingSection = await Section.findOne({
      code: sectionData.code.toUpperCase(),
      class: sectionData.class,
      academicYear: sectionData.academicYear
    });

    if (existingSection) {
      throw new ApiError(400, 'Section code already exists for this class and academic year');
    }

    const newSection = await Section.create(sectionData);

    // Update class stats
    await Class.findByIdAndUpdate(sectionData.class, {
      $inc: { 'stats.totalSections': 1 }
    });

    return await Section.findById(newSection._id)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate({
        path: 'class',
        select: 'name code level grade',
        populate: {
          path: 'grade',
          select: 'name code level'
        }
      })
      .populate('classTeacher.userId', 'name email');
  }

  /**
   * Update section
   */
  async updateSection(sectionId, updateData, currentUser) {
    const section = await Section.findById(sectionId);
    if (!section) {
      throw new ApiError(404, 'Section not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && section.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // If code is being updated, check for duplicates
    if (updateData.code) {
      const existingSection = await Section.findOne({
        code: updateData.code.toUpperCase(),
        class: updateData.class || section.class,
        academicYear: updateData.academicYear || section.academicYear,
        _id: { $ne: sectionId }
      });

      if (existingSection) {
        throw new ApiError(400, 'Section code already exists for this class and academic year');
      }
    }

    Object.assign(section, updateData);
    await section.save();

    return await Section.findById(sectionId)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate({
        path: 'class',
        select: 'name code level grade',
        populate: {
          path: 'grade',
          select: 'name code level'
        }
      })
      .populate('classTeacher.userId', 'name email');
  }

  /**
   * Delete section
   */
  async deleteSection(sectionId, currentUser) {
    const section = await Section.findById(sectionId);
    if (!section) {
      throw new ApiError(404, 'Section not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && section.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Update class stats
    await Class.findByIdAndUpdate(section.class, {
      $inc: { 'stats.totalSections': -1 }
    });

    await Section.findByIdAndDelete(sectionId);
    return { message: 'Section deleted successfully' };
  }

  /**
   * Toggle section status
   */
  async toggleSectionStatus(sectionId, currentUser) {
    const section = await Section.findById(sectionId);
    if (!section) {
      throw new ApiError(404, 'Section not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && section.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    section.isActive = !section.isActive;
    await section.save();

    return section;
  }
}

module.exports = new SectionService();

