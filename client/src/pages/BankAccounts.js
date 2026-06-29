import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tooltip,
  MenuItem
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import { getApiBaseUrl } from '../config/api';
import { notifySuccess, notifyError } from '../utils/notify';
import { createAxiosConfig } from '../utils/feeUtils';

const API_URL = getApiBaseUrl();

const BankAccounts = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    institutions: [],
    bankName: '',
    accountNumber: '',
    accountTitle: '',
    branchCode: '',
    isActive: true
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const response = await axios.get(`${API_URL}/institutions`, createAxiosConfig());
      setInstitutions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/bank-accounts`, createAxiosConfig({
        params: { isActive: undefined } // Fetch all, active and inactive
      }));
      setBankAccounts(response.data.data);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      notifyError('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (account = null) => {
    if (account) {
      setEditingId(account._id);
      setFormData({
        institutions: account.institutions?.map(inst => typeof inst === 'object' ? inst._id : inst) || [],
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountTitle: account.accountTitle,
        branchCode: account.branchCode || '',
        isActive: account.isActive
      });
    } else {
      setEditingId(null);
      setFormData({
        institutions: [],
        bankName: '',
        accountNumber: '',
        accountTitle: '',
        branchCode: '',
        isActive: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      if (editingId) {
        await axios.put(`${API_URL}/bank-accounts/${editingId}`, formData, createAxiosConfig());
        notifySuccess('Bank account updated successfully');
      } else {
        await axios.post(`${API_URL}/bank-accounts`, formData, createAxiosConfig());
        notifySuccess('Bank account created successfully');
      }
      
      handleCloseDialog();
      fetchBankAccounts();
    } catch (error) {
      console.error('Error saving bank account:', error);
      notifyError(error.response?.data?.error || 'Failed to save bank account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      try {
        await axios.delete(`${API_URL}/bank-accounts/${id}`, createAxiosConfig());
        notifySuccess('Bank account deleted successfully');
        fetchBankAccounts();
      } catch (error) {
        console.error('Error deleting bank account:', error);
        notifyError('Failed to delete bank account');
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#667eea' }}>
          Bank Accounts Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}
        >
          Add Bank Account
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Bank Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Campuses</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Account Title</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Account Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Branch Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : bankAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No bank accounts found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              bankAccounts.map((account) => (
                <TableRow key={account._id} hover>
                  <TableCell>{account.bankName}</TableCell>
                  <TableCell>
                    {(account.institutions || []).map((inst, index) => (
                      <Typography key={index} variant="body2" sx={{ display: 'inline-block', mr: 1, bgcolor: '#e2e8f0', px: 1, borderRadius: 1, fontSize: '0.75rem' }}>
                        {inst.name || inst.code || 'Campus'}
                      </Typography>
                    ))}
                    {(!account.institutions || account.institutions.length === 0) && '-'}
                  </TableCell>
                  <TableCell>{account.accountTitle}</TableCell>
                  <TableCell>{account.accountNumber}</TableCell>
                  <TableCell>{account.branchCode || '-'}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: account.isActive ? 'success.main' : 'error.main',
                        fontWeight: 'bold'
                      }}
                    >
                      {account.isActive ? 'Active' : 'Inactive'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton color="primary" onClick={() => handleOpenDialog(account)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => handleDelete(account._id)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for Add/Edit */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ bgcolor: '#667eea', color: 'white' }}>
            {editingId ? 'Edit Bank Account' : 'Add New Bank Account'}
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <TextField
              select
              SelectProps={{ multiple: true }}
              margin="dense"
              name="institutions"
              label="Assigned Campuses"
              fullWidth
              value={formData.institutions}
              onChange={handleChange}
              sx={{ mb: 2 }}
              SelectProps={{
                multiple: true,
                renderValue: (selected) => selected.map(id => institutions.find(i => i._id === id)?.name || id).join(', ')
              }}
            >
              {institutions.map((inst) => (
                <MenuItem key={inst._id} value={inst._id}>
                  {inst.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              name="bankName"
              label="Bank Name (e.g., Allied Bank)"
              type="text"
              fullWidth
              required
              value={formData.bankName}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="accountTitle"
              label="Account Title"
              type="text"
              fullWidth
              required
              value={formData.accountTitle}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="accountNumber"
              label="Account Number"
              type="text"
              fullWidth
              required
              value={formData.accountNumber}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="branchCode"
              label="Branch Code (Optional)"
              type="text"
              fullWidth
              value={formData.branchCode}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleChange}
                  name="isActive"
                  color="primary"
                />
              }
              label="Active"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default BankAccounts;
