import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  School,
  Email,
  Lock,
  Business,
} from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: credentials, 2: institution selection
  const [userInfo, setUserInfo] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const fetchInstitutions = async (token, user) => {
    try {
      setLoadingInstitutions(true);
      const response = await axios.get(getApiUrl('institutions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedInstitutions = response.data.data || [];
      setInstitutions(fetchedInstitutions);
      
      // If no institutions exist, allow super admin to proceed without selecting
      if (fetchedInstitutions.length === 0 && user) {
        // Store authentication data without institution
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        // Redirect to dashboard - they can create institution from there
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('Failed to load institutions');
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(getApiUrl('auth/login'), formData);

      const user = response.data.data.user;
      const token = response.data.data.token;

      setUserInfo({ user, token });

      // Check if user is super admin
      if (user.role === 'super_admin') {
        // Move to institution selection step
        setStep(2);
        await fetchInstitutions(token, user);
        setLoading(false);
      } else {
        // For regular admin, auto-select their institution and proceed
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('selectedInstitution', JSON.stringify(user.institution));

        // Redirect to dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleInstitutionSelect = () => {
    if (!selectedInstitution) {
      setError('Please select an institution');
      return;
    }

    // Store authentication data with selected institution
    localStorage.setItem('token', userInfo.token);
    localStorage.setItem('user', JSON.stringify(userInfo.user));
    localStorage.setItem('selectedInstitution', selectedInstitution);

    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  const handleBackToCredentials = () => {
    setStep(1);
    setSelectedInstitution('');
    setUserInfo(null);
    setInstitutions([]);
    setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
          }}
        >
          {/* Logo and Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mb: 2,
              }}
            >
              {step === 1 ? <School sx={{ fontSize: 48, color: 'white' }} /> : <Business sx={{ fontSize: 48, color: 'white' }} />}
            </Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              SGC Education
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {step === 1 ? 'Super Admin Portal' : 'Select Institution'}
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Step 1: Login Form */}
          {step === 1 && (
            <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              margin="normal"
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
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          )}

          {/* Step 2: Institution Selection */}
          {step === 2 && (
            <Box>
              {loadingInstitutions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : institutions.length === 0 ? (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    No institutions found. You can create your first institution from the dashboard.
                  </Alert>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => {
                      // Store authentication data without institution
                      localStorage.setItem('token', userInfo.token);
                      localStorage.setItem('user', JSON.stringify(userInfo.user));
                      // Redirect to dashboard
                      window.location.href = '/dashboard';
                    }}
                    sx={{
                      mt: 3,
                      mb: 2,
                      py: 1.5,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                      },
                    }}
                  >
                    Continue to Dashboard
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBackToCredentials}
                    sx={{ mb: 2 }}
                  >
                    Back to Login
                  </Button>
                </>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Welcome, {userInfo?.user?.name}! Please select an institution to manage.
                  </Alert>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Select Institution</InputLabel>
                    <Select
                      value={selectedInstitution}
                      onChange={(e) => setSelectedInstitution(e.target.value)}
                      label="Select Institution"
                      startAdornment={
                        <InputAdornment position="start">
                          <Business color="action" />
                        </InputAdornment>
                      }
                    >
                      {institutions.map((institution) => (
                        <MenuItem key={institution._id} value={JSON.stringify(institution)}>
                          <Box>
                            <Typography variant="body1">{institution.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {institution.code} • {institution.type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleInstitutionSelect}
                    disabled={!selectedInstitution}
                    sx={{
                      mt: 3,
                      mb: 2,
                      py: 1.5,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                      },
                    }}
                  >
                    Continue to Dashboard
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBackToCredentials}
                    sx={{ mb: 2 }}
                  >
                    Back to Login
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              © 2024 SGC Education. All rights reserved.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
