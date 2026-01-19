import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  Divider,
  Chip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { 
  Save, 
  ArrowBack, 
  Visibility, 
  VisibilityOff,
  Person,
  Lock,
  Business,
  School,
  Phone,
  Email,
  Badge,
  Security
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    institution: '',
    department: '',
    phone: '',
  });

  useEffect(() => {
    // Set default institution for non-super admins
    if (!isSuperAdmin && currentUser.institution) {
      setFormData(prev => ({
        ...prev,
        institution: currentUser.institution._id || currentUser.institution
      }));
    }

    fetchInstitutions();
    fetchDepartments();

    if (isEditMode) {
      fetchUser();
    }
  }, [id]);

  useEffect(() => {
    // Filter departments by selected institution
    if (formData.institution) {
      const filtered = allDepartments.filter(
        dept => dept.institution._id === formData.institution || dept.institution === formData.institution
      );
      setDepartments(filtered);
    } else {
      setDepartments(allDepartments);
    }
  }, [formData.institution, allDepartments]);

  const fetchInstitutions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('institutions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutions(response.data.data);
    } catch (err) {
      console.error('Failed to fetch institutions:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('departments'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllDepartments(response.data.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchUser = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl(`users/${id}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const userData = response.data.data;
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        password: '',
        confirmPassword: '',
        role: userData.role || 'student',
        institution: userData.institution?._id || userData.institution || '',
        department: userData.department?._id || userData.department || '',
        phone: userData.phone || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear department if institution changes
    if (name === 'institution') {
      setFormData(prev => ({
        ...prev,
        institution: value,
        department: ''
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.role) {
      setError('Please fill in all required fields');
      return false;
    }

    // Institution is required for all roles except super_admin
    if (formData.role !== 'super_admin' && !formData.institution) {
      setError('Institution is required for this role');
      return false;
    }

    if (!isEditMode) {
      if (!formData.password) {
        setError('Password is required');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    } else if (formData.password) {
      // If updating password in edit mode
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Prepare data - remove confirmPassword and empty password (in edit mode)
      const submitData = { ...formData };
      delete submitData.confirmPassword;
      if (isEditMode && !submitData.password) {
        delete submitData.password;
      }

      // Remove institution field if role is super_admin or if it's empty
      if (submitData.role === 'super_admin') {
        delete submitData.institution;
      } else if (!submitData.institution || submitData.institution === '') {
        delete submitData.institution;
      }

      // Remove department if it's empty
      if (!submitData.department || submitData.department === '') {
        delete submitData.department;
      }

      if (isEditMode) {
        await axios.put(
          getApiUrl(`users/${id}`),
          submitData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('User updated successfully!');
      } else {
        await axios.post(
          getApiUrl('users'),
          submitData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('User created successfully!');
      }

      setTimeout(() => {
        navigate('/users');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'admin': return 'primary';
      case 'teacher': return 'info';
      case 'student': return 'success';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'teacher': return 'Teacher';
      case 'student': return 'Student';
      default: return role;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/users')}
          sx={{ mb: 2, color: 'text.secondary' }}
        >
          Back to Users
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
            }}
          >
            <Person sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="800" gutterBottom>
              {isEditMode ? 'Edit User' : 'Create New User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode 
                ? 'Update user information and permissions' 
                : 'Add a new user to the system with appropriate role and access'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }} 
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {success}
        </Alert>
      )}

      {/* Form */}
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Basic Information Card */}
          <Grid item xs={12}>
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid #e0e0e0',
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                  p: 2.5,
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Person sx={{ color: '#667eea', fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight="700">
                    Basic Information
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Personal details and contact information
                  </Typography>
                </Box>
              </Box>
              <CardContent sx={{ p: 3 }}>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Full Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      type="email"
                      label="Email Address"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl 
                      fullWidth 
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    >
                      <InputLabel>User Role</InputLabel>
                      <Select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        label="User Role"
                        startAdornment={
                          <InputAdornment position="start" sx={{ ml: 1 }}>
                            <Badge color="action" />
                          </InputAdornment>
                        }
                      >
                        {isSuperAdmin && (
                          <MenuItem value="super_admin">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label="Super Admin" color="error" size="small" />
                            </Box>
                          </MenuItem>
                        )}
                        <MenuItem value="admin">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="Admin" color="primary" size="small" />
                          </Box>
                        </MenuItem>
                        <MenuItem value="teacher">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="Teacher" color="info" size="small" />
                          </Box>
                        </MenuItem>
                        <MenuItem value="student">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="Student" color="success" size="small" />
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                    {formData.role && (
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          label={getRoleLabel(formData.role)} 
                          color={getRoleColor(formData.role)} 
                          size="small"
                          icon={<Security />}
                        />
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Organization & Access Card */}
          <Grid item xs={12}>
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid #e0e0e0',
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                  p: 2.5,
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Business sx={{ color: '#667eea', fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight="700">
                    Organization & Access
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Assign institution and department access
                  </Typography>
                </Box>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl 
                      fullWidth 
                      required={formData.role !== 'super_admin'}
                      disabled={formData.role === 'super_admin'}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    >
                      <InputLabel>Institution</InputLabel>
                      <Select
                        name="institution"
                        value={formData.institution}
                        onChange={handleChange}
                        label="Institution"
                        disabled={!isSuperAdmin || formData.role === 'super_admin'}
                        startAdornment={
                          <InputAdornment position="start" sx={{ ml: 1 }}>
                            <School color="action" />
                          </InputAdornment>
                        }
                      >
                        {institutions.length === 0 ? (
                          <MenuItem disabled>No institutions available</MenuItem>
                        ) : (
                          institutions.map((inst) => (
                            <MenuItem key={inst._id} value={inst._id}>
                              <Box>
                                <Typography variant="body1">{inst.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {inst.code} • {inst.type}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                    {formData.role === 'super_admin' && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Super Admin has access to all institutions
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl 
                      fullWidth
                      disabled={!formData.institution}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    >
                      <InputLabel>Department (Optional)</InputLabel>
                      <Select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        label="Department (Optional)"
                        disabled={!formData.institution}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {departments.length === 0 && formData.institution ? (
                          <MenuItem disabled>No departments available</MenuItem>
                        ) : (
                          departments.map((dept) => (
                            <MenuItem key={dept._id} value={dept._id}>
                              {dept.name} ({dept.code})
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                    {!formData.institution && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Select an institution first
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Password Card */}
          <Grid item xs={12}>
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid #e0e0e0',
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                  p: 2.5,
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Lock sx={{ color: '#667eea', fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight="700">
                    {isEditMode ? 'Change Password (Optional)' : 'Set Password'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isEditMode 
                      ? 'Leave blank to keep current password' 
                      : 'Create a secure password for the user'}
                  </Typography>
                </Box>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required={!isEditMode}
                      type={showPassword ? 'text' : 'password'}
                      label="Password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      helperText={isEditMode ? "Leave blank to keep current password" : "Minimum 6 characters"}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required={!isEditMode || formData.password}
                      type={showConfirmPassword ? 'text' : 'password'}
                      label="Confirm Password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              size="small"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 2,
                pt: 2,
                borderTop: '1px solid #e0e0e0'
              }}
            >
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/users')}
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  borderColor: '#e0e0e0',
                  '&:hover': {
                    borderColor: '#667eea',
                    bgcolor: '#667eea08'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    boxShadow: '0 6px 20px 0 rgba(102, 126, 234, 0.5)',
                  },
                  '&:disabled': {
                    background: '#e0e0e0',
                  }
                }}
              >
                {loading ? 'Saving...' : isEditMode ? 'Update User' : 'Create User'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default UserForm;
