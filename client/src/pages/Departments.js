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
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  ToggleOn,
  ToggleOff,
  AccountBalance,
  Class as ClassIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const Departments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');

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
        // For admin users, use their own institution from user data
        setSelectedInstitution(user.institution);
      }
    }
  }, []); // Run only once on mount

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
  }, [selectedInstitution]);

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
        try {
          const instResponse = await axios.get('http://localhost:5000/api/v1/institutions', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setInstitutions(instResponse.data.data || []);
        } catch (instErr) {
          console.error('Failed to fetch institutions:', instErr);
          setInstitutions([]);
        }
      }

      // Fetch departments
      let url = 'http://localhost:5000/api/v1/departments';
      if (selectedInstitution) {
        url += `?institution=${selectedInstitution}`;
      }

      const deptResponse = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDepartments(deptResponse.data.data || []);
    } catch (err) {
      console.error('Error fetching departments data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch departments';
      setError(errorMessage);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (departmentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/v1/departments/${departmentId}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh list
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && departments.length === 0 && !error) {
    return (
      <Box>
        <TopBar title="Departments Management" />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title="Departments Management" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Departments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage academic departments
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/departments/new')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Department
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Box display="flex" gap={2} mb={3}>
          <TextField
            fullWidth
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {isSuperAdmin && (
            <FormControl sx={{ minWidth: 250 }}>
              <InputLabel>Institution</InputLabel>
              <Select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                label="Institution"
              >
                <MenuItem value="">All Institutions</MenuItem>
                {institutions.map((inst) => (
                  <MenuItem key={inst._id} value={inst._id}>
                    {inst.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                {isSuperAdmin && <TableCell><strong>Institution</strong></TableCell>}
                <TableCell><strong>Head</strong></TableCell>
                <TableCell><strong>Location</strong></TableCell>
                <TableCell><strong>Teachers</strong></TableCell>
                <TableCell><strong>Students</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
                <TableCell align="center"><strong>Quick Links</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 11 : 10} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No departments found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((department) => (
                  <TableRow key={department._id} hover>
                    <TableCell>
                      <Chip label={department.code} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <AccountBalance fontSize="small" color="action" />
                        <Typography variant="body2">{department.name}</Typography>
                      </Box>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Typography variant="body2">
                          {department.institution?.name}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2">
                        {department.head?.name || 'Not assigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {department.building || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{department.stats?.totalTeachers || 0}</TableCell>
                    <TableCell>{department.stats?.totalStudents || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={department.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={department.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => navigate(`/classes?department=${department._id}`)}
                          title="View Classes"
                        >
                          <ClassIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/departments/edit/${department._id}`)}
                          title="Edit Department"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color={department.isActive ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(department._id)}
                          title={department.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {department.isActive ? (
                            <ToggleOff fontSize="small" />
                          ) : (
                            <ToggleOn fontSize="small" />
                          )}
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/classes?department=${department._id}`)}
                          sx={{ textTransform: 'none', fontSize: '0.7rem', minWidth: '70px' }}
                        >
                          Classes
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/sections?department=${department._id}`)}
                          sx={{ textTransform: 'none', fontSize: '0.7rem', minWidth: '70px' }}
                        >
                          Sections
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/groups?department=${department._id}`)}
                          sx={{ textTransform: 'none', fontSize: '0.7rem', minWidth: '70px' }}
                        >
                          Groups
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      </Container>
    </Box>
  );
};

export default Departments;
