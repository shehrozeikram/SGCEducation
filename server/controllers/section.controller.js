const sectionService = require('../services/section.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Get all sections
 */
const getSections = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    department: req.query.department,
    class: req.query.class,
    academicYear: req.query.academicYear,
    isActive: req.query.isActive,
    search: req.query.search
  };

  const sections = await sectionService.getAllSections(filters, req.user);
  res.json({
    success: true,
    data: sections
  });
});

/**
 * Get section by ID
 */
const getSectionById = asyncHandler(async (req, res) => {
  const section = await sectionService.getSectionById(req.params.id, req.user);
  res.json({
    success: true,
    data: section
  });
});

/**
 * Create new section
 */
const createSection = asyncHandler(async (req, res) => {
  const section = await sectionService.createSection(req.body, req.user);
  res.status(201).json({
    success: true,
    data: section
  });
});

/**
 * Update section
 */
const updateSection = asyncHandler(async (req, res) => {
  const section = await sectionService.updateSection(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: section
  });
});

/**
 * Delete section
 */
const deleteSection = asyncHandler(async (req, res) => {
  await sectionService.deleteSection(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Section deleted successfully'
  });
});

/**
 * Toggle section status
 */
const toggleSectionStatus = asyncHandler(async (req, res) => {
  const section = await sectionService.toggleSectionStatus(req.params.id, req.user);
  res.json({
    success: true,
    data: section
  });
});

module.exports = {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  toggleSectionStatus
};

