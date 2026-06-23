const FeeHead = require('../models/FeeHead');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');

/**
 * FeeHead Service - Handles fee head-related business logic
 */
class FeeHeadService {
  /**
   * Get all fee heads (filtered by user role and institution)
   */
  async getAllFeeHeads(filters = {}, currentUser) {
    const query = { isActive: true }; // Always show only active fee heads

    // Build institution filter
    // For admin users: show fee heads for their institution + global fee heads (institution: null)
    // For super admin: show all fee heads (no filter) or filter by selected institution + global
    const institutionConditions = [];
    if (currentUser.role !== 'super_admin') {
      const userInstitutionId = getInstitutionId(currentUser);
      if (userInstitutionId) {
        // Show fee heads for user's institution and global fee heads
        institutionConditions.push(
          { institution: userInstitutionId },
          { institution: null } // Global fee heads
        );
      } else {
        // If admin has no institution, show only global fee heads
        institutionConditions.push({ institution: null });
      }
    } else if (filters.institution) {
      const filterInstitutionId = extractInstitutionId(filters.institution);
      if (filterInstitutionId) {
        institutionConditions.push(
          { institution: filterInstitutionId },
          { institution: null } // Global fee heads
        );
      } else {
        // If institution filter is invalid, show only global fee heads
        institutionConditions.push({ institution: null });
      }
    }
    // For super admin with no institution filter, don't add any institution conditions (show all)

    // Build search filter
    const searchConditions = [];
    if (filters.search) {
      searchConditions.push(
        { name: { $regex: filters.search, $options: 'i' } },
        { glAccount: { $regex: filters.search, $options: 'i' } },
        { frequencyType: { $regex: filters.search, $options: 'i' } }
      );
    }

    // Combine filters using $and if both exist
    if (institutionConditions.length > 0 && searchConditions.length > 0) {
      query.$and = [
        { $or: institutionConditions },
        { $or: searchConditions }
      ];
    } else if (institutionConditions.length > 0) {
      query.$or = institutionConditions;
    } else if (searchConditions.length > 0) {
      query.$or = searchConditions;
    }

    const feeHeads = await FeeHead.find(query)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email')
      .sort({ priority: 1, createdAt: -1 });

    return feeHeads;
  }

  /**
   * Get fee head by ID
   */
  async getFeeHeadById(feeHeadId, currentUser) {
    const feeHead = await FeeHead.findById(feeHeadId)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email');

    if (!feeHead) {
      throw new ApiError(404, 'Fee head not found');
    }

    // Check access permissions
    if (currentUser.role !== 'super_admin') {
      if (feeHead.institution && 
          feeHead.institution._id.toString() !== getInstitutionId(currentUser)?.toString()) {
        throw new ApiError(403, 'Access denied to this fee head');
      }
    }

    return feeHead;
  }

  /**
   * Create new fee head
   */
  async createFeeHead(feeHeadData, currentUser) {
    const { institution, priority } = feeHeadData;

    // If not super admin, set institution from user
    // If super admin and no institution provided, set to null (global)
    const targetInstitution = currentUser.role !== 'super_admin' 
      ? currentUser.institution 
      : (institution || null);

    // Check if priority is already taken
    // If targetInstitution is null (global), check globally
    // If targetInstitution exists, check only within that institution
    const priorityQuery = targetInstitution 
      ? { institution: targetInstitution }
      : { institution: null };
    
    const existingPriority = await FeeHead.findOne({
      priority,
      ...priorityQuery,
      isActive: true
    });

    if (existingPriority) {
      throw new ApiError(400, `Priority ${priority} is already taken`);
    }

    // Create fee head
    const feeHead = await FeeHead.create({
      ...feeHeadData,
      institution: targetInstitution,
      createdBy: currentUser._id
    });

    return await FeeHead.findById(feeHead._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email');
  }

  /**
   * Update fee head
   */
  async updateFeeHead(feeHeadId, updateData, currentUser) {
    const feeHead = await FeeHead.findById(feeHeadId);

    if (!feeHead) {
      throw new ApiError(404, 'Fee head not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin') {
      if (feeHead.institution && 
          feeHead.institution.toString() !== getInstitutionId(currentUser)?.toString()) {
        throw new ApiError(403, 'You can only update fee heads in your institution');
      }
    }

    // Check if priority is being changed and already exists
    if (updateData.priority && updateData.priority !== feeHead.priority) {
      const targetInstitution = feeHead.institution || null;
      const priorityQuery = targetInstitution 
        ? { institution: targetInstitution }
        : { institution: null };
      
      const existingPriority = await FeeHead.findOne({
        priority: updateData.priority,
        ...priorityQuery,
        isActive: true,
        _id: { $ne: feeHeadId }
      });

      if (existingPriority) {
        throw new ApiError(400, `Priority ${updateData.priority} is already taken`);
      }
    }

    // Update fee head
    Object.assign(feeHead, updateData);
    await feeHead.save();

    return await FeeHead.findById(feeHead._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email');
  }

  /**
   * Delete fee head (soft delete)
   */
  async deleteFeeHead(feeHeadId, currentUser) {
    const feeHead = await FeeHead.findById(feeHeadId);

    if (!feeHead) {
      throw new ApiError(404, 'Fee head not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin') {
      if (feeHead.institution && 
          feeHead.institution.toString() !== getInstitutionId(currentUser)?.toString()) {
        throw new ApiError(403, 'You can only delete fee heads in your institution');
      }
    }

    // Soft delete
    feeHead.isActive = false;
    await feeHead.save();

    return { message: 'Fee head deleted successfully' };
  }

  /**
   * Reactivate fee head
   */
  async reactivateFeeHead(feeHeadId, currentUser) {
    const feeHead = await FeeHead.findById(feeHeadId);

    if (!feeHead) {
      throw new ApiError(404, 'Fee head not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin') {
      if (feeHead.institution && 
          feeHead.institution.toString() !== getInstitutionId(currentUser)?.toString()) {
        throw new ApiError(403, 'You can only reactivate fee heads in your institution');
      }
    }

    // Check if priority is available
    const targetInstitution = feeHead.institution || null;
    const priorityQuery = targetInstitution 
      ? { institution: targetInstitution }
      : { institution: null };
    
    const existingPriority = await FeeHead.findOne({
      priority: feeHead.priority,
      ...priorityQuery,
      isActive: true,
      _id: { $ne: feeHeadId }
    });

    if (existingPriority) {
      throw new ApiError(400, `Cannot reactivate: Priority ${feeHead.priority} is already taken`);
    }

    feeHead.isActive = true;
    await feeHead.save();

    return await FeeHead.findById(feeHead._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email');
  }

  /**
   * Get available priorities
   */
  async getAvailablePriorities(currentUser) {
    const targetInstitution = currentUser.role !== 'super_admin' 
      ? currentUser.institution 
      : null;

    // Get all used priorities
    // If targetInstitution is null (super_admin), return all priorities as available
    // Otherwise, get priorities for the specific institution
    const priorityQuery = targetInstitution 
      ? { institution: targetInstitution }
      : { institution: null };
    
    const usedPriorities = await FeeHead.find({
      ...priorityQuery,
      isActive: true
    }).select('priority');

    const usedPrioritySet = new Set(usedPriorities.map(fh => fh.priority));

    // Return available priorities (1-20)
    const availablePriorities = [];
    for (let i = 1; i <= 20; i++) {
      if (!usedPrioritySet.has(i)) {
        availablePriorities.push(i);
      }
    }

    return availablePriorities;
  }
}

module.exports = new FeeHeadService();
