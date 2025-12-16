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
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const DepartmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [institutions, setInstitutions] = useState([]);

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
    description: '',
    head: {
      name: '',
      email: '',
      phone: ''
    },
    building: '',
    floor: '',
    roomNumber: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchInstitutions();
    if (isEditMode) {
      fetchDepartment();
    }
  }, [id]);

  const fetchInstitutions = async () => {
    if (!isSuperAdmin) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/institutions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutions(response.data.data);
    } catch (err) {
      console.error('Error fetching institutions:', err);
    }
  };

  const fetchDepartment = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/departments/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const dept = response.data.data;
      setFormData({
        name: dept.name,
        code: dept.code,
        institution: dept.institution._id,
        description: dept.description || '',
        head: {
          name: dept.head?.name || '',
          email: dept.head?.email || '',
          phone: dept.head?.phone || ''
        },
        building: dept.building || '',
        floor: dept.floor || '',
        roomNumber: dept.roomNumber || '',
        phone: dept.phone || '',
        email: dept.email || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch department');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('head.')) {
      const headField = name.split('.')[1];
      setFormData({
        ...formData,
        head: {
          ...formData.head,
          [headField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/v1/departments/${id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Department updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/departments',
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Department created successfully!');
      }

      setTimeout(() => {
        navigate('/departments');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department');
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

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/departments')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight="bold">
            {isEditMode ? 'Edit Department' : 'Add New Department'}
          </Typography>
        </Box>

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

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Basic Information
          </Typography>

          <Grid container spacing={3}>
            {isSuperAdmin && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Institution</InputLabel>
                  <Select
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    label="Institution"
                    disabled={isEditMode}
                  >
                    {institutions.map((inst) => (
                      <MenuItem key={inst._id} value={inst._id}>
                        {inst.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                required
                label="Department Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="Department Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Department Head (Optional)
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Head Name"
                name="head.name"
                value={formData.head.name}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="Head Email"
                name="head.email"
                value={formData.head.email}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Head Phone"
                name="head.phone"
                value={formData.head.phone}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Location & Contact
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Building"
                name="building"
                value={formData.building}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Floor"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Room Number"
                name="roomNumber"
                value={formData.roomNumber}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="Department Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          {/* Submit Button */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<Save />}
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Department' : 'Create Department'}
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/departments')}
              disabled={loading}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default DepartmentForm;
