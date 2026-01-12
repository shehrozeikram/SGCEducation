const FeeStructure = require('../models/FeeStructure');
const FeeHead = require('../models/FeeHead');
const Class = require('../models/Class');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Admission = require('../models/Admission');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');
const { generateReceiptNumber } = require('../utils/receiptUtils');

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
   * Get fee structure by class ID
   * Returns all fee structures for a specific class with fee head details
   */
  async getFeeStructureByClass(classId, currentUser) {
    if (!classId) {
      throw new ApiError(400, 'Class ID is required');
    }

    // Verify class exists and check access
    const classDoc = await Class.findById(classId)
      .populate('institution', 'name type code');
    
    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    // Check access for non-super-admin users
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      const classInstitutionId = (classDoc.institution._id || classDoc.institution).toString();
      if (!userInstitutionId || classInstitutionId !== userInstitutionId.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }

    // Get all fee structures for this class
    const feeStructures = await FeeStructure.find({
      class: classId,
      isActive: true
    })
      .populate('feeHead', 'name code priority')
      .sort({ 'feeHead.priority': 1 });

    // Format response
    const formattedStructures = feeStructures.map(fs => ({
      _id: fs._id,
      feeHead: {
        _id: fs.feeHead._id || fs.feeHead,
        name: fs.feeHead.name,
        code: fs.feeHead.code,
        priority: fs.feeHead.priority
      },
      amount: fs.amount || 0
    }));

    return {
      class: {
        _id: classDoc._id,
        name: classDoc.name,
        code: classDoc.code
      },
      feeStructures: formattedStructures
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
   * Supports both global discount (for backward compatibility) and per-fee-head discounts
   */
  async assignFeeStructure(assignmentData, currentUser) {
    const { 
      studentId, 
      classId, 
      discount = 0, 
      discountType = 'amount', 
      discountReason = '',
      feeHeadDiscounts = {} // New: { feeHeadId: { discount, discountType, discountReason } }
    } = assignmentData;

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
      let appliedDiscount = 0;
      let appliedDiscountType = discountType;
      let appliedDiscountReason = discountReason;

      const feeHeadId = (feeStructure.feeHead._id || feeStructure.feeHead).toString();

      // Check if there's a per-fee-head discount
      if (feeHeadDiscounts && feeHeadDiscounts[feeHeadId]) {
        const feeHeadDiscount = feeHeadDiscounts[feeHeadId];
        appliedDiscount = parseFloat(feeHeadDiscount.discount) || 0;
        appliedDiscountType = feeHeadDiscount.discountType || 'amount';
        appliedDiscountReason = feeHeadDiscount.discountReason || discountReason;
      } else if (discount > 0) {
        // Fall back to global discount for backward compatibility
        appliedDiscount = parseFloat(discount) || 0;
        appliedDiscountType = discountType;
        appliedDiscountReason = discountReason;
      }

      // Apply discount
      if (appliedDiscount > 0) {
        if (appliedDiscountType === 'percentage') {
          finalAmount = baseAmount - (baseAmount * appliedDiscount / 100);
        } else {
          finalAmount = baseAmount - appliedDiscount;
        }
        if (finalAmount < 0) {
          finalAmount = 0;
        }
      }

      // Set default due date (20th of current month, or next month if past 20th)
      const now = new Date();
      let dueDate = new Date(now.getFullYear(), now.getMonth(), 20);
      if (now.getDate() > 20) {
        dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 20);
      }

      const studentFee = await StudentFee.create({
        institution: institutionId,
        student: studentId,
        feeStructure: feeStructure._id,
        class: classId,
        feeHead: feeHeadId,
        baseAmount: baseAmount,
        discountAmount: appliedDiscount,
        discountType: appliedDiscountType,
        discountReason: appliedDiscountReason,
        finalAmount: finalAmount,
        paidAmount: 0,
        remainingAmount: finalAmount,
        status: 'pending',
        dueDate: dueDate,
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
    const { institution, academicYear, student } = filters;

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

    // Optional student filter
    if (student) {
      query.student = student;
    }

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

  /**
   * Generate vouchers for students
   * Creates voucher records for all StudentFee records of the selected students
   * Note: studentIds can be either student IDs or admission IDs (frontend sends admission IDs)
   * feeHeadIds (optional): Array of fee head IDs to filter by. If provided, only vouchers for these fee heads will be generated.
   */
  async generateVouchers(voucherData, currentUser) {
    const { studentIds, month, year, feeHeadIds } = voucherData;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new ApiError(400, 'Student IDs are required');
    }

    if (!month || month < 1 || month > 12) {
      throw new ApiError(400, 'Valid month (1-12) is required');
    }

    if (!year || year < 2000) {
      throw new ApiError(400, 'Valid year is required');
    }

    // First, try to find students by ID directly
    let students = await Student.find({
      _id: { $in: studentIds },
      isActive: true
    })
      .populate('institution');

    // If not found, try to find by admission ID
    if (students.length === 0) {
      const Admission = require('../models/Admission');
      const admissions = await Admission.find({
        _id: { $in: studentIds },
        isActive: true
      })
        .populate('studentId');

      const actualStudentIds = admissions
        .filter(adm => adm.studentId)
        .map(adm => adm.studentId._id || adm.studentId);

      if (actualStudentIds.length > 0) {
        students = await Student.find({
          _id: { $in: actualStudentIds },
          isActive: true
        })
          .populate('institution');
      }
    }

    if (students.length === 0) {
      throw new ApiError(404, 'No active students found');
    }

    const actualStudentIds = students.map(s => s._id);

    // Build query for StudentFee records
    const studentFeeQuery = {
      student: { $in: actualStudentIds },
      isActive: true
    };

    // Filter by fee head IDs if provided
    if (feeHeadIds && Array.isArray(feeHeadIds) && feeHeadIds.length > 0) {
      studentFeeQuery.feeHead = { $in: feeHeadIds };
    }

    // Get StudentFee records for these students (optionally filtered by fee heads)
    const studentFeeRecords = await StudentFee.find(studentFeeQuery)
      .populate('feeHead', 'name priority frequencyType');

    if (studentFeeRecords.length === 0) {
      const errorMsg = feeHeadIds && feeHeadIds.length > 0
        ? 'No fee structures found for the selected students and fee heads'
        : 'No fee structures found for the selected students';
      throw new ApiError(400, errorMsg);
    }

    // Get institution ID from the first student (all students should be from same institution)
    const institutionId = students[0]?.institution?._id || students[0]?.institution;
    
    if (!institutionId) {
      throw new ApiError(400, 'Institution ID not found');
    }

    // Count existing vouchers for this institution, month, and year to generate unique sequential number
    const existingVouchersCount = await StudentFee.aggregate([
      {
        $match: {
          institution: institutionId,
          isActive: true
        }
      },
      {
        $unwind: {
          path: '$vouchers',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'vouchers.month': month,
          'vouchers.year': year
        }
      },
      {
        $count: 'total'
      }
    ]);

    let voucherCounter = existingVouchersCount.length > 0 ? existingVouchersCount[0].total : 0;

    // Group StudentFee records by student to ensure same voucher number for all fee heads
    const studentFeesByStudent = new Map();
    for (const studentFee of studentFeeRecords) {
      const studentId = studentFee.student?._id || studentFee.student;
      if (!studentId) continue;
      
      const studentIdStr = studentId.toString();
      if (!studentFeesByStudent.has(studentIdStr)) {
        studentFeesByStudent.set(studentIdStr, []);
      }
      studentFeesByStudent.get(studentIdStr).push(studentFee);
    }

    // Generate vouchers - one voucher number per student per month/year
    const updatedStudentFees = [];
    const errors = [];
    const studentVoucherNumbers = new Map(); // Track voucher numbers per student

    for (const [studentIdStr, studentFees] of studentFeesByStudent.entries()) {
      try {
        // Check if any fee already has a voucher for this month/year
        const hasExistingVoucher = studentFees.some(sf => {
          return sf.vouchers && sf.vouchers.some(
            v => v.month === month && v.year === year
          );
        });

        if (hasExistingVoucher) {
          // Skip if voucher already exists for this student/month/year
          continue;
        }

        // Increment counter for unique voucher number (once per student)
        voucherCounter++;
        
        // Generate unique voucher number: VCH-YYYY-MM-SEQ
        // Format: VCH-2024-01-000001
        const voucherNumber = `VCH-${year}-${String(month).padStart(2, '0')}-${String(voucherCounter).padStart(6, '0')}`;
        
        // Store voucher number for this student
        studentVoucherNumbers.set(studentIdStr, voucherNumber);

        // Add the same voucher number to all fee heads for this student
        for (const studentFee of studentFees) {
          // Add voucher to the array
          if (!studentFee.vouchers) {
            studentFee.vouchers = [];
          }

          studentFee.vouchers.push({
            month: month,
            year: year,
            generatedAt: new Date(),
            generatedBy: currentUser._id,
            voucherNumber: voucherNumber
          });

          await studentFee.save();
          updatedStudentFees.push(studentFee);
        }
      } catch (error) {
        errors.push({
          studentId: studentIdStr,
          error: error.message
        });
      }
    }

    return {
      totalGenerated: updatedStudentFees.length,
      totalErrors: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Record fee payment (supports partial payments)
   * Updates StudentFee paidAmount and status
   */
  async recordPayment(paymentData, currentUser) {
    const { studentFeeId, amount, paymentMethod = 'cash', paymentDate, remarks, chequeNumber, bankName, transactionId } = paymentData;

    if (!studentFeeId || !amount || amount <= 0) {
      throw new ApiError(400, 'Student fee ID and valid payment amount are required');
    }

    // Get the StudentFee record
    const studentFee = await StudentFee.findById(studentFeeId)
      .populate('student')
      .populate('institution');

    if (!studentFee) {
      throw new ApiError(404, 'Student fee not found');
    }

    if (!studentFee.isActive) {
      throw new ApiError(400, 'Student fee is not active');
    }

    // Check if payment exceeds remaining amount
    const remainingAmount = studentFee.finalAmount - (studentFee.paidAmount || 0);
    if (amount > remainingAmount) {
      throw new ApiError(400, `Payment amount (${amount}) exceeds remaining amount (${remainingAmount})`);
    }

    // Generate receipt number atomically using ReceiptCounter
    // This prevents race conditions when multiple payments are created simultaneously
    const FeePayment = require('../models/FeePayment');
    const receiptNumber = await generateReceiptNumber({
      institution: studentFee.institution,
      year: new Date().getFullYear(),
      type: 'RCP'
    });

    // Create FeePayment record
    const feePayment = await FeePayment.create({
      institution: studentFee.institution,
      student: studentFee.student,
      studentFee: studentFeeId,
      receiptNumber: receiptNumber,
      amount: amount,
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod,
      chequeNumber: chequeNumber,
      bankName: bankName,
      transactionId: transactionId,
      remarks: remarks,
      status: 'completed',
      collectedBy: currentUser._id
    });

    // Update StudentFee payment tracking
    const newPaidAmount = (studentFee.paidAmount || 0) + amount;
    studentFee.paidAmount = newPaidAmount;
    studentFee.remainingAmount = Math.max(0, studentFee.finalAmount - newPaidAmount);
    studentFee.lastPaymentDate = paymentDate || new Date();

    // Update status
    if (studentFee.remainingAmount <= 0) {
      studentFee.status = 'paid';
    } else {
      studentFee.status = 'partial';
      // Check if overdue
      if (studentFee.dueDate && new Date() > studentFee.dueDate) {
        studentFee.status = 'overdue';
      }
    }

    await studentFee.save();

    return {
      payment: feePayment,
      studentFee: studentFee,
      remainingAmount: studentFee.remainingAmount
    };
  }

  /**
   * Get outstanding balances for a student
   * Returns all StudentFee records with remaining balance
   */
  async getOutstandingBalances(filters = {}, currentUser) {
    const { institution, studentId, academicYear } = filters;

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
      isActive: true,
      status: { $in: ['pending', 'partial', 'overdue'] },
      remainingAmount: { $gt: 0 }
    };

    if (studentId) {
      query.student = studentId;
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    // Get outstanding fees
    const outstandingFees = await StudentFee.find(query)
      .populate('student', 'enrollmentNumber rollNumber user')
      .populate('feeHead', 'name priority')
      .populate('class', 'name code')
      .sort({ dueDate: 1, createdAt: 1 });

    // Calculate total outstanding
    const totalOutstanding = outstandingFees.reduce((sum, fee) => sum + (fee.remainingAmount || 0), 0);

    return {
      fees: outstandingFees,
      totalOutstanding: totalOutstanding,
      count: outstandingFees.length
    };
  }
}

module.exports = new FeeService();
