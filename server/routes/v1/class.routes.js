const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const classController = require('../../controllers/class.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Class Routes - API v1
 * Base path: /api/v1/classes
 */

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

// Temporary test route
router.get('/test-counts', async (req, res) => {
  try {
    const Admission = require('../../models/Admission');
    const Student = require('../../models/Student');
    
    const allAdmissions = await Admission.countDocuments();
    const enrolledAdmissions = await Admission.countDocuments({ status: 'enrolled' });
    const enrolledAdmissionsWithStudentId = await Admission.countDocuments({ status: 'enrolled', studentId: { $exists: true, $ne: null } });
    
    const allStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });
    
    res.json({
      allAdmissions,
      enrolledAdmissions,
      enrolledAdmissionsWithStudentId,
      allStudents,
      activeStudents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// All routes require authentication
router.use(authenticate);

// Routes accessible by users with academic view permission
router.get('/', hasPermission(PERMISSIONS.ACADEMIC.VIEW), classController.getClasses);
router.get('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.VIEW), classController.getClassById);

// Admin only routes - requiring academic manage permission
router.post('/', hasPermission(PERMISSIONS.ACADEMIC.MANAGE), classController.createClass);
router.put('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), classController.updateClass);
router.delete('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), classController.deleteClass);
router.put('/:id/toggle-status', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), classController.toggleClassStatus);

module.exports = router;

