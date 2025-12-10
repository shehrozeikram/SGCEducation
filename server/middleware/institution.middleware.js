/**
 * Institution Filtering Middleware
 * Handles institution-based access control for multi-tenancy
 */

/**
 * Extract institution from query params or user object
 * For super admins: use institution from query params
 * For regular admins: use institution from user object
 */
const getInstitutionFilter = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Super admin can filter by any institution via query param
    if (user.role === 'super_admin') {
      req.institutionFilter = req.query.institution || null;
    }
    // Regular admins are restricted to their own institution
    else {
      if (!user.institution) {
        return res.status(403).json({
          success: false,
          message: 'User does not belong to any institution'
        });
      }
      req.institutionFilter = user.institution.toString();
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error processing institution filter'
    });
  }
};

/**
 * Require institution filter - ensures an institution is selected
 * Use this for endpoints that MUST have an institution context
 */
const requireInstitutionFilter = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Super admin must provide institution in query
    if (user.role === 'super_admin') {
      if (!req.query.institution) {
        return res.status(400).json({
          success: false,
          message: 'Institution parameter is required for super admin'
        });
      }
      req.institutionFilter = req.query.institution;
    }
    // Regular admins use their assigned institution
    else {
      if (!user.institution) {
        return res.status(403).json({
          success: false,
          message: 'User does not belong to any institution'
        });
      }
      req.institutionFilter = user.institution.toString();
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error processing institution filter'
    });
  }
};

/**
 * Build query filter object for MongoDB
 * Adds institution filter to existing query
 */
const buildInstitutionQuery = (req, baseQuery = {}) => {
  if (req.institutionFilter) {
    return {
      ...baseQuery,
      institution: req.institutionFilter
    };
  }
  return baseQuery;
};

module.exports = {
  getInstitutionFilter,
  requireInstitutionFilter,
  buildInstitutionQuery
};
