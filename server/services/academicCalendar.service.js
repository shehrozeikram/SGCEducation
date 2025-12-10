const AcademicCalendar = require('../models/AcademicCalendar');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Academic Calendar Service
 */
class AcademicCalendarService {
  /**
   * Get all events
   */
  async getEvents(filters = {}, currentUser) {
    const query = {};

    // Super admin can see all, others only their institution
    if (currentUser.role !== 'super_admin' && currentUser.institution) {
      query.$or = [
        { institution: currentUser.institution },
        { institution: null } // Global events
      ];
    }

    if (filters.institution) query.institution = filters.institution;
    if (filters.eventType) query.eventType = filters.eventType;

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.startDate = {};
      if (filters.startDate) query.startDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.startDate.$lte = new Date(filters.endDate);
    }

    const events = await AcademicCalendar.find(query)
      .populate('institution', 'name code')
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    return events;
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId) {
    const event = await AcademicCalendar.findById(eventId)
      .populate('institution', 'name code')
      .populate('createdBy', 'name email')
      .populate('attendees', 'name email');

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    return event;
  }

  /**
   * Create event
   */
  async createEvent(data, currentUser) {
    const event = await AcademicCalendar.create({
      ...data,
      createdBy: currentUser.id
    });

    return event;
  }

  /**
   * Update event
   */
  async updateEvent(eventId, data, currentUser) {
    const event = await AcademicCalendar.findById(eventId);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' && event.createdBy.toString() !== currentUser.id) {
      throw new ApiError(403, 'Access denied');
    }

    Object.assign(event, data);
    await event.save();

    return event;
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId, currentUser) {
    const event = await AcademicCalendar.findById(eventId);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (currentUser.role !== 'super_admin' && event.createdBy.toString() !== currentUser.id) {
      throw new ApiError(403, 'Access denied');
    }

    await AcademicCalendar.findByIdAndDelete(eventId);

    return { message: 'Event deleted successfully' };
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(currentUser, days = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const query = {
      startDate: {
        $gte: today,
        $lte: endDate
      }
    };

    if (currentUser.role !== 'super_admin' && currentUser.institution) {
      query.$or = [
        { institution: currentUser.institution },
        { institution: null }
      ];
    }

    const events = await AcademicCalendar.find(query)
      .populate('institution', 'name code')
      .sort({ startDate: 1 })
      .limit(10);

    return events;
  }
}

module.exports = new AcademicCalendarService();
