const StudentPromotion = require('../models/StudentPromotion');
const Student = require('../models/Student');
const Admission = require('../models/Admission');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');
const feeService = require('./fee.service');

/**
 * Student Promotion Service - Handles promotion, transfer, and passout operations
 */
class StudentPromotionService {
  /**
   * Process student promotion/transfer/passout
   */
  async processStudentOperation(operationData, currentUser) {
    const { promotionType, studentIds, from, to, remarks } = operationData;

    if (!studentIds || studentIds.length === 0) {
      throw new ApiError(400, 'Please select at least one student');
    }

    const results = [];
    const errors = [];

    for (const admissionId of studentIds) {
      try {
        // Get admission record
        const admission = await Admission.findById(admissionId)
          .populate('class')
          .populate('section')
          .populate('institution');

        if (!admission) {
          errors.push({ admissionId, error: 'Admission not found' });
          continue;
        }

        // Check if admission is enrolled
        if (admission.status !== 'enrolled') {
          errors.push({ 
            admissionId, 
            error: `Student is not enrolled. Current status: ${admission.status}` 
          });
          continue;
        }

        // Get student record
        const student = await Student.findById(admission.studentId);
        if (!student) {
          errors.push({ admissionId, error: 'Student record not found' });
          continue;
        }

        let updatedStudent;
        let updatedAdmission;

        if (promotionType === 'promote') {
          // PROMOTE: Same institution, different class
          // Status: Student stays 'active', Admission stays 'enrolled'
          // Update: class, section, group, academicYear
          
          // Get section name for Student model (Student stores section as string)
          const Section = require('../models/Section');
          const toSection = await Section.findById(to.section);
          const sectionName = toSection ? toSection.name.toUpperCase() : null;
          
          updatedStudent = await Student.findByIdAndUpdate(
            student._id,
            {
              section: sectionName || to.section, // Student stores section as string (uppercase)
              academicYear: to.academicYear || admission.academicYear,
              status: 'active', // Keep active
              updatedAt: Date.now()
            },
            { new: true }
          );

          updatedAdmission = await Admission.findByIdAndUpdate(
            admission._id,
            {
              class: to.class,
              section: to.section,
              status: 'enrolled', // Keep enrolled
              updatedAt: Date.now()
            },
            { new: true }
          );

          // Automatically assign fee structure for the new class
          try {
            await feeService.assignFeeStructure({
              studentId: student._id,
              classId: to.class,
              discount: 0,
              discountType: 'amount',
              discountReason: 'Auto-assigned on promotion',
              feeHeadDiscounts: {}
            }, currentUser);
          } catch (feeError) {
            // Log error but don't fail the promotion if fee assignment fails
            // This could happen if no fee structure exists for the class, or if already assigned
            console.warn(`Failed to auto-assign fee structure for student ${student._id} to class ${to.class}:`, feeError.message);
          }

        } else if (promotionType === 'transfer') {
          // TRANSFER: Different institution
          // Status: Student becomes 'transferred', Admission status stays 'enrolled'
          // Update: institution, class, section, group
          
          // Get section name for Student model (Student stores section as string)
          const Section = require('../models/Section');
          const toSection = await Section.findById(to.section);
          const sectionName = toSection ? toSection.name.toUpperCase() : null;
          
          // First, update institution and class (but keep status as 'active' temporarily for fee assignment)
          updatedStudent = await Student.findByIdAndUpdate(
            student._id,
            {
              institution: to.institution,
              section: sectionName || to.section, // Student stores section as string (uppercase)
              academicYear: to.academicYear || admission.academicYear,
              // Keep status as 'active' temporarily for fee assignment
              updatedAt: Date.now()
            },
            { new: true }
          );

          // Update admission status to reflect transfer
          updatedAdmission = await Admission.findByIdAndUpdate(
            admission._id,
            {
              status: 'enrolled', // Keep enrolled (they're enrolled at new institution)
              institution: to.institution,
              class: to.class,
              section: to.section,
              updatedAt: Date.now()
            },
            { new: true }
          );

          // Automatically assign fee structure for the new class at the new institution
          // Do this before updating status to 'transferred' so the fee service accepts it
          try {
            await feeService.assignFeeStructure({
              studentId: student._id,
              classId: to.class,
              discount: 0,
              discountType: 'amount',
              discountReason: 'Auto-assigned on transfer',
              feeHeadDiscounts: {}
            }, currentUser);
          } catch (feeError) {
            // Log error but don't fail the transfer if fee assignment fails
            // This could happen if no fee structure exists for the class, or if already assigned
            console.warn(`Failed to auto-assign fee structure for student ${student._id} to class ${to.class}:`, feeError.message);
          }

          // Now update status to 'transferred' after fee assignment
          updatedStudent = await Student.findByIdAndUpdate(
            student._id,
            {
              status: 'transferred', // Mark as transferred
              updatedAt: Date.now()
            },
            { new: true }
          );

        } else if (promotionType === 'passout') {
          // PASS OUT: Student completes last class
          // Status: Student becomes 'graduated', Admission can stay 'enrolled' or be updated
          // No TO section required
          
          updatedStudent = await Student.findByIdAndUpdate(
            student._id,
            {
              status: 'graduated', // Mark as graduated
              updatedAt: Date.now()
            },
            { new: true }
          );

          // Keep admission as enrolled but mark student as graduated
          updatedAdmission = await Admission.findByIdAndUpdate(
            admission._id,
            {
              status: 'enrolled', // Keep enrolled status
              updatedAt: Date.now()
            },
            { new: true }
          );
        }

        // Create promotion record
        const promotionRecord = await StudentPromotion.create({
          student: student._id,
          admission: admission._id,
          operationType: promotionType,
          from: {
            institution: from.institution,
            class: from.class,
            section: from.section,
            group: from.group || null,
            academicYear: admission.academicYear
          },
          to: to ? {
            institution: to.institution || null,
            class: to.class || null,
            section: to.section || null,
            group: to.group || null,
            academicYear: to.academicYear || null
          } : null,
          operationDate: new Date(),
          effectiveDate: new Date(),
          remarks: remarks || '',
          status: 'completed',
          performedBy: currentUser._id
        });

        results.push({
          admissionId,
          studentId: student._id,
          promotionId: promotionRecord._id,
          success: true
        });

      } catch (error) {
        console.error(`Error processing student ${admissionId}:`, error);
        errors.push({ 
          admissionId, 
          error: error.message || 'Failed to process student operation' 
        });
      }
    }

    return {
      success: results.length > 0,
      processed: results.length,
      total: studentIds.length,
      results,
      errors
    };
  }

