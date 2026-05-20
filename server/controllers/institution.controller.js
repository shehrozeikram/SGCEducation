const institutionService = require('../services/institution.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Institution Controller - Handles HTTP requests for institution management
 */

/**
 * @route   GET /api/v1/institutions
 * @desc    Get all institutions
 * @access  Private (Super Admin sees all, others see own)
 */
const getInstitutions = asyncHandler(async (req, res) => {
  const { type, isActive, search, organization } = req.query;

  const institutions = await institutionService.getAllInstitutions(
    { type, isActive, search, organization },
    req.user
  );

  res.json({
    success: true,
    count: institutions.length,
    data: institutions
  });
});

/**
 * @route   GET /api/v1/institutions/:id
 * @desc    Get institution by ID
 * @access  Private
 */
const getInstitutionById = asyncHandler(async (req, res) => {
  const institution = await institutionService.getInstitutionById(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    data: institution
  });
});

/**
 * @route   POST /api/v1/institutions
 * @desc    Create new institution
 * @access  Private (Super Admin only)
 */
const createInstitution = asyncHandler(async (req, res) => {
  const institution = await institutionService.createInstitution(
    req.body,
    req.user
  );

  res.status(201).json({
    success: true,
    message: 'Institution created successfully',
    data: institution
  });
});

/**
 * @route   PUT /api/v1/institutions/:id
 * @desc    Update institution
 * @access  Private (Super Admin only)
 */
const updateInstitution = asyncHandler(async (req, res) => {
  const institution = await institutionService.updateInstitution(
    req.params.id,
    req.body,
    req.user
  );

  res.json({
    success: true,
    message: 'Institution updated successfully',
    data: institution
  });
});

/**
 * @route   DELETE /api/v1/institutions/:id
 * @desc    Delete institution (soft delete)
 * @access  Private (Super Admin only)
 */
const deleteInstitution = asyncHandler(async (req, res) => {
  const result = await institutionService.deleteInstitution(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * @route   PUT /api/v1/institutions/:id/toggle-status
 * @desc    Toggle institution active status
 * @access  Private (Super Admin only)
 */
const toggleStatus = asyncHandler(async (req, res) => {
  const institution = await institutionService.toggleInstitutionStatus(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: `Institution ${institution.isActive ? 'activated' : 'deactivated'} successfully`,
    data: institution
  });
});

/**
 * @route   GET /api/v1/institutions/:id/stats
 * @desc    Get institution statistics
 * @access  Private
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await institutionService.getInstitutionStats(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    data: stats
  });
});

/**
 * @route   POST /api/v1/institutions/:id/upload-logo
 * @desc    Upload institution logo
 * @access  Private (Super Admin only)
 */
const uploadLogo = asyncHandler(async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const institution = await institutionService.getInstitutionById(
    req.params.id,
    req.user
  );

  // Delete old logo file if it exists and is in uploads directory
  if (institution.logo && institution.logo.startsWith('/uploads/')) {
    const oldLogoPath = path.join(__dirname, '..', 'public', institution.logo);
    if (fs.existsSync(oldLogoPath)) {
      fs.unlinkSync(oldLogoPath);
    }
  }

  // Update institution with new logo path
  const logoPath = `/uploads/institutions/${req.file.filename}`;
  const updatedInstitution = await institutionService.updateInstitution(
    req.params.id,
    { logo: logoPath },
    req.user
  );

  res.json({
    success: true,
    message: 'Logo uploaded successfully',
    data: {
      logo: logoPath,
      institution: updatedInstitution
    }
  });
});

module.exports = {
  getInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  deleteInstitution,
  toggleStatus,
  getStats,
  uploadLogo
};
