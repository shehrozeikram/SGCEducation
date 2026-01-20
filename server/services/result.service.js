const Result = require('../models/Result');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');
const mongoose = require('mongoose');

/**
 * Result Service - Handles result-related business logic
 */
class ResultService {
  /**
   * Get all results (filtered by user role and institution)
   */
  async getAllResults(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        query.institution = institutionId;
      }
    } else if (filters.institution) {
      query.institution = extractInstitutionId(filters.institution);
    }

    // Apply additional filters
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.class) query.class = filters.class;
    if (filters.section) query.section = filters.section;
    if (filters.examType) query.examType = filters.examType;
    if (filters.subject) query.subject = { $regex: filters.subject, $options: 'i' };
    if (filters.status) query.status = filters.status;
    if (filters.student) query.student = filters.student;

    if (filters.search) {
      query.$or = [
        { examName: { $regex: filters.search, $options: 'i' } },
        { subject: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const results = await Result.find(query)
      .populate('institution', 'name type code')
      .populate({
        path: 'student',
        select: 'enrollmentNumber rollNumber',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate('class', 'name code')
      .populate('section', 'name code')
      .populate('group', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('publishedBy', 'name email')
      .sort({ examDate: -1, createdAt: -1 });

    return results;
  }

  /**
   * Get result by ID
   */
  async getResultById(resultId, currentUser) {
    const result = await Result.findById(resultId)
      .populate('institution', 'name type code')
      .populate({
        path: 'student',
        select: 'enrollmentNumber rollNumber section program batch academicYear',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate('class', 'name code')
      .populate('section', 'name code')
      .populate('group', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('publishedBy', 'name email');

    if (!result) {
      throw new ApiError(404, 'Result not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const resultInstitutionId = extractInstitutionId(result.institution);
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || resultInstitutionId?.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied to this result');
      }
    }

    return result;
  }

  /**
   * Create new result
   */
  async createResult(resultData, currentUser) {
    // Validate student exists
    const student = await Student.findById(resultData.student);
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    // Set institution from student if not provided
    if (!resultData.institution) {
      resultData.institution = student.institution;
    }

    // Extract institution IDs for comparison
    const resultInstitutionId = extractInstitutionId(resultData.institution);
    const userInstitutionId = getInstitutionId(currentUser);

    // Validate institution access
    if (currentUser.role !== 'super_admin') {
      if (!userInstitutionId) {
        throw new ApiError(403, 'User institution not found');
      }
      if (resultInstitutionId?.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied to create result for this institution');
      }
      // For non-super-admin users, always use their institution
      resultData.institution = userInstitutionId;
    }

    // Set createdBy
    resultData.createdBy = currentUser._id;

    const result = await Result.create(resultData);

    return await this.getResultById(result._id, currentUser);
  }

  /**
   * Update result
   */
  async updateResult(resultId, updateData, currentUser) {
    const result = await Result.findById(resultId);

    if (!result) {
      throw new ApiError(404, 'Result not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const resultInstitutionId = extractInstitutionId(result.institution);
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || resultInstitutionId?.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied to update this result');
      }
    }

    // Set updatedBy
    updateData.updatedBy = currentUser._id;

    const updatedResult = await Result.findByIdAndUpdate(
      resultId,
      updateData,
      { new: true, runValidators: true }
    );

    return await this.getResultById(updatedResult._id, currentUser);
  }

  /**
   * Delete result
   */
  async deleteResult(resultId, currentUser) {
    const result = await Result.findById(resultId);

    if (!result) {
      throw new ApiError(404, 'Result not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const resultInstitutionId = extractInstitutionId(result.institution);
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || resultInstitutionId?.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied to delete this result');
      }
    }

    await Result.findByIdAndDelete(resultId);

    return { message: 'Result deleted successfully' };
  }

  /**
   * Get results by student
   */
  async getResultsByStudent(studentId, filters = {}, currentUser) {
    const query = { student: studentId };

    // Apply institution filter
    if (currentUser.role !== 'super_admin') {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        query.institution = institutionId;
      }
    } else if (filters.institution) {
      query.institution = extractInstitutionId(filters.institution);
    }

    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.examType) query.examType = filters.examType;
    if (filters.subject) query.subject = { $regex: filters.subject, $options: 'i' };
    if (filters.status) query.status = filters.status;

    const results = await Result.find(query)
      .populate('institution', 'name type code')
      .populate('class', 'name code')
      .populate('section', 'name code')
      .populate('group', 'name code')
      .sort({ examDate: -1 });

    return results;
  }

  /**
   * Get results by class
   */
  async getResultsByClass(classId, filters = {}, currentUser) {
    const query = { class: classId };

    // Apply institution filter
    if (currentUser.role !== 'super_admin') {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        query.institution = institutionId;
      }
    } else if (filters.institution) {
      query.institution = extractInstitutionId(filters.institution);
    }

    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.section) query.section = filters.section;
    if (filters.examType) query.examType = filters.examType;
    if (filters.subject) query.subject = { $regex: filters.subject, $options: 'i' };
    if (filters.status) query.status = filters.status;

    const results = await Result.find(query)
      .populate({
        path: 'student',
        select: 'enrollmentNumber rollNumber',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate('section', 'name code')
      .populate('group', 'name code')
      .sort({ examDate: -1, 'student.user.name': 1 });

    return results;
  }

  /**
   * Bulk create results
   */
  async bulkCreateResults(resultsData, currentUser) {
    const results = [];

    for (const resultData of resultsData) {
      // Validate student exists
      const student = await Student.findById(resultData.student);
      if (!student) {
        throw new ApiError(404, `Student not found: ${resultData.student}`);
      }

      // Set institution from student if not provided
      if (!resultData.institution) {
        resultData.institution = student.institution;
      }

    // Extract institution IDs for comparison
    const resultInstitutionId = extractInstitutionId(resultData.institution);
    const userInstitutionId = getInstitutionId(currentUser);

    // Validate institution access
    if (currentUser.role !== 'super_admin') {
      if (!userInstitutionId) {
        throw new ApiError(403, 'User institution not found');
      }
      if (resultInstitutionId?.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied to create result for this institution');
      }
      // For non-super-admin users, always use their institution
      resultData.institution = userInstitutionId;
    }

      // Set createdBy
      resultData.createdBy = currentUser._id;

      const result = await Result.create(resultData);
      results.push(result);
    }

    return results;
  }

  /**
   * Publish results
   */
  async publishResult(resultId, currentUser) {
    const result = await Result.findById(resultId);

    if (!result) {
      throw new ApiError(404, 'Result not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const resultInstitutionId = extractInstitutionId(result.institution);
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || resultInstitutionId?.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied to publish this result');
      }
    }

    result.status = 'published';
    result.publishedAt = new Date();
    result.publishedBy = currentUser._id;
    await result.save();

    return await this.getResultById(result._id, currentUser);
  }

  /**
   * Get result statistics
   */
  async getResultStats(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter
    if (currentUser.role !== 'super_admin') {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        query.institution = institutionId;
      }
    } else if (filters.institution) {
      query.institution = extractInstitutionId(filters.institution);
    }

    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.class) query.class = filters.class;
    if (filters.examType) query.examType = filters.examType;

    const stats = {
      total: await Result.countDocuments(query),
      published: await Result.countDocuments({ ...query, status: 'published' }),
      draft: await Result.countDocuments({ ...query, status: 'draft' }),
      archived: await Result.countDocuments({ ...query, status: 'archived' }),
      byExamType: {},
      averagePercentage: 0
    };

    // Get stats by exam type
    const examTypes = ['quiz', 'assignment', 'midterm', 'final', 'practical', 'project', 'oral', 'other'];
    for (const type of examTypes) {
      stats.byExamType[type] = await Result.countDocuments({ ...query, examType: type });
    }

    // Calculate average percentage
    const avgResult = await Result.aggregate([
      { $match: query },
      { $group: { _id: null, avgPercentage: { $avg: '$marks.percentage' } } }
    ]);

    if (avgResult.length > 0) {
      stats.averagePercentage = Math.round(avgResult[0].avgPercentage * 100) / 100;
    }

    return stats;
  }
}

module.exports = new ResultService();
