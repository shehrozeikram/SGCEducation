import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Checkbox,
  FormControlLabel,
  TextField,
  Autocomplete,
  Chip,
  IconButton,
  Alert
} from '@mui/material';
import {
  Print,
  FileDownload,
  FilterList,
  Search,
  ArrowBack
} from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  getInstitutionId, 
  createAxiosConfig, 
  parseMonthYear, 
  formatCurrency, 
  formatMonthYear,
  exportToExcelWithBoldHeaders
} from '../../../utils/feeUtils';
import { getApiBaseUrl, getLogoUrl } from '../../../config/api';
import { notifyError, notifySuccess } from '../../../utils/notify';

const API_URL = getApiBaseUrl();

const FeeListReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [user, setUser] = useState(null);
  const [institution, setInstitution] = useState(null);
  const [availableStatuses, setAvailableStatuses] = useState([
    'Enrolled', 'Soft Admission', 'Struck Off', 'Expelled', 'Freeze', 'School Leaving'
  ]);
  
  const [filters, setFilters] = useState({
    className: 'All',
    statuses: ['All'],
    monthYear: new Date().toISOString().slice(0, 7), // YYYY-MM
    includePreviousBalance: false
  });

  const [reportData, setReportData] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [summary, setSummary] = useState({
    totalReceived: 0,
    totalRemaining: 0,
    totalDue: 0
  });

  const printRef = useRef();
  const fetchClassesRef = useRef(false);

  useEffect(() => {
    if (!fetchClassesRef.current) {
      fetchClasses();
      fetchClassesRef.current = true;
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        fetchInstitution(parsedUser);
      } catch (e) {
        console.error('Error parsing user data');
      }
    }
  }, []);

  const fetchInstitution = async (userData) => {
    try {
      const isSuperAdmin = userData?.role === 'super_admin';
      const institutionId = getInstitutionId(userData, isSuperAdmin);
      if (institutionId) {
        const response = await axios.get(`${API_URL}/institutions/${institutionId}`, createAxiosConfig());
        setInstitution(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching institution:', err);
    }
  };

  const fetchClasses = async () => {
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
      console.error('Error fetching classes:', err);
      notifyError('Failed to fetch classes');
    }
  };

  const handleClassChange = (e) => {
    const className = e.target.value;
    setFilters(prev => ({ ...prev, className }));
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleFetchReport = async () => {
    // If className is not 'All' and is empty, notify user
    if (!filters.className && filters.className !== 'All') {
      notifyError('Please select a class');
      return;
    }

    try {
      setLoading(true);
      const isSuperAdmin = user?.role === 'super_admin';
      const institutionId = getInstitutionId(user, isSuperAdmin);
      const { month, year } = parseMonthYear(filters.monthYear);

      // 1. Fetch all student fees for the institution
      const params = {
        institution: institutionId,
      };

      const response = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({ params }));
      const allStudentFees = response.data.data || [];

      // 2. Filter students based on Class Name and Status
      let filteredFees = allStudentFees.filter(sf => {
        const admission = sf.student?.admission || {};
        const student = sf.student || {};
        
        // Match Class Name (skip if 'All')
        if (filters.className !== 'All') {
          const sClassName = admission.class?.name || student.currentClass?.name || student.currentClass || '';
          const matchClass = sClassName.toString().toLowerCase() === filters.className.toLowerCase();
          if (!matchClass) return false;
        }

        // Match Status (skip if it contains 'All' or is empty)
        if (filters.statuses.length > 0 && !filters.statuses.includes('All')) {
          const sStatus = student.status || admission.status || '';
          const matchStatus = filters.statuses.some(s => s.toLowerCase() === sStatus.toLowerCase());
          if (!matchStatus) return false;
        }

        return true;
      });

      const targetMonth = Number(month);
      const targetYear = Number(year);

      // 3. Step 1: Identify students who have a fee in the target month
      const targetStudentIds = new Set();
      filteredFees.forEach(sf => {
        const hasCurrentMonthVoucher = (sf.vouchers || []).some(v => 
          Number(v.month) === targetMonth && Number(v.year) === targetYear
        );
        if (hasCurrentMonthVoucher && sf.student?._id) {
          targetStudentIds.add(sf.student._id.toString());
        }
      });

      // 4. Step 2: Process records only for these students
      const studentsGroup = new Map();

      filteredFees.forEach(sf => {
        const studentId = sf.student?._id?.toString();
        if (!studentId || !targetStudentIds.has(studentId)) return;

        // Find vouchers in this StudentFee record that match our time criteria
        const relevantVouchers = (sf.vouchers || []).filter(v => {
          const vMonth = Number(v.month);
          const vYear = Number(v.year);
          
          if (filters.includePreviousBalance) {
            // Cumulative: everything up to target date
            return vYear < targetYear || (vYear === targetYear && vMonth <= targetMonth);
          } else {
            // Month-only: only matches target date
            return vYear === targetYear && vMonth === targetMonth;
          }
        });

        if (relevantVouchers.length > 0) {
          if (!studentsGroup.has(studentId)) {
            studentsGroup.set(studentId, {
              student: sf.student,
              fees: [],
              monthlyFees: 0,
              totalDue: 0,
              totalReceived: 0,
              totalRemaining: 0,
              headwise: {}
            });
          }

          const group = studentsGroup.get(studentId);
          group.fees.push(sf);

          const isCurrentMonth = (sf.vouchers || []).some(v => 
            Number(v.month) === targetMonth && Number(v.year) === targetYear
          );

          if (isCurrentMonth) {
            const headName = sf.feeHead?.name || 'Other';
            const isArrearsHead = headName.toLowerCase() === 'arrears';

            if (isArrearsHead) {
              // Only count Arrears head if user explicitly checked 'Include Previous Balance'
              // And calculate it dynamically from previous periods to prevent double-counting
              if (filters.includePreviousBalance) {
                // Calculate dynamic arrears for this student: Billed Previous (non-Arrears) - Paid Previous (all)
                const studentAllFees = filteredFees.filter(f => f.student?._id?.toString() === studentId);
                let totalBilledPrev = 0;
                let totalPaidPrev = 0;

                studentAllFees.forEach(f => {
                  const hasVouchers = f.vouchers && f.vouchers.length > 0;
                  let isPrevious = false;
                  if (hasVouchers) {
                    isPrevious = f.vouchers.every(v => 
                      (Number(v.year) < targetYear) || 
                      (Number(v.year) === targetYear && Number(v.month) < targetMonth)
                    );
                  }
                  if (isPrevious) {
                    if (f.feeHead?.name?.toLowerCase() !== 'arrears') {
                      totalBilledPrev += parseFloat(f.finalAmount || 0);
                    }
                    totalPaidPrev += parseFloat(f.paidAmount || 0);
                  }
                });

                const calcArrears = Math.max(0, Math.round((totalBilledPrev - totalPaidPrev) * 100) / 100);
                group.headwise[headName] = calcArrears;
                group.totalDue += calcArrears;
                group.totalRemaining += calcArrears;
              }
            } else {
              const paidAmount = sf.paidAmount || 0;
              const remainingAmount = (sf.remainingAmount !== undefined ? sf.remainingAmount : (sf.finalAmount || 0) - paidAmount);
              group.monthlyFees += (sf.finalAmount || 0);
              group.headwise[headName] = (group.headwise[headName] || 0) + (sf.finalAmount || 0);
              group.totalDue += (sf.finalAmount || 0);
              group.totalReceived += paidAmount;
              group.totalRemaining += remainingAmount;
            }
          }
        }
      });

      // Convert Map to array and enrich with className for grouping
      const finalData = Array.from(studentsGroup.values()).map(item => {
        const admission = item.student?.admission || {};
        const student = item.student || {};
        const className = admission.class?.name || student.currentClass?.name || student.currentClass || 'Unassigned';
        return {
          ...item,
          displayClassName: className
        };
      }).sort((a, b) => {
        // Primary sort: Class Name
        const classComp = a.displayClassName.localeCompare(b.displayClassName);
        if (classComp !== 0) return classComp;
        
        // Secondary sort: Student Name
        const nameA = a.student?.user?.name || '';
        const nameB = b.student?.user?.name || '';
        return nameA.localeCompare(nameB);
      });

      // Extract unique fee head names for columns
      const headsSet = new Set();
      finalData.forEach(item => {
        Object.keys(item.headwise).forEach(h => headsSet.add(h));
      });
      const sortedHeads = Array.from(headsSet).sort((a, b) => {
        if (a === 'Arrears') return -1;
        if (b === 'Arrears') return 1;
        return a.localeCompare(b);
      });

      setReportData(finalData);
      setFeeHeads(sortedHeads);

      // Calculate overall summary
      const totals = finalData.reduce((acc, curr) => ({
        totalReceived: acc.totalReceived + curr.totalReceived,
        totalRemaining: acc.totalRemaining + curr.totalRemaining,
        totalDue: acc.totalDue + curr.totalDue
      }), { totalReceived: 0, totalRemaining: 0, totalDue: 0 });

      setSummary(totals);
      setLoading(false);
      notifySuccess(`Found ${finalData.length} students`);

    } catch (err) {
      console.error('Error fetching report:', err);
      notifyError('Failed to fetch report data');
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;

    const exportData = reportData.map((item, index) => {
      const row = {
        'Sr#': index + 1,
        'Std. ID': item.student?.enrollmentNumber || 'N/A',
        'Roll#': item.student?.rollNumber || 'N/A',
        'Adm#': item.student?.admission?.applicationNumber || 'N/A',
        'Student Name': item.student?.user?.name || item.student?.admission?.personalInfo?.name || 'N/A',
        'Class': item.displayClassName || 'N/A',
        'Section': item.student?.admission?.section?.name || 'N/A',
        'Father Name': item.student?.admission?.guardianInfo?.fatherName || 'N/A',
        'Monthly Fee': item.monthlyFees,
        'Total Received': item.totalReceived,
        'Total Remaining': item.totalRemaining,
        'Pre Months Fine Received': 0, // Placeholder
        'Total Due': item.totalDue,
      };

      // Add headwise detail
      feeHeads.forEach(head => {
        row[head] = item.headwise[head] || 0;
      });

      return row;
    });

    exportToExcelWithBoldHeaders(XLSX, exportData, 'Fee List', `FeeList_${filters.monthYear}.xlsx`);
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Search Filters */}
      <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={filters.className}
                  label="Class"
                  onChange={handleClassChange}
                >
                  <MenuItem value="All">All Classes</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls._id} value={cls.name}>{cls.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                multiple
                size="small"
                options={['All', ...availableStatuses]}
                value={filters.statuses}
                onChange={(e, newValue) => {
                  if (newValue.includes('All')) {
                    handleFilterChange('statuses', ['All']);
                  } else {
                    handleFilterChange('statuses', newValue);
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
                onChange={(e) => handleFilterChange('monthYear', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={filters.includePreviousBalance}
                    onChange={(e) => handleFilterChange('includePreviousBalance', e.target.checked)}
                    color="primary"
                  />
                }
                label="Include Prev Bal"
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
                onClick={handleFetchReport}
                disabled={loading}
                sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportData.length > 0 ? (
        <Paper ref={printRef} sx={{ p: 4, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
          {/* Print Styles */}
          <style>
            {`
              @media print {
                body * { visibility: hidden; }
                .print-area, .print-area * { visibility: visible; }
                .print-area { 
                  position: absolute; 
                  left: 0; 
                  top: 0; 
                  width: 100%; 
                  padding: 10px;
                }
                .no-print { display: none !important; }
                @page { size: landscape; margin: 10mm; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 4px; font-size: 8pt; }
                .header-info { margin-bottom: 20px; }
              }
            `}
          </style>

          <Box className="print-area">
            {/* Action Buttons (Hidden on Print) */}
            <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrint}
                sx={{ color: '#667eea', borderColor: '#667eea' }}
              >
                Print
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownload />}
                onClick={handleExportExcel}
                sx={{ bgcolor: '#48bb78', '&:hover': { bgcolor: '#38a169' } }}
              >
                Export Excel
              </Button>
            </Box>

            {/* Print Header */}
            <Box className="header-info" sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2, position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: 0 }}>
                  {institution?.logo ? (
                    <Box
                      component="img"
                      src={getLogoUrl(institution.logo, institution._id)}
                      sx={{ height: '80px', width: '80px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img src="/logo192.png" alt="Logo" style={{ height: '80px' }} onError={(e) => e.target.style.display='none'} />
                  )}
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ letterSpacing: 1 }}>
                    {institution?.name || 'SGC Education System'}
                  </Typography>
                  <Typography variant="h6">{institution?.address?.city || ''}</Typography>
                  <Typography variant="body1" fontWeight="bold" color="text.secondary">
                    Fee List Report
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mt: 2, border: '1px solid #eee', p: 1, bgcolor: '#fbfbfb', fontSize: 'small' }}>
                <Grid item xs={4}>
                  <Typography variant="body2" textAlign="left">
                    Include Previous Balance: <strong>{filters.includePreviousBalance ? 'Yes' : 'No'}</strong>
                  </Typography>
                  <Typography variant="body2" textAlign="left">
                    Date: <strong>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                   <Typography variant="body2">
                    Status: <strong>{filters.statuses.join(', ')}</strong>
                  </Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">
                    Month: <strong>{formatMonthYear(...Object.values(parseMonthYear(filters.monthYear)))}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Year: <strong>{parseMonthYear(filters.monthYear).year}</strong>
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, p: 1, bgcolor: '#eee', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  Class: {filters.className === 'All' ? 'All Classes' : filters.className}
                </Typography>
                <Typography variant="body2" fontWeight="bold">Total Received: {formatCurrency(summary.totalReceived)}</Typography>
                <Typography variant="body2" fontWeight="bold">Total Remaining: {formatCurrency(summary.totalRemaining)}</Typography>
                <Typography variant="body2" fontWeight="bold">Total Due: {formatCurrency(summary.totalDue)}</Typography>
              </Box>
            </Box>

            {/* Table */}
            <TableContainer sx={{ border: '1px solid #eee' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Sr#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Std. ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Roll#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Adm#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px' }}>Father Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Monthly Fee</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Total Received</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Total Remaining</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Pre Months Fine Received</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '10px', textAlign: 'right' }}>Total Due</TableCell>
                    
                    {/* Headwise Headers */}
                    <TableCell sx={{ p: 0, minWidth: 200 }}>
                       <Box sx={{ borderBottom: '1px solid #ddd', textAlign: 'center', py: 0.5 }}>Headwise Detail</Box>
                       <Box sx={{ display: 'flex' }}>
                         {feeHeads.map(head => (
                           <Box key={head} sx={{ flex: 1, textAlign: 'center', py: 0.5, borderRight: '1px solid #ddd', fontSize: '9px', fontWeight: 'bold' }}>
                             {head}
                           </Box>
                         ))}
                       </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.map((item, index) => {
                    // Check if this is a new class group
                    const showHeader = index === 0 || item.displayClassName !== reportData[index - 1].displayClassName;
                    
                    return (
                      <React.Fragment key={item.student?._id}>
                        {showHeader && (
                          <TableRow sx={{ bgcolor: '#f0f4ff' }}>
                            <TableCell colSpan={11 + feeHeads.length} sx={{ py: 0.5, px: 2 }}>
                              <Typography variant="subtitle2" fontWeight="bold" color="#667eea">
                                Class: {item.displayClassName}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                          <TableCell sx={{ fontSize: '10px' }}>{index + 1}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.enrollmentNumber || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.rollNumber || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.admission?.applicationNumber || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.user?.name || item.student?.admission?.personalInfo?.name || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px' }}>{item.student?.admission?.guardianInfo?.fatherName || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right' }}>{item.monthlyFees.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right' }}>{item.totalReceived.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right' }}>{item.totalRemaining.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right' }}>0</TableCell>
                          <TableCell sx={{ fontSize: '10px', textAlign: 'right', fontWeight: 'bold' }}>{item.totalDue.toLocaleString()}.00</TableCell>
                          
                          {/* Headwise Cells */}
                          <TableCell sx={{ p: 0 }}>
                            <Box sx={{ display: 'flex', height: '100%' }}>
                              {feeHeads.map(head => (
                                <Box key={head} sx={{ flex: 1, textAlign: 'center', py: 0.5, borderRight: '1px solid #ddd', fontSize: '10px' }}>
                                  {item.headwise[head] ? item.headwise[head].toLocaleString() : '0'}
                                </Box>
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Total Row */}
                  <TableRow sx={{ bgcolor: '#eee' }}>
                    <TableCell colSpan={6} sx={{ fontWeight: 'bold', textAlign: 'left' }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                      {reportData.reduce((acc, curr) => acc + curr.monthlyFees, 0).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                      {summary.totalReceived.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                      {summary.totalRemaining.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>0</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                      {summary.totalDue.toLocaleString()}.00
                    </TableCell>
                    <TableCell sx={{ p: 0 }}>
                       <Box sx={{ display: 'flex' }}>
                          {feeHeads.map(head => (
                            <Box key={head} sx={{ flex: 1, textAlign: 'center', py: 0.5, borderRight: '1px solid #ddd', fontSize: '10px', fontWeight: 'bold' }}>
                              {reportData.reduce((acc, curr) => acc + (curr.headwise[head] || 0), 0).toLocaleString()}
                            </Box>
                          ))}
                        </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer */}
            <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="caption" color="text.secondary">
                Print Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
              </Typography>
            </Box>
          </Box>
        </Paper>
      ) : (
        !loading && (
          <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px dashed #ccc' }}>
            <Typography variant="h6" color="text.secondary">
              No data found for the selected filters.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please select Class, Section and Month/Year and click Search.
            </Typography>
          </Box>
        )
      )}
    </Box>
  );
};

export default FeeListReport;
