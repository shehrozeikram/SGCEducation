const FeeStructure = require('../models/FeeStructure');
const StudentFee = require('../models/StudentFee');
const FeePayment = require('../models/FeePayment');
const FeeHead = require('../models/FeeHead');
const FeeType = require('../models/FeeType');
const Class = require('../models/Class');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId } = require('../utils/userUtils');

/**
 * Fee Service - Handles fee-related business logic
 */
class FeeService {
  /**
   * Get all fee structures (filtered by user role and institution)
   */
  async getAllFeeStructures(filters = {}, currentUser) {
    const query = { isActive: true };

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      if (currentUser.institution) {
        const institutionId = typeof currentUser.institution === 'object'
          ? currentUser.institution._id
          : currentUser.institution;
        query.institution = institutionId;
      }
    } else if (filters.institution) {
      query.institution = filters.institution;
    }

    // Apply additional filters
    if (filters.academicYear) {
      query.academicYear = filters.academicYear;
    }
    if (filters.class) {
      query.class = filters.class;
    }
    if (filters.feeType) {
      query.feeType = filters.feeType;
    }

    const feeStructures = await FeeStructure.find(query)
      .populate('institution', 'name type code')
      .populate('class', 'name code')
      .populate('feeType', 'name code')
      .populate('createdBy', 'name')
      .sort({ academicYear: -1, 'class.name': 1 });

