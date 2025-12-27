const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const admissionController = require('../../controllers/admission.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

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

// Routes accessible by all authenticated users
// IMPORTANT: Specific routes must come before parameterized routes (:id)
router.get('/', admissionController.getAdmissions);
router.get('/statuses', admissionController.getAdmissionStatuses);
router.get('/stats/overview', admissionController.getAdmissionStats);

// Analytics route - must be before /:id to avoid route conflicts
// Define analytics routes first to prevent /:id from matching
router.get('/analytics/charts', admissionController.getAdmissionAnalytics);

// Reports route - must be before /:id to avoid route conflicts
router.get('/reports', admissionController.getAdmissionReports);
router.get('/reports/by-date', admissionController.getAdmissionByDateReport);
router.get('/reports/by-month-detailed', admissionController.getAdmissionByMonthDetailedReport);

// Parameterized routes (must come after all specific routes)
// Add validation middleware to ensure only valid ObjectIds match
router.get('/:id', validateObjectId, admissionController.getAdmissionById);

// Admin and staff routes (create, update)
router.post('/', admissionController.createAdmission);
router.put('/:id', validateObjectId, admissionController.updateAdmission);

// Admin only routes (status changes, approval, rejection)
router.put('/:id/status', validateObjectId, isAdmin, admissionController.updateAdmissionStatus);
router.post('/:id/approve-enroll', validateObjectId, isAdmin, admissionController.approveAndEnroll);
router.put('/:id/reject', validateObjectId, isAdmin, admissionController.rejectAdmission);
router.delete('/:id', validateObjectId, isAdmin, admissionController.deleteAdmission);

module.exports = router;
