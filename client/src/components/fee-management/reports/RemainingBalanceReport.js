import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  IconButton,
  Card,
  CardContent,
  Autocomplete
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  Print as PrintIcon, 
  GetApp as DownloadIcon,
  ArrowBack,
  Search
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { getApiBaseUrl } from '../../../config/api';
import { 
  getInstitutionId, 
  createAxiosConfig,
  parseMonthYear,
  formatMonthYear
} from '../../../utils/feeUtils';

const API_URL = getApiBaseUrl();

const RemainingBalanceReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [institutionData, setInstitutionData] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const currentInstitutionId = getInstitutionId(user, isSuperAdmin);

  const [availableStatuses] = useState([
    'Enrolled', 'Soft Admission', 'Struck Off', 'Expelled', 'Freeze', 'School Leaving'
  ]);

  const [filters, setFilters] = useState({
    institution: currentInstitutionId || '',
    classId: 'all',
    studentStatus: ['All'],
    monthYear: new Date().toISOString().slice(0, 7), // YYYY-MM
    viewType: 'full',
    paymentStatus: 'all'
  });

  useEffect(() => {
    // If institution changes in navbar (localStorage), update filters and refetch institution data
    setFilters(prev => ({ ...prev, institution: currentInstitutionId }));
    if (currentInstitutionId) {
      fetchInstitutionData(currentInstitutionId);
    }
  }, [currentInstitutionId]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInstitutionData = async (instId) => {
    try {
      const response = await axios.get(`${API_URL}/institutions/${instId}`, createAxiosConfig());
      setInstitutionData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch institution data', err);
    }
  };

  const fetchInitialData = async () => {
    try {
      const response = await axios.get(`${API_URL}/classes`, createAxiosConfig());
      const rawClasses = response.data.data || [];
      
      // Unique-ify classes by name to avoid duplicates in dropdown
      const uniqueMap = new Map();
      rawClasses.forEach(c => {
        if (c.name && !uniqueMap.has(c.name)) {
          uniqueMap.set(c.name, c);
        }
      });
      setClasses(Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Failed to fetch initial data', err);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const { month, year } = parseMonthYear(filters.monthYear);
      const response = await axios.post(
        `${API_URL}/reports/generate`,
        { 
          type: 'remaining-balance', 
          filters: { 
            ...filters, 
            month, 
            year
          } 
        },
        createAxiosConfig()
      );
      setReportData(response.data.data);
    } catch (err) {
      console.error('Failed to generate report', err);
      alert(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const { data, feeHeads, viewType } = reportData;
    
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
          exportRow[head.name] = (row.heads && row.heads[head._id]) || 0;
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

  const renderTable = () => {
    if (!reportData) return null;
    const { data, feeHeads, viewType, summary } = reportData;
    
    // Group by class/section
    const groupedData = data.reduce((acc, row) => {
      const key = `${row.class} - ${row.section}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
    return (
      <Box sx={{ mt: 4, '@media print': { mt: 0 } }} className="printable-report">
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              .printable-report, .printable-report * { visibility: visible; }
              .printable-report {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              @page { size: landscape; margin: 10mm; }
              .no-print { display: none !important; }
            }
          `}
        </style>

        {/* Report Header with Branding */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #667eea', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {institutionData?.logo && (
              <Box
                component="img"
                src={institutionData.logo.startsWith('http') 
                  ? institutionData.logo 
                  : `${API_URL.replace('/api/v1', '')}${institutionData.logo}`}
                sx={{ width: 60, height: 60, borderRadius: '50%', border: '1px solid #ddd' }}
              />
            )}
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {institutionData?.name || 'Remaining Balance Report'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {institutionData?.address?.city || ''} {institutionData?.address?.state || ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" color="#667eea" fontWeight="bold">Remaining Balance Report</Typography>
            <Typography variant="body2">Month: {formatMonthYear(...Object.values(parseMonthYear(filters.monthYear)))}</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              Print Date: {format(new Date(), 'dd MMM yyyy hh:mm a')}
            </Typography>
          </Box>
        </Box>

        <TableContainer component={Paper} sx={{ border: '1px solid #eee' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Sr No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Std Id</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Adm #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Roll #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Std Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Father Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Mobile</TableCell>
                {viewType === 'head-wise' ? (
                  feeHeads.map(head => (
                    <TableCell key={head._id} sx={{ fontWeight: 'bold' }}>{head.name}</TableCell>
                  ))
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 'bold' }}>P.Bal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>C.Bal</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Receivable</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Received</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Remaining</TableCell>
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
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
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
                            <TableCell key={head._id}>{(row.heads && row.heads[head._id])?.toLocaleString() || 0}</TableCell>
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
              {viewType !== 'head-wise' && (
                <TableRow sx={{ bgcolor: '#eee' }}>
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

  return (
    <Box sx={{ p: 1 }}>
      <Box className="no-print">
        <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={filters.classId}
                    label="Class"
                    onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                  >
                    <MenuItem value="all">All Classes</MenuItem>
                    {classes.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>{cls.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  multiple
                  size="small"
                  options={['All', ...availableStatuses]}
                  value={filters.studentStatus}
                  onChange={(e, newValue) => {
                    if (newValue.length === 0) {
                      setFilters({ ...filters, studentStatus: ['All'] });
                    } else if (newValue.includes('All') && !filters.studentStatus.includes('All')) {
                      setFilters({ ...filters, studentStatus: ['All'] });
                    } else if (newValue.includes('All') && newValue.length > 1) {
                      setFilters({ ...filters, studentStatus: newValue.filter(v => v !== 'All') });
                    } else {
                      setFilters({ ...filters, studentStatus: newValue });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Student Status" placeholder="Status" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip variant="outlined" label={option} size="small" {...getTagProps({ index })} />
                    ))
                  }
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="month"
                  label="Month & Year"
                  value={filters.monthYear}
                  onChange={(e) => setFilters({ ...filters, monthYear: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={filters.paymentStatus}
                    label="Payment Status"
                    onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="not_paid">Not Paid</MenuItem>
                    <MenuItem value="partially_paid">Partially Paid</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>View Type</InputLabel>
                  <Select
                    value={filters.viewType}
                    label="View Type"
                    onChange={(e) => setFilters({ ...filters, viewType: e.target.value })}
                  >
                    <MenuItem value="full">Full Summary</MenuItem>
                    <MenuItem value="head-wise">Head-wise</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                <Button 
                  variant="contained" 
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
                  onClick={handleGenerate}
                  disabled={loading}
                  sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}
                >
                  Search
                </Button>
                {reportData && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={handlePrint} color="primary" title="Print">
                      <PrintIcon />
                    </IconButton>
                    <IconButton onClick={handleExportExcel} color="success" title="Export Excel">
                      <DownloadIcon />
                    </IconButton>
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {renderTable()}
    </Box>
  );
};

export default RemainingBalanceReport;
