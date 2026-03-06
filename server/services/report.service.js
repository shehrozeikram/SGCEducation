const mongoose = require('mongoose');
const Report = require('../models/Report');
const Institution = require('../models/Institution');
const User = require('../models/User');
const Payment = require('../models/Payment');
const FeeVoucher = require('../models/FeeVoucher');
const StudentFee = require('../models/StudentFee');
const Student = require('../models/Student');
const Admission = require('../models/Admission');
const Class = require('../models/Class');
const Section = require('../models/Section');
const FeeHead = require('../models/FeeHead');
const ActivityLog = require('../models/ActivityLog');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Report Service
 */
class ReportService {
  /**
   * Get all reports
   */
  async getReports(filters = {}, currentUser) {
    const query = {};

    if (currentUser.role !== 'super_admin') {
      query.createdBy = currentUser.id;
    }

    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const reports = await Report.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return reports;
  }

  /**
   * Create report
   */
  async createReport(data, currentUser) {
    const report = await Report.create({
      ...data,
      createdBy: currentUser.id
    });

    return report;
  }

  /**
   * Generate report data
   */
  async generateReport(reportId, currentUser) {
    const report = await Report.findById(reportId);

    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' && report.createdBy.toString() !== currentUser.id) {
      throw new ApiError(403, 'Access denied');
    }

    const data = await this.generateReportData(report.type, report.filters, currentUser);

