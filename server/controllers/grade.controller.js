const gradeService = require('../services/grade.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Get all grades
 */
const getGrades = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    search: req.query.search
  };

  const grades = await gradeService.getAllGrades(filters, req.user);
  res.json({
    success: true,
    data: grades
  });
});

/**
 * Create new grade
 */
const createGrade = asyncHandler(async (req, res) => {
  const grade = await gradeService.createGrade(req.body, req.user);
  res.status(201).json({
    success: true,
    data: grade
  });
});

module.exports = {
  getGrades,
  createGrade
};


