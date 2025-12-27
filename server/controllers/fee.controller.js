const feeService = require('../services/fee.service');
const admissionService = require('../services/admission.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   GET /api/v1/fees/structures
 * @desc    Get all fee structures
 * @access  Private
 */
const getFeeStructures = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    academicYear: req.query.academicYear,
    class: req.query.class,
    feeType: req.query.feeType
  };

  const feeStructures = await feeService.getAllFeeStructures(filters, req.user);
  res.json({
    success: true,
    data: feeStructures
  });
});

/**
 * @route   GET /api/v1/fees/structures/:id
 * @desc    Get fee structure by ID
 * @access  Private
 */
const getFeeStructureById = asyncHandler(async (req, res) => {
  const feeStructure = await feeService.getFeeStructureById(req.params.id, req.user);
  res.json({
    success: true,
    data: feeStructure
  });
});

/**
 * @route   POST /api/v1/fees/structures
 * @desc    Create fee structure
 * @access  Private (Admin, Super Admin)
 */
const createFeeStructure = asyncHandler(async (req, res) => {
  const feeStructure = await feeService.createFeeStructure(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Fee structure created successfully',
    data: feeStructure
  });
});

/**
 * @route   PUT /api/v1/fees/structures/:id
 * @desc    Update fee structure
 * @access  Private (Admin, Super Admin)
 */
const updateFeeStructure = asyncHandler(async (req, res) => {
  const feeStructure = await feeService.updateFeeStructure(req.params.id, req.body, req.user);
  res.json({
    success: true,
    message: 'Fee structure updated successfully',
    data: feeStructure
  });
});

/**
 * @route   DELETE /api/v1/fees/structures/:id
 * @desc    Delete fee structure
 * @access  Private (Admin, Super Admin)
 */
const deleteFeeStructure = asyncHandler(async (req, res) => {
  await feeService.deleteFeeStructure(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Fee structure deleted successfully'
  });
});

/**
 * @route   POST /api/v1/fees/generate
 * @desc    Generate student fees from fee structure
 * @access  Private (Admin, Super Admin)
 */
const generateStudentFees = asyncHandler(async (req, res) => {
  const result = await feeService.generateStudentFees(req.body, req.user);
  res.status(201).json({
    success: true,
    message: `Generated ${result.generated} student fees`,
    data: result
  });
});

/**
 * @route   GET /api/v1/fees/student-fees
 * @desc    Get student fees
 * @access  Private
 */
const getStudentFees = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    student: req.query.student,
    class: req.query.class,
    academicYear: req.query.academicYear,
    status: req.query.status,
    feeType: req.query.feeType,
    overdue: req.query.overdue
  };

  const studentFees = await feeService.getStudentFees(filters, req.user);
  res.json({
    success: true,
    data: studentFees
  });
});

/**
 * @route   GET /api/v1/fees/student-fees/:id
 * @desc    Get student fee by ID
 * @access  Private
 */
const getStudentFeeById = asyncHandler(async (req, res) => {
  const studentFee = await feeService.getStudentFeeById(req.params.id, req.user);
  res.json({
    success: true,
    data: studentFee
  });
});

/**
 * @route   POST /api/v1/fees/payments
 * @desc    Create fee payment
 * @access  Private (Admin, Super Admin)
 */
const createFeePayment = asyncHandler(async (req, res) => {
  const payment = await feeService.createFeePayment(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: payment
  });
});

/**
 * @route   GET /api/v1/fees/payments
 * @desc    Get fee payments
 * @access  Private
 */
const getFeePayments = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    student: req.query.student,
    studentFee: req.query.studentFee,
    status: req.query.status,
    paymentMethod: req.query.paymentMethod,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };

  const payments = await feeService.getFeePayments(filters, req.user);
  res.json({
    success: true,
    data: payments
  });
});

/**
 * @route   GET /api/v1/fees/statistics
 * @desc    Get fee statistics
 * @access  Private
 */
const getFeeStatistics = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    academicYear: req.query.academicYear,
    class: req.query.class
  };

  const statistics = await feeService.getFeeStatistics(filters, req.user);
  res.json({
    success: true,
    data: statistics
  });
});

/**
 * @route   GET /api/v1/fees/misc-operations/students
 * @desc    Get students for misc fee operations
 * @access  Private
 */
const getMiscOperationsStudents = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    status: req.query.status
    // Note: monthYear is not currently used in admission service
    // but can be added if needed for filtering by month/year
  };

  // Normalize status filter - handle both single string and array
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      // Filter out empty values
      filters.status = filters.status.filter(s => s && s.trim() !== '');
      // If empty after filtering, remove the filter
      if (filters.status.length === 0) {
        delete filters.status;
      }
    } else if (typeof filters.status === 'string' && filters.status.trim() === '') {
      delete filters.status;
    }
  }

  // Get admissions with status filter
  // The admission service now handles both single string and array status filters
  const admissions = await admissionService.getAllAdmissions(filters, req.user);

  // Transform admissions to match expected format
  const students = admissions.map(admission => ({
    _id: admission._id,
    id: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
    rollNumber: admission.rollNumber || admission.studentId?.rollNumber || 'N/A',
    admissionNo: admission.admissionNo || admission.applicationNumber || 'N/A',
    name: admission.personalInfo?.firstName && admission.personalInfo?.lastName
      ? `${admission.personalInfo.firstName} ${admission.personalInfo.lastName}`
      : admission.personalInfo?.firstName || 'N/A',
    fatherName: admission.personalInfo?.fatherName || 'N/A',
    status: admission.status || 'pending',
    school: admission.institution?.name || 'N/A',
    class: admission.class?.name || admission.studentId?.currentClass || 'N/A',
    section: admission.section?.name || admission.studentId?.currentSection || 'N/A',
    category: admission.category || 'N/A',
    familyNumber: admission.familyNumber || 'N/A'
  }));

  res.json({
    success: true,
    data: students
  });
});

/**
 * @route   GET /api/v1/fees/structures/matrix
 * @desc    Get fee structure matrix (classes x fee heads)
 * @access  Private
 */
const getFeeStructureMatrix = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    academicYear: req.query.academicYear
  };

  const matrix = await feeService.getFeeStructureMatrix(filters, req.user);
  res.json({
    success: true,
    data: matrix
  });
});

/**
 * @route   POST /api/v1/fees/structures/bulk-save
 * @desc    Bulk save fee structure matrix
 * @access  Private (Admin, Super Admin)
 */
const bulkSaveFeeStructureMatrix = asyncHandler(async (req, res) => {
  const result = await feeService.bulkSaveFeeStructureMatrix(req.body, req.user);
  res.json({
    success: true,
    message: 'Fee structure saved successfully',
    data: result
  });
});

module.exports = {
  getFeeStructures,
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getFeeStructureMatrix,
  bulkSaveFeeStructureMatrix,
  generateStudentFees,
  getStudentFees,
  getStudentFeeById,
  createFeePayment,
  getFeePayments,
  getFeeStatistics,
  getMiscOperationsStudents
};



