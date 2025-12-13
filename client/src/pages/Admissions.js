import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Add,
  Search,
  Visibility,
  CheckCircle,
  Cancel,
  PersonAdd,
  School,
  PendingActions,
  AssignmentTurnedIn,
  Business,
  Download,
  Refresh,
  AccountCircle,
  Settings,
  ExitToApp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAllAdmissions, getAdmissionStats, updateAdmissionStatus, approveAndEnroll, rejectAdmission } from '../services/admissionService';
import axios from 'axios';
import AdmissionCharts from '../components/admissions/AdmissionCharts';
import InstitutionSwitcher from '../components/InstitutionSwitcher';

const Admissions = () => {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', remarks: '' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchType, setSearchType] = useState('all'); // 'all', 'studentId', 'applicationNumber', 'name', 'email'

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'super_admin' || user.role === 'admin';

  // Initialize institution on mount
  useEffect(() => {
    if (!selectedInstitution) {
      const institutionData = localStorage.getItem('selectedInstitution');
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          setSelectedInstitution(institution._id || institution);
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      } else if (!isSuperAdmin && user.institution) {
        // For admin users, use their own institution from user data
        setSelectedInstitution(user.institution);
      }
    }
  }, []); // Run only once on mount

  // Fetch data when filters change
  useEffect(() => {
    // For admin users, require institution to be set
    if (!isSuperAdmin && !selectedInstitution) {
      if (user.institution) {
        // If user has institution but it's not set yet, wait for it to be set
        return;
      } else {
        // If admin user has no institution, show error and stop loading
        setError('Your account is not assigned to an institution. Please contact administrator.');
        setLoading(false);
        return;
      }
    }

    // Fetch data if super admin or if institution is set
    if (isSuperAdmin || selectedInstitution) {
      fetchData();
    }
  }, [selectedInstitution, selectedDepartment, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch institutions if super admin
      if (isSuperAdmin) {
        const instResponse = await axios.get('http://localhost:5000/api/v1/institutions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInstitutions(instResponse.data.data || []);
      }

      // Fetch departments
      if (selectedInstitution) {
        try {
          const deptResponse = await axios.get(`http://localhost:5000/api/v1/departments?institution=${selectedInstitution}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setDepartments(deptResponse.data.data || []);
        } catch (deptErr) {
          console.error('Failed to fetch departments:', deptErr);
          setDepartments([]);
        }
      }

      // Fetch admissions
      const filters = {};
      if (selectedInstitution) filters.institution = selectedInstitution;
      if (selectedDepartment) filters.department = selectedDepartment;
      if (selectedStatus) filters.status = selectedStatus;
      if (searchTerm) filters.search = searchTerm;

      const admissionsData = await getAllAdmissions(filters);
      setAdmissions(admissionsData.data || []);

      // Fetch stats
      const statsFilters = {};
      if (selectedInstitution) statsFilters.institution = selectedInstitution;
      const statsData = await getAdmissionStats(statsFilters);
      setStats(statsData.data || {});
    } catch (err) {
      console.error('Error fetching admissions data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch admissions';
      setError(errorMessage);
      setAdmissions([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type) => {
    try {
      if (type === 'approve') {
        await updateAdmissionStatus(selectedAdmission._id, 'approved', actionDialog.remarks);
      } else if (type === 'reject') {
        await rejectAdmission(selectedAdmission._id, actionDialog.remarks);
      } else if (type === 'enroll') {
        await approveAndEnroll(selectedAdmission._id);
      } else if (type === 'review') {
        await updateAdmissionStatus(selectedAdmission._id, 'under_review', actionDialog.remarks);
      }

      setActionDialog({ open: false, type: '', remarks: '' });
      setSelectedAdmission(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${type} admission`);
    }
  };

  const openActionDialog = (admission, type) => {
    setSelectedAdmission(admission);
    setActionDialog({ open: true, type, remarks: '' });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      under_review: 'info',
      approved: 'success',
      rejected: 'error',
      enrolled: 'primary',
      cancelled: 'default'
    };
    return colors[status] || 'default';
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
    localStorage.removeItem('selectedInstitution');
    navigate('/login');
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon!');
  };

  const filteredAdmissions = admissions.filter((admission) => {
    // Apply status filter first
    if (selectedStatus && admission.status !== selectedStatus) {
      return false;
    }

    // Apply department filter
    if (selectedDepartment && admission.department?._id?.toString() !== selectedDepartment) {
      return false;
    }

    // Apply search filter
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    switch (searchType) {
      case 'studentId':
        // Search in applicationNumber (primary identifier) or studentId if enrolled
        // For enrolled students, studentId is populated with student object
        const studentIdMatch = admission.studentId 
          ? (typeof admission.studentId === 'object' 
              ? admission.studentId.enrollmentNumber?.toLowerCase().includes(searchLower) ||
                admission.studentId._id?.toString().toLowerCase().includes(searchLower)
              : admission.studentId.toString().toLowerCase().includes(searchLower))
          : false;
        return studentIdMatch || admission.applicationNumber?.toLowerCase().includes(searchLower);
      case 'applicationNumber':
        return admission.applicationNumber?.toLowerCase().includes(searchLower);
      case 'name':
        return admission.fullName?.toLowerCase().includes(searchLower);
      case 'email':
        return admission.contactInfo?.email?.toLowerCase().includes(searchLower);
      default:
        return (
          admission.applicationNumber?.toLowerCase().includes(searchLower) ||
          admission.fullName?.toLowerCase().includes(searchLower) ||
          admission.contactInfo?.email?.toLowerCase().includes(searchLower) ||
          admission.studentId?.toString().toLowerCase().includes(searchLower) ||
          admission.contactInfo?.phone?.toLowerCase().includes(searchLower)
        );
    }
  });

  if (loading && admissions.length === 0 && !error) {
    return (
      <Box>
        <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
            <School sx={{ mr: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'block' } }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
              SGC Education - Admissions
            </Typography>
          </Toolbar>
        </AppBar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      {/* Top Navigation Bar */}
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 2 }}>
          <School sx={{ mr: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'block' } }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: { xs: 1, sm: 0 }, fontSize: { xs: '0.9rem', sm: '1.25rem' }, mr: { xs: 0, sm: 3 } }}>
            Admissions Management
          </Typography>

          {/* Institution Selector (for Super Admin) */}
          {isSuperAdmin && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
              <InstitutionSwitcher />
            </Box>
          )}

          {/* Search Bar */}
          <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '300px' }, maxWidth: { xs: '100%', sm: '500px' } }}>
            <TextField
              fullWidth
              size="small"
              placeholder={`Search by ${searchType === 'all' ? 'student ID, application number, name, or email' : searchType}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'white' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                      sx={{ color: 'white' }}
                    >
                      <Cancel fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '& .MuiInputBase-input': {
                    color: 'white',
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  },
                },
              }}
            />
          </Box>

          {/* Search Type Selector */}
          <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'rgba(255, 255, 255, 0.15)', borderRadius: 1 }}>
            <Select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
            >
              <MenuItem value="all">All Fields</MenuItem>
              <MenuItem value="studentId">Student ID</MenuItem>
              <MenuItem value="applicationNumber">App Number</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="email">Email</MenuItem>
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ color: 'white', bgcolor: 'rgba(255, 255, 255, 0.15)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' } }}
              title="Refresh"
            >
              <Refresh />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleExport}
              sx={{ color: 'white', bgcolor: 'rgba(255, 255, 255, 0.15)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' } }}
              title="Export Data"
            >
              <Download />
            </IconButton>
            {isAdmin && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/admissions/new')}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>New Application</Box>
                <Box sx={{ display: { xs: 'block', sm: 'none' } }}>New</Box>
              </Button>
            )}
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

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #667eea15 0%, #764ba205 100%)',
              border: '1px solid #667eea30',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">Total Applications</Typography>
                  <Typography variant="h4" fontWeight="bold" color="#667eea">{stats.totalApplications || 0}</Typography>
                </Box>
                <School sx={{ fontSize: 40, color: '#667eea', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #ff980015 0%, #ff980005 100%)',
              border: '1px solid #ff980030',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">Pending</Typography>
                  <Typography variant="h4" fontWeight="bold" color="#ff9800">{stats.pendingApplications || 0}</Typography>
                </Box>
                <PendingActions sx={{ fontSize: 40, color: '#ff9800', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #4caf5015 0%, #4caf5005 100%)',
              border: '1px solid #4caf5030',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">Approved</Typography>
                  <Typography variant="h4" fontWeight="bold" color="#4caf50">{stats.approvedApplications || 0}</Typography>
                </Box>
                <AssignmentTurnedIn sx={{ fontSize: 40, color: '#4caf50', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #2196f315 0%, #2196f305 100%)',
              border: '1px solid #2196f330',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">Enrolled</Typography>
                  <Typography variant="h4" fontWeight="bold" color="#2196f3">{stats.enrolledApplications || 0}</Typography>
                </Box>
                <PersonAdd sx={{ fontSize: 40, color: '#2196f3', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3, mx: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4, mx: 2 }}>
        {/* Header with Quick Stats */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Admission Applications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredAdmissions.length} of {admissions.length} applications
            </Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip
              label={`Total: ${stats.totalApplications || 0}`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Pending: ${stats.pendingApplications || 0}`}
              color="warning"
              variant="outlined"
            />
            <Chip
              label={`Approved: ${stats.approvedApplications || 0}`}
              color="success"
              variant="outlined"
            />
            <Chip
              label={`Enrolled: ${stats.enrolledApplications || 0}`}
              color="info"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Filters */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          {isSuperAdmin && (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Institution/Campus</InputLabel>
              <Select
                value={selectedInstitution}
                onChange={(e) => {
                  setSelectedInstitution(e.target.value);
                  setSelectedDepartment('');
                }}
                label="Institution/Campus"
                startAdornment={
                  <InputAdornment position="start">
                    <Business sx={{ ml: 1, color: 'text.secondary' }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="">All Institutions</MenuItem>
                {institutions.map((inst) => (
                  <MenuItem key={inst._id} value={inst._id}>
                    {inst.name} ({inst.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Department"
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept._id} value={dept._id}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="enrolled">Enrolled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Application No.</strong></TableCell>
                <TableCell><strong>Applicant Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                {isSuperAdmin && <TableCell><strong>Institution</strong></TableCell>}
                <TableCell><strong>Department</strong></TableCell>
                <TableCell><strong>Program</strong></TableCell>
                <TableCell><strong>Applied On</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 9 : 8} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No admissions found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdmissions.map((admission) => (
                  <TableRow key={admission._id} hover>
                    <TableCell>
                      <Chip label={admission.applicationNumber} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{admission.fullName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{admission.contactInfo.email}</Typography>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Typography variant="body2">{admission.institution?.name}</Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2">{admission.department?.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{admission.program}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(admission.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={admission.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        color={getStatusColor(admission.status)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/admissions/view/${admission._id}`)}
                        title="View Details"
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      {isAdmin && admission.status === 'pending' && (
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => openActionDialog(admission, 'review')}
                          title="Mark Under Review"
                        >
                          <PendingActions fontSize="small" />
                        </IconButton>
                      )}
                      {isAdmin && (admission.status === 'pending' || admission.status === 'under_review') && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openActionDialog(admission, 'approve')}
                            title="Approve"
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => openActionDialog(admission, 'reject')}
                            title="Reject"
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {isAdmin && admission.status === 'approved' && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openActionDialog(admission, 'enroll')}
                          title="Enroll Student"
                        >
                          <PersonAdd fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Analytics Charts Section */}
      <Box sx={{ mb: 4, mt: 4 }}>
        <AdmissionCharts filters={{ institution: selectedInstitution || user.institution }} />
      </Box>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, type: '', remarks: '' })}>
        <DialogTitle>
          {actionDialog.type === 'approve' && 'Approve Admission'}
          {actionDialog.type === 'reject' && 'Reject Admission'}
          {actionDialog.type === 'enroll' && 'Enroll Student'}
          {actionDialog.type === 'review' && 'Mark Under Review'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Remarks"
            value={actionDialog.remarks}
            onChange={(e) => setActionDialog({ ...actionDialog, remarks: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: '', remarks: '' })}>
            Cancel
          </Button>
          <Button onClick={() => handleAction(actionDialog.type)} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default Admissions;
