import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAvailableModules } from '../../config/modules';

const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const availableModules = getAvailableModules();
  const sidebarWidth = collapsed ? 80 : 280;

  // State to track which parent modules are expanded
  const [openMenus, setOpenMenus] = useState({});

  // Effect to auto-expand parent menu if a child route is active on mount/navigation
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    const newOpenMenus = { ...openMenus };
    let changed = false;

    availableModules.forEach(module => {
      if (module.children) {
        const isChildActive = module.children.some(child => {
          // Check if current path matches child route exactly or starts with it
          // Handling query params for Fee Management
          return currentPath === child.route || currentPath.startsWith(child.route.split('?')[0]);
        });

        if (isChildActive && !openMenus[module.name]) {
          newOpenMenus[module.name] = true;
          changed = true;
        }
      }
    });

    if (changed) {
      setOpenMenus(newOpenMenus);
    }
  }, [location.pathname, location.search]);

  const handleToggleMenu = (name) => {
    setOpenMenus(prev => ({
      // Only keep the clicked menu open if it wasn't already open
      [name]: !prev[name]
    }));
  };

  const isPathActive = (path) => {
    if (!path) return false;
    const currentPath = location.pathname + location.search;
    
    // For routes with query params (Fee Management)
    if (path.includes('?')) {
      return currentPath === path;
    }
    
    // For exact match or sub-paths (Admissions)
    return currentPath === path || (path !== '/' && currentPath.startsWith(path + '/'));
  };

  const renderMenuItem = (module, isChild = false) => {
    const IconComponent = module.icon;
    const isActive = isPathActive(module.route);
    const hasChildren = module.children && module.children.length > 0;
    const isOpen = openMenus[module.name];

    return (
      <React.Fragment key={module.name}>
        <ListItem disablePadding sx={{ px: 1, mb: 0.2 }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren && !collapsed) {
                handleToggleMenu(module.name);
              } else if (module.route) {
                // Clear open menus when navigating to a direct module link
                setOpenMenus({});
                navigate(module.route);
              }
            }}
            selected={isActive}
            sx={{
              minHeight: 48,
              px: 2.5,
              borderRadius: 2,
              pl: isChild ? 4 : 2.5,
              justifyContent: collapsed ? 'center' : 'initial',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                bgcolor: isChild ? 'transparent' : 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                '& .MuiListItemIcon-root': { color: '#667eea' },
                '&:hover': { bgcolor: isChild ? 'rgba(0,0,0,0.04)' : 'rgba(102, 126, 234, 0.25)' }
              },
              '&:hover': {
                bgcolor: module.color ? `${module.color}10` : 'rgba(0,0,0,0.04)',
              }
            }}
          >
            {IconComponent && (
              <ListItemIcon sx={{ 
                minWidth: 0, 
                mr: collapsed ? 'auto' : 3, 
                justifyContent: 'center',
                color: isActive ? '#667eea' : (module.color || 'inherit')
              }}>
                <IconComponent sx={{ fontSize: 20 }} />
              </ListItemIcon>
            )}
            <ListItemText
              primary={module.name}
              primaryTypographyProps={{
                fontSize: isChild ? '0.8rem' : '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#667eea' : 'text.primary',
                noWrap: true
              }}
              sx={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}
            />
            {!collapsed && hasChildren && (
              isOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && !collapsed && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {module.children.map(child => renderMenuItem(child, true))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        '& .MuiDrawer-paper': {
          width: sidebarWidth,
          boxSizing: 'border-box',
          position: 'fixed',
          top: 64,
          left: 0,
          height: 'calc(100vh - 64px)',
          borderRight: '1px solid #e0e0e0',
          overflowX: 'hidden',
          bgcolor: 'white',
          zIndex: (theme) => theme.zIndex.drawer,
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end', px: 1, py: 1 }}>
        <IconButton onClick={onToggle}>
          {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      <Divider />

      <List sx={{ pt: 1 }}>
        {/* Dashboard Link */}
        <ListItem disablePadding sx={{ px: 1, mb: 0.5 }}>
          <ListItemButton
            selected={location.pathname === '/dashboard'}
            onClick={() => {
              setOpenMenus({}); // Clear open menus when going to dashboard
              navigate('/dashboard');
            }}
            sx={{
              minHeight: 48,
              px: 2.5,
              borderRadius: 2,
              justifyContent: collapsed ? 'center' : 'initial',
              '&.Mui-selected': {
                bgcolor: 'rgba(102, 126, 234, 0.15)',
                color: '#667eea',
                '& .MuiListItemIcon-root': { color: '#667eea' },
                '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.25)' }
              }
            }}
          >
            <ListItemIcon sx={{ 
              minWidth: 0, 
              mr: collapsed ? 'auto' : 3, 
              justifyContent: 'center' 
            }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText
              primary="Dashboard"
              primaryTypographyProps={{
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
              sx={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}
            />
          </ListItemButton>
        </ListItem>

        <Divider sx={{ my: 1 }} />

        {!collapsed && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
              Our Modules
            </Typography>
          </Box>
        )}

        {availableModules.map(module => renderMenuItem(module))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
