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
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Add,
  Edit,
  Business,
  Search,
  ToggleOn,
  ToggleOff,
  Delete,
  School,
  Visibility,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { useTablePagination } from '../hooks/useTablePagination';

const Organizations = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Institutions modal
  const [institutionsModalOpen, setInstitutionsModalOpen] = useState(false);
  const [selectedOrgInstitutions, setSelectedOrgInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState('');

  const [stats, setStats] = useState({});

  const pagination = useTablePagination(12);

  // Check if user is super admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'super_admin') {
      // Redirect non-super-admins to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('organizations'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const orgs = response.data.data;
      setOrganizations(orgs);
      
      // Fetch stats for all orgs in background
      fetchStatsForOrgs(orgs, token);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsForOrgs = async (orgs, token) => {
    const statsDict = {};
    try {
      await Promise.all(orgs.map(async (org) => {
        try {
          const res = await axios.get(getApiUrl(`organizations/${org._id}/stats`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          statsDict[org._id] = res.data.data.totalInstitutions || 0;
        } catch (e) {
          statsDict[org._id] = 0;
        }
      }));
      setStats(statsDict);
    } catch (e) {
      console.error('Failed to fetch org stats', e);
    }
  };

  const handleToggleStatus = async (orgId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`organizations/${orgId}/toggle-status`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh list
      fetchOrganizations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDeleteClick = (org) => {
    setOrganizationToDelete(org);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!organizationToDelete) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        getApiUrl(`organizations/${organizationToDelete._id}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setDeleteDialogOpen(false);
      setOrganizationToDelete(null);
      fetchOrganizations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete organization');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setOrganizationToDelete(null);
  };

  const handleViewInstitutions = async (org) => {
    setSelectedOrgName(org.name);
    setInstitutionsModalOpen(true);
    setLoadingInstitutions(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`organizations/${org._id}/institutions`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedOrgInstitutions(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch institutions', err);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const filteredOrganizations = organizations.filter((org) =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business color="primary" fontSize="large" />
                Organizations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage overarching organizations and view their institutions
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/organizations/new')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
              }}
            >
              Add Organization
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Search */}
          <TextField
            fullWidth
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                  <TableCell><strong>Code</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell align="center"><strong>Institutes</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrganizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box py={4}>
                        <Typography variant="body2" color="text.secondary">
                          No organizations found
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.getPaginatedData(filteredOrganizations).map((org) => (
                    <TableRow key={org._id} hover>
                      <TableCell>
                        <Chip label={org.code} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">{org.name}</Typography>
                        {org.description && (
                          <Typography variant="caption" color="text.secondary">
                            {org.description.length > 50 ? `${org.description.substring(0, 50)}...` : org.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={org.type ? org.type.replace('_', ' ').toUpperCase() : 'MIXED'}
                          size="small"
                          color="info"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          icon={<School style={{ fontSize: 16 }}/>} 
                          label={stats[org._id] !== undefined ? stats[org._id] : <CircularProgress size={12} />} 
                          size="small" 
                          color="secondary" 
                          variant="filled" 
                          onClick={() => handleViewInstitutions(org)}
                          sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={org.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={org.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => navigate(`/institutions?organizationId=${org._id}&orgName=${encodeURIComponent(org.name)}`)}
                          startIcon={<School fontSize="small" />}
                          sx={{ 
                            mr: 1.5, 
                            textTransform: 'none', 
                            borderRadius: '20px', 
                            fontSize: '0.75rem', 
                            fontWeight: '600',
                            borderWidth: '1.5px',
                            '&:hover': {
                              borderWidth: '1.5px'
                            }
                          }}
                        >
                          Campus Management
                        </Button>
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleViewInstitutions(org)}
                          title="Quick View"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/organizations/edit/${org._id}`)}
                          title="Edit"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color={org.isActive ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(org._id)}
                          title={org.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {org.isActive ? (
                            <ToggleOff fontSize="small" />
                          ) : (
                            <ToggleOn fontSize="small" />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(org)}
                          title="Delete"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredOrganizations.length > 0 && (
              <TablePagination
                component="div"
                count={filteredOrganizations.length}
                page={pagination.page}
                onPageChange={pagination.handleChangePage}
                rowsPerPage={pagination.rowsPerPage}
                onRowsPerPageChange={pagination.handleChangeRowsPerPage}
                rowsPerPageOptions={pagination.rowsPerPageOptions}
              />
            )}
          </TableContainer>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
            Delete Organization?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete <strong>{organizationToDelete?.name}</strong>?
            </DialogContentText>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Warning:</strong> You cannot delete an organization if it has active institutions under it. You must reassign or delete the institutions first.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleDeleteCancel} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Institutions Dialog */}
        <Dialog
          open={institutionsModalOpen}
          onClose={() => setInstitutionsModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
            Institutions under {selectedOrgName}
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {loadingInstitutions ? (
              <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
            ) : selectedOrgInstitutions.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>No institutions found for this organization.</Typography>
            ) : (
              <List>
                {selectedOrgInstitutions.map((inst, index) => (
                  <React.Fragment key={inst._id}>
                    <ListItem>
                      <ListItemIcon>
                        <School color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={<Typography fontWeight="bold">{inst.name} <Chip size="small" label={inst.code} sx={{ ml: 1, height: 20 }} /></Typography>} 
                        secondary={`${inst.type.toUpperCase()} • ${inst.isActive ? 'Active' : 'Inactive'}`} 
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setInstitutionsModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Organizations;
