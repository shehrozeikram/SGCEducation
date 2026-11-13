const mongoose = require('mongoose');
const FeeStructure = require('../models/FeeStructure');
const FeeHead = require('../models/FeeHead');
const Class = require('../models/Class');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Admission = require('../models/Student');
const FeeVoucher = require('../models/FeeVoucher');
const FeePayment = require('../models/FeePayment');
const SuspenseEntry = require('../models/SuspenseEntry');
const User = require('../models/User');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');
const { generateReceiptNumber } = require('../utils/receiptUtils');
const MonthReconciliation = require('../models/MonthReconciliation');

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
   * Returns all active students in the institution with a flag indicating if they have fee structures
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

    // Get only enrolled/active students in the institution
    const students = await Student.find({
      institution: institutionId,
      status: { $in: ['enrolled', 'active'] }
    })
      .populate('class', 'name code')
      .populate('section', 'name code')
      .sort({ enrollmentNumber: 1 });

    // Get all student IDs that have fee structures
    const studentsWithFees = await StudentFee.find({
      institution: institutionId,
      isActive: true
    }).distinct('student');

    // Convert to Set for faster lookup
    const studentsWithFeesSet = new Set(studentsWithFees.map(id => id.toString()));

    // Format response for frontend with hasAssignedFee flag
    const formattedStudents = students.map(student => {
      const classDoc = student.class || {};
      const sectionDoc = student.section || {};
      const hasAssignedFee = studentsWithFeesSet.has(student._id.toString());
      
      return {
        _id: student._id,
        enrollmentNumber: student.enrollmentNumber,
        rollNumber: student.rollNumber,
        admissionNumber: student.applicationNumber || student.admissionNo || student.admissionNumber || '',
        name: student.personalDetails?.name || student.name || student.firstName || '',
        class: classDoc.name || (typeof student.class === 'string' ? student.class : student.className || ''),
        section: sectionDoc.name || (typeof student.section === 'string' ? student.section : student.sectionName || ''),
        academicYear: student.academicYear,
        hasAssignedFee: hasAssignedFee,
        admissionDate: student.admissionDate || student.createdAt || null
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

    if (!student.isActive || (student.status !== 'enrolled' && student.status !== 'active')) {
      throw new ApiError(400, 'Student is not enrolled');
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
      let appliedBaseAmount = feeStructure.amount || 0;
      let appliedDiscount = 0;
      let appliedDiscountType = discountType;
      let appliedDiscountOperation = 'decrease';
      let appliedDiscountReason = discountReason;

      const feeHeadId = (feeStructure.feeHead._id || feeStructure.feeHead).toString();

      // Check if there's a per-fee-head discount
      if (feeHeadDiscounts && feeHeadDiscounts[feeHeadId]) {
        const feeHeadDiscount = feeHeadDiscounts[feeHeadId];
        appliedBaseAmount = feeHeadDiscount.baseAmount !== undefined ? parseFloat(feeHeadDiscount.baseAmount) : (feeStructure.amount || 0);
        appliedDiscount = parseFloat(feeHeadDiscount.discount) || 0;
        appliedDiscountType = feeHeadDiscount.discountType || 'amount';
        appliedDiscountOperation = feeHeadDiscount.discountOperation || 'decrease';
        appliedDiscountReason = feeHeadDiscount.discountReason || discountReason;
      } else if (discount > 0) {
        // Fall back to global discount for backward compatibility
        appliedDiscount = parseFloat(discount) || 0;
        appliedDiscountType = discountType;
        appliedDiscountOperation = 'decrease'; // Default for legacy global discount
        appliedDiscountReason = discountReason;
      }

      // Apply discount/increment
      let finalAmount = appliedBaseAmount;
      if (appliedDiscount > 0) {
        if (appliedDiscountType === 'percentage') {
          const adjustment = (appliedBaseAmount * appliedDiscount / 100);
          finalAmount = appliedDiscountOperation === 'increase' ? appliedBaseAmount + adjustment : appliedBaseAmount - adjustment;
        } else {
          finalAmount = appliedDiscountOperation === 'increase' ? appliedBaseAmount + appliedDiscount : appliedBaseAmount - appliedDiscount;
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
        baseAmount: appliedBaseAmount,
        discountAmount: appliedDiscount,
        discountType: appliedDiscountType,
        discountOperation: appliedDiscountOperation,
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
   * Update fee structure for a student
   * Updates existing StudentFee records with new amounts
   * IMPORTANT: Preserves existing vouchers - they keep their original amounts
   * Only future vouchers will use the updated amounts
   */
  async updateFeeStructure(updateData, currentUser) {
    const { 
      studentId, 
      classId, 
      discount = 0, 
      discountType = 'amount', 
      discountReason = '',
      feeHeadDiscounts = {}
    } = updateData;

    if (!studentId || !classId) {
      throw new ApiError(400, 'Student ID and Class ID are required');
    }

    // Verify student exists
    const student = await Student.findById(studentId).populate('institution');
    
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    if (!student.isActive || (student.status !== 'active' && student.status !== 'enrolled')) {
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
    }).populate('feeHead');

    if (feeStructures.length === 0) {
      throw new ApiError(400, 'No fee structures found for this class');
    }

    // First, check if student has ANY existing fees (regardless of class)
    const anyExistingFees = await StudentFee.find({
      student: studentId,
      isActive: true
    });

    if (anyExistingFees.length === 0) {
      throw new ApiError(400, 'No fee structure assigned to update. Please assign first.');
    }

    // Get existing StudentFee records for THIS specific class
    const existingStudentFees = await StudentFee.find({
      student: studentId,
      class: classId,
      isActive: true
    });

    // If student has fees but for a DIFFERENT class, we need to handle class change
    const isChangingClass = anyExistingFees.length > 0 && existingStudentFees.length === 0;
    
    if (isChangingClass) {
      // Deactivate ALL old fees from the previous class
      // They will still be visible in the UI if they have vouchers because of our query update in getStudentFees
      await StudentFee.updateMany(
        {
          student: studentId,
          isActive: true
        },
        {
          $set: { isActive: false, updatedAt: new Date(), updatedBy: currentUser._id }
        }
      );
    }

    // Update each StudentFee record
    const updatedFees = [];
    
    for (const feeStructure of feeStructures) {
      let appliedBaseAmount = feeStructure.amount || 0;
      let appliedDiscount = 0;
      let appliedDiscountType = discountType;
      let appliedDiscountOperation = 'decrease';
      let appliedDiscountReason = discountReason;

      const feeHeadId = (feeStructure.feeHead._id || feeStructure.feeHead).toString();

      // Check if there's a per-fee-head discount
      if (feeHeadDiscounts && feeHeadDiscounts[feeHeadId]) {
        const feeHeadDiscount = feeHeadDiscounts[feeHeadId];
        appliedDiscount = parseFloat(feeHeadDiscount.discount) || 0;
        appliedDiscountType = feeHeadDiscount.discountType || 'amount';
        appliedDiscountOperation = feeHeadDiscount.discountOperation || 'decrease';
        appliedDiscountReason = feeHeadDiscount.discountReason || discountReason;
      } else if (discount > 0) {
        appliedDiscount = parseFloat(discount) || 0;
        appliedDiscountType = discountType;
        appliedDiscountOperation = 'decrease'; // Default for legacy global discount
        appliedDiscountReason = discountReason;
      }

      // Apply discount/increment
      let finalAmount = appliedBaseAmount;
      if (appliedDiscount > 0) {
        if (appliedDiscountType === 'percentage') {
          const adjustment = (appliedBaseAmount * appliedDiscount / 100);
          finalAmount = appliedDiscountOperation === 'increase' ? appliedBaseAmount + adjustment : appliedBaseAmount - adjustment;
        } else {
          finalAmount = appliedDiscountOperation === 'increase' ? appliedBaseAmount + appliedDiscount : appliedBaseAmount - appliedDiscount;
        }
        if (finalAmount < 0) {
          finalAmount = 0;
        }
      }

      // Find ALL existing active StudentFee records for this fee head
      const matchingFees = existingStudentFees.filter(
        sf => (sf.feeHead._id || sf.feeHead).toString() === feeHeadId
      );

      // Sort matching fees to get the newest one first (fallback safety)
      matchingFees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const existingFee = matchingFees.length > 0 ? matchingFees[0] : null;

      // If there are duplicate active fees for this head, deactivate the older ones to clean up data consistency
      if (matchingFees.length > 1) {
        const duplicateIds = matchingFees.slice(1).map(f => f._id);
        await StudentFee.updateMany(
          { _id: { $in: duplicateIds } },
          { $set: { isActive: false, updatedAt: new Date(), updatedBy: currentUser._id } }
        );
      }

      if (existingFee && !isChangingClass) {
        // Update existing record (same class)
        // CRITICAL: ONLY update if it has NO vouchers. If it has vouchers, it's historical data.
        const hasVouchers = existingFee.vouchers && existingFee.vouchers.length > 0;

        if (!hasVouchers) {
          // ... (existing update logic)
          const paidAmount = existingFee.paidAmount || 0;
          const newRemainingAmount = Math.max(0, finalAmount - paidAmount);

          const updatedFee = await StudentFee.findByIdAndUpdate(
            existingFee._id,
            {
              $set: {
                baseAmount: appliedBaseAmount,
                discountAmount: appliedDiscount,
                discountType: appliedDiscountType,
                discountOperation: appliedDiscountOperation,
                discountReason: appliedDiscountReason,
                finalAmount: finalAmount,
                remainingAmount: newRemainingAmount,
                updatedAt: new Date(),
                updatedBy: currentUser._id
              }
            },
            { 
              new: true,
              strict: false,
              overwrite: false
            }
          );
          updatedFees.push(updatedFee);
        } else {
          // Record has vouchers, so it's history. 
          // 1. Deactivate the old record
          await StudentFee.findByIdAndUpdate(existingFee._id, {
            $set: { isActive: false, updatedAt: new Date(), updatedBy: currentUser._id }
          });

          // 2. Create a NEW record for the same fee head with the new structure
          const newFee = await StudentFee.create({
            institution: institutionId,
            student: studentId,
            feeStructure: feeStructure._id,
            class: classId,
            feeHead: feeHeadId,
            baseAmount: appliedBaseAmount,
            discountAmount: appliedDiscount,
            discountType: appliedDiscountType,
            discountOperation: appliedDiscountOperation,
            discountReason: appliedDiscountReason,
            finalAmount: finalAmount,
            paidAmount: 0,
            remainingAmount: finalAmount,
            status: 'pending',
            dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 20),
            academicYear: student.academicYear || '',
            isActive: true,
            createdBy: currentUser._id
          });
          updatedFees.push(newFee);
        }
      } else {
        // Create new StudentFee if:
        // - This fee head didn't exist before, OR
        // - We're changing classes (old fees were deactivated)
        const newFee = await StudentFee.create({
          institution: institutionId,
          student: studentId,
          feeStructure: feeStructure._id,
          class: classId,
          feeHead: feeHeadId,
          baseAmount: appliedBaseAmount,
          discountAmount: appliedDiscount,
          discountType: appliedDiscountType,
          discountReason: appliedDiscountReason,
          finalAmount: finalAmount,
          paidAmount: 0,
          remainingAmount: finalAmount,
          status: 'pending',
          dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 20),
          academicYear: student.academicYear || '',
          isActive: true,
          createdBy: currentUser._id
        });
        updatedFees.push(newFee);
      }
    }

    return {
      totalUpdated: updatedFees.length,
      studentFees: updatedFees
    };
  }


  /**
   * Get Student Ledger (chronological history of charges and payments, admission details & vouchers)
   */
  async getStudentLedger(studentId, filters = {}, currentUser) {
    if (!studentId) {
      throw new ApiError(400, 'Student ID is required');
    }

    const { startDate, endDate, institution } = filters;
    
    let institutionId;
    if (currentUser.role !== 'super_admin') {
      institutionId = getInstitutionId(currentUser);
      if (!institutionId) {
        throw new ApiError(400, 'Institution not found for user');
      }
    } else if (institution) {
      institutionId = extractInstitutionId(institution);
    }

    const student = await Student.findById(studentId)
      .populate('class')
      .populate('section')
      .populate('institution');
      
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }
    
    // Fetch all StudentFee records for this student with feeHead populated
    const studentFees = await StudentFee.find({ student: studentId })
      .populate({
        path: 'feeHead',
        select: 'name priority frequencyType accountType'
      })
      .sort({ createdAt: 1 });

    // 1. Admission details / Fee heads assigned at admission
    // Get unique fee heads (preferring earliest or initial structure assigned)
    const admissionFeeDetails = [];
    const seenHeads = new Set();
    studentFees.forEach(sf => {
      const headName = sf.feeHead?.name || 'Fee Head';
      const headId = sf.feeHead?._id?.toString() || headName;
      if (!seenHeads.has(headId) && headName.toLowerCase() !== 'arrears') {
        seenHeads.add(headId);
        admissionFeeDetails.push({
          feeHead: headName,
          baseAmount: Number(sf.baseAmount || 0),
          discount: Number(sf.discountAmount || 0),
          finalAmount: Number(sf.finalAmount || 0)
        });
      }
    });

    // 2. Fetch all completed payments for this student
    const paymentQuery = { 
      student: studentId, 
      status: { $in: ['completed', 'success'] } 
    };
    if (startDate || endDate) {
      paymentQuery.paymentDate = {};
      if (startDate) paymentQuery.paymentDate.$gte = new Date(startDate);
      if (endDate) paymentQuery.paymentDate.$lte = new Date(endDate);
    }
    const payments = await FeePayment.find(paymentQuery).sort({ paymentDate: 1 });

    // Map payments by voucher number and studentFee
    const paymentsByVoucherNo = new Map();
    const paymentsByStudentFee = new Map();
    payments.forEach(p => {
      if (p.voucherNumber) {
        let vNo = p.voucherNumber.toString().trim();
        if (vNo.includes('-')) vNo = vNo.split('-').pop();
        if (!paymentsByVoucherNo.has(vNo)) paymentsByVoucherNo.set(vNo, []);
        paymentsByVoucherNo.get(vNo).push(p);
      }
      const sfId = p.studentFee?.toString();
      if (sfId) {
        if (!paymentsByStudentFee.has(sfId)) paymentsByStudentFee.set(sfId, []);
        paymentsByStudentFee.get(sfId).push(p);
      }
    });

    // 3. Extract unique vouchers from studentFees (and FeeVoucher collection if present)
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const voucherMap = new Map();
    studentFees.forEach(sf => {
      if (Array.isArray(sf.vouchers)) {
        sf.vouchers.forEach(v => {
          if (!v || v.month === undefined || v.year === undefined) return;
          const key = `${v.year}-${v.month}`;
          let vNo = v.voucherNumber ? v.voucherNumber.toString().trim() : '';
          let shortVNo = vNo.includes('-') ? vNo.split('-').pop() : vNo;

          if (!voucherMap.has(key)) {
            voucherMap.set(key, {
              key,
              month: Number(v.month),
              year: Number(v.year),
              monthName: monthNames[Number(v.month) - 1] || `Month ${v.month}`,
              voucherNumber: shortVNo || vNo,
              fullVoucherNumber: vNo,
              issueDate: v.generatedAt || sf.createdAt,
              fees: []
            });
          }
          const entry = voucherMap.get(key);
          if (!entry.voucherNumber && shortVNo) {
            entry.voucherNumber = shortVNo;
            entry.fullVoucherNumber = vNo;
          }
          if (v.generatedAt && (!entry.issueDate || new Date(v.generatedAt) < new Date(entry.issueDate))) {
            entry.issueDate = v.generatedAt;
          }
          entry.fees.push(sf);
        });
      }
    });

    // Also check FeeVoucher collection in case standalone vouchers were generated
    const feeVoucherQuery = { student: studentId };
    const standaloneVouchers = await FeeVoucher.find(feeVoucherQuery).sort({ year: 1, month: 1 });
    standaloneVouchers.forEach(sv => {
      const key = `${sv.year}-${sv.month}`;
      let vNo = sv.voucherNumber ? sv.voucherNumber.toString().trim() : '';
      let shortVNo = vNo.includes('-') ? vNo.split('-').pop() : vNo;
      if (!voucherMap.has(key)) {
        voucherMap.set(key, {
          key,
          month: Number(sv.month),
          year: Number(sv.year),
          monthName: monthNames[Number(sv.month) - 1] || `Month ${sv.month}`,
          voucherNumber: shortVNo || vNo,
          fullVoucherNumber: vNo,
          issueDate: sv.generatedAt || sv.createdAt,
          fees: [],
          currentMonthFee: sv.currentMonthAmount || 0,
          arrears: sv.arrearsBroughtForward || 0,
          totalPaid: sv.paidAmount || 0,
          remainingAmount: sv.remainingAmount || 0,
          status: sv.status,
          dueDate: sv.dueDate
        });
      }
    });

    // Sort vouchers chronologically
    const sortedVoucherKeys = Array.from(voucherMap.keys()).sort((a, b) => {
      const [yA, mA] = a.split('-').map(Number);
      const [yB, mB] = b.split('-').map(Number);
      return (yA - yB) || (mA - mB);
    });

    // Build voucher rows matching screenshot structure:
    // Voucher # | Fee Month | Issue Date | Current Month Fee | Arrears | Total Paid | Balance | Paid Date | Paid Status | Bank | FT #
    const voucherRows = [];

    sortedVoucherKeys.forEach(k => {
      const vData = voucherMap.get(k);
      const { month, year, voucherNumber, fullVoucherNumber, issueDate, fees } = vData;

      // Current month fee (excluding arrears head)
      let currentMonthFee = 0;
      fees.forEach(f => {
        if (f.feeHead?.name?.toLowerCase() !== 'arrears') {
          currentMonthFee += Number(f.finalAmount || 0);
        }
      });
      if (currentMonthFee === 0 && vData.currentMonthFee) {
        currentMonthFee = vData.currentMonthFee;
      }

      // Prior arrears calculation (Ledger method)
      let totalBilledPrev = 0;
      let totalPaidPrev = 0;
      studentFees.forEach(f => {
        const hasV = f.vouchers && f.vouchers.length > 0;
        let isPrior = false;
        if (hasV) {
          isPrior = f.vouchers.every(v => (Number(v.year) < year) || (Number(v.year) === year && Number(v.month) < month));
        }
        if (isPrior) {
          if (f.feeHead?.name?.toLowerCase() !== 'arrears') {
            totalBilledPrev += Number(f.finalAmount || 0);
          }
          totalPaidPrev += Number(f.paidAmount || 0);
        }
      });

      const arrearsSnapshot = fees.find(f => f.feeHead?.name?.toLowerCase() === 'arrears');
      let arrears = 0;
      if (arrearsSnapshot && Number(arrearsSnapshot.finalAmount || 0) > 0) {
        arrears = Number(arrearsSnapshot.finalAmount || 0);
      } else if (vData.arrears !== undefined && vData.arrears > 0) {
        arrears = vData.arrears;
      } else {
        arrears = Math.max(0, Math.round((totalBilledPrev - totalPaidPrev) * 100) / 100);
      }

      // Find payments associated with this voucher or month
      const relatedPayments = [
        ...(paymentsByVoucherNo.get(voucherNumber) || []),
        ...(paymentsByVoucherNo.get(fullVoucherNumber) || [])
      ];
      fees.forEach(f => {
        const sfPayments = paymentsByStudentFee.get(f._id?.toString()) || [];
        sfPayments.forEach(p => {
          if (!relatedPayments.some(rp => rp._id?.toString() === p._id?.toString())) {
            relatedPayments.push(p);
          }
        });
      });

      // Total Paid on this voucher
      let totalPaid = 0;
      if (relatedPayments.length > 0) {
        totalPaid = relatedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      } else if (vData.totalPaid) {
        totalPaid = vData.totalPaid;
      } else {
        totalPaid = fees.reduce((sum, f) => sum + Number(f.paidAmount || 0), 0);
      }

      const totalObligation = currentMonthFee + arrears;
      let balance = Math.max(0, Math.round((totalObligation - totalPaid) * 100) / 100);

      // Paid Status
      let paidStatus = 'Unpaid';
      if (balance <= 0.01 && (totalPaid > 0 || totalObligation === 0)) {
        paidStatus = 'Paid';
        balance = 0;
      } else if (totalPaid > 0) {
        paidStatus = 'Partial';
      }

      // Payment details: Date, Bank, FT # (Transaction ID)
      let paidDate = null;
      let bank = '';
      let ftNumber = '';
      if (relatedPayments.length > 0) {
        const sortedPayments = [...relatedPayments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        const latestPayment = sortedPayments[0];
        paidDate = latestPayment.paymentDate;
        
        const banks = Array.from(new Set(sortedPayments.map(p => p.bankName).filter(Boolean)));
        bank = banks.join(', ');
        
        const fts = Array.from(new Set(sortedPayments.map(p => p.transactionId).filter(Boolean)));
        ftNumber = fts.join(', ');
      }

      voucherRows.push({
        id: vData.key,
        voucherNumber: voucherNumber || '-',
        feeMonth: vData.monthName,
        month: vData.month,
        year: vData.year,
        issueDate: issueDate || null,
        currentMonthFee,
        arrears,
        totalPaid,
        balance,
        paidDate,
        paidStatus,
        bank,
        ftNumber
      });
    });

    // Traditional chronological transactions for ledger summary
    const transactions = [];
    voucherRows.forEach(v => {
      transactions.push({
        id: `vch_${v.id}`,
        date: v.issueDate || new Date(),
        type: 'charge',
        description: `Fee Voucher Generated (${v.feeMonth} ${v.year})`,
        reference: v.voucherNumber,
        debit: v.currentMonthFee,
        credit: 0
      });
    });
    payments.forEach(p => {
      transactions.push({
        id: p._id,
        date: p.paymentDate,
        type: 'payment',
        description: `Payment Received (${p.paymentMethod || 'cash'})`,
        reference: p.receiptNumber,
        debit: 0,
        credit: Number(p.amount || 0)
      });
    });
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    transactions.forEach(t => {
      runningBalance += t.debit;
      runningBalance -= t.credit;
      t.balance = runningBalance;
      totalDebit += t.debit;
      totalCredit += t.credit;
    });

    const totalVouchersPaid = voucherRows.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
    const lastRowBalance = voucherRows.length > 0 ? voucherRows[voucherRows.length - 1].balance : 0;

    return {
      student: {
        id: student._id,
        name: student.name || student.personalDetails?.name || student.firstName || '',
        fatherName: student.guardianInfo?.fatherName || student.fatherName || 'N/A',
        enrollmentNumber: student.enrollmentNumber || '',
        rollNumber: student.rollNumber || 'N/A',
        admissionNumber: student.applicationNumber || student.admissionNo || student.admissionNumber || '',
        class: student.class?.name || (typeof student.class === 'string' ? student.class : student.className || 'N/A'),
        section: student.section?.name || ''
      },
      admissionFeeDetails,
      voucherRows,
      summary: {
        totalCharges: totalDebit,
        totalPayments: totalCredit,
        totalVouchersPaid,
        currentBalance: lastRowBalance || runningBalance
      },
      transactions
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

    // Build query: Include active records AND records with vouchers (history)
    const query = {
      institution: institutionId,
      $or: [
        { isActive: true },
        { vouchers: { $exists: true, $not: { $size: 0 } } }
      ]
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
        select: 'enrollmentNumber rollNumber status academicYear applicationNumber admissionNo admissionNumber name firstName lastName personalDetails guardianInfo class className section sectionName admissionDate createdAt statusHistory updatedAt',
        populate: [
          { path: 'class', select: 'name code' },
          { path: 'section', select: 'name code' }
        ]
      })
      .populate({
        path: 'class',
        select: 'name code'
      })
      .populate({
        path: 'feeHead',
        select: 'name priority frequencyType'
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
    const { studentIds, month, year, feeHeadIds: rawFeeHeadIds, dueDay = 20, dueDate, generatedDate } = voucherData;
    // Normalize feeHeadIds to strings to ensure consistent comparison with ObjectId.toString()
    const feeHeadIds = rawFeeHeadIds && Array.isArray(rawFeeHeadIds) && rawFeeHeadIds.length > 0
      ? rawFeeHeadIds.map(id => id.toString())
      : null;
    console.log(`[generateVouchers] feeHeadIds filter:`, feeHeadIds ? feeHeadIds : 'NONE (all heads)');

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new ApiError(400, 'Student IDs are required');
    }

    if (!month || month < 1 || month > 12) {
      throw new ApiError(400, 'Valid month (1-12) is required');
    }

    if (!year || year < 2000) {
      throw new ApiError(400, 'Valid year is required');
    }

    // Parse generated date: use custom generatedDate if provided, otherwise default to current timestamp
    let generatedDateObj = new Date();
    if (generatedDate) {
      const parsedGenDate = new Date(generatedDate);
      if (!isNaN(parsedGenDate.getTime())) {
        generatedDateObj = parsedGenDate;
      }
    }

    // Parse due date: use full dueDate if provided, otherwise construct from dueDay
    let dueDateObj;
    if (dueDate) {
      // Use the provided full due date
      dueDateObj = new Date(dueDate);
    } else {
      // Fall back to old behavior: use voucher month/year with dueDay
      dueDateObj = new Date(year, month - 1, dueDay);
    }
    // Default validity date: 25th of the voucher month
    const validityDateObj = new Date(year, month - 1, 25);

    let students = await Student.find({
      _id: { $in: studentIds },
      isActive: true
    }).populate('institution');

    if (students.length === 0) {
      throw new ApiError(404, 'No active students found');
    }

    // Filter out students who are NOT currently enrolled or whose status changed to a non-enrolled status
    // (e.g., struck_off, rejected, cancelled, suspended, etc.) BEFORE the voucher month ends
    const voucherEndDate = new Date(year, month, 0, 23, 59, 59, 999);
    students = students.filter(student => {
      // Struck-off and passout students can NEVER have new vouchers generated
      if (student.status === 'struckoff' || student.status === 'passout') {
        return false;
      }

      // If the student's status is NOT 'enrolled', find when it changed
      if (student.status !== 'enrolled' && student.status !== 'active') {
        const currentStatus = student.status;
        
        // Find the latest history entry for this non-enrolled status
        const history = student.statusHistory ? [...student.statusHistory].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt)) : [];
        const statusChangeRecord = history.find(h => h.status === currentStatus);
        
        const changeDate = statusChangeRecord && statusChangeRecord.changedAt 
          ? new Date(statusChangeRecord.changedAt) 
          : new Date(student.updatedAt || new Date());
        
        // If changed to a non-enrolled status before or during the voucher month, exclude
        if (changeDate <= voucherEndDate) {
          return false;
        }
      }

      return true;
    });

    if (students.length === 0) {
      throw new ApiError(404, 'No eligible students found for voucher generation in this period');
    }

    const actualStudentIds = students.map(s => s._id);

    // Build query for StudentFee records - Fetch ALL active fees AND any records with vouchers or balance
    // We need the full history to calculate arrears accurately using the ledger method
    const studentFeeQuery = {
      student: { $in: actualStudentIds },
      $or: [
        { isActive: true },
        { 'vouchers.0': { $exists: true } },
        { remainingAmount: { $gt: 0 } }
      ]
    };

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

    // Find the highest existing voucher sequence number across ALL records in this institution.
    // Voucher numbers follow the format "17340-XXXXX" where XXXXX is a zero-padded sequence.
    // Since they are zero-padded, string $max gives the correct highest number.
    const instObjId = new mongoose.Types.ObjectId(institutionId.toString());
    const maxVoucherResult = await StudentFee.aggregate([
      {
        $match: {
          institution: instObjId
        }
      },
      {
        $unwind: '$vouchers'
      },
      {
        $match: {
          'vouchers.voucherNumber': { $exists: true, $ne: null, $type: "string" }
        }
      },
      {
        $addFields: {
          voucherParts: { $split: ['$vouchers.voucherNumber', '-'] }
        }
      },
      {
        $addFields: {
          seqNumStr: { $arrayElemAt: ['$voucherParts', -1] }
        }
      },
      {
        $addFields: {
          seqNum: { 
            $convert: { 
              input: '$seqNumStr', 
              to: 'int', 
              onError: 0, 
              onNull: 0 
            } 
          }
        }
      },
      {
        $group: {
          _id: null,
          maxVoucherNumber: { $max: '$seqNum' }
        }
      }
    ]);

    let voucherCounter = 0;
    if (maxVoucherResult.length > 0 && maxVoucherResult[0].maxVoucherNumber) {
      voucherCounter = maxVoucherResult[0].maxVoucherNumber;
    }
    console.log(`[generateVouchers] Max existing voucher seq = ${voucherCounter}, next will be ${voucherCounter + 1}`);

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
        let studentClassId = null;
        let studentAcademicYear = '';
        for (const fee of studentFees) {
          if (!studentClassId && fee.class) {
             studentClassId = fee.class._id || fee.class;
          }
          if (!studentAcademicYear && fee.academicYear) {
             studentAcademicYear = fee.academicYear;
          }
          const headId = fee.feeHead?._id.toString();
          if (!headId) continue;
          if (!feesByHead.has(headId)) {
            feesByHead.set(headId, []);
          }
          feesByHead.get(headId).push(fee);
        }

        // Auto-assign any selected fee heads that are missing
        if (feeHeadIds && feeHeadIds.length > 0 && studentClassId) {
          for (const reqHeadId of feeHeadIds) {
            if (!feesByHead.has(reqHeadId)) {
              // Try to find FeeStructure for this class and head
              const feeStructure = await FeeStructure.findOne({ class: studentClassId, feeHead: reqHeadId });
              if (feeStructure) {
                console.log(`[generateVouchers] Auto-creating StudentFee for missing head ${reqHeadId} for student ${studentIdStr}`);
                const newFee = await StudentFee.create({
                  institution: institutionId,
                  student: studentIdStr,
                  feeStructure: feeStructure._id,
                  class: studentClassId,
                  feeHead: reqHeadId,
                  baseAmount: feeStructure.amount,
                  discountAmount: 0,
                  discountType: 'amount',
                  discountReason: '',
                  finalAmount: feeStructure.amount,
                  paidAmount: 0,
                  remainingAmount: feeStructure.amount,
                  status: 'pending',
                  dueDate: dueDateObj,
                  academicYear: studentAcademicYear,
                  isActive: true,
                  createdBy: currentUser._id,
                  vouchers: []
                });
                await newFee.populate('feeHead', 'name priority frequencyType');
                feesByHead.set(reqHeadId, [newFee]);
              }
            }
          }
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
        
        // Analyze if we have work - ONLY for selected fee heads
        for (const [headId, fees] of feesByHead.entries()) {
           // Skip if this head was not selected by the user
           if (feeHeadIds && !feeHeadIds.some(id => id === headId)) {
             continue;
           }

           const hasVoucher = fees.some(f => f.vouchers && f.vouchers.some(v => v.month === month && v.year === year));
           if (!hasVoucher) {
             hasWorkToDo = true;
             break;
           }
        }
        
        if (!hasWorkToDo) continue;

        // Increment counter for unique voucher number (once per student)
        voucherCounter++;
        
        // Generate unique voucher number: VCH-YYYY-MM-SEQ (5 digits)
        const seqStr = String(voucherCounter).padStart(5, '0');
        const voucherNumber = `VCH-${year}-${String(month).padStart(2, '0')}-${seqStr}`;
        studentVoucherNumbers.set(studentIdStr, voucherNumber);

        // Process each Fee Head Group
        for (const [headId, fees] of feesByHead.entries()) {
          // Skip if this head was not selected by the user
          if (feeHeadIds && !feeHeadIds.some(id => id === headId)) {
            console.log(`[generateVouchers] Skipping fee head ${fees[0]?.feeHead?.name || headId} - not in selected list`);
            continue;
          }
          console.log(`[generateVouchers] Processing fee head ${fees[0]?.feeHead?.name || headId} for student ${studentIdStr}`);
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

          // Arrears Calculation Logic: Ledger Method
          // Arrears = (Total Billed Previous Non-Arrears) - (Total Paid Previous All Heads)
          const isArrearsHead = latestFee.feeHead?.name?.toLowerCase() === 'arrears';
          if (isArrearsHead) {
            let totalBilledPrev = 0;
            let totalPaidPrev = 0;
            const startDate = new Date(year, month - 1, 1);
            
            for (const [otherHeadId, otherFees] of feesByHead.entries()) {
              const otherHeadName = otherFees[0]?.feeHead?.name?.toLowerCase() || '';
              const isOtherArrears = otherHeadName === 'arrears';

              for (const otherFee of otherFees) {
                // Determine if this fee record belongs to a PREVIOUS billing period
                const hasVouchers = otherFee.vouchers && otherFee.vouchers.length > 0;
                let isPrevious = false;
                
                if (hasVouchers) {
                  // If it has vouchers, it's previous if ALL its vouchers are before the current month
                  isPrevious = otherFee.vouchers.every(v => 
                    (Number(v.year) < Number(year)) || (Number(v.year) === Number(year) && Number(v.month) < Number(month))
                  );
                }
                // If no vouchers yet, it hasn't been billed, so it's not "Arrears" yet.
                // It should be billed as its own line item in a voucher first.

                if (isPrevious) {
                  // Billing: Sum only non-arrears heads to avoid double counting the "Arrears" summary records
                  if (!isOtherArrears) {
                    totalBilledPrev += parseFloat(otherFee.finalAmount || 0);
                  }
                  // Payments: Sum payments from ALL heads (since a payment to Arrears head reduces the net debt)
                  totalPaidPrev += parseFloat(otherFee.paidAmount || 0);
                }
              }
            }

            // Arrears is the net outstanding from previous periods
            let calculatedArrears = Math.max(0, totalBilledPrev - totalPaidPrev);
            calculatedArrears = Math.round(calculatedArrears * 100) / 100;

            // Update the arrears record with the calculated amount
            if (latestFee.finalAmount !== calculatedArrears) {
              latestFee.baseAmount = calculatedArrears;
              latestFee.finalAmount = calculatedArrears;
              latestFee.remainingAmount = calculatedArrears;
              await latestFee.save();
              console.log(`[generateVouchers] Updated Arrears for student ${studentIdStr}: Billed=${totalBilledPrev}, Paid=${totalPaidPrev}, Result=${calculatedArrears}`);
            }
          }

          // Skip zero-amount fee records (unless it's arrears we just calculated to be > 0)
          if (latestFee.finalAmount <= 0) {
            console.log(`[generateVouchers] Skipping zero-amount fee record ${latestFee._id} for feeHead ${latestFee.feeHead?.name || latestFee.feeHead}`);
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
                // Deactivate the old record as it is now history
                latestFee.isActive = false;
                latestFee.updatedAt = new Date();
                latestFee.updatedBy = currentUser._id;
                await latestFee.save();

                // IMPORTANT: Use finalAmount as the new baseAmount for the cloned record.
                // When a fee increase is applied via updateFeeStructure (discountOperation='increase'),
                // the student's effective fee is stored in finalAmount, NOT baseAmount (which retains
                // the original class-level fee from the global FeeStructure).
                // Copying baseAmount here would revert the increase on every voucher clone cycle.
                var effectiveBaseAmount = latestFee.finalAmount;
                // Use the parsed due date object
                feeToUpdate = new StudentFee({
                  institution: latestFee.institution,
                  student: latestFee.student,
                  feeStructure: latestFee.feeStructure,
                  class: latestFee.class,
                  feeHead: latestFee.feeHead,
                  baseAmount: effectiveBaseAmount,
                  discountAmount: 0,
                  discountType: 'amount',
                  discountOperation: 'decrease',
                  discountReason: latestFee.discountReason,
                  finalAmount: effectiveBaseAmount,
                  paidAmount: 0,
                  remainingAmount: effectiveBaseAmount,
                  status: 'pending',
                  dueDate: dueDateObj,
                  validityDate: validityDateObj,
                  academicYear: latestFee.academicYear,
                  isActive: true,
                  createdBy: currentUser._id,
                  vouchers: []
                });
             }
             
             if (!feeToUpdate.vouchers) feeToUpdate.vouchers = [];
             feeToUpdate.dueDate = dueDateObj;
             feeToUpdate.validityDate = validityDateObj;
             feeToUpdate.vouchers.push({
               month, year, generatedAt: generatedDateObj, generatedBy: currentUser._id, voucherNumber,
               dueDate: dueDateObj,
               validityDate: validityDateObj
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
               if (!fee.isActive) continue; // Only attach voucher to active non-monthly fee records
               if (!fee.vouchers) fee.vouchers = [];
               fee.dueDate = dueDateObj;
               fee.validityDate = validityDateObj;
               fee.vouchers.push({
                 month, year, generatedAt: generatedDateObj, generatedBy: currentUser._id, voucherNumber,
                 dueDate: dueDateObj,
                 validityDate: validityDateObj
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
      totalVouchers: studentVoucherNumbers.size,
      totalStudents: studentVoucherNumbers.size,
      totalErrors: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Record fee payment (supports partial payments)
   * Updates StudentFee paidAmount and status
   */
  async recordPayment(paymentData, currentUser) {
    const { studentFeeId, amount, paymentMethod = 'cash', paymentDate, remarks, chequeNumber, bankName, transactionId, voucherNumber } = paymentData;

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
    // Log the record we found for debugging payment routing issues
    console.log(`[recordPayment] Found StudentFee:`, {
      _id: studentFee._id.toString(),
      feeHead: studentFee.feeHead?.toString() || 'N/A',
      isActive: studentFee.isActive,
      finalAmount: studentFee.finalAmount,
      paidAmount: studentFee.paidAmount,
      remainingAmount: studentFee.remainingAmount,
      status: studentFee.status,
      vouchers: studentFee.vouchers?.map(v => `${v.voucherNumber} (${v.month}/${v.year})`) || [],
      requestedAmount: amount
    });

    // Allow payments against inactive records — monthly voucher generation deactivates
    // old StudentFee records when creating new ones for the next month, but users still
    // need to pay outstanding balances on those older records.
    // Use the stored remainingAmount if it's available and consistent, otherwise calculate.
    const calculatedRemaining = studentFee.finalAmount - (studentFee.paidAmount || 0);
    const remainingAmount = Math.max(0, calculatedRemaining);
    
    if (remainingAmount <= 0.01) {
      throw new ApiError(400, `This fee is already fully paid (final=${studentFee.finalAmount}, paid=${studentFee.paidAmount}, remaining=${remainingAmount})`);
    }

    // Also sync the stored remainingAmount if it's out of date
    if (Math.abs((studentFee.remainingAmount || 0) - remainingAmount) > 0.01) {
      console.log(`[recordPayment] Fixing stale remainingAmount: stored=${studentFee.remainingAmount}, calculated=${remainingAmount}`);
      studentFee.remainingAmount = remainingAmount;
    }

    // Check if payment exceeds remaining amount
    if (amount > remainingAmount + 0.01) {
      throw new ApiError(400, `Payment amount (${amount}) exceeds remaining amount (${remainingAmount})`);
    }

    // Validate that paymentDate is not earlier than the voucher generatedDate
    if (paymentDate) {
      const pDate = new Date(paymentDate);
      if (!isNaN(pDate.getTime())) {
        // Find matching voucher for voucherNumber if passed, or latest voucher in studentFee
        let matchedVoucher = null;
        if (voucherNumber && Array.isArray(studentFee.vouchers)) {
          const vNoClean = voucherNumber.toString().trim();
          matchedVoucher = studentFee.vouchers.find(v => v.voucherNumber && (v.voucherNumber.toString().trim() === vNoClean || vNoClean.endsWith(v.voucherNumber.toString().trim())));
        }
        if (!matchedVoucher && Array.isArray(studentFee.vouchers) && studentFee.vouchers.length > 0) {
          // Use latest voucher
          matchedVoucher = studentFee.vouchers[studentFee.vouchers.length - 1];
        }

        const genDate = matchedVoucher?.generatedAt || studentFee.createdAt;
        if (genDate) {
          const genDateObj = new Date(genDate);
          if (!isNaN(genDateObj.getTime())) {
            const pDayStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(pDate.getDate()).padStart(2, '0')}`;
            const genDayStr = `${genDateObj.getFullYear()}-${String(genDateObj.getMonth() + 1).padStart(2, '0')}-${String(genDateObj.getDate()).padStart(2, '0')}`;
            if (pDayStr < genDayStr) {
              throw new ApiError(400, `Payment date (${pDayStr}) cannot be before the voucher generated date (${genDayStr}).`);
            }
          }
        }
      }
    }

    // Validate transactionId uniqueness across system if provided
    if (transactionId && typeof transactionId === 'string' && transactionId.trim() !== '') {
      const trimmedTid = transactionId.trim();
      const escapedTid = trimmedTid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tidRegex = new RegExp(`^${escapedTid}$`, 'i');
      const instId = studentFee.institution?._id || studentFee.institution;
      const studentObjId = studentFee.student?._id || studentFee.student;

      if (!paymentData.isFromSuspense) {
        const SuspenseEntry = require('../models/SuspenseEntry');
        const existingSuspense = await SuspenseEntry.findOne({
          transactionId: { $regex: tidRegex },
          ...(instId ? { institution: instId } : {})
        });
        if (existingSuspense) {
          throw new ApiError(400, `Transaction ID "${trimmedTid}" already exists in Suspense entries.`);
        }
      }

      // If this payment is reconciled from suspense, payments sharing the same transactionId
      // for the SAME student are permitted (so all fee items get grouped under that transaction).
      // For non-suspense payments, allow only within a 10s burst for the same student.
      const queryExisting = {
        transactionId: { $regex: tidRegex },
        status: { $ne: 'refunded' },
        ...(instId ? { institution: instId } : {})
      };

      if (paymentData.isFromSuspense) {
        queryExisting.student = { $ne: studentObjId };
      } else {
        const tenSecondsAgo = new Date(Date.now() - 10000);
        queryExisting.$or = [
          { student: { $ne: studentObjId } },
          { createdAt: { $lt: tenSecondsAgo } }
        ];
      }

      const existingPayment = await FeePayment.findOne(queryExisting);
      if (existingPayment) {
        throw new ApiError(400, `Transaction ID "${trimmedTid}" already exists.`);
      }
    }

    // Determine voucher number if not provided
    let finalVoucherNumber = voucherNumber || null;
    
    // If voucher number not provided, try to find it from StudentFee vouchers based on payment date
    if (!finalVoucherNumber) {
      if (studentFee.vouchers && Array.isArray(studentFee.vouchers) && studentFee.vouchers.length > 0) {
        let matchingVoucher = null;
        if (paymentDate) {
          const paymentDateObj = new Date(paymentDate);
          const paymentMonth = paymentDateObj.getMonth() + 1; // 1-12
          const paymentYear = paymentDateObj.getFullYear();
          
          matchingVoucher = studentFee.vouchers.find(
            v => v && v.month === paymentMonth && v.year === paymentYear && v.voucherNumber
          );
        }
        
        // Fallback to the first available voucher if no month match or no paymentDate
        if (!matchingVoucher) {
          matchingVoucher = studentFee.vouchers[0];
        }
        
        if (matchingVoucher && matchingVoucher.voucherNumber) {
          finalVoucherNumber = matchingVoucher.voucherNumber;
        }
      }
    }

    // Generate receipt number atomically using ReceiptCounter
    // This prevents race conditions when multiple payments are created simultaneously
    
    // Retry logic for duplicate receipt numbers (handles race conditions)
    let feePayment;
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
      try {
        const receiptNumber = await generateReceiptNumber({
          institution: studentFee.institution?._id || studentFee.institution,
          year: new Date().getFullYear(),
          type: 'RCP'
        });

        // Create FeePayment record with receiptNumber explicitly set
        // This prevents the pre-save hook from generating another one
        feePayment = await FeePayment.create({
          institution: studentFee.institution?._id || studentFee.institution,
          student: studentFee.student?._id || studentFee.student,
          studentFee: studentFeeId,
          receiptNumber: receiptNumber,
          voucherNumber: finalVoucherNumber,
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
        // Check if it's a duplicate key error (11000)
        if (error.code === 11000) {
          console.warn(`[recordPayment] Duplicate key error (attempt ${retries + 1}/${maxRetries}): ${error.message}`);
          retries++;
          if (retries >= maxRetries) {
            throw new ApiError(500, `Failed to generate unique receipt number after ${maxRetries} attempts: ${error.message}`);
          }
          // Short delay before retrying
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
    
    // Improved payment date handling: If payment is for today, use current timestamp to ensure
    // it's recorded after voucher generation on the same day.
    const now = new Date();
    let finalPaymentDate = paymentDate ? new Date(paymentDate) : now;
    
    // If paymentDate was a string without time, it might default to 00:00:00 UTC
    // If it refers to today's date, use 'now' to preserve the current time.
    if (paymentDate && typeof paymentDate === 'string' && paymentDate.length <= 10) {
      if (finalPaymentDate.toDateString() === now.toDateString()) {
        finalPaymentDate = now;
      }
    }
    
    studentFee.lastPaymentDate = finalPaymentDate;

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
    console.log(`[recordPayment] ✅ Payment applied to StudentFee ${studentFee._id}: paid=${studentFee.paidAmount}, remaining=${studentFee.remainingAmount}, status=${studentFee.status}`);

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
    if (institution) {
      // Use the requested institution (extracting if it's an object)
      institutionId = typeof institution === 'object' ? (institution._id || institution.id) : institution;
    } else {
      institutionId = getInstitutionId(currentUser);
    }
    
    if (!institutionId) {
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
      .populate('student', 'enrollmentNumber rollNumber')
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

    // Get active students to prevent orphaned records from showing up
    const activeStudents = await Student.find({ 
      institution: institutionId, 
      isActive: { $ne: false } 
    }).select('_id');
    const activeStudentIds = activeStudents.map(s => s._id.toString());

    // Build query
    const query = {
      institution: institutionId
    };

    // Filter by receipt number or transaction ID
    if (filters.receiptNumber || filters.transactionId) {
      const searchTerm = (filters.receiptNumber || filters.transactionId).trim();
      query.$or = [
        { receiptNumber: { $regex: searchTerm, $options: 'i' } },
        { transactionId: { $regex: searchTerm, $options: 'i' } }
      ];
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

      // Search in Student collection for student name using the correct field path
      if (filters.studentName) {
        const studentNameQuery = {
          institution: institutionId,
          'personalDetails.name': { $regex: filters.studentName, $options: 'i' }
        };
        const studentsByName = await Student.find(studentNameQuery).select('_id');
        studentIds.push(...studentsByName.map(s => s._id));
      }

      // Search in Admission collection (for student ID, name, and roll number)
      if (filters.studentId || filters.studentName || filters.rollNumber) {
        const admissionQuery = { institution: institutionId };
        
        if (filters.studentId) {
          admissionQuery.applicationNumber = { $regex: filters.studentId, $options: 'i' };
        }
        if (filters.studentName) {
          admissionQuery['personalDetails.name'] = { $regex: filters.studentName, $options: 'i' };
        }
        if (filters.rollNumber) {
          admissionQuery.rollNumber = { $regex: filters.rollNumber, $options: 'i' };
        }
        
        const admissions = await Admission.find(admissionQuery).select('studentId');
        const admissionStudentIds = admissions
          .map(a => {
            // Handle both populated and unpopulated studentId
            if (a.studentId) {
              return typeof a.studentId === 'object' ? (a.studentId._id || a.studentId) : a.studentId;
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
        // Intersect with active students to drop orphaned records
        const filteredIds = uniqueStudentIds.filter(id => activeStudentIds.includes(id.toString()));
        if (filteredIds.length > 0) {
          query.student = { $in: filteredIds };
        } else {
          return [];
        }
      } else {
        // No matching students found, return empty array
        return [];
      }
    } else {
      // No student filter: return payments for ALL students (active and inactive)
      // so report totals match Print Voucher which does not filter by student.isActive.
      // (No extra restriction needed; the institution filter already scopes the query.)
    }

    // Fetch payments with populated student and collectedBy
    const payments = await FeePayment.find(query)
      .populate({
        path: 'student',
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
      .populate('collectedBy', 'name')
      .populate({
        path: 'studentFee',
        select: 'feeHead vouchers'
      })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    // Add voucher number and flatten student name/father name
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
      const studentId = studentFee.student?.toString();
      if (!studentId) continue;
      
      if (!studentFeesByStudent.has(studentId)) {
        studentFeesByStudent.set(studentId, []);
      }
      studentFeesByStudent.get(studentId).push(studentFee);
    }

    const paymentsWithVoucher = payments.map(payment => {
      // Use stored voucher number if available (preferred)
      let voucherNumber = payment.voucherNumber || null;
      
      // If no stored voucher number, try to find it from StudentFee vouchers (fallback)
      if (!voucherNumber && payment.paymentDate) {
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

      // Flatten student name and father name for the frontend
      const student = payment.student;
      let possibleFatherName = '';
      let studentName = '';
      
      if (student) {
        // Ensure name exists (from user or admission)
        if (!student.name) {
          student.name = student.personalDetails?.name || '';
        }
        studentName = student.name;
        
        // Ensure father name exists (searching multiple possible paths)
        if (!student.guardianInfo) {
          student.guardianInfo = {};
        }

        possibleFatherName = 
          student.guardianInfo?.fatherName || 
          student.guardianInfo?.fatherName ||
          student.personalDetails?.fatherName ||
          student.guardianInfo?.father ||
          '';

        student.guardianInfo.fatherName = possibleFatherName;
        // Also set on student object directly as a flat field for easier frontend access
        student.fatherName = possibleFatherName;
      }
      
      // Build return object with flattened fields at the root
      const cashierName = payment.collectedBy?.name || payment.cashierName || 'N/A';
      
      // Compute Fee Month
      let feeMonth = 'N/A';
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      if (payment.studentFee && payment.studentFee.vouchers && payment.studentFee.vouchers.length > 0) {
        let matchingV = null;
        if (voucherNumber) {
          matchingV = payment.studentFee.vouchers.find(v => v.voucherNumber === voucherNumber);
        }
        if (!matchingV && payment.paymentDate) {
          const pd = new Date(payment.paymentDate);
          matchingV = payment.studentFee.vouchers.find(v => v.month === (pd.getMonth() + 1) && v.year === pd.getFullYear());
        }
        if (!matchingV) {
          matchingV = payment.studentFee.vouchers[0];
        }
        if (matchingV && matchingV.month && matchingV.year) {
          feeMonth = `${monthNames[matchingV.month - 1]} ${matchingV.year}`;
        }
      }
      
      if (feeMonth === 'N/A' && payment.paymentDate) {
        const pd = new Date(payment.paymentDate);
        feeMonth = `${monthNames[pd.getMonth()]} ${pd.getFullYear()}`;
      }

      return {
        ...payment,
        voucherNumber,
        feeMonth,
        studentName,
        fatherName: possibleFatherName,
        cashierName
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
    const { studentId, studentIds, month, year } = voucherData;

    // Support both single studentId and multiple studentIds (array or comma-separated string)
    let idsToProcess = [];
    if (studentIds) {
      if (Array.isArray(studentIds)) {
        idsToProcess = studentIds;
      } else if (typeof studentIds === 'string') {
        idsToProcess = studentIds.split(',').map(id => id.trim()).filter(id => id);
      }
    } else if (studentId) {
      idsToProcess = [studentId];
    }

    if (idsToProcess.length === 0) {
      throw new ApiError(400, 'Student ID(s) are required');
    }

    if (!month || month < 1 || month > 12) {
      throw new ApiError(400, 'Valid month (1-12) is required');
    }

    if (!year || year < 2000) {
      throw new ApiError(400, 'Valid year is required');
    }

    let totalDeletedVouchers = 0;
    let totalReversedPayments = 0;
    let totalReversedAmount = 0;
    let deletedStudentNames = [];
    let deletedVoucherNumbers = [];

    const Admission = require('../models/Student');
    const FeePayment = require('../models/FeePayment');

    for (const currentId of idsToProcess) {
      // Find the student
      let student = await Student.findById(currentId);
      
      // If not found by student ID, try to find by admission ID
      if (!student) {
        const admission = await Admission.findById(currentId);
        if (admission && admission.studentId) {
          student = admission.studentId;
        }
      }

      if (!student) {
        continue; // Skip if student not found
      }

      const actualStudentId = student._id;

      // Get all StudentFee records for this student that have vouchers (active and historical)
      const studentFeeRecords = await StudentFee.find({
        student: actualStudentId,
        $or: [
          { isActive: true },
          { vouchers: { $exists: true, $not: { $size: 0 } } }
        ]
      });

      if (studentFeeRecords.length === 0) {
        continue;
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
        continue;
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
          const totalPaymentAmountForFee = paymentsToReverse.reduce((sum, payment) => {
            return sum + parseFloat(payment.amount || 0);
          }, 0);

          // Reverse payments by marking them as refunded
          for (const payment of paymentsToReverse) {
            payment.status = 'refunded';
            payment.refundAmount = payment.amount;
            payment.refundDate = new Date();
            payment.refundReason = `Voucher deleted for ${month}/${year}`;
            await payment.save();
            totalReversedPayments++;
          }

          // Update StudentFee: reduce paidAmount and recalculate remainingAmount
          const currentPaidAmount = parseFloat(fee.paidAmount || 0);
          const newPaidAmount = Math.max(0, currentPaidAmount - totalPaymentAmountForFee);
          fee.paidAmount = newPaidAmount;
          fee.remainingAmount = Math.max(0, fee.finalAmount - newPaidAmount);

          // Update status
          if (fee.remainingAmount <= 0.01) {
            fee.status = 'paid';
          } else if (newPaidAmount > 0) {
            fee.status = 'partial';
            if (fee.dueDate && new Date() > fee.dueDate) {
              fee.status = 'overdue';
            }
          } else {
            fee.status = 'pending';
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
          totalReversedAmount += totalPaymentAmountForFee;
        }
      }

      // Delete vouchers from all StudentFee records
      let deletedForThisStudent = false;
      for (const fee of feesWithVoucher) {
        if (fee.vouchers && Array.isArray(fee.vouchers)) {
          const originalLength = fee.vouchers.length;
          
          // Capture voucher numbers before deleting
          const vouchersToDelete = fee.vouchers.filter(v => 
            (v && Number(v.month) === Number(month) && Number(v.year) === Number(year))
          );
          vouchersToDelete.forEach(v => {
            if (v.voucherNumber && !deletedVoucherNumbers.includes(v.voucherNumber)) {
              deletedVoucherNumbers.push(v.voucherNumber);
            }
          });

          fee.vouchers = fee.vouchers.filter(v => 
            !(v && Number(v.month) === Number(month) && Number(v.year) === Number(year))
          );
          
          if (fee.vouchers.length < originalLength) {
            fee.markModified('vouchers');
            await fee.save();
            totalDeletedVouchers += (originalLength - fee.vouchers.length);
            deletedForThisStudent = true;
          }
        }
      }
      
      if (deletedForThisStudent && student) {
        const sName = student.name || student.personalDetails?.name || student.firstName || 'Unknown Student';
        if (!deletedStudentNames.includes(sName)) {
           deletedStudentNames.push(sName);
        }
      }
    }

    return {
      success: true,
      message: totalDeletedVouchers > 0 
        ? `Successfully deleted ${totalDeletedVouchers} voucher(s) for ${idsToProcess.length} student(s)${totalReversedPayments > 0 ? `. Reversed ${totalReversedPayments} payments totaled Rs. ${totalReversedAmount}` : ''}`
        : `No matching vouchers found to delete for the selected student(s).`,
      totalDeletedVouchers,
      totalReversedPayments,
      totalReversedAmount,
      deletedStudentNames,
      deletedVoucherNumbers
    };
  }

  // Suspense Management - Record unidentified payment
  async recordSuspenseEntry(suspenseData, currentUser) {
    const institutionId = suspenseData.institution || getInstitutionId(currentUser);
    
    const suspenseEntry = await SuspenseEntry.create({
      ...suspenseData,
      institution: institutionId,
      createdBy: currentUser._id
    });

    return suspenseEntry;
  }

  // Suspense Management - Get unidentified payments
  async getSuspenseEntries(filters = {}, currentUser) {
    const institutionId = filters.institution || getInstitutionId(currentUser);
    
    // Create query object
    const query = {};
    if (institutionId) query.institution = institutionId;
    
    // Status filter (default to unidentified)
    query.status = filters.status || 'unidentified';

    // Transaction ID filter
    if (filters.transactionId) {
      query.transactionId = { $regex: filters.transactionId, $options: 'i' };
    }

    // Add date range filtering
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

    const entries = await SuspenseEntry.find(query)
      .populate('reconciledData.student', 'firstName lastName admissionNumber')
      .populate('reconciledData.payment', 'receiptNumber')
      .populate('createdBy', 'name')
      .sort({ paymentDate: -1 });

    return entries;
  }

  // Suspense Management - Reconcile unidentified payment to a student
  async reconcileSuspenseEntry(reconciliationData, currentUser) {
    const { suspenseEntryId, studentId, studentFeeId, studentFeeIds, remarks } = reconciliationData;

    // Find suspense entry by ID and unidentified status (global lookup across campuses)
    const suspenseEntry = await SuspenseEntry.findOne({
      _id: suspenseEntryId,
      status: 'unidentified'
    });

    if (!suspenseEntry) {
      throw new ApiError(404, 'Unidentified payment entry not found or already reconciled');
    }

    // Find student by ID (global lookup across campuses)
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    const institutionId = student.institution || reconciliationData.institution || suspenseEntry.institution;

    // Support multiple student fee selection or single studentFeeId
    let targetFeeIds = [];
    if (Array.isArray(studentFeeIds) && studentFeeIds.length > 0) {
      targetFeeIds = studentFeeIds;
    } else if (studentFeeId) {
      targetFeeIds = [studentFeeId];
    } else {
      throw new ApiError(400, 'Please select at least one fee item to pay');
    }

    // Fetch the target student fees
    const feesToPay = await StudentFee.find({
      _id: { $in: targetFeeIds },
      student: studentId
    }).populate('feeHead');

    if (feesToPay.length === 0) {
      throw new ApiError(404, 'Selected student fees not found');
    }

    // Determine the latest voucher number AMONG THE SELECTED FEES TO PAY
    // (e.g. if reconciling Aug, Sep, Oct, the payment should be under October's voucher,
    // NOT under an unpaid future month like November that was NOT selected/paid).
    let latestVoucherNumber = null;
    let latestFeeYear = -1;
    let latestFeeMonth = -1;

    feesToPay.forEach(sf => {
      (sf.vouchers || []).forEach(v => {
        if (!v || !v.voucherNumber) return;
        const vYear = Number(v.year) || 0;
        const vMonth = Number(v.month) || 0;
        if (vYear > latestFeeYear || (vYear === latestFeeYear && vMonth >= latestFeeMonth)) {
          latestFeeYear = vYear;
          latestFeeMonth = vMonth;
          latestVoucherNumber = v.voucherNumber.toString().trim();
        }
      });
    });

    // Fallback: if none of the selected fees have vouchers, check fee year/month or other student fees
    if (!latestVoucherNumber) {
      for (const f of feesToPay) {
        if (f.vouchers && f.vouchers.length > 0 && f.vouchers[0].voucherNumber) {
          latestVoucherNumber = f.vouchers[0].voucherNumber;
          break;
        }
      }
    }

    // Sort target fees chronologically (oldest month first) so older arrears get cleared first
    feesToPay.sort((a, b) => {
      const aV = a.vouchers && a.vouchers.length > 0 ? a.vouchers[0] : null;
      const bV = b.vouchers && b.vouchers.length > 0 ? b.vouchers[0] : null;
      const aYear = aV ? Number(aV.year) : (a.year || 0);
      const bYear = bV ? Number(bV.year) : (b.year || 0);
      const aMonth = aV ? Number(aV.month) : (a.month || 0);
      const bMonth = bV ? Number(bV.month) : (b.month || 0);
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });

    let availableFund = suspenseEntry.amount;
    let totalPaidInBatch = 0;
    const recordedPayments = [];

    for (const sf of feesToPay) {
      if (availableFund <= 0.01) break;

      const remaining = Math.max(0, (sf.finalAmount || 0) - (sf.paidAmount || 0));
      if (remaining <= 0.01) continue;

      const payThis = Math.min(availableFund, remaining);

      // Record payment under the latest voucher number
      const paymentData = {
        student: studentId,
        studentFeeId: sf._id,
        amount: Math.round(payThis * 100) / 100,
        paymentDate: suspenseEntry.paymentDate,
        paymentMethod: suspenseEntry.paymentMethod,
        transactionId: suspenseEntry.transactionId ? suspenseEntry.transactionId.trim() : undefined,
        bankName: suspenseEntry.bankName,
        remarks: `[Reconciled from Suspense] ${remarks || ''}`.trim(),
        voucherNumber: latestVoucherNumber,
        isFromSuspense: true
      };

      const pResult = await this.recordPayment(paymentData, currentUser);
      recordedPayments.push(pResult.payment);

      totalPaidInBatch += payThis;
      availableFund = Math.max(0, Math.round((availableFund - payThis) * 100) / 100);
    }

    if (recordedPayments.length === 0) {
      throw new ApiError(400, 'Selected fee items are already fully paid or cannot be reconciled');
    }

    const firstPayment = recordedPayments[0];
    let reconciledSuspenseEntry = suspenseEntry;
    const remainingBalance = availableFund;

    if (remainingBalance > 0.01) {
      // Split: original entry keeps remaining balance and stays unidentified
      suspenseEntry.amount = remainingBalance;
      const studentName = student?.personalDetails?.name || studentId;
      suspenseEntry.remarks = `Balance after reconciling ${totalPaidInBatch} to ${studentName}`;
      await suspenseEntry.save();

      // Create a reconciled entry for the paid portion
      reconciledSuspenseEntry = await SuspenseEntry.create({
        institution: institutionId,
        amount: totalPaidInBatch,
        paymentDate: suspenseEntry.paymentDate,
        paymentMethod: suspenseEntry.paymentMethod,
        transactionId: suspenseEntry.transactionId ? `${suspenseEntry.transactionId}_PAID_${Date.now()}` : undefined,
        bankName: suspenseEntry.bankName,
        remarks: `[Reconciled Portion] ${remarks || ''}`.trim(),
        status: 'reconciled',
        reconciledData: {
          student: studentId,
          payment: firstPayment._id,
          reconciledAt: Date.now(),
          reconciledBy: currentUser._id
        },
        createdBy: currentUser._id
      });
    } else {
      // Fully reconciled
      suspenseEntry.status = 'reconciled';
      suspenseEntry.reconciledData = {
        student: studentId,
        payment: firstPayment._id,
        reconciledAt: Date.now(),
        reconciledBy: currentUser._id
      };
      await suspenseEntry.save();
    }

    return {
      message: remainingBalance > 0.01
        ? `Partial reconciliation successful. Balance of ${remainingBalance} remains.`
        : 'Suspense entry reconciled successfully',
      payment: firstPayment,
      payments: recordedPayments,
      suspenseEntry: reconciledSuspenseEntry,
      remainingBalance: remainingBalance > 0.01 ? remainingBalance : 0,
      voucherNumber: latestVoucherNumber
    };
  }

  /**
   * Delete a suspense entry (only unidentified ones can be deleted)
   */
  async deleteSuspenseEntry(suspenseEntryId, currentUser) {
    if (!suspenseEntryId) {
      throw new ApiError(400, 'Suspense entry ID is required');
    }

    const institutionId = getInstitutionId(currentUser);
    const query = { _id: suspenseEntryId };
    if (institutionId) query.institution = institutionId;

    const suspenseEntry = await SuspenseEntry.findOne(query);
    if (!suspenseEntry) {
      throw new ApiError(404, 'Suspense entry not found');
    }

    if (suspenseEntry.status === 'reconciled') {
      throw new ApiError(400, 'Cannot delete a reconciled suspense entry');
    }

    await SuspenseEntry.findByIdAndDelete(suspenseEntryId);
    return { message: 'Suspense entry deleted successfully' };
  }

  /**
   * Reverse a fee payment (refund)
   * Updates StudentFee paidAmount and status
   * Marks FeePayment as refunded
   */
  async reversePayment(paymentId, currentUser) {
    if (!paymentId) {
      throw new ApiError(400, 'Payment ID is required');
    }

    const FeePayment = require('../models/FeePayment');
    const payment = await FeePayment.findById(paymentId);

    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    // Step 2: If already refunded, perform permanent delete
    if (payment.status === 'refunded') {
      await FeePayment.findByIdAndDelete(paymentId);
      return { 
        message: 'Payment record permanently deleted',
        deleted: true
      };
    }

    // Step 1: Mark as refunded
    const paymentAmount = payment.amount || 0;

    // Get the StudentFee record
    const studentFee = await StudentFee.findById(payment.studentFee);

    if (studentFee) {
      // Update StudentFee payment tracking only if it exists
      const oldPaidAmount = studentFee.paidAmount || 0;
      const newPaidAmount = Math.max(0, oldPaidAmount - paymentAmount);
      
      studentFee.paidAmount = newPaidAmount;
      studentFee.remainingAmount = Math.max(0, studentFee.finalAmount - newPaidAmount);

      // Update lastPaymentDate to the previous valid payment if any
      const latestOtherPayment = await FeePayment.findOne({
        studentFee: studentFee._id,
        _id: { $ne: paymentId },
        status: 'completed'
      }).sort({ paymentDate: -1 });

      studentFee.lastPaymentDate = latestOtherPayment ? latestOtherPayment.paymentDate : null;

      // Update status
      if (studentFee.remainingAmount <= 0) {
        studentFee.status = 'paid';
      } else if (newPaidAmount > 0) {
        studentFee.status = 'partial';
        if (studentFee.dueDate && new Date() > studentFee.dueDate) {
          studentFee.status = 'overdue';
        }
      } else {
        studentFee.status = 'pending';
        if (studentFee.dueDate && new Date() > studentFee.dueDate) {
          studentFee.status = 'overdue';
        }
      }

      await studentFee.save();
    }

    // Update FeePayment record to refunded status
    payment.status = 'refunded';
    payment.refundAmount = paymentAmount;
    payment.refundDate = new Date();
    payment.refundReason = studentFee ? 'Manually reversed by user' : 'Reversed (Associated fee/student record missing)';
    payment.updatedAt = new Date();
    await payment.save();

    return {
      message: studentFee ? 'Payment reversed and marked as refunded' : 'Payment marked as refunded (Associated record missing)',
      payment,
      studentFee: studentFee || null
    };
  }

  /**
   * Bulk reverse or delete fee payments
   * @param {Array} paymentIds - Array of payment IDs to process
   * @param {Object} currentUser - Current user object
   */
  async bulkReversePayments(paymentIds, currentUser) {
    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      throw new ApiError(400, 'Payment IDs are required');
    }

    const results = {
      total: paymentIds.length,
      refunded: 0,
      deleted: 0,
      errors: []
    };

    for (const paymentId of paymentIds) {
      try {
        const result = await this.reversePayment(paymentId, currentUser);
        if (result.deleted) {
          results.deleted++;
        } else {
          results.refunded++;
        }
      } catch (error) {
        results.errors.push({ id: paymentId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Bulk update student fees by amount or percentage
   * @param {Object} data - Update parameters
   * @param {Object} currentUser - Current user object
   */
  async bulkUpdateStudentFees(data, currentUser) {
    const { studentIds, feeHeadIds, type, value, operation } = data;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new ApiError(400, 'Please select at least one student');
    }

    if (!feeHeadIds || !Array.isArray(feeHeadIds) || feeHeadIds.length === 0) {
      throw new ApiError(400, 'Please select at least one fee head');
    }

    if (value === undefined || isNaN(parseFloat(value))) {
      throw new ApiError(400, 'Please provide a valid numeric value');
    }

    const numericValue = parseFloat(value);
    const institutionId = data.institution || getInstitutionId(currentUser);
    
    if (!institutionId) {
      throw new ApiError(400, 'Institution ID is required');
    }


    // Find all active StudentFee records for the selected students and fee heads
    const studentFees = await StudentFee.find({
      student: { $in: studentIds },
      feeHead: { $in: feeHeadIds },
      isActive: true,
      institution: institutionId
    });

    if (studentFees.length === 0) {
      throw new ApiError(404, 'No active fee records found for the selected students and fee heads');
    }

    let updatedCount = 0;

    for (const studentFee of studentFees) {
      const hasVouchers = studentFee.vouchers && studentFee.vouchers.length > 0;

      if (!hasVouchers) {
        // Update the existing record if no vouchers exist
        studentFee.discountAmount = numericValue;
        studentFee.discountType = type;
        studentFee.discountOperation = operation;
        studentFee.updatedAt = new Date();
        await studentFee.save();
      } else {
        // Record has vouchers, so it's history. 
        // 1. Deactivate the old record
        studentFee.isActive = false;
        studentFee.updatedAt = new Date();
        await studentFee.save();

        // 2. Create a NEW record for the same fee head with the new structure
        await StudentFee.create({
          institution: studentFee.institution,
          student: studentFee.student,
          feeStructure: studentFee.feeStructure,
          class: studentFee.class,
          feeHead: studentFee.feeHead,
          baseAmount: studentFee.baseAmount,
          discountAmount: numericValue,
          discountType: type,
          discountOperation: operation,
          discountReason: studentFee.discountReason || 'Bulk Update',
          finalAmount: 0, // Will be calculated by pre-save hook
          paidAmount: 0,
          remainingAmount: 0, // Will be calculated by pre-save hook
          status: 'pending',
          dueDate: studentFee.dueDate || new Date(new Date().getFullYear(), new Date().getMonth(), 20),
          academicYear: studentFee.academicYear,
          isActive: true,
          createdBy: currentUser._id
        });
      }
      updatedCount++;
    }

    return {
      updatedCount,
      totalSelected: studentIds.length
    };
  }

  /**
   * Get monthly reconciliations for a given date range
   */
  async getMonthlyReconciliations(filters = {}, currentUser) {
    let institutionId;
    if (currentUser.role !== 'super_admin') {
      institutionId = getInstitutionId(currentUser);
      if (!institutionId) throw new ApiError(400, 'Institution not found for user');
    } else if (filters.institution) {
      institutionId = extractInstitutionId(filters.institution);
    } else {
      throw new ApiError(400, 'Institution is required');
    }
    
    // Build query for MonthReconciliation
    const query = { institution: institutionId };
    if (filters.bankAccount) {
      query.bankAccount = filters.bankAccount;
    } else {
      query.bankAccount = null; // Default to 'All Banks' if not specified
    }
    
    const records = await MonthReconciliation.find(query).lean();
    return records;
  }

  /**
   * Save or Update a Monthly Reconciliation amount
   */
  async saveMonthlyReconciliation(data, currentUser) {
    let institutionId;
    if (currentUser.role !== 'super_admin') {
      institutionId = getInstitutionId(currentUser);
    } else if (data.institution) {
      institutionId = extractInstitutionId(data.institution);
    }
    if (!institutionId) throw new ApiError(400, 'Institution is required');

    const { monthKey, year, month, reconcileAmount, bankAccount } = data;
    if (!monthKey || !year || !month) throw new ApiError(400, 'Month details required');

    let record = await MonthReconciliation.findOne({ 
      institution: institutionId, 
      monthKey,
      bankAccount: bankAccount || null
    });
    
    if (record) {
      record.reconcileAmount = reconcileAmount;
      record.updatedBy = currentUser._id;
      record.updatedAt = new Date();
      await record.save();
    } else {
      record = await MonthReconciliation.create({
        institution: institutionId,
        monthKey,
        year,
        month,
        bankAccount: bankAccount || null,
        reconcileAmount,
        createdBy: currentUser._id,
        updatedBy: currentUser._id
      });
    }

    return record;
  }

  /**
   * Save Attachment path for a monthly reconciliation
   */
  async uploadReconciliationAttachment(monthKey, filePath, currentUser, bankAccount = null, institutionFromRequest = null) {
    let institutionId;
    if (currentUser.role !== 'super_admin') {
      institutionId = getInstitutionId(currentUser);
    } else if (institutionFromRequest) {
      institutionId = extractInstitutionId(institutionFromRequest);
    }
    if (!institutionId) throw new ApiError(400, 'Institution is required');

    let record = await MonthReconciliation.findOne({ 
      institution: institutionId, 
      monthKey,
      bankAccount: bankAccount || null
    });
    if (!record) {
      // Auto-create it with 0 reconcileAmount if balance was naturally 0
      record = await MonthReconciliation.create({
        institution: institutionId,
        monthKey,
        year: parseInt(monthKey.split('-')[0]),
        month: parseInt(monthKey.split('-')[1]),
        bankAccount: bankAccount || null,
        reconcileAmount: 0,
        createdBy: currentUser._id,
        updatedBy: currentUser._id
      });
    }

    record.attachment = filePath;
    record.updatedBy = currentUser._id;
    record.updatedAt = new Date();
    await record.save();

    return record;
  }

  /**
   * Remove Attachment path for a monthly reconciliation
   */
  async removeReconciliationAttachment(monthKey, currentUser, bankAccount = null, institutionFromRequest = null) {
    let institutionId;
    if (currentUser.role !== 'super_admin') {
      institutionId = getInstitutionId(currentUser);
    } else if (institutionFromRequest) {
      institutionId = extractInstitutionId(institutionFromRequest);
    }
    if (!institutionId) throw new ApiError(400, 'Institution is required');

    let record = await MonthReconciliation.findOne({ 
      institution: institutionId, 
      monthKey,
      bankAccount: bankAccount || null
    });
    
    if (record) {
      record.attachment = null;
      record.updatedBy = currentUser._id;
      record.updatedAt = new Date();
      await record.save();
    }

    return record;
  }

  /**
   * Update voucher valid date and due date
   */
  async updateVoucherDates(data, currentUser) {
    const {
      studentIds,
      voucherNumbers,
      month,
      year,
      dueDate,
      validityDate,
      generatedDate
    } = data;

    if (!dueDate && !validityDate && !generatedDate) {
      throw new ApiError(400, 'At least one date (generated date, due date or validity date) must be provided');
    }

    const institutionId = currentUser.role === 'super_admin' && data.institution
      ? data.institution
      : getInstitutionId(currentUser);

    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    const parsedValidityDate = validityDate ? new Date(validityDate) : null;
    const parsedGeneratedDate = generatedDate ? new Date(generatedDate) : null;

    if (parsedDueDate && isNaN(parsedDueDate.getTime())) {
      throw new ApiError(400, 'Invalid Due Date');
    }
    if (parsedValidityDate && isNaN(parsedValidityDate.getTime())) {
      throw new ApiError(400, 'Invalid Validity Date');
    }
    if (parsedGeneratedDate && isNaN(parsedGeneratedDate.getTime())) {
      throw new ApiError(400, 'Invalid Generated Date');
    }

    // Build filter for FeeVoucher records
    const voucherFilter = {};
    if (institutionId) {
      voucherFilter.institution = institutionId;
    }
    if (month && year) {
      voucherFilter.month = Number(month);
      voucherFilter.year = Number(year);
    }

    if (voucherNumbers && Array.isArray(voucherNumbers) && voucherNumbers.length > 0) {
      voucherFilter.voucherNumber = { $in: voucherNumbers.map(v => v.toString().trim()) };
    } else if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      voucherFilter.student = { $in: studentIds };
    }

    // Build updates for FeeVoucher
    const voucherUpdate = {};
    if (parsedDueDate) voucherUpdate.dueDate = parsedDueDate;
    if (parsedValidityDate) voucherUpdate.validityDate = parsedValidityDate;
    if (parsedGeneratedDate) voucherUpdate.generatedAt = parsedGeneratedDate;

    let updatedVouchersCount = 0;
    if (Object.keys(voucherFilter).length > 0) {
      const vResult = await FeeVoucher.updateMany(voucherFilter, { $set: voucherUpdate });
      updatedVouchersCount = vResult.modifiedCount || 0;
    }

    // Update StudentFee records
    const studentFeeFilter = { isActive: true };
    if (institutionId) {
      studentFeeFilter.institution = institutionId;
    }
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      studentFeeFilter.student = { $in: studentIds };
    } else if (voucherNumbers && Array.isArray(voucherNumbers) && voucherNumbers.length > 0) {
      studentFeeFilter['vouchers.voucherNumber'] = { $in: voucherNumbers.map(v => v.toString().trim()) };
    } else if (month && year) {
      studentFeeFilter['vouchers'] = {
        $elemMatch: {
          month: Number(month),
          year: Number(year)
        }
      };
    }

    // Find all matching StudentFees and update the subdocument vouchers + root dates if applicable
    const studentFees = await StudentFee.find(studentFeeFilter);
    let updatedStudentFeesCount = 0;

    for (const sf of studentFees) {
      let modified = false;

      // Update embedded vouchers
      if (Array.isArray(sf.vouchers)) {
        sf.vouchers.forEach(v => {
          let match = true;
          if (month && Number(v.month) !== Number(month)) match = false;
          if (year && Number(v.year) !== Number(year)) match = false;
          if (voucherNumbers && Array.isArray(voucherNumbers) && voucherNumbers.length > 0) {
            const vNo = v.voucherNumber ? v.voucherNumber.toString().trim() : '';
            if (!voucherNumbers.map(x => x.toString().trim()).includes(vNo)) {
              match = false;
            }
          }

          if (match) {
            if (parsedDueDate) v.dueDate = parsedDueDate;
            if (parsedValidityDate) v.validityDate = parsedValidityDate;
            if (parsedGeneratedDate) v.generatedAt = parsedGeneratedDate;
            modified = true;
          }
        });
      }

      // If the StudentFee record itself corresponds to this month/year or has matched vouchers, update root dates
      if (modified) {
        if (parsedDueDate) sf.dueDate = parsedDueDate;
        if (parsedValidityDate) sf.validityDate = parsedValidityDate;
        await sf.save();
        updatedStudentFeesCount++;
      }
    }

    return {
      updatedVouchers: updatedVouchersCount,
      updatedStudentFees: updatedStudentFeesCount,
      dueDate: parsedDueDate,
      validityDate: parsedValidityDate,
      generatedDate: parsedGeneratedDate
    };
  }
}

module.exports = new FeeService();
