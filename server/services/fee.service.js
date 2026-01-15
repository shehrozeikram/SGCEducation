const FeeStructure = require('../models/FeeStructure');
const FeeHead = require('../models/FeeHead');
const Class = require('../models/Class');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Admission = require('../models/Admission');
const FeePayment = require('../models/FeePayment');
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
        // Group fees by FeeHead to ensure we process each head logic correctly
        const feesByHead = new Map();
        for (const fee of studentFees) {
          const headId = fee.feeHead?._id.toString();
          if (!headId) continue;
          if (!feesByHead.has(headId)) {
            feesByHead.set(headId, []);
          }
          feesByHead.get(headId).push(fee);
        }

        // Check if ANY fee has a voucher for this month/year (Global Check for Student)
        // However, we should be fine processing per head, but if we want to determine 
        // if we should generate a NEW voucher number or reusing one...
        // The voucherNumber is generated once per student loop iteration.
        
        // We do a preliminary check: does ANY of the selected fee heads already have a voucher?
        // If the user selected "Tuition", and "Tuition" has a voucher, we skip "Tuition".
        // But if "Transport" doesn't, we might generate for "Transport".
        // BUT, the system design seems to assume ONE voucher number for the month for the student.
        // If we generate for Transport, do we reuse the Tuition voucher number?
        // Or generate a new one?
        // We will assume we generate a NEW voucher number if we are doing work.
        // But we should verify if we should SKIP the whole student if ALL selected heads are done.
        
        let hasWorkToDo = false;
        
        // Analyze if we have work
        for (const [headId, fees] of feesByHead.entries()) {
           const hasVoucher = fees.some(f => f.vouchers && f.vouchers.some(v => v.month === month && v.year === year));
           if (!hasVoucher) {
             hasWorkToDo = true;
             break;
           }
        }
        
        if (!hasWorkToDo) continue;

        // Increment counter for unique voucher number (once per student)
        voucherCounter++;
        
        // Generate unique voucher number: VCH-YYYY-MM-SEQ
        const voucherNumber = `VCH-${year}-${String(month).padStart(2, '0')}-${String(voucherCounter).padStart(6, '0')}`;
        studentVoucherNumbers.set(studentIdStr, voucherNumber);

        // Process each Fee Head Group
        for (const [headId, fees] of feesByHead.entries()) {
          // Sort fees by date descending (latest first) to use best template
          fees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          const latestFee = fees[0];
          const isMonthly = latestFee.feeHead?.frequencyType === 'Monthly Fee/Annual Fee';
          
          // Check if this head already has voucher
          const existingVoucherFee = fees.find(f => f.vouchers && f.vouchers.some(v => v.month === month && v.year === year));
          
          if (existingVoucherFee) {
            // Already has voucher, do nothing (or we could reprint? but we are generating)
            continue; 
          }

          if (isMonthly) {
             // For Monthly, we create ONE new record for the month.
             // We use the latest active fee as a template.
             // Even if we have 10 history records, we only create 1 new one.

             // Logic: Always create NEW for monthly, unless we want to reuse a "Virgin" pending one?
             // If latestFee is "Virgin" (no vouchers, pending), usage is debatable.
             // But consistent approach: If it has vouchers or is paid/partial -> Create New.
             // If it has NO vouchers and is pending -> Reuse it.
             
             const isUsed = (latestFee.vouchers && latestFee.vouchers.length > 0) || 
                            latestFee.status === 'paid' || 
                            latestFee.paidAmount > 0;
                            
             let feeToUpdate = latestFee;
             
             if (isUsed) {
                const newDueDate = new Date(year, month - 1, 20);
                feeToUpdate = new StudentFee({
                  institution: latestFee.institution,
                  student: latestFee.student,
                  feeStructure: latestFee.feeStructure,
                  class: latestFee.class,
                  feeHead: latestFee.feeHead,
                  baseAmount: latestFee.baseAmount,
                  discountAmount: latestFee.discountAmount,
                  discountType: latestFee.discountType,
                  discountReason: latestFee.discountReason,
                  finalAmount: latestFee.finalAmount,
                  paidAmount: 0,
                  remainingAmount: latestFee.finalAmount,
                  status: 'pending',
                  dueDate: newDueDate,
                  academicYear: latestFee.academicYear,
                  isActive: true,
                  createdBy: currentUser._id,
                  vouchers: []
                });
             }
             
             if (!feeToUpdate.vouchers) feeToUpdate.vouchers = [];
             feeToUpdate.vouchers.push({
               month, year, generatedAt: new Date(), generatedBy: currentUser._id, voucherNumber
             });
             
             await feeToUpdate.save();
             updatedStudentFees.push(feeToUpdate);

          } else {
             // For Non-Monthly (One-Time), we attach voucher to ALL applicable fees?
             // Or just the latest?
             // Usually One-Time fees are single instances.
             // If we have multiples (e.g. 2 Paper Charges), we probably want to bill both?
             // So we iterate ALL.
             
             for (const fee of fees) {
               if (!fee.vouchers) fee.vouchers = [];
               fee.vouchers.push({
                 month, year, generatedAt: new Date(), generatedBy: currentUser._id, voucherNumber
               });
               await fee.save();
               updatedStudentFees.push(fee);
             }
          }
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
    
    // Retry logic for duplicate receipt numbers (handles race conditions)
    let feePayment;
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      try {
        const receiptNumber = await generateReceiptNumber({
          institution: studentFee.institution,
          year: new Date().getFullYear(),
          type: 'RCP'
        });

        // Create FeePayment record with receiptNumber explicitly set
        // This prevents the pre-save hook from generating another one
        feePayment = await FeePayment.create({
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
        
        // Success - break out of retry loop
        break;
      } catch (error) {
        // Check if it's a duplicate key error for receiptNumber
        if (error.code === 11000 && error.keyPattern && error.keyPattern.receiptNumber) {
          retries++;
          if (retries >= maxRetries) {
            throw new ApiError(500, 'Failed to generate unique receipt number after multiple attempts. Please try again.');
          }
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 50 * retries));
          continue;
        }
        // If it's not a duplicate key error, throw it immediately
        throw error;
      }
    }

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

  /**
   * Get fee payments/receipts with filters
   * Returns all payments matching the search criteria
   */
  async getPayments(filters = {}, currentUser) {
    // Get institution ID
    let institutionId;
    if (currentUser.role !== 'super_admin') {
      institutionId = getInstitutionId(currentUser);
      if (!institutionId) {
        throw new ApiError(400, 'Institution not found for user');
      }
    } else if (filters.institution) {
      institutionId = extractInstitutionId(filters.institution);
      if (!institutionId) {
        throw new ApiError(400, 'Invalid institution');
      }
    } else {
      throw new ApiError(400, 'Institution is required');
    }

    // Build query
    const query = {
      institution: institutionId
    };

    // Filter by receipt number
    if (filters.receiptNumber) {
      query.receiptNumber = { $regex: filters.receiptNumber, $options: 'i' };
    }

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      query.paymentDate = {};
      if (filters.startDate) {
        query.paymentDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = endDate;
      }
    }

    // Filter by student ID, roll number, or name
    if (filters.studentId || filters.rollNumber || filters.studentName) {
      let studentIds = [];

      // Search in Student collection
      const studentQuery = { institution: institutionId };
      const studentOrConditions = [];
      
      if (filters.studentId) {
        studentOrConditions.push(
          { enrollmentNumber: { $regex: filters.studentId, $options: 'i' } }
        );
        // Also try to match as ObjectId if it's a valid ObjectId
        try {
          const mongoose = require('mongoose');
          if (mongoose.Types.ObjectId.isValid(filters.studentId)) {
            studentOrConditions.push({ _id: filters.studentId });
          }
        } catch (e) {
          // Ignore if not a valid ObjectId
        }
      }
      
      if (filters.rollNumber) {
        studentOrConditions.push({ rollNumber: { $regex: filters.rollNumber, $options: 'i' } });
      }

      if (studentOrConditions.length > 0) {
        studentQuery.$or = studentOrConditions;
        const students = await Student.find(studentQuery).select('_id');
        studentIds.push(...students.map(s => s._id));
      }

      // Search in Student collection for student name (if Student model has name field)
      if (filters.studentName) {
        const studentNameQuery = {
          institution: institutionId,
          name: { $regex: filters.studentName, $options: 'i' }
        };
        const studentsByName = await Student.find(studentNameQuery).select('_id');
        studentIds.push(...studentsByName.map(s => s._id));
      }

      // Search in Admission collection (for student name and roll number)
      if (filters.studentName || filters.rollNumber) {
        const admissionQuery = { institution: institutionId };
        
        if (filters.studentName) {
          admissionQuery['personalInfo.name'] = { $regex: filters.studentName, $options: 'i' };
        }
        if (filters.rollNumber) {
          admissionQuery.rollNumber = { $regex: filters.rollNumber, $options: 'i' };
        }
        
        const admissions = await Admission.find(admissionQuery).select('studentId');
        const admissionStudentIds = admissions
          .map(a => {
            // Handle both populated and unpopulated studentId
            if (a.studentId) {
              return typeof a.studentId === 'object' ? a.studentId._id : a.studentId;
            }
            return null;
          })
          .filter(id => id);
        studentIds.push(...admissionStudentIds);
      }

      // Remove duplicates (keep as ObjectIds)
      const uniqueStudentIds = [];
      const seenIds = new Set();
      for (const id of studentIds) {
        const idStr = id.toString();
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          uniqueStudentIds.push(id);
        }
      }

      if (uniqueStudentIds.length > 0) {
        query.student = { $in: uniqueStudentIds };
      } else {
        // No matching students found, return empty array
        return [];
      }
    }

    // Fetch payments with populated student and collectedBy
    const payments = await FeePayment.find(query)
      .populate({
        path: 'student',
        select: 'enrollmentNumber rollNumber name',
        populate: {
          path: 'admission',
          select: 'personalInfo rollNumber class section applicationNumber',
          populate: [
            {
              path: 'class',
              select: 'name'
            },
            {
              path: 'section',
              select: 'name'
            }
          ]
        }
      })
      .populate('collectedBy', 'name')
      .populate({
        path: 'studentFee',
        select: 'feeHead vouchers'
      })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    // Add voucher number to each payment based on payment date
    // We need to check all StudentFee records for the student, not just the one linked to payment
    const studentIds = [...new Set(payments.map(p => {
      const studentId = p.student?._id || p.student;
      return studentId ? studentId.toString() : null;
    }).filter(Boolean))];
    
    const allStudentFees = studentIds.length > 0 ? await StudentFee.find({
      student: { $in: studentIds },
      institution: institutionId
    }).select('student vouchers').lean() : [];

    // Group student fees by student ID
    const studentFeesByStudent = new Map();
    for (const studentFee of allStudentFees) {
      const studentId = studentFee.student?.toString() || studentFee.student?.toString();
      if (!studentId) continue;
      
      if (!studentFeesByStudent.has(studentId)) {
        studentFeesByStudent.set(studentId, []);
      }
      studentFeesByStudent.get(studentId).push(studentFee);
    }

    const paymentsWithVoucher = payments.map(payment => {
      let voucherNumber = null;
      
      if (payment.paymentDate) {
        const paymentDate = new Date(payment.paymentDate);
        const paymentMonth = paymentDate.getMonth() + 1; // 1-12
        const paymentYear = paymentDate.getFullYear();
        
        const studentId = payment.student?._id?.toString() || payment.student?.toString();
        
        // First, try to find voucher in the linked StudentFee
        if (payment.studentFee && payment.studentFee.vouchers) {
          const matchingVoucher = payment.studentFee.vouchers.find(
            v => v.month === paymentMonth && v.year === paymentYear
          );
          if (matchingVoucher && matchingVoucher.voucherNumber) {
            voucherNumber = matchingVoucher.voucherNumber;
          }
        }
        
        // If not found, check all StudentFee records for this student
        if (!voucherNumber && studentId && studentFeesByStudent.has(studentId)) {
          const studentFees = studentFeesByStudent.get(studentId);
          for (const studentFee of studentFees) {
            if (studentFee.vouchers && studentFee.vouchers.length > 0) {
              const matchingVoucher = studentFee.vouchers.find(
                v => v.month === paymentMonth && v.year === paymentYear
              );
              if (matchingVoucher && matchingVoucher.voucherNumber) {
                voucherNumber = matchingVoucher.voucherNumber;
                break; // Found it, no need to check further
              }
            }
          }
        }
      }
      
      return {
        ...payment,
        voucherNumber: voucherNumber
      };
    });

    return paymentsWithVoucher;
  }

  /**
   * Delete voucher for a student and reverse associated payments
   * Removes voucher entries from StudentFee records for the specified month/year
   * Reverses any payments made for this voucher
   */
  async deleteVoucher(voucherData, currentUser) {
    const { studentId, month, year } = voucherData;

    if (!studentId) {
      throw new ApiError(400, 'Student ID is required');
    }

    if (!month || month < 1 || month > 12) {
      throw new ApiError(400, 'Valid month (1-12) is required');
    }

    if (!year || year < 2000) {
      throw new ApiError(400, 'Valid year is required');
    }

    // Find the student
    let student = await Student.findById(studentId);
    
    // If not found by student ID, try to find by admission ID
    if (!student) {
      const Admission = require('../models/Admission');
      const admission = await Admission.findById(studentId).populate('studentId');
      if (admission && admission.studentId) {
        student = admission.studentId;
      }
    }

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    const actualStudentId = student._id;

    // Get all StudentFee records for this student that have vouchers for the specified month/year
    const studentFeeRecords = await StudentFee.find({
      student: actualStudentId,
      isActive: true
    });

    if (studentFeeRecords.length === 0) {
      throw new ApiError(404, 'No fee records found for this student');
    }

    // Filter to find fees with vouchers for the specified month/year
    const feesWithVoucher = studentFeeRecords.filter(sf => {
      if (!sf.vouchers || !Array.isArray(sf.vouchers)) return false;
      return sf.vouchers.some(v => 
        v && 
        Number(v.month) === Number(month) && 
        Number(v.year) === Number(year)
      );
    });

    if (feesWithVoucher.length === 0) {
      throw new ApiError(404, 'No voucher found for the specified month/year');
    }

    // Get the voucher generation date (use the earliest one if multiple)
    let voucherGeneratedDate = null;
    for (const fee of feesWithVoucher) {
      if (fee.vouchers && Array.isArray(fee.vouchers)) {
        const voucher = fee.vouchers.find(v => 
          v && 
          Number(v.month) === Number(month) && 
          Number(v.year) === Number(year)
        );
        if (voucher && voucher.generatedAt) {
          const generatedDate = new Date(voucher.generatedAt);
          if (!voucherGeneratedDate || generatedDate < voucherGeneratedDate) {
            voucherGeneratedDate = generatedDate;
          }
        }
      }
    }

    const FeePayment = require('../models/FeePayment');
    let totalReversedAmount = 0;
    let reversedPaymentsCount = 0;

    // Process each fee with voucher to reverse payments
    for (const fee of feesWithVoucher) {
      // Find all payments for this StudentFee that were made after voucher generation
      const paymentQuery = {
        studentFee: fee._id,
        status: 'completed' // Only reverse completed payments
      };

      if (voucherGeneratedDate) {
        paymentQuery.paymentDate = { $gte: voucherGeneratedDate };
      }

      const paymentsToReverse = await FeePayment.find(paymentQuery).sort({ paymentDate: 1 });

      if (paymentsToReverse.length > 0) {
        // Calculate total amount to reverse
        const totalPaymentAmount = paymentsToReverse.reduce((sum, payment) => {
          return sum + parseFloat(payment.amount || 0);
        }, 0);

        // Reverse payments by marking them as refunded
        for (const payment of paymentsToReverse) {
          payment.status = 'refunded';
          payment.refundAmount = payment.amount;
          payment.refundDate = new Date();
          payment.refundReason = `Voucher deleted for ${month}/${year}`;
          await payment.save();
          reversedPaymentsCount++;
        }

        // Update StudentFee: reduce paidAmount and recalculate remainingAmount
        const currentPaidAmount = parseFloat(fee.paidAmount || 0);
        const newPaidAmount = Math.max(0, currentPaidAmount - totalPaymentAmount);
        fee.paidAmount = newPaidAmount;
        fee.remainingAmount = Math.max(0, fee.finalAmount - newPaidAmount);

        // Update status
        if (fee.remainingAmount <= 0.01) {
          fee.status = 'paid';
        } else if (newPaidAmount > 0) {
          fee.status = 'partial';
          // Check if overdue
          if (fee.dueDate && new Date() > fee.dueDate) {
            fee.status = 'overdue';
          }
        } else {
          fee.status = 'pending';
          // Check if overdue
          if (fee.dueDate && new Date() > fee.dueDate) {
            fee.status = 'overdue';
          }
        }

        // Update lastPaymentDate to the most recent payment before voucher generation
        if (voucherGeneratedDate) {
          const paymentsBeforeVoucher = await FeePayment.find({
            studentFee: fee._id,
            status: 'completed',
            paymentDate: { $lt: voucherGeneratedDate }
          }).sort({ paymentDate: -1 }).limit(1);

          if (paymentsBeforeVoucher.length > 0) {
            fee.lastPaymentDate = paymentsBeforeVoucher[0].paymentDate;
          } else {
            fee.lastPaymentDate = null;
          }
        }

        await fee.save();
        totalReversedAmount += totalPaymentAmount;
      }
    }

    // Delete vouchers from all StudentFee records
    let deletedCount = 0;
    for (const fee of feesWithVoucher) {
      if (fee.vouchers && Array.isArray(fee.vouchers)) {
        const originalLength = fee.vouchers.length;
        fee.vouchers = fee.vouchers.filter(v => 
          !(v && Number(v.month) === Number(month) && Number(v.year) === Number(year))
        );
        
        if (fee.vouchers.length < originalLength) {
          await fee.save();
          deletedCount++;
        }
      }
    }

    if (deletedCount === 0) {
      throw new ApiError(400, 'Failed to delete voucher');
    }

    return {
      message: `Voucher deleted successfully${reversedPaymentsCount > 0 ? `. ${reversedPaymentsCount} payment(s) reversed totaling Rs. ${totalReversedAmount.toFixed(2)}` : ''}`,
      deletedCount,
      reversedPaymentsCount,
      totalReversedAmount
    };
  }
}

module.exports = new FeeService();
