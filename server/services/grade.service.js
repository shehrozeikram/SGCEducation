const Grade = require('../models/Grade');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Grade Service - Handles grade-related business logic
 */
class GradeService {
  /**
   * Get all grades (filtered by user role and institution)
   */
  async getAllGrades(filters = {}, currentUser) {
    const query = { isActive: true };

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      if (currentUser.institution) {
        query.$or = [
          { institution: currentUser.institution },
          { institution: null } // Global grades
        ];
      }
    } else if (filters.institution) {
      query.$or = [
        { institution: filters.institution },
        { institution: null } // Global grades
      ];
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const grades = await Grade.find(query)
      .populate('institution', 'name type code')
      .sort({ level: 1 });

    return grades;
  }

  /**
   * Create new grade
   */
  async createGrade(gradeData, currentUser) {
    gradeData.createdBy = currentUser._id;

    // If not super admin, set institution from user
    if (currentUser.role !== 'super_admin' && currentUser.institution) {
      gradeData.institution = currentUser.institution;
    }

    const grade = await Grade.create(gradeData);
    return await Grade.findById(grade._id).populate('institution', 'name type code');
  }
}

module.exports = new GradeService();