    return feeStructures;
  }

  /**
   * Get fee structure by ID
   */
  async getFeeStructureById(feeStructureId, currentUser) {
    const feeStructure = await FeeStructure.findById(feeStructureId)
      .populate('institution', 'name type code')
      .populate('class', 'name code')
      .populate('feeType', 'name code')
      .populate('createdBy', 'name');

    if (!feeStructure) {
      throw new ApiError(404, 'Fee structure not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
      const feeStructureInstitutionId = typeof feeStructure.institution === 'object'
        ? feeStructure.institution._id
        : feeStructure.institution;

      if (feeStructureInstitutionId && feeStructureInstitutionId.toString() !== userInstitutionId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    return feeStructure;
  }

  /**
   * Create new fee structure
   */
  async createFeeStructure(feeStructureData, currentUser) {
    feeStructureData.createdBy = currentUser._id;

    // If not super admin, set institution from user
    if (currentUser.role !== 'super_admin' && currentUser.institution) {
      feeStructureData.institution = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
    }

    if (!feeStructureData.institution) {
      throw new ApiError(400, 'Institution is required');
    }

    const feeStructure = await FeeStructure.create(feeStructureData);
    return await FeeStructure.findById(feeStructure._id)
      .populate('institution', 'name type code')
      .populate('class', 'name code')
      .populate('feeType', 'name code')
      .populate('createdBy', 'name');
  }

  /**
   * Update fee structure
   */
  async updateFeeStructure(feeStructureId, feeStructureData, currentUser) {
    const feeStructure = await FeeStructure.findById(feeStructureId);

    if (!feeStructure) {
      throw new ApiError(404, 'Fee structure not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
      const feeStructureInstitutionId = typeof feeStructure.institution === 'object'
        ? feeStructure.institution._id
        : feeStructure.institution;

      if (feeStructureInstitutionId && feeStructureInstitutionId.toString() !== userInstitutionId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    Object.assign(feeStructure, feeStructureData);
    await feeStructure.save();

    return await FeeStructure.findById(feeStructure._id)
      .populate('institution', 'name type code')
      .populate('class', 'name code')
      .populate('feeType', 'name code')
      .populate('createdBy', 'name');
  }

  /**
   * Delete fee structure (soft delete)
   */
  async deleteFeeStructure(feeStructureId, currentUser) {
    const feeStructure = await FeeStructure.findById(feeStructureId);

    if (!feeStructure) {
      throw new ApiError(404, 'Fee structure not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
      const feeStructureInstitutionId = typeof feeStructure.institution === 'object'
        ? feeStructure.institution._id
        : feeStructure.institution;

      if (feeStructureInstitutionId && feeStructureInstitutionId.toString() !== userInstitutionId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    feeStructure.isActive = false;
    await feeStructure.save();

    return feeStructure;
  }

  /**
   * Get fee structure matrix (classes x fee heads)
   * Fee structures are now shared, but we still need institution to get classes
   */
  async getFeeStructureMatrix(filters = {}, currentUser) {
    let institutionId = filters.institution;
    
    // If no institution in filters, get from user (for non-super-admin)
    if (!institutionId) {
      if (currentUser.role !== 'super_admin') {
        if (currentUser.institution) {
          institutionId = typeof currentUser.institution === 'object' 
            ? currentUser.institution._id 
            : currentUser.institution;
        }
      }
    }

    if (!institutionId) {
      throw new ApiError(400, 'Institution is required to get classes');
    }

    // Get all classes for the institution (classes are still institution-specific)
    const classes = await Class.find({ 
      institution: institutionId, 
      isActive: true 
    });

    // Custom sort function to match the expected order:
    // Pre-school classes first, then numbered classes (One, Two, etc.), then numbered with suffix (5th, 6th, etc.)
    const classOrder = (className) => {
      const name = (className || '').toLowerCase().trim();
      
      // Pre-school classes (highest priority)
      if (name.includes('play group') || name === 'playgroup') return 1;
      if (name.includes('advance montessori') || name.includes('advanced montessori')) return 2;
      if (name.includes('core montessori') || name.includes('cor.mon') || name.includes('cormon') || name.includes('cor mon') || name.includes('core montessory')) return 3;
      
      // Numbered classes in word form
      const wordNumbers = {
        'one': 10,
        'two': 11,
        'three': 12,
        'four': 13,
        'five': 14,
        'six': 15,
        'seven': 16,
        'eight': 17,
        'nine': 18,
        'ten': 19
      };
      
      for (const [word, order] of Object.entries(wordNumbers)) {
        if (name === word || name.startsWith(word + ' ') || name.endsWith(' ' + word)) {
          return order;
        }
      }
      
      // Numbered classes with suffix (5th, 6th, etc.)
      const numberMatch = name.match(/^(\d+)(th|st|nd|rd)?/);
      if (numberMatch) {
        const num = parseInt(numberMatch[1]);
        return 20 + num; // Start from 20 to come after word numbers
      }
      
      // Extract number from name if it contains digits
      const anyNumberMatch = name.match(/(\d+)/);
      if (anyNumberMatch) {
        const num = parseInt(anyNumberMatch[1]);
        return 20 + num;
      }
      
      // Default: sort alphabetically after numbered classes
      return 1000;
    };

    // Sort classes using custom order
    classes.sort((a, b) => {
      const orderA = classOrder(a.name);
      const orderB = classOrder(b.name);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same order, sort alphabetically
      return (a.name || '').localeCompare(b.name || '');
    });

    // Get all fee heads (shared - get all regardless of institution)
    // Since fee heads are now shared, we get all active fee heads
    const feeHeads = await FeeHead.find({ 
      isActive: true 
    }).sort({ priority: 1 });

    // Get all fee types (shared - get all regardless of institution)
    // Since fee types are shared, we get all active fee types
    const feeTypes = await FeeType.find({ 
      isActive: true 
    }).sort({ name: 1 });

    // Create a mapping from fee head name to fee type (assuming they match by name)
    const feeHeadToFeeTypeMap = {};
    feeTypes.forEach(feeType => {
      // Try to find matching fee head by name
      const matchingFeeHead = feeHeads.find(head => 
        head.name.toLowerCase() === feeType.name.toLowerCase()
      );
      if (matchingFeeHead) {
        feeHeadToFeeTypeMap[matchingFeeHead._id.toString()] = feeType._id.toString();
      }
    });

    // Get existing fee structures for the institution
    const query = { 
      institution: institutionId, 
      isActive: true 
    };
    if (filters.academicYear) {
      query.academicYear = filters.academicYear;
    }

    const feeStructures = await FeeStructure.find(query)
      .populate('class', 'name')
      .populate('feeType', 'name code');

    // Build matrix using fee heads as columns
    const matrix = {
      classes: classes.map(cls => ({
        _id: cls._id,
        name: cls.name,
        code: cls.code
      })),
      feeHeads: feeHeads.map(head => ({
        _id: head._id,
        name: head.name,
        priority: head.priority
      })),
      data: {}
    };

    // Initialize matrix with zeros
    classes.forEach(cls => {
      matrix.data[cls._id] = {
        class: cls._id,
        fees: {}
      };
      feeHeads.forEach(head => {
        matrix.data[cls._id].fees[head._id] = 0;
      });
    });

    // Fill in existing fee structures
    // Map feeType IDs to feeHead IDs
    feeStructures.forEach(structure => {
      const classId = structure.class?._id || structure.class;
      const feeTypeId = structure.feeType?._id || structure.feeType;
      
      if (classId && feeTypeId && matrix.data[classId]) {
        // Find the fee head that corresponds to this fee type
        const feeHeadId = Object.keys(feeHeadToFeeTypeMap).find(
          headId => feeHeadToFeeTypeMap[headId] === feeTypeId.toString()
        );
        
        if (feeHeadId && matrix.data[classId].fees[feeHeadId] !== undefined) {
          matrix.data[classId].fees[feeHeadId] = structure.amount || 0;
        }
      }
    });

    return matrix;
  }

  /**
   * Bulk save fee structure matrix
   * Fee structures are institution-specific
   */
  async bulkSaveFeeStructureMatrix(matrixData, currentUser) {
    const { institution, academicYear, data } = matrixData;

    if (!institution || !academicYear || !data) {
      throw new ApiError(400, 'Institution, academic year, and data are required');
    }

    const institutionId = typeof institution === 'object' ? institution._id : institution;

    // Verify access
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = typeof currentUser.institution === 'object'
        ? currentUser.institution._id
        : currentUser.institution;
      if (institutionId.toString() !== userInstitutionId?.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    // Process each class
    for (const classId in data) {
      const classData = data[classId];
      if (!classData.fees) continue;

      // Get fee heads and fee types (shared - get all regardless of institution)
      const feeHeads = await FeeHead.find({ 
        isActive: true 
      });
      const feeTypes = await FeeType.find({ 
        isActive: true 
      });

      // Create mapping from fee head to fee type
      const feeHeadToFeeTypeMap = {};
      feeTypes.forEach(feeType => {
        const matchingFeeHead = feeHeads.find(head => 
          head.name.toLowerCase() === feeType.name.toLowerCase()
        );
        if (matchingFeeHead) {
          feeHeadToFeeTypeMap[matchingFeeHead._id.toString()] = feeType._id.toString();
        }
      });

      for (const feeHeadId in classData.fees) {
        const amount = parseFloat(classData.fees[feeHeadId]) || 0;
        
        // Convert fee head ID to fee type ID
        let feeTypeId = feeHeadToFeeTypeMap[feeHeadId];
        
        // If no matching fee type found, create one automatically
        if (!feeTypeId) {
          const feeHead = feeHeads.find(h => h._id.toString() === feeHeadId);
          if (!feeHead) {
            // Skip if fee head not found
            continue;
          }

          // Create a new fee type for this fee head
          try {
            // First check if a fee type with this name already exists (case-insensitive)
            let existingFeeType = await FeeType.findOne({ 
              name: { $regex: new RegExp(`^${feeHead.name}$`, 'i') },
              isActive: true 
            });

            if (!existingFeeType) {
              // Generate a code from the name (uppercase, replace spaces with underscores, limit length)
              let feeTypeCode = feeHead.name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').substring(0, 20);
              
              // Ensure code is not empty
              if (!feeTypeCode || feeTypeCode.length === 0) {
                feeTypeCode = `FEE_${feeHead._id.toString().substring(0, 10)}`;
              }
              
              // Check if code already exists, if so, append a number
              let finalCode = feeTypeCode;
              let counter = 1;
              while (await FeeType.findOne({ code: finalCode, isActive: true })) {
                finalCode = `${feeTypeCode}_${counter}`;
                counter++;
                if (counter > 100) break; // Safety limit
              }
              
              // Create new fee type
              existingFeeType = await FeeType.create({
                name: feeHead.name,
                code: finalCode,
                amount: 0,
                institution: null, // Shared fee type
                isActive: true,
                createdBy: currentUser._id
              });
            }

            feeTypeId = existingFeeType._id.toString();
            // Add to map for future use in this loop
            feeHeadToFeeTypeMap[feeHeadId] = feeTypeId;
          } catch (error) {
            results.errors.push({
              class: classId,
              feeHead: feeHeadId,
              error: `Failed to create fee type: ${error.message}`
            });
            continue;
          }
        }

        try {
          // Check if fee structure already exists for this institution
          const existing = await FeeStructure.findOne({
            institution: institutionId,
            academicYear,
            class: classId,
            feeType: feeTypeId,
            isActive: true
          });

          if (existing) {
            // Update existing
            existing.amount = amount;
            await existing.save();
            results.updated++;
          } else if (amount > 0) {
            // Create new only if amount > 0
            await FeeStructure.create({
              institution: institutionId,
              academicYear,
              class: classId,
              feeType: feeTypeId,
              amount,
              dueDate: new Date(),
              frequency: 'monthly',
              createdBy: currentUser._id
            });
            results.created++;
          }
        } catch (error) {
          results.errors.push({
            class: classId,
            feeType: feeTypeId,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Generate student fees from fee structure
   */
  async generateStudentFees(generationData, currentUser) {
    // This is a placeholder - implement based on your requirements
    throw new ApiError(501, 'Not implemented yet');
  }

  /**
   * Get student fees
   */
  async getStudentFees(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter
    if (currentUser.role !== 'super_admin') {
      if (currentUser.institution) {
        const institutionId = typeof currentUser.institution === 'object'
          ? currentUser.institution._id
          : currentUser.institution;
        query.institution = institutionId;
      }
    } else if (filters.institution) {
      query.institution = filters.institution;
    }

    // Apply additional filters
    if (filters.student) query.student = filters.student;
    if (filters.class) query.class = filters.class;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.status) query.status = filters.status;
    if (filters.feeType) query.feeType = filters.feeType;

    const studentFees = await StudentFee.find(query)
      .populate({
        path: 'student',
        select: 'enrollmentNumber rollNumber program section status',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .populate({
        path: 'admission',
        select: 'applicationNumber personalInfo guardianInfo class section status',
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
      })
      .populate('class', 'name code')
      .populate('feeType', 'name code')
      .populate('feeStructure', 'amount frequency')
      .sort({ dueDate: 1 });

    return studentFees;
  }

  /**
   * Get student fee by ID
   */
  async getStudentFeeById(studentFeeId, currentUser) {
    const studentFee = await StudentFee.findById(studentFeeId)
      .populate('student', 'name rollNumber admissionNo')
      .populate('admission', 'admissionNo')
      .populate('class', 'name code')
      .populate('feeType', 'name code')
      .populate('feeStructure', 'amount frequency')
      .populate('createdBy', 'name');

    if (!studentFee) {
      throw new ApiError(404, 'Student fee not found');
    }

    return studentFee;
  }

  /**
   * Create fee payment
   */
  async createFeePayment(paymentData, currentUser) {
    // This is a placeholder - implement based on your requirements
    throw new ApiError(501, 'Not implemented yet');
  }

  /**
   * Get fee payments
   */
  async getFeePayments(filters = {}, currentUser) {
    // This is a placeholder - implement based on your requirements
    throw new ApiError(501, 'Not implemented yet');
  }

  /**
   * Get fee statistics
   */
  async getFeeStatistics(filters = {}, currentUser) {
    // This is a placeholder - implement based on your requirements
    throw new ApiError(501, 'Not implemented yet');
  }

  /**
   * Generate vouchers for selected students
   */
  async generateVouchers(voucherData, currentUser) {
    const { studentIds, month, year } = voucherData;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new ApiError(400, 'Please provide at least one student ID');
    }

    if (!month || !year) {
      throw new ApiError(400, 'Please provide month and year');
    }

    const institutionId = getInstitutionId(currentUser);
    if (!institutionId && currentUser.role !== 'super_admin') {
      throw new ApiError(403, 'Institution access required');
    }

    const results = {
      success: [],
      failed: []
    };

    // Get students from studentIds (these could be admission IDs or student IDs)
    // First, try to find students by their studentId field in StudentFee
    const studentFeeQuery = {
      institution: institutionId,
      isActive: true
    };

    // Try to match by student ID or admission ID
    const studentFees = await StudentFee.find(studentFeeQuery)
      .populate('student', 'enrollmentNumber rollNumber')
      .populate('admission', 'applicationNumber personalInfo rollNumber');

    // Group student fees by student
    const studentFeesMap = new Map();
    studentFees.forEach(sf => {
      const studentId = sf.student?._id || sf.student;
      const admissionId = sf.admission?._id || sf.admission;
      
      if (studentId) {
        if (!studentFeesMap.has(studentId.toString())) {
          studentFeesMap.set(studentId.toString(), []);
        }
        studentFeesMap.get(studentId.toString()).push(sf);
      }
      
      // Also index by admission ID
      if (admissionId && studentIds.includes(admissionId.toString())) {
        if (!studentFeesMap.has(admissionId.toString())) {
          studentFeesMap.set(admissionId.toString(), []);
        }
        studentFeesMap.get(admissionId.toString()).push(sf);
      }
    });

    // Process each student ID
    for (const studentId of studentIds) {
      try {
        // Find student fees for this student (could be by student ID or admission ID)
        const fees = studentFeesMap.get(studentId.toString()) || [];
        
        if (fees.length === 0) {
          // Try to find by admission ID
          const admission = await Admission.findById(studentId);
          if (admission && admission.studentId) {
            const studentFeesForStudent = await StudentFee.find({
              student: admission.studentId,
              institution: institutionId,
              isActive: true
            });
            fees.push(...studentFeesForStudent);
          }
        }

        if (fees.length === 0) {
          results.failed.push({
            studentId: studentId,
            error: 'No fee structures found for this student'
          });
          continue;
        }

        // Mark vouchers as generated for all fee structures of this student
        let voucherGenerated = false;
        for (const fee of fees) {
          // Check if voucher already exists for this month/year
          const voucherExists = fee.vouchers && fee.vouchers.some(
            v => v.month === parseInt(month) && v.year === parseInt(year)
          );

          if (!voucherExists) {
            // Add voucher record
            if (!fee.vouchers) {
              fee.vouchers = [];
            }
            fee.vouchers.push({
              month: parseInt(month),
              year: parseInt(year),
              generatedAt: new Date(),
              generatedBy: currentUser._id
            });
            await fee.save();
            voucherGenerated = true;
          }
        }

        if (voucherGenerated) {
          const firstFee = fees[0];
          const student = firstFee.student;
          const admission = firstFee.admission;
          
          results.success.push({
            studentId: studentId,
            name: admission?.personalInfo?.name || student?.user?.name || 'N/A',
            rollNumber: student?.rollNumber || admission?.rollNumber || 'N/A',
            admissionNo: admission?.applicationNumber || 'N/A',
            month,
            year,
            generatedAt: new Date()
          });
        } else {
          results.success.push({
            studentId: studentId,
            message: 'Voucher already generated for this month/year'
          });
        }
      } catch (error) {
        results.failed.push({
          studentId: studentId,
          error: error.message
        });
      }
    }

    return {
      total: studentIds.length,
      success: results.success.length,
      failed: results.failed.length,
      details: results
    };
  }

  /**
   * Get students without fee structure assigned
   */
  async getStudentsWithoutFeeStructure(filters = {}, currentUser) {
    const query = { isActive: true, status: 'active' };

    // Apply institution filter
    if (currentUser.role !== 'super_admin') {
      if (currentUser.institution) {
        const institutionId = typeof currentUser.institution === 'object'
          ? currentUser.institution._id
          : currentUser.institution;
        query.institution = institutionId;
      }
    } else if (filters.institution) {
      query.institution = filters.institution;
    }

    // Apply additional filters
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.class) query.program = filters.class;

    // Get all active students
    const allStudents = await Student.find(query)
      .populate('user', 'name email')
      .populate('admission', 'applicationNumber class section')
      .populate('institution', 'name')
      .sort({ createdAt: -1 });

    // Get all students who have fee structures assigned
    const academicYear = filters.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const studentsWithFeeStructure = await StudentFee.find({
      academicYear,
      isActive: true
    }).distinct('student');

    // Filter out students who already have fee structures
    const studentsWithoutFeeStructure = allStudents.filter(
      student => !studentsWithFeeStructure.some(
        studentId => studentId.toString() === student._id.toString()
      )
    );

    // Format the response
    return studentsWithoutFeeStructure.map(student => {
      // Get student name from user or admission
      let studentName = 'N/A';
      if (student.user?.name) {
        studentName = student.user.name;
      } else if (student.admission?.personalInfo?.name) {
        studentName = student.admission.personalInfo.name;
      }

      return {
        _id: student._id,
        name: studentName,
        enrollmentNumber: student.enrollmentNumber || 'N/A',
        rollNumber: student.rollNumber || 'N/A',
        admissionNumber: student.admission?.applicationNumber || 'N/A',
        class: student.program || student.admission?.class?.name || 'N/A',
        section: student.section || student.admission?.section?.name || 'N/A',
        academicYear: student.academicYear || 'N/A',
        institution: student.institution?.name || 'N/A',
        admission: student.admission?._id || null
      };
    });
  }

  /**
   * Assign fee structure to a student (by class - assigns all fee structures for the class)
   */
  async assignFeeStructureToStudent(assignmentData, currentUser) {
    const { studentId, classId, academicYear, discount = 0, discountType = 'amount', discountReason = '' } = assignmentData;

    if (!studentId || !classId || !academicYear) {
      throw new ApiError(400, 'Please provide student ID, class ID, and academic year');
    }

    // Get student
    const student = await Student.findById(studentId)
      .populate('admission')
      .populate('institution');

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    // Get student's institution ID
    const studentInstitutionId = typeof student.institution === 'object'
      ? student.institution._id
      : student.institution;

    // Check if student already has fee structure assigned for this academic year
    const existingStudentFee = await StudentFee.findOne({
      student: studentId,
      academicYear,
      isActive: true
    });

    if (existingStudentFee) {
      throw new ApiError(400, 'Student already has a fee structure assigned for this academic year');
    }

    // Get all fee structures for the selected class, institution, and academic year
    const feeStructures = await FeeStructure.find({
      institution: studentInstitutionId,
      class: classId,
      academicYear,
      isActive: true
    })
      .populate('class', 'name code')
      .populate('feeType', 'name code');

    if (!feeStructures || feeStructures.length === 0) {
      throw new ApiError(404, `No fee structures found for the selected class in academic year ${academicYear}`);
    }

    // Get student's class from admission or use the selected class
    const studentClass = student.admission?.class || classId;

    // Create student fee records for all fee structures
    const createdStudentFees = [];
    const errors = [];

    for (const feeStructure of feeStructures) {
      try {
        // Calculate final amount after discount
        let finalAmount = feeStructure.amount;
        if (discount > 0) {
          if (discountType === 'percentage') {
            finalAmount = feeStructure.amount - (feeStructure.amount * discount / 100);
          } else {
            // For amount discount, distribute it proportionally across all fee structures
            // Calculate total amount first
            const totalAmount = feeStructures.reduce((sum, fs) => sum + fs.amount, 0);
            const discountPerStructure = (discount / totalAmount) * feeStructure.amount;
            finalAmount = Math.max(0, feeStructure.amount - discountPerStructure);
          }
        }

        // Create student fee record
        const studentFee = await StudentFee.create({
          institution: studentInstitutionId,
          student: studentId,
          admission: student.admission?._id || null,
          feeStructure: feeStructure._id,
          academicYear,
          class: studentClass,
          feeType: feeStructure.feeType,
          amount: feeStructure.amount,
          discount: discountType === 'percentage' ? discount : (discount / feeStructures.length),
          discountType,
          discountReason,
          finalAmount,
          paidAmount: 0,
          dueAmount: finalAmount,
          dueDate: feeStructure.dueDate,
          status: 'pending',
          createdBy: currentUser._id
        });

        const populatedStudentFee = await StudentFee.findById(studentFee._id)
          .populate('student', 'enrollmentNumber rollNumber')
          .populate('admission', 'applicationNumber')
          .populate('class', 'name code')
          .populate('feeType', 'name code')
          .populate('feeStructure', 'amount frequency');

        createdStudentFees.push(populatedStudentFee);
      } catch (error) {
        errors.push({
          feeStructure: feeStructure._id,
          feeType: feeStructure.feeType?.name || 'N/A',
          error: error.message
        });
      }
    }

    if (createdStudentFees.length === 0) {
      throw new ApiError(500, 'Failed to assign any fee structures. ' + (errors.length > 0 ? errors[0].error : ''));
    }

    return {
      studentFees: createdStudentFees,
      totalAssigned: createdStudentFees.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

module.exports = new FeeService();
