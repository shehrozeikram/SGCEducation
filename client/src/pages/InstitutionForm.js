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
  Card,
  CardContent,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { 
  Save, 
  ArrowBack, 
  Business, 
  LocationOn, 
  Person,
  Email,
  Phone,
  Language,
  CalendarToday,
  School,
  Add,
  Close,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const InstitutionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    code: '',
    type: 'mixed',
    description: ''
  });
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState('');

  const [formData, setFormData] = useState({
    organization: '',
    name: '',
    type: 'school',
    code: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Pakistan',
      zipCode: ''
    },
    principal: {
      name: '',
      email: '',
      phone: ''
    },
    establishedYear: new Date().getFullYear(),
    website: ''
  });

  useEffect(() => {
    fetchOrganizations();
    if (isEditMode) {
      fetchInstitution();
    }
  }, [id]);

  const fetchOrganizations = async () => {
    try {
      setOrgsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/v1/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Organizations API response:', response.data);
      
      // Handle different response structures
      const organizationsData = response.data?.data || response.data || [];
      setOrganizations(Array.isArray(organizationsData) ? organizationsData : []);
      
      if (organizationsData.length === 0) {
        console.warn('No organizations found in response');
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch organizations';
      setError(errorMessage);
    } finally {
      setOrgsLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    setOrgLoading(true);
    setOrgError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/v1/organizations',
        orgFormData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh organizations list
      await fetchOrganizations();

      // Auto-select the newly created organization
      setFormData({
        ...formData,
        organization: response.data.data._id
      });

      // Close dialog and reset form
      setOrgDialogOpen(false);
      setOrgFormData({
        name: '',
        code: '',
        type: 'mixed',
        description: ''
      });
      setSuccess('Organization created successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create organization';
      setOrgError(errorMessage);
      console.error('Error creating organization:', err.response?.data || err);
    } finally {
      setOrgLoading(false);
    }
  };

  const fetchInstitution = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/institutions/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = response.data.data;
      // Handle organization field (could be object or ID)
      setFormData({
        ...data,
        organization: data.organization?._id || data.organization || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch institution');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else if (name.startsWith('principal.')) {
      const principalField = name.split('.')[1];
      setFormData({
        ...formData,
        principal: {
          ...formData.principal,
          [principalField]: value
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
          `http://localhost:5000/api/v1/institutions/${id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Institution updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/institutions',
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Institution created successfully!');
      }

      setTimeout(() => {
        navigate('/institutions');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save institution');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box>
        <TopBar title={isEditMode ? 'Edit Institution' : 'Create Institution'} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <TopBar title={isEditMode ? 'Edit Institution' : 'Create Institution'} />
      
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/institutions')}
            sx={{ mb: 2 }}
          >
            Back to Institutions
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Business sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
                {isEditMode ? 'Edit Institution' : 'Create New Institution'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditMode ? 'Update institution details' : 'Fill in the information below to create a new institution'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {/* Basic Information Card */}
          <Card elevation={0} sx={{ mb: 3, borderRadius: 4, border: '1px solid #edf2f7' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#667eea15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Business sx={{ color: '#667eea', fontSize: 24 }} />
                </Box>
                <Typography variant="h6" fontWeight="800" sx={{ color: '#667eea' }}>
                  Basic Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <FormControl fullWidth required>
                      <InputLabel>Organization</InputLabel>
                      <Select
                        name="organization"
                        value={formData.organization}
                        onChange={handleChange}
                        label="Organization"
                        disabled={orgsLoading || organizations.filter(org => org.isActive).length === 0}
                        endAdornment={orgsLoading ? <CircularProgress size={20} sx={{ mr: 2 }} /> : null}
                      >
                        {organizations
                          .filter(org => org.isActive)
                          .map((org) => (
                            <MenuItem key={org._id} value={org._id}>
                              {org.name} ({org.code})
                            </MenuItem>
                          ))}
                      </Select>
                      {orgsLoading && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
                          Loading organizations...
                        </Typography>
                      )}
                      {!orgsLoading && organizations.filter(org => org.isActive).length === 0 && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          No active organizations available. Please create an organization first.
                        </Typography>
                      )}
                    </FormControl>
                    {isSuperAdmin && (
                      <IconButton
                        color="primary"
                        onClick={() => setOrgDialogOpen(true)}
                        sx={{
                          mt: 1,
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                          minWidth: 48,
                          height: 48,
                        }}
                        title="Add New Organization"
                      >
                        <Add />
                      </IconButton>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Institution Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <School sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      label="Type"
                    >
                      <MenuItem value="school">School</MenuItem>
                      <MenuItem value="college">College</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Institution Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                    helperText="Unique identifier for the institution"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Established Year"
                    name="establishedYear"
                    value={formData.establishedYear}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="email"
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://www.example.com"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Language sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Address Card */}
          <Card elevation={0} sx={{ mb: 3, borderRadius: 4, border: '1px solid #edf2f7' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#10b98115',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LocationOn sx={{ color: '#10b981', fontSize: 24 }} />
                </Box>
                <Typography variant="h6" fontWeight="800" sx={{ color: '#10b981' }}>
                  Address Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    placeholder="Street, Building, Area"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="City"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="State"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Country"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Zip Code"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Principal Details Card */}
          <Card elevation={0} sx={{ mb: 3, borderRadius: 4, border: '1px solid #edf2f7' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#f59e0b15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Person sx={{ color: '#f59e0b', fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="800" sx={{ color: '#f59e0b' }}>
                    Principal Details
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Optional information
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Principal Name"
                    name="principal.name"
                    value={formData.principal.name}
                    onChange={handleChange}
                    placeholder="Full name of the principal"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Principal Email"
                    name="principal.email"
                    value={formData.principal.email}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Principal Phone"
                    name="principal.phone"
                    value={formData.principal.phone}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              border: '1px solid #edf2f7',
              bgcolor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              flexWrap: 'wrap'
            }}
          >
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/institutions')}
              disabled={loading}
              sx={{ minWidth: 120 }}
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
                minWidth: 200,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)',
                },
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              }}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Institution' : 'Create Institution'}
            </Button>
          </Paper>
        </Box>
      </Container>

      {/* Create Organization Dialog */}
      <Dialog
        open={orgDialogOpen}
        onClose={() => {
          setOrgDialogOpen(false);
          setOrgError('');
          setOrgFormData({
            name: '',
            code: '',
            type: 'mixed',
            description: ''
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business sx={{ color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Create New Organization
              </Typography>
            </Box>
            <IconButton
              onClick={() => {
                setOrgDialogOpen(false);
                setOrgError('');
                setOrgFormData({
                  name: '',
                  code: '',
                  type: 'mixed',
                  description: ''
                });
              }}
              size="small"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {orgError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setOrgError('')}>
              {orgError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Organization Name"
                value={orgFormData.name}
                onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value.toUpperCase() })}
                inputProps={{ style: { textTransform: 'uppercase' } }}
                placeholder="e.g., TIGES"
                helperText="Name will be saved in uppercase"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Organization Code"
                value={orgFormData.code}
                onChange={(e) => setOrgFormData({ ...orgFormData, code: e.target.value.toUpperCase() })}
                inputProps={{ style: { textTransform: 'uppercase' } }}
                placeholder="e.g., TIGES"
                helperText="Unique identifier for the organization"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={orgFormData.type}
                  onChange={(e) => setOrgFormData({ ...orgFormData, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="school">School</MenuItem>
                  <MenuItem value="college">College</MenuItem>
                  <MenuItem value="mixed">Mixed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={orgFormData.description}
                onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
                multiline
                rows={3}
                placeholder="Optional description"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setOrgDialogOpen(false);
              setOrgError('');
              setOrgFormData({
                name: '',
                code: '',
                type: 'mixed',
                description: ''
              });
            }}
            disabled={orgLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrganization}
            variant="contained"
            disabled={orgLoading || !orgFormData.name || !orgFormData.code}
            startIcon={orgLoading ? <CircularProgress size={20} /> : <Add />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)',
              },
            }}
          >
            {orgLoading ? 'Creating...' : 'Create Organization'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstitutionForm;
