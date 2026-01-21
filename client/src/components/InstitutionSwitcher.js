import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Business,
  SwapHoriz,
  Search,
  Add,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

const API_URL = getApiBaseUrl();

const InstitutionSwitcher = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentInstitution, setCurrentInstitution] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const selected = localStorage.getItem('selectedInstitution');
    if (selected) {
      try {
        setCurrentInstitution(JSON.parse(selected));
      } catch (e) {
        console.error('Failed to parse selected institution', e);
      }
    }
  }, []);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/institutions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutions(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch institutions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    fetchInstitutions();
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
    setError('');
  };

  const handleSwitchInstitution = (institution) => {
    localStorage.setItem('selectedInstitution', JSON.stringify(institution));
    setCurrentInstitution(institution);
    handleClose();
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new Event('institutionChanged'));
    window.location.reload();
  };

  const filteredInstitutions = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Only show for super admin
  if (user.role !== 'super_admin') {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<SwapHoriz />}
        onClick={handleOpen}
        sx={{
          borderColor: 'white',
          color: 'white',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.8)',
            bgcolor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          {currentInstitution ? currentInstitution.name : 'Select Institution'}
        </Box>
        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
          Switch
        </Box>
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business />
              <Typography variant="h6">Switch Institution</Typography>
            </Box>
            <IconButton
              onClick={() => {
                handleClose();
                navigate('/institutions/new');
              }}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                },
              }}
              size="small"
            >
              <Add />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {currentInstitution && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Currently viewing: <strong>{currentInstitution.name}</strong>
            </Alert>
          )}

          <TextField
            fullWidth
            placeholder="Search institutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredInstitutions.map((institution) => (
                <ListItem key={institution._id} disablePadding>
                  <ListItemButton
                    onClick={() => handleSwitchInstitution(institution)}
                    selected={currentInstitution?._id === institution._id}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        '&:hover': {
                          bgcolor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{institution.name}</Typography>
                          {currentInstitution?._id === institution._id && (
                            <Chip label="Current" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={institution.code} size="small" variant="outlined" />
                          <Chip label={institution.type} size="small" variant="outlined" />
                          <Chip
                            label={institution.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={institution.isActive ? 'success' : 'default'}
                          />
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {filteredInstitutions.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No institutions found
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InstitutionSwitcher;
