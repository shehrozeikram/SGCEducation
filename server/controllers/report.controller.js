const reportService = require('../services/report.service');
const { asyncHandler } = require('../middleware/error.middleware');

const getReports = asyncHandler(async (req, res) => {
  const { type, isActive } = req.query;
  const reports = await reportService.getReports({ type, isActive }, req.user);

  res.json({
    success: true,
    count: reports.length,
    data: reports
  });
});

const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(req.body, req.user);

  res.status(201).json({
    success: true,
    message: 'Report created successfully',
    data: report
  });
});

const generateReport = asyncHandler(async (req, res) => {
  const result = await reportService.generateReport(req.params.id, req.user);

  res.json({
    success: true,
    data: result
  });
});

const deleteReport = asyncHandler(async (req, res) => {
  const result = await reportService.deleteReport(req.params.id, req.user);

  res.json({
    success: true,
    ...result
  });
});

module.exports = {
  getReports,
  createReport,
  generateReport,
  deleteReport
};
