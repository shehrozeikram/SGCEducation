const express = require('express');
const router = express.Router();
const organizationController = require('../../controllers/organization.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin, isAdmin } = require('../../middleware/rbac.middleware');

/**
 * Organization Routes
 * Base path: /api/v1/organizations
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all organizations (admin can view, but only super_admin can manage)
router.get('/', isAdmin, organizationController.getOrganizations);

// Create new organization (super_admin only)
router.post('/', isSuperAdmin, organizationController.createOrganization);

// Specific routes before parameterized routes
// Get organization statistics (admin can view)
router.get('/:id/stats', isAdmin, organizationController.getStats);

// Get institutions by organization (admin can view)
router.get('/:id/institutions', isAdmin, organizationController.getInstitutions);

// Toggle organization status (super_admin only)
router.put('/:id/toggle-status', isSuperAdmin, organizationController.toggleStatus);

// Get organization by ID (admin can view)
router.get('/:id', isAdmin, organizationController.getOrganizationById);

// Update organization (super_admin only)
router.put('/:id', isSuperAdmin, organizationController.updateOrganization);

// Delete organization (super_admin only)
router.delete('/:id', isSuperAdmin, organizationController.deleteOrganization);

module.exports = router;
