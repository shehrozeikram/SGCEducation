const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const institutionRoutes = require('./institution.routes');
const departmentRoutes = require('./department.routes');
const classRoutes = require('./class.routes');
const sectionRoutes = require('./section.routes');
const groupRoutes = require('./group.routes');
const feeTypeRoutes = require('./feetype.routes');
const admissionRoutes = require('./admission.routes');
const dashboardRoutes = require('./dashboard.routes');
const activityLogRoutes = require('./activityLog.routes');
const notificationRoutes = require('./notification.routes');
const financialRoutes = require('./financial.routes');
const reportRoutes = require('./report.routes');
const systemSettingRoutes = require('./systemSetting.routes');
const academicCalendarRoutes = require('./academicCalendar.routes');
const messageRoutes = require('./message.routes');
const performanceRoutes = require('./performance.routes');
const studentPromotionRoutes = require('./studentPromotion.routes');
const feeRoutes = require('./fee.routes');
const feeHeadRoutes = require('./feeHead.routes');

/**
 * API v1 Routes
 * Base path: /api/v1
 */

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/institutions', institutionRoutes);
router.use('/departments', departmentRoutes);
router.use('/classes', classRoutes);
router.use('/sections', sectionRoutes);
router.use('/groups', groupRoutes);
router.use('/fee-types', feeTypeRoutes);
router.use('/admissions', admissionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/notifications', notificationRoutes);
router.use('/financial', financialRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', systemSettingRoutes);
router.use('/calendar', academicCalendarRoutes);
router.use('/messages', messageRoutes);
router.use('/performance', performanceRoutes);
router.use('/student-promotions', studentPromotionRoutes);
router.use('/fees', feeRoutes);
router.use('/fee-heads', feeHeadRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
