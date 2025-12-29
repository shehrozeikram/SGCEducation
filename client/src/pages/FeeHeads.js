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
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Close,
} from '@mui/icons-material';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const FeeHeads = () => {
  const [feeHeads, setFeeHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedFeeHead, setSelectedFeeHead] = useState(null);
  const [availablePriorities, setAvailablePriorities] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    priority: '',
    accountType: '',
    frequencyType: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'super_admin' || user.role === 'admin';

  // Account Type options
  const accountTypeOptions = [
    'Liabilities',
    'Income',
    'Other Income'
  ];

  // Frequency Type options
  const frequencyTypeOptions = [
    'Monthly Fee/Annual Fee',
    'Once at First Fee',
    'Not Defined(e.g Paper Charges)'
  ];

  useEffect(() => {
    fetchFeeHeads();
    fetchAvailablePriorities();
  }, []);

  const fetchFeeHeads = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const institutionId = getInstitutionId();
      const params = {};
      if (institutionId) params.institution = institutionId;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(`${API_URL}/fee-heads`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setFeeHeads(response.data.data || []);
    } catch (err) {
      console.error('Error fetching fee heads:', err);
      setError(err.response?.data?.message || 'Failed to fetch fee heads');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePriorities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/fee-heads/priorities/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailablePriorities(response.data.data || []);
    } catch (err) {
      console.error('Error fetching priorities:', err);
    }
  };

  const getInstitutionId = () => {
    if (user.institution) {
      return typeof user.institution === 'object' ? user.institution._id : user.institution;
    }
    return null;
  };

  const handleOpenDialog = (feeHead = null) => {
    if (feeHead) {
      setEditMode(true);
      setSelectedFeeHead(feeHead);
      setFormData({
        name: feeHead.name || '',
        priority: feeHead.priority || '',
        accountType: feeHead.accountType || '',
        frequencyType: feeHead.frequencyType || ''
      });
    } else {
      setEditMode(false);
      setSelectedFeeHead(null);
      setFormData({
        name: '',
        priority: '',
        accountType: '',
        frequencyType: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedFeeHead(null);
    setFormData({
      name: '',
      priority: '',
      accountType: '',
      frequencyType: ''
    });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      const institutionId = getInstitutionId();

      const payload = {
        ...formData,
        priority: parseInt(formData.priority),
        institution: institutionId || undefined
      };

      if (editMode) {
        await axios.put(`${API_URL}/fee-heads/${selectedFeeHead._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Fee head updated successfully');
      } else {
        await axios.post(`${API_URL}/fee-heads`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Fee head created successfully');
      }

      handleCloseDialog();
      fetchFeeHeads();
      fetchAvailablePriorities();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editMode ? 'update' : 'create'} fee head`);
    }
  };

  const handleDelete = async (feeHeadId) => {
    if (!window.confirm('Are you sure you want to delete this fee head?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');

      await axios.delete(`${API_URL}/fee-heads/${feeHeadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Fee head deleted successfully');
      fetchFeeHeads();
      fetchAvailablePriorities();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete fee head');
    }
  };

  const filteredFeeHeads = feeHeads.filter(feeHead => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      feeHead.name?.toLowerCase().includes(searchLower) ||
      feeHead.glAccount?.toLowerCase().includes(searchLower) ||
      feeHead.frequencyType?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <TopBar />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3, flex: 1 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="#667eea">
              Fee Head
            </Typography>
            {isAdmin && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                Add Fee Head
              </Button>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Search Bar */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by name, GL Account, or frequency type..."
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
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#667eea' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Frequency Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Priority Order</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>GL Account</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Created By</TableCell>
                    {isAdmin && (
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredFeeHeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} align="center">
                        {searchTerm ? 'No fee heads found matching your search' : 'No fee heads found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFeeHeads.map((feeHead) => (
                      <TableRow key={feeHead._id} hover>
                        <TableCell>{capitalizeFirstOnly(feeHead.name)}</TableCell>
                        <TableCell>{feeHead.frequencyType}</TableCell>
                        <TableCell>{feeHead.priority}</TableCell>
                        <TableCell>{feeHead.glAccount}</TableCell>
                        <TableCell>{capitalizeFirstOnly(feeHead.createdBy?.name || 'N/A')}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog(feeHead)}
                              sx={{ mr: 1 }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(feeHead._id)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Add/Edit Dialog */}
          <Dialog
            open={dialogOpen}
            onClose={handleCloseDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">
                  {editMode ? 'Edit Fee Head' : 'Add Fee Head'}
                </Typography>
                <IconButton onClick={handleCloseDialog} size="small">
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Head Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Priority *</InputLabel>
                    <Select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      label="Priority *"
                    >
                      {availablePriorities.map((priority) => (
                        <MenuItem
                          key={priority.value}
                          value={priority.value}
                          disabled={!priority.available && (!editMode || selectedFeeHead?.priority !== priority.value)}
                        >
                          {priority.label} {!priority.available && selectedFeeHead?.priority !== priority.value ? '(Already used)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Account Type *</InputLabel>
                    <Select
                      value={formData.accountType}
                      onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                      label="Account Type *"
                    >
                      {accountTypeOptions.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Frequency Type *</InputLabel>
                    <Select
                      value={formData.frequencyType}
                      onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value })}
                      label="Frequency Type *"
                    >
                      {frequencyTypeOptions.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!formData.name || !formData.priority || !formData.accountType || !formData.frequencyType}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                Save
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Container>
    </Box>
  );
};

export default FeeHeads;





