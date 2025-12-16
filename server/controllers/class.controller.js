const classService = require('../services/class.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Get all classes
 */
const getClasses = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    department: req.query.department,
    academicYear: req.query.academicYear,
    isActive: req.query.isActive,
    search: req.query.search
  };

  const classes = await classService.getAllClasses(filters, req.user);
  res.json({
    success: true,
    data: classes
  });
});

/**
 * Get class by ID
 */
const getClassById = asyncHandler(async (req, res) => {
  const classDoc = await classService.getClassById(req.params.id, req.user);
  res.json({
    success: true,
    data: classDoc
  });
});

/**
 * Create new class
 */
const createClass = asyncHandler(async (req, res) => {
  const classDoc = await classService.createClass(req.body, req.user);
  res.status(201).json({
    success: true,
    data: classDoc
  });
});

/**
 * Update class
 */
const updateClass = asyncHandler(async (req, res) => {
  const classDoc = await classService.updateClass(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: classDoc
  });
});

/**
 * Delete class
 */
const deleteClass = asyncHandler(async (req, res) => {
  await classService.deleteClass(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Class deleted successfully'
  });
});

/**
 * Toggle class status
 */
const toggleClassStatus = asyncHandler(async (req, res) => {
  const classDoc = await classService.toggleClassStatus(req.params.id, req.user);
  res.json({
    success: true,
    data: classDoc
  });
});

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  toggleClassStatus
};

