const express = require('express');
const router = express.Router();
const organizationController = require('../../controllers/organization.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

/**
 * Organization Routes
 * Base path: /api/v1/organizations
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all organizations (admin can view, but only super_admin can manage)
router.get('/', hasPermission(PERMISSIONS.ORGANIZATIONS.VIEW), organizationController.getOrganizations);

// Create new organization (super_admin only)
router.post('/', hasPermission(PERMISSIONS.ORGANIZATIONS.CREATE), organizationController.createOrganization);

// Specific routes before parameterized routes
// Get organization statistics (admin can view)
router.get('/:id/stats', hasPermission(PERMISSIONS.ORGANIZATIONS.VIEW), organizationController.getStats);

// Get institutions by organization (admin can view)
router.get('/:id/institutions', hasPermission(PERMISSIONS.ORGANIZATIONS.VIEW), organizationController.getInstitutions);

// Toggle organization status (super_admin only)
router.put('/:id/toggle-status', hasPermission(PERMISSIONS.ORGANIZATIONS.EDIT), organizationController.toggleStatus);

// Get organization by ID (admin can view)
router.get('/:id', hasPermission(PERMISSIONS.ORGANIZATIONS.VIEW), organizationController.getOrganizationById);

// Update organization (super_admin only)
router.put('/:id', hasPermission(PERMISSIONS.ORGANIZATIONS.EDIT), organizationController.updateOrganization);

// Delete organization (super_admin only)
router.delete('/:id', hasPermission(PERMISSIONS.ORGANIZATIONS.DELETE), organizationController.deleteOrganization);

module.exports = router;
