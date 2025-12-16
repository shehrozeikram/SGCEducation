const FeeType = require('../models/FeeType');
const { ApiError } = require('../middleware/error.middleware');

/**
 * FeeType Service - Handles fee type-related business logic
 */
class FeeTypeService {
  /**
   * Get all fee types (filtered by user role and institution)
   */
  async getAllFeeTypes(filters = {}, currentUser) {
    const query = { isActive: true };

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      if (currentUser.institution) {
        query.$or = [
          { institution: currentUser.institution },
          { institution: null } // Global fee types
        ];
      }
    } else if (filters.institution) {
      query.$or = [
        { institution: filters.institution },
        { institution: null } // Global fee types
      ];
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const feeTypes = await FeeType.find(query)
      .populate('institution', 'name type code')
      .sort({ name: 1 });

    return feeTypes;
  }

  /**
   * Create new fee type
   */
  async createFeeType(feeTypeData, currentUser) {
    feeTypeData.createdBy = currentUser._id;

    // If not super admin, set institution from user
    if (currentUser.role !== 'super_admin' && currentUser.institution) {
      feeTypeData.institution = currentUser.institution;
    }

    const feeType = await FeeType.create(feeTypeData);
    return await FeeType.findById(feeType._id).populate('institution', 'name type code');
  }
}

module.exports = new FeeTypeService();


