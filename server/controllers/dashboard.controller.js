const Institution = require('../models/Institution');
const User = require('../models/User');
const Department = require('../models/Department');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { buildInstitutionQuery } = require('../middleware/institution.middleware');

/**
 * Dashboard Controller - Handles dashboard statistics
 */

/**
 * @route   GET /api/v1/dashboard/stats
 * @desc    Get overall system statistics (institution-filtered for super admin)
 * @access  Private (Super Admin and Admin)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Build institution filter based on user role
  let institutionQuery = {};
  let userQuery = {};
  let departmentQuery = {};

  // For super admin viewing specific institution
  if (req.user.role === 'super_admin' && req.query.institution) {
    institutionQuery = { _id: req.query.institution };
    userQuery = { institution: req.query.institution };
    departmentQuery = { institution: req.query.institution };
  }
  // For regular admin (scoped to their institution)
  else if (req.user.role === 'admin' && req.user.institution) {
    institutionQuery = { _id: req.user.institution };
    userQuery = { institution: req.user.institution };
    departmentQuery = { institution: req.user.institution };
  }
  // For super admin viewing all (global view)
  else if (req.user.role === 'super_admin') {
    // No filter - show all institutions
  }
  // Regular users without institution
  else {
    throw new ApiError(403, 'Access denied.');
  }

  // Get counts
  const [
    totalInstitutions,
    activeInstitutions,
    inactiveInstitutions,
    totalSchools,
    totalColleges,
    totalDepartments,
    totalUsers,
    totalStudents,
    totalTeachers,
    totalAdmins,
    recentInstitutions
  ] = await Promise.all([
    Institution.countDocuments(institutionQuery),
    Institution.countDocuments({ ...institutionQuery, isActive: true }),
    Institution.countDocuments({ ...institutionQuery, isActive: false }),
    Institution.countDocuments({ ...institutionQuery, type: 'school' }),
    Institution.countDocuments({ ...institutionQuery, type: 'college' }),
    Department.countDocuments(departmentQuery),
    User.countDocuments(userQuery),
    User.countDocuments({ ...userQuery, role: 'student' }),
    User.countDocuments({ ...userQuery, role: 'teacher' }),
    User.countDocuments({ ...userQuery, role: 'admin' }),
    Institution.find(institutionQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name type code isActive createdAt')
      .populate('createdBy', 'name')
  ]);

  // Get institution type breakdown
  const institutionTypeBreakdown = {
    schools: totalSchools,
    colleges: totalColleges
  };

  // Get institution status breakdown
  const institutionStatusBreakdown = {
    active: activeInstitutions,
    inactive: inactiveInstitutions
  };

  // Get user role breakdown
  const userRoleBreakdown = {
    students: totalStudents,
    teachers: totalTeachers,
    admins: totalAdmins,
    superAdmin: await User.countDocuments({ role: 'super_admin' })
  };

  // Calculate growth (created in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentInstitutionsCount, recentUsersCount, recentDepartmentsCount] = await Promise.all([
    Institution.countDocuments({ ...institutionQuery, createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ ...userQuery, createdAt: { $gte: thirtyDaysAgo } }),
    Department.countDocuments({ ...departmentQuery, createdAt: { $gte: thirtyDaysAgo } })
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalInstitutions,
        activeInstitutions,
        inactiveInstitutions,
        totalDepartments,
        totalUsers
      },
      institutions: {
        total: totalInstitutions,
        active: activeInstitutions,
        inactive: inactiveInstitutions,
        typeBreakdown: institutionTypeBreakdown,
        statusBreakdown: institutionStatusBreakdown
      },
      users: {
        total: totalUsers,
        roleBreakdown: userRoleBreakdown
      },
      growth: {
        institutionsLast30Days: recentInstitutionsCount,
        usersLast30Days: recentUsersCount,
        departmentsLast30Days: recentDepartmentsCount
      },
      recentInstitutions
    }
  });
});

/**
 * @route   GET /api/v1/dashboard/analytics
 * @desc    Get analytics data (growth trends, charts)
 * @access  Private (Super Admin and Admin)
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const daysNum = parseInt(days);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);

  // Build match filters based on user role and institution
  let institutionMatch = { createdAt: { $gte: startDate } };
  let userMatch = { createdAt: { $gte: startDate } };
  let departmentMatch = { createdAt: { $gte: startDate } };

  // For super admin viewing specific institution
  if (req.user.role === 'super_admin' && req.query.institution) {
    institutionMatch._id = req.query.institution;
    userMatch.institution = req.query.institution;
    departmentMatch.institution = req.query.institution;
  }
  // For regular admin (scoped to their institution)
  else if (req.user.role === 'admin' && req.user.institution) {
    institutionMatch._id = req.user.institution;
    userMatch.institution = req.user.institution;
    departmentMatch.institution = req.user.institution;
  }
  // For super admin viewing all (global view)
  else if (req.user.role === 'super_admin') {
    // No additional filter
  }
  else {
    throw new ApiError(403, 'Access denied.');
  }

  // Get daily growth trends
  const [institutionTrends, userTrends, departmentTrends] = await Promise.all([
    Institution.aggregate([
      { $match: institutionMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),

    User.aggregate([
      { $match: userMatch },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]),

    Department.aggregate([
      { $match: departmentMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  // Get activity trends if available
  let activityTrends = [];
  try {
    activityTrends = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  } catch (err) {
    // ActivityLog might not exist yet
    console.log('ActivityLog not available');
  }

  res.json({
    success: true,
    data: {
      institutionTrends,
      userTrends,
      departmentTrends,
      activityTrends,
      period: {
        days: daysNum,
        startDate,
        endDate: new Date()
      }
    }
  });
});

module.exports = {
  getDashboardStats,
  getAnalytics
};
