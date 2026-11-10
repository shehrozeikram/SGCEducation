const mongoose = require('mongoose');
const Institution = require('../models/Institution');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const FeePayment = require('../models/FeePayment');
const StudentFee = require('../models/StudentFee');
const AcademicCalendar = require('../models/AcademicCalendar');
const Admission = require('../models/Student');
const Group = require('../models/Group');
const Student = require('../models/Student');
const BankAccount = require('../models/BankAccount');
const MonthReconciliation = require('../models/MonthReconciliation');
const SuspenseEntry = require('../models/SuspenseEntry');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { buildInstitutionQuery } = require('../middleware/institution.middleware');
const { getInstitutionId, extractInstitutionId } = require('../utils/userUtils');

const activeStudentLookupStages = [
  {
    $lookup: {
      from: 'students',
      localField: 'student',
      foreignField: '_id',
      as: 'studentDoc'
    }
  },
  { $unwind: { path: '$studentDoc', preserveNullAndEmptyArrays: false } },
  { $match: { 'studentDoc.isActive': { $ne: false } } }
];

// Helper: compute dynamic voucher stats matching FeeManagement Print Voucher logic exactly
const toLocalDay = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj)) return '';
  return dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
};

// Helper: compute dynamic voucher stats matching FeeManagement Print Voucher logic exactly
const fetchDynamicVoucherStats = async (matchQuery, dateFilter = null, paymentRange = null) => {
  // Query all student fees and completed payments for the matched institutions
  const [allStudentFees, allPayments] = await Promise.all([
    StudentFee.find(matchQuery)
      .populate({ path: 'feeHead', select: 'name' })
      .populate({ path: 'student', select: '_id isActive' })
      .lean(),
    FeePayment.find({
      ...(matchQuery.institution ? { institution: matchQuery.institution } : {}),
      status: { $in: ['completed', 'success'] }
    }).select('voucherNumber amount studentFee status paymentDate').lean()
  ]);

  // Index payments by voucherNumber (clean trailing number)
  const paymentsByVoucher = new Map();
  const unvoucheredPaymentsByFee = new Map();
  allPayments.forEach(p => {
    if (p.voucherNumber && p.voucherNumber.toString().trim()) {
      let vNo = p.voucherNumber.toString().trim();
      if (vNo.includes('-')) vNo = vNo.split('-').pop();
      if (!paymentsByVoucher.has(vNo)) paymentsByVoucher.set(vNo, []);
      paymentsByVoucher.get(vNo).push(p);
    } else {
      const sfId = p.studentFee?._id?.toString() || p.studentFee?.toString();
      if (sfId) {
        if (!unvoucheredPaymentsByFee.has(sfId)) unvoucheredPaymentsByFee.set(sfId, []);
        unvoucheredPaymentsByFee.get(sfId).push(p);
      }
    }
  });

  const isPaymentInRange = (p) => {
    if (!p.paymentDate) return false;
    const d = new Date(p.paymentDate);
    if (isNaN(d)) return false;
    const day = toLocalDay(d);
    if (paymentRange.startDate && day < paymentRange.startDate) return false;
    if (paymentRange.endDate && day > paymentRange.endDate) return false;
    return true;
  };

  const getHomeVoucherNumber = (sf) => {
    const vs = (sf.vouchers || []).filter(v => v && v.voucherNumber);
    if (vs.length === 0) return null;
    vs.sort((a, b) => (Number(a.year) - Number(b.year)) || (Number(a.month) - Number(b.month)));
    const vNo = vs[0].voucherNumber.toString().trim();
    return vNo.includes('-') ? vNo.split('-').pop() : vNo;
  };

  const isPaymentRangeMode = Boolean(paymentRange && (paymentRange.startDate || paymentRange.endDate));

  // Filter out fees of inactive students
  const activeStudentFees = allStudentFees.filter(sf => sf.student && sf.student.isActive !== false);

  // Group fees by studentId
  const feesByStudent = new Map();
  activeStudentFees.forEach(sf => {
    const sId = (sf.student?._id || sf.student).toString();
    if (!feesByStudent.has(sId)) {
      feesByStudent.set(sId, []);
    }
    feesByStudent.get(sId).push(sf);
  });

  // Collect all voucher keys: `${month}-${year}`
  const monthlyMap = new Map(); // key -> { month, year, vouchers: [] }
  const rangeVouchersList = [];
  const rangeStudentIds = new Set();

  feesByStudent.forEach((studentFees, studentId) => {
    // Find all unique (month, year) vouchers for this student
    const studentVouchersMap = new Map();

    studentFees.forEach(sf => {
      if (sf.vouchers && Array.isArray(sf.vouchers) && sf.vouchers.length > 0) {
        sf.vouchers.forEach(v => {
          if (v && v.month && v.year) {
            if (dateFilter && (dateFilter.startDate || dateFilter.endDate)) {
              let genDate = v.generatedAt ? new Date(v.generatedAt) : (sf.createdAt ? new Date(sf.createdAt) : null);
              if (!genDate) {
                genDate = new Date(Number(v.year), Number(v.month) - 1, 15);
              }
              if (dateFilter.startDate && genDate < dateFilter.startDate) return;
              if (dateFilter.endDate && genDate > dateFilter.endDate) return;
            }

            const key = `${v.month}-${v.year}`;
            if (!studentVouchersMap.has(key)) {
              studentVouchersMap.set(key, { month: Number(v.month), year: Number(v.year) });
            }
          }
        });
      }
    });

    // For each voucher of this student
    studentVouchersMap.forEach(({ month, year }, key) => {
      // 1. Find fees associated with this voucher
      const feesWithVoucher = studentFees.filter(sf => 
        sf.vouchers && sf.vouchers.some(v => v && Number(v.month) === month && Number(v.year) === year)
      );

      // Extract voucher number for this student/month/year
      let voucherNumber = 'N/A';
      for (const sf of feesWithVoucher) {
        const v = (sf.vouchers || []).find(v => v && Number(v.month) === month && Number(v.year) === year && v.voucherNumber);
        if (v && v.voucherNumber) {
          let vNo = v.voucherNumber.toString().trim();
          if (vNo.includes('-')) vNo = vNo.split('-').pop();
          voucherNumber = vNo;
          break;
        }
      }

      let voucherAmount = 0;
      let regularPaid = 0;
      let regularRemaining = 0;

      feesWithVoucher.forEach(sf => {
        const isArrearsHead = sf.feeHead?.name?.toLowerCase() === 'arrears';
        if (!isArrearsHead) {
          voucherAmount += parseFloat(sf.finalAmount || 0);
          regularPaid += parseFloat(sf.paidAmount || 0);
          regularRemaining += Math.max(0, parseFloat(sf.finalAmount || 0) - parseFloat(sf.paidAmount || 0));
        }
      });

      // 2. Calculate dynamic arrears from PREVIOUS periods (fallback if no snapshot)
      let totalBilledPrev = 0;
      let totalPaidPrev = 0;

      studentFees.forEach(f => {
        const hasVouchers = f.vouchers && f.vouchers.length > 0;
        let isPrevious = false;

        if (hasVouchers) {
          isPrevious = f.vouchers.every(v => 
            (Number(v.year) < year) || 
            (Number(v.year) === year && Number(v.month) < month)
          );
        }

        if (isPrevious) {
          const isArrearsHead = f.feeHead?.name?.toLowerCase() === 'arrears';
          if (!isArrearsHead) {
            totalBilledPrev += parseFloat(f.finalAmount || 0);
          }
          totalPaidPrev += parseFloat(f.paidAmount || 0);
        }
      });

      const outstandingPrevArrears = Math.max(0, Math.round((totalBilledPrev - totalPaidPrev) * 100) / 100);

      // Match Print Voucher logic: sum payments made under THIS voucher number for previous fees
      const voucherPayments = voucherNumber !== 'N/A' ? (paymentsByVoucher.get(voucherNumber) || []) : [];
      const paidArrearsViaVoucherNumber = voucherPayments.reduce((sum, p) => {
        const sfId = p.studentFee?._id?.toString() || p.studentFee?.toString();
        const isCurrentFee = feesWithVoucher.some(f => f._id?.toString() === sfId && f.feeHead?.name?.toLowerCase() !== 'arrears');
        if (!isCurrentFee) {
          return sum + parseFloat(p.amount || 0);
        }
        return sum;
      }, 0);

      const arrearsFee = feesWithVoucher.find(sf => sf.feeHead?.name?.toLowerCase() === 'arrears');
      const arrearsPaymentsOnVoucher = arrearsFee ? parseFloat(arrearsFee.paidAmount || 0) : 0;
      const paidArrearsOnThisVoucher = Math.max(paidArrearsViaVoucherNumber, arrearsPaymentsOnVoucher);

      let voucherPaymentDate = null;
      voucherPayments.forEach(p => {
        const d = p.paymentDate ? new Date(p.paymentDate) : null;
        if (d && !isNaN(d) && (!voucherPaymentDate || d > voucherPaymentDate)) voucherPaymentDate = d;
      });

      // Previous Balance (P.Bal):
      // Exact Print Voucher calculation: live arrears capped by snapshot if present
      let previousBalance = 0;
      const liveArrears = Math.max(0, Math.round((outstandingPrevArrears + paidArrearsOnThisVoucher) * 100) / 100);
      if (arrearsFee && parseFloat(arrearsFee.finalAmount || 0) > 0) {
        const snapshotAmount = parseFloat(arrearsFee.finalAmount || arrearsFee.baseAmount || 0);
        previousBalance = Math.min(snapshotAmount, liveArrears);
      } else {
        previousBalance = liveArrears;
      }

      // Current remaining arrears after payments on this voucher
      const currentRemainingArrears = Math.max(0, Math.round((previousBalance - paidArrearsOnThisVoucher) * 100) / 100);

      const displayedBilled = voucherAmount + previousBalance;
      const totalPaidForVoucher = regularPaid + paidArrearsOnThisVoucher;
      const displayedRemaining = Math.max(0, Math.round((displayedBilled - totalPaidForVoucher) * 100) / 100);

      // Determine status
      let voucherStatus = 'unpaid';
      if (displayedRemaining <= 0.01) {
        voucherStatus = 'paid';
      } else if (totalPaidForVoucher > 0) {
        voucherStatus = 'partial';
      } else {
        voucherStatus = 'unpaid';
      }

      let displayedPaidAmount = totalPaidForVoucher;
      let displayedPaymentDate = (totalPaidForVoucher > 0 && voucherPaymentDate) ? voucherPaymentDate.toISOString() : null;

      if (isPaymentRangeMode) {
        const rangePayments = voucherPayments.filter(isPaymentInRange);
        if (voucherNumber !== 'N/A') {
          feesWithVoucher.forEach(f => {
            if (getHomeVoucherNumber(f) !== voucherNumber) return;
            (unvoucheredPaymentsByFee.get(f._id?.toString()) || []).forEach(p => {
              if (isPaymentInRange(p)) rangePayments.push(p);
            });
          });
        }
        displayedPaidAmount = Math.round(rangePayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0) * 100) / 100;
        let latest = null;
        rangePayments.forEach(p => {
          const d = new Date(p.paymentDate);
          if (!isNaN(d) && (!latest || d > latest)) latest = d;
        });
        displayedPaymentDate = (displayedPaidAmount > 0 && latest) ? latest.toISOString() : null;
      }

      let paidArrears = 0;
      let unpaidArrears = 0;
      const effectivePaidForArrears = isPaymentRangeMode ? displayedPaidAmount : totalPaidForVoucher;
      if (voucherStatus === 'paid' || (!isPaymentRangeMode && displayedRemaining <= 0.01)) {
        paidArrears = previousBalance;
        unpaidArrears = 0;
      } else if (effectivePaidForArrears <= 0) {
        paidArrears = 0;
        unpaidArrears = previousBalance;
      } else {
        if (paidArrearsOnThisVoucher > 0) {
          paidArrears = Math.min(previousBalance, paidArrearsOnThisVoucher);
        } else {
          const paymentBeyondCurrent = Math.max(0, effectivePaidForArrears - voucherAmount);
          paidArrears = Math.min(previousBalance, paymentBeyondCurrent);
        }
        unpaidArrears = Math.max(0, Math.round((previousBalance - paidArrears) * 100) / 100);
      }

      const voucherData = {
        studentId,
        voucherNumber,
        month,
        year,
        voucherAmount,
        arrears: previousBalance, // Billed arrears matching Report P.Bal
        displayedBilled,          // Total billed matching Report Receivable
        totalPaid: displayedPaidAmount, // Range-filtered paid amount in range mode
        displayedRemaining: Math.max(0, Math.round((displayedBilled - displayedPaidAmount) * 100) / 100),
        regularRemaining,
        paidArrears,
        unpaidArrears,
        calculatedArrears: currentRemainingArrears,
        paymentDate: displayedPaymentDate,
        voucherStatus
      };

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { month, year, vouchers: [] });
      }
      monthlyMap.get(key).vouchers.push(voucherData);

      // In payment range mode, match Print Voucher filter: only include vouchers with paymentDate inside range
      if (isPaymentRangeMode) {
        if (displayedPaymentDate) {
          const pd = new Date(displayedPaymentDate);
          const payDay = toLocalDay(pd);
          const inRange = (!paymentRange.startDate || payDay >= paymentRange.startDate) &&
                          (!paymentRange.endDate || payDay <= paymentRange.endDate);
          if (inRange) {
            rangeVouchersList.push(voucherData);
            rangeStudentIds.add(studentId);
          }
        }
      }
    });
  });

  const aggregateVoucherList = (voucherList) => {
    let total = voucherList.length;
    let paid = 0;
    let unpaid = 0;
    let partial = 0;
    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalArrears = 0;
    let collectedPaid = 0;
    let collectedPartial = 0;
    let outstandingRegular = 0;
    let outstandingArrears = 0;

    voucherList.forEach(v => {
      if (v.voucherStatus === 'paid') paid++;
      else if (v.voucherStatus === 'partial') partial++;
      else unpaid++;

      totalBilled += v.displayedBilled;
      totalCollected += v.totalPaid;
      totalOutstanding += v.displayedRemaining;
      totalArrears += v.arrears;

      if (v.voucherStatus === 'paid') collectedPaid += v.totalPaid;
      else if (v.voucherStatus === 'partial') collectedPartial += v.totalPaid;

      outstandingRegular += v.regularRemaining;
      outstandingArrears += v.calculatedArrears;
    });

    return {
      total,
      paid,
      unpaid,
      partial,
      totalBilled,
      totalCollected,
      totalOutstanding,
      totalArrears,
      collectedPaid,
      collectedPartial,
      outstandingRegular,
      outstandingArrears
    };
  };

  const monthlyBreakdown = [];
  let allTimeVouchers = [];

  monthlyMap.forEach(({ month, year, vouchers }) => {
    const stats = aggregateVoucherList(vouchers);
    monthlyBreakdown.push({
      _id: { month, year },
      ...stats
    });
    allTimeVouchers.push(...vouchers);
  });

  monthlyBreakdown.sort((a, b) => {
    if (a._id.year !== b._id.year) return b._id.year - a._id.year;
    return b._id.month - a._id.month;
  });

  const allTime = aggregateVoucherList(allTimeVouchers);
  const rangeStats = isPaymentRangeMode ? {
    ...aggregateVoucherList(rangeVouchersList),
    uniqueStudentsCount: rangeStudentIds.size
  } : null;

  return {
    allTime,
    monthlyBreakdown,
    rangeStats
  };
};

