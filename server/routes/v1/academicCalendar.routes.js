const express = require('express');
const router = express.Router();
const academicCalendarController = require('../../controllers/academicCalendar.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', academicCalendarController.getEvents);
router.get('/upcoming', academicCalendarController.getUpcomingEvents);
router.get('/:id', academicCalendarController.getEventById);
router.post('/', academicCalendarController.createEvent);
router.put('/:id', academicCalendarController.updateEvent);
router.delete('/:id', academicCalendarController.deleteEvent);

module.exports = router;
