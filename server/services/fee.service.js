const FeeStructure = require('../models/FeeStructure');
const FeeHead = require('../models/FeeHead');
const Class = require('../models/Class');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Admission = require('../models/Admission');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');

/**
 * Fee Service - Handles fee-related business logic
 */
class FeeService {
  /**
   * Get fee structure matrix
   * Fee structures are shared globally (same for all institutions)
   * Classes are institution-specific
   */
  async getFeeStructureMatrix(filters = {}, currentUser) {
    const { institution } = filters;

    // Get classes for the specified institution (classes are institution-specific)
    const classQuery = { isActive: true };
    if (currentUser.role !== 'super_admin') {
      const institutionId = getInstitutionId(currentUser);
      if (institutionId) {
        classQuery.institution = institutionId;
      }
    } else if (institution) {
      classQuery.institution = extractInstitutionId(institution);
    }

    // Get all active fee heads (shared globally)
    const feeHeads = await FeeHead.find({ isActive: true })
      .sort({ priority: 1 });

    // Get classes for the institution (without academic year filter)
    const classes = await Class.find(classQuery)
      .populate('institution', 'name type code')
      .sort({ level: 1, name: 1 });

    // Get existing fee structures (shared globally, not filtered by institution or academic year)
    // Only query if we have classes
    const classIds = classes.map(c => c._id);
    const feeStructures = classIds.length > 0 
      ? await FeeStructure.find({
          isActive: true,
          class: { $in: classIds }
        })
          .sort({ updatedAt: -1 }) // Get latest structures first
      : [];

    // Build matrix data structure
    // Use a Map to store the latest fee structure for each class+feeHead combination
    const feeStructureMap = new Map();
    feeStructures.forEach(fs => {
      if (fs.class && fs.feeHead) {
        // Handle both ObjectId references and populated objects
        const classId = (fs.class._id || fs.class).toString();
        const feeHeadId = (fs.feeHead._id || fs.feeHead).toString();
        const key = `${classId}_${feeHeadId}`;
        if (!feeStructureMap.has(key)) {
          feeStructureMap.set(key, fs);
        }
      }
    });

    const matrixData = {};
    classes.forEach(cls => {
      matrixData[cls._id] = {
        fees: {}
      };
      feeHeads.forEach(feeHead => {
        // Get the latest fee structure for this class and fee head
        const key = `${cls._id.toString()}_${feeHead._id.toString()}`;
        const existingStructure = feeStructureMap.get(key);
        matrixData[cls._id].fees[feeHead._id] = existingStructure ? existingStructure.amount : 0;
      });
    });

    return {
      classes: classes,
      feeHeads: feeHeads,
      data: matrixData
    };
  }

  /**
   * Bulk save fee structures
   * Fee structures are shared globally (same for all institutions)
   * Data format: { [classId]: { fees: { [feeHeadId]: amount } } }
   */
  async bulkSaveFeeStructure(feeStructureData, currentUser) {
    const { data, institution } = feeStructureData;
    
    if (!data || typeof data !== 'object') {
      throw new ApiError(400, 'Invalid fee structure data');
    }

    const operations = [];

    // Process each class and its fee heads
    for (const classId in data) {
      const classData = data[classId];
      
      if (!classData.fees || typeof classData.fees !== 'object') {
        continue;
      }

      // Verify class exists
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        continue; // Skip invalid classes
      }

      // Process each fee head for this class
      for (const feeHeadId in classData.fees) {
        const amount = parseFloat(classData.fees[feeHeadId]) || 0;
        
        // Verify fee head exists
        const feeHead = await FeeHead.findById(feeHeadId);
        if (!feeHead) {
          continue; // Skip invalid fee heads
        }

        // Use upsert to create or update
        // Since fee structures are shared globally, we don't filter by institution or academic year
        const filter = {
          class: classId,
          feeHead: feeHeadId
        };

        const update = {
          amount: amount,
          institution: institution || null, // Store for reference but structures are shared
          isActive: true,
          createdBy: currentUser._id,
          updatedAt: new Date()
        };

        operations.push({
          updateOne: {
            filter: filter,
            update: {
              $set: update,
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            upsert: true
          }
        });
      }
    }

    if (operations.length === 0) {
      throw new ApiError(400, 'No valid fee structure data to save');
    }

    // Execute bulk write
    const result = await FeeStructure.bulkWrite(operations);

    return {
      created: result.upsertedCount || 0,
      updated: result.modifiedCount || 0,
      total: operations.length
    };
  }

