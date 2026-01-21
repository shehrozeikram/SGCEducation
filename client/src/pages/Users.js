import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Alert,
  TablePagination
} from '@mui/material';
import {
  Edit,
  PowerSettingsNew,
  PersonAdd
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import PageHeader from '../components/layout/PageHeader';
import { capitalizeFirstOnly } from '../utils/textUtils';
import { useTablePagination } from '../hooks/useTablePagination';

const Users = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const pagination = useTablePagination(12);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    // Auto-set institution filter from selected institution (but not when filtering by super_admin)
    const institutionData = localStorage.getItem('selectedInstitution');
    if (institutionData && !institutionFilter && roleFilter !== 'super_admin') {
      try {
        const institution = JSON.parse(institutionData);
        setInstitutionFilter(institution._id);
      } catch (e) {
        console.error('Failed to parse institution data', e);
      }
    }

    fetchUsers();
    if (currentUser.role === 'super_admin') {
      fetchInstitutions();
    }
    fetchDepartments();
  }, [search, roleFilter, institutionFilter, departmentFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (institutionFilter) params.append('institution', institutionFilter);
      if (departmentFilter) params.append('department', departmentFilter);
      if (statusFilter) params.append('isActive', statusFilter);

      const response = await axios.get(
        `${getApiUrl('users')}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setUsers(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

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
      setDepartments(response.data.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`users/${userId}/toggle-status`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle user status');
    }
  };

  const handleEdit = (userId) => {
    navigate(`/users/edit/${userId}`);
  };


  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'primary';
      case 'teacher':
        return 'info';
      case 'student':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'teacher':
        return 'Teacher';
      case 'student':
        return 'Student';
      default:
        return role;
    }
  };

  return (
    <Box sx={{ mt: '64px' }}>
      {/* Main Content */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title="Users"
          subtitle="Manage system users and their permissions"
          breadcrumbs={[
            { label: 'Users', path: '/users' }
          ]}
          actions={
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => navigate('/users/new')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Add User
            </Button>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Role"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  // Clear institution filter when selecting super_admin (they don't have institutions)
                  if (e.target.value === 'super_admin') {
                    setInstitutionFilter('');
                  }
                }}
                size="small"
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="super_admin">Super Admin</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </TextField>
            </Grid>
            {currentUser.role === 'super_admin' && (
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  select
                  label="Institution"
                  value={institutionFilter}
                  onChange={(e) => setInstitutionFilter(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Institutions</MenuItem>
                  {institutions.map((inst) => (
                    <MenuItem key={inst._id} value={inst._id}>
                      {inst.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name} ({dept.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Users Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Institution</strong></TableCell>
                  <TableCell><strong>Department</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.getPaginatedData(users).map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>{capitalizeFirstOnly(user.name || 'N/A')}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {capitalizeFirstOnly(user.institution?.name || '-')}
                      </TableCell>
                      <TableCell>
                        {user.department ? `${capitalizeFirstOnly(user.department.name || '')} (${user.department.code})` : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          color={user.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(user._id)}
                          title="Edit User"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          color={user.isActive ? 'error' : 'success'}
                          onClick={() => handleToggleStatus(user._id)}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <PowerSettingsNew />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {!loading && users.length > 0 && (
              <TablePagination
                component="div"
                count={users.length}
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
    </Box>
  );
};

export default Users;
