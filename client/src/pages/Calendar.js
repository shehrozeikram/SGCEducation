import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { getApiBaseUrl } from '../config/api';

const API_URL = getApiBaseUrl();

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'event',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    location: '',
    isRecurring: false,
    recurrence: {
      frequency: 'weekly',
      interval: 1
    }
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEventsByDate(selectedDate);
  }, [selectedDate, events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/calendar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const filterEventsByDate = (date) => {
    const dateEvents = events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return date >= eventStart && date <= eventEnd;
    });
    setFilteredEvents(dateEvents);
  };

  const handleCreateEvent = async () => {
    try {
      const token = localStorage.getItem('token');
      const eventData = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate)
      };

      if (editingEvent) {
        await axios.put(`${API_URL}/calendar/${editingEvent._id}`, eventData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/calendar`, eventData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setOpenDialog(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/calendar/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      eventType: event.eventType,
      startDate: format(new Date(event.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(event.endDate), 'yyyy-MM-dd'),
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '17:00',
      location: event.location || '',
      isRecurring: event.isRecurring || false,
      recurrence: event.recurrence || { frequency: 'weekly', interval: 1 }
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventType: 'event',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      location: '',
      isRecurring: false,
      recurrence: {
        frequency: 'weekly',
        interval: 1
      }
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      holiday: '#fa709a',
      exam: '#f093fb',
      event: '#4facfe',
      meeting: '#43e97b',
      deadline: '#ff6b6b',
      other: '#feca57'
    };
    return colors[type] || '#667eea';
  };

  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <Grid container spacing={1}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Grid item xs={12/7} key={day}>
            <Typography variant="body2" align="center" fontWeight="bold">
              {day}
            </Typography>
          </Grid>
        ))}
        {Array(monthStart.getDay()).fill(null).map((_, index) => (
          <Grid item xs={12/7} key={`empty-${index}`}>
            <Box sx={{ height: 80 }} />
          </Grid>
        ))}
        {days.map(day => {
          const dayEvents = events.filter(event => {
            const eventStart = new Date(event.startDate);
            const eventEnd = new Date(event.endDate);
            return day >= eventStart && day <= eventEnd;
          });

          return (
            <Grid item xs={12/7} key={day.toISOString()}>
              <Paper
                sx={{
                  p: 1,
                  height: 80,
                  cursor: 'pointer',
                  bgcolor: isToday(day) ? 'primary.light' : 'background.paper',
                  border: isSameDay(day, selectedDate) ? 2 : 0,
                  borderColor: 'primary.main',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => setSelectedDate(day)}
              >
                <Typography variant="body2" fontWeight={isToday(day) ? 'bold' : 'normal'}>
                  {format(day, 'd')}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {dayEvents.slice(0, 2).map((event, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: '100%',
                        height: 4,
                        bgcolor: getEventTypeColor(event.eventType),
                        borderRadius: 1,
                        mb: 0.5
                      }}
                    />
                  ))}
                  {dayEvents.length > 2 && (
                    <Typography variant="caption" color="text.secondary">
                      +{dayEvents.length - 2} more
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Academic Calendar
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          Add Event
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                  Previous
                </Button>
                <Typography variant="h6">
                  {format(currentDate, 'MMMM yyyy')}
                </Typography>
                <Button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                  Next
                </Button>
              </Box>
              {renderCalendarGrid()}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Events on {format(selectedDate, 'MMM d, yyyy')}
              </Typography>
              {filteredEvents.length === 0 ? (
                <Alert severity="info">No events scheduled for this day</Alert>
              ) : (
                <List>
                  {filteredEvents.map((event) => (
                    <ListItem key={event._id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EventIcon sx={{ fontSize: 18, color: getEventTypeColor(event.eventType) }} />
                            {event.title}
                          </Box>
                        }
                        secondary={
                          <>
                            <Chip
                              label={event.eventType}
                              size="small"
                              sx={{
                                backgroundColor: getEventTypeColor(event.eventType),
                                color: 'white',
                                mr: 1
                              }}
                            />
                            {event.startTime && `${event.startTime} - ${event.endTime}`}
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => handleEditEvent(event)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteEvent(event._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Upcoming Events
              </Typography>
              <List>
                {events
                  .filter(event => new Date(event.startDate) >= new Date())
                  .slice(0, 5)
                  .map((event) => (
                    <ListItem key={event._id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={event.title}
                        secondary={format(new Date(event.startDate), 'MMM d, yyyy')}
                      />
                      <Chip
                        label={event.eventType}
                        size="small"
                        sx={{
                          backgroundColor: getEventTypeColor(event.eventType),
                          color: 'white'
                        }}
                      />
                    </ListItem>
                  ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Add/Edit Event Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Event Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={formData.eventType}
                label="Event Type"
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              >
                <MenuItem value="holiday">Holiday</MenuItem>
                <MenuItem value="exam">Exam</MenuItem>
                <MenuItem value="event">Event</MenuItem>
                <MenuItem value="meeting">Meeting</MenuItem>
                <MenuItem value="deadline">Deadline</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="End Time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
              }
              label="Recurring Event"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setEditingEvent(null);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button onClick={handleCreateEvent} variant="contained">
            {editingEvent ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Calendar;
