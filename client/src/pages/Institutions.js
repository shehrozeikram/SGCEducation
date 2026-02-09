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
} from '@mui/material';
import {
  Add,
  Edit,
  School,
  Business,
  Search,
  ToggleOn,
  ToggleOff,
  Delete,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { useTablePagination } from '../hooks/useTablePagination';

const Institutions = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
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
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('institutions'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      setInstitutions(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch institutions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`institutions/${institutionId}/toggle-status`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Refresh list
      fetchInstitutions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDeleteClick = (institution) => {
    setInstitutionToDelete(institution);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!institutionToDelete) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      await axios.delete(
        getApiUrl(`institutions/${institutionToDelete._id}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setDeleteDialogOpen(false);
      setInstitutionToDelete(null);
      fetchInstitutions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete institution');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setInstitutionToDelete(null);
  };

  const filteredInstitutions = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.code.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Paper sx={{ p: 4 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Institutions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage all schools and colleges
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/institutions/new')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Institution
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
                <TableCell><strong>Location</strong></TableCell>
                <TableCell><strong>Students</strong></TableCell>
                <TableCell><strong>Teachers</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInstitutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No institutions found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                pagination.getPaginatedData(filteredInstitutions).map((institution) => (
                  <TableRow key={institution._id} hover>
                    <TableCell>
                      <Chip label={institution.code} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {institution.type === 'school' ? (
                          <School fontSize="small" color="action" />
                        ) : (
                          <Business fontSize="small" color="action" />
                        )}
                        <Typography variant="body2">{institution.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={institution.type.toUpperCase()}
                        size="small"
                        color={institution.type === 'school' ? 'success' : 'info'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {institution.address.city}, {institution.address.state}
                      </Typography>
                    </TableCell>
                    <TableCell>{institution.stats?.totalStudents || 0}</TableCell>
                    <TableCell>{institution.stats?.totalTeachers || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={institution.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={institution.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/institutions/edit/${institution._id}`)}
                        title="Edit"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color={institution.isActive ? 'warning' : 'success'}
                        onClick={() => handleToggleStatus(institution._id)}
                        title={institution.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {institution.isActive ? (
                          <ToggleOff fontSize="small" />
                        ) : (
                          <ToggleOn fontSize="small" />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(institution)}
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
          {filteredInstitutions.length > 0 && (
            <TablePagination
              component="div"
              count={filteredInstitutions.length}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          Delete Institution?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{institutionToDelete?.name}</strong>?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Warning:</strong> This action cannot be undone. 
            All data belonging to this institution will be permanently deleted, including:
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li>Students and admission records</li>
              <li>Fee structures and transactions</li>
              <li>Classes, sections, and groups</li>
              <li>All other related data</li>
            </ul>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleDeleteCancel}
            disabled={deleting}
          >
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
    </Container>
    </Box>
  );
};

export default Institutions;
