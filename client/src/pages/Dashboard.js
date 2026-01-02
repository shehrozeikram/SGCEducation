import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  AccountCircle,
  School,
  ExitToApp,
  Settings,
  AccountBalance,
  TrendingUp,
  People,
  Domain,
  Assessment,
  CheckCircle,
  Cancel,
  Business,
  Description,
  Event,
  Message,
  Speed,
  ContactMail,
  PersonAdd,
  EventAvailable,
  Payment,
  Notifications,
  Report,
  MenuBook,
  LocalLibrary,
  Inventory,
  SupervisorAccount,
  DirectionsBus,
  Brush,
  Hotel,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';
import InstitutionSwitcher from '../components/InstitutionSwitcher';

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  useEffect(() => {
    fetchDashboardStats();

    // Load selected institution
    const institutionData = localStorage.getItem('selectedInstitution');
    if (institutionData) {
      try {
        setSelectedInstitution(JSON.parse(institutionData));
      } catch (e) {
        console.error('Failed to parse institution data', e);
      }
    }
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const institutionData = localStorage.getItem('selectedInstitution');

      // Build URL with institution parameter if available
      let url = 'http://localhost:5000/api/v1/dashboard/stats';
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          url += `?institution=${institution._id}`;
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

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
    navigate('/login');
  };

  const modules = [
    { name: 'Inquiry', icon: <ContactMail />, color: '#667eea', route: null },
    { name: 'Admissions', icon: <PersonAdd />, color: '#f093fb', route: '/admissions' },
    { name: 'Attendance', icon: <EventAvailable />, color: '#4facfe', route: null },
    { name: 'Fee Management', icon: <Payment />, color: '#43e97b', route: '/fee-management' },
    { name: 'Results', icon: <Assessment />, color: '#feca57', route: null },
    { name: 'SMS & Notification', icon: <Notifications />, color: '#fa709a', route: '/notifications' },
    { name: 'Complaints', icon: <Report />, color: '#ee5a6f', route: null },
    { name: 'Academics', icon: <MenuBook />, color: '#764ba2', route: null },
    { name: 'HR Management', icon: <People />, color: '#667eea', route: null },
    { name: 'Library', icon: <LocalLibrary />, color: '#f093fb', route: null },
    { name: 'Assets Management', icon: <Inventory />, color: '#4facfe', route: null },
    { name: 'Finance Management', icon: <AccountBalance />, color: '#43e97b', route: null },
    { name: 'User & Privilege', icon: <SupervisorAccount />, color: '#feca57', route: '/users' },
    { name: 'Configuration', icon: <Settings />, color: '#fa709a', route: '/settings' },
    { name: 'Transport', icon: <DirectionsBus />, color: '#ee5a6f', route: null },
    { name: 'Event', icon: <Event />, color: '#764ba2', route: '/calendar' },
    { name: 'Institute Branding', icon: <Brush />, color: '#667eea', route: null },
    { name: 'Student Consultancy', icon: <School />, color: '#f093fb', route: null },
    { name: 'Franchise Management', icon: <Business />, color: '#4facfe', route: null },
    { name: 'Hostel Management', icon: <Hotel />, color: '#43e97b', route: null },
    { name: 'Electronic Paper Generation', icon: <Description />, color: '#feca57', route: '/reports' },
  ];

  const handleModuleClick = (module) => {
    if (module.route) {
      navigate(module.route);
    } else {
      alert(`${module.name} module is coming soon!`);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
    <Card
      elevation={0}
      sx={{
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 16px ${color}20`
        }
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-start' }, gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {title}
            </Typography>
            <Typography
              variant="h3"
              fontWeight="bold"
              color={color}
              sx={{
                mb: 1,
                fontSize: { xs: '1.75rem', sm: '2.5rem' },
                wordBreak: 'break-word'
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && trend !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ fontSize: { xs: 14, sm: 16 }, mr: 0.5, color: 'success.main' }} />
                <Typography variant="caption" color="success.main" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  {trend} this month
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{
            p: { xs: 1, sm: 1.5 },
            borderRadius: 2,
            backgroundColor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: { xs: 'flex-end', sm: 'flex-start' }
          }}>
            {React.cloneElement(icon, { sx: { fontSize: { xs: 28, sm: 32 }, color: color } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Toolbar>
            <School sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              SGC Education - Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4, overflow: 'visible' }}>
      {/* Top Navigation Bar */}
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <School sx={{ mr: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'block' } }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
            SGC Education - Dashboard
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
            <InstitutionSwitcher />
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

      {/* Dashboard Content */}
      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3, md: 4 }, mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 }, overflow: 'visible' }}>
        {/* Welcome Section */}
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
            Welcome back, {user.name || 'Admin'}!
          </Typography>
          {selectedInstitution && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Business sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="h6" color="primary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {selectedInstitution.name}
              </Typography>
              <Chip
                label={selectedInstitution.type}
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
              <Chip
                label={selectedInstitution.isActive ? 'Active' : 'Inactive'}
                size="small"
                color={selectedInstitution.isActive ? 'success' : 'default'}
              />
            </Box>
          )}
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {selectedInstitution
              ? `Managing ${selectedInstitution.name} - Here's what's happening today.`
              : "Here's what's happening with your education platform today."}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {dashboardData && (
          <>
            {/* Main Statistics Cards */}
            <Grid container spacing={{ xs: 2, sm: 2, md: 3 }} sx={{ mb: { xs: 3, sm: 4 }, position: 'relative' }}>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  title="Total Institutions"
                  value={dashboardData.overview.totalInstitutions}
                  icon={<Domain />}
                  color="#667eea"
                  subtitle={`${dashboardData.overview.activeInstitutions} active`}
                  trend={dashboardData.growth.institutionsLast30Days}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  title="Total Departments"
                  value={dashboardData.overview.totalDepartments}
                  icon={<AccountBalance />}
                  color="#f093fb"
                  trend={dashboardData.growth.departmentsLast30Days}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  title="Total Users"
                  value={dashboardData.overview.totalUsers}
                  icon={<People />}
                  color="#4facfe"
                  subtitle={`${dashboardData.users.roleBreakdown.students} students`}
                  trend={dashboardData.growth.usersLast30Days}
                />
              </Grid>
              <Grid item xs={12} sm={6} lg={3}>
                <StatCard
                  title="System Health"
                  value="100%"
                  icon={<Assessment />}
                  color="#43e97b"
                  subtitle="All systems operational"
                />
              </Grid>
            </Grid>

            {/* Our Modules */}
            <Box sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Our Modules
              </Typography>
              <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
                {modules.map((module, index) => (
                  <Grid item xs={6} sm={4} md={3} lg={2.4} key={index} sx={{ display: 'flex' }}>
                    <Card
                      elevation={0}
                      onClick={() => handleModuleClick(module)}
                      sx={{
                        cursor: 'pointer',
                        background: `linear-gradient(135deg, ${module.color}35 0%, ${module.color}20 100%)`,
                        border: `1px solid ${module.color}50`,
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        width: '100%',
                        height: { xs: 130, sm: 160 },
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 16px ${module.color}40`,
                          border: `1px solid ${module.color}70`,
                        }
                      }}
                    >
                      <CardContent
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: { xs: 2, sm: 2.5 },
                          textAlign: 'center',
                          flex: 1,
                          '&:last-child': { pb: { xs: 2, sm: 2.5 } }
                        }}
                      >
                        <Box
                          sx={{
                            p: { xs: 1.5, sm: 2 },
                            borderRadius: 2,
                            backgroundColor: `${module.color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5
                          }}
                        >
                          {React.cloneElement(module.icon, {
                            sx: { fontSize: { xs: 32, sm: 40 }, color: module.color }
                          })}
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{
                            color: module.color,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            lineHeight: 1.3,
                            minHeight: { xs: '2.6em', sm: '2.6em' },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%'
                          }}
                        >
                          {module.name}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Detailed Statistics */}
            <Grid container spacing={{ xs: 2, sm: 2, md: 3 }} sx={{ mb: { xs: 4, sm: 5, md: 6 }, position: 'relative', zIndex: 1 }}>
              {/* Institution Breakdown */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    Institution Overview
                  </Typography>
                  <Divider sx={{ mb: { xs: 2, sm: 3 } }} />

                  <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Schools
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {dashboardData.institutions.typeBreakdown.schools}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.institutions.total > 0 ? (dashboardData.institutions.typeBreakdown.schools / dashboardData.institutions.total) * 100 : 0}
                      sx={{ height: { xs: 6, sm: 8 }, borderRadius: 4, bgcolor: '#667eea20', '& .MuiLinearProgress-bar': { bgcolor: '#667eea' } }}
                    />
                  </Box>

                  <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Colleges
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {dashboardData.institutions.typeBreakdown.colleges}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.institutions.total > 0 ? (dashboardData.institutions.typeBreakdown.colleges / dashboardData.institutions.total) * 100 : 0}
                      sx={{ height: { xs: 6, sm: 8 }, borderRadius: 4, bgcolor: '#f093fb20', '& .MuiLinearProgress-bar': { bgcolor: '#f093fb' } }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: { xs: 2, sm: 3 }, mb: 0 }}>
                    <Box sx={{ flex: 1, p: { xs: 1.5, sm: 2 }, bgcolor: '#43e97b10', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircle sx={{ fontSize: { xs: 18, sm: 20 }, color: '#43e97b', mr: 1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Active</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight="bold" color="#43e97b" sx={{ fontSize: { xs: '1.5rem', sm: '1.5rem' } }}>
                        {dashboardData.institutions.statusBreakdown.active}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, p: { xs: 1.5, sm: 2 }, bgcolor: '#ff616120', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Cancel sx={{ fontSize: { xs: 18, sm: 20 }, color: '#ff6161', mr: 1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Inactive</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight="bold" color="#ff6161" sx={{ fontSize: { xs: '1.5rem', sm: '1.5rem' } }}>
                        {dashboardData.institutions.statusBreakdown.inactive}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* User Breakdown */}
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    User Distribution
                  </Typography>
                  <Divider sx={{ mb: { xs: 2, sm: 3 } }} />

                  <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Students
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {dashboardData.users.roleBreakdown.students}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.users.total > 0 ? (dashboardData.users.roleBreakdown.students / dashboardData.users.total) * 100 : 0}
                      sx={{ height: { xs: 6, sm: 8 }, borderRadius: 4, bgcolor: '#4facfe20', '& .MuiLinearProgress-bar': { bgcolor: '#4facfe' } }}
                    />
                  </Box>

                  <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Teachers
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {dashboardData.users.roleBreakdown.teachers}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.users.total > 0 ? (dashboardData.users.roleBreakdown.teachers / dashboardData.users.total) * 100 : 0}
                      sx={{ height: { xs: 6, sm: 8 }, borderRadius: 4, bgcolor: '#f093fb20', '& .MuiLinearProgress-bar': { bgcolor: '#f093fb' } }}
                    />
                  </Box>

                  <Box sx={{ mb: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Admins
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {dashboardData.users.roleBreakdown.admins}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.users.total > 0 ? (dashboardData.users.roleBreakdown.admins / dashboardData.users.total) * 100 : 0}
                      sx={{ height: { xs: 6, sm: 8 }, borderRadius: 4, bgcolor: '#667eea20', '& .MuiLinearProgress-bar': { bgcolor: '#667eea' } }}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Recent Institutions & Quick Actions */}
            <Grid container spacing={{ xs: 2, sm: 2, md: 3 }} sx={{ mt: 0, position: 'relative', zIndex: 0 }}>
              {/* Recent Institutions */}
              <Grid item xs={12} lg={8}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    Recently Added Institutions
                  </Typography>
                  <Divider sx={{ mb: { xs: 2, sm: 2 } }} />

                  {dashboardData.recentInstitutions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      No institutions added yet.
                    </Typography>
                  ) : (
                    <Box>
                      {dashboardData.recentInstitutions.map((institution, index) => (
                        <Box
                          key={institution._id}
                          sx={{
                            p: { xs: 1.5, sm: 2 },
                            mb: index < dashboardData.recentInstitutions.length - 1 ? { xs: 1.5, sm: 2 } : 0,
                            bgcolor: '#f8f9fa',
                            borderRadius: 2,
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between',
                            gap: { xs: 1.5, sm: 2 }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, width: { xs: '100%', sm: 'auto' } }}>
                            <Box sx={{
                              p: { xs: 1, sm: 1.5 },
                              bgcolor: institution.type === 'school' ? '#667eea20' : '#f093fb20',
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {institution.type === 'school' ? (
                                <School sx={{ color: '#667eea', fontSize: { xs: 20, sm: 24 } }} />
                              ) : (
                                <Business sx={{ color: '#f093fb', fontSize: { xs: 20, sm: 24 } }} />
                              )}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body1" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, wordBreak: 'break-word' }}>
                                {institution.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, display: 'block' }}>
                                Code: {institution.code} • Added {new Date(institution.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={institution.type}
                              size="small"
                              sx={{
                                textTransform: 'capitalize',
                                bgcolor: institution.type === 'school' ? '#667eea20' : '#f093fb20',
                                color: institution.type === 'school' ? '#667eea' : '#f093fb',
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                height: { xs: 24, sm: 28 }
                              }}
                            />
                            <Chip
                              label={institution.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              color={institution.isActive ? 'success' : 'default'}
                              sx={{
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                height: { xs: 24, sm: 28 }
                              }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Quick Actions */}
              <Grid item xs={12} lg={4}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                    Quick Actions
                  </Typography>
                  <Divider sx={{ mb: { xs: 2, sm: 2 } }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => navigate('/institutions')}
                      startIcon={<Domain sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        py: { xs: 1.2, sm: 1.5 },
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                        }
                      }}
                    >
                      Manage Institutions
                    </Button>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => navigate('/departments')}
                      startIcon={<AccountBalance sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                      sx={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        py: { xs: 1.2, sm: 1.5 },
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        '&:hover': {
                          background: 'linear-gradient(135deg, #d97ee4 0%, #de4455 100%)',
                        }
                      }}
                    >
                      Manage Departments
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/profile')}
                      startIcon={<AccountCircle sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                      sx={{
                        py: { xs: 1.2, sm: 1.5 },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Profile Settings
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/messages')}
                      startIcon={<Message sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                      sx={{
                        py: { xs: 1.2, sm: 1.5 },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Messages
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate('/performance')}
                      startIcon={<Speed sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                      sx={{
                        py: { xs: 1.2, sm: 1.5 },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      Performance Monitor
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Activity Feed */}
            <Box sx={{ mt: { xs: 3, sm: 4 } }}>
              <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
                <Grid item xs={12}>
                  <ActivityFeed limit={15} />
                </Grid>
              </Grid>
            </Box>

            {/* Analytics Charts */}
            <Box sx={{ mt: { xs: 3, sm: 4 } }}>
              <AnalyticsCharts />
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Dashboard;