    return {
      report,
      data,
      generatedAt: new Date()
    };
  }

  /**
   * Generate report data directly from type and filters
   */
  async generateReportData(type, filters, currentUser) {
    let data;

    switch (type) {
      case 'institution':
        data = await this.generateInstitutionReport(filters);
        break;
      case 'user':
        data = await this.generateUserReport(filters);
        break;
      case 'financial':
        data = await this.generateFinancialReport(filters);
        break;
      case 'activity':
        data = await this.generateActivityReport(filters);
        break;
      case 'remaining-balance':
        data = await this.generateRemainingBalanceReport(filters);
        break;
      default:
        throw new ApiError(400, 'Invalid report type');
    }

    return data;
  }

  /**
   * Generate institution report
   */
  async generateInstitutionReport(filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const institutions = await Institution.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const summary = {
      total: institutions.length,
      active: institutions.filter(i => i.isActive).length,
      inactive: institutions.filter(i => !i.isActive).length,
      schools: institutions.filter(i => i.type === 'school').length,
      colleges: institutions.filter(i => i.type === 'college').length
    };

    return {
      summary,
      institutions
    };
  }

  /**
   * Generate user report
   */
  async generateUserReport(filters = {}) {
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const users = await User.find(query)
      .populate('institution', 'name')
      .sort({ createdAt: -1 });

    const summary = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: {
        super_admin: users.filter(u => u.role === 'super_admin').length,
        admin: users.filter(u => u.role === 'admin').length,
        teacher: users.filter(u => u.role === 'teacher').length,
        student: users.filter(u => u.role === 'student').length
      }
    };

    return {
      summary,
      users
    };
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(filters = {}) {
    const query = { status: 'completed' };

    if (filters.startDate || filters.endDate) {
      query.paidDate = {};
      if (filters.startDate) query.paidDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.paidDate.$lte = new Date(filters.endDate);
    }

    const payments = await Payment.find(query)
      .populate('institution', 'name code')
      .sort({ paidDate: -1 });

    const summary = {
      totalPayments: payments.length,
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
      averagePayment: payments.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0,
      byMethod: {}
    };

    payments.forEach(payment => {
      const method = payment.paymentMethod || 'other';
      if (!summary.byMethod[method]) {
        summary.byMethod[method] = { count: 0, amount: 0 };
      }
      summary.byMethod[method].count++;
      summary.byMethod[method].amount += payment.amount;
    });

    return {
      summary,
      payments
    };
  }

  /**
   * Generate activity report
   */
  async generateActivityReport(filters = {}) {
    const query = {};

    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const activities = await ActivityLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(1000);

    const summary = {
      total: activities.length,
      byAction: {},
      byResource: {},
      byStatus: {}
    };

    activities.forEach(activity => {
      // By action
      if (!summary.byAction[activity.action]) {
        summary.byAction[activity.action] = 0;
      }
      summary.byAction[activity.action]++;

      // By resource
      if (!summary.byResource[activity.resource]) {
        summary.byResource[activity.resource] = 0;
      }
      summary.byResource[activity.resource]++;

      // By status
      if (!summary.byStatus[activity.status]) {
        summary.byStatus[activity.status] = 0;
      }
      summary.byStatus[activity.status]++;
    });

    return {
      summary,
      activities
    };
  }

  /**
   * Delete report
   */
  async deleteReport(reportId, currentUser) {
    const report = await Report.findById(reportId);

    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    if (currentUser.role !== 'super_admin' && report.createdBy.toString() !== currentUser.id) {
      throw new ApiError(403, 'Access denied');
    }

    await Report.findByIdAndDelete(reportId);

    return { message: 'Report deleted successfully' };
  }

  /**
   * Generate remaining balance report
   */
  async generateRemainingBalanceReport(filters = {}) {
    const { 
      institution, 
      classId, 
      sectionId, 
      studentStatus = ['active'], 
      paymentStatus, 
      month, 
      year,
      viewType = 'full' // 'full' or 'head-wise'
    } = filters;

    const query = {};
    if (institution) query.institution = institution;
    
    // Filter by class/section via Admission model
    if ((classId && classId !== 'all') || (sectionId && sectionId !== 'all')) {
      const admissionQuery = {};
      if (institution) admissionQuery.institution = institution;
      if (classId && classId !== 'all') admissionQuery.class = classId;
      if (sectionId && sectionId !== 'all') admissionQuery.section = sectionId;
      
      const admissions = await Admission.find(admissionQuery).select('_id');
      query.admission = { $in: admissions.map(a => a._id) };
    }
    
    if (studentStatus && studentStatus.length > 0 && !studentStatus.includes('All')) {
      query.status = { $in: Array.isArray(studentStatus) ? studentStatus : [studentStatus] };
    }
    query.isActive = true;

    // Get students matching filters
    const students = await Student.find(query)
      .populate({
        path: 'user',
        select: 'name'
      })
      .populate({
        path: 'admission',
        populate: [
          { path: 'class', select: 'name code' },
          { path: 'section', select: 'name code' }
        ]
      })
      .sort({ 'admission.class': 1, 'admission.section': 1, rollNumber: 1 });

    const studentIds = students.map(s => s._id);

    // Fetch all StudentFees for the filtered students to calculate balances via Ledger Method
    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const studentFeeQuery = {
      student: { $in: studentIds }
    };
    if (institution) {
      studentFeeQuery.institution = new mongoose.Types.ObjectId(institution.toString());
    }

    const studentFees = await StudentFee.find(studentFeeQuery).populate('feeHead', 'name');

    // Group fees by student
    const feesByStudent = new Map();
    studentFees.forEach(fee => {
      const sId = fee.student.toString();
      if (!feesByStudent.has(sId)) {
        feesByStudent.set(sId, []);
      }
      feesByStudent.get(sId).push(fee);
    });

    // Get all active fee heads if head-wise
    let feeHeads = [];
    if (viewType === 'head-wise') {
      feeHeads = await FeeHead.find({ isActive: true }).sort({ priority: 1 });
    }

    // Process report data
    const reportData = [];
    let summaryTotals = {
      totalPBal: 0,
      totalCBal: 0,
      totalReceivable: 0,
      totalReceived: 0,
      totalRemaining: 0
    };

    students.forEach(student => {
      const studentIdStr = student._id.toString();
      const sFees = feesByStudent.get(studentIdStr) || [];

      let totalBilledPrev = 0;
      let totalPaidPrev = 0;
      let totalBilledCurrent = 0;
      let totalPaidCurrent = 0;
      const headBilledCurrent = {};

      sFees.forEach(fee => {
        const isArrears = fee.feeHead && fee.feeHead.name && fee.feeHead.name.toLowerCase() === 'arrears';
        const hasVouchers = fee.vouchers && fee.vouchers.length > 0;
        let isPrevious = false;
        let isCurrent = false;

        if (hasVouchers) {
          isPrevious = fee.vouchers.every(v => 
            (Number(v.year) < targetYear) || (Number(v.year) === targetYear && Number(v.month) < targetMonth)
          );
          isCurrent = fee.vouchers.some(v => Number(v.month) === targetMonth && Number(v.year) === targetYear);
        } else {
          const feeDate = new Date(fee.dueDate || fee.createdAt);
          if (feeDate < startDate) {
            isPrevious = true;
          } else if (feeDate >= startDate && feeDate <= endDate) {
            isCurrent = true;
          }
        }

        if (isPrevious) {
          if (!isArrears) totalBilledPrev += (fee.finalAmount || 0);
          totalPaidPrev += (fee.paidAmount || 0);
        }

        if (isCurrent) {
          if (!isArrears) totalBilledCurrent += (fee.finalAmount || 0);
          totalPaidCurrent += (fee.paidAmount || 0);
          
          if (viewType === 'head-wise' && fee.feeHead && fee.feeHead._id) {
            headBilledCurrent[fee.feeHead._id.toString()] = (headBilledCurrent[fee.feeHead._id.toString()] || 0) + (fee.finalAmount || 0);
          }
        }
      });

      const previousBalance = Math.max(0, totalBilledPrev - totalPaidPrev);
      const currentBalance = totalBilledCurrent;
      const receivable = previousBalance + currentBalance;
      const received = totalPaidCurrent;
      const remaining = Math.max(0, receivable - received);

      // Filter by payment status if specified
      if (paymentStatus === 'not_paid' && received > 0) return;
      if (paymentStatus === 'partially_paid' && (received === 0 || remaining === 0)) return;
      if (paymentStatus === 'paid' && remaining > 0) return;

      const row = {
        studentId: student._id,
        enrollmentNumber: student.enrollmentNumber,
        admissionNumber: student.admission?.applicationNumber || '',
        rollNumber: student.rollNumber || '',
        studentName: student.user?.name || '',
        fatherName: student.guardianInfo?.fatherName || '',
        mobileNumber: student.guardianInfo?.fatherPhone || student.contactDetails?.phone || '',
        class: student.admission?.class?.name || '',
        section: student.admission?.section?.name || '',
        previousBalance,
        currentBalance,
        receivable,
        received,
        remaining
      };

      if (viewType === 'head-wise') {
        row.heads = {};
        feeHeads.forEach(head => {
          row.heads[head._id] = headBilledCurrent[head._id.toString()] || 0;
        });
      }

      reportData.push(row);

      // Add to totals
      summaryTotals.totalPBal += row.previousBalance;
      summaryTotals.totalCBal += row.currentBalance;
      summaryTotals.totalReceivable += row.receivable;
      summaryTotals.totalReceived += row.received;
      summaryTotals.totalRemaining += row.remaining;
    });

    return {
      reportType: 'remaining-balance',
      viewType,
      filters: { ...filters, month, year },
      feeHeads: viewType === 'head-wise' ? feeHeads : [],
      summary: summaryTotals,
      data: reportData
    };
  }
}

module.exports = new ReportService();
