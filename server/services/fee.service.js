const FeeStructure = require('../models/FeeStructure');
const FeeHead = require('../models/FeeHead');
const Class = require('../models/Class');
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
}

module.exports = new FeeService();