/**
 * @route   GET /api/v1/dashboard/stats
 * @desc    Get overall system statistics (institution-filtered for super admin)
 * @access  Private (Super Admin and Admin)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // If user is a finance manager, handle with dedicated logic
  if (req.user.role === 'finance_manager' || req.query.view === 'finance') {
    let institutions = [];
    let institutionIds = [];

    if (req.user.role === 'finance_manager') {
      if (!req.user.organization) {
        throw new ApiError(403, 'Access denied. Your account is not associated with any organization.');
      }
      const orgId = req.user.organization._id || req.user.organization;
      institutions = await Institution.find({ organization: orgId }).select('_id name code');
      institutionIds = institutions.map(i => i._id);
    } else if (req.user.role === 'super_admin') {
      const filter = {};
      if (req.query.organization) {
        filter.organization = req.query.organization;
      }
      institutions = await Institution.find(filter).select('_id name code');
      institutionIds = institutions.map(i => i._id);
    } else if (req.user.role === 'admin') {
      const instId = getInstitutionId(req.user);
      if (!instId) {
        throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
      }
      institutions = await Institution.find({ _id: instId }).select('_id name code');
      institutionIds = institutions.map(i => i._id);
    } else {
      throw new ApiError(403, 'Access denied.');
    }

    const { startDate, endDate, institution, monthKey, paymentStartDate, paymentEndDate, allTime } = req.query;

    let targetMonth = null;
    let targetYear = null;
    if (monthKey) {
      const parts = monthKey.split('-');
      if (parts.length === 2) {
        targetYear = parseInt(parts[0], 10);
        targetMonth = parseInt(parts[1], 10);
      }
    }

    const hasDates = (startDate && endDate) || Boolean(targetYear && targetMonth);
    let parsedStartDate, parsedEndDate;
    if (startDate && endDate) {
      parsedStartDate = new Date(startDate);
      parsedStartDate.setHours(0, 0, 0, 0);
      parsedEndDate = new Date(endDate);
      parsedEndDate.setHours(23, 59, 59, 999);
    } else if (targetYear && targetMonth) {
      parsedStartDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
      parsedEndDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    }

    // Payment date range parsing
    const effectivePaymentStartDate = paymentStartDate || startDate;
    const effectivePaymentEndDate = paymentEndDate || endDate;
    let parsedPaymentStartDate = null;
    let parsedPaymentEndDate = null;
    if (effectivePaymentStartDate) {
      parsedPaymentStartDate = new Date(effectivePaymentStartDate);
      parsedPaymentStartDate.setHours(0, 0, 0, 0);
    }
    if (effectivePaymentEndDate) {
      parsedPaymentEndDate = new Date(effectivePaymentEndDate);
      parsedPaymentEndDate.setHours(23, 59, 59, 999);
    }

    const paymentRangeObj = (effectivePaymentStartDate || effectivePaymentEndDate) ? {
      startDate: effectivePaymentStartDate || '',
      endDate: effectivePaymentEndDate || ''
    } : null;

    let selectedInstitutionIds = institutionIds;
    if (institution && institution !== 'all') {
      const requestedInstId = extractInstitutionId(institution);
      if (institutionIds.some(id => id.toString() === requestedInstId.toString())) {
        selectedInstitutionIds = [new mongoose.Types.ObjectId(requestedInstId)];
      } else {
        throw new ApiError(403, req.user.role === 'super_admin' ? 'Requested campus not found.' : 'Access denied. The requested campus does not belong to your organization.');
      }
    }

    // Student filters
    const studentTotalFilter = { institution: { $in: selectedInstitutionIds } };
    const studentActiveFilter = { institution: { $in: selectedInstitutionIds }, status: { $regex: /^enrolled$/i } };
    const studentNewAdmissionsFilter = { institution: { $in: selectedInstitutionIds }, status: { $regex: /^enrolled$/i } };
    const studentStruckOffFilter = { institution: { $in: selectedInstitutionIds }, status: { $regex: /struck.*off/i } };
    const studentPendingFilter = { institution: { $in: selectedInstitutionIds }, status: { $regex: /^pending$/i } };
    
    if (endDate) {
      const parsedEnd = new Date(endDate);
      parsedEnd.setHours(23, 59, 59, 999);
      studentTotalFilter.createdAt = { $lte: parsedEnd };
      studentActiveFilter.createdAt = { $lte: parsedEnd };
      studentStruckOffFilter.createdAt = { $lte: parsedEnd };
      studentPendingFilter.createdAt = { $lte: parsedEnd };
    }
    
    if (hasDates) {
      studentNewAdmissionsFilter.admissionDate = { $gte: parsedStartDate, $lte: parsedEndDate };
    } else if (allTime === 'true' || (!startDate && !endDate && !paymentStartDate && !paymentEndDate)) {
      // All time: no date boundary on new admissions filter
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      studentNewAdmissionsFilter.admissionDate = { $gte: thirtyDaysAgo };
    }
    
    const [totalStudents, activeStudents, newAdmissions, struckOffStudents, pendingStudents, finVoucherStats] = await Promise.all([
      Admission.countDocuments(studentTotalFilter),
      Admission.countDocuments(studentActiveFilter),
      Admission.countDocuments(studentNewAdmissionsFilter),
      Student.countDocuments(studentStruckOffFilter),
      Student.countDocuments(studentPendingFilter),
      fetchDynamicVoucherStats({ institution: { $in: selectedInstitutionIds }, 'vouchers.0': { $exists: true } }, null, paymentRangeObj)
    ]);

    let overallFinStats = finVoucherStats.allTime;
    if (paymentRangeObj && finVoucherStats.rangeStats) {
      overallFinStats = finVoucherStats.rangeStats;
    } else if (targetYear && targetMonth) {
      const mStat = finVoucherStats.monthlyBreakdown?.find(
        m => Number(m._id?.year) === targetYear && Number(m._id?.month) === targetMonth
      );
      if (mStat) {
        overallFinStats = mStat;
      } else {
        overallFinStats = {
          total: 0,
          paid: 0,
          unpaid: 0,
          partial: 0,
          totalBilled: 0,
          totalCollected: 0,
          totalOutstanding: 0,
          totalArrears: 0,
          collectedPaid: 0,
          collectedPartial: 0,
          outstandingRegular: 0,
          outstandingArrears: 0
        };
      }
    }

    // Payment Date Filter: if specified, query FeePayment for collections within that date range
    let paymentsByCampus = null;
    if (parsedPaymentStartDate || parsedPaymentEndDate) {
      paymentsByCampus = new Map();
      const paymentDateMatch = {
        institution: { $in: selectedInstitutionIds },
        status: 'completed'
      };
      const paymentDateCond = {};
      if (parsedPaymentStartDate) {
        paymentDateCond.$gte = parsedPaymentStartDate;
      }
      if (parsedPaymentEndDate) {
        paymentDateCond.$lte = parsedPaymentEndDate;
      }
      paymentDateMatch.paymentDate = paymentDateCond;

      const pipeline = [{ $match: paymentDateMatch }];

      if (targetYear && targetMonth) {
        pipeline.push(
          {
            $lookup: {
              from: 'studentfees',
              localField: 'studentFee',
              foreignField: '_id',
              as: 'sfDoc'
            }
          },
          { $unwind: { path: '$sfDoc', preserveNullAndEmptyArrays: false } },
          {
            $match: {
              $or: [
                {
                  'sfDoc.vouchers': {
                    $elemMatch: {
                      month: targetMonth,
                      year: targetYear
                    }
                  }
                },
                {
                  voucherNumber: {
                    $regex: new RegExp(`${String(targetMonth).padStart(2, '0')}[-/]${targetYear}|${targetMonth}[-/]${targetYear}`, 'i')
                  }
                }
              ]
            }
          }
        );
      }

      pipeline.push({
        $group: {
          _id: '$institution',
          totalPaid: { $sum: '$amount' }
        }
      });

      const paymentAgg = await FeePayment.aggregate(pipeline);
      paymentAgg.forEach(item => {
        if (item._id) {
          paymentsByCampus.set(item._id.toString(), item.totalPaid || 0);
        }
      });
    }

    let totalCollected = overallFinStats.totalCollected || 0;
    let totalBilled = overallFinStats.totalBilled || 0;
    let totalOutstanding = overallFinStats.totalOutstanding || 0;
    const previousReceivableVal = overallFinStats.totalArrears || 0;
    const recoveryVal = overallFinStats.collectedPaid || 0;

    if (paymentsByCampus !== null) {
      let filteredSum = 0;
      paymentsByCampus.forEach(amt => { filteredSum += amt; });
      totalCollected = filteredSum;
      totalOutstanding = Math.max(0, totalBilled - totalCollected);
    }

    // Campus Breakdown
    const campusBreakdown = await Promise.all(institutions.map(async (inst) => {
      const instId = inst._id;

      const [
        totalStudentsCount,
        activeStudentsCount,
        newAdmissionsCount,
        struckOffCount,
        pendingCount,
        instVoucherStats
      ] = await Promise.all([
        Admission.countDocuments({ institution: instId, ...(endDate ? { createdAt: { $lte: parsedEndDate } } : {}) }),
        Admission.countDocuments({ institution: instId, status: { $regex: /^enrolled$/i }, ...(endDate ? { createdAt: { $lte: parsedEndDate } } : {}) }),
        Admission.countDocuments({ 
          institution: instId, 
          status: { $regex: /^enrolled$/i },
          ...(hasDates 
            ? { admissionDate: { $gte: parsedStartDate, $lte: parsedEndDate } } 
            : ((allTime === 'true' || (!startDate && !endDate && !paymentStartDate && !paymentEndDate)) ? {} : { admissionDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
          )
        }),
        Student.countDocuments({ institution: instId, status: { $regex: /struck.*off/i }, ...(endDate ? { createdAt: { $lte: parsedEndDate } } : {}) }),
        Student.countDocuments({ institution: instId, status: { $regex: /^pending$/i }, ...(endDate ? { createdAt: { $lte: parsedEndDate } } : {}) }),
        fetchDynamicVoucherStats({ institution: instId, 'vouchers.0': { $exists: true } }, null, paymentRangeObj)
      ]);
      
      let instFinStats = instVoucherStats.allTime;
      if (paymentRangeObj && instVoucherStats.rangeStats) {
        instFinStats = instVoucherStats.rangeStats;
      } else if (targetYear && targetMonth) {
        const mStat = instVoucherStats.monthlyBreakdown?.find(
          m => Number(m._id?.year) === targetYear && Number(m._id?.month) === targetMonth
        );
        if (mStat) {
          instFinStats = mStat;
        } else {
          instFinStats = {
            total: 0,
            paid: 0,
            unpaid: 0,
            partial: 0,
            totalBilled: 0,
            totalCollected: 0,
            totalOutstanding: 0,
            totalArrears: 0,
            collectedPaid: 0,
            collectedPartial: 0,
            outstandingRegular: 0,
            outstandingArrears: 0
          };
        }
      }

      // Balance out pending if any active records have non-standard status
      const resolvedPending = Math.max(pendingCount, totalStudentsCount - activeStudentsCount - struckOffCount);

      const totalBilled = instFinStats.totalBilled || 0;
      const totalArrears = instFinStats.totalArrears || 0;
      let instCollected = instFinStats.totalCollected || 0;
      if (paymentsByCampus !== null) {
        instCollected = paymentsByCampus.get(instId.toString()) || 0;
      }
      const instOutstanding = Math.max(0, totalBilled - instCollected);
      const currentVouchers = Math.max(0, totalBilled - totalArrears);
      const displayedStudentCount = (paymentRangeObj && instFinStats.total !== undefined)
        ? (instFinStats.total || 0)
        : activeStudentsCount;

      return {
        _id: instId,
        name: inst.name,
        code: inst.code,
        totalStudents: displayedStudentCount,
        totalAdmissions: totalStudentsCount,
        activeStudents: displayedStudentCount,
        enrolledStudents: displayedStudentCount,
        enrolled: displayedStudentCount,
        struckOffStudents: struckOffCount,
        struckoff: struckOffCount,
        pendingStudents: resolvedPending,
        pending: resolvedPending,
        newAdmissions: newAdmissionsCount,
        feesGenerated: totalBilled,
        feesCollected: instCollected,
        outstandingDues: instOutstanding,
        previousReceivable: totalArrears,
        recovery: instFinStats.collectedPaid || 0,
        vouchers: currentVouchers,
        arrears: totalArrears,
        grandTotal: totalBilled,
        received: instCollected,
        balance: instOutstanding
      };
    }));

    // Trends calculations for charts
    const paymentTrendMatch = { institution: { $in: selectedInstitutionIds }, status: 'completed' };
    const admissionTrendMatch = { institution: { $in: selectedInstitutionIds }, status: 'enrolled' };
    
    if (hasDates) {
      paymentTrendMatch.$or = [
        { paymentDate: { $gte: parsedStartDate, $lte: parsedEndDate } },
        { createdAt: { $gte: parsedStartDate, $lte: parsedEndDate } }
      ];
      admissionTrendMatch.admissionDate = { $gte: parsedStartDate, $lte: parsedEndDate };
    } else {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      paymentTrendMatch.$or = [
        { paymentDate: { $gte: ninetyDaysAgo } },
        { createdAt: { $gte: ninetyDaysAgo } }
      ];
      admissionTrendMatch.admissionDate = { $gte: ninetyDaysAgo };
    }
    
    const [feeCollectionTrend, admissionTrend] = await Promise.all([
      FeePayment.aggregate([
        { $match: paymentTrendMatch },
        ...activeStudentLookupStages,
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$paymentDate', '$createdAt'] }, timezone: '+05:00' } },
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
          totalAdmissions: totalStudents,
          activeStudents,
          enrolledStudents: activeStudents,
          newAdmissions,
          struckOffStudents,
          pendingStudents
        },
        finance: {
          totalCollected,
          totalBilled,
          totalOutstanding,
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

  const classId = req.query.class;
  const classObjectId = (classId && mongoose.Types.ObjectId.isValid(classId)) 
    ? new mongoose.Types.ObjectId(classId) 
    : null;

  const studentMatchQuery = classObjectId ? { ...referenceQuery, class: classObjectId } : referenceQuery;
  const studentFeeMatchQuery = classObjectId ? { ...referenceQuery, class: classObjectId } : referenceQuery;

  // Parse optional date range for financial overview filtering
  const { startDate: startDateStr, endDate: endDateStr } = req.query;
  const hasDateFilter = !!(startDateStr && endDateStr);
  const parsedStartDate = hasDateFilter ? new Date(startDateStr) : null;
  const parsedEndDate   = hasDateFilter ? new Date(endDateStr)   : null;

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
    Student.countDocuments(studentMatchQuery),
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

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }



  const [
    lastMonthFees,
    recentInstitutionsCount,
    recentUsersCount,
    enrolledStudentsCount,
    newAdmissionsCount,
    overdueFeesCount,
    upcomingEvents,
    struckOffStudentsCount,
    dynamicVoucherData
  ] = await Promise.all([
    // Last Month's Fees
    FeePayment.aggregate([
      { 
        $match: { 
          ...referenceQuery, 
          status: 'completed',
          paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        } 
      },
      ...activeStudentLookupStages,
      ...(classObjectId ? [{ $match: { 'studentDoc.class': classObjectId } }] : []),
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Institution.countDocuments({ ...institutionQuery, createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ ...userQuery, createdAt: { $gte: thirtyDaysAgo } }),
    // Enrolled Students
    Admission.countDocuments({ ...studentMatchQuery, status: 'enrolled' }),
    // New Admissions (last 30 days)
    Admission.countDocuments({ ...studentMatchQuery, admissionDate: { $gte: thirtyDaysAgo } }),
    // Overdue Fees
    StudentFee.countDocuments({ ...studentFeeMatchQuery, status: 'overdue', isActive: true }),
    // Upcoming Events
    AcademicCalendar.find({ 
      ...referenceQuery, 
      startDate: { $gte: new Date() } 
    }).sort({ startDate: 1 }).limit(5),
    // Struck Off Students
    Student.countDocuments({ ...studentMatchQuery, status: 'struckoff' }),

    // Dynamic Voucher Stats
    fetchDynamicVoucherStats({ ...studentFeeMatchQuery, 'vouchers.0': { $exists: true } }, hasDateFilter ? { startDate: parsedStartDate, endDate: parsedEndDate } : null)
  ]);

  const { allTime: allTimeVouchersAgg, monthlyBreakdown: monthlyBreakdownAgg } = dynamicVoucherData;

  const emptyVoucherStats = { total: 0, paid: 0, unpaid: 0, partial: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0, totalArrears: 0, collectedPaid: 0, collectedPartial: 0, outstandingRegular: 0, outstandingArrears: 0 };

  const currentMonthVouchersAgg = monthlyBreakdownAgg.find(m => m._id.month === currentMonth && m._id.year === currentYear) || emptyVoucherStats;
  const prevMonthVouchersAgg = monthlyBreakdownAgg.find(m => m._id.month === prevMonth && m._id.year === prevYear) || emptyVoucherStats;

  const activeFinStats = hasDateFilter ? allTimeVouchersAgg : currentMonthVouchersAgg;
  const totalCollected = activeFinStats.totalCollected;
  const totalBilled    = activeFinStats.totalBilled;
  const totalOutstanding = activeFinStats.totalOutstanding;
  const lastMonthTotal = lastMonthFees[0]?.total || 0;

  // Campus Breakdown for Finance Managers
  let campusBreakdown = [];
  if (req.user.role === 'finance_manager' && req.financeInstitutions) {
    campusBreakdown = await Promise.all(req.financeInstitutions.map(async (inst) => {
      const instQuery = { institution: inst._id };
      const [students, received, receivable] = await Promise.all([
        Student.countDocuments(instQuery),
        FeePayment.aggregate([
          { $match: { ...instQuery, status: 'completed' } },
          ...activeStudentLookupStages,
          { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
        ]),
        StudentFee.aggregate([
          { $match: { ...instQuery, 'vouchers.0': { $exists: true } } },
          ...activeStudentLookupStages,
          { $group: { _id: null, totalBilled: { $sum: '$finalAmount' }, totalOutstanding: { $sum: '$remainingAmount' } } }
        ])
      ]);
      
      return {
        _id: inst._id,
        name: inst.name,
        code: inst.code,
        totalStudents: students,
        collected: received[0]?.totalCollected || 0,
        billed: receivable[0]?.totalBilled || 0,
        outstanding: receivable[0]?.totalOutstanding || 0
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
        totalBilled,
        totalCollected,
        totalOutstanding,
        lastMonthCollected: lastMonthTotal,
        currency: 'PKR'
      },
      administrative: {
        enrolledStudents: enrolledStudentsCount,
        newAdmissions: newAdmissionsCount,
        overdueFees: overdueFeesCount,
        struckOffStudents: struckOffStudentsCount
      },
      vouchers: {
        allTime: allTimeVouchersAgg || { total: 0, paid: 0, unpaid: 0, partial: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0, collectedPaid: 0, collectedPartial: 0, outstandingRegular: 0, outstandingArrears: 0 },
        currentMonth: currentMonthVouchersAgg || { total: 0, paid: 0, unpaid: 0, partial: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0, collectedPaid: 0, collectedPartial: 0, outstandingRegular: 0, outstandingArrears: 0 },
        prevMonth: prevMonthVouchersAgg || { total: 0, paid: 0, unpaid: 0, partial: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0, collectedPaid: 0, collectedPartial: 0, outstandingRegular: 0, outstandingArrears: 0 },
        monthlyBreakdown: monthlyBreakdownAgg || []
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
  const classDistributionMatch = { status: { $in: ['active', 'enrolled'] }, isActive: true };
  // Students use admissionDate (official enrolment date) instead of createdAt
  const studentMatch = { status: 'enrolled', admissionDate: { $gte: startDate } };

  if (institutionId) {
    const oid = new mongoose.Types.ObjectId(institutionId);
    institutionGrowthMatch._id = oid;
    userMatch.institution = oid;
    groupMatch.institution = oid;
    classDistributionMatch.institution = oid;
    studentMatch.institution = oid;
  }
  else if (req.user.role === 'admin') {
    const id = getInstitutionId(req.user);
    if (!id) throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
    const oid = new mongoose.Types.ObjectId(id);
    institutionGrowthMatch._id = oid;
    userMatch.institution = oid;
    groupMatch.institution = oid;
    classDistributionMatch.institution = oid;
    studentMatch.institution = oid;
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
    classDistributionMatch.institution = { $in: institutionIds };
    studentMatch.institution = { $in: institutionIds };
  }
  else {
    throw new ApiError(403, 'Access denied. Admin access required.');
  }

  // Get daily growth trends
  const [institutionTrends, nonStudentTrends, studentTrends, departmentTrends, classDistribution] = await Promise.all([
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
      { $match: { ...userMatch, role: { $ne: 'student' } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:00' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      }
    ]),

    Admission.aggregate([
      { $match: studentMatch },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$admissionDate', timezone: '+05:00' } },
            role: { $literal: 'student' }
          },
          count: { $sum: 1 }
        }
      }
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
    ]),

    Student.aggregate([
      { $match: classDistributionMatch },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classDetails'
        }
      },
      { $unwind: { path: '$classDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$classDetails.name', 'Unassigned'] },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: '$_id',
          students: '$count',
          _id: 0
        }
      },
      { $sort: { students: -1 } }
    ])
  ]);

  // Combine and sort user trends
  let userTrends = [...nonStudentTrends, ...studentTrends];
  userTrends.sort((a, b) => {
    if (a._id.date === b._id.date) return 0;
    return a._id.date < b._id.date ? -1 : 1;
  });

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
      classDistribution,
      period: {
        days: daysNum,
        startDate,
        endDate: new Date()
      }
    }
  });
});

/**
 * @route   GET /api/v1/dashboard/banks-statement-report
 * @desc    Get consolidated bank statement report across all campuses
 * @access  Private (Finance Manager, Super Admin, Admin)
 */
