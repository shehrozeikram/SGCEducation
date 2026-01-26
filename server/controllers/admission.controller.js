const admissionService = require('../services/admission.service');
const { asyncHandler } = require('../middleware/error.middleware');
const Admission = require('../models/Admission');

/**
 * Admission Controller - Handles HTTP requests for admission management
 */

/**
 * @route   GET /api/v1/admissions
 * @desc    Get all admissions
 * @access  Private
 */
const getAdmissions = asyncHandler(async (req, res) => {
  const { institution, status, academicYear, isActive, search } = req.query;

  const admissions = await admissionService.getAllAdmissions(
    { institution, status, academicYear, isActive, search },
    req.user
  );

  res.json({
    success: true,
    count: admissions.length,
    data: admissions
  });
});

/**
 * @route   GET /api/v1/admissions/:id
 * @desc    Get admission by ID
 * @access  Private
 */
const getAdmissionById = asyncHandler(async (req, res) => {
  const admission = await admissionService.getAdmissionById(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    data: admission
  });
});

/**
 * @route   POST /api/v1/admissions
 * @desc    Create new admission application
 * @access  Public/Private (can be public for self-registration)
 */
const createAdmission = asyncHandler(async (req, res) => {
  const admission = await admissionService.createAdmission(
    req.body,
    req.user
  );

  res.status(201).json({
    success: true,
    message: 'Admission application submitted successfully',
    data: admission
  });
});

/**
 * @route   PUT /api/v1/admissions/:id
 * @desc    Update admission application
 * @access  Private
 */
const updateAdmission = asyncHandler(async (req, res) => {
  const admission = await admissionService.updateAdmission(
    req.params.id,
    req.body,
    req.user
  );

  res.json({
    success: true,
    message: 'Admission updated successfully',
    data: admission
  });
});

/**
 * @route   PUT /api/v1/admissions/:id/status
 * @desc    Update admission status
 * @access  Private (Admin)
 */
const updateAdmissionStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;

  const admission = await admissionService.updateAdmissionStatus(
    req.params.id,
    status,
    remarks,
    req.user
  );

  res.json({
    success: true,
    message: `Admission ${status} successfully`,
    data: admission
  });
});

/**
 * @route   POST /api/v1/admissions/:id/approve-enroll
 * @desc    Approve admission and create student record
 * @access  Private (Admin)
 */
const approveAndEnroll = asyncHandler(async (req, res) => {
  const result = await admissionService.approveAndEnroll(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: 'Student enrolled successfully',
    data: result
  });
});

/**
 * @route   PUT /api/v1/admissions/:id/reject
 * @desc    Reject admission
 * @access  Private (Admin)
 */
const rejectAdmission = asyncHandler(async (req, res) => {
  const { remarks } = req.body;

  const admission = await admissionService.rejectAdmission(
    req.params.id,
    remarks,
    req.user
  );

  res.json({
    success: true,
    message: 'Admission rejected',
    data: admission
  });
});

/**
 * @route   DELETE /api/v1/admissions/:id
 * @desc    Delete admission (soft delete)
 * @access  Private (Admin)
 */
const deleteAdmission = asyncHandler(async (req, res) => {
  const result = await admissionService.deleteAdmission(
    req.params.id,
    req.user
  );

  res.json({
    success: true,
    message: result.message
  });
});

/**
 * @route   GET /api/v1/admissions/stats/overview
 * @desc    Get admission statistics
 * @access  Private
 */
const getAdmissionStats = asyncHandler(async (req, res) => {
  const { institution, academicYear } = req.query;

  const stats = await admissionService.getAdmissionStats(
    { institution, academicYear },
    req.user
  );

  res.json({
    success: true,
    data: stats
  });
});

/**
 * @route   GET /api/v1/admissions/analytics/charts
 * @desc    Get detailed admission analytics for charts
 * @access  Private
 */
const getAdmissionAnalytics = asyncHandler(async (req, res) => {
  const { institution, academicYear, days } = req.query;

  try {
    const analytics = await admissionService.getAdmissionAnalytics(
      { institution, academicYear, days: parseInt(days) },
      req.user
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    // Log error for debugging
    console.error('Admission analytics error:', error);
    throw error; // Let asyncHandler handle it
  }
});

/**
 * @route   GET /api/v1/admissions/reports
 * @desc    Get admission reports based on report type
 * @access  Private
 */
const getAdmissionReports = asyncHandler(async (req, res) => {
  const { reportType, startDate, endDate, month, year, institution, class: classId } = req.query;

  const reportData = await admissionService.getAdmissionReports(
    { reportType, startDate, endDate, month, year, institution, classId },
    req.user
  );

  res.json({
    success: true,
    data: reportData
  });
});

/**
 * @route   GET /api/v1/admissions/reports/by-date
 * @desc    Get admission by date report with fee deposit filters
 * @access  Private
 */
const getAdmissionByDateReport = asyncHandler(async (req, res) => {
  const { institutions, startDate, endDate, reportType } = req.query;

  const reportData = await admissionService.getAdmissionByDateDetailedReport(
    { institutions, startDate, endDate, reportType },
    req.user
  );

  res.json({
    success: true,
    data: reportData
  });
});

/**
 * @route   GET /api/v1/admissions/reports/by-month-detailed
 * @desc    Get detailed admission report by month for export
 * @access  Private
 */
const getAdmissionByMonthDetailedReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;

  const reportData = await admissionService.getAdmissionByMonthDetailedReport(
    { month, year },
    req.user
  );

  res.json({
    success: true,
    data: reportData
  });
});

/**
 * @route   GET /api/v1/admissions/statuses
 * @desc    Get all available admission statuses from the model enum
 * @access  Private
 */
const getAdmissionStatuses = asyncHandler(async (req, res) => {
  // Get the status enum values from the Admission schema
  const statusEnum = Admission.schema.path('status').enumValues || [];
  
  res.json({
    success: true,
    data: statusEnum
  });
});

/**
 * @route   GET /api/v1/admissions/next-roll-number
 * @desc    Get next available roll number
 * @access  Private
 */
const getNextRollNumber = asyncHandler(async (req, res) => {
  const { institution } = req.query;
  const institutionId = institution || req.user.institution;

  const nextRollNumber = await admissionService.getNextRollNumber(institutionId);

  res.json({
    success: true,
    data: nextRollNumber
  });
});

module.exports = {
  getAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  updateAdmissionStatus,
  approveAndEnroll,
  rejectAdmission,
  deleteAdmission,
  getAdmissionStats,
  getAdmissionAnalytics,
  getAdmissionReports,
  getAdmissionByDateReport,
  getAdmissionByMonthDetailedReport,
  getAdmissionStatuses,
  getNextRollNumber
};
