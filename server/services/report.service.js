const Report = require('../models/Report');
const Institution = require('../models/Institution');
const User = require('../models/User');
const Payment = require('../models/Payment');
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

    let data;

    switch (report.type) {
      case 'institution':
        data = await this.generateInstitutionReport(report.filters);
        break;
      case 'user':
        data = await this.generateUserReport(report.filters);
        break;
      case 'financial':
        data = await this.generateFinancialReport(report.filters);
        break;
      case 'activity':
        data = await this.generateActivityReport(report.filters);
        break;
      default:
        throw new ApiError(400, 'Invalid report type');
    }

    return {
      report,
      data,
      generatedAt: new Date()
    };
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
      .populate('department', 'name code')
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
}

module.exports = new ReportService();
