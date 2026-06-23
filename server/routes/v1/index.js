const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const institutionRoutes = require('./institution.routes');
const classRoutes = require('./class.routes');
const sectionRoutes = require('./section.routes');
const groupRoutes = require('./group.routes');
// const gradeRoutes = require('./grade.routes'); // TODO: Create grade.routes.js when needed
const feeTypeRoutes = require('./feetype.routes');
const feeHeadRoutes = require('./feeHead.routes');
const feeRoutes = require('./fee.routes');
const admissionRoutes = require('./admission.routes');
const dashboardRoutes = require('./dashboard.routes');
const activityLogRoutes = require('./activityLog.routes');
const notificationRoutes = require('./notification.routes');
const systemSettingRoutes = require('./systemSetting.routes');
const academicCalendarRoutes = require('./academicCalendar.routes');
const messageRoutes = require('./message.routes');
const performanceRoutes = require('./performance.routes');
const studentPromotionRoutes = require('./studentPromotion.routes');
const organizationRoutes = require('./organization.routes');
const resultRoutes = require('./result.routes');
const backupRoutes = require('./backup.routes');
const roleRoutes = require('./role.routes');

/**
 * API v1 Routes
 * Base path: /api/v1
 */

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/institutions', institutionRoutes);
router.use('/classes', classRoutes);
router.use('/sections', sectionRoutes);
router.use('/groups', groupRoutes);
// router.use('/grades', gradeRoutes); // TODO: Uncomment when grade.routes.js is created
router.use('/fee-types', feeTypeRoutes);
router.use('/fee-heads', feeHeadRoutes);
router.use('/fees', feeRoutes);
router.use('/admissions', admissionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', systemSettingRoutes);
router.use('/calendar', academicCalendarRoutes);
router.use('/messages', messageRoutes);
router.use('/performance', performanceRoutes);
router.use('/student-promotions', studentPromotionRoutes);
router.use('/organizations', organizationRoutes);
router.use('/results', resultRoutes);
router.use('/backups', backupRoutes);
router.use('/roles', roleRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API v1 is running',
    timestamp: new Date().toISOString()
  });
});

router.get('/test-route', (req, res) => res.json({ message: 'API v1 test route is working' }));

router.get('/db-test-counts', async (req, res) => {
  try {
    const Admission = require('../../models/Admission');
    const Student = require('../../models/Student');
    const admissionService = require('../../services/admission.service');
    
    const allAdmissions = await Admission.countDocuments();
    const enrolledAdmissions = await Admission.find({ status: 'enrolled' });
    const enrolledAdmissionsWithStudentId = enrolledAdmissions.filter(a => a.studentId);
    const enrolledAdmissionsWithoutStudentId = enrolledAdmissions.filter(a => !a.studentId);
    
    const allStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });
    
    const diagnosticResults = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const admission of enrolledAdmissionsWithoutStudentId) {
      try {
        const mockUser = { id: admission.createdBy || admission._id, _id: admission.createdBy || admission._id };
        await admission.populate('institution');
        const student = await admissionService._createStudentFromAdmission(admission, mockUser);
        
        // Link student to admission since we created it
        admission.studentId = student._id;
        await admission.save();
        
        successCount++;
      } catch (err) {
        failCount++;
        diagnosticResults.push({
          admissionId: admission._id,
          name: admission.personalInfo?.name || 'Unknown',
          email: admission.contactInfo?.email,
          applicationNumber: admission.applicationNumber,
          errorName: err.name,
          errorMessage: err.message,
          validationErrors: err.errors ? Object.keys(err.errors).map(k => `${k}: ${err.errors[k].message}`) : null
        });
      }
    }
    
    res.json({
      allAdmissions,
      enrolledAdmissionsCount: enrolledAdmissions.length,
      enrolledAdmissionsWithStudentIdCount: enrolledAdmissionsWithStudentId.length,
      enrolledAdmissionsWithoutStudentIdCount: enrolledAdmissionsWithoutStudentId.length,
      allStudents,
      activeStudents,
      successCount,
      failCount,
      failures: diagnosticResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

router.get('/test-student-creation', async (req, res) => {
  try {
    const Admission = require('../../models/Admission');
    const admissionService = require('../../services/admission.service');
    
    // Find an enrolled admission that has no studentId
    const missing = await Admission.findOne({ status: 'enrolled', $or: [{ studentId: { $exists: false } }, { studentId: null }] }).populate('institution');
    
    if (!missing) {
      return res.json({ message: 'No missing students found' });
    }
    
    // Try to create the student and catch the exact error
    try {
      const student = await admissionService._createStudentFromAdmission(missing, { id: missing.createdBy || missing._id });
      res.json({ success: true, message: 'Successfully created!', student });
    } catch (err) {
      res.json({ success: false, errorName: err.name, errorMessage: err.message, stack: err.stack, admission: missing });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
