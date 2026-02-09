import React, { useState, useEffect, useCallback } from 'react';
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
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Save, ArrowBack, Class as ClassIcon, Info, Add, Close, Payment } from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const ClassForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feeTypes, setFeeTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Dialog for adding new fee type
  const [feeTypeDialogOpen, setFeeTypeDialogOpen] = useState(false);
  const [newFeeType, setNewFeeType] = useState({ name: '', code: '', amount: 0 });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  // Extract institution ID if it's an object
  const getUserInstitutionId = () => {
    if (!user.institution) return '';
    return typeof user.institution === 'object' ? user.institution._id : user.institution;
  };

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    institution: getUserInstitutionId(),
    department: '',
    group: '',
    feeType: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  });

  const location = useLocation();

  const getSelectedInstitutionId = () => {
    // Super admins use the navbar selection
    if (user.role === 'super_admin') {
      const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
      if (selectedInstitutionStr) {
        try {
          const parsed = JSON.parse(selectedInstitutionStr);
          return parsed?._id || parsed;
        } catch (e) {
          return selectedInstitutionStr;
        }
      }
    }
    
    // For other roles or as fallback, use user.institution
    if (user.institution) {
      return typeof user.institution === 'object' ? user.institution._id : user.institution;
    }
    
    return '';
  };

  // Initialise institution/department from user or URL (e.g. ?department=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const depFromQuery = params.get('department');
    setFormData((prev) => ({
      ...prev,
      institution: prev.institution || user.institution || '',
      department: depFromQuery || prev.department
    }));
  }, [location.search]);

  useEffect(() => {
    if (!isEditMode) {
      // For new class, ensure we have a department if provided via query
      const params = new URLSearchParams(location.search);
      const depFromQuery = params.get('department');
      if (depFromQuery) {
        setFormData((prev) => ({ ...prev, department: depFromQuery }));
      }
    } else {
      fetchClass();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location.search]);

  const getFeeTypeLabel = (feeType) => {
    if (!feeType) return '';
    const freq = feeType.frequencyType || feeType.type;
    let freqLabel = '';
    if (freq) {
      freqLabel = freq;
    } else {
      const text = `${feeType.name || ''} ${feeType.code || ''}`.toLowerCase();
      if (text.includes('annual')) freqLabel = 'Annual';
      else if (text.includes('month')) freqLabel = 'Monthly';
    }
    return freqLabel ? `${feeType.name} (${freqLabel})` : feeType.name;
  };

  const fetchFeeTypes = useCallback(async (institutionIdParam) => {
    try {
      const token = localStorage.getItem('token');
      const institutionId = institutionIdParam || formData.institution || getSelectedInstitutionId();
      const url = institutionId
        ? getApiUrl(`fee-types?institution=${institutionId}`)
        : getApiUrl('fee-types');
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeTypes(response.data.data || []);
    } catch (err) {
      console.error('Error fetching fee types:', err);
      setFeeTypes([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.institution]);

  const fetchGroups = useCallback(async (institutionIdParam) => {
    try {
      const token = localStorage.getItem('token');
      const institutionId = institutionIdParam || formData.institution || getSelectedInstitutionId();
      const url = institutionId
        ? getApiUrl(`groups?institution=${institutionId}`)
        : getApiUrl('groups');
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data.data || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.institution]);

  // Refetch groups whenever institution changes (for super-admin)
  useEffect(() => {
    fetchFeeTypes(formData.institution);
    fetchGroups(formData.institution);
  }, [fetchFeeTypes, fetchGroups, formData.institution]);

  const fetchClass = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl(`classes/${id}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const cls = response.data.data;
      setFormData({
        name: cls.name,
        code: cls.code,
        institution: cls.institution?._id || user.institution || '',
        department: cls.department?._id || '',
        group: cls.group?._id || '',
        feeType: cls.feeType?._id || '',
        academicYear: cls.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch class');
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
  };

  const handleAddFeeType = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
      
      // Get institution ID
      let institutionId = formData.institution || currentUser.institution || selectedInstitutionStr;
      
      // Handle selectedInstitution from localStorage
      if (selectedInstitutionStr && typeof selectedInstitutionStr === 'string') {
        try {
          const parsed = JSON.parse(selectedInstitutionStr);
          if (parsed && parsed._id) {
            institutionId = parsed._id;
          }
        } catch (e) {
          // If parsing fails, assume it's already an ID string
        }
      }
      
      // If institution is an object, extract the _id
      if (institutionId && typeof institutionId === 'object') {
        institutionId = institutionId._id || institutionId;
      }
      
      const response = await axios.post(
        getApiUrl('fee-types'),
        {
          ...newFeeType,
          institution: institutionId || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh fee types list
      await fetchFeeTypes(formData.institution);
      
      // Set the newly created fee type as selected
      setFormData({ ...formData, feeType: response.data.data._id });
      setFeeTypeDialogOpen(false);
      setNewFeeType({ name: '', code: '', amount: 0 });
      setSuccess('Fee type added successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add fee type');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
      const params = new URLSearchParams(location.search);
      const depFromQuery = params.get('department');

      // Get institution from multiple sources and extract _id if it's an object
      let institutionId = formData.institution || currentUser.institution || selectedInstitutionStr;
      
      // Handle selectedInstitution from localStorage (might be stringified JSON)
      if (selectedInstitutionStr && typeof selectedInstitutionStr === 'string') {
        try {
          const parsed = JSON.parse(selectedInstitutionStr);
          if (parsed && parsed._id) {
            institutionId = parsed._id;
          } else if (parsed && typeof parsed === 'string') {
            institutionId = parsed;
          }
        } catch (e) {
          // If it's not JSON, it might be a plain string ID
          institutionId = selectedInstitutionStr;
        }
      }
      
      // If institution is an object, extract the _id
      if (institutionId && typeof institutionId === 'object') {
        institutionId = institutionId._id || institutionId;
      }
      
      // Ensure we have a string ID, not an object
      if (institutionId && typeof institutionId !== 'string') {
        institutionId = String(institutionId);
      }

      if (!institutionId) {
        setError('Institution not found. Please select an institution or contact administrator.');
        setLoading(false);
        return;
      }

      const payload = {
        name: formData.name,
        code: formData.code,
        group: formData.group,
        feeType: formData.feeType || undefined,
        academicYear: formData.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        institution: institutionId,
        // department is optional; include if present (from form or query)
        ...(formData.department || depFromQuery
          ? { department: formData.department || depFromQuery }
          : {})
      };

      if (isEditMode) {
        await axios.put(
          getApiUrl(`classes/${id}`),
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Class updated successfully!');
      } else {
        await axios.post(
          getApiUrl('classes'),
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Class created successfully!');
      }

      setTimeout(() => {
        navigate('/classes');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save class');
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
              onClick={() => navigate('/classes')}
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
              <ClassIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {isEditMode ? 'Edit Class' : 'Create New Class'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {isEditMode ? 'Update class information' : 'Add a new class to your system'}
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
                    label="Class Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter class name (e.g., 1st Class, 2nd Class)"
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                          <ClassIcon sx={{ color: '#667eea', fontSize: 20 }} />
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
                    label="Class Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Enter class code (e.g., CLS001)"
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
                    <InputLabel>Group</InputLabel>
                    <Select
                      name="group"
                      value={formData.group}
                      onChange={handleChange}
                      label="Group"
                    >
                      <MenuItem value="">Select Group</MenuItem>
                      {groups.map((group) => (
                        <MenuItem key={group._id} value={group._id}>
                          {group.name} ({group.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
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
                      <InputLabel>Fee Type</InputLabel>
                      <Select
                        name="feeType"
                        value={formData.feeType}
                        onChange={handleChange}
                        label="Fee Type"
                      >
                        <MenuItem value="">Select Fee Type</MenuItem>
                        {feeTypes.map((feeType) => (
                          <MenuItem key={feeType._id} value={feeType._id}>
                            {getFeeTypeLabel(feeType)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton
                      color="primary"
                      onClick={() => setFeeTypeDialogOpen(true)}
                      sx={{ 
                        mt: 1,
                        bgcolor: '#667eea15',
                        '&:hover': {
                          bgcolor: '#667eea25',
                        },
                      }}
                      title="Add New Fee Type"
                    >
                      <Add />
                    </IconButton>
                  </Box>
                </Grid>

              </Grid>
            </CardContent>
          </Card>

            <Divider sx={{ my: 3 }} />
            <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => navigate('/classes')}
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
                {loading ? 'Saving...' : isEditMode ? 'Update Class' : 'Create Class'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Add Fee Type Dialog */}
      <Dialog 
        open={feeTypeDialogOpen} 
        onClose={() => setFeeTypeDialogOpen(false)} 
        maxWidth="sm" 
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
            fontWeight: 'bold',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <Payment />
              <Typography variant="h6">Add New Fee Type</Typography>
            </Box>
            <IconButton onClick={() => setFeeTypeDialogOpen(false)} size="small" sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Fee Type Name"
                value={newFeeType.name}
                onChange={(e) => setNewFeeType({ ...newFeeType, name: e.target.value })}
                placeholder="e.g., Tuition Fee, Admission Fee"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Fee Type Code"
                value={newFeeType.code}
                onChange={(e) => setNewFeeType({ ...newFeeType, code: e.target.value.toUpperCase() })}
                placeholder="e.g., TUF, ADF"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={newFeeType.amount}
                onChange={(e) => setNewFeeType({ ...newFeeType, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setFeeTypeDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddFeeType}
            variant="contained"
            disabled={!newFeeType.name || !newFeeType.code}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 'bold',
            }}
          >
            Add Fee Type
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassForm;

