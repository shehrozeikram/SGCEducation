const express = require('express');
const router = express.Router();
const academicCalendarController = require('../../controllers/academicCalendar.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

router.use(authenticate);

router.get('/', hasPermission(PERMISSIONS.ACADEMIC.VIEW), academicCalendarController.getEvents);
router.get('/upcoming', hasPermission(PERMISSIONS.ACADEMIC.VIEW), academicCalendarController.getUpcomingEvents);
router.get('/:id', hasPermission(PERMISSIONS.ACADEMIC.VIEW), academicCalendarController.getEventById);
router.post('/', hasPermission(PERMISSIONS.ACADEMIC.MANAGE), academicCalendarController.createEvent);
router.put('/:id', hasPermission(PERMISSIONS.ACADEMIC.MANAGE), academicCalendarController.updateEvent);
router.delete('/:id', hasPermission(PERMISSIONS.ACADEMIC.MANAGE), academicCalendarController.deleteEvent);

module.exports = router;
