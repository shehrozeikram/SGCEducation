import React from 'react';
import { Box } from '@mui/material';
import TopBar from './TopBar';

/**
 * PageLayout - Reusable layout wrapper for all pages
 * Automatically includes TopBar with "Back to Home" button
 * 
 * @param {string} title - Page title to display in topbar
 * @param {boolean} showInstitutionSwitcher - Show institution switcher (default: true)
 * @param {ReactNode} actions - Custom action buttons to show in topbar
 * @param {ReactNode} children - Page content
 */
const PageLayout = ({ 
  title = 'SGC Education', 
  showInstitutionSwitcher = true, 
  actions = null,
  children 
}) => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar 
        title={title} 
        showInstitutionSwitcher={showInstitutionSwitcher}
        actions={actions}
      />
      {children}
    </Box>
  );
};

export default PageLayout;

