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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  TablePagination,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  ToggleOn,
  ToggleOff,
  Class as ClassIcon,
  Close,
  School,
  People,
  Payment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { capitalizeFirstOnly } from '../utils/textUtils';
import { useTablePagination } from '../hooks/useTablePagination';

const Classes = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feeHeadDialog, setFeeHeadDialog] = useState({ open: false, class: null });
  const [feeHeadSettings, setFeeHeadSettings] = useState({});
  const pagination = useTablePagination(12);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fee heads list
  const feeHeads = [
    'Tuition Fee',
    'Arrears',
    'Examination Fee',
    'Transport Fee',
    'Annual Fee',
    'Heating Charges'
  ];

  // Months list
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getInstitutionId = () => {
    // Super admins use the navbar selection
    if (user.role === 'super_admin') {
      const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
      if (selectedInstitutionStr) {
        try {
          const parsed = JSON.parse(selectedInstitutionStr);
          return parsed._id || parsed;
        } catch (e) {
          return selectedInstitutionStr;
        }
      }
    }
    
    // For other roles or as fallback, use user.institution
    if (user.institution) {
      return typeof user.institution === 'object' ? user.institution._id : user.institution;
    }
    
    return null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build query params
      const params = new URLSearchParams();
      const institutionId = getInstitutionId();
      if (institutionId) {
        params.append('institution', institutionId);
      }

      // Fetch classes
      const classResponse = await axios.get(getApiUrl(`classes?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClasses(classResponse.data.data || []);
    } catch (err) {
      console.error('Error fetching classes data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch classes';
      setError(errorMessage);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`classes/${classId}/toggle-status`),
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

  const handleOpenFeeHeadDialog = (classItem) => {
    // Load saved settings from localStorage or initialize with all checked
    const savedSettings = localStorage.getItem(`feeHeadSettings_${classItem._id}`);
    let initialSettings = {};

    if (savedSettings) {
      initialSettings = JSON.parse(savedSettings);
    } else {
      // Initialize all fee heads with all months checked
      feeHeads.forEach(feeHead => {
        initialSettings[feeHead] = {};
        months.forEach(month => {
          initialSettings[feeHead][month] = true;
        });
      });
    }

    setFeeHeadSettings(initialSettings);
    setFeeHeadDialog({ open: true, class: classItem });
  };

  const handleToggleFeeHeadMonth = (feeHead, month) => {
    setFeeHeadSettings(prev => ({
      ...prev,
      [feeHead]: {
        ...prev[feeHead],
        [month]: !prev[feeHead]?.[month]
      }
    }));
  };

  const handleSaveFeeHeadSettings = () => {
    if (feeHeadDialog.class) {
      // Save to localStorage
      localStorage.setItem(
        `feeHeadSettings_${feeHeadDialog.class._id}`,
        JSON.stringify(feeHeadSettings)
      );
      // Close dialog
      setFeeHeadDialog({ open: false, class: null });
      // Show success message
      setError('');
      // You could also show a success message here
    }
  };

  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && classes.length === 0 && !error) {
    return (
      <Box>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
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
                <ClassIcon sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  Classes Management
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Organize and manage academic classes efficiently
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/classes/new')}
              sx={{
                bgcolor: 'white',
                color: '#667eea',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              Add New Class
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
                      Total Classes
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#667eea">
                      {classes.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#667eea15',
                      borderRadius: 2,
                    }}
                  >
                    <ClassIcon sx={{ fontSize: 32, color: '#667eea' }} />
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
                      Active Classes
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#43e97b">
                      {classes.filter(c => c.isActive !== false).length}
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
                      Unique Groups
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#f093fb">
                      {new Set(classes.map(c => c.group?._id).filter(Boolean)).size}
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
                      Fee Types
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#4facfe">
                      {new Set(classes.map(c => c.feeType?._id).filter(Boolean)).size}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#4facfe15',
                      borderRadius: 2,
                    }}
                  >
                    <Payment sx={{ fontSize: 32, color: '#4facfe' }} />
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
              placeholder="Search classes by name or code..."
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
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Fee Type</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell align="center">Actions</TableCell>
                  <TableCell align="center">Fee Settings</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={6}>
                        <ClassIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No classes found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first class'}
                        </Typography>
                        {!searchTerm && (
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => navigate('/classes/new')}
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                          >
                            Create First Class
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.getPaginatedData(filteredClasses).map((cls) => (
                    <TableRow 
                      key={cls._id} 
                      hover
                      sx={{
                        '&:hover': {
                          bgcolor: '#f5f5f5',
                        },
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <ClassIcon sx={{ fontSize: 20, color: '#667eea' }} />
                          <Typography variant="body2" fontWeight="medium">
                            {capitalizeFirstOnly(cls.name || 'N/A')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={cls.code || 'N/A'} 
                          size="small" 
                          sx={{ 
                            bgcolor: '#667eea15',
                            color: '#667eea',
                            fontWeight: 'medium',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {capitalizeFirstOnly(cls.feeType?.name || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {capitalizeFirstOnly(cls.group?.name || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {capitalizeFirstOnly(cls.createdBy?.name || 'N/A')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/classes/edit/${cls._id}`)}
                          sx={{
                            color: '#667eea',
                            '&:hover': {
                              bgcolor: '#667eea15',
                            },
                          }}
                          title="Edit Class"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenFeeHeadDialog(cls)}
                          sx={{
                            borderColor: '#dc3545',
                            color: '#dc3545',
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#c82333',
                              bgcolor: '#dc354515',
                            },
                          }}
                        >
                          Fee Settings
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          {filteredClasses.length > 0 && (
            <TablePagination
              component="div"
              count={filteredClasses.length}
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
      </Paper>
      </Container>

      {/* Monthly Fee Head Setting Dialog */}
      <Dialog
        open={feeHeadDialog.open}
        onClose={() => setFeeHeadDialog({ open: false, class: null })}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Payment />
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              Monthly Fee Head Setting - {feeHeadDialog.class?.name?.toUpperCase() || ''}
            </Typography>
          </Box>
          <IconButton
            onClick={() => setFeeHeadDialog({ open: false, class: null })}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#0d6efd' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                    Fee Head Name
                  </TableCell>
                  {months.map((month) => (
                    <TableCell
                      key={month}
                      align="center"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        borderRight: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {month}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {feeHeads.map((feeHead, index) => (
                  <TableRow
                    key={feeHead}
                    sx={{
                      '&:nth-of-type(odd)': {
                        bgcolor: '#f8f9fa',
                      },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500, borderRight: '1px solid rgba(0,0,0,0.1)' }}>
                      {feeHead}
                    </TableCell>
                    {months.map((month) => (
                      <TableCell
                        key={month}
                        align="center"
                        sx={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}
                      >
                        <Checkbox
                          checked={feeHeadSettings[feeHead]?.[month] || false}
                          onChange={() => handleToggleFeeHeadMonth(feeHead, month)}
                          color="primary"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setFeeHeadDialog({ open: false, class: null })}
            variant="outlined"
            sx={{
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveFeeHeadSettings}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 'bold',
            }}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Classes;

