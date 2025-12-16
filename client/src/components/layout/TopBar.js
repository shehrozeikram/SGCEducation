import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  School,
  Home,
  AccountCircle,
  Settings,
  ExitToApp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import InstitutionSwitcher from '../InstitutionSwitcher';

const TopBar = ({ title = 'SGC Education', showInstitutionSwitcher = true, actions = null }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedInstitution');
    navigate('/login');
  };

  return (
    <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 2 }}>
        <School sx={{ mr: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'block' } }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontSize: { xs: '0.9rem', sm: '1.25rem' },
            cursor: 'pointer'
          }}
          onClick={() => navigate('/dashboard')}
        >
          {title}
        </Typography>

        {/* Institution Switcher (for Super Admin) */}
        {isSuperAdmin && showInstitutionSwitcher && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            <InstitutionSwitcher />
          </Box>
        )}

        {/* Custom Actions */}
        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actions}
          </Box>
        )}

        {/* Back to Home Button */}
        <Button
          variant="outlined"
          startIcon={<Home />}
          onClick={() => navigate('/dashboard')}
          sx={{
            borderColor: 'rgba(255, 255, 255, 0.5)',
            color: 'white',
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Back to Home</Box>
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Home</Box>
        </Button>

        {/* User Info and Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
          <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user.name}
          </Typography>
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleProfile}>
              <Settings sx={{ mr: 1 }} fontSize="small" />
              Profile Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;

