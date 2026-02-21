import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

const FeeListReport = ({ onBack }) => {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        This report is under development. Detailed requirements will be implemented soon.
      </Alert>
      <Typography variant="body1">
        Comprehensive list of all fees Generated vs Collected for a specific period.
      </Typography>
    </Box>
  );
};

export default FeeListReport;
