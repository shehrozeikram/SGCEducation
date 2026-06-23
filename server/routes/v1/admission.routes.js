const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const admissionController = require('../../controllers/admission.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission, hasAnyPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

// Middleware to validate ObjectId format
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  next();
};

/**
 * Admission Routes - API v1
 * Base path: /api/v1/admissions
 */

// Public route for creating admission application (self-registration)
// Uncomment if you want to allow public admission applications
// router.post('/', admissionController.createAdmission);

// All other routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users with view permission
// IMPORTANT: Specific routes must come before parameterized routes (:id)
router.get('/', hasAnyPermission(PERMISSIONS.ADMISSIONS.VIEW, PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.VIEW_VOUCHER, PERMISSIONS.FEES.PRINT_VOUCHER), admissionController.getAdmissions);
router.get('/statuses', hasPermission(PERMISSIONS.ADMISSIONS.VIEW), admissionController.getAdmissionStatuses);
router.get('/next-roll-number', hasPermission(PERMISSIONS.ADMISSIONS.VIEW), admissionController.getNextRollNumber);
router.get('/stats/overview', hasPermission(PERMISSIONS.ADMISSIONS.VIEW), admissionController.getAdmissionStats);

// Analytics route - must be before /:id to avoid route conflicts
// Define analytics routes first to prevent /:id from matching
router.get('/analytics/charts', hasPermission(PERMISSIONS.ADMISSIONS.VIEW), admissionController.getAdmissionAnalytics);

// Reports route - must be before /:id to avoid route conflicts
router.get('/reports', hasPermission(PERMISSIONS.ADMISSIONS.VIEW), admissionController.getAdmissionReports);
router.get('/reports/by-date', hasPermission(PERMISSIONS.ADMISSIONS.VIEW), admissionController.getAdmissionByDateReport);
router.get('/reports/by-month-detailed', hasPermission(PERMISSIONS.ADMISSIONS.VIEW), admissionController.getAdmissionByMonthDetailedReport);

// Import route - must be before /:id to avoid route conflicts
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
router.post('/import', upload.single('file'), hasPermission(PERMISSIONS.ADMISSIONS.CREATE), admissionController.importAdmissions);

// Parameterized routes (must come after all specific routes)
// Add validation middleware to ensure only valid ObjectIds match
router.get('/:id', validateObjectId, hasAnyPermission(PERMISSIONS.ADMISSIONS.VIEW, PERMISSIONS.FEES.VIEW, PERMISSIONS.FEES.VIEW_VOUCHER, PERMISSIONS.FEES.PRINT_VOUCHER), admissionController.getAdmissionById);

// Admin and staff routes (create, update)
router.post('/', hasPermission(PERMISSIONS.ADMISSIONS.CREATE), admissionController.createAdmission);
router.put('/:id', validateObjectId, hasPermission(PERMISSIONS.ADMISSIONS.EDIT), admissionController.updateAdmission);

// Admin only routes (status changes, approval, rejection)
router.put('/:id/status', validateObjectId, hasPermission(PERMISSIONS.ADMISSIONS.APPROVE), admissionController.updateAdmissionStatus);
router.post('/:id/approve-enroll', validateObjectId, hasPermission(PERMISSIONS.ADMISSIONS.APPROVE), admissionController.approveAndEnroll);
router.put('/:id/reject', validateObjectId, hasPermission(PERMISSIONS.ADMISSIONS.APPROVE), admissionController.rejectAdmission);

// Bulk operations (must come before individual delete route)
router.post('/bulk-soft-delete', hasPermission(PERMISSIONS.ADMISSIONS.DELETE), admissionController.bulkSoftDeleteAdmissions);
router.post('/bulk-permanent-delete', hasPermission(PERMISSIONS.ADMISSIONS.DELETE), admissionController.bulkPermanentlyDeleteAdmissions);
router.post('/restore', hasPermission(PERMISSIONS.ADMISSIONS.DELETE), admissionController.restoreAdmissions);
router.post('/bulk-status-update', hasPermission(PERMISSIONS.ADMISSIONS.APPROVE), admissionController.bulkUpdateStatus);

// Individual delete
router.delete('/:id', validateObjectId, hasPermission(PERMISSIONS.ADMISSIONS.DELETE), admissionController.deleteAdmission);
router.delete('/:id/permanent', validateObjectId, hasPermission(PERMISSIONS.ADMISSIONS.DELETE), admissionController.permanentlyDeleteAdmission);

module.exports = router;
