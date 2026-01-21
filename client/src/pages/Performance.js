import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  People as PeopleIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { getApiBaseUrl } from '../config/api';

const API_URL = getApiBaseUrl();

const Performance = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [databaseStats, setDatabaseStats] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [errorRates, setErrorRates] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAllData();
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [healthRes, dbRes, sessionsRes, errorsRes, metricsRes] = await Promise.all([
        axios.get(`${API_URL}/performance/system-health`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/performance/database-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/performance/active-sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/performance/error-rates?hours=24`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/performance/metrics?hours=24`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setSystemHealth(healthRes.data.data);
      setDatabaseStats(dbRes.data.data);
      setActiveSessions(sessionsRes.data.data);
      setErrorRates(errorsRes.data.data);
      setMetrics(metricsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy':
        return '#43e97b';
      case 'warning':
        return '#feca57';
      case 'critical':
        return '#ee5a6f';
      default:
        return '#667eea';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon sx={{ color: '#43e97b' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#feca57' }} />;
      case 'critical':
        return <ErrorIcon sx={{ color: '#ee5a6f' }} />;
      default:
        return <CheckCircleIcon sx={{ color: '#667eea' }} />;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !systemHealth) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Performance Monitoring
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Auto Refresh</InputLabel>
            <Select
              value={autoRefresh ? refreshInterval : 0}
              label="Auto Refresh"
              onChange={(e) => {
                const value = e.target.value;
                if (value === 0) {
                  setAutoRefresh(false);
                } else {
                  setAutoRefresh(true);
                  setRefreshInterval(value);
                }
              }}
            >
              <MenuItem value={0}>Off</MenuItem>
              <MenuItem value={10}>10s</MenuItem>
              <MenuItem value={30}>30s</MenuItem>
              <MenuItem value={60}>60s</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchAllData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* System Health Overview */}
      {systemHealth && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {getHealthIcon(systemHealth.status)}
            <Typography variant="h6" sx={{ ml: 1 }}>
              System Health
            </Typography>
            <Chip
              label={systemHealth.status.toUpperCase()}
              sx={{
                ml: 2,
                backgroundColor: getHealthColor(systemHealth.status),
                color: 'white'
              }}
            />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SpeedIcon sx={{ mr: 1, color: '#667eea' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Uptime
                    </Typography>
                  </Box>
                  <Typography variant="h5">
                    {formatUptime(systemHealth.uptime.seconds)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MemoryIcon sx={{ mr: 1, color: '#43e97b' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Memory Usage
                    </Typography>
                  </Box>
                  <Typography variant="h5">
                    {systemHealth.memory.usagePercent.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth.memory.usagePercent}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatBytes(systemHealth.memory.used)} / {formatBytes(systemHealth.memory.total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SpeedIcon sx={{ mr: 1, color: '#feca57' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      CPU Cores
                    </Typography>
                  </Box>
                  <Typography variant="h5">{systemHealth.cpu.cores}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Load: {systemHealth.cpu.loadAverage[0].toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <StorageIcon sx={{ mr: 1, color: '#4facfe' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Platform
                    </Typography>
                  </Box>
                  <Typography variant="h6">
                    {systemHealth.platform.type}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {systemHealth.platform.platform}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Database Statistics */}
        {databaseStats && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Database Statistics
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Total Collections"
                    secondary={databaseStats.collections.length}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Documents"
                    secondary={databaseStats.totalDocuments.toLocaleString()}
                  />
                </ListItem>
              </List>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Collection Breakdown
              </Typography>
              {databaseStats.collectionStats.map((stat) => (
                <Box key={stat.name} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{stat.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.count.toLocaleString()}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(stat.count / databaseStats.totalDocuments) * 100}
                  />
                </Box>
              ))}
            </Paper>
          </Grid>
        )}

        {/* Active Sessions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PeopleIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Active Sessions
              </Typography>
              <Chip
                label={activeSessions.length}
                size="small"
                color="primary"
                sx={{ ml: 2 }}
              />
            </Box>
            {activeSessions.length === 0 ? (
              <Alert severity="info">No active sessions in the last 15 minutes</Alert>
            ) : (
              <List>
                {activeSessions.slice(0, 10).map((session) => (
                  <ListItem key={session._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#667eea' }}>
                        {session.firstName?.[0] || session.email?.[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${session.firstName} ${session.lastName}`}
                      secondary={
                        <>
                          <Chip label={session.role} size="small" sx={{ mr: 1 }} />
                          Last active: {format(new Date(session.lastLogin), 'HH:mm:ss')}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Error Rates */}
        {errorRates && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ErrorIcon sx={{ mr: 1, color: errorRates.errorRate > 5 ? '#ee5a6f' : '#43e97b' }} />
                <Typography variant="h6">
                  Error Rates (24h)
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Activities
                      </Typography>
                      <Typography variant="h4">
                        {errorRates.totalActivities.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Failed Activities
                      </Typography>
                      <Typography variant="h4" color="error">
                        {errorRates.failedActivities}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Error Rate
                      </Typography>
                      <Typography variant="h4">
                        {errorRates.errorRate.toFixed(2)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(errorRates.errorRate, 100)}
                        color={errorRates.errorRate > 5 ? 'error' : 'success'}
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Performance Metrics Chart */}
        {metrics.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Activity Metrics (24h)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="_id"
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => `Hour ${value}:00`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#667eea"
                    name="Activities"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Performance;
