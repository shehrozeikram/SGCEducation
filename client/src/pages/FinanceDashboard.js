import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Divider,
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Payment,
  Business,
  Domain,
  People,
  ClearAll,
  MonetizationOn,
  TrendingDown,
  Assessment,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];

const StatCard = ({ title, value, icon, color, subtitle, compact = false }) => (
  <Card
    elevation={0}
    sx={{
      background: `linear-gradient(135deg, ${color}10 0%, #ffffff 100%)`,
      border: `1px solid ${color}20`,
      borderRadius: 4,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: `0 20px 40px ${color}15`,
        border: `1px solid ${color}40`,
      }
    }}
  >
    <CardContent sx={{ p: compact ? 2.5 : 3.5, '&:last-child': { pb: compact ? 2.5 : 3.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', opacity: 0.8 }}>
            {title}
          </Typography>
          <Typography variant={compact ? "h5" : "h4"} fontWeight="800" color={color} sx={{ lineHeight: 1.2, wordBreak: 'break-word' }}>
            {value}
          </Typography>
          {subtitle && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>{subtitle}</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ 
          p: compact ? 1.2 : 1.8, 
          borderRadius: 2.5, 
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          boxShadow: `0 8px 16px ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ml: 2.5
        }}>
          {React.cloneElement(icon, { sx: { fontSize: compact ? 24 : 32, color: '#fff' } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const FinanceDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters State
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [campusList, setCampusList] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedCampus, startDate, endDate]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedCampus && selectedCampus !== 'all') {
        params.append('institution', selectedCampus);
      }
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await axios.get(`${getApiUrl('dashboard/stats')}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data.data;
      setDashboardData(data);
      
      // Initialize campus list if not yet populated
      if (data?.campusBreakdown && campusList.length === 0) {
        setCampusList(data.campusBreakdown.map(c => ({ _id: c._id, name: c.name, code: c.code })));
      }
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedCampus('all');
    setStartDate('');
    setEndDate('');
  };

  // Process data for trends chart
  const formattedTrendData = (dashboardData?.trends?.feeCollectionTrend || []).map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }));

  // Process data for campus comparison chart
  const campusChartData = (dashboardData?.campusBreakdown || []).map(c => ({
    name: c.code || c.name,
    fullName: c.name,
    Receivable: c.feesGenerated,
    Collected: c.feesCollected,
    Outstanding: c.outstandingDues
  }));

  // Process student active distribution chart
  const studentDistributionData = (dashboardData?.campusBreakdown || []).map(c => ({
    name: c.code || c.name,
    value: c.activeStudents
  })).filter(c => c.value > 0);

  if (loading && !dashboardData) {
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

      {/* Header and Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ mb: 1 }}>
            Financial Insights & Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analyze fee-related metrics, student distributions, and campus-wise collections.
          </Typography>
        </Box>
        <Chip label="Finance Manager Dashboard" color="primary" icon={<Business />} sx={{ fontSize: '0.95rem', py: 2.5, px: 1.5, fontWeight: 'bold', borderRadius: 3 }} />
      </Box>

      {/* Filter Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 4, 
          border: '1px solid #edf2f7', 
          bgcolor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="campus-select-label">Campus</InputLabel>
              <Select
                labelId="campus-select-label"
                value={selectedCampus}
                label="Campus"
                onChange={(e) => setSelectedCampus(e.target.value)}
                sx={{ borderRadius: 2.5 }}
              >
                <MenuItem value="all">
                  <em>All Campuses</em>
                </MenuItem>
                {campusList.map((campus) => (
                  <MenuItem key={campus._id} value={campus._id}>
                    {campus.name} ({campus.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="To Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={handleClearFilters}
              startIcon={<ClearAll />}
              disabled={!startDate && !endDate && selectedCampus === 'all'}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, height: '40px' }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Box sx={{ width: '100%', mb: 3 }}>
          <CircularProgress size={30} sx={{ display: 'block', mx: 'auto' }} />
        </Box>
      )}

      {dashboardData && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { 
                title: 'Total Receivable', 
                value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalReceivable || 0).toLocaleString()}`, 
                icon: <MonetizationOn />, 
                color: '#6366f1', 
                subtitle: 'Total billed volume (generated vouchers)' 
              },
              { 
                title: 'Total Received', 
                value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalReceived || 0).toLocaleString()}`, 
                icon: <Payment />, 
                color: '#10b981', 
                subtitle: 'Payments cleared and received' 
              },
              { 
                title: 'Total Remaining', 
                value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.totalRemaining || 0).toLocaleString()}`, 
                icon: <AccountBalance />, 
                color: '#f59e0b', 
                subtitle: 'Unpaid remaining balance' 
              },
              { 
                title: 'Previous Receivable', 
                value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.previousReceivable || 0).toLocaleString()}`, 
                icon: <TrendingDown />, 
                color: '#f43f5e', 
                subtitle: 'Outstanding arrears carried forward' 
              },
              { 
                title: 'Recovery', 
                value: `${dashboardData?.finance?.currency || 'PKR'} ${(dashboardData?.finance?.recovery || 0).toLocaleString()}`, 
                icon: <TrendingUp />, 
                color: '#06b6d4', 
                subtitle: 'Carried-forward arrears paid' 
              },
              { 
                title: 'Total Students', 
                value: (dashboardData?.overview?.totalStudents || 0).toLocaleString(), 
                icon: <People />, 
                color: '#8b5cf6', 
                subtitle: 'All application statuses combined' 
              },
              { 
                title: 'Active Students', 
                value: (dashboardData?.overview?.activeStudents || 0).toLocaleString(), 
                icon: <People />, 
                color: '#0ea5e9', 
                subtitle: 'Students with enrolled status' 
              },
              { 
                title: 'New Admissions', 
                value: (dashboardData?.overview?.newAdmissions || 0).toLocaleString(), 
                icon: <TrendingUp />, 
                color: '#ec4899', 
                subtitle: 'Newly enrolled in period' 
              }
            ].map((stat, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <StatCard compact {...stat} />
              </Grid>
            ))}
          </Grid>


          {/* Charts Section */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Area Chart: Fee Collection Trend */}
            <Grid item xs={12} lg={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="800">
                    Fee Collection Trend
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cleared collections trend over the selected period
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ flex: 1, minHeight: 300 }}>
                  {formattedTrendData.length === 0 ? (
                    <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No transactions recorded for the selected period.
                      </Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formattedTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="feeCollectionGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="formattedDate" 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Collections']}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#feeCollectionGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Pie Chart: Student Distribution by Campus */}
            <Grid item xs={12} lg={4}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="800">
                    Student Distribution
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active student distribution across campuses
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ flex: 1, minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {studentDistributionData.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No active student data.
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ height: 230 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={studentDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {studentDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                              formatter={(value) => [`${value} Active Students`]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 2 }}>
                        {studentDistributionData.map((entry, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: CHART_COLORS[index % CHART_COLORS.length] }} />
                            <Typography variant="caption" fontWeight="600" color="text.secondary">
                              {entry.name} ({entry.value})
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Bar Chart: Campus Comparison */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', minHeight: 450, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="800">
                    Campus-wise Financial Comparison
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Comparing fees generated, collected, and outstanding dues side-by-side
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Box sx={{ flex: 1, minHeight: 300 }}>
                  {campusChartData.length === 0 ? (
                    <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No financial comparison data available.
                      </Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={campusChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '11px', fontWeight: 600, fill: '#64748b' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          formatter={(value) => [`PKR ${value.toLocaleString()}`]}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                        <Bar dataKey="Receivable" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Campus Breakdown (Campus-wise reports) */}
          {dashboardData?.campusBreakdown && dashboardData.campusBreakdown.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2 }}>
                  <Typography variant="h6" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ width: 6, height: 20, bgcolor: '#6366f1', borderRadius: 1 }} />
                    Campus-wise Financial & Student Report
                  </Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #edf2f7' }}>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Campus Code</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Campus Name</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Students</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Active Students</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>New Admissions</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Receivable</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Received</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Remaining</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Prev. Receivable</th>
                          <th style={{ padding: '16px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Recovery</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.campusBreakdown.map((campus, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s ease' }}>
                            <td style={{ padding: '16px' }}>
                              <Chip label={campus.code} size="small" color="primary" variant="outlined" sx={{ fontWeight: 'bold' }} />
                            </td>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#334155' }}>
                              {campus.name}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 600, color: '#475569' }}>
                              {campus.totalStudents.toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 600, color: '#0ea5e9' }}>
                              {campus.activeStudents.toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 600, color: '#8b5cf6' }}>
                              <Chip label={`+${campus.newAdmissions}`} size="small" sx={{ bgcolor: '#8b5cf615', color: '#8b5cf6', fontWeight: 700, border: '1px solid #8b5cf630' }} />
                            </td>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#6366f1' }}>
                              {dashboardData?.finance?.currency || 'PKR'} {campus.feesGenerated.toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#10b981' }}>
                              {dashboardData?.finance?.currency || 'PKR'} {campus.feesCollected.toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#f59e0b' }}>
                              {dashboardData?.finance?.currency || 'PKR'} {campus.outstandingDues.toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#f43f5e' }}>
                              {dashboardData?.finance?.currency || 'PKR'} {(campus.previousReceivable || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#06b6d4' }}>
                              {dashboardData?.finance?.currency || 'PKR'} {(campus.recovery || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default FinanceDashboard;
