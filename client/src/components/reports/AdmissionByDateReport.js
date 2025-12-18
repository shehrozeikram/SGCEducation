import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { Assessment, DateRange, Print } from '@mui/icons-material';
import axios from 'axios';

const AdmissionByDateReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [groupedData, setGroupedData] = useState({});
  const printRef = useRef();
  
  // Form states
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    reportType: 'total', // 'total', 'fee-deposit', 'without-fee-deposit'
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  // Fetch institutions
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (isSuperAdmin) {
          const response = await axios.get('http://localhost:5000/api/v1/institutions', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setInstitutions(response.data.data || []);
        } else {
          // For non-superadmin (admin role), fetch all institutions
          // The API will automatically filter to return only their institution
          try {
            const response = await axios.get('http://localhost:5000/api/v1/institutions', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const fetchedInstitutions = response.data.data || [];
            
            if (fetchedInstitutions.length > 0) {
              // For admin, they should only see their own institution
              setInstitutions(fetchedInstitutions);
              // Auto-select the first (and only) institution
              setSelectedInstitutions([fetchedInstitutions[0]._id]);
            } else {
              // Fallback: try to get from localStorage or user object
              const selectedInstitutionData = localStorage.getItem('selectedInstitution');
              if (selectedInstitutionData) {
                try {
                  const institutionData = JSON.parse(selectedInstitutionData);
                  setInstitutions([institutionData]);
                  setSelectedInstitutions([institutionData._id || institutionData]);
                } catch (e) {
                  console.error('Failed to parse selectedInstitution:', e);
                  setError('No institution found for your account. Please contact administrator.');
                }
              } else if (user.institution) {
                const institutionId = typeof user.institution === 'object' ? user.institution._id : user.institution;
                const institutionData = typeof user.institution === 'object' ? user.institution : { _id: institutionId, name: 'My Institution', code: '' };
                setInstitutions([institutionData]);
                setSelectedInstitutions([institutionId]);
              } else {
                setError('No institution found for your account. Please contact administrator.');
              }
            }
          } catch (err) {
            console.error('Error fetching institutions:', err);
            setError(err.response?.data?.message || 'Failed to load institutions');
          }
        }
      } catch (err) {
        console.error('Error fetching institutions:', err);
        setError(err.response?.data?.message || 'Failed to load institutions');
      }
    };

    fetchInstitutions();
  }, []);

  // Handle select all
  const handleSelectAll = (event) => {
    const checked = event.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedInstitutions(filteredInstitutions.map(inst => inst._id));
    } else {
      setSelectedInstitutions([]);
    }
  };

  // Handle individual institution selection
  const handleInstitutionToggle = (institutionId) => {
    setSelectedInstitutions(prev => {
      if (prev.includes(institutionId)) {
        return prev.filter(id => id !== institutionId);
      } else {
        return [...prev, institutionId];
      }
    });
  };

  // Filter institutions by search term
  const filteredInstitutions = institutions.filter(inst =>
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle generate report
  const handleGenerateReport = async () => {
    if (selectedInstitutions.length === 0) {
      setError('Please select at least one school');
      return;
    }

    if (!filters.startDate || !filters.endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      const response = await axios.get('http://localhost:5000/api/v1/admissions/reports/by-date', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          institutions: selectedInstitutions.join(','),
          startDate: filters.startDate,
          endDate: filters.endDate,
          reportType: filters.reportType,
        }
      });

      const data = response.data.data;
      setReportData(data);
      
      // Group data by date
      const grouped = data.reduce((acc, item) => {
        const date = item.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);
        return acc;
      }, {});
      setGroupedData(grouped);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.message || 'Failed to generate report');
      setReportData(null);
      setGroupedData({});
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-report, #printable-report * {
              visibility: visible;
            }
            #printable-report {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-before: always;
            }
            @page {
              margin: 0.5in;
            }
          }
        `}
      </style>

      <Paper sx={{ p: 3, mb: 3 }} className="no-print">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="#667eea">
            Admission By Date Report
          </Typography>
          {reportData && (
            <Button
              variant="contained"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Print Report
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Schools Selection */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Schools</InputLabel>
              <Select
                value={selectedInstitutions.length > 0 ? selectedInstitutions[0] : ''}
                label="Schools"
                renderValue={() => {
                  if (selectedInstitutions.length === 0) return 'Select Schools';
                  if (selectedInstitutions.length === 1) {
                    const inst = institutions.find(i => i._id === selectedInstitutions[0]);
                    return inst ? `${inst.name} (${inst.code})` : '';
                  }
                  return `${selectedInstitutions.length} schools selected`;
                }}
              >
                {/* Search Box */}
                <Box sx={{ px: 2, pb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>

                {/* Select All */}
                <MenuItem onClick={(e) => e.stopPropagation()}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    }
                    label="Select All"
                  />
                </MenuItem>

                <Divider />

                {/* Institution List */}
                {filteredInstitutions.map((institution) => (
                  <MenuItem
                    key={institution._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstitutionToggle(institution._id);
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedInstitutions.includes(institution._id)}
                        />
                      }
                      label={`${institution.name} (${institution.code})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* From Date */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="From Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* To Date */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="To Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Report Type Radio Buttons */}
          <Grid item xs={12} md={3}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Report Type</FormLabel>
              <RadioGroup
                value={filters.reportType}
                onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
              >
                <FormControlLabel
                  value="total"
                  control={<Radio />}
                  label="Total Admission"
                />
                <FormControlLabel
                  value="fee-deposit"
                  control={<Radio />}
                  label="Fee Deposit"
                />
                <FormControlLabel
                  value="without-fee-deposit"
                  control={<Radio />}
                  label="Without Fee Deposit"
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Show Report Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<Assessment />}
              onClick={handleGenerateReport}
              disabled={loading}
              fullWidth
              size="large"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Show Report'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Report Display Area */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && reportData && (
        <Paper sx={{ p: 3 }} className="no-print">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Period: {new Date(filters.startDate).toLocaleDateString()} to {new Date(filters.endDate).toLocaleDateString()}
            {' | '}
            Report Type: {filters.reportType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            {' | '}
            Total Records: {reportData.length}
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Admission #</strong></TableCell>
                  <TableCell><strong>Student Name</strong></TableCell>
                  <TableCell><strong>Father Name</strong></TableCell>
                  <TableCell><strong>Gender</strong></TableCell>
                  <TableCell><strong>Mobile</strong></TableCell>
                  <TableCell><strong>School</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No data available for the selected criteria
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.keys(groupedData).map((date) => (
                    <React.Fragment key={date}>
                      <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                        <TableCell colSpan={8}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Date: {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' '}({groupedData[date].length} {groupedData[date].length === 1 ? 'student' : 'students'})
                          </Typography>
                        </TableCell>
                      </TableRow>
                      {groupedData[date].map((row, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{new Date(row.admissionDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip label={row.admissionNumber} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{row.studentName}</TableCell>
                          <TableCell>{row.fatherName}</TableCell>
                          <TableCell>{row.gender}</TableCell>
                          <TableCell>{row.mobile}</TableCell>
                          <TableCell>{row.schoolName}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              size="small"
                              color={
                                row.status === 'enrolled' ? 'success' :
                                row.status === 'approved' ? 'primary' :
                                row.status === 'pending' ? 'warning' : 'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {!loading && !reportData && (
        <Box sx={{ textAlign: 'center', py: 6 }} className="no-print">
          <DateRange sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Configure filters and click "Show Report" to generate the report
          </Typography>
        </Box>
      )}

      {/* Printable Report View */}
      {reportData && (
        <Box
          id="printable-report"
          sx={{
            display: 'none',
            '@media print': {
              display: 'block',
            },
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {/* School Logo - You may need to adjust the path */}
            <img
              src="/logo.png"
              alt="School Logo"
              style={{ width: '80px', height: '80px', marginBottom: '10px' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <Typography variant="h5" fontWeight="bold">
              {institutions.find(inst => selectedInstitutions.includes(inst._id))?.name || 'School Name'}
            </Typography>
            <Typography variant="body1">
              {institutions.find(inst => selectedInstitutions.includes(inst._id))?.address?.city || 'Islamabad'}
            </Typography>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }} fontWeight="bold">
              Admission By Date
            </Typography>
            <Typography variant="body2">
              From: {new Date(filters.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} To: {new Date(filters.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Typography>
          </Box>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', border: '1px solid black' }}>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Student ID</th>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Roll #</th>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Admission #</th>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Admission Date</th>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Name</th>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Father Name</th>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Gender</th>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Mobile</th>
                <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>School Class Section</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedData).map((date, dateIndex) => (
                <React.Fragment key={dateIndex}>
                  <tr style={{ backgroundColor: '#e8e8e8' }}>
                    <td colSpan="9" style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>
                      Date: {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                  {groupedData[date].map((student, index) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid black', padding: '4px' }}>{student.studentId || index + 1}</td>
                      <td style={{ border: '1px solid black', padding: '4px' }}>{student.rollNumber || index + 1}</td>
                      <td style={{ border: '1px solid black', padding: '4px' }}>{student.admissionNumber || index + 1}</td>
                      <td style={{ border: '1px solid black', padding: '4px' }}>
                        {new Date(student.admissionDate || date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ border: '1px solid black', padding: '4px' }}>{student.studentName}</td>
                      <td style={{ border: '1px solid black', padding: '4px' }}>{student.fatherName || 'Father Name'}</td>
                      <td style={{ border: '1px solid black', padding: '4px' }}>{student.gender || 'Male'}</td>
                      <td style={{ border: '1px solid black', padding: '4px' }}>{student.mobile}</td>
                      <td style={{ border: '1px solid black', padding: '4px' }}>{student.classSection || student.schoolName}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <td colSpan="9" style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                      Student Count: {groupedData[date].length}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <Box sx={{ mt: 4, textAlign: 'right' }}>
            <Typography variant="body2">
              Print Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdmissionByDateReport;

