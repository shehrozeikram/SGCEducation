const resultService = require('../services/result.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Result Controller - Handles HTTP requests for result management
 */

/**
 * @route   GET /api/v1/results
 * @desc    Get all results
 * @access  Private
 */
const getResults = asyncHandler(async (req, res) => {
  const { institution, academicYear, class: classId, section, examType, subject, status, student, search } = req.query;

  const results = await resultService.getAllResults(
    { institution, academicYear, class: classId, section, examType, subject, status, student, search },
    req.user
  );

  res.json({
    success: true,
    count: results.length,
    data: results
  });
});

/**
 * @route   GET /api/v1/results/:id
 * @desc    Get result by ID
 * @access  Private
 */
const getResultById = asyncHandler(async (req, res) => {
  const result = await resultService.getResultById(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    data: result
  });
});

/**
 * @route   POST /api/v1/results
 * @desc    Create new result
 * @access  Private (Admin, Teacher)
 */
const createResult = asyncHandler(async (req, res) => {
  const result = await resultService.createResult(
    req.body,
    req.user
  );

  res.status(201).json({
    success: true,
    message: 'Result created successfully',
    data: result
  });
});

/**
 * @route   PUT /api/v1/results/:id
 * @desc    Update result
 * @access  Private (Admin, Teacher)
 */
const updateResult = asyncHandler(async (req, res) => {
  const result = await resultService.updateResult(
    req.params.id,
    req.body,
    req.user
  );

  res.json({
    success: true,
    message: 'Result updated successfully',
    data: result
  });
});

/**
 * @route   DELETE /api/v1/results/:id
 * @desc    Delete result
 * @access  Private (Admin)
 */
const deleteResult = asyncHandler(async (req, res) => {
  await resultService.deleteResult(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: 'Result deleted successfully'
  });
});

/**
 * @route   GET /api/v1/results/student/:studentId
 * @desc    Get results by student
 * @access  Private
 */
const getResultsByStudent = asyncHandler(async (req, res) => {
  const { academicYear, examType, subject, status } = req.query;

  const results = await resultService.getResultsByStudent(
    req.params.studentId,
    { academicYear, examType, subject, status },
    req.user
  );

  res.json({
    success: true,
    count: results.length,
    data: results
  });
});

/**
 * @route   GET /api/v1/results/class/:classId
 * @desc    Get results by class
 * @access  Private
 */
const getResultsByClass = asyncHandler(async (req, res) => {
  const { institution, academicYear, section, examType, subject, status } = req.query;

  const results = await resultService.getResultsByClass(
    req.params.classId,
    { institution, academicYear, section, examType, subject, status },
    req.user
  );

  res.json({
    success: true,
    count: results.length,
    data: results
  });
});

/**
 * @route   POST /api/v1/results/bulk
 * @desc    Bulk create results
 * @access  Private (Admin, Teacher)
 */
const bulkCreateResults = asyncHandler(async (req, res) => {
  const results = await resultService.bulkCreateResults(
    req.body.results,
    req.user
  );

  res.status(201).json({
    success: true,
    message: `${results.length} results created successfully`,
    count: results.length,
    data: results
  });
});

/**
 * @route   PUT /api/v1/results/:id/publish
 * @desc    Publish result
 * @access  Private (Admin, Teacher)
 */
const publishResult = asyncHandler(async (req, res) => {
  const result = await resultService.publishResult(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: 'Result published successfully',
    data: result
  });
});

/**
 * @route   GET /api/v1/results/stats/overview
 * @desc    Get result statistics
 * @access  Private
 */
const getResultStats = asyncHandler(async (req, res) => {
  const { institution, academicYear, class: classId, examType } = req.query;

  const stats = await resultService.getResultStats(
    { institution, academicYear, class: classId, examType },
    req.user
  );

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getResults,
  getResultById,
  createResult,
  updateResult,
  deleteResult,
  getResultsByStudent,
  getResultsByClass,
  bulkCreateResults,
  publishResult,
  getResultStats
};
