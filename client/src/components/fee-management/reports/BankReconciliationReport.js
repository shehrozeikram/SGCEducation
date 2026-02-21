import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import { Search, FileDownload, Print, ArrowBack } from '@mui/icons-material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { getApiBaseUrl } from '../../../config/api';
import { notifyError } from '../../../utils/notify';
import { createAxiosConfig, getInstitutionId } from '../../../utils/feeUtils';

const API_URL = getApiBaseUrl();

const BankReconciliationReport = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    bankAccount: ''
  });

  const bankAccounts = [
    { id: 'allied', name: 'Allied Bank Account No #: -0010000076780246' },
    { id: 'bankislami', name: 'Bank Islami Account No #: -310000223490001' }
  ];

  useEffect(() => {
    // Load existing data from localStorage
    const savedInstitution = localStorage.getItem('selectedInstitution');
    if (savedInstitution) {
      try {
        setInstitution(JSON.parse(savedInstitution));
      } catch (e) {
        console.error('Error parsing institution data');
      }
    }
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing user data');
      }
    }
  }, []);

  const handleFetchReport = async () => {
    try {
      setLoading(true);
      const config = createAxiosConfig();
      
      const isSuperAdmin = user?.role === 'super_admin';
      const institutionId = getInstitutionId(user, isSuperAdmin);

      const params = {
        startDate: filters.dateFrom,
        endDate: filters.dateTo,
        institution: institutionId
      };

      const response = await axios.get(`${API_URL}/fees/payments`, { ...config, params });
      
      let filteredData = response.data.data || [];
      
      // Filter by bank if selected
      if (filters.bankAccount) {
        const selectedBank = bankAccounts.find(b => b.id === filters.bankAccount);
        // Find by partial match of the name or ID
        const bankKey = selectedBank.id === 'allied' ? 'Allied' : 'Islami';
        filteredData = filteredData.filter(p => 
          p.bankName?.toLowerCase().includes(bankKey.toLowerCase()) ||
          p.remarks?.toLowerCase().includes(bankKey.toLowerCase())
        );
      } else {
        // Show only bank-related payments for this report if no bank selected
        filteredData = filteredData.filter(p => 
          ['bank_transfer', 'online', 'cheque'].includes(p.paymentMethod) || p.bankName
        );
      }

      setData(filteredData);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;

    const exportData = data.map((item, index) => ({
      'Voucher #': item.voucherNumber || '0',
      'Sr #': index + 1,
      'Dep. Date': new Date(item.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      'Std.ID': item.student?.enrollmentNumber || 'N/A',
      'Roll NO': item.student?.rollNumber || 'N/A',
      'Adm #': item.student?.admission?.applicationNumber || 'N/A',
      'Name': item.student?.name || 'N/A',
      'Class': item.student?.admission?.class?.name || 'N/S',
      'Section': item.student?.admission?.section?.name || 'N/S',
      'Father Name': item.student?.guardianInfo?.fatherName || item.student?.admission?.guardianInfo?.fatherName || 'N/A',
      'B.Dep.Date': new Date(item.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      'Fine': 0,
      'P. Fine': 0,
      'A. Fine': 0,
      'Amount': item.amount
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Reconciliation');
    XLSX.writeFile(wb, `Bank_Reconciliation_${filters.dateFrom}_to_${filters.dateTo}.xlsx`);
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
              border-bottom: 1px solid #ddd !important;
              padding: 4px !important;
              font-size: 8pt !important;
            }
          }
        `}
      </style>

      {/* Filter Section */}
      <Paper sx={{ p: 3, mb: 3 }} className="no-print">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Bank Deposit Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Bank Deposit Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Bank Account</InputLabel>
              <Select
                value={filters.bankAccount}
                label="Bank Account"
                onChange={(e) => setFilters({ ...filters, bankAccount: e.target.value })}
              >
                <MenuItem value="">All Bank Accounts</MenuItem>
                {bankAccounts.map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Search />}
              onClick={handleFetchReport}
              sx={{ bgcolor: '#667eea', height: '40px' }}
              disabled={loading}
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : data.length > 0 ? (
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
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExportExcel}
              color="success"
            >
              Export
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: 'serif' }}>
              {institution?.name || 'TIGES - TAJ CAMPUS'}
            </Typography>
            <Typography variant="h6" sx={{ fontFamily: 'serif', mt: -1 }}>
              {institution?.address?.city || 'Islamabad'}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', textDecoration: 'underline', mt: 0.5 }}>
              Fee Collected in Bank
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: 1, fontSize: '0.85rem' }}>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="body2"><b>From:</b> {formatDate(filters.dateFrom)}</Typography>
              <Typography variant="body2"><b>To:</b> {formatDate(filters.dateTo)}</Typography>
              <Typography variant="body2">
                <b>Account.#</b> {filters.bankAccount ? bankAccounts.find(b => b.id === filters.bankAccount)?.name : 'All Accounts'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2">
                <b>Print Date:</b> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} &nbsp; {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ borderBottomWidth: 2, borderColor: 'black', mb: 0.5 }} />
          <Box sx={{ px: 1, py: 0.5, borderBottom: '1px solid black', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Cashier: {user?.firstName} {user?.lastName}, Id:{user?.id || '9'}, Code:{user?.employeeCode || '6120'}
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: 'none' }}>
            <Table size="small" sx={{ 
              '& th': { fontWeight: 'bold', borderBottom: '1px solid black', px: 0.5, py: 0.5, fontSize: '0.75rem' },
              '& td': { borderBottom: 'none', px: 0.5, py: 0.3, fontSize: '0.75rem' }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell>Voucher #</TableCell>
                  <TableCell>Sr #</TableCell>
                  <TableCell>Dep. Date</TableCell>
                  <TableCell>Std.ID</TableCell>
                  <TableCell>Roll NO</TableCell>
                  <TableCell>Adm #</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Father Name</TableCell>
                  <TableCell>B.Dep.Date</TableCell>
                  <TableCell align="right">Fine</TableCell>
                  <TableCell align="right">P. Fine</TableCell>
                  <TableCell align="right">A. Fine</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={row._id}>
                    <TableCell>{row.voucherNumber || '0'}</TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(row.paymentDate)}</TableCell>
                    <TableCell>{row.student?.enrollmentNumber || '-'}</TableCell>
                    <TableCell>{row.student?.rollNumber || '-'}</TableCell>
                    <TableCell>{row.student?.admission?.applicationNumber || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.student?.name}</TableCell>
                    <TableCell>{row.student?.admission?.class?.name || '-'}</TableCell>
                    <TableCell>{row.student?.admission?.section?.name || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.student?.guardianInfo?.fatherName || row.student?.admission?.guardianInfo?.fatherName || '-'}</TableCell>
                    <TableCell>{formatDate(row.paymentDate)}</TableCell>
                    <TableCell align="right">0</TableCell>
                    <TableCell align="right">0</TableCell>
                    <TableCell align="right">0</TableCell>
                    <TableCell align="right">{row.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ borderTop: '1px solid black', mt: 1, pt: 1, px: 1, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Total Students: {data.length}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Total Amount: {data.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
            </Typography>
            <Typography variant="body2">
              Page 1 of 1
            </Typography>
          </Box>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }} className="no-print">
          No collection data found for the selected criteria.
        </Alert>
      )}
    </Box>
  );
};

export default BankReconciliationReport;
