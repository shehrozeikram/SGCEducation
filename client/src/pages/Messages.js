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
  CardActions,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Message as MessageIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Notifications as NotificationIcon,
  Campaign as CampaignIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { getApiBaseUrl } from '../config/api';

const API_URL = getApiBaseUrl();

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    type: 'email',
    targetAudience: {
      type: 'all',
      criteria: {}
    },
    scheduledFor: null
  });

  useEffect(() => {
    fetchMessages();
    fetchTemplates();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data.data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const handleCreateMessage = async () => {
    try {
      const token = localStorage.getItem('token');
      const messageData = {
        ...formData,
        scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor) : null
      };

      if (editingMessage) {
        await axios.put(`${API_URL}/messages/${editingMessage._id}`, messageData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Message updated successfully');
      } else {
        await axios.post(`${API_URL}/messages`, messageData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Message created successfully');
      }

      setOpenDialog(false);
      setEditingMessage(null);
      resetForm();
      fetchMessages();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save message');
    }
  };

  const handleSendMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to send this message?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/messages/${messageId}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Message sent successfully');
      fetchMessages();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Message deleted successfully');
      fetchMessages();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setFormData({
      subject: message.subject,
      content: message.content,
      type: message.type,
      targetAudience: message.targetAudience,
      scheduledFor: message.scheduledFor ? format(new Date(message.scheduledFor), "yyyy-MM-dd'T'HH:mm") : null
    });
    setOpenDialog(true);
  };

  const handleUseTemplate = (template) => {
    setFormData({
      ...formData,
      subject: template.subject,
      content: template.content
    });
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      content: '',
      type: 'email',
      targetAudience: {
        type: 'all',
        criteria: {}
      },
      scheduledFor: null
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'email':
        return <EmailIcon />;
      case 'sms':
        return <SmsIcon />;
      case 'notification':
        return <NotificationIcon />;
      case 'announcement':
        return <CampaignIcon />;
      default:
        return <MessageIcon />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#feca57',
      scheduled: '#4facfe',
      sent: '#43e97b',
      failed: '#ee5a6f'
    };
    return colors[status] || '#667eea';
  };

  const filterMessagesByStatus = (status) => {
    if (status === 'all') return messages;
    return messages.filter(msg => msg.status === status);
  };

  const renderMessageCards = (messageList) => {
    if (messageList.length === 0) {
      return (
        <Alert severity="info">No messages found</Alert>
      );
    }

    return (
      <Grid container spacing={3}>
        {messageList.map((message) => (
          <Grid item xs={12} sm={6} md={4} key={message._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getTypeIcon(message.type)}
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {message.subject}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {message.content.substring(0, 100)}...
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={message.status}
                    size="small"
                    sx={{ backgroundColor: getStatusColor(message.status), color: 'white' }}
                  />
                  <Chip label={message.type} size="small" variant="outlined" />
                  <Chip label={message.targetAudience.type} size="small" variant="outlined" />
                </Box>
                {message.deliveryStats && message.status === 'sent' && (
                  <Typography variant="caption" color="text.secondary">
                    Sent to {message.deliveryStats.total} recipients
                    {message.deliveryStats.failed > 0 && ` (${message.deliveryStats.failed} failed)`}
                  </Typography>
                )}
                {message.scheduledFor && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Scheduled: {format(new Date(message.scheduledFor), 'MMM d, yyyy HH:mm')}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                {message.status === 'draft' && (
                  <>
                    <Button
                      size="small"
                      startIcon={<SendIcon />}
                      onClick={() => handleSendMessage(message._id)}
                    >
                      Send
                    </Button>
                    <IconButton size="small" onClick={() => handleEditMessage(message)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteMessage(message._id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Communication Center
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          New Message
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Messages" />
          <Tab label="Drafts" />
          <Tab label="Scheduled" />
          <Tab label="Sent" />
          <Tab label="Failed" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {currentTab === 0 && renderMessageCards(filterMessagesByStatus('all'))}
          {currentTab === 1 && renderMessageCards(filterMessagesByStatus('draft'))}
          {currentTab === 2 && renderMessageCards(filterMessagesByStatus('scheduled'))}
          {currentTab === 3 && renderMessageCards(filterMessagesByStatus('sent'))}
          {currentTab === 4 && renderMessageCards(filterMessagesByStatus('failed'))}
        </>
      )}

      {/* Create/Edit Message Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingMessage ? 'Edit Message' : 'Create New Message'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {templates.length > 0 && (
              <Autocomplete
                options={templates}
                getOptionLabel={(option) => option.name}
                onChange={(e, value) => value && handleUseTemplate(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Use Template (Optional)" />
                )}
                sx={{ mb: 2 }}
              />
            )}

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Message Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Message Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                    <MenuItem value="notification">Notification</MenuItem>
                    <MenuItem value="announcement">Announcement</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Target Audience</InputLabel>
                  <Select
                    value={formData.targetAudience.type}
                    label="Target Audience"
                    onChange={(e) => setFormData({
                      ...formData,
                      targetAudience: { type: e.target.value, criteria: {} }
                    })}
                  >
                    <MenuItem value="all">All Users</MenuItem>
                    <MenuItem value="role">By Role</MenuItem>
                    <MenuItem value="institution">By Institution</MenuItem>
                    <MenuItem value="department">By Department</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Message Content"
              multiline
              rows={8}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="datetime-local"
              label="Schedule For (Optional)"
              value={formData.scheduledFor || ''}
              onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setEditingMessage(null);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button onClick={handleCreateMessage} variant="contained">
            {editingMessage ? 'Update' : 'Save as Draft'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Messages;
