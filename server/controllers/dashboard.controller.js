const Institution = require('../models/Institution');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const FeePayment = require('../models/FeePayment');
const StudentFee = require('../models/StudentFee');
const AcademicCalendar = require('../models/AcademicCalendar');
const Admission = require('../models/Admission');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { buildInstitutionQuery } = require('../middleware/institution.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');

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

  // For super admin viewing specific institution
  if (req.user.role === 'super_admin' && req.query.institution) {
    const institutionId = extractInstitutionId(req.query.institution);
    institutionQuery = { _id: institutionId };
    userQuery = { institution: institutionId };
  }
  // For regular admin (scoped to their institution)
  else if (req.user.role === 'admin') {
    const institutionId = getInstitutionId(req.user);
    if (!institutionId) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
    }
    institutionQuery = { _id: institutionId };
    userQuery = { institution: institutionId };
  }
  // For super admin viewing all (global view)
  else if (req.user.role === 'super_admin') {
    // No filter - show all institutions
  }
  // Regular users without institution
  else {
    throw new ApiError(403, 'Access denied. Admin access required.');
  }

  // Get counts
  const [
    totalInstitutions,
    activeInstitutions,
    inactiveInstitutions,
    totalSchools,
    totalColleges,
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

  // Financial Statistics
  const startOfLastMonth = new Date();
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
  startOfLastMonth.setDate(1);
  startOfLastMonth.setHours(0, 0, 0, 0);

  const endOfLastMonth = new Date();
  endOfLastMonth.setDate(0);
  endOfLastMonth.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    financialStats,
    lastMonthFees,
    recentInstitutionsCount,
    recentUsersCount,
    pendingAdmissionsCount,
    overdueFeesCount,
    upcomingEvents
  ] = await Promise.all([
    // Total Received and Receivable
    Promise.all([
      FeePayment.aggregate([
        { $match: { ...institutionQuery, status: 'completed' } },
        { $group: { _id: null, totalReceived: { $sum: '$amount' } } }
      ]),
      StudentFee.aggregate([
        { $match: { ...institutionQuery, isActive: true } },
        { $group: { _id: null, totalReceivable: { $sum: '$remainingAmount' } } }
      ])
    ]),
    // Last Month's Fees
    FeePayment.aggregate([
      { 
        $match: { 
          ...institutionQuery, 
          status: 'completed',
          paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Institution.countDocuments({ ...institutionQuery, createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ ...userQuery, createdAt: { $gte: thirtyDaysAgo } }),
    // New Content: Pending Admissions
    Admission.countDocuments({ ...institutionQuery, status: 'pending' }),
    // New Content: Overdue Fees
    StudentFee.countDocuments({ ...institutionQuery, status: 'overdue', isActive: true }),
    // New Content: Upcoming Events
    AcademicCalendar.find({ 
      ...institutionQuery, 
      startDate: { $gte: new Date() } 
    }).sort({ startDate: 1 }).limit(5)
  ]);

  const totalReceived = financialStats[0][0]?.totalReceived || 0;
  const totalReceivable = financialStats[1][0]?.totalReceivable || 0;
  const lastMonthTotal = lastMonthFees[0]?.total || 0;

  res.json({
    success: true,
    data: {
      overview: {
        totalInstitutions,
        activeInstitutions,
        inactiveInstitutions,
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
      },
      finance: {
        totalReceived,
        totalReceivable,
        lastMonthReceived: lastMonthTotal,
        currency: 'PKR'
      },
      administrative: {
        pendingAdmissions: pendingAdmissionsCount,
        overdueFees: overdueFeesCount
      },
      upcomingEvents,
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

  // For super admin viewing specific institution
  if (req.user.role === 'super_admin' && req.query.institution) {
    const institutionId = extractInstitutionId(req.query.institution);
    institutionMatch._id = institutionId;
    userMatch.institution = institutionId;
  }
  // For regular admin (scoped to their institution)
  else if (req.user.role === 'admin') {
    const institutionId = getInstitutionId(req.user);
    if (!institutionId) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
    }
    institutionMatch._id = institutionId;
    userMatch.institution = institutionId;
  }
  // For super admin viewing all (global view)
  else if (req.user.role === 'super_admin') {
    // No additional filter
  }
  else {
    throw new ApiError(403, 'Access denied. Admin access required.');
  }

  // Get daily growth trends
  const [institutionTrends, userTrends] = await Promise.all([
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
