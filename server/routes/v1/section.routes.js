const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const sectionController = require('../../controllers/section.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Section Routes - API v1
 * Base path: /api/v1/sections
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

// All routes require authentication
router.use(authenticate);

// Routes accessible by users with academic view permission
router.get('/', hasPermission(PERMISSIONS.ACADEMIC.VIEW), sectionController.getSections);
router.get('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.VIEW), sectionController.getSectionById);

// Admin only routes - requiring academic manage permission
router.post('/', hasPermission(PERMISSIONS.ACADEMIC.MANAGE), sectionController.createSection);
router.put('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), sectionController.updateSection);
router.delete('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), sectionController.deleteSection);
router.put('/:id/toggle-status', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), sectionController.toggleSectionStatus);

module.exports = router;

