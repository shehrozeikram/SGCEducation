import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  IconButton
} from '@mui/material';
import {
  AccountBalanceWallet,
  Receipt,
  Search,
  Visibility,
  ArrowBack
} from '@mui/icons-material';
import BankReconciliationReport from './reports/BankReconciliationReport';
import FeeListReport from './reports/FeeListReport';
import RemainingBalanceReport from './reports/RemainingBalanceReport';

const ReportsTab = () => {
  const [selectedReport, setSelectedReport] = useState(null);

  const reports = [
    {
      id: 'bank-reconciliation',
      title: 'Bank Reconciliation',
      description: 'Fee Collected in Bank for Reconciliation. Detailed report of all bank-channeled payments.',
      icon: <AccountBalanceWallet sx={{ fontSize: 40, color: '#667eea' }} />,
      component: <BankReconciliationReport onBack={() => setSelectedReport(null)} />
    },
    {
      id: 'fee-list',
      title: 'Fee List',
      description: 'Comprehensive list of all fees Generated vs Collected for a specific period.',
      icon: <Receipt sx={{ fontSize: 40, color: '#6c757d' }} />,
      component: <FeeListReport onBack={() => setSelectedReport(null)} />
    },
    {
      id: 'remaining-balance',
      title: 'Remaining Balance',
      description: 'Student List with Remaining Balance. Track outstanding dues for all students.',
      icon: <Search sx={{ fontSize: 40, color: '#f89d13' }} />,
      component: <RemainingBalanceReport onBack={() => setSelectedReport(null)} />
    }
  ];

  if (selectedReport) {
    const report = reports.find(r => r.id === selectedReport);
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => setSelectedReport(null)} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" fontWeight="bold" color="#667eea">
            {report.title}
          </Typography>
        </Box>
        {report.component}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4, pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#667eea' }}>
          FEE REPORTS
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a report to view and export data
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid item xs={12} md={4} key={report.id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              transition: '0.3s', 
              '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } 
            }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 2 }}>{report.icon}</Box>
                  <Typography variant="h6" fontWeight="bold">
                    {report.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {report.description}
                </Typography>
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                <Button 
                  variant="contained" 
                  sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }} 
                  startIcon={<Visibility />}
                  onClick={() => setSelectedReport(report.id)}
                >
                  View Report
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportsTab;