const getBanksStatementReport = asyncHandler(async (req, res) => {
  let institutions = [];
  let institutionIds = [];

  if (req.user.role === 'finance_manager') {
    if (!req.user.organization) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any organization.');
    }
    const orgId = req.user.organization._id || req.user.organization;
    institutions = await Institution.find({ organization: orgId })
      .select('_id name code address')
      .sort({ name: 1 })
      .lean();
    institutionIds = institutions.map(i => i._id);
  } else if (req.user.role === 'super_admin') {
    const filter = {};
    if (req.query.organization) {
      filter.organization = req.query.organization;
    }
    institutions = await Institution.find(filter)
      .select('_id name code address')
      .sort({ name: 1 })
      .lean();
    institutionIds = institutions.map(i => i._id);
  } else if (req.user.role === 'admin') {
    const instId = getInstitutionId(req.user);
    if (!instId) {
      throw new ApiError(403, 'Access denied. Your account is not associated with any institution.');
    }
    institutions = await Institution.find({ _id: instId })
      .select('_id name code address')
      .lean();
    institutionIds = institutions.map(i => i._id);
  } else {
    throw new ApiError(403, 'Access denied. Finance manager or admin access required.');
  }

  if (institutions.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        campuses: [],
        rows: [],
        groups: [],
        grandTotals: { campusTotals: {}, total: 0 }
      }
    });
  }

  // Parse filters
  const { startDate, endDate, monthKey, mode = 'auto', institution, paymentStartDate, paymentEndDate } = req.query;
  let parsedStartDate = null;
  let parsedEndDate = null;

  if (institution && institution !== 'all') {
    const requestedInstId = extractInstitutionId(institution);
    institutions = institutions.filter(i => i._id.toString() === requestedInstId.toString());
    institutionIds = institutions.map(i => i._id);
  }

  const effectiveStart = paymentStartDate || startDate;
  const effectiveEnd = paymentEndDate || endDate;

  if (effectiveStart || effectiveEnd) {
    if (effectiveStart) {
      parsedStartDate = new Date(effectiveStart);
      parsedStartDate.setHours(0, 0, 0, 0);
    }
    if (effectiveEnd) {
      parsedEndDate = new Date(effectiveEnd);
      parsedEndDate.setHours(23, 59, 59, 999);
    }
  } else if (monthKey) {
    const parts = monthKey.split('-');
    if (parts.length === 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      parsedStartDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      parsedEndDate = new Date(year, month, 0, 23, 59, 59, 999);
    }
  }

  // 1. Fetch active bank accounts
  let bankAccounts = await BankAccount.find({ isActive: true })
    .select('_id bankName accountTitle accountNumber branchCode institutions')
    .sort({ bankName: 1 })
    .lean();

  if (!bankAccounts || bankAccounts.length === 0) {
    bankAccounts = await BankAccount.find({})
      .select('_id bankName accountTitle accountNumber branchCode institutions')
      .sort({ bankName: 1 })
      .lean();
  }

  // 2. Build payment & reconciliation queries
  const paymentQuery = {
    institution: { $in: institutionIds },
    status: 'completed'
  };
  if (parsedStartDate || parsedEndDate) {
    const pDateCond = {};
    if (parsedStartDate) pDateCond.$gte = parsedStartDate;
    if (parsedEndDate) pDateCond.$lte = parsedEndDate;
    paymentQuery.paymentDate = pDateCond;
  }

  const suspenseQuery = {
    institution: { $in: institutionIds },
    status: { $in: ['unidentified', 'reconciled'] }
  };
  if (parsedStartDate || parsedEndDate) {
    const sDateCond = {};
    if (parsedStartDate) sDateCond.$gte = parsedStartDate;
    if (parsedEndDate) sDateCond.$lte = parsedEndDate;
    suspenseQuery.paymentDate = sDateCond;
  }

  const reconQuery = {
    institution: { $in: institutionIds }
  };
  if (monthKey) {
    reconQuery.monthKey = monthKey;
  } else if (parsedStartDate && parsedEndDate) {
    const startY = parsedStartDate.getFullYear();
    const startM = parsedStartDate.getMonth() + 1;
    const endY = parsedEndDate.getFullYear();
    const endM = parsedEndDate.getMonth() + 1;
    const mKeys = [];
    let curY = startY;
    let curM = startM;
    while (curY < endY || (curY === endY && curM <= endM)) {
      mKeys.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    if (mKeys.length > 0) {
      reconQuery.monthKey = { $in: mKeys };
    }
  }

  const [feePayments, suspenseEntries, reconRecords] = await Promise.all([
    FeePayment.find(paymentQuery).select('institution amount paymentMethod bankName remarks transactionId createdAt paymentDate').lean(),
    SuspenseEntry.find(suspenseQuery).select('institution amount paymentMethod bankName remarks transactionId createdAt paymentDate status').lean(),
    MonthReconciliation.find(reconQuery).select('institution bankAccount monthKey reconcileAmount').lean()
  ]);

  // Normalize string helper
  const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  // Helper function to resolve which bank account a payment belongs to
  const resolveBank = (item) => {
    if (item.bankAccount) {
      const bId = (item.bankAccount._id || item.bankAccount).toString();
      const b = bankAccounts.find(x => x._id.toString() === bId);
      if (b) return b;
    }

    if (item.bankName) {
      const pClean = cleanStr(item.bankName);
      let exact = bankAccounts.find(b => cleanStr(b.bankName) === pClean);
      if (exact) return exact;

      let bestMatch = null;
      let maxLen = 0;
      for (const b of bankAccounts) {
        const bClean = cleanStr(b.bankName);
        if (bClean.includes(pClean) || pClean.includes(bClean)) {
          const matchLen = Math.min(bClean.length, pClean.length);
          if (matchLen > maxLen) {
            maxLen = matchLen;
            bestMatch = b;
          }
        }
      }
      if (bestMatch) return bestMatch;
    }

    if (item.remarks) {
      const rClean = cleanStr(item.remarks);
      let bestMatch = null;
      let maxLen = 0;
      for (const b of bankAccounts) {
        const bClean = cleanStr(b.bankName);
        if (bClean.length > 2 && rClean.includes(bClean) && bClean.length > maxLen) {
          maxLen = bClean.length;
          bestMatch = b;
        }
      }
      if (bestMatch) return bestMatch;
    }
    return null;
  };

  // Matrix: [bankId][instId] = { collections: 0, reconciledSuspense: 0, reconciled: 0, suspense: 0 }
  const matrix = {};
  bankAccounts.forEach(b => {
    const bId = b._id.toString();
    matrix[bId] = {};
    institutions.forEach(inst => {
      matrix[bId][inst._id.toString()] = { collections: 0, reconciledSuspense: 0, reconciled: 0, suspense: 0 };
    });
  });

  const unmappedBanks = new Map();

  // Aggregate FeePayments
  feePayments.forEach(p => {
    const instId = (p.institution?._id || p.institution)?.toString();
    if (!instId) return;

    const matchedBank = resolveBank(p);
    if (matchedBank) {
      const bId = matchedBank._id.toString();
      if (!matrix[bId]) matrix[bId] = {};
      if (!matrix[bId][instId]) matrix[bId][instId] = { collections: 0, reconciledSuspense: 0, reconciled: 0, suspense: 0 };
      matrix[bId][instId].collections += (p.amount || 0);
    } else if (p.bankName) {
      const key = p.bankName.trim();
      if (!unmappedBanks.has(key)) unmappedBanks.set(key, {});
      const entry = unmappedBanks.get(key);
      if (!entry[instId]) entry[instId] = { collections: 0, reconciledSuspense: 0, suspense: 0 };
      entry[instId].collections += (p.amount || 0);
    }
  });

  // Aggregate SuspenseEntries
  suspenseEntries.forEach(s => {
    const instId = (s.institution?._id || s.institution)?.toString();
    if (!instId) return;

    const matchedBank = resolveBank(s);
    if (matchedBank) {
      const bId = matchedBank._id.toString();
      if (!matrix[bId]) matrix[bId] = {};
      if (!matrix[bId][instId]) matrix[bId][instId] = { collections: 0, reconciledSuspense: 0, reconciled: 0, suspense: 0 };
      if (s.status === 'unidentified') {
        matrix[bId][instId].suspense += (s.amount || 0);
      } else {
        matrix[bId][instId].reconciledSuspense += (s.amount || 0);
      }
    } else if (s.bankName) {
      const key = s.bankName.trim();
      if (!unmappedBanks.has(key)) unmappedBanks.set(key, {});
      const entry = unmappedBanks.get(key);
      if (!entry[instId]) entry[instId] = { collections: 0, reconciledSuspense: 0, suspense: 0 };
      if (s.status === 'unidentified') {
        entry[instId].suspense += (s.amount || 0);
      } else {
        entry[instId].reconciledSuspense += (s.amount || 0);
      }
    }
  });

  // Aggregate MonthReconciliation
  reconRecords.forEach(r => {
    const instId = (r.institution?._id || r.institution)?.toString();
    if (!instId) return;

    if (r.bankAccount) {
      const bId = (r.bankAccount._id || r.bankAccount).toString();
      if (!matrix[bId]) matrix[bId] = {};
      if (!matrix[bId][instId]) matrix[bId][instId] = { collections: 0, reconciledSuspense: 0, reconciled: 0, suspense: 0 };
      matrix[bId][instId].reconciled += (r.reconcileAmount || 0);
    }
  });

  // Group accounts by bank brand/family
  const getBankGroup = (bankName) => {
    const clean = (bankName || '').trim().toUpperCase();
    if (clean.startsWith('BIPL') || clean.includes('BANKISLAMI') || clean.includes('BANK ISLAMI')) return 'BIPL';
    if (clean.startsWith('ABL') || clean.includes('ALLIED')) return 'ABL';
    if (clean.startsWith('MBL') || clean.includes('MEEZAN')) return 'MBL';
    if (clean.startsWith('HBL') || clean.includes('HABIB')) return 'HBL';
    if (clean.startsWith('UBL') || clean.includes('UNITED')) return 'UBL';
    if (clean.startsWith('MCB')) return 'MCB';
    if (clean.startsWith('NBP') || clean.includes('NATIONAL')) return 'NBP';
    if (clean.startsWith('BAFL') || clean.includes('ALFALAH')) return 'BAFL';
    if (clean.startsWith('FBL') || clean.includes('FAYSAL')) return 'FBL';
    if (clean.startsWith('BOP') || clean.includes('PUNJAB')) return 'BOP';
    if (clean.startsWith('AKBL') || clean.includes('ASKARI')) return 'AKBL';
    const words = clean.split(/\s+/);
    return words[0] || 'OTHER';
  };

  const groupedAccounts = new Map();
  bankAccounts.forEach(acc => {
    const groupKey = getBankGroup(acc.bankName);
    if (!groupedAccounts.has(groupKey)) groupedAccounts.set(groupKey, []);
    groupedAccounts.get(groupKey).push(acc);
  });

  // Include any unmapped banks found in payment transactions
  unmappedBanks.forEach((instMap, bankName) => {
    const groupKey = getBankGroup(bankName);
    const virtualAcc = {
      _id: `unmapped_${bankName}`,
      bankName: bankName,
      accountNumber: 'N/A',
      accountTitle: bankName,
      isVirtual: true
    };
    if (!groupedAccounts.has(groupKey)) groupedAccounts.set(groupKey, []);
    groupedAccounts.get(groupKey).push(virtualAcc);
    matrix[virtualAcc._id] = {};
    institutions.forEach(inst => {
      const instId = inst._id.toString();
      const uEntry = instMap[instId] || { collections: 0, reconciledSuspense: 0, suspense: 0 };
      matrix[virtualAcc._id][instId] = {
        collections: uEntry.collections || 0,
        reconciledSuspense: uEntry.reconciledSuspense || 0,
        reconciled: 0,
        suspense: uEntry.suspense || 0
      };
    });
  });

  let serial = 1;
  const allRows = [];
  const processedGroups = [];
  const grandCampusTotals = {};
  institutions.forEach(inst => {
    grandCampusTotals[inst._id.toString()] = { reconciled: 0, suspense: 0, total: 0 };
  });
  let grandTotalSum = 0;
  let grandReconciledSum = 0;
  let grandSuspenseSum = 0;

  groupedAccounts.forEach((accList, groupKey) => {
    const groupRows = [];
    const groupCampusTotals = {};
    institutions.forEach(inst => {
      groupCampusTotals[inst._id.toString()] = { reconciled: 0, suspense: 0, total: 0 };
    });
    let groupTotalSum = 0;
    let groupReconciledSum = 0;
    let groupSuspenseSum = 0;

    accList.forEach(acc => {
      const bId = acc._id.toString();
      const campusAmounts = {};
      let rowTotal = 0;
      let rowReconciledTotal = 0;
      let rowSuspenseTotal = 0;

      institutions.forEach(inst => {
        const instId = inst._id.toString();
        const cell = matrix[bId]?.[instId] || { collections: 0, reconciledSuspense: 0, reconciled: 0, suspense: 0 };
        
        let recAmount = 0;
        if (mode === 'collections') {
          recAmount = cell.collections + (cell.reconciledSuspense || 0);
        } else if (mode === 'reconciled') {
          recAmount = cell.reconciled > 0 ? cell.reconciled : (cell.collections + (cell.reconciledSuspense || 0));
        } else {
          // auto mode: if custom payment dates are set, use collections because bank reconciliation is recorded at whole-month granularity
          if (effectiveStart || effectiveEnd) {
            recAmount = cell.collections + (cell.reconciledSuspense || 0);
          } else {
            recAmount = cell.reconciled > 0 ? cell.reconciled : (cell.collections + (cell.reconciledSuspense || 0));
          }
        }
        const suspAmount = cell.suspense || 0;
        const totalAmount = recAmount + suspAmount;

        campusAmounts[instId] = {
          amount: totalAmount,
          reconciled: recAmount,
          suspense: suspAmount,
          collections: cell.collections
        };
        rowReconciledTotal += recAmount;
        rowSuspenseTotal += suspAmount;
        rowTotal += totalAmount;

        groupCampusTotals[instId].reconciled += recAmount;
        groupCampusTotals[instId].suspense += suspAmount;
        groupCampusTotals[instId].total += totalAmount;

        grandCampusTotals[instId].reconciled += recAmount;
        grandCampusTotals[instId].suspense += suspAmount;
        grandCampusTotals[instId].total += totalAmount;
      });

      groupTotalSum += rowTotal;
      groupReconciledSum += rowReconciledTotal;
      groupSuspenseSum += rowSuspenseTotal;

      const rowData = {
        sNo: serial++,
        bankAccountId: bId,
        bankName: acc.bankName,
        accountTitle: acc.accountTitle,
        accountNumber: acc.accountNumber,
        groupKey,
        campusAmounts,
        rowReconciledTotal,
        rowSuspenseTotal,
        rowTotal,
        groupTotal: accList.length === 1 ? rowTotal : null,
        groupReconciledTotal: accList.length === 1 ? rowReconciledTotal : null,
        groupSuspenseTotal: accList.length === 1 ? rowSuspenseTotal : null
      };
      groupRows.push(rowData);
      allRows.push(rowData);
    });

    grandTotalSum += groupTotalSum;
    grandReconciledSum += groupReconciledSum;
    grandSuspenseSum += groupSuspenseSum;

    const hasMain = accList.some(a => (a.bankName || '').toLowerCase().includes('main'));
    const subtotalLabel = hasMain ? `${groupKey} Main G.total` : `${groupKey} G.total`;

    processedGroups.push({
      groupKey,
      groupName: groupKey,
      hasMultipleAccounts: accList.length > 1,
      subtotalLabel,
      campusTotals: groupCampusTotals,
      reconciledTotal: groupReconciledSum,
      suspenseTotal: groupSuspenseSum,
      total: groupTotalSum,
      accountsCount: accList.length
    });
  });

  res.status(200).json({
    success: true,
    data: {
      campuses: institutions.map(i => ({ _id: i._id, name: i.name, code: i.code })),
      rows: allRows,
      groups: processedGroups,
      grandTotals: {
        campusTotals: grandCampusTotals,
        reconciledTotal: grandReconciledSum,
        suspenseTotal: grandSuspenseSum,
        total: grandTotalSum
      },
      filters: {
        startDate: parsedStartDate ? parsedStartDate.toISOString().split('T')[0] : null,
        endDate: parsedEndDate ? parsedEndDate.toISOString().split('T')[0] : null,
        monthKey: monthKey || null,
        mode
      }
    }
  });
});

module.exports = {
  getDashboardStats,
  getAnalytics,
  getBanksStatementReport
};
