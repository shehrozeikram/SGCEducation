import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const RemainingBalanceReport = () => {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        This report is under development. Detailed requirements will be implemented soon.
      </Alert>
      <Typography variant="body1">
        Student List with Remaining Balance. Track outstanding dues for all students.
      </Typography>
    </Box>
  );
};

export default RemainingBalanceReport;
