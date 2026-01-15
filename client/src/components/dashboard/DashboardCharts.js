import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { 
  TrendingUp, 
  Payment, 
  People, 
  AccountBalance,
  School,
  Assessment
} from '@mui/icons-material';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6'];

const DashboardCharts = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const institutionData = localStorage.getItem('selectedInstitution');

      // Build URLs with institution parameter
      const baseUrl = 'http://localhost:5000/api/v1';
      let institutionId = null;
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          institutionId = institution._id;
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      }

      // Build query parameters
      const analyticsParams = new URLSearchParams({ days: period.toString() });
      if (institutionId) analyticsParams.append('institution', institutionId);
      
      const statsParams = institutionId ? new URLSearchParams({ institution: institutionId }) : new URLSearchParams();
      
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      const paymentsParams = new URLSearchParams({ 
        startDate, 
        endDate 
      });
      if (institutionId) paymentsParams.append('institution', institutionId);
      
      const studentFeesParams = institutionId ? new URLSearchParams({ institution: institutionId }) : new URLSearchParams();

      // Fetch multiple data sources in parallel
      const [analyticsRes, statsRes, paymentsRes, studentFeesRes] = await Promise.all([
        axios.get(`${baseUrl}/dashboard/analytics?${analyticsParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { data: null } })),
        axios.get(`${baseUrl}/dashboard/stats?${statsParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { data: null } })),
        axios.get(`${baseUrl}/fees/payments?${paymentsParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/fees/student-fees?${studentFeesParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { data: [] } }))
      ]);

      const analytics = analyticsRes.data?.data || {};
      const stats = statsRes.data?.data || {};
      const payments = paymentsRes.data?.data || [];
      const studentFees = studentFeesRes.data?.data || [];

      // Process all chart data
      const processedData = processChartData(analytics, stats, payments, studentFees);
      setChartData(processedData);
      setError(null);
    } catch (err) {
      console.error('Dashboard charts error:', err);
      setError(err.response?.data?.message || 'Failed to fetch chart data');
      setChartData(getEmptyData());
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (analytics, stats, payments, studentFees) => {
    // 1. User Growth Trend (from analytics)
    const userTrends = analytics.userTrends || [];
    const userGrowthData = userTrends.map(trend => ({
      date: new Date(trend._id.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      students: trend._id.role === 'student' ? trend.count : 0,
      teachers: trend._id.role === 'teacher' ? trend.count : 0,
      admins: trend._id.role === 'admin' ? trend.count : 0
    }));

    // Group by date
    const userGrowthGrouped = {};
    userGrowthData.forEach(item => {
      if (!userGrowthGrouped[item.date]) {
        userGrowthGrouped[item.date] = { date: item.date, students: 0, teachers: 0, admins: 0 };
      }
      userGrowthGrouped[item.date].students += item.students;
      userGrowthGrouped[item.date].teachers += item.teachers;
      userGrowthGrouped[item.date].admins += item.admins;
    });

    // 2. Monthly Fee Collection
    const monthlyCollection = {};
    payments.forEach(payment => {
      if (payment.paymentDate) {
        const date = new Date(payment.paymentDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyCollection[monthKey]) {
          monthlyCollection[monthKey] = 0;
        }
        monthlyCollection[monthKey] += Number(payment.amount || 0);
      }
    });

    const monthlyCollectionData = Object.keys(monthlyCollection)
      .sort()
      .slice(-6) // Last 6 months
      .map(key => ({
        month: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short' }),
        amount: Math.round(monthlyCollection[key])
      }));

    // 3. Payment Status Distribution
    const statusCounts = {
      paid: 0,
      partial: 0,
      unpaid: 0,
      overdue: 0
    };

    studentFees.forEach(fee => {
      const remaining = Number(fee.remainingAmount || 0);
      const total = Number(fee.totalAmount || fee.billedAmount || 0);
      if (remaining === 0 && total > 0) {
        statusCounts.paid++;
      } else if (remaining > 0 && remaining < total) {
        statusCounts.partial++;
      } else if (remaining === total) {
        statusCounts.unpaid++;
      }
    });

    const paymentStatusData = Object.keys(statusCounts)
      .filter(key => statusCounts[key] > 0)
      .map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: statusCounts[key]
      }));

    // 4. Institution Type Distribution
    const institutionTypes = stats.institutions?.typeBreakdown || {};
    const institutionTypeData = Object.keys(institutionTypes)
      .map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: institutionTypes[key]
      }))
      .filter(item => item.value > 0);

    // 5. Revenue vs Outstanding
    const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalOutstanding = studentFees.reduce((sum, f) => {
      const remaining = Number(f.remainingAmount || 0);
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);

    const revenueData = [
      { name: 'Received', amount: Math.round(totalReceived), color: '#10b981' },
      { name: 'Outstanding', amount: Math.round(totalOutstanding), color: '#f59e0b' }
    ];

    // 6. Student Distribution by Class
    const classDistribution = {};
    studentFees.forEach(fee => {
      const className = fee.class?.name || fee.admission?.class?.name || 'Unknown';
      if (!classDistribution[className]) {
        classDistribution[className] = 0;
      }
      classDistribution[className]++;
    });

    const classDistributionData = Object.keys(classDistribution)
      .map(key => ({
        name: key.length > 12 ? key.substring(0, 12) + '...' : key,
        students: classDistribution[key]
      }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 6); // Top 6 classes

    return {
      userGrowth: Object.values(userGrowthGrouped),
      monthlyCollection: monthlyCollectionData,
      paymentStatus: paymentStatusData,
      institutionTypes: institutionTypeData,
      revenue: revenueData,
      classDistribution: classDistributionData,
      totalReceived,
      totalOutstanding
    };
  };

  const getEmptyData = () => ({
    userGrowth: [],
    monthlyCollection: [],
    paymentStatus: [],
    institutionTypes: [],
    revenue: [],
    classDistribution: [],
    totalReceived: 0,
    totalOutstanding: 0
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !chartData) {
    return <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Analytics & Insights
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
            <MenuItem value={180}>Last 6 months</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* User Growth Trend */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2, minHeight: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#6366f115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <People sx={{ color: '#6366f1', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="800">User Growth Trend</Typography>
                <Typography variant="caption" color="text.secondary">New registrations by role</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {chartData?.userGrowth?.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary">No growth data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData?.userGrowth || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    dataKey="students"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Students"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="teachers"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    name="Teachers"
                    dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="admins"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    name="Admins"
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Payment Status Distribution */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2, minHeight: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#ec489915', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Payment sx={{ color: '#ec4899', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="800">Payment Status</Typography>
                <Typography variant="caption" color="text.secondary">Fee payment breakdown</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {chartData?.paymentStatus?.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary">No payment data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData?.paymentStatus || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(chartData?.paymentStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Monthly Fee Collection */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2, minHeight: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#10b98115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp sx={{ color: '#10b981', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="800">Monthly Fee Collection</Typography>
                <Typography variant="caption" color="text.secondary">Last 6 months trend</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {chartData?.monthlyCollection?.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary">No collection data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData?.monthlyCollection || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
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
                    formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Collection']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCollection)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Revenue vs Outstanding */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2, minHeight: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AccountBalance sx={{ color: '#f59e0b', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="800">Financial Overview</Typography>
                <Typography variant="caption" color="text.secondary">Received vs Outstanding</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" fontWeight="700" color="text.secondary">Total Received</Typography>
                <Typography variant="h6" fontWeight="800" color="#10b981">
                  PKR {chartData?.totalReceived?.toLocaleString() || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" fontWeight="700" color="text.secondary">Total Outstanding</Typography>
                <Typography variant="h6" fontWeight="800" color="#f59e0b">
                  PKR {chartData?.totalOutstanding?.toLocaleString() || 0}
                </Typography>
              </Box>
            </Box>
            {chartData?.revenue?.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">No financial data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={chartData?.revenue || []} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
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
                    formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Amount']}
                  />
                  <Bar 
                    dataKey="amount" 
                    radius={[4, 4, 0, 0]}
                  >
                    {(chartData?.revenue || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Institution Type Distribution */}
        {chartData?.institutionTypes?.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2, minHeight: 450 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#667eea15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <School sx={{ color: '#667eea', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="800">Institution Types</Typography>
                  <Typography variant="caption" color="text.secondary">Distribution by type</Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={chartData?.institutionTypes || []} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#667eea" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Student Distribution by Class */}
        <Grid item xs={12} lg={chartData?.institutionTypes?.length > 0 ? 6 : 12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #edf2f7', pb: 2, minHeight: 450 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#4facfe15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Assessment sx={{ color: '#4facfe', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="800">Student Distribution</Typography>
                <Typography variant="caption" color="text.secondary">Top classes by enrollment</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {chartData?.classDistribution?.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary">No class data available</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={chartData?.classDistribution || []} 
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    style={{ fontSize: '11px', fontWeight: 500, fill: '#64748b' }}
                    width={50}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${value} students`, 'Enrollment']}
                  />
                  <Bar 
                    dataKey="students" 
                    fill="#4facfe" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardCharts;
