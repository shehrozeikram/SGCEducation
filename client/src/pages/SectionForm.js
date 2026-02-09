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
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Save, ArrowBack, FolderSpecial, Info, CalendarToday, People, CheckCircle } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { capitalizeFirstOnly } from '../utils/textUtils';
import { getApiUrl } from '../config/api';

const sessionsDefault = ['2025-2026', '2024-2025', '2023-2024'];

const SectionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [classes, setClasses] = useState([]);
  const [sessions] = useState(sessionsDefault);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Extract institution ID if it's an object
  const getUserInstitutionId = () => {
    if (!user.institution) return '';
    return typeof user.institution === 'object' ? user.institution._id : user.institution;
  };

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    session: '',
    class: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    strength: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isActive: true,
    institution: getUserInstitutionId(),
    department: '',
  });

  useEffect(() => {
    fetchClasses();
    if (isEditMode) {
      fetchSection();
    }
  }, [id]);

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

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const institutionId = getInstitutionId();
      const params = {};
      if (institutionId) params.institution = institutionId;

      const response = await axios.get(getApiUrl('classes'), {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setClasses(response.data.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchSection = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl(`sections/${id}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const section = response.data.data;
      setFormData({
        name: section.name,
        code: section.code,
        session: section.session || '',
        institution: section.institution?._id || user.institution || '',
        department: section.department?._id || '',
        class: section.class?._id || '',
        academicYear: section.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        strength: section.capacity || '',
        startDate: section.startDate ? new Date(section.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: section.endDate ? new Date(section.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isActive: section.isActive !== undefined ? section.isActive : true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch section');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'class') {
      const cls = classes.find((c) => c._id === value);
      setFormData({
        ...formData,
        class: value,
        institution: cls?.institution?._id || formData.institution,
        department: cls?.department?._id || formData.department,
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        capacity: formData.strength || 0,
      };

      // Remove empty department field to prevent validation errors
      if (!payload.department) {
        delete payload.department;
      }

      if (isEditMode) {
        await axios.put(
          getApiUrl(`sections/${id}`),
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Section updated successfully!');
      } else {
        await axios.post(
          getApiUrl('sections'),
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Section created successfully!');
      }

      setTimeout(() => {
        navigate('/sections');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save section');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
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
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
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
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/sections')}
              sx={{ 
                mr: 2,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Back
            </Button>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderSpecial sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {isEditMode ? 'Edit Section' : 'Create New Section'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {isEditMode ? 'Update section information' : 'Add a new section to your system'}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Main Form */}
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

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {/* Basic Information Section */}
          <Card 
            elevation={0}
            sx={{ 
              mb: 3,
              border: '1px solid #e0e0e0',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Info sx={{ color: '#667eea' }} />
                <Typography variant="h6" fontWeight="bold" color="#667eea">
                  Basic Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Section Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter section name (e.g., A, B, C)"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                          <FolderSpecial sx={{ color: '#f093fb', fontSize: 20 }} />
                        </Box>
                      ),
                    }}
                    sx={{
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
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Section Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Enter section code (e.g., SEC-A)"
                    sx={{
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
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl 
                    fullWidth 
                    required
                    sx={{
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
                  >
                    <InputLabel>Session</InputLabel>
                    <Select
                      name="session"
                      value={formData.session}
                      onChange={handleChange}
                      label="Session"
                    >
                      <MenuItem value="">Select Session</MenuItem>
                      {sessions.map((s) => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl 
                    fullWidth 
                    required
                    sx={{
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
                  >
                    <InputLabel>Class</InputLabel>
                    <Select
                      name="class"
                      value={formData.class}
                      onChange={handleChange}
                      label="Class"
                    >
                      <MenuItem value="">Select School Class</MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls._id} value={cls._id}>
                          {capitalizeFirstOnly(cls.name || '')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Additional Details Section */}
          <Card 
            elevation={0}
            sx={{ 
              mb: 3,
              border: '1px solid #e0e0e0',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <CalendarToday sx={{ color: '#667eea' }} />
                <Typography variant="h6" fontWeight="bold" color="#667eea">
                  Additional Details
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Capacity (Strength)"
                    name="strength"
                    type="number"
                    value={formData.strength}
                    onChange={handleChange}
                    placeholder="Enter maximum capacity"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                          <People sx={{ color: '#4facfe', fontSize: 20 }} />
                        </Box>
                      ),
                    }}
                    sx={{
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
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Academic Year"
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    placeholder="2025-2026"
                    helperText="Format: YYYY-YYYY"
                    sx={{
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
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    sx={{
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
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="End Date"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    sx={{
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
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        sx={{
                          color: '#43e97b',
                          '&.Mui-checked': {
                            color: '#43e97b',
                          },
                        }}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircle sx={{ fontSize: 18, color: formData.isActive ? '#43e97b' : '#9e9e9e' }} />
                        <Typography variant="body1" fontWeight="medium">
                          Section is Active
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

            <Divider sx={{ my: 3 }} />
            <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => navigate('/sections')}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5568d3',
                    bgcolor: '#667eea15',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <Save />}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 4,
                  fontWeight: 'bold',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                  },
                }}
              >
                {loading ? 'Saving...' : isEditMode ? 'Update Section' : 'Create Section'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SectionForm;
