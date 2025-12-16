const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const classController = require('../../controllers/class.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

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

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', classController.getClasses);
router.get('/:id', validateObjectId, classController.getClassById);

// Admin only routes
router.post('/', isAdmin, classController.createClass);
router.put('/:id', validateObjectId, isAdmin, classController.updateClass);
router.delete('/:id', validateObjectId, isAdmin, classController.deleteClass);
router.put('/:id/toggle-status', validateObjectId, isAdmin, classController.toggleClassStatus);

module.exports = router;