  /**
   * Get students without fee structure
   * Returns all active students in the institution who don't have any StudentFee records
   */
  async getStudentsWithoutFeeStructure(filters = {}, currentUser) {
    const { institution } = filters;

    // Get institution ID
    let institutionId;
    if (currentUser.role !== 'super_admin') {
      institutionId = getInstitutionId(currentUser);
      if (!institutionId) {
        throw new ApiError(400, 'Institution not found for user');
      }
    } else if (institution) {
      institutionId = extractInstitutionId(institution);
      if (!institutionId) {
        throw new ApiError(400, 'Invalid institution');
      }
    } else {
      throw new ApiError(400, 'Institution is required');
    }

    // Get all active students in the institution
    const students = await Student.find({
      institution: institutionId,
      isActive: true,
      status: 'active'
    })
      .populate('user', 'name email')
      .populate({
        path: 'admission',
        select: 'applicationNumber class section',
        populate: [
          { path: 'class', select: 'name code' },
          { path: 'section', select: 'name code' }
        ]
      })
      .sort({ enrollmentNumber: 1 });

    // Get all student IDs that have fee structures
    const studentsWithFees = await StudentFee.find({
      institution: institutionId,
      isActive: true
    }).distinct('student');

    // Filter out students who have fee structures
    const studentsWithoutFees = students.filter(
      student => !studentsWithFees.some(id => id.toString() === student._id.toString())
    );

    // Format response for frontend
    const formattedStudents = studentsWithoutFees.map(student => {
      const admission = student.admission || {};
      const classDoc = admission.class || {};
      const sectionDoc = admission.section || {};
      
      return {
        _id: student._id,
        enrollmentNumber: student.enrollmentNumber,
        rollNumber: student.rollNumber,
        admissionNumber: admission.applicationNumber || '',
        name: student.user?.name || '',
        class: classDoc.name || '',
        section: sectionDoc.name || student.section || '',
        academicYear: student.academicYear
      };
    });

    return formattedStudents;
  }

  /**
   * Assign fee structure to a student
   * Creates StudentFee records for all fee structures in the selected class
   */
  async assignFeeStructure(assignmentData, currentUser) {
    const { studentId, classId, discount = 0, discountType = 'amount', discountReason = '' } = assignmentData;

    if (!studentId || !classId) {
      throw new ApiError(400, 'Student ID and Class ID are required');
    }

    // Verify student exists and get institution
    const student = await Student.findById(studentId)
      .populate('institution');
    
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    if (!student.isActive || student.status !== 'active') {
      throw new ApiError(400, 'Student is not active');
    }

    const institutionId = student.institution._id || student.institution;

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    // Get all fee structures for this class
    const feeStructures = await FeeStructure.find({
      class: classId,
      isActive: true
    })
      .populate('feeHead');

    if (feeStructures.length === 0) {
      throw new ApiError(400, 'No fee structures found for this class');
    }

    // Check if student already has fees for this class
    const existingStudentFees = await StudentFee.find({
      student: studentId,
      class: classId,
      isActive: true
    });

    if (existingStudentFees.length > 0) {
      throw new ApiError(400, 'Fee structure already assigned for this student and class');
    }

    // Create StudentFee records for each fee structure
    const studentFees = [];
    for (const feeStructure of feeStructures) {
      const baseAmount = feeStructure.amount || 0;
      let finalAmount = baseAmount;

      // Apply discount
      if (discount > 0) {
        if (discountType === 'percentage') {
          finalAmount = baseAmount - (baseAmount * discount / 100);
        } else {
          finalAmount = baseAmount - discount;
        }
        if (finalAmount < 0) {
          finalAmount = 0;
        }
      }

      const studentFee = await StudentFee.create({
        institution: institutionId,
        student: studentId,
        feeStructure: feeStructure._id,
        class: classId,
        feeHead: feeStructure.feeHead._id || feeStructure.feeHead,
        baseAmount: baseAmount,
        discountAmount: discount,
        discountType: discountType,
        discountReason: discountReason,
        finalAmount: finalAmount,
        academicYear: student.academicYear || '',
        isActive: true,
        createdBy: currentUser._id
      });

      studentFees.push(studentFee);
    }

    return {
      totalAssigned: studentFees.length,
      studentFees: studentFees
    };
  }

  /**
   * Get student fees (students with assigned fee structures)
   * Returns all StudentFee records for the institution with proper population
   */
  async getStudentFees(filters = {}, currentUser) {
    const { institution, academicYear } = filters;

    // Get institution ID
    let institutionId;
    if (currentUser.role !== 'super_admin') {
      institutionId = getInstitutionId(currentUser);
      if (!institutionId) {
        throw new ApiError(400, 'Institution not found for user');
      }
    } else if (institution) {
      institutionId = extractInstitutionId(institution);
      if (!institutionId) {
        throw new ApiError(400, 'Invalid institution');
      }
    } else {
      throw new ApiError(400, 'Institution is required');
    }

    // Build query
    const query = {
      institution: institutionId,
      isActive: true
    };

    // Optional academic year filter
    if (academicYear) {
      query.academicYear = academicYear;
    }

    // Get student fees with proper population
    const studentFees = await StudentFee.find(query)
      .populate({
        path: 'student',
        select: 'enrollmentNumber rollNumber status academicYear user admission',
        populate: [
          {
            path: 'user',
            select: 'name email'
          },
          {
            path: 'admission',
            select: 'applicationNumber personalInfo guardianInfo class section',
            populate: [
              {
                path: 'class',
                select: 'name code'
              },
              {
                path: 'section',
                select: 'name code'
              }
            ]
          }
        ]
      })
      .populate({
        path: 'class',
        select: 'name code'
      })
      .populate({
        path: 'feeHead',
        select: 'name priority'
      })
      .sort({ createdAt: -1 });

    return studentFees;
  }
}

module.exports = new FeeService();
