import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Grid,
} from '@mui/material';
import { Save, ArrowBack, Group as GroupIcon, Description, Info } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const GroupForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);

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
    type: 'Study',
    institution: getUserInstitutionId(),
    department: '',
    class: '',
    section: '',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    description: '',
    capacity: 10,
    leader: {
      userId: '',
      name: '',
      email: ''
    },
    supervisor: {
      userId: '',
      name: '',
      email: ''
    },
    members: []
  });

  useEffect(() => {
    // try to set institution from selectedInstitution if missing
    if (!formData.institution) {
      const stored = localStorage.getItem('selectedInstitution');
      if (stored) {
        try {
          const inst = JSON.parse(stored);
          setFormData((prev) => ({ ...prev, institution: inst._id || inst }));
        } catch (e) {
          console.error('Failed to parse institution', e);
        }
      }
    }
    fetchDepartments();
    if (isEditMode) {
      fetchGroup();
    }
  }, [id, formData.institution]);

  const fetchDepartments = async () => {
    if (!formData.institution) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`departments?institution=${formData.institution}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const depts = response.data.data || [];
      setDepartments(depts);
      if (!formData.department && depts.length > 0) {
        setFormData((prev) => ({ ...prev, department: depts[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
    }
  };

  const fetchGroup = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl(`groups/${id}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const group = response.data.data;
      setFormData({
        name: group.name,
        code: group.code,
        type: group.type,
        institution: group.institution._id,
        department: group.department._id,
        class: group.class?._id || '',
        section: group.section?._id || '',
        academicYear: group.academicYear,
        description: group.description || '',
        capacity: group.capacity || 10,
        leader: {
          userId: group.leader?.userId?._id || '',
          name: group.leader?.name || '',
          email: group.leader?.email || ''
        },
        supervisor: {
          userId: group.supervisor?.userId?._id || '',
          name: group.supervisor?.name || '',
          email: group.supervisor?.email || ''
        },
        members: group.members || []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch group');
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

  const generateCode = (name) => {
    if (!name) return '';
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 12);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      // Build minimal payload and strip empty optional refs to avoid ObjectId cast errors
      const payload = {
        name: formData.name,
        code: formData.code || generateCode(formData.name),
        institution: formData.institution,
        department: formData.department,
        academicYear: formData.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        type: formData.type || 'Study',
        capacity: formData.capacity || 10,
      };

      if (formData.class) payload.class = formData.class;
      if (formData.section) payload.section = formData.section;
      if (formData.description) payload.description = formData.description;

      // Leader (optional)
      const leader = formData.leader || {};
      if (leader.userId || leader.name || leader.email) {
        const cleanLeader = { ...leader };
        if (!cleanLeader.userId) delete cleanLeader.userId;
        payload.leader = cleanLeader;
      }

      // Supervisor (optional)
      const supervisor = formData.supervisor || {};
      if (supervisor.userId || supervisor.name || supervisor.email) {
        const cleanSupervisor = { ...supervisor };
        if (!cleanSupervisor.userId) delete cleanSupervisor.userId;
        payload.supervisor = cleanSupervisor;
      }

      // Members (optional) - include only non-empty entries
      const cleanMembers = (formData.members || []).filter(
        (m) => m.userId || m.name || m.email
      ).map((m) => {
        const copy = { ...m };
        if (!copy.userId) delete copy.userId;
        return copy;
      });
      if (cleanMembers.length) {
        payload.members = cleanMembers;
      }

      if (!payload.institution) {
        setError('Institution not set. Please contact administrator.');
        setLoading(false);
        return;
      }

      if (!payload.department && departments.length > 0) {
        payload.department = departments[0]._id;
      }

      if (isEditMode) {
        await axios.put(
          getApiUrl(`groups/${id}`),
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Group updated successfully!');
      } else {
        await axios.post(
          getApiUrl('groups'),
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Group created successfully!');
      }

      setTimeout(() => {
        navigate('/groups');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save group');
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
              onClick={() => navigate('/groups')}
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
              <GroupIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {isEditMode ? 'Edit Group' : 'Create New Group'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {isEditMode ? 'Update group information' : 'Add a new group to your system'}
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Group Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter group name (e.g., Science Group, Arts Group)"
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                            <GroupIcon sx={{ color: '#667eea', fontSize: 20 }} />
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
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Group Code"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      placeholder="Auto-generated if left empty"
                      helperText="Leave empty to auto-generate from name"
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
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Academic Year"
                      name="academicYear"
                      value={formData.academicYear}
                      onChange={handleChange}
                      placeholder="2024-2025"
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
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Enter a brief description of this group..."
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ mr: 1, display: 'flex', alignItems: 'flex-start', pt: 1 }}>
                            <Description sx={{ color: '#667eea', fontSize: 20 }} />
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
                </Grid>
              </CardContent>
            </Card>

            <Divider sx={{ my: 3 }} />
            <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => navigate('/groups')}
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
                {loading ? 'Saving...' : isEditMode ? 'Update Group' : 'Create Group'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default GroupForm;

