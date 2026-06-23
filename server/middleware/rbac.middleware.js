/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access based on user roles
 */

/**
 * Check if user has required role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const Role = require('../models/Role');
const { ROLE_PERMISSIONS, USER_ROLES } = require('../utils/constants');

/**
 * Check if user has required role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const hasRole = allowedRoles.includes(req.user.role);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Check if user has required permission(s)
 * @param {string|string[]} requiredPermissions - Single permission or array of permissions
 */
const hasPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    try {
      // Find role in database for dynamic permissions
      const roleDoc = await Role.findOne({ name: req.user.role, isActive: true });
      
      // Fallback to static permissions if role not found in DB (e.g. during transition)
      const userPermissions = roleDoc ? roleDoc.permissions : (ROLE_PERMISSIONS[req.user.role] || []);

      // Super Admin has all permissions ('*')
      if (userPermissions.includes('*')) {
        return next();
      }

      const hasAllPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have the required permissions for this action.'
        });
      }

      next();
    } catch (err) {
      console.error('RBAC Middleware Error:', err);
      // Fallback to static permissions on DB error to prevent lockout
      const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
      if (userPermissions.includes('*') || requiredPermissions.every(perm => userPermissions.includes(perm))) {
        return next();
      }
      
      res.status(500).json({
        success: false,
        message: 'Error verifying permissions.'
      });
    }
  };
};

/**
 * Check if user has at least one of the required permission(s)
 * @param {string|string[]} requiredPermissions - Array of permissions where at least one is required
 */
const hasAnyPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    try {
      // Find role in database for dynamic permissions
      const roleDoc = await Role.findOne({ name: req.user.role, isActive: true });
      
      // Fallback to static permissions if role not found in DB (e.g. during transition)
      const userPermissions = roleDoc ? roleDoc.permissions : (ROLE_PERMISSIONS[req.user.role] || []);

      // Super Admin has all permissions ('*')
      if (userPermissions.includes('*')) {
        return next();
      }

      const hasSomePermission = requiredPermissions.some(perm => userPermissions.includes(perm));

      if (!hasSomePermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have the required permissions for this action.'
        });
      }

      next();
    } catch (err) {
      console.error('RBAC Middleware Error (hasAnyPermission):', err);
      // Fallback to static permissions on DB error to prevent lockout
      const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
      if (userPermissions.includes('*') || requiredPermissions.some(perm => userPermissions.includes(perm))) {
        return next();
      }
      
      res.status(500).json({
        success: false,
        message: 'Error verifying permissions.'
      });
    }
  };
};

/**
 * Check if user is super admin
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }
  
  if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Super Admin access required. Your role: ${req.user.role}`
    });
  }
  next();
};

/**
 * Check if user is admin (institution admin or super admin)
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }
  
  if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Admin access required. Your role: ${req.user.role}`
    });
  }
  next();
};

/**
 * Check if user belongs to the same institution
 * (Super admin can access all institutions)
 */
const checkInstitutionAccess = (req, res, next) => {
  const { institutionId } = req.params;

  // Super admin has access to all institutions
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // Check if user's institution matches the requested institution
  if (req.user.institution && req.user.institution.toString() !== institutionId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own institution.'
    });
  }

  next();
};

module.exports = {
  authorize,
  hasPermission,
  hasAnyPermission,
  isSuperAdmin,
  isAdmin,
  checkInstitutionAccess
};
