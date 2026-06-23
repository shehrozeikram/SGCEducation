const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const groupController = require('../../controllers/group.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Group Routes - API v1
 * Base path: /api/v1/groups
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
router.get('/', hasPermission(PERMISSIONS.ACADEMIC.VIEW), groupController.getGroups);
router.get('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.VIEW), groupController.getGroupById);

// Admin only routes - requiring academic manage permission
router.post('/', hasPermission(PERMISSIONS.ACADEMIC.MANAGE), groupController.createGroup);
router.put('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), groupController.updateGroup);
router.delete('/:id', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), groupController.deleteGroup);
router.put('/:id/toggle-status', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), groupController.toggleGroupStatus);
router.post('/:id/members', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), groupController.addMember);
router.delete('/:id/members/:userId', validateObjectId, hasPermission(PERMISSIONS.ACADEMIC.MANAGE), groupController.removeMember);

module.exports = router;

