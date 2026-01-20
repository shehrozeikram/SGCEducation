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
  Divider,
  TablePagination,
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
  Dashboard as DashboardIcon,
  AssignmentInd,
  PeopleAlt,
  ListAlt,
  NoteAdd,
  HowToReg,
  Insights,
  PersonSearch,
  ManageSearch,
  FamilyRestroom,
  DateRange,
  CloudUpload,
  GroupAdd,
  Print,
  PictureAsPdf,
  TableChart,
  Verified,
  Lock,
  Info,
  ContactPhone,
  CreditCard,
  Description,
  Phone,
  TrendingUp,
  Cake,
  Group,
  CalendarMonth,
  FileDownload,
  Edit,
  Delete,
  SwapHoriz,
  Apps,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAllAdmissions, getAdmissionStats, updateAdmissionStatus, approveAndEnroll, rejectAdmission, deleteAdmission } from '../services/admissionService';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { getAvailableModules } from '../config/modules';
import AdmissionCharts from '../components/admissions/AdmissionCharts';
import InstitutionSwitcher from '../components/InstitutionSwitcher';
import AdmissionByDateReport from '../components/reports/AdmissionByDateReport';
import AdmissionByMonthReport from '../components/reports/AdmissionByMonthReport';
import { useTablePagination } from '../hooks/useTablePagination';

