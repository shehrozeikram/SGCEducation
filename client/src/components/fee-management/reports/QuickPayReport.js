import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import { Search, FileDownload, Print } from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { getApiBaseUrl, getLogoUrl } from '../../../config/api';
import { notifyError, notifySuccess } from '../../../utils/notify';
import { createAxiosConfig, getInstitutionId, parseMonthYear, formatMonthYear, exportToExcelWithBoldHeaders } from '../../../utils/feeUtils';

const API_URL = getApiBaseUrl();

const QuickPayReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({
    monthYear: new Date().toISOString().slice(0, 7) // YYYY-MM
  });

  useEffect(() => {
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

  const extractDealerCode = (inst) => {
    if (inst?.quickPayPrefix) {
      return inst.quickPayPrefix;
    }
    // Fallback: try parsing prefix from voucherNote if available
    if (inst?.voucherNote) {
      const match = inst.voucherNote.match(/prefix\s*(\d+)/i);
      if (match && match[1]) {
        return match[1];
      }
    }
    return '30050';
  };

  const handleFetchReport = async () => {
    try {
      setLoading(true);
      const isSuperAdmin = user?.role === 'super_admin';
      const institutionId = getInstitutionId(user, isSuperAdmin);
      const { month, year } = parseMonthYear(filters.monthYear);

      const params = { institution: institutionId };
      const response = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({ params }));
      const allStudentFees = response.data.data || [];

      const targetMonth = Number(month);
      const targetYear = Number(year);

      const dealerCode = extractDealerCode(institution);

      // Extract and group vouchers for the target month/year by student
      const vouchersList = [];
      const studentsMap = new Map();

      allStudentFees.forEach(sf => {
        const relevantVouchers = (sf.vouchers || []).filter(v => 
          Number(v.month) === targetMonth && Number(v.year) === targetYear
        );

        if (relevantVouchers.length > 0) {
          const studentId = sf.student?._id?.toString();
          if (!studentId) return;

          if (!studentsMap.has(studentId)) {
            studentsMap.set(studentId, {
              student: sf.student,
              vouchers: []
            });
          }
          const studentData = studentsMap.get(studentId);

          relevantVouchers.forEach(v => {
            studentData.vouchers.push({
              ...v,
              feeHead: sf.feeHead,
              amount: sf.finalAmount,
              paidAmount: sf.paidAmount
            });
          });
        }
      });

      // Now create a single aggregated voucher row per student for the report
      Array.from(studentsMap.values()).forEach(studentData => {
        if (studentData.vouchers.length === 0) return;

        // Take properties from the first voucher in the group
        const firstVoucher = studentData.vouchers[0];
        
        // Calculate current month net payable amount for non-arrears heads (finalAmount - paidAmount)
        const currentMonthAmount = studentData.vouchers
          .filter(v => v.feeHead?.name?.toLowerCase() !== 'arrears')
          .reduce((sum, v) => {
            const netAmount = Math.max(0, (v.amount || 0) - (v.paidAmount || 0));
            return sum + netAmount;
          }, 0);

        // Dynamically compute previous period arrears for this student: Billed Previous (non-Arrears) - Paid Previous (all)
        const studentAllFees = allStudentFees.filter(sf => sf.student?._id?.toString() === studentData.student?._id?.toString());
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

        const previousArrears = Math.max(0, Math.round((totalBilledPrev - totalPaidPrev) * 100) / 100);
        const totalAmount = currentMonthAmount + previousArrears;
        const lateFee = firstVoucher.fine || 0; 
        
        const studentObj = studentData.student || {};
        const admission = studentObj.admission || {};
        const className = admission.class?.name || studentObj.currentClass?.name || studentObj.currentClass || 'Unassigned';

        let rawVNo = firstVoucher.voucherNumber || '';
        let shortVNo = rawVNo.includes('-') ? rawVNo.split('-').pop() : rawVNo;

        const studentIdVal = studentObj.enrollmentNumber || 
                             admission.applicationNumber || 
                             studentObj.applicationNumber || 
                             studentObj.admissionNo || 
                             studentObj.admissionNumber || 
                             studentObj.rollNumber || 
                             'N/A';

        const studentNameVal = studentObj.user?.name || 
                               admission.personalInfo?.name || 
                               studentObj.name || 
                               (admission.personalInfo?.firstName ? `${admission.personalInfo.firstName} ${admission.personalInfo.lastName || ''}`.trim() : 'N/A');

        vouchersList.push({
          voucherNumber: shortVNo,
          rawVoucherNumber: rawVNo,
          dealerCode: dealerCode,
          amount: totalAmount,
          afterDueDateAmount: totalAmount + lateFee,
          invoiceDate: firstVoucher.createdAt || firstVoucher.issueDate || new Date(targetYear, targetMonth - 1, 1),
          validityDate: firstVoucher.validityDate || firstVoucher.dueDate || new Date(targetYear, targetMonth - 1, 30),
          dueDate: firstVoucher.dueDate || new Date(targetYear, targetMonth - 1, 20),
          studentName: studentNameVal,
          studentId: studentIdVal,
          rollNo: studentObj.rollNumber || admission.rollNumber || 'N/A',
          className: className,
          feeMonth: formatMonthYear(month, year)
        });
      });

      // Sort by voucher number
      vouchersList.sort((a, b) => {
        const numA = parseInt(a.voucherNumber) || 0;
        const numB = parseInt(b.voucherNumber) || 0;
        return numA - numB;
      });

      setData(vouchersList);
      notifySuccess(`Found ${vouchersList.length} vouchers`);
    } catch (err) {
      console.error('Error fetching report:', err);
      notifyError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;

    const exportData = data.map((item) => ({
      'Invoice Number': item.voucherNumber || 'N/A',
      'Dealer Code': item.dealerCode || '',
      'Invoice Amount': item.amount,
      'AFTER DUEDATE AMOUNT': item.afterDueDateAmount,
      'Invoice Date': formatDate(item.invoiceDate),
      'Validity Date': formatDate(item.validityDate),
      'Due Date': formatDate(item.dueDate),
      'Reference 1': item.studentName,
      'Reference 2': item.studentId,
      'Reference 3': item.rollNo,
      'Reference 4': item.feeMonth,
      'Reference 5': item.className,
      'Reference 6': item.rollNo
    }));

    exportToExcelWithBoldHeaders(XLSX, exportData, 'Quick Pay Report', `Quick_Pay_Report_${filters.monthYear}.xlsx`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Box>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #report-print-area, #report-print-area * {
              visibility: visible;
            }
            #report-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: landscape;
              margin: 10mm;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              border: 1px solid #ddd !important;
              padding: 4px !important;
              font-size: 8pt !important;
            }
          }
        `}
      </style>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mb: 3 }} className="no-print">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              type="month"
              label="Fee Month & Year"
              value={filters.monthYear}
              onChange={(e) => setFilters({ ...filters, monthYear: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
              onClick={handleFetchReport}
              sx={{ bgcolor: '#667eea', height: '40px' }}
              disabled={loading}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {data.length > 0 ? (
        <Box id="report-print-area">
          <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={handlePrint}
            >
              Print
            </Button>
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              onClick={handleExportExcel}
              color="success"
            >
              Export Excel
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mb: 2 }}>
            {institution?.logo && (
              <Box
                component="img"
                src={getLogoUrl(institution.logo, institution._id)}
                sx={{ height: 60, width: 60, borderRadius: '50%', mb: 1, objectFit: 'cover' }}
              />
            )}
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {institution?.name || 'SGC Education System'}
            </Typography>
            <Typography variant="h6">
              Quick Pay Report - {formatMonthYear(...Object.values(parseMonthYear(filters.monthYear)))}
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #ddd' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Invoice Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Dealer Code</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Invoice Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>After Due Date Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Invoice Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Validity Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reference 1</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reference 2</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reference 3</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reference 4</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reference 5</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reference 6</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index} sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                    <TableCell>{row.voucherNumber}</TableCell>
                    <TableCell>{row.dealerCode}</TableCell>
                    <TableCell>{row.amount.toLocaleString()}</TableCell>
                    <TableCell>{row.afterDueDateAmount.toLocaleString()}</TableCell>
                    <TableCell>{formatDate(row.invoiceDate)}</TableCell>
                    <TableCell>{formatDate(row.validityDate)}</TableCell>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                    <TableCell>{row.studentName}</TableCell>
                    <TableCell>{row.studentId}</TableCell>
                    <TableCell>{row.rollNo}</TableCell>
                    <TableCell>{row.feeMonth}</TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>{row.rollNo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        !loading && (
          <Alert severity="info" sx={{ mt: 2 }} className="no-print">
            No vouchers found for the selected month and year.
          </Alert>
        )
      )}
    </Box>
  );
};

export default QuickPayReport;
