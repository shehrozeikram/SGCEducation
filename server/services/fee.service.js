const FeeStructure = require('../models/FeeStructure');
const StudentFee = require('../models/StudentFee');
const FeePayment = require('../models/FeePayment');
const FeeHead = require('../models/FeeHead');
const FeeType = require('../models/FeeType');
const Class = require('../models/Class');
const { ApiError } = require('../middleware/error.middleware');

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
      throw new ApiError(400, 'Institution is required');
    }

    // Get all classes for the institution
    const classes = await Class.find({ 
      institution: institutionId, 
      isActive: true 
    }).sort({ name: 1 });

    // Get all fee heads for the institution (these will be the columns)
    const feeHeads = await FeeHead.find({ 
      institution: institutionId, 
      isActive: true 
    }).sort({ priority: 1 });

    // Get all fee types for the institution (FeeStructure uses feeType)
    const feeTypes = await FeeType.find({ 
      institution: institutionId, 
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

    // Get existing fee structures
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

      // Process each fee head (the keys are feeHead IDs, but we need to convert to feeType IDs)
      // First, get fee heads and fee types to create mapping
      const feeHeads = await FeeHead.find({ 
        institution: institutionId, 
        isActive: true 
      });
      const feeTypes = await FeeType.find({ 
        institution: institutionId, 
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
        const feeTypeId = feeHeadToFeeTypeMap[feeHeadId];
        if (!feeTypeId) {
          // Skip if no matching fee type found
          continue;
        }

        try {
          // Check if fee structure already exists
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
      .populate('student', 'name rollNumber admissionNo')
      .populate('admission', 'admissionNo')
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
}

module.exports = new FeeService();
