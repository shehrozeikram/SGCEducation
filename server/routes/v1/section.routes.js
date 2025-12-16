const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const sectionController = require('../../controllers/section.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

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

// Routes accessible by all authenticated users
router.get('/', sectionController.getSections);
router.get('/:id', validateObjectId, sectionController.getSectionById);

// Admin only routes
router.post('/', isAdmin, sectionController.createSection);
router.put('/:id', validateObjectId, isAdmin, sectionController.updateSection);
router.delete('/:id', validateObjectId, isAdmin, sectionController.deleteSection);
router.put('/:id/toggle-status', validateObjectId, isAdmin, sectionController.toggleSectionStatus);

module.exports = router;

