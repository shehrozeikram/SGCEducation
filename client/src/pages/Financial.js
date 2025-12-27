import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  AccountCircle,
  School,
  ExitToApp,
  Settings,
  AttachMoney,
  TrendingUp,
  Receipt,
  Payment,
  Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#ffa726'];

const Financial = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const isSuperAdmin = user.role === 'super_admin';
      
      // Get institution ID
      let institutionId = null;
      
      // First, try to get from selectedInstitution in localStorage
      const institutionData = localStorage.getItem('selectedInstitution');
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          institutionId = institution._id || institution;
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      }
      
      // If not found and user is admin, extract from user object
      if (!institutionId && !isSuperAdmin && user.institution) {
        institutionId = typeof user.institution === 'object' ? user.institution._id : user.institution;
      }
      
      // Build URL with institution parameter if available
      let institutionParam = '';
      if (institutionId) {
        institutionParam = `?institution=${institutionId}`;
      }

      const [overviewRes, paymentsRes, subscriptionsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/v1/financial/overview${institutionParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/api/v1/financial/payments${institutionParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/api/v1/financial/subscriptions${institutionParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setOverview(overviewRes.data.data);
      setPayments(paymentsRes.data.payments);
      setSubscriptions(subscriptionsRes.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch financial data');
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatMonthlyRevenue = (data) => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      month: item._id,
      revenue: item.revenue,
      count: item.count
    }));
  };

  const formatSubscriptionStats = (data) => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count,
      revenue: item.revenue
    }));
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Toolbar>
            <School sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              SGC Education - Financial Overview
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Top Navigation Bar */}
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <School sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SGC Education - Financial Overview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">{user.name}</Typography>
            <IconButton size="large" onClick={handleMenu} color="inherit">
              <AccountCircle />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={() => navigate('/dashboard')}>Dashboard</MenuItem>
              <MenuItem onClick={() => navigate('/profile')}>
                <Settings sx={{ mr: 1 }} fontSize="small" />
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} fontSize="small" />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">Financial Overview</Typography>
          <IconButton onClick={fetchFinancialData}>
            <Refresh />
          </IconButton>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {overview && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: '#43e97b20', borderRadius: 2 }}>
                        <AttachMoney sx={{ color: '#43e97b', fontSize: 32 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
                        <Typography variant="h5" fontWeight="bold">{formatCurrency(overview.totalRevenue)}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: '#4facfe20', borderRadius: 2 }}>
                        <Receipt sx={{ color: '#4facfe', fontSize: 32 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Total Payments</Typography>
                        <Typography variant="h5" fontWeight="bold">{payments.length}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: '#f093fb20', borderRadius: 2 }}>
                        <Payment sx={{ color: '#f093fb', fontSize: 32 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Subscriptions</Typography>
                        <Typography variant="h5" fontWeight="bold">{subscriptions.length}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: '#667eea20', borderRadius: 2 }}>
                        <TrendingUp sx={{ color: '#667eea', fontSize: 32 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Avg Monthly</Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {formatCurrency(overview.monthlyRevenue.reduce((sum, item) => sum + item.revenue, 0) / Math.max(overview.monthlyRevenue.length, 1))}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Monthly Revenue Trend */}
              <Grid item xs={12} lg={8}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Monthly Revenue Trend</Typography>
                  <Divider sx={{ mb: 2 }} />
                  {overview.monthlyRevenue.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      No revenue data available
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={formatMonthlyRevenue(overview.monthlyRevenue)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#43e97b" strokeWidth={2} name="Revenue" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Paper>
              </Grid>

              {/* Subscription Distribution */}
              <Grid item xs={12} lg={4}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Plans Distribution</Typography>
                  <Divider sx={{ mb: 2 }} />
                  {overview.subscriptionStats.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      No subscription data
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={formatSubscriptionStats(overview.subscriptionStats)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {formatSubscriptionStats(overview.subscriptionStats).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Tabs for Payments and Subscriptions */}
            <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
                <Tab label="Recent Payments" />
                <Tab label="Subscriptions" />
              </Tabs>

              {currentTab === 0 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell>Institution</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overview.recentPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">No payments yet</TableCell>
                        </TableRow>
                      ) : (
                        overview.recentPayments.map((payment) => (
                          <TableRow key={payment._id} hover>
                            <TableCell>{payment.institution?.name || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <Chip
                                label={payment.status}
                                size="small"
                                color={payment.status === 'completed' ? 'success' : payment.status === 'failed' ? 'error' : 'default'}
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell sx={{ textTransform: 'capitalize' }}>
                              {payment.paymentMethod?.replace('_', ' ')}
                            </TableCell>
                            <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {currentTab === 1 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell>Institution</TableCell>
                        <TableCell>Plan</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Next Billing</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subscriptions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">No subscriptions yet</TableCell>
                        </TableRow>
                      ) : (
                        subscriptions.map((subscription) => (
                          <TableRow key={subscription._id} hover>
                            <TableCell>{subscription.institution?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip
                                label={subscription.plan}
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell>{formatCurrency(subscription.pricing?.amount)}</TableCell>
                            <TableCell>
                              <Chip
                                label={subscription.status}
                                size="small"
                                color={subscription.status === 'active' ? 'success' : 'default'}
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell>
                              {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Financial;
