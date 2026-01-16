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
import { useNavigate, useLocation } from 'react-router-dom';
import InstitutionSwitcher from '../InstitutionSwitcher';

// Logo configuration
// To use your logo: 
// 1. Place your logo file in client/public/logo.png (recommended: 40px height, transparent background)
// 2. The logo will automatically appear in the navbar
// 3. If logo.png doesn't exist, it will fallback to the School icon
// 4. Cache-busting is added to ensure the latest logo is always displayed on navigation

const TopBar = ({ title = 'SGC Education', showInstitutionSwitcher = true, actions = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [showLogo, setShowLogo] = useState(true);
  // Generate cache-busting parameter that includes route to ensure fresh logo on navigation
  // This ensures the logo refreshes when navigating between pages
  // Using pathname ensures cache-busting on navigation, and timestamp ensures fresh load
  const logoCacheBuster = `?v=${Date.now()}&p=${location.pathname}`;
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
        {/* Logo Image - Falls back to School icon if logo.png doesn't exist */}
        {showLogo ? (
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/logo.png${logoCacheBuster}`}
            alt="Logo"
            onError={() => setShowLogo(false)}
            sx={{
              height: { xs: 32, sm: 40 },
              width: 'auto',
              mr: { xs: 1, sm: 2 },
              display: { xs: 'none', sm: 'block' },
              cursor: 'pointer',
              objectFit: 'contain'
            }}
            onClick={() => navigate('/dashboard')}
          />
        ) : (
          <School 
            sx={{ 
              mr: { xs: 1, sm: 2 }, 
              display: { xs: 'none', sm: 'block' },
              cursor: 'pointer'
            }}
            onClick={() => navigate('/dashboard')}
          />
        )}
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

