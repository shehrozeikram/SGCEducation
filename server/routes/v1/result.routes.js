const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const resultController = require('../../controllers/result.controller');
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
 * Result Routes - API v1
 * Base path: /api/v1/results
 */

// All routes require authentication
router.use(authenticate);

// Stats route - must be before /:id to avoid route conflicts
router.get('/stats/overview', resultController.getResultStats);

// Specific routes - must come before parameterized routes
router.get('/student/:studentId', resultController.getResultsByStudent);
router.get('/class/:classId', resultController.getResultsByClass);
router.post('/bulk', resultController.bulkCreateResults);

// Main routes
router.get('/', resultController.getResults);
router.post('/', resultController.createResult);

// Parameterized routes (must come after all specific routes)
router.get('/:id', validateObjectId, resultController.getResultById);
router.put('/:id', validateObjectId, resultController.updateResult);
router.delete('/:id', validateObjectId, isAdmin, resultController.deleteResult);
router.put('/:id/publish', validateObjectId, resultController.publishResult);

module.exports = router;
