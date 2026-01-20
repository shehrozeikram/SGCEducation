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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Checkbox,
  FormControlLabel,
  TablePagination,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  ToggleOn,
  ToggleOff,
  MoreVert,
  Block,
  Checklist,
  Visibility,
  Person,
  Event,
  AccessTime,
  FormatListNumbered,
  RestartAlt,
  Delete,
  Close,
  FolderSpecial,
  People,
  School,
  CalendarToday,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { capitalizeFirstOnly } from '../utils/textUtils';
import { useTablePagination } from '../hooks/useTablePagination';

const Sections = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const pagination = useTablePagination(12);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [inchargeDialogOpen, setInchargeDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [rollNumberDialogOpen, setRollNumberDialogOpen] = useState(false);
  const [resetConfirmDialogOpen, setResetConfirmDialogOpen] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [inchargeList, setInchargeList] = useState([]);
  const [leaveList, setLeaveList] = useState([]);
  const [inchargeFormData, setInchargeFormData] = useState({
    teacher: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [leaveFormData, setLeaveFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [rollNumberFormData, setRollNumberFormData] = useState({
    prefix: '',
    postfix: '',
    startFrom: '',
    enableSetting: false,
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

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
        setSelectedInstitution(user.institution);
      }
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    if (!isSuperAdmin && !selectedInstitution) {
      if (user.institution) {
        return;
      } else {
        setError('Your account is not assigned to an institution. Please contact administrator.');
        setLoading(false);
        return;
      }
    }

    if (isSuperAdmin || selectedInstitution) {
      fetchData();
    }
  }, [selectedInstitution]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch sections
      let url = getApiUrl('sections');
      if (selectedInstitution) {
        url += `?institution=${selectedInstitution}`;
      }

      const sectionResponse = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sectionsData = sectionResponse.data.data || [];
      console.log('Sections data:', sectionsData);
      console.log('Sample section class data:', sectionsData[0]?.class);
      setSections(sectionsData);
    } catch (err) {
      console.error('Error fetching sections data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch sections';
      setError(errorMessage);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (sectionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`sections/${sectionId}/toggle-status`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleMenuOpen = (event, section) => {
    setAnchorEl(event.currentTarget);
    setSelectedSection(section);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSection(null);
  };

  const handleEdit = () => {
    if (selectedSection) {
      navigate(`/sections/edit/${selectedSection._id}`);
    }
    handleMenuClose();
  };

  const handleDeactivate = async () => {
    if (selectedSection) {
      await handleToggleStatus(selectedSection._id);
    }
    handleMenuClose();
  };

  const handleGetSubjectPlan = () => {
    // TODO: Implement Get Subject Plan functionality
    alert('Get Subject Plan - Coming Soon');
    handleMenuClose();
  };

  const handleViewSubjectPlan = () => {
    // TODO: Implement View Subject Plan functionality
    alert('View Subject Plan - Coming Soon');
    handleMenuClose();
  };

  const handleManageSectionIncharge = async () => {
    if (selectedSection) {
      await fetchTeachers();
      await fetchSectionIncharge(selectedSection._id);
      setInchargeDialogOpen(true);
    }
    handleMenuClose();
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('users?role=teacher'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data.data || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setTeachers([]);
    }
  };

  const fetchSectionIncharge = async (sectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`sections/${sectionId}/incharge`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInchargeList(response.data.data || []);
    } catch (err) {
      console.error('Error fetching section incharge:', err);
      setInchargeList([]);
    }
  };

  const handleInchargeFormChange = (e) => {
    const { name, value } = e.target;
    setInchargeFormData({
      ...inchargeFormData,
      [name]: value
    });
  };

  const handleSaveIncharge = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        getApiUrl(`sections/${selectedSection._id}/incharge`),
        inchargeFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the incharge list
      await fetchSectionIncharge(selectedSection._id);
      
      // Reset form
      setInchargeFormData({
        teacher: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });
      
      alert('Section incharge assigned successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign section incharge');
    }
  };

  const handleDeleteIncharge = async (inchargeId) => {
    if (!window.confirm('Are you sure you want to remove this incharge assignment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        getApiUrl(`sections/${selectedSection._id}/incharge/${inchargeId}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the incharge list
      await fetchSectionIncharge(selectedSection._id);
      
      alert('Section incharge removed successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove section incharge');
    }
  };

  const handleCloseInchargeDialog = () => {
    setInchargeDialogOpen(false);
    setInchargeFormData({
      teacher: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleManageSectionLeave = async () => {
    if (selectedSection) {
      await fetchSectionLeave(selectedSection._id);
      setLeaveDialogOpen(true);
    }
    handleMenuClose();
  };

  const fetchSectionLeave = async (sectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`sections/${sectionId}/leave`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaveList(response.data.data || []);
    } catch (err) {
      console.error('Error fetching section leave:', err);
      setLeaveList([]);
    }
  };

  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveFormData({
      ...leaveFormData,
      [name]: value
    });
  };

  const handleSaveLeave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        getApiUrl(`sections/${selectedSection._id}/leave`),
        leaveFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the leave list
      await fetchSectionLeave(selectedSection._id);
      
      // Reset form
      setLeaveFormData({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });
      
      alert('Section leave added successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add section leave');
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to remove this leave record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        getApiUrl(`sections/${selectedSection._id}/leave/${leaveId}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh the leave list
      await fetchSectionLeave(selectedSection._id);
      
      alert('Section leave removed successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove section leave');
    }
  };

  const handleCloseLeaveDialog = () => {
    setLeaveDialogOpen(false);
    setLeaveFormData({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleViewSectionTime = () => {
    // TODO: Implement View Section Time functionality
    alert('View Section Time - Coming Soon');
    handleMenuClose();
  };

  const handleManageRollNumberSet = async () => {
    if (selectedSection) {
      await fetchRollNumberSetting(selectedSection._id);
      setRollNumberDialogOpen(true);
    }
    handleMenuClose();
  };

  const fetchRollNumberSetting = async (sectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`sections/${sectionId}/roll-number-setting`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.data) {
        setRollNumberFormData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching roll number setting:', err);
      // If no setting exists, keep default values
    }
  };

  const handleRollNumberFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRollNumberFormData({
      ...rollNumberFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleUpdateRollNumberSetting = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`sections/${selectedSection._id}/roll-number-setting`),
        rollNumberFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Roll number setting updated successfully!');
      setRollNumberDialogOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update roll number setting');
    }
  };

  const handleCloseRollNumberDialog = () => {
    setRollNumberDialogOpen(false);
    setRollNumberFormData({
      prefix: '',
      postfix: '',
      startFrom: '',
      enableSetting: false,
    });
  };

  const handleResetRollNumberSetting = () => {
    setResetConfirmDialogOpen(true);
    handleMenuClose();
  };

  const handleConfirmReset = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        getApiUrl(`sections/${selectedSection._id}/reset-roll-number`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResetConfirmDialogOpen(false);
      alert('Roll number setting reset successfully!');
      fetchData(); // Refresh the sections list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset roll number setting');
      setResetConfirmDialogOpen(false);
    }
  };

  const handleCancelReset = () => {
    setResetConfirmDialogOpen(false);
  };

  const filteredSections = sections.filter((section) =>
    section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && sections.length === 0 && !error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header Section with Gradient */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FolderSpecial sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  Sections Management
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Organize and manage class sections efficiently
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/sections/new')}
              sx={{
                bgcolor: 'white',
                color: '#667eea',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              Add New Section
            </Button>
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba205 100%)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Sections
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#667eea">
                      {sections.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#667eea15',
                      borderRadius: 2,
                    }}
                  >
                    <FolderSpecial sx={{ fontSize: 32, color: '#667eea' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(135deg, #43e97b15 0%, #38f9d705 100%)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Active Sections
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#43e97b">
                      {sections.filter(s => s.isActive !== false).length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#43e97b15',
                      borderRadius: 2,
                    }}
                  >
                    <School sx={{ fontSize: 32, color: '#43e97b' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c05 100%)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Capacity
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#f093fb">
                      {sections.reduce((sum, s) => sum + (s.capacity || 0), 0)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#f093fb15',
                      borderRadius: 2,
                    }}
                  >
                    <People sx={{ fontSize: 32, color: '#f093fb' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(135deg, #4facfe15 0%, #00f2fe05 100%)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Unique Classes
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#4facfe">
                      {new Set(sections.map(s => s.class?._id).filter(Boolean)).size}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#4facfe15',
                      borderRadius: 2,
                    }}
                  >
                    <CalendarToday sx={{ fontSize: 32, color: '#4facfe' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4,
            borderRadius: 3,
            border: '1px solid #e0e0e0',
          }}
        >

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

          {/* Search Section */}
          <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
            <TextField
              fullWidth
              placeholder="Search sections by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#667eea' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                flex: 1, 
                minWidth: '200px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
              }}
            />
          </Box>

          {/* Warning Message */}
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
            }}
          >
            * The Sections that are InActive, there attendance would not be loaded.
          </Alert>
          <Divider sx={{ mb: 3 }} />

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '& .MuiTableCell-head': { 
                    color: 'white', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    py: 2,
                  } 
                }}>
                  <TableCell>Class</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Academic Year</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={6}>
                        <FolderSpecial sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No sections found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first section'}
                        </Typography>
                        {!searchTerm && (
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => navigate('/sections/new')}
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                          >
                            Create First Section
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.getPaginatedData(filteredSections).map((section) => (
                    <TableRow 
                      key={section._id} 
                      hover
                      sx={{
                        '&:hover': {
                          bgcolor: '#f5f5f5',
                        },
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <School sx={{ fontSize: 20, color: '#667eea' }} />
                          <Typography variant="body2" fontWeight="medium">
                            {capitalizeFirstOnly(section.class?.name || 'N/A')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <FolderSpecial sx={{ fontSize: 20, color: '#f093fb' }} />
                          <Typography variant="body2" fontWeight="medium">
                            {capitalizeFirstOnly(section.name || section.code || 'N/A')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={section.academicYear || 'N/A'} 
                          size="small" 
                          sx={{ 
                            bgcolor: '#4facfe15',
                            color: '#4facfe',
                            fontWeight: 'medium',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {section.capacity || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {capitalizeFirstOnly(section.createdBy?.name || 'admin')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={section.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: section.isActive ? '#43e97b15' : '#e0e0e0',
                            color: section.isActive ? '#43e97b' : '#757575',
                            fontWeight: 'medium',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, section)}
                          sx={{
                            color: '#667eea',
                            '&:hover': {
                              bgcolor: '#667eea15',
                            },
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredSections.length > 0 && (
              <TablePagination
                component="div"
                count={filteredSections.length}
                page={pagination.page}
                onPageChange={pagination.handleChangePage}
                rowsPerPage={pagination.rowsPerPage}
                onRowsPerPageChange={pagination.handleChangeRowsPerPage}
                rowsPerPageOptions={pagination.rowsPerPageOptions}
                labelRowsPerPage="Rows per page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
              />
            )}
          </TableContainer>

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 3,
            sx: { minWidth: 250 }
          }}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <Edit fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleDeactivate}>
            <ListItemIcon>
              <Block fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>
              {selectedSection?.isActive ? 'Deactivate' : 'Activate'}
            </ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleGetSubjectPlan}>
            <ListItemIcon>
              <Checklist fontSize="small" />
            </ListItemIcon>
            <ListItemText>Get Subject Plan</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleViewSubjectPlan}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Subject Plan</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleManageSectionIncharge}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Section Incharge</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleManageSectionLeave}>
            <ListItemIcon>
              <Event fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Section Leave</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleViewSectionTime}>
            <ListItemIcon>
              <AccessTime fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Section Time</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleManageRollNumberSet}>
            <ListItemIcon>
              <FormatListNumbered fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Roll Number Setting</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleResetRollNumberSetting}>
            <ListItemIcon>
              <RestartAlt fontSize="small" />
            </ListItemIcon>
            <ListItemText>Reset Roll Number Setting</ListItemText>
          </MenuItem>
        </Menu>

        {/* Section Incharge Dialog */}
        <Dialog 
          open={inchargeDialogOpen} 
          onClose={handleCloseInchargeDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontWeight: 'bold',
          }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Person />
              <Typography variant="h6" fontWeight="bold">
                Section Incharge Management
              </Typography>
            </Box>
            <IconButton onClick={handleCloseInchargeDialog} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Teachers</InputLabel>
                    <Select
                      name="teacher"
                      value={inchargeFormData.teacher}
                      onChange={handleInchargeFormChange}
                      label="Teachers"
                    >
                      <MenuItem value="">Select Teacher</MenuItem>
                      {teachers.map((teacher) => (
                        <MenuItem key={teacher._id} value={teacher._id}>
                          {teacher.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={inchargeFormData.startDate}
                  onChange={handleInchargeFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={inchargeFormData.endDate}
                  onChange={handleInchargeFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              </Grid>
            </Box>

            {/* Incharge List Table */}
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#1976d2' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Section</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Teacher</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>End Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inchargeList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No incharge assignments found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inchargeList.map((incharge) => (
                      <TableRow key={incharge._id}>
                        <TableCell>{selectedSection?.code}</TableCell>
                        <TableCell>{incharge.teacher?.name || 'N/A'}</TableCell>
                        <TableCell>{new Date(incharge.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(incharge.endDate).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteIncharge(incharge._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          
          <DialogActions sx={{ p: 2, pt: 1 }}>
            <Button 
              onClick={handleCloseInchargeDialog} 
              variant="outlined"
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveIncharge} 
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 'bold',
              }}
            >
              Save Assignment
            </Button>
          </DialogActions>
        </Dialog>

        {/* Section Leave Dialog */}
        <Dialog 
          open={leaveDialogOpen} 
          onClose={handleCloseLeaveDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontWeight: 'bold',
          }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Event />
              <Typography variant="h6" fontWeight="bold">
                Section Leave Management
              </Typography>
            </Box>
            <IconButton onClick={handleCloseLeaveDialog} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Start Date"
                    name="startDate"
                    type="date"
                    value={leaveFormData.startDate}
                    onChange={handleLeaveFormChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={leaveFormData.endDate}
                  onChange={handleLeaveFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              </Grid>
            </Box>

            {/* Leave List Table */}
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#1976d2' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Section</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>End Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No leave records found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaveList.map((leave) => (
                      <TableRow key={leave._id}>
                        <TableCell>{selectedSection?.code}</TableCell>
                        <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLeave(leave._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          
          <DialogActions sx={{ p: 2, pt: 1 }}>
            <Button 
              onClick={handleCloseLeaveDialog} 
              variant="outlined"
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveLeave} 
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 'bold',
              }}
            >
              Save Leave
            </Button>
          </DialogActions>
        </Dialog>

        {/* Roll Number Setting Dialog */}
        <Dialog 
          open={rollNumberDialogOpen} 
          onClose={handleCloseRollNumberDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontWeight: 'bold',
          }}>
            <Box display="flex" alignItems="center" gap={1}>
              <FormatListNumbered />
              <Typography variant="h6" fontWeight="bold">
                Roll Number Settings
              </Typography>
            </Box>
            <IconButton onClick={handleCloseRollNumberDialog} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Prefix"
                    name="prefix"
                    placeholder="Prefix"
                    value={rollNumberFormData.prefix}
                    onChange={handleRollNumberFormChange}
                  />
                </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Postfix"
                  name="postfix"
                  placeholder="Postfix"
                  value={rollNumberFormData.postfix}
                  onChange={handleRollNumberFormChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Start From"
                  name="startFrom"
                  type="number"
                  value={rollNumberFormData.startFrom}
                  onChange={handleRollNumberFormChange}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="enableSetting"
                      checked={rollNumberFormData.enableSetting}
                      onChange={handleRollNumberFormChange}
                    />
                  }
                  label="Enable Setting"
                />
              </Grid>
              </Grid>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 2, pt: 1 }}>
            <Button 
              onClick={handleCloseRollNumberDialog} 
              variant="outlined"
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateRollNumberSetting} 
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 'bold',
              }}
            >
              Update Settings
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reset Roll Number Confirmation Dialog */}
        <Dialog
          open={resetConfirmDialogOpen}
          onClose={handleCancelReset}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
            color: 'white', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontWeight: 'bold',
          }}>
            <Box display="flex" alignItems="center" gap={1}>
              <RestartAlt />
              <Typography variant="h6" fontWeight="bold">
                Warning: Reset Roll Numbers
              </Typography>
            </Box>
            <IconButton onClick={handleCancelReset} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Warning:</strong> Old Numbers Would be Deleted.
              </Typography>
              <Typography variant="body1">
                Are you sure you want to Reset Section Roll Number Setting According to Prefix and Postfix?
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 2, pt: 1 }}>
            <Button 
              onClick={handleCancelReset} 
              variant="outlined"
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmReset} 
              variant="contained"
              sx={{
                bgcolor: '#f44336',
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: '#d32f2f',
                },
              }}
            >
              Yes, Reset
            </Button>
          </DialogActions>
        </Dialog>
        </Paper>
      </Container>
    </Box>
  );
};

export default Sections;

