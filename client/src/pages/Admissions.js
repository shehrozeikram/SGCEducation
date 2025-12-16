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
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Drawer,
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
  Home,
  ArrowBack,
  List as ListIcon,
  Assessment,
  MenuBook,
  BarChart,
  ExpandMore,
  ExpandLess,
  ArrowForward,
  Dashboard as DashboardIcon,
  Assignment,
  People,
  FamilyRestroom,
  DateRange,
  CloudUpload,
  GroupAdd,
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
  const [activeSection, setActiveSection] = useState('list'); // 'list', 'new', 'reports', 'register', 'analytics'
  const [admissionMenuOpen, setAdmissionMenuOpen] = useState(true);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'super_admin' || user.role === 'admin';

  // Helper to get the correct institution ID
  const getInstitutionId = () => {
    // First priority: selectedInstitution from state
    if (selectedInstitution) {
      return selectedInstitution;
    }
    
    // Second priority: user.institution (extract _id if it's an object)
    if (user.institution) {
      const institutionId = typeof user.institution === 'object' ? user.institution._id : user.institution;
      return institutionId;
    }
    
    return null;
  };

  // Initialize institution on mount
  useEffect(() => {
    const institutionData = localStorage.getItem('selectedInstitution');
    if (institutionData) {
      try {
        const institution = JSON.parse(institutionData);
        const institutionId = institution._id || institution;
        setSelectedInstitution(institutionId);
      } catch (e) {
        console.error('Failed to parse institution data', e);
      }
    } else if (!isSuperAdmin && user.institution) {
      // For admin users, use their own institution from user data
      const institutionId = typeof user.institution === 'object' ? user.institution._id : user.institution;
      setSelectedInstitution(institutionId);
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

  const sidebarWidth = 280;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Top Navigation Bar */}
      <AppBar position="fixed" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', zIndex: 1300 }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, flexWrap: 'wrap', gap: 2 }}>
          <School sx={{ mr: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'block' } }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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

      {/* Sidebar + Content Layout */}
      <Box sx={{ display: 'flex' }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              position: 'fixed',
              top: 64,
              left: 0,
              height: 'calc(100vh - 64px)',
              borderRight: '1px solid #e0e0e0',
              overflowY: 'auto',
              bgcolor: 'white',
            },
          }}
        >
          <List sx={{ pt: 0 }}>
            {/* Dashboard */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => navigate('/dashboard')}>
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItemButton>
            </ListItem>

            {/* Admission - Collapsible */}
            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => setAdmissionMenuOpen(!admissionMenuOpen)}
                sx={{
                  bgcolor: admissionMenuOpen ? '#667eea15' : 'transparent',
                }}
              >
                <ListItemIcon>
                  <Assignment sx={{ color: admissionMenuOpen ? '#667eea' : 'inherit' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Admission" 
                  primaryTypographyProps={{
                    fontWeight: admissionMenuOpen ? 600 : 400,
                    color: admissionMenuOpen ? '#667eea' : 'inherit',
                  }}
                />
                {admissionMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>

            {/* Admission Sub-menu */}
            {admissionMenuOpen && (
              <List component="div" disablePadding>
                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'list'}
                  onClick={() => setActiveSection('list')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'list' ? '#667eea' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="All Admissions"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'list' ? '#667eea' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'new'}
                  onClick={() => setActiveSection('new')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'new' ? '#667eea' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="New Admission"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'new' ? '#667eea' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'reports'}
                  onClick={() => setActiveSection('reports')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'reports' ? '#667eea' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Reports"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'reports' ? '#667eea' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'register'}
                  onClick={() => setActiveSection('register')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'register' ? '#667eea' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Admission Register"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'register' ? '#667eea' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'analytics'}
                  onClick={() => setActiveSection('analytics')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'analytics' ? '#667eea' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Analytics"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'analytics' ? '#667eea' : 'text.secondary',
                    }}
                  />
                </ListItemButton>
              </List>
            )}

            {/* Students - Collapsible */}
            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => setStudentMenuOpen(!studentMenuOpen)}
                sx={{
                  bgcolor: studentMenuOpen ? '#1976d215' : 'transparent',
                }}
              >
                <ListItemIcon>
                  <People sx={{ color: studentMenuOpen ? '#1976d2' : 'inherit' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Students" 
                  primaryTypographyProps={{
                    fontWeight: studentMenuOpen ? 600 : 400,
                    color: studentMenuOpen ? '#1976d2' : 'inherit',
                  }}
                />
                {studentMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>

            {/* Students Sub-menu */}
            {studentMenuOpen && (
              <List component="div" disablePadding>
                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'search-student'}
                  onClick={() => setActiveSection('search-student')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'search-student' ? '#1976d2' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Search Student"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'search-student' ? '#1976d2' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'search-all-data'}
                  onClick={() => setActiveSection('search-all-data')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'search-all-data' ? '#1976d2' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Search Student All Data"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'search-all-data' ? '#1976d2' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'search-family'}
                  onClick={() => setActiveSection('search-family')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'search-family' ? '#1976d2' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Search Student By Family Number"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'search-family' ? '#1976d2' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'student-status'}
                  onClick={() => setActiveSection('student-status')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'student-status' ? '#1976d2' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Student Status Date Wise"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'student-status' ? '#1976d2' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                <ListItemButton 
                  sx={{ pl: 4 }}
                  selected={activeSection === 'import-students'}
                  onClick={() => setActiveSection('import-students')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ArrowForward fontSize="small" sx={{ color: activeSection === 'import-students' ? '#1976d2' : 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Import Students"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'import-students' ? '#1976d2' : 'text.secondary',
                    }}
                  />
                </ListItemButton>
              </List>
            )}

            {/* Student Bulk SignUp */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => setActiveSection('bulk-signup')}>
                <ListItemIcon>
                  <GroupAdd />
                </ListItemIcon>
                <ListItemText primary="Student Bulk SignUp" />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>

        {/* Main Content */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            pt: '80px',
            pr: 3,
            pb: 3,
            minHeight: '100vh',
            bgcolor: '#f5f5f5',
          }}
        >
      {/* Quick Links for Academic Setup */}
      <Paper sx={{ p: 2, mb: 3, mx: 3, background: 'linear-gradient(135deg, #667eea15 0%, #764ba205 100%)', border: '1px solid #667eea30' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
            Academic Setup
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/classes')}
              sx={{
                borderColor: '#667eea',
                color: '#667eea',
                '&:hover': {
                  borderColor: '#5568d3',
                  bgcolor: '#667eea15',
                },
              }}
            >
              📚 Manage Classes
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/sections')}
              sx={{
                borderColor: '#764ba2',
                color: '#764ba2',
                '&:hover': {
                  borderColor: '#653a8b',
                  bgcolor: '#764ba215',
                },
              }}
            >
              📑 Manage Sections
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/groups')}
              sx={{
                borderColor: '#f093fb',
                color: '#f093fb',
                '&:hover': {
                  borderColor: '#d97ee4',
                  bgcolor: '#f093fb15',
                },
              }}
            >
              👥 Manage Groups
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Content based on active section */}
      {activeSection === 'list' && (
        <>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4, px: 3 }}>
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
        <Alert severity="error" sx={{ mb: 3, mx: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4, mx: 3 }}>
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
      <Box sx={{ mb: 4, mt: 4, px: 3 }}>
        <AdmissionCharts 
          filters={getInstitutionId() ? { institution: getInstitutionId() } : {}} 
        />
      </Box>
        </>
      )}

      {/* Section: New Admission */}
      {activeSection === 'new' && (
        <Box sx={{ p: 4, mx: 3 }}>
          <Typography variant="h5" gutterBottom>New Admission Form</Typography>
          <Typography variant="body1" color="text.secondary">
            New Admission form will be displayed here. Click the button below to navigate to the admission form.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => navigate('/admissions/new')}
            sx={{ mt: 2 }}
          >
            Go to New Admission Form
          </Button>
        </Box>
      )}

      {/* Section: Reports */}
      {activeSection === 'reports' && (
        <Box sx={{ p: 4, mx: 3 }}>
          <Typography variant="h5" gutterBottom>Admission Reports</Typography>
          <Typography variant="body1" color="text.secondary">
            Reports section - Coming soon!
          </Typography>
        </Box>
      )}

      {/* Section: Register */}
      {activeSection === 'register' && (
        <Box sx={{ p: 4, mx: 3 }}>
          <Typography variant="h5" gutterBottom>Admission Register</Typography>
          <Typography variant="body1" color="text.secondary">
            Admission register - Coming soon!
          </Typography>
        </Box>
      )}

      {/* Section: Analytics */}
      {activeSection === 'analytics' && (
        <Box sx={{ px: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
            Admission Analytics & Insights
          </Typography>
          <AdmissionCharts 
            filters={getInstitutionId() ? { institution: getInstitutionId() } : {}} 
          />
        </Box>
      )}

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
        </Box>
      </Box>
    </Box>
  );
};

export default Admissions;
