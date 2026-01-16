const Organization = require('../models/Organization');
const Institution = require('../models/Institution');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId } = require('../utils/userUtils');

/**
 * Organization Service - Business logic for organization management
 */

/**
 * Get all organizations
 * @param {Object} filters - Filter criteria
 * @param {Object} currentUser - Current user object
 * @returns {Promise<Array>} List of organizations
 */
const getAllOrganizations = async (filters = {}, currentUser) => {
  const query = {};

  // Filter by active status if provided
  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  // Filter by type if provided
  if (filters.type) {
    query.type = filters.type;
  }

  // Search by name or code
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { code: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const organizations = await Organization.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  return organizations;
};

/**
 * Get organization by ID
 * @param {String} organizationId - Organization ID
 * @param {Object} currentUser - Current user object
 * @returns {Promise<Object>} Organization object
 */
const getOrganizationById = async (organizationId, currentUser) => {
  const organization = await Organization.findById(organizationId)
    .populate('createdBy', 'name email');

  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }

  return organization;
};

/**
 * Create new organization
 * @param {Object} organizationData - Organization data
 * @param {Object} createdBy - User creating the organization
 * @returns {Promise<Object>} Created organization
 */
const createOrganization = async (organizationData, createdBy) => {
  const { name, code, type, description } = organizationData;

  // Convert name to uppercase for consistency
  const nameUpper = name.trim().toUpperCase();
  const codeUpper = code.trim().toUpperCase();

  // Check if organization with same name or code exists
  const existingOrg = await Organization.findOne({
    $or: [
      { name: nameUpper },
      { code: codeUpper }
    ]
  });

  if (existingOrg) {
    throw new ApiError(400, 'Organization with this name or code already exists');
  }

  const organization = await Organization.create({
    name: nameUpper,
    code: codeUpper,
    type: type || 'mixed',
    description: description?.trim(),
    createdBy: createdBy._id || createdBy
  });

  return await organization.populate('createdBy', 'name email');
};

/**
 * Update organization
 * @param {String} organizationId - Organization ID
 * @param {Object} updateData - Update data
 * @param {Object} currentUser - Current user object
 * @returns {Promise<Object>} Updated organization
 */
const updateOrganization = async (organizationId, updateData, currentUser) => {
  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }

  // Check if name or code conflicts with existing organizations
  if (updateData.name || updateData.code) {
    const nameUpper = updateData.name ? updateData.name.trim().toUpperCase() : null;
    const codeUpper = updateData.code ? updateData.code.trim().toUpperCase() : null;
    
    const existingOrg = await Organization.findOne({
      _id: { $ne: organizationId },
      $or: [
        nameUpper ? { name: nameUpper } : {},
        codeUpper ? { code: codeUpper } : {}
      ]
    });

    if (existingOrg) {
      throw new ApiError(400, 'Organization with this name or code already exists');
    }
  }

  // Update fields (convert name to uppercase)
  if (updateData.name) organization.name = updateData.name.trim().toUpperCase();
  if (updateData.code) organization.code = updateData.code.trim().toUpperCase();
  if (updateData.type) organization.type = updateData.type;
  if (updateData.description !== undefined) organization.description = updateData.description?.trim();
  if (updateData.isActive !== undefined) organization.isActive = updateData.isActive;

  await organization.save();
  return await organization.populate('createdBy', 'name email');
};

/**
 * Delete organization (only if no institutions are associated)
 * @param {String} organizationId - Organization ID
 * @param {Object} currentUser - Current user object
 * @returns {Promise<Object>} Deletion result
 */
const deleteOrganization = async (organizationId, currentUser) => {
  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }

  // Check if any institutions are associated with this organization
  const institutionCount = await Institution.countDocuments({ organization: organizationId });

  if (institutionCount > 0) {
    throw new ApiError(400, `Cannot delete organization. ${institutionCount} institution(s) are associated with it.`);
  }

  await organization.deleteOne();

  return {
    message: 'Organization deleted successfully',
    deletedId: organizationId
  };
};

/**
 * Toggle organization active status
 * @param {String} organizationId - Organization ID
 * @param {Object} currentUser - Current user object
 * @returns {Promise<Object>} Updated organization
 */
const toggleOrganizationStatus = async (organizationId, currentUser) => {
  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }

  organization.isActive = !organization.isActive;
  await organization.save();

  return await organization.populate('createdBy', 'name email');
};

/**
 * Get organization statistics
 * @param {String} organizationId - Organization ID
 * @param {Object} currentUser - Current user object
 * @returns {Promise<Object>} Organization statistics
 */
const getOrganizationStats = async (organizationId, currentUser) => {
  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }

  const institutionCount = await Institution.countDocuments({ 
    organization: organizationId,
    isActive: true 
  });

  return {
    organization: organization,
    totalInstitutions: institutionCount,
    activeInstitutions: institutionCount
  };
};

/**
 * Get institutions by organization
 * @param {String} organizationId - Organization ID
 * @param {Object} currentUser - Current user object
 * @returns {Promise<Array>} List of institutions
 */
const getInstitutionsByOrganization = async (organizationId, currentUser) => {
  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new ApiError(404, 'Organization not found');
  }

  const institutions = await Institution.find({ organization: organizationId })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  return institutions;
};

module.exports = {
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  toggleOrganizationStatus,
  getOrganizationStats,
  getInstitutionsByOrganization
};
