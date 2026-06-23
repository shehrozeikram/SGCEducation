const mongoose = require('mongoose');
const Institution = require('../models/Institution');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const FeePayment = require('../models/FeePayment');
const StudentFee = require('../models/StudentFee');
const AcademicCalendar = require('../models/AcademicCalendar');
const Admission = require('../models/Admission');
const Group = require('../models/Group');
const Student = require('../models/Student');
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
  // If user is a finance manager, handle with dedicated logic
  if (req.user.role === 'finance_manager') {
    if (!req.user.organization) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any organization.');
    }
    const orgId = req.user.organization._id || req.user.organization;
    const institutions = await Institution.find({ organization: orgId }).select('_id name code');
    const institutionIds = institutions.map(i => i._id);

    const { startDate, endDate, institution } = req.query;
    const hasDates = startDate && endDate;
    let parsedStartDate, parsedEndDate;
    if (hasDates) {
      parsedStartDate = new Date(startDate);
      parsedStartDate.setHours(0, 0, 0, 0);
      parsedEndDate = new Date(endDate);
      parsedEndDate.setHours(23, 59, 59, 999);
    }

    let selectedInstitutionIds = institutionIds;
    if (institution) {
      const requestedInstId = extractInstitutionId(institution);
      if (institutionIds.some(id => id.toString() === requestedInstId.toString())) {
        selectedInstitutionIds = [new mongoose.Types.ObjectId(requestedInstId)];
      } else {
        throw new ApiError(403, 'Access denied. The requested campus does not belong to your organization.');
      }
    }

    // Student filters (using Admission model as requested)
    const studentTotalFilter = { institution: { $in: selectedInstitutionIds } };
    const studentActiveFilter = { institution: { $in: selectedInstitutionIds }, status: 'enrolled' };
    const studentNewAdmissionsFilter = { institution: { $in: selectedInstitutionIds }, status: 'enrolled' };
    
    if (endDate) {
      const parsedEnd = new Date(endDate);
      parsedEnd.setHours(23, 59, 59, 999);
      studentTotalFilter.createdAt = { $lte: parsedEnd };
      studentActiveFilter.createdAt = { $lte: parsedEnd };
    }
    
    if (hasDates) {
      studentNewAdmissionsFilter.admissionDate = { $gte: parsedStartDate, $lte: parsedEndDate };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      studentNewAdmissionsFilter.admissionDate = { $gte: thirtyDaysAgo };
    }
    
    const [totalStudents, activeStudents, newAdmissions] = await Promise.all([
      Admission.countDocuments(studentTotalFilter),
      Admission.countDocuments(studentActiveFilter),
      Admission.countDocuments(studentNewAdmissionsFilter)
    ]);

    // Finance counts - vouchers are embedded in StudentFee.vouchers[] array
    const paymentMatch = { institution: { $in: selectedInstitutionIds }, status: 'completed' };
    if (hasDates) {
      paymentMatch.paymentDate = { $gte: parsedStartDate, $lte: parsedEndDate };
    }

    // Build StudentFee pipeline to find records WITH generated vouchers
    // When date filter exists, match vouchers whose generatedAt falls within range
    const buildStudentFeeReceivablePipeline = (instFilter) => {
      if (hasDates) {
        // Unwind vouchers, filter by date, then de-dup by StudentFee _id
        return [
          { $match: { institution: instFilter, 'vouchers.0': { $exists: true } } },
          { $unwind: '$vouchers' },
          { $match: { 'vouchers.generatedAt': { $gte: parsedStartDate, $lte: parsedEndDate } } },
          { $group: { _id: '$_id', finalAmount: { $first: '$finalAmount' }, remainingAmount: { $first: '$remainingAmount' }, paidAmount: { $first: '$paidAmount' } } },
          { $group: { _id: null, totalReceivable: { $sum: '$finalAmount' }, totalRemaining: { $sum: '$remainingAmount' }, totalPaid: { $sum: '$paidAmount' } } }
        ];
      } else {
        return [
          { $match: { institution: instFilter, 'vouchers.0': { $exists: true } } },
          { $group: { _id: null, totalReceivable: { $sum: '$finalAmount' }, totalRemaining: { $sum: '$remainingAmount' }, totalPaid: { $sum: '$paidAmount' } } }
        ];
      }
    };

    // Previous Receivable & Recovery: use FeeHead lookup to identify arrears-type heads
    const buildArrearsPipeline = (instFilter) => {
      const matchStage = { institution: instFilter, 'vouchers.0': { $exists: true } };
      return [
        { $match: matchStage },
        {
          $lookup: {
            from: 'feeheads',
            localField: 'feeHead',
            foreignField: '_id',
            as: 'feeHeadDoc'
          }
        },
        { $unwind: { path: '$feeHeadDoc', preserveNullAndEmptyArrays: true } },
        { $match: { 'feeHeadDoc.name': { $regex: 'arrears', $options: 'i' } } },
        {
          $group: {
            _id: null,
            totalPreviousReceivable: { $sum: '$finalAmount' },
            totalRecovery: { $sum: '$paidAmount' }
          }
        }
      ];
    };

    const [receivedAgg, studentFeeStats, arrearsStats] = await Promise.all([
      FeePayment.aggregate([
        { $match: paymentMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      StudentFee.aggregate(buildStudentFeeReceivablePipeline({ $in: selectedInstitutionIds })),
      StudentFee.aggregate(buildArrearsPipeline({ $in: selectedInstitutionIds }))
    ]);

    const totalReceived = receivedAgg[0]?.total || 0;
    const totalReceivable = studentFeeStats[0]?.totalReceivable || 0;   // sum of finalAmount from StudentFees with vouchers
    const totalRemaining = studentFeeStats[0]?.totalRemaining || 0;      // sum of remainingAmount (unpaid portion)
    const previousReceivableVal = arrearsStats[0]?.totalPreviousReceivable || 0;
    const recoveryVal = arrearsStats[0]?.totalRecovery || 0;

    // Campus Breakdown
    const campusBreakdown = await Promise.all(institutions.map(async (inst) => {
      const instId = inst._id;
      const paymentMatchInst = { institution: instId, status: 'completed' };
      if (hasDates) {
        paymentMatchInst.paymentDate = { $gte: parsedStartDate, $lte: parsedEndDate };
      }

      const [
        totalStudentsCount,
        activeStudentsCount,
        newAdmissionsCount,
        instReceivedAgg,
        instStudentFeeStats,
        instArrearsStats
      ] = await Promise.all([
        Admission.countDocuments({ institution: instId, ...(parsedEndDate ? { createdAt: { $lte: parsedEndDate } } : {}) }),
        Admission.countDocuments({ institution: instId, status: 'enrolled', ...(parsedEndDate ? { createdAt: { $lte: parsedEndDate } } : {}) }),
        Admission.countDocuments({ 
          institution: instId, 
          status: 'enrolled',
          admissionDate: hasDates 
            ? { $gte: parsedStartDate, $lte: parsedEndDate } 
            : { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
        }),
        FeePayment.aggregate([
          { $match: paymentMatchInst },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        // Total Receivable & Remaining from StudentFee.vouchers[]
        StudentFee.aggregate(buildStudentFeeReceivablePipeline(instId)),
        // Previous Receivable & Recovery via arrears feeHead lookup
        StudentFee.aggregate(buildArrearsPipeline(instId))
      ]);
      
      return {
        _id: instId,
        name: inst.name,
        code: inst.code,
        totalStudents: totalStudentsCount,
        activeStudents: activeStudentsCount,
        newAdmissions: newAdmissionsCount,
        feesGenerated: instStudentFeeStats[0]?.totalReceivable || 0,   // total billed (finalAmount) from StudentFee with vouchers
        feesCollected: instReceivedAgg[0]?.total || 0,
        outstandingDues: instStudentFeeStats[0]?.totalRemaining || 0,  // unpaid remaining
        previousReceivable: instArrearsStats[0]?.totalPreviousReceivable || 0,
        recovery: instArrearsStats[0]?.totalRecovery || 0
      };
    }));


    // Trends calculations for charts
    const paymentTrendMatch = { institution: { $in: selectedInstitutionIds }, status: 'completed' };
    const admissionTrendMatch = { institution: { $in: selectedInstitutionIds }, status: 'enrolled' };
    
    if (hasDates) {
      paymentTrendMatch.paymentDate = { $gte: parsedStartDate, $lte: parsedEndDate };
      admissionTrendMatch.admissionDate = { $gte: parsedStartDate, $lte: parsedEndDate };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      paymentTrendMatch.paymentDate = { $gte: thirtyDaysAgo };
      admissionTrendMatch.admissionDate = { $gte: thirtyDaysAgo };
    }
    
    const [feeCollectionTrend, admissionTrend] = await Promise.all([
      FeePayment.aggregate([
        { $match: paymentTrendMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate', timezone: '+05:00' } },
            amount: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Admission.aggregate([
        { $match: admissionTrendMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$admissionDate', timezone: '+05:00' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    return res.json({
      success: true,
      data: {
        overview: {
          totalInstitutions: institutions.length,
          activeInstitutions: institutions.length,
          totalStudents,
          activeStudents,
          newAdmissions
        },
        finance: {
          totalReceived,
          totalReceivable,          // sum of billedAmount (generated vouchers)
          totalRemaining,            // sum of remainingAmount (unpaid)
          previousReceivable: previousReceivableVal,
          recovery: recoveryVal,
          currency: 'PKR'
        },
        campusBreakdown,
        trends: {
          feeCollectionTrend: feeCollectionTrend.map(t => ({ date: t._id, amount: t.amount })),
          admissionTrend: admissionTrend.map(t => ({ date: t._id, count: t.count }))
        }
      }
    });
  }

  // Build filters based on user role
  let institutionQuery = {}; // For Institution model (_id)
  let referenceQuery = {};   // For models referring to institution (institution)
  let userQuery = {};        // For User model (institution)

  // For super admin viewing specific institution
  if (req.user.role === 'super_admin' && req.query.institution) {
    const institutionId = extractInstitutionId(req.query.institution);
    institutionQuery = { _id: institutionId };
    const objectId = new mongoose.Types.ObjectId(institutionId);
    referenceQuery = { institution: objectId };
    userQuery = { institution: institutionId };
  }
  // For regular admin (scoped to their institution)
  else if (req.user.role === 'admin') {
    const institutionId = getInstitutionId(req.user);
    if (!institutionId) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
    }
    institutionQuery = { _id: institutionId };
    const objectId = new mongoose.Types.ObjectId(institutionId);
    referenceQuery = { institution: objectId };
    userQuery = { institution: institutionId };
  }
  // For super admin viewing all (global view)
  else if (req.user.role === 'super_admin') {
    // No filters - show everything
  }
  // For finance manager (scoped to their organization's institutions)
  else if (req.user.role === 'finance_manager') {
    if (!req.user.organization) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any organization.');
    }
    const orgId = req.user.organization._id || req.user.organization;
    const institutions = await Institution.find({ organization: orgId }).select('_id name code');
    const institutionIds = institutions.map(i => i._id);
    institutionQuery = { _id: { $in: institutionIds } };
    referenceQuery = { institution: { $in: institutionIds } };
    userQuery = { institution: { $in: institutionIds } };
    req.financeInstitutions = institutions; // Save for breakdown
  }
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
        { $match: { ...referenceQuery, status: 'completed' } },
        { $group: { _id: null, totalReceived: { $sum: '$amount' } } }
      ]),
      StudentFee.aggregate([
        { $match: { ...referenceQuery, isActive: true } },
        { $group: { _id: null, totalReceivable: { $sum: '$remainingAmount' } } }
      ])
    ]),
    // Last Month's Fees
    FeePayment.aggregate([
      { 
        $match: { 
          ...referenceQuery, 
          status: 'completed',
          paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Institution.countDocuments({ ...institutionQuery, createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ ...userQuery, createdAt: { $gte: thirtyDaysAgo } }),
    // New Content: Pending Admissions
    Admission.countDocuments({ ...referenceQuery, status: 'pending' }),
    // New Content: Overdue Fees
    StudentFee.countDocuments({ ...referenceQuery, status: 'overdue', isActive: true }),
    // New Content: Upcoming Events
    AcademicCalendar.find({ 
      ...referenceQuery, 
      startDate: { $gte: new Date() } 
    }).sort({ startDate: 1 }).limit(5)
  ]);

  const totalReceived = financialStats[0][0]?.totalReceived || 0;
  const totalReceivable = financialStats[1][0]?.totalReceivable || 0;
  const lastMonthTotal = lastMonthFees[0]?.total || 0;

  // Campus Breakdown for Finance Managers
  let campusBreakdown = [];
  if (req.user.role === 'finance_manager' && req.financeInstitutions) {
    campusBreakdown = await Promise.all(req.financeInstitutions.map(async (inst) => {
      const instQuery = { institution: inst._id };
      const [students, received, receivable] = await Promise.all([
        User.countDocuments({ ...instQuery, role: 'student' }),
        FeePayment.aggregate([
          { $match: { ...instQuery, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        StudentFee.aggregate([
          { $match: { ...instQuery, isActive: true } },
          { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
        ])
      ]);
      
      return {
        _id: inst._id,
        name: inst.name,
        code: inst.code,
        students,
        received: received[0]?.total || 0,
        receivable: receivable[0]?.total || 0
      };
    }));
  }

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
      recentInstitutions,
      campusBreakdown
    }
  });
});

/**
 * @route   GET /api/v1/dashboard/analytics
 * @desc    Get analytics data (growth trends, charts)
 * @access  Private (Super Admin and Admin)
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const { days = 30, institution } = req.query;
  const daysNum = parseInt(days);

  // Normalize startDate to the beginning of the day (00:00:00)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  startDate.setHours(0, 0, 0, 0);

  const institutionId = institution || (req.user.role === 'admin' ? getInstitutionId(req.user) : null);

  // Base match conditions for growth charts
  const userMatch = { isActive: true, createdAt: { $gte: startDate } };
  const groupMatch = { isActive: true, createdAt: { $gte: startDate } };
  const institutionGrowthMatch = { isActive: true, createdAt: { $gte: startDate } };

  if (institutionId) {
    const oid = new mongoose.Types.ObjectId(institutionId);
    institutionGrowthMatch._id = oid;
    userMatch.institution = oid;
    groupMatch.institution = oid;
  }
  else if (req.user.role === 'admin') {
    const id = getInstitutionId(req.user);
    if (!id) throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
    const oid = new mongoose.Types.ObjectId(id);
    institutionGrowthMatch._id = oid;
    userMatch.institution = oid;
    groupMatch.institution = oid;
  }
  else if (req.user.role === 'super_admin') {
    // No specific institution filter
  }
  else if (req.user.role === 'finance_manager') {
    if (!req.user.organization) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any organization.');
    }
    const orgId = req.user.organization._id || req.user.organization;
    const institutions = await Institution.find({ organization: orgId }).select('_id');
    const institutionIds = institutions.map(i => i._id);
    institutionGrowthMatch._id = { $in: institutionIds };
    userMatch.institution = { $in: institutionIds };
    groupMatch.institution = { $in: institutionIds };
  }
  else {
    throw new ApiError(403, 'Access denied. Admin access required.');
  }

  // Get daily growth trends
  const [institutionTrends, userTrends, departmentTrends] = await Promise.all([
    Institution.aggregate([
      { $match: institutionGrowthMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
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
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]),

    Group.aggregate([
      { $match: groupMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
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
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
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
      departmentTrends, // Fulfills frontend's department growth chart (using Groups)
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
