import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import { Assessment, Download, PictureAsPdf, TableChart } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import * as XLSX from 'xlsx';

const AdmissionByMonthReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState([]);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const columns = [
    { 
      field: 'studentId', 
      headerName: 'Student ID', 
      width: 120, 
      sortable: true, 
      filterable: true,
      headerAlign: 'center',
      align: 'center',
    },
    { 
      field: 'rollNumber', 
      headerName: 'Roll Number', 
      width: 130, 
      sortable: true, 
      filterable: true,
      headerAlign: 'center',
      align: 'center',
    },
    { 
      field: 'admissionNumber', 
      headerName: 'Admission #', 
      width: 150, 
      sortable: true, 
      filterable: true,
      headerAlign: 'center',
      align: 'center',
    },
    { 
      field: 'studentName', 
      headerName: 'Student Name', 
      width: 200, 
      sortable: true, 
      filterable: true,
      headerAlign: 'left',
      align: 'left',
    },
    { 
      field: 'fatherName', 
      headerName: 'FatherName', 
      width: 200, 
      sortable: true, 
      filterable: true,
      headerAlign: 'left',
      align: 'left',
    },
    { 
      field: 'schoolName', 
      headerName: 'School Name', 
      width: 250, 
      sortable: true, 
      filterable: true,
      headerAlign: 'left',
      align: 'left',
    },
    { 
      field: 'className', 
      headerName: 'Class Name', 
      width: 150, 
      sortable: true, 
      filterable: true,
      headerAlign: 'center',
      align: 'center',
    },
    { 
      field: 'sectionName', 
      headerName: 'SectionName', 
      width: 130, 
      sortable: true, 
      filterable: true,
      headerAlign: 'center',
      align: 'center',
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 140, 
      sortable: true, 
      filterable: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: 1,
            backgroundColor: 
              params.value === 'enrolled' ? '#4caf50' :
              params.value === 'approved' ? '#2196f3' :
              params.value === 'pending' ? '#ff9800' :
              params.value === 'rejected' ? '#f44336' : '#9e9e9e',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            textTransform: 'capitalize',
          }}
        >
          {params.value}
        </Box>
      ),
    },
  ];

  const handleGenerateReport = async () => {
    if (!filters.month || !filters.year) {
      setError('Please select both month and year');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      const response = await axios.get('http://localhost:5000/api/v1/admissions/reports/by-month-detailed', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          month: filters.month,
          year: filters.year,
        }
      });

      setReportData(response.data.data || []);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.message || 'Failed to generate report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      setError('No data to export');
      return;
    }

    // Prepare data for export with all required fields
    const exportData = reportData.map((row) => ({
      'Student ID': row.studentId || '',
      'Roll Number': row.rollNumber || '',
      'Admission #': row.admissionNumber || '',
      'Student Name': row.studentName || '',
      'School Name': row.schoolName || '',
      'Father Name': row.fatherName || '',
      'Class Name': row.className || '',
      'Section Name': row.sectionName || '',
      'Status': row.status || '',
      'Date Of Birth': row.dateOfBirth || '',
      'Mobile Number': row.mobileNumber || '',
      'Age': row.age || '',
      'Hobbies': row.hobbies || '',
      'Admission Date': row.admissionDate || '',
      'Admission Effective Date': row.admissionEffectiveDate || '',
      'Gender': row.gender || '',
      'Religion': row.religion || '',
      'Guardian': row.guardian || '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Student ID
      { wch: 15 }, // Roll Number
      { wch: 15 }, // Admission #
      { wch: 25 }, // Student Name
      { wch: 30 }, // School Name
      { wch: 25 }, // Father Name
      { wch: 15 }, // Class Name
      { wch: 15 }, // Section Name
      { wch: 12 }, // Status
      { wch: 15 }, // Date Of Birth
      { wch: 15 }, // Mobile Number
      { wch: 8 }, // Age
      { wch: 20 }, // Hobbies
      { wch: 15 }, // Admission Date
      { wch: 20 }, // Admission Effective Date
      { wch: 10 }, // Gender
      { wch: 15 }, // Religion
      { wch: 25 }, // Guardian
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Admissions');

    // Generate filename
    const monthName = months.find(m => m.value === parseInt(filters.month))?.label || filters.month;
    const filename = `New_Admission_${monthName}_${filters.year}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  const handleExportPDF = () => {
    alert('PDF export functionality coming soon!');
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} className="no-print">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" color="#667eea">
            New Admission Detail By Month
          </Typography>
          {reportData.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<TableChart />}
                onClick={handleExportExcel}
                color="success"
              >
                Export Excel
              </Button>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={handleExportPDF}
                color="error"
              >
                Export PDF
              </Button>
            </Box>
          )}
        </Box>
        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Month Selection */}
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Month</InputLabel>
              <Select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                label="Month"
              >
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Year Selection */}
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Year"
              type="number"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            />
          </Grid>

          {/* Show Button */}
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              onClick={handleGenerateReport}
              disabled={loading}
              fullWidth
              size="large"
              sx={{
                height: '56px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Show'}
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

      {!loading && reportData.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {reportData.length} records for {months.find(m => m.value === parseInt(filters.month))?.label} {filters.year}
          </Typography>

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={reportData.map((row, index) => ({ id: index, ...row }))}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10, page: 0 },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableSelectionOnClick
              disableRowSelectionOnClick
              density="compact"
              sx={{
                '& .MuiDataGrid-root': {
                  border: '1px solid #e0e0e0',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#0b7ad1',
                  color: 'white !important',
                  fontWeight: 'bold',
                  fontSize: '14px',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 'bold',
                  color: 'white !important',
                },
                '& .MuiDataGrid-columnHeader': {
                  backgroundColor: '#0b7ad1',
                },
                '& .MuiDataGrid-iconSeparator': {
                  color: 'white',
                },
                '& .MuiDataGrid-menuIcon': {
                  color: 'white',
                },
                '& .MuiDataGrid-sortIcon': {
                  color: 'white',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #e0e0e0',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            />
          </Box>
        </Paper>
      )}

      {!loading && reportData.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Assessment sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No admissions found for the selected month and year
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AdmissionByMonthReport;

