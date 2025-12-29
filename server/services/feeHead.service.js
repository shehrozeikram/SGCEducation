const FeeHead = require('../models/FeeHead');
const { ApiError } = require('../middleware/error.middleware');
const mongoose = require('mongoose');

/**
 * Fee Head Service - Handles fee head-related business logic
 */
class FeeHeadService {
  /**
   * Get all fee heads (filtered by user role and institution)
   */
  async getAllFeeHeads(filters = {}, currentUser) {
    const query = {};

    // Fee heads are now shared across all institutions
    // No institution filtering - return all shared fee heads
    // (institution field is null for shared fee heads)

    // Apply additional filters
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    } else {
      // By default, show only active fee heads
      query.isActive = true;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { accountType: { $regex: filters.search, $options: 'i' } },
        { frequencyType: { $regex: filters.search, $options: 'i' } }
      ];
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

    // Fee heads are shared across all institutions, so no access check needed
    return feeHead;
  }

  /**
   * Create new fee head
   * Fee heads are now shared across all institutions (institution is set to null)
   */
  async createFeeHead(feeHeadData, createdBy) {
    const { priority } = feeHeadData;

    // Check if priority already exists (globally unique)
    const existingFeeHead = await FeeHead.findOne({
      priority,
      isActive: true
    });

    if (existingFeeHead) {
      throw new ApiError(400, `Priority ${priority} is already assigned to another fee head`);
    }

    // Create fee head with institution set to null (shared across all institutions)
    const feeHead = await FeeHead.create({
      ...feeHeadData,
      institution: null,  // Shared across all institutions
      createdBy: createdBy._id
    });

    return await FeeHead.findById(feeHead._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email');
  }

  /**
   * Update fee head
   */
  async updateFeeHead(feeHeadId, feeHeadData, currentUser) {
    const feeHead = await FeeHead.findById(feeHeadId);

    if (!feeHead) {
      throw new ApiError(404, 'Fee head not found');
    }

    // Fee heads are shared, so no institution-based access check needed
    // All authenticated users can update shared fee heads

    // If priority is being changed, check if new priority exists (globally)
    if (feeHeadData.priority && feeHeadData.priority !== feeHead.priority) {
      const existingFeeHead = await FeeHead.findOne({
        priority: feeHeadData.priority,
        isActive: true,
        _id: { $ne: feeHeadId }
      });

      if (existingFeeHead) {
        throw new ApiError(400, `Priority ${feeHeadData.priority} is already assigned to another fee head`);
      }
    }

    // Ensure institution remains null (shared)
    feeHeadData.institution = null;
    
    Object.assign(feeHead, feeHeadData);
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

    // Fee heads are shared, so no institution-based access check needed
    // All authenticated users can delete shared fee heads

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

    // Fee heads are shared, so no institution-based access check needed

    // Check if priority is available (globally)
    const existingFeeHead = await FeeHead.findOne({
      priority: feeHead.priority,
      isActive: true,
      _id: { $ne: feeHeadId }
    });

    if (existingFeeHead) {
      throw new ApiError(400, `Priority ${feeHead.priority} is already assigned to another active fee head`);
    }

    feeHead.isActive = true;
    await feeHead.save();

    return await FeeHead.findById(feeHead._id)
      .populate('institution', 'name type code')
      .populate('createdBy', 'name email');
  }

  /**
   * Get available priorities (globally, since fee heads are shared)
   */
  async getAvailablePriorities(filters = {}, currentUser) {
    // Fee heads are shared across all institutions, so check globally
    const usedPriorities = await FeeHead.find({ isActive: true }).distinct('priority');
    
    // Generate list of available priorities (assuming max priority of 100)
    const maxPriority = 100;
    const availablePriorities = [];
    
    for (let i = 1; i <= maxPriority; i++) {
      if (!usedPriorities.includes(i)) {
        availablePriorities.push(i);
      }
    }

    return availablePriorities;
  }
}

module.exports = new FeeHeadService();
