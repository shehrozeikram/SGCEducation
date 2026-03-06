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
  Description as ReportIcon,
  Print
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { getApiBaseUrl } from '../config/api';
import { getInstitutionId, createAxiosConfig } from '../utils/feeUtils';

const API_URL = getApiBaseUrl();

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  
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
    filters: {
      institution: getInstitutionId(user, isSuperAdmin) || '',
      studentStatus: ['active'],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      viewType: 'full',
      paymentStatus: 'all'
    }
  });

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const requests = [
        axios.get(`${API_URL}/classes`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/sections`, { headers: { Authorization: `Bearer ${token}` } })
      ];

      if (isSuperAdmin) {
        requests.push(axios.get(`${API_URL}/institutions`, { headers: { Authorization: `Bearer ${token}` } }));
      }

      const [classesRes, sectionsRes, institutionsRes] = await Promise.all(requests);
      
      setClasses(classesRes.data.data || []);
      setSections(sectionsRes.data.data || []);
      if (institutionsRes) {
        setInstitutions(institutionsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch initial data', err);
    }
  };

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

  const handleExportExcel = () => {
    if (!generatedReport || !generatedReport.data) return;

    const { data, feeHeads, viewType } = generatedReport.data;
    
    let exportData = data.map((row, idx) => {
      const exportRow = {
        'Sr No': idx + 1,
        'Std Id': row.enrollmentNumber,
        'Adm #': row.admissionNumber,
        'Roll #': row.rollNumber,
        'Std Name': row.studentName,
        'Father Name': row.fatherName,
        'Mobile Number': row.mobileNumber,
        'Class': row.class,
        'Section': row.section
      };

      if (viewType === 'head-wise') {
        feeHeads.forEach(head => {
          exportRow[head.name] = row.heads[head._id] || 0;
        });
      } else {
        exportRow['P.Bal'] = row.previousBalance;
        exportRow['C.Bal'] = row.currentBalance;
        exportRow['Receivable'] = row.receivable;
        exportRow['Received'] = row.received;
        exportRow['Remaining'] = row.remaining;
      }
      return exportRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Remaining Balance');
    XLSX.writeFile(workbook, `Remaining_Balance_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
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
      financial: '#fa709a',
      activity: '#feca57',
      custom: '#ee5a6f',
      'remaining-balance': '#48c6ef'
    };
    return colors[type] || '#667eea';
  };

  const renderRemainingBalanceReport = (reportData) => {
    const { data, feeHeads, viewType, summary } = reportData;
    
    // Group by class/section
    const groupedData = data.reduce((acc, row) => {
      const key = `${row.class} - ${row.section}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});

    return (
      <Box sx={{ p: 2, '@media print': { p: 0 } }} className="printable-report">
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              .printable-report, .printable-report * { visibility: visible; }
              .printable-report { position: absolute; left: 0; top: 0; width: 100%; }
              .MuiDialog-paper { margin: 0; max-width: none; width: 100%; box-shadow: none; }
              .MuiDialogActions-root, .MuiDialogTitle-root { display: none; }
              .MuiTableContainer-root { overflow: visible !important; height: auto !important; max-height: none !important; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd !important; -webkit-print-color-adjust: exact; }
              .MuiTableRow-root { page-break-inside: avoid; }
            }
          `}
        </style>
        {/* Header matching screenshot */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
            TIGES - TAJ CAMPUS
          </Typography>
          <Typography variant="h6">
            Islamabad
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>
            Student List with Remaining Balance
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
            <Typography variant="body2">
              <strong>Month:</strong> {format(new Date(2026, reportData.filters.month - 1), 'MMMM')} {reportData.filters.year}
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {reportData.filters.studentStatus?.join(', ')}
            </Typography>
          </Box>
        </Box>
        
        <TableContainer component={Paper} sx={{ mt: 2, maxHeight: '60vh', border: '1px solid #eee' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Sr No</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Std Id</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Adm #</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Roll #</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Std Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Father Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Mobile Number</TableCell>
                {viewType === 'head-wise' ? (
                  feeHeads.map(head => (
                    <TableCell key={head._id} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>{head.name}</TableCell>
                  ))
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>P.Bal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>C.Bal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Receivable</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Received</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Remaining</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(groupedData).map(([groupKey, students]) => {
                const groupSubtotal = students.reduce((acc, s) => ({
                  p: acc.p + s.previousBalance,
                  c: acc.c + s.currentBalance,
                  rec: acc.rec + s.receivable,
                  received: acc.received + s.received,
                  rem: acc.rem + s.remaining
                }), { p: 0, c: 0, rec: 0, received: 0, rem: 0 });

                return (
                  <React.Fragment key={groupKey}>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell colSpan={7 + (viewType === 'head-wise' ? feeHeads.length : 5)} sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                        {groupKey}
                      </TableCell>
                    </TableRow>
                    {students.map((row, idx) => (
                      <TableRow key={row.studentId}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{row.enrollmentNumber}</TableCell>
                        <TableCell>{row.admissionNumber}</TableCell>
                        <TableCell>{row.rollNumber}</TableCell>
                        <TableCell>{row.studentName}</TableCell>
                        <TableCell>{row.fatherName}</TableCell>
                        <TableCell>{row.mobileNumber}</TableCell>
                        {viewType === 'head-wise' ? (
                          feeHeads.map(head => (
                            <TableCell key={head._id}>{row.heads[head._id]?.toLocaleString() || 0}</TableCell>
                          ))
                        ) : (
                          <>
                            <TableCell>{row.previousBalance.toLocaleString()}</TableCell>
                            <TableCell>{row.currentBalance.toLocaleString()}</TableCell>
                            <TableCell>{row.receivable.toLocaleString()}</TableCell>
                            <TableCell>{row.received.toLocaleString()}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{row.remaining.toLocaleString()}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                    {viewType !== 'head-wise' && (
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell colSpan={7} sx={{ fontWeight: 'bold', textAlign: 'right' }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.p.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.c.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.rec.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.received.toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{groupSubtotal.rem.toLocaleString()}</TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
              {/* Grand Total Row */}
              {viewType !== 'head-wise' && (
                <TableRow sx={{ bgcolor: 'primary.main', '& .MuiTableCell-root': { color: 'white' } }}>
                  <TableCell colSpan={7} sx={{ fontWeight: 'bold', textAlign: 'right' }}>Grand Total</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalPBal.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalCBal.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalReceivable.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalReceived.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{summary.totalRemaining.toLocaleString()}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderReportData = () => {
    if (!generatedReport || !generatedReport.data) return null;

    if (generatedReport.data.reportType === 'remaining-balance') {
      return renderRemainingBalanceReport(generatedReport.data);
    }

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
                <MenuItem value="financial">Financial</MenuItem>
                <MenuItem value="activity">Activity</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
                <MenuItem value="remaining-balance">Remaining Balance</MenuItem>
              </Select>
            </FormControl>

            {formData.type === 'remaining-balance' && (
              <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Report Filters</Typography>
                <Grid container spacing={2}>
                  {isSuperAdmin && (
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Campus</InputLabel>
                        <Select
                          value={formData.filters.institution || ''}
                          label="Campus"
                          onChange={(e) => setFormData({
                            ...formData,
                            filters: { ...formData.filters, institution: e.target.value }
                          })}
                        >
                          <MenuItem value="">Default / Select Campus</MenuItem>
                          {institutions.map(inst => (
                            <MenuItem key={inst._id} value={inst._id}>{inst.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Class</InputLabel>
                      <Select
                        value={formData.filters.classId || ''}
                        label="Class"
                        onChange={(e) => setFormData({
                          ...formData,
                          filters: { ...formData.filters, classId: e.target.value }
                        })}
                      >
                        <MenuItem value="">All Classes</MenuItem>
                        {classes.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Payment Status</InputLabel>
                      <Select
                        value={formData.filters.paymentStatus || 'all'}
                        label="Payment Status"
                        onChange={(e) => setFormData({
                          ...formData,
                          filters: { ...formData.filters, paymentStatus: e.target.value }
                        })}
                      >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="not_paid">Not Paid</MenuItem>
                        <MenuItem value="partially_paid">Partially Paid</MenuItem>
                        <MenuItem value="paid">Paid</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Month</InputLabel>
                      <Select
                        value={formData.filters.month || 1}
                        label="Month"
                        onChange={(e) => setFormData({
                          ...formData,
                          filters: { ...formData.filters, month: e.target.value }
                        })}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            {format(new Date(2026, i), 'MMM')}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Year"
                      value={formData.filters.year || 2026}
                      onChange={(e) => setFormData({
                        ...formData,
                        filters: { ...formData.filters, year: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>View</InputLabel>
                      <Select
                        value={formData.filters.viewType || 'full'}
                        label="View"
                        onChange={(e) => setFormData({
                          ...formData,
                          filters: { ...formData.filters, viewType: e.target.value }
                        })}
                      >
                        <MenuItem value="full">Full Summary</MenuItem>
                        <MenuItem value="head-wise">Head-wise</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Student Status</InputLabel>
                      <Select
                        multiple
                        value={formData.filters.studentStatus || ['active']}
                        label="Student Status"
                        onChange={(e) => setFormData({
                          ...formData,
                          filters: { ...formData.filters, studentStatus: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value }
                        })}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="transferred">Transferred</MenuItem>
                        <MenuItem value="graduated">Graduated</MenuItem>
                        <MenuItem value="expelled">Expelled</MenuItem>
                        <MenuItem value="on_leave">On Leave</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}

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
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            sx={{ mr: 1 }}
          >
            Export to Excel
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Print />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reports;
