import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  LinearProgress,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { getAllModules } from '../config/modules';
import {
  AccountBalance,
  TrendingUp,
  People,
  Domain,
  Assessment,
  Business,
  Description,
  Event,
  Message,
  Speed,
  PersonAdd,
  EventAvailable,
  Payment,
  Notifications,
  Report,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';
import DashboardCharts from '../components/dashboard/DashboardCharts';

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState(0);
  const [showLogo, setShowLogo] = useState(true); // For logo fallback
  
  // Generate cache-busting parameter once on mount to ensure fresh logo
  const [logoCacheBuster] = useState(() => `?t=${Date.now()}`);

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
      let url = getApiUrl('dashboard/stats');
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

  // Get modules from shared configuration and convert icon components to elements
  const modules = getAllModules().map(module => ({
    ...module,
    icon: <module.icon />
  }));

  const handleModuleClick = (module) => {
    if (module.route) {
      navigate(module.route);
    } else {
      alert(`${module.name} module is coming soon!`);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle, trend, compact = false }) => (
    <Card
      elevation={0}
      sx={{
        background: `linear-gradient(135deg, ${color}10 0%, #ffffff 100%)`,
        border: `1px solid ${color}20`,
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: `0 20px 40px ${color}15`,
          border: `1px solid ${color}40`,
        }
      }}
    >
      <CardContent sx={{ p: compact ? 3 : 4, '&:last-child': { pb: compact ? 3 : 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', opacity: 0.8 }}>
              {title}
            </Typography>
            <Typography variant={compact ? "h5" : "h4"} fontWeight="800" color={color} sx={{ lineHeight: 1.2, wordBreak: 'break-word' }}>
              {value}
            </Typography>
            {(subtitle || trend) && (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                {subtitle && <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>{subtitle}</Typography>}
                {trend && (
                  <Chip 
                    label={`+${trend}`}
                    size="small"
                    icon={<TrendingUp sx={{ fontSize: '12px !important', color: 'inherit !important' }} />}
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem', 
                      fontWeight: 700,
                      bgcolor: 'success.main', 
                      color: 'white',
                      '& .MuiChip-icon': { ml: 0.5 }
                    }}
                  />
                )}
              </Box>
            )}
          </Box>
          <Box sx={{ 
            p: compact ? 1.5 : 2, 
            borderRadius: 2.5, 
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
            boxShadow: `0 8px 16px ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ml: 2.5
          }}>
            {React.cloneElement(icon, { sx: { fontSize: compact ? 28 : 36, color: '#fff' } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const MetricGroup = ({ title, metrics, color }) => (
    <Paper elevation={0} sx={{ 
      p: 2, 
      borderRadius: 4, 
      border: '1px solid #edf2f7', 
      pb: 1.5,
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      transition: 'all 0.3s ease',
      '&:hover': { 
        boxShadow: '0 12px 30px rgba(0,0,0,0.05)',
      }
    }}>
      <Typography variant="subtitle1" fontWeight="800" gutterBottom sx={{ color: 'text.primary', display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ width: 6, height: 24, bgcolor: color, borderRadius: 1 }} />
        {title}
      </Typography>
      <Grid container spacing={2}>
        {metrics.map((m, i) => (
          <Grid item xs={4} key={i}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500, fontSize: '0.75rem' }}>{m.label}</Typography>
              <Typography variant="h6" fontWeight="800" color={color}>{m.value}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  const AlertItem = ({ title, count, icon, color, onClick }) => (
    <Box 
      onClick={onClick}
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        p: 2, 
        borderRadius: 2, 
        cursor: 'pointer',
        bgcolor: `${color}08`, 
        border: `1px solid ${color}15`,
        transition: 'all 0.2s ease',
        '&:hover': { bgcolor: `${color}15`, transform: 'translateX(4px)' }
      }}
    >
      <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'white', display: 'flex', color: color, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
        {React.cloneElement(icon, { sx: { fontSize: 20 } })}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight="700" color="text.primary">{title}</Typography>
        <Typography variant="caption" color="text.secondary">{count} pending items</Typography>
      </Box>
      <Typography variant="h6" fontWeight="800" color={color}>{count}</Typography>
    </Box>
  );

  const EventItem = ({ event }) => (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      p: 2, 
      borderRadius: 2, 
      bgcolor: '#f8fafc',
      borderLeft: `4px solid ${event.color || '#667eea'}`,
      '&:hover': { bgcolor: '#f1f5f9' },
      transition: 'background 0.2s ease'
    }}>
      <Box sx={{ textAlign: 'center', minWidth: 50 }}>
        <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
          {new Date(event.startDate).toLocaleString('default', { month: 'short' })}
        </Typography>
        <Typography variant="h6" fontWeight="800" color="text.primary" sx={{ lineHeight: 1 }}>
          {new Date(event.startDate).getDate()}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight="700" color="text.primary">
          {event.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Event sx={{ fontSize: 14 }} /> {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {event.location && ` • ${event.location}`}
        </Typography>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

          {dashboardData && (
            <>
              {/* Row 1: Key Performance Indicators (Compact) */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                  { 
                    title: 'Total Institutions', 
                    value: dashboardData?.overview?.totalInstitutions || 0, 
                    icon: <Domain />, 
                    color: '#667eea', 
                    subtitle: `${dashboardData?.overview?.activeInstitutions || 0} active`, 
                    trend: dashboardData?.growth?.institutionsLast30Days 
                  },
                  { 
                    title: 'Total Users', 
                    value: dashboardData?.overview?.totalUsers || 0, 
                    icon: <People />, 
                    color: '#4facfe', 
                    subtitle: `${dashboardData?.users?.roleBreakdown?.students || 0} students`, 
                    trend: dashboardData?.growth?.usersLast30Days 
                  },
                  { 
                    title: 'System Health', 
                    value: '100%', 
                    icon: <Assessment />, 
                    color: '#43e97b', 
                    subtitle: 'All systems operational' 
                  },
                  { 
                    title: "Today's Activity", 
                    value: '0', 
                    icon: <Notifications />, 
                    color: '#fa709a', 
                    subtitle: 'No alerts today' 
                  }
                ].map((stat, i) => (
                  <Grid item xs={12} sm={6} lg={3} key={i}>
                    <StatCard compact {...stat} />
                  </Grid>
                ))}
              </Grid>

              {/* Row 2: Financial Metrics */}
              {dashboardData?.finance && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    { 
                      title: 'Received Fees', 
                      value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalReceived || 0).toLocaleString()}`, 
                      icon: <Payment />, 
                      color: '#10b981', 
                      subtitle: 'Total collections' 
                    },
                    { 
                      title: 'Receivable Fees', 
                      value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalReceivable || 0).toLocaleString()}`, 
                      icon: <AccountBalance />, 
                      color: '#f59e0b', 
                      subtitle: 'Outstanding balance' 
                    },
                    { 
                      title: "Last Month's Fees", 
                      value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.lastMonthReceived || 0).toLocaleString()}`, 
                      icon: <EventAvailable />, 
                      color: '#6366f1', 
                      subtitle: 'Previous month' 
                    }
                  ].map((fin, i) => (
                    <Grid item xs={12} sm={6} lg={4} key={i}>
                      <StatCard compact {...fin} />
                    </Grid>
                  ))}
                </Grid>
              )}

              {/* Row 3: Admin Alerts & Quick Actions (Horizontal) */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Admin Alerts */}
                <Grid item xs={12} lg={6}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Box sx={{ width: 6, height: 20, bgcolor: '#ff6b6b', borderRadius: 1 }} />
                      Admin Alerts
                    </Typography>
                    <Stack spacing={2}>
                      <AlertItem 
                        title="Pending Admissions" 
                        count={dashboardData?.administrative?.pendingAdmissions || 0} 
                        icon={<PersonAdd />} 
                        color="#ff6b6b"
                        onClick={() => navigate('/admissions')}
                      />
                      <AlertItem 
                        title="Overdue Fee Vouchers" 
                        count={dashboardData?.administrative?.overdueFees || 0} 
                        icon={<Report />} 
                        color="#f59e0b"
                        onClick={() => navigate('/fee-management?tab=fee-deposit')}
                      />
                    </Stack>
                  </Paper>
                </Grid>

                {/* Quick Actions */}
                <Grid item xs={12} lg={6}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="800" sx={{ mb: 3 }}>Quick Actions</Typography>
                    <Grid container spacing={2}>
                      {[
                        { label: 'Register Student', icon: <PersonAdd />, color: '#667eea', path: '/admissions/new' },
                        { label: 'Collect Fee', icon: <Payment />, color: '#10b981', path: '/fee-management?tab=fee-deposit' },
                        { label: 'Add Event', icon: <Event />, color: '#f093fb', path: '/calendar' },
                        { label: 'Reports', icon: <Assessment />, color: '#4facfe', path: '/reports' }
                      ].map((action, i) => (
                        <Grid item xs={6} key={i}>
                          <Button
                            fullWidth
                            onClick={() => navigate(action.path)}
                            variant="outlined"
                            sx={{
                              flexDirection: 'column',
                              py: 3,
                              borderRadius: 4,
                              borderColor: '#edf2f7',
                              color: 'text.primary',
                              gap: 1.5,
                              '&:hover': { bgcolor: `${action.color}08`, borderColor: action.color }
                            }}
                          >
                            {React.cloneElement(action.icon, { sx: { color: action.color, fontSize: 24 } })}
                            <Typography variant="caption" fontWeight="700">{action.label}</Typography>
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              {/* Row 4: Distribution & Events */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} lg={4}>
                  <MetricGroup 
                    title="Institution Distribution"
                    color="#f093fb"
                    metrics={[
                      { label: 'Schools', value: dashboardData?.institutions?.typeBreakdown?.schools || 0 },
                      { label: 'Colleges', value: dashboardData?.institutions?.typeBreakdown?.colleges || 0 },
                      { label: 'Active', value: dashboardData?.institutions?.statusBreakdown?.active || 0 },
                    ]}
                  />
                </Grid>
                <Grid item xs={12} lg={4}>
                  <MetricGroup 
                    title="User Distribution"
                    color="#4facfe"
                    metrics={[
                      { label: 'Students', value: dashboardData?.users?.roleBreakdown?.students || 0 },
                      { label: 'Staff', value: dashboardData?.users?.roleBreakdown?.teachers || 0 },
                      { label: 'Admins', value: dashboardData?.users?.roleBreakdown?.admins || 0 },
                    ]}
                  />
                </Grid>
                <Grid item xs={12} lg={4}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 6, height: 20, bgcolor: '#667eea', borderRadius: 1 }} />
                        Events
                      </Typography>
                      <Button size="small" onClick={() => navigate('/calendar')} sx={{ fontSize: '0.7rem', fontWeight: 700 }}>View All</Button>
                    </Box>
                    <Stack spacing={1}>
                      {dashboardData.upcomingEvents?.length > 0 ? (
                        dashboardData.upcomingEvents.map((event, i) => (
                          <EventItem key={i} event={event} />
                        ))
                      ) : (
                        <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #e2e8f0' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="600">No events</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              {/* Row 4: Operational Analysis & Activity Logs */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Analysis Tabs */}
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                      <Tabs 
                        value={breakdownTab} 
                        onChange={(e, v) => setBreakdownTab(v)} 
                        centered
                        sx={{
                          minHeight: 40,
                          bgcolor: '#f1f5f9',
                          borderRadius: 10,
                          p: 0.5,
                          '& .MuiTabs-indicator': { display: 'none' }
                        }}
                      >
                        {[
                          { label: 'Detailed Breakdown', icon: <Domain /> },
                          { label: 'Role Statics', icon: <People /> },
                          { label: 'Growth & Trends', icon: <Assessment /> }
                        ].map((tab, idx) => (
                          <Tab 
                            key={idx}
                            label={tab.label}
                            icon={React.cloneElement(tab.icon, { sx: { fontSize: 18 } })}
                            iconPosition="start"
                            sx={{ 
                              textTransform: 'none', fontWeight: 700, minHeight: 32, borderRadius: 10, px: 3, fontSize: '0.8rem', color: 'text.secondary',
                              '&.Mui-selected': { bgcolor: 'white', color: '#667eea', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
                              transition: 'all 0.2s ease'
                            }} 
                          />
                        ))}
                      </Tabs>
                    </Box>

                    <Box sx={{ py: 1 }}>
                      {breakdownTab === 0 && (
                        <Grid container spacing={6}>
                          <Grid item xs={12} md={7}>
                            <Box sx={{ mb: 3 }}>
                              <Box display="flex" justifyContent="space-between" mb={1.5}>
                                <Typography variant="body2" fontWeight="700">Schools</Typography>
                                <Typography variant="body2" fontWeight="700">{dashboardData?.institutions?.typeBreakdown?.schools || 0}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={((dashboardData?.institutions?.typeBreakdown?.schools || 0) / (dashboardData?.institutions?.total || 1)) * 100} 
                                sx={{ height: 12, borderRadius: 6, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { borderRadius: 6, background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' } }} 
                              />
                            </Box>
                            <Box>
                              <Box display="flex" justifyContent="space-between" mb={1.5}>
                                <Typography variant="body2" fontWeight="700">Colleges</Typography>
                                <Typography variant="body2" fontWeight="700">{dashboardData?.institutions?.typeBreakdown?.colleges || 0}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={((dashboardData?.institutions?.typeBreakdown?.colleges || 0) / (dashboardData?.institutions?.total || 1)) * 100} 
                                sx={{ height: 12, borderRadius: 6, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { borderRadius: 6, background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)' } }} 
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={5}>
                            <Box sx={{ display: 'flex', gap: 3, height: '100%', alignItems: 'center' }}>
                              <Box sx={{ flex: 1, p: 3, bgcolor: '#f0fdf4', borderRadius: 4, border: '1px solid #dcfce7', textAlign: 'center' }}>
                                <Typography variant="caption" display="block" color="success.main" fontWeight="700" mb={1}>Active</Typography>
                                <Typography variant="h4" fontWeight="800" color="success.darker">{dashboardData?.institutions?.statusBreakdown?.active || 0}</Typography>
                              </Box>
                              <Box sx={{ flex: 1, p: 3, bgcolor: '#fef2f2', borderRadius: 4, border: '1px solid #fee2e2', textAlign: 'center' }}>
                                <Typography variant="caption" display="block" color="error.main" fontWeight="700" mb={1}>Inactive</Typography>
                                <Typography variant="h4" fontWeight="800" color="error.darker">{dashboardData?.institutions?.statusBreakdown?.inactive || 0}</Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      )}

                      {breakdownTab === 1 && (
                        <Grid container spacing={4}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ mb: 2 }}>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="caption" fontWeight="700">Students</Typography>
                                <Typography variant="caption" fontWeight="700">{dashboardData?.users?.roleBreakdown?.students || 0}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={((dashboardData?.users?.roleBreakdown?.students || 0) / (dashboardData?.users?.total || 1)) * 100} 
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' } }} 
                              />
                            </Box>
                            <Box>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="caption" fontWeight="700">Staff/Teachers</Typography>
                                <Typography variant="caption" fontWeight="700">{dashboardData?.users?.roleBreakdown?.teachers || 0}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={((dashboardData?.users?.roleBreakdown?.teachers || 0) / (dashboardData?.users?.total || 1)) * 100} 
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' } }} 
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ mb: 2 }}>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="caption" fontWeight="700">Admins</Typography>
                                <Typography variant="caption" fontWeight="700">{dashboardData?.users?.roleBreakdown?.admins || 0}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={((dashboardData?.users?.roleBreakdown?.admins || 0) / (dashboardData?.users?.total || 1)) * 100} 
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' } }} 
                              />
                            </Box>
                            <Box>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="caption" fontWeight="700">Super Admin</Typography>
                                <Typography variant="caption" fontWeight="700">{dashboardData?.users?.roleBreakdown?.superAdmin || 0}</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={((dashboardData?.users?.roleBreakdown?.superAdmin || 0) / (dashboardData?.users?.total || 1)) * 100} 
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 5, background: 'linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%)' } }} 
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      )}

                      {breakdownTab === 2 && (
                        <Box sx={{ mt: 1 }}>
                          <AnalyticsCharts hideHeader />
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Row 6: Comprehensive Analytics Charts */}
              <Grid container spacing={3} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <DashboardCharts />
                </Grid>
              </Grid>
            </>
          )}
        </Box>
  );
};

export default Dashboard;