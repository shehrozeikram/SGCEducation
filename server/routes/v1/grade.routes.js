const express = require('express');
const router = express.Router();
const gradeController = require('../../controllers/grade.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

/**
 * Grade Routes - API v1
 * Base path: /api/v1/grades
 */

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', gradeController.getGrades);

// Admin only routes
router.post('/', isAdmin, gradeController.createGrade);

module.exports = router;


