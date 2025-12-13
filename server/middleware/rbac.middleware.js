/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access based on user roles
 */

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
 * Check if user is super admin
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin access required.'
    });
  }
  next();
};

/**
 * Check if user is admin (institution admin or super admin)
 */
const isAdmin = (req, res, next) => {
  if (!req.user || !['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin access required.'
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
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Check if user's institution matches the requested institution
  if (req.user.institution.toString() !== institutionId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own institution.'
    });
  }

  next();
};

module.exports = {
  authorize,
  isSuperAdmin,
  isAdmin,
  checkInstitutionAccess
};