  /**
   * Get promotion history for a student
   */
  async getStudentPromotionHistory(studentId, currentUser) {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (!userInstitutionId || student.institution.toString() !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    const promotions = await StudentPromotion.find({ student: studentId })
      .populate('from.institution', 'name code')
      .populate('from.class', 'name code')
      .populate('from.section', 'name code')
      .populate('to.institution', 'name code')
      .populate('to.class', 'name code')
      .populate('to.section', 'name code')
      .populate('performedBy', 'name email')
      .sort({ operationDate: -1 });

    return promotions;
  }

  /**
   * Get all promotions/transfers/passouts with filters
   */
  async getAllPromotions(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        query['from.institution'] = institutionId;
      }
    } else if (filters.institution) {
      query['from.institution'] = extractInstitutionId(filters.institution);
    }

    // Apply operation type filter
    if (filters.operationType) {
      query.operationType = filters.operationType;
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      query.operationDate = {};
      if (filters.startDate) {
        query.operationDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.operationDate.$lte = new Date(filters.endDate);
      }
    }

    const promotions = await StudentPromotion.find(query)
      .populate('student', 'enrollmentNumber rollNumber')
      .populate('admission', 'applicationNumber')
      .populate('from.institution', 'name code')
      .populate('from.class', 'name code')
      .populate('from.section', 'name code')
      .populate('to.institution', 'name code')
      .populate('to.class', 'name code')
      .populate('to.section', 'name code')
      .populate('performedBy', 'name email')
      .sort({ operationDate: -1 })
      .limit(filters.limit || 100)
      .skip(filters.skip || 0);

    const total = await StudentPromotion.countDocuments(query);

    return {
      data: promotions,
      total,
      page: filters.page || 1,
      limit: filters.limit || 100
    };
  }
}

module.exports = new StudentPromotionService();

