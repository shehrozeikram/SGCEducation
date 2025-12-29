import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Description as ReportIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'institution',
    format: 'pdf',
    schedule: {
      enabled: false,
      frequency: 'monthly',
      time: '09:00'
    },
    filters: {}
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/reports`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOpenDialog(false);
      setFormData({
        name: '',
        description: '',
        type: 'institution',
        format: 'pdf',
        schedule: {
          enabled: false,
          frequency: 'monthly',
          time: '09:00'
        },
        filters: {}
      });
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create report');
    }
  };

  const handleGenerateReport = async (reportId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reports/${reportId}/generate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedReport(response.data.data);
      setOpenViewDialog(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete report');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      institution: '#667eea',
      user: '#43e97b',
      activity: '#feca57',
      custom: '#ee5a6f'
    };
    return colors[type] || '#667eea';
  };

  const renderReportData = () => {
    if (!generatedReport || !generatedReport.data) return null;

    const { summary, data } = generatedReport.data;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Summary
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.entries(summary).map(([key, value]) => (
            <Grid item xs={6} sm={4} key={key}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h6" gutterBottom>
          Detailed Data
        </Typography>
        {Array.isArray(data) && data.length > 0 ? (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {Object.keys(data[0]).map((key) => (
                    <TableCell key={key}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value, i) => (
                      <TableCell key={i}>
                        {typeof value === 'object' ? JSON.stringify(value) : value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">No detailed data available</Alert>
        )}
      </Box>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Reports & Export
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Create Report
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && !openViewDialog ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {reports.map((report) => (
            <Grid item xs={12} sm={6} md={4} key={report._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ReportIcon sx={{ mr: 1, color: getTypeColor(report.type) }} />
                    <Typography variant="h6" component="div">
                      {report.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {report.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={report.type}
                      size="small"
                      sx={{ backgroundColor: getTypeColor(report.type), color: 'white' }}
                    />
                    <Chip label={report.format.toUpperCase()} size="small" variant="outlined" />
                    {report.schedule?.enabled && (
                      <Chip label={`${report.schedule.frequency}`} size="small" color="primary" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Created: {format(new Date(report.createdAt), 'MMM d, yyyy')}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleGenerateReport(report._id)}
                  >
                    Generate
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteReport(report._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Report Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Report</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Report Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <InputLabel>Report Type</InputLabel>
              <Select
                value={formData.type}
                label="Report Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="institution">Institution</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="activity">Activity</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={formData.format}
                label="Export Format"
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateReport} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {generatedReport?.reportConfig?.name || 'Report'}
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderReportData()
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reports;
