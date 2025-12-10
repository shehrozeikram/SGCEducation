const academicCalendarService = require('../services/academicCalendar.service');
const { asyncHandler } = require('../middleware/error.middleware');

const getEvents = asyncHandler(async (req, res) => {
  const { institution, eventType, startDate, endDate } = req.query;

  const events = await academicCalendarService.getEvents(
    { institution, eventType, startDate, endDate },
    req.user
  );

  res.json({
    success: true,
    count: events.length,
    data: events
  });
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await academicCalendarService.getEventById(req.params.id);

  res.json({
    success: true,
    data: event
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const event = await academicCalendarService.createEvent(req.body, req.user);

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: event
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await academicCalendarService.updateEvent(req.params.id, req.body, req.user);

  res.json({
    success: true,
    message: 'Event updated successfully',
    data: event
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const result = await academicCalendarService.deleteEvent(req.params.id, req.user);

  res.json({
    success: true,
    ...result
  });
});

const getUpcomingEvents = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const events = await academicCalendarService.getUpcomingEvents(req.user, parseInt(days));

  res.json({
    success: true,
    count: events.length,
    data: events
  });
});

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getUpcomingEvents
};
