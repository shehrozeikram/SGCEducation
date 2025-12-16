const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const groupController = require('../../controllers/group.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isAdmin } = require('../../middleware/rbac.middleware');

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

// Routes accessible by all authenticated users
router.get('/', groupController.getGroups);
router.get('/:id', validateObjectId, groupController.getGroupById);

// Admin only routes
router.post('/', isAdmin, groupController.createGroup);
router.put('/:id', validateObjectId, isAdmin, groupController.updateGroup);
router.delete('/:id', validateObjectId, isAdmin, groupController.deleteGroup);
router.put('/:id/toggle-status', validateObjectId, isAdmin, groupController.toggleGroupStatus);
router.post('/:id/members', validateObjectId, isAdmin, groupController.addMember);
router.delete('/:id/members/:userId', validateObjectId, isAdmin, groupController.removeMember);

module.exports = router;