const Admissions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const availableModules = getAvailableModules();
  
  // Get section from URL path
  const getSectionFromPath = () => {
    const path = location.pathname;
    if (path === '/admissions' || path === '/admissions/') return 'list';
    if (path === '/admissions/reports') return 'reports';
    if (path === '/admissions/register') return 'register';
    if (path === '/admissions/analytics') return 'analytics';
    if (path === '/admissions/students/search') return 'search-student';
    if (path === '/admissions/students/search-all') return 'search-all-data';
    if (path === '/admissions/students/bulk-signup') return 'bulk-signup';
    return 'list'; // Default
  };

  // Helper function to get URL for a section
  const getSectionUrl = (section) => {
    const urlMap = {
      'list': '/admissions',
      'new': '/admissions/new', // This goes to AdmissionForm page, not Admissions page
      'reports': '/admissions/reports',
      'register': '/admissions/register',
      'analytics': '/admissions/analytics',
      'search-student': '/admissions/students/search',
      'search-all-data': '/admissions/students/search-all',
      'bulk-signup': '/admissions/students/bulk-signup',
    };
    return urlMap[section] || '/admissions';
  };

  // Helper function to navigate to a section
  const navigateToSection = (section) => {
    const url = getSectionUrl(section);
    navigate(url);
  };
  
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // For list page - single status
  const [showLogo, setShowLogo] = useState(true); // For logo fallback
  // Generate cache-busting parameter once on mount to ensure fresh logo
  const [logoCacheBuster] = useState(() => `?t=${Date.now()}`);
  const [studentStatusFilter, setStudentStatusFilter] = useState([]); // For search student page - multi-select
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', remarks: '' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [modulesAnchorEl, setModulesAnchorEl] = useState(null);
  const [studentMenuAnchor, setStudentMenuAnchor] = useState(null);
  const [selectedStudentForMenu, setSelectedStudentForMenu] = useState(null);
  const [searchType, setSearchType] = useState('all'); // 'all', 'studentId', 'applicationNumber', 'name', 'email'
  const [activeSection, setActiveSection] = useState(getSectionFromPath()); // 'list', 'new', 'reports', 'register', 'analytics'
  const [admissionMenuOpen, setAdmissionMenuOpen] = useState(true);
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);

  // Search Student All Data state
  const allStudentStatusOptions = [
    'Enrolled',
    'Struck Off',
    'Soft Admission',
    'Passout',
    'Expelled',
    'Freeze',
    'School Leaving',
  ];
  const [allDataStatusFilter, setAllDataStatusFilter] = useState(allStudentStatusOptions);

  const allDataFieldOptions = [
    { id: 'studentId', label: 'Id' },
    { id: 'studentName', label: 'Student name' },
    { id: 'fatherName', label: 'Father name' },
    { id: 'dateOfBirth', label: 'Date of birth' },
    { id: 'admissionNumber', label: 'Admission number' },
    { id: 'admissionDate', label: 'Admission date' },
    { id: 'rollNumber', label: 'Roll number' },
    { id: 'className', label: 'Class' },
    { id: 'sectionName', label: 'Section' },
    { id: 'gender', label: 'Gender' },
  ];
  const [selectedAllDataFields, setSelectedAllDataFields] = useState(
    allDataFieldOptions.map((f) => f.id)
  );

  // Pagination hooks for all tables (default: 12 rows per page)
  const admissionsListPagination = useTablePagination(12);
  const searchStudentPagination = useTablePagination(12);
  const searchAllDataPagination = useTablePagination(12);
  const registerPagination = useTablePagination(12);

  // Reset pagination when filters change
  useEffect(() => {
    admissionsListPagination.resetPagination();
  }, [selectedStatus, selectedInstitution, searchTerm, searchType]);

  useEffect(() => {
    searchStudentPagination.resetPagination();
  }, [searchTerm, studentStatusFilter]);

  useEffect(() => {
    searchAllDataPagination.resetPagination();
  }, [allDataStatusFilter, selectedAllDataFields]);

  useEffect(() => {
    registerPagination.resetPagination();
  }, [searchTerm]);
  const [studentAllDataRows, setStudentAllDataRows] = useState([]);
  
  // Reports state
  const [selectedReportTab, setSelectedReportTab] = useState(0);
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    month: '',
    year: new Date().getFullYear().toString(),
    class: '',
    institution: ''
  });
  const [reportData, setReportData] = useState({
    'admission-by-date': null,
    'admission-by-month': null,
    'admission-by-year': null,
    'class-wise-comparison': null,
    'date-wise-admission': null,
    'student-strength-month-wise': null,
  });
  const [reportLoading, setReportLoading] = useState(false);

  // Helper to build row data for "Search Student All Data"
  const buildStudentAllDataRow = (admission, index) => {
    const fullName = admission.personalInfo?.name || '';
    const dob = admission.personalInfo?.dateOfBirth
      ? new Date(admission.personalInfo.dateOfBirth).toISOString().split('T')[0]
      : '';
    const ageYears = admission.personalInfo?.dateOfBirth
      ? Math.floor(
          (new Date().getTime() - new Date(admission.personalInfo.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

    return {
      _id: admission._id,
      index: index + 1,
      studentId: admission.studentId?.enrollmentNumber || '',
      studentName: fullName || 'N/A',
      fatherName: admission.guardianInfo?.fatherName || 'N/A',
      dateOfBirth: dob,
      bloodGroup: admission.personalInfo?.bloodGroup || '',
      hobbies: admission.hobbies || '',
      category: admission.personalInfo?.category || 'Default',
      familyNumber: admission.familyNumber || '',
      admissionDate: admission.createdAt
        ? new Date(admission.createdAt).toISOString().split('T')[0]
        : '',
      gender:
        admission.personalInfo?.gender
          ? admission.personalInfo.gender.charAt(0).toUpperCase() +
            admission.personalInfo.gender.slice(1)
          : '',
      packageName: admission.packageName || '',
      packageStart: admission.packageStartDate
        ? new Date(admission.packageStartDate).toISOString().split('T')[0]
        : '',
      packageEnd: admission.packageEndDate
        ? new Date(admission.packageEndDate).toISOString().split('T')[0]
        : '',
      sectionRollNumber: admission.sectionRollNumber || '',
      admissionNumber: admission.applicationNumber || '',
      rollNumber: admission.studentId?.rollNumber || '',
      sectionName: admission.section?.name || '',
      className: admission.class?.name || admission.program || '',
      groupName: admission.group?.name || '',
      age: ageYears !== null ? `${ageYears} Years` : '',
    };
  };

  const handleSearchStudentAllData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all admissions with student data populated
      const token = localStorage.getItem('token');
      const filters = {};
      if (selectedInstitution) filters.institution = selectedInstitution;
      
      // Get all admissions (we'll filter for enrolled ones that have students)
      const admissionsData = await getAllAdmissions(filters);
      let allAdmissions = admissionsData.data || [];
      
      // Filter for enrolled admissions that have studentId (students)
      let studentsData = allAdmissions.filter(admission => 
        admission.status === 'enrolled' && admission.studentId
      );
      
      // If status filter is applied, we need to fetch student details
      // For now, we'll work with enrolled admissions
      // Map UI statuses to admission/student statuses
      const statusMapping = {
        'Enrolled': 'enrolled',
        'Struck Off': 'struck_off',
        'Soft Admission': 'soft_admission',
        'Passout': 'passout',
        'Expelled': 'expelled',
        'Freeze': 'freeze',
        'School Leaving': 'school_leaving'
      };
      
      if (allDataStatusFilter && allDataStatusFilter.length > 0 && allDataStatusFilter.length < allStudentStatusOptions.length) {
        // Filter by selected statuses
        const mappedStatuses = allDataStatusFilter.map(s => statusMapping[s] || s.toLowerCase());
        studentsData = studentsData.filter(admission => {
          // For now, we'll show all enrolled students
          // Later, we can filter by actual student status when we have student API
          return mappedStatuses.includes('enrolled') || mappedStatuses.includes(admission.status?.toLowerCase());
        });
      }
      
      const rows = studentsData.map((admission, index) =>
        buildStudentAllDataRow(admission, index)
      );
      setStudentAllDataRows(rows);
    } catch (err) {
      console.error('Error searching student data:', err);
      setError(err.response?.data?.message || 'Failed to search student data');
      setStudentAllDataRows([]);
    } finally {
      setLoading(false);
    }
  };

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

  // Update activeSection when URL path changes (e.g., browser back/forward, direct navigation)
  useEffect(() => {
    const sectionFromPath = getSectionFromPath();
    if (sectionFromPath !== activeSection) {
      setActiveSection(sectionFromPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Auto-fetch data when navigating to search-all-data section
  useEffect(() => {
    if (activeSection === 'search-all-data' && admissions.length > 0) {
      // Auto-search when section is active and we have admissions data
      // Only if no rows are currently displayed
      if (studentAllDataRows.length === 0) {
        // Don't auto-search, let user click Search button
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, admissions]);

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
        const instResponse = await axios.get(getApiUrl('institutions'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInstitutions(instResponse.data.data || []);
      }

      // Fetch departments
      if (selectedInstitution) {
        try {
          const deptResponse = await axios.get(`${getApiUrl('departments')}?institution=${selectedInstitution}`, {
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

  const handleDeleteAdmission = async (admissionId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete the admission for ${studentName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await deleteAdmission(admissionId);
      setError(''); // Clear any previous errors
      // Show success message (you can add a success state if needed)
      alert('Admission deleted successfully');
      fetchData(); // Refresh the list
    } catch (err) {
      console.error('Error deleting admission:', err);
      setError(err.response?.data?.message || 'Failed to delete admission');
    } finally {
      setLoading(false);
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

  const handleModulesMenu = (event) => {
    setModulesAnchorEl(event.currentTarget);
  };

  const handleModulesClose = () => {
    setModulesAnchorEl(null);
  };

  const handleModuleClick = (route) => {
    handleModulesClose();
    navigate(route);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon!');
  };

  // Report type mapping
  const reportTypes = [
    'admission-by-date',
    'admission-by-month',
    'admission-by-year',
    'class-wise-comparison',
    'date-wise-admission'
  ];

  // Fetch report data based on selected report type
  const fetchReportData = async (reportType) => {
    try {
      setReportLoading(true);
      const token = localStorage.getItem('token');
      
      const filters = {
        ...reportFilters,
        institution: getInstitutionId() || reportFilters.institution,
        reportType: reportType
      };

      const response = await axios.get(getApiUrl('admissions/reports'), {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });

      setReportData(prev => ({
        ...prev,
        [reportType]: response.data.data
      }));
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.response?.data?.message || 'Failed to fetch report data');
      setReportData(prev => ({
        ...prev,
        [reportType]: null
      }));
    } finally {
      setReportLoading(false);
    }
  };

  const handleGenerateReport = (reportType) => {
    fetchReportData(reportType);
  };

  const handleTabChange = (event, newValue) => {
    setSelectedReportTab(newValue);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportReportPDF = () => {
    alert('PDF export coming soon!');
  };

  const handleExportReportExcel = () => {
    alert('Excel export coming soon!');
  };

  const filteredAdmissions = admissions.filter((admission) => {
    // Apply status filter first
    if (selectedStatus && admission.status !== selectedStatus) {
      return false;
    }

    // Department filter removed - department field no longer exists in admissions

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
        const fullName = (admission.personalInfo?.name || '').toLowerCase();
        return fullName.includes(searchLower);
      case 'email':
        return admission.contactInfo?.email?.toLowerCase().includes(searchLower);
      default:
        const defaultFullName = (admission.personalInfo?.name || '').toLowerCase();
        return (
          admission.applicationNumber?.toLowerCase().includes(searchLower) ||
          defaultFullName.includes(searchLower) ||
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
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '0.9rem', sm: '1.25rem' }, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
              Admissions Management
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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '0.9rem', sm: '1.25rem' }, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
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
              placeholder="Search by student ID, application number, name, or email..."
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

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Modules Dropdown */}
            <Button
              variant="outlined"
              startIcon={<Apps />}
              onClick={handleModulesMenu}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.5)',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Modules</Box>
              <Box sx={{ display: { xs: 'block', sm: 'none' } }}>Apps</Box>
            </Button>
            <Menu
              anchorEl={modulesAnchorEl}
              open={Boolean(modulesAnchorEl)}
              onClose={handleModulesClose}
              PaperProps={{
                sx: {
                  maxHeight: '70vh',
                  width: '280px',
                  mt: 1,
                }
              }}
            >
              <MenuItem onClick={() => handleModuleClick('/dashboard')}>
                <Home sx={{ mr: 2, fontSize: 20 }} />
                Dashboard
              </MenuItem>
              <Divider />
              {availableModules.map((module, index) => {
                const IconComponent = module.icon;
                return (
                  <MenuItem
                    key={index}
                    onClick={() => handleModuleClick(module.route)}
                    sx={{
                      '&:hover': {
                        bgcolor: `${module.color}10`,
                      },
                    }}
                  >
                    <IconComponent sx={{ mr: 2, fontSize: 20, color: module.color }} />
                    {module.name}
                  </MenuItem>
                );
              })}
            </Menu>
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
                  <DashboardIcon sx={{ color: '#667eea' }} />
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
                  <AssignmentInd sx={{ color: '#f093fb' }} />
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
                  onClick={() => navigateToSection('list')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ListAlt fontSize="small" sx={{ color: '#667eea' }} />
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
                  onClick={() => navigateToSection('new')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <NoteAdd fontSize="small" sx={{ color: '#10b981' }} />
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
                  onClick={() => navigateToSection('reports')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Insights fontSize="small" sx={{ color: '#4facfe' }} />
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
                  onClick={() => navigateToSection('register')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <HowToReg fontSize="small" sx={{ color: '#43e97b' }} />
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
                  onClick={() => navigateToSection('analytics')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <BarChart fontSize="small" sx={{ color: '#feca57' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Analytics"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'analytics' ? '#667eea' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

                {isAdmin && (
                  <ListItemButton 
                    sx={{ pl: 4 }}
                    onClick={() => navigate('/student-promotion')}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <SwapHoriz fontSize="small" sx={{ color: '#10b981' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Student Promotion"
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        color: 'text.secondary',
                      }}
                    />
                  </ListItemButton>
                )}
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
                  <PeopleAlt sx={{ color: '#4facfe' }} />
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
                  onClick={() => navigateToSection('search-student')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PersonSearch fontSize="small" sx={{ color: '#667eea' }} />
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
                  onClick={() => navigateToSection('search-all-data')}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ManageSearch fontSize="small" sx={{ color: '#764ba2' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Search Student All Data"
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      color: activeSection === 'search-all-data' ? '#1976d2' : 'text.secondary',
                    }}
                  />
                </ListItemButton>

              </List>
            )}
          </List>
        </Drawer>

        {/* Main Content */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            pt: 2,
            pr: 3,
            pb: 3,
            mt: '20px',
            minHeight: '100vh',
            bgcolor: '#f5f5f5',
          }}
        >
      {/* Quick Links for Academic Setup */}
      <Paper sx={{ p: 2, mb: 3, mx: 3, mt: 0, background: 'linear-gradient(135deg, #667eea15 0%, #764ba205 100%)', border: '1px solid #667eea30' }}>
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
              <TableRow sx={{ bgcolor: '#667eea' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Application No.</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Applicant Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                {isSuperAdmin && <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Institution</TableCell>}
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Class</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Applied On</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No admissions found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                admissionsListPagination.getPaginatedData(filteredAdmissions).map((admission) => (
                  <TableRow key={admission._id} hover>
                    <TableCell>
                      <Chip label={admission.applicationNumber} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {admission.personalInfo?.name || 'N/A'}
                        {admission.guardianInfo?.fatherName && (
                          <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 0.5 }}>
                            {admission.guardianInfo.fatherName}
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{admission.contactInfo?.email || 'N/A'}</Typography>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Typography variant="body2">{admission.institution?.name || 'N/A'}</Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2">{admission.class?.name || admission.program || 'N/A'}</Typography>
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
          {filteredAdmissions.length > 0 && (
            <TablePagination
              component="div"
              count={filteredAdmissions.length}
              page={admissionsListPagination.page}
              onPageChange={admissionsListPagination.handleChangePage}
              rowsPerPage={admissionsListPagination.rowsPerPage}
              onRowsPerPageChange={admissionsListPagination.handleChangeRowsPerPage}
              rowsPerPageOptions={admissionsListPagination.rowsPerPageOptions}
              labelRowsPerPage="Rows per page:"
            />
          )}
        </TableContainer>
      </Paper>

      {/* Analytics Charts Section - Show graphs on list page */}
      {getInstitutionId() && (
        <Box sx={{ mb: 4, mt: 4, px: 3 }}>
          <AdmissionCharts 
            filters={{ institution: getInstitutionId() }} 
          />
        </Box>
      )}
      </>
      )}

      {/* Section: Search Student All Data */}
      {activeSection === 'search-all-data' && (
        <Box sx={{ mx: 3 }}>
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              STUDENT ALL DATA REPORT
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  Student Status
                </Typography>
                <FormControl fullWidth>
                  <Select
                    multiple
                    value={allDataStatusFilter}
                    onChange={(e) => setAllDataStatusFilter(e.target.value)}
                    displayEmpty
                    renderValue={(selected) => {
                      if (!selected || selected.length === 0) return 'Select Status';
                      if (selected.length === allStudentStatusOptions.length) {
                        return `All selected (${selected.length})`;
                      }
                      return selected.join(', ');
                    }}
                  >
                    {allStudentStatusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  Data Fields
                </Typography>
                <FormControl fullWidth>
                  <Select
                    multiple
                    value={selectedAllDataFields}
                    onChange={(e) => setSelectedAllDataFields(e.target.value)}
                    displayEmpty
                    renderValue={(selected) => {
                      if (!selected || selected.length === 0) return 'Select Columns';
                      if (selected.length === allDataFieldOptions.length) {
                        return `All selected (${selected.length})`;
                      }
                      const labels = allDataFieldOptions
                        .filter((opt) => selected.includes(opt.id))
                        .map((opt) => opt.label);
                      return labels.join(', ');
                    }}
                  >
                    {allDataFieldOptions.map((field) => (
                      <MenuItem key={field.id} value={field.id}>
                        {field.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleSearchStudentAllData}
                  sx={{
                    bgcolor: '#667eea',
                    '&:hover': { bgcolor: '#5568d3' },
                    textTransform: 'none',
                    px: 4,
                    py: 1.25,
                  }}
                >
                  Search
                </Button>
              </Grid>
            </Grid>

            {/* Results Table */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : studentAllDataRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No data to display. Please click on Search button to get all students.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#667eea' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Sr</TableCell>
                      {allDataFieldOptions
                        .filter((field) => selectedAllDataFields.includes(field.id))
                        .map((field) => (
                          <TableCell key={field.id} sx={{ color: 'white', fontWeight: 'bold' }}>
                            {field.label}
                          </TableCell>
                        ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchAllDataPagination.getPaginatedData(studentAllDataRows).map((row, idx) => {
                      const actualIndex = searchAllDataPagination.page * searchAllDataPagination.rowsPerPage + idx;
                      return (
                        <TableRow key={row._id || idx} hover>
                          <TableCell>{actualIndex + 1}</TableCell>
                          {allDataFieldOptions
                            .filter((field) => selectedAllDataFields.includes(field.id))
                            .map((field) => (
                              <TableCell key={field.id}>
                                {row[field.id] || ''}
                              </TableCell>
                            ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {studentAllDataRows.length > 0 && (
                  <TablePagination
                    component="div"
                    count={studentAllDataRows.length}
                    page={searchAllDataPagination.page}
                    onPageChange={searchAllDataPagination.handleChangePage}
                    rowsPerPage={searchAllDataPagination.rowsPerPage}
                    onRowsPerPageChange={searchAllDataPagination.handleChangeRowsPerPage}
                    rowsPerPageOptions={searchAllDataPagination.rowsPerPageOptions}
                    labelRowsPerPage="Rows per page:"
                  />
                )}
              </TableContainer>
            )}

            {studentAllDataRows.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Total: {studentAllDataRows.length}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
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
        <Box sx={{ mx: 3 }}>
          {/* Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" fontWeight="bold">
                Admission Reports
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handlePrintReport}
                  disabled={!reportData[reportTypes[selectedReportTab]]}
                >
                  Print
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportReportPDF}
                  disabled={!reportData[reportTypes[selectedReportTab]]}
                  color="error"
                >
                  PDF
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TableChart />}
                  onClick={handleExportReportExcel}
                  disabled={!reportData[reportTypes[selectedReportTab]]}
                  color="success"
                >
                  Excel
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Tabs Navigation */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              p: 2,
            }}>
              {[
                { icon: <DateRange />, label: "Admission By Date", index: 0 },
                { icon: <BarChart />, label: "New Admission Detail By Month", index: 1 },
                { icon: <Assessment />, label: "Admission Analysis By Year", index: 2 },
                { icon: <School />, label: "New Admission Strength Comparison Class Wise", index: 3 },
                { icon: <ListIcon />, label: "New Admission Date Wise", index: 4 },
                { icon: <TrendingUp />, label: "Student's Strength Month Wise", index: 5 },
              ].map((tab) => (
                <Button
                  key={tab.index}
                  variant={selectedReportTab === tab.index ? "contained" : "outlined"}
                  startIcon={tab.icon}
                  onClick={() => handleTabChange(null, tab.index)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    px: 2,
                    py: 1.5,
                    ...(selectedReportTab === tab.index ? {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                      },
                    } : {
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#5568d3',
                        bgcolor: '#667eea15',
                      },
                    }),
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </Box>
          </Paper>

          {/* Tab Panel 0: Admission By Date */}
          {selectedReportTab === 0 && (
            <AdmissionByDateReport />
          )}

          {/* Tab Panel 1: Admission By Month */}
          {selectedReportTab === 1 && (
            <AdmissionByMonthReport />
          )}

          {/* Tab Panel 2: Admission By Year */}
          {selectedReportTab === 2 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#667eea">
                Admission Analysis By Year
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={10}>
                  <TextField
                    fullWidth
                    label="Year"
                    type="number"
                    value={reportFilters.year}
                    onChange={(e) => setReportFilters({ ...reportFilters, year: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    startIcon={<Assessment />}
                    onClick={() => handleGenerateReport('admission-by-year')}
                    fullWidth
                    sx={{
                      height: '56px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Generate
                  </Button>
                </Grid>
              </Grid>

              {reportLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!reportLoading && reportData['admission-by-year'] && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Year: {reportFilters.year}
                  </Typography>
                  
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={3}>
                      <Card elevation={0} sx={{ bgcolor: '#667eea15', border: '1px solid #667eea30' }}>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">Total Applications</Typography>
                          <Typography variant="h4" fontWeight="bold" color="#667eea">
                            {reportData['admission-by-year'].summary?.total || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card elevation={0} sx={{ bgcolor: '#ff980015', border: '1px solid #ff980030' }}>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">Pending</Typography>
                          <Typography variant="h4" fontWeight="bold" color="#ff9800">
                            {reportData['admission-by-year'].summary?.pending || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card elevation={0} sx={{ bgcolor: '#4caf5015', border: '1px solid #4caf5030' }}>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">Approved</Typography>
                          <Typography variant="h4" fontWeight="bold" color="#4caf50">
                            {reportData['admission-by-year'].summary?.approved || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card elevation={0} sx={{ bgcolor: '#2196f315', border: '1px solid #2196f330' }}>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">Enrolled</Typography>
                          <Typography variant="h4" fontWeight="bold" color="#2196f3">
                            {reportData['admission-by-year'].summary?.enrolled || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>Month</strong></TableCell>
                          <TableCell><strong>Applications</strong></TableCell>
                          <TableCell><strong>Conversion Rate</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData['admission-by-year'].monthlyData?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                No data available for the selected criteria
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData['admission-by-year'].monthlyData?.map((row, index) => (
                            <TableRow key={index} hover>
                              <TableCell>{row.month}</TableCell>
                              <TableCell><strong>{row.total}</strong></TableCell>
                              <TableCell>
                                <Chip 
                                  label={`${row.conversionRate}%`} 
                                  size="small" 
                                  color={row.conversionRate > 50 ? 'success' : 'warning'}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {!reportLoading && !reportData['admission-by-year'] && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Assessment sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Select year and click "Generate" to view the report
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* Tab Panel 3: Class Wise Comparison */}
          {selectedReportTab === 3 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#667eea">
                New Admission Strength Comparison Class Wise
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={10}>
                  <TextField
                    fullWidth
                    label="Year"
                    type="number"
                    value={reportFilters.year}
                    onChange={(e) => setReportFilters({ ...reportFilters, year: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    startIcon={<Assessment />}
                    onClick={() => handleGenerateReport('class-wise-comparison')}
                    fullWidth
                    sx={{
                      height: '56px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Generate
                  </Button>
                </Grid>
              </Grid>

              {reportLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!reportLoading && reportData['class-wise-comparison'] && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Year: {reportFilters.year}
                  </Typography>
                  
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>Class</strong></TableCell>
                          <TableCell><strong>Total Admissions</strong></TableCell>
                          <TableCell><strong>Enrolled</strong></TableCell>
                          <TableCell><strong>Pending</strong></TableCell>
                          <TableCell><strong>Approved</strong></TableCell>
                          <TableCell><strong>Rejected</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData['class-wise-comparison'].length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                No data available for the selected criteria
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData['class-wise-comparison'].map((row, index) => (
                            <TableRow key={index} hover>
                              <TableCell><strong>{row.className}</strong></TableCell>
                              <TableCell><strong>{row.total}</strong></TableCell>
                              <TableCell>
                                <Chip label={row.enrolled || 0} color="primary" size="small" />
                              </TableCell>
                              <TableCell>{row.pending || 0}</TableCell>
                              <TableCell>{row.approved || 0}</TableCell>
                              <TableCell>{row.rejected || 0}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {!reportLoading && !reportData['class-wise-comparison'] && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <School sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Select year and click "Generate" to view the report
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* Tab Panel 4: Date Wise Admission */}
          {selectedReportTab === 4 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#667eea">
                New Admission Date Wise
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    startIcon={<Assessment />}
                    onClick={() => handleGenerateReport('date-wise-admission')}
                    fullWidth
                    sx={{
                      height: '56px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Generate
                  </Button>
                </Grid>
              </Grid>

              {reportLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!reportLoading && reportData['date-wise-admission'] && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {reportFilters.startDate && reportFilters.endDate 
                      ? `Period: ${new Date(reportFilters.startDate).toLocaleDateString()} to ${new Date(reportFilters.endDate).toLocaleDateString()}`
                      : 'Period: All Time'}
                  </Typography>
                  
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>Application No.</strong></TableCell>
                          <TableCell><strong>Student Name</strong></TableCell>
                          <TableCell><strong>Class</strong></TableCell>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData['date-wise-admission'].length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                No data available for the selected criteria
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData['date-wise-admission'].map((row, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Chip label={row.applicationNumber} size="small" variant="outlined" color="primary" />
                              </TableCell>
                              <TableCell><strong>{row.studentName}</strong></TableCell>
                              <TableCell>{row.className}</TableCell>
                              <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={row.status.replace('_', ' ').toUpperCase()} 
                                  size="small" 
                                  color={getStatusColor(row.status)}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {!reportLoading && !reportData['date-wise-admission'] && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <ListIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Select date range and click "Generate" to view the report
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* Tab Panel 5: Student's Strength Month Wise */}
          {selectedReportTab === 5 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="#667eea">
                Student's Strength Month Wise
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={reportFilters.month}
                      onChange={(e) => setReportFilters({ ...reportFilters, month: e.target.value })}
                      label="Month"
                    >
                      <MenuItem value="">All Months</MenuItem>
                      <MenuItem value="1">January</MenuItem>
                      <MenuItem value="2">February</MenuItem>
                      <MenuItem value="3">March</MenuItem>
                      <MenuItem value="4">April</MenuItem>
                      <MenuItem value="5">May</MenuItem>
                      <MenuItem value="6">June</MenuItem>
                      <MenuItem value="7">July</MenuItem>
                      <MenuItem value="8">August</MenuItem>
                      <MenuItem value="9">September</MenuItem>
                      <MenuItem value="10">October</MenuItem>
                      <MenuItem value="11">November</MenuItem>
                      <MenuItem value="12">December</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Year"
                    type="number"
                    value={reportFilters.year}
                    onChange={(e) => setReportFilters({ ...reportFilters, year: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    startIcon={<Assessment />}
                    onClick={() => handleGenerateReport('student-strength-month-wise')}
                    fullWidth
                    sx={{
                      height: '56px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    Generate
                  </Button>
                </Grid>
              </Grid>

              {reportLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!reportLoading && reportData['student-strength-month-wise'] && (
                <Box>
                  {/* Summary cards */}
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={3}>
                      <Card elevation={0} sx={{ bgcolor: '#667eea15', border: '1px solid #667eea30' }}>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">Total Students</Typography>
                          <Typography variant="h4" fontWeight="bold" color="#667eea">
                            {reportData['student-strength-month-wise'].summary?.total || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card elevation={0} sx={{ bgcolor: '#4caf5015', border: '1px solid #4caf5030' }}>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">Enrolled</Typography>
                          <Typography variant="h4" fontWeight="bold" color="#4caf50">
                            {reportData['student-strength-month-wise'].summary?.enrolled || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card elevation={0} sx={{ bgcolor: '#2196f315', border: '1px solid #2196f330' }}>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">Male</Typography>
                          <Typography variant="h4" fontWeight="bold" color="#2196f3">
                            {reportData['student-strength-month-wise'].summary?.male || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Card elevation={0} sx={{ bgcolor: '#e91e6315', border: '1px solid #e91e6330' }}>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">Female</Typography>
                          <Typography variant="h4" fontWeight="bold" color="#e91e63">
                            {reportData['student-strength-month-wise'].summary?.female || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Table */}
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell><strong>Class</strong></TableCell>
                          <TableCell><strong>Section</strong></TableCell>
                          <TableCell><strong>Total</strong></TableCell>
                          <TableCell><strong>Enrolled</strong></TableCell>
                          <TableCell><strong>Male</strong></TableCell>
                          <TableCell><strong>Female</strong></TableCell>
                          <TableCell><strong>Other</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData['student-strength-month-wise'].rows?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                                No data available for the selected criteria
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData['student-strength-month-wise'].rows?.map((row, index) => (
                            <TableRow key={index} hover>
                              <TableCell>{row.className}</TableCell>
                              <TableCell>{row.sectionName}</TableCell>
                              <TableCell><strong>{row.total}</strong></TableCell>
                              <TableCell>{row.enrolled}</TableCell>
                              <TableCell>{row.male}</TableCell>
                              <TableCell>{row.female}</TableCell>
                              <TableCell>{row.other}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {!reportLoading && !reportData['student-strength-month-wise'] && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <TrendingUp sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Select month & year and click &quot;Generate&quot; to view the report
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

        </Box>
      )}

      {/* Section: Register */}
      {activeSection === 'register' && (
        <Box sx={{ mx: 3 }}>
          <Paper sx={{ p: 3, mt: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">
                ADMISSIONS REGISTER
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<FileDownload />}
                  onClick={() => {
                    // TODO: Implement report generation
                    window.print();
                  }}
                  sx={{
                    bgcolor: '#0d6efd',
                    '&:hover': { bgcolor: '#0b5ed7' },
                    textTransform: 'none',
                  }}
                >
                  GET REPORT
                </Button>
              </Box>
            </Box>

            {/* Search Bar */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Box>

            {/* Table */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#667eea' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Sr No</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Of Admission</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Admission No</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Student Name</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Father Name</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Of Birth</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Phone No</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category Or Tribe</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Religion</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Residence</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Class To Which Admitted</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Arrears Dues</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Class From Which Withdrawn</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Of Withdrawal</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Remarks</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const filteredRegisterAdmissions = admissions.filter((admission) => {
                        if (!searchTerm) return true;
                        const search = searchTerm.toLowerCase();
                        const studentName = `${admission.personalInfo?.firstName || ''} ${admission.personalInfo?.middleName || ''} ${admission.personalInfo?.lastName || ''}`.toLowerCase();
                        const fatherName = (admission.guardianInfo?.fatherName || '').toLowerCase();
                        const admissionNo = (admission.applicationNumber || '').toLowerCase();
                        const phone = (admission.contactInfo?.phone || '').toLowerCase();
                        return studentName.includes(search) || 
                               fatherName.includes(search) || 
                               admissionNo.includes(search) ||
                               phone.includes(search);
                      });

                      if (filteredRegisterAdmissions.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={17} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No admissions found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return registerPagination.getPaginatedData(filteredRegisterAdmissions).map((admission, idx) => {
                        const actualIndex = registerPagination.page * registerPagination.rowsPerPage + idx;
                        const studentName = admission.personalInfo?.name || '';
                        const dateOfBirth = admission.personalInfo?.dateOfBirth 
                          ? new Date(admission.personalInfo.dateOfBirth).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                          : 'N/A';
                        const admissionDate = admission.createdAt 
                          ? new Date(admission.createdAt).toLocaleDateString('en-GB')
                          : 'N/A';
                        const residence = admission.contactInfo?.currentAddress 
                          ? `${admission.contactInfo.currentAddress.street || ''}, ${admission.contactInfo.currentAddress.city || ''}`.trim()
                          : 'N/A';
                        const className = admission.class?.name || admission.program || 'N/A';
                        
                        return (
                          <TableRow key={admission._id} hover>
                            <TableCell>{actualIndex + 1}</TableCell>
                            <TableCell>{admissionDate}</TableCell>
                            <TableCell>{admission.applicationNumber || 'N/A'}</TableCell>
                            <TableCell>{studentName || 'N/A'}</TableCell>
                            <TableCell>{admission.guardianInfo?.fatherName || 'N/A'}</TableCell>
                            <TableCell>{dateOfBirth}</TableCell>
                            <TableCell>{admission.contactInfo?.phone || 'N/A'}</TableCell>
                            <TableCell>{admission.personalInfo?.category || ''}</TableCell>
                            <TableCell>{admission.personalInfo?.religion || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip
                                label={admission.status || 'pending'}
                                size="small"
                                color={getStatusColor(admission.status)}
                              />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {residence}
                            </TableCell>
                            <TableCell>{className}</TableCell>
                            <TableCell>
                              {admission.applicationFee?.amount && !admission.applicationFee?.paid 
                                ? admission.applicationFee.amount 
                                : '0'}
                            </TableCell>
                            <TableCell>{admission.withdrawnClass || ''}</TableCell>
                            <TableCell>
                              {admission.withdrawalDate 
                                ? new Date(admission.withdrawalDate).toLocaleDateString('en-GB')
                                : ''}
                            </TableCell>
                            <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {admission.remarks || ''}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => navigate(`/admissions/edit/${admission._id}`)}
                                  sx={{ color: '#0d6efd' }}
                                  title="Edit"
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteAdmission(admission._id, studentName || admission.applicationNumber)}
                                  sx={{ color: '#dc3545' }}
                                  title="Delete"
                                  disabled={admission.status === 'enrolled'}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
                {(() => {
                  const filteredRegisterAdmissions = admissions.filter((admission) => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    const studentName = `${admission.personalInfo?.firstName || ''} ${admission.personalInfo?.middleName || ''} ${admission.personalInfo?.lastName || ''}`.toLowerCase();
                    const fatherName = (admission.guardianInfo?.fatherName || '').toLowerCase();
                    const admissionNo = (admission.applicationNumber || '').toLowerCase();
                    const phone = (admission.contactInfo?.phone || '').toLowerCase();
                    return studentName.includes(search) || 
                           fatherName.includes(search) || 
                           admissionNo.includes(search) ||
                           phone.includes(search);
                  });
                  return filteredRegisterAdmissions.length > 0 ? (
                    <TablePagination
                      component="div"
                      count={filteredRegisterAdmissions.length}
                      page={registerPagination.page}
                      onPageChange={registerPagination.handleChangePage}
                      rowsPerPage={registerPagination.rowsPerPage}
                      onRowsPerPageChange={registerPagination.handleChangeRowsPerPage}
                      rowsPerPageOptions={registerPagination.rowsPerPageOptions}
                      labelRowsPerPage="Rows per page:"
                    />
                  ) : null;
                })()}
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* Section: Search Student */}
      {activeSection === 'search-student' && (
        <Box sx={{ mx: 3 }}>
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              SEARCH STUDENT
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              CLICK ON SEARCH BUTTON TO GET ALL STUDENTS
            </Typography>

            {/* Search and Filter Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Status Multi-Select Dropdown */}
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  multiple
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  displayEmpty
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'Select Status';
                    if (selected.length === 1) return selected[0];
                    return `${selected.length} selected`;
                  }}
                >
                  <MenuItem value="Enrolled">Enrolled</MenuItem>
                  <MenuItem value="Struck Off">Struck Off</MenuItem>
                  <MenuItem value="Soft Admission">Soft Admission</MenuItem>
                  <MenuItem value="Passout">Passout</MenuItem>
                  <MenuItem value="Expelled">Expelled</MenuItem>
                  <MenuItem value="Freeze">Freeze</MenuItem>
                  <MenuItem value="School Leaving">School Leaving</MenuItem>
                </Select>
              </FormControl>

              {/* Search Input */}
              <TextField
                placeholder="Search Student"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flex: 1, minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Search Button */}
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={fetchData}
                sx={{
                  bgcolor: '#0d6efd',
                  '&:hover': { bgcolor: '#0b5ed7' },
                  textTransform: 'none',
                }}
              >
                Search
              </Button>
            </Box>

            {/* Selected Student Info */}
            {selectedAdmission && (
              <Box sx={{ mb: 2, p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: '#c62828' }}>
                  ID: ({selectedAdmission._id?.slice(-3) || 'N/A'}) Name: ({selectedAdmission.personalInfo?.name || 'N/A'}) Father Name: ({selectedAdmission.guardianInfo?.fatherName || 'N/A'}) Class: ({selectedAdmission.class?.name || selectedAdmission.program || 'N/A'})
                </Typography>
              </Box>
            )}

            {/* Students Table */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#667eea' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Roll #</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Admission Number</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Father Name</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Class</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Section</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Age</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Gender</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Orphan</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const filteredSearchStudents = admissions
                        .filter(admission => {
                          // Apply status filter if studentStatusFilter is set
                          if (studentStatusFilter.length > 0 && !studentStatusFilter.includes(admission.status)) {
                            return false;
                          }
                          return admission.status === 'enrolled';
                        })
                        .filter(admission => {
                          if (searchTerm) {
                            const search = searchTerm.toLowerCase();
                            const name = (admission.personalInfo?.name || '').toLowerCase();
                            const fatherName = (admission.guardianInfo?.fatherName || '').toLowerCase();
                            const admissionNo = (admission.applicationNumber || '').toLowerCase();
                            return name.includes(search) || fatherName.includes(search) || admissionNo.includes(search);
                          }
                          return true;
                        });

                      if (filteredSearchStudents.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No students found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return searchStudentPagination.getPaginatedData(filteredSearchStudents).map((admission, idx) => {
                        const studentName = admission.personalInfo?.name || '';
                        const isMenuOpen = studentMenuAnchor && selectedStudentForMenu?._id === admission._id;
                        
                        return (
                          <TableRow key={admission._id} hover>
                            <TableCell>{admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A'}</TableCell>
                            <TableCell>{admission.studentId?.rollNumber || 'N/A'}</TableCell>
                            <TableCell>{admission.applicationNumber || 'N/A'}</TableCell>
                            <TableCell>{studentName || 'N/A'}</TableCell>
                            <TableCell>{admission.guardianInfo?.fatherName || 'N/A'}</TableCell>
                            <TableCell>{admission.class?.name || admission.program || 'N/A'}</TableCell>
                            <TableCell>{admission.section?.name || 'N/A'}</TableCell>
                            <TableCell>
                              {admission.personalInfo?.dateOfBirth 
                                ? `${Math.floor((new Date() - new Date(admission.personalInfo.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} Years`
                                : 'N/A'}
                            </TableCell>
                            <TableCell>{admission.personalInfo?.gender ? admission.personalInfo.gender.charAt(0).toUpperCase() + admission.personalInfo.gender.slice(1) : 'N/A'}</TableCell>
                            <TableCell>{admission.orphan === 'YES' ? 'Yes' : 'No'}</TableCell>
                            <TableCell>
                              <Chip
                                label={admission.status || 'pending'}
                                size="small"
                                color={getStatusColor(admission.status)}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setSelectedAdmission(admission);
                                  setSelectedStudentForMenu(admission);
                                  setStudentMenuAnchor(e.currentTarget);
                                }}
                              >
                                <Settings />
                              </IconButton>
                              <Menu
                                anchorEl={studentMenuAnchor}
                                open={isMenuOpen}
                                onClose={() => {
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                }}
                              >
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Edit */ 
                                }}>
                                  Edit
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Change Student Status */ 
                                }}>
                                  Change Student Status
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Print Time Table */ 
                                }}>
                                  Print Time Table
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Voucher History */ 
                                }}>
                                  Voucher History
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Print Result Card */ 
                                }}>
                                  Print Result Card
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Student Documents */ 
                                }}>
                                  Student Documents
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Student Status History */ 
                                }}>
                                  Student Status History
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Dossier */ 
                                }}>
                                  Dossier
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Print Detail */ 
                                }}>
                                  Print Detail
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement SMS History */ 
                                }}>
                                  SMS History
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Attendance History */ 
                                }}>
                                  Attendance History
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Remove Picture */ 
                                }}>
                                  Remove Picture
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Fee Commitment */ 
                                }}>
                                  Fee Commitment
                                </MenuItem>
                                <MenuItem onClick={() => { 
                                  setStudentMenuAnchor(null);
                                  setSelectedStudentForMenu(null);
                                  /* TODO: Implement Stationery Status */ 
                                }}>
                                  Stationery Status
                                </MenuItem>
                              </Menu>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
                {(() => {
                  const filteredSearchStudents = admissions
                    .filter(admission => {
                      // Apply status filter if studentStatusFilter is set
                      if (studentStatusFilter.length > 0 && !studentStatusFilter.includes(admission.status)) {
                        return false;
                      }
                      return admission.status === 'enrolled';
                    })
                    .filter(admission => {
                      if (searchTerm) {
                        const search = searchTerm.toLowerCase();
                        const name = (admission.personalInfo?.name || '').toLowerCase();
                        const fatherName = (admission.guardianInfo?.fatherName || '').toLowerCase();
                        const admissionNo = (admission.applicationNumber || '').toLowerCase();
                        return name.includes(search) || fatherName.includes(search) || admissionNo.includes(search);
                      }
                      return true;
                    });
                  return filteredSearchStudents.length > 0 ? (
                    <TablePagination
                      component="div"
                      count={filteredSearchStudents.length}
                      page={searchStudentPagination.page}
                      onPageChange={searchStudentPagination.handleChangePage}
                      rowsPerPage={searchStudentPagination.rowsPerPage}
                      onRowsPerPageChange={searchStudentPagination.handleChangeRowsPerPage}
                      rowsPerPageOptions={searchStudentPagination.rowsPerPageOptions}
                      labelRowsPerPage="Rows per page:"
                    />
                  ) : null;
                })()}
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* Section: Analytics */}
      {activeSection === 'analytics' && (
        <Box sx={{ px: 3 }}>
          {getInstitutionId() ? (
            <AdmissionCharts 
              filters={{ institution: getInstitutionId() }} 
            />
          ) : (
            <Alert severity="info">
              Please select an institution to view analytics.
            </Alert>
          )}
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
