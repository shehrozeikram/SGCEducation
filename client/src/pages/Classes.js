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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  ToggleOn,
  ToggleOff,
  Class as ClassIcon,
  Close,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const Classes = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feeHeadDialog, setFeeHeadDialog] = useState({ open: false, class: null });
  const [feeHeadSettings, setFeeHeadSettings] = useState({});

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fee heads list
  const feeHeads = [
    'Tuition Fee',
    'Arrears',
    'Examination Fee',
    'Transport Fee',
    'Annual Fee',
    'Heating Charges'
  ];

  // Months list
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch classes
      const classResponse = await axios.get('http://localhost:5000/api/v1/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClasses(classResponse.data.data || []);
    } catch (err) {
      console.error('Error fetching classes data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch classes';
      setError(errorMessage);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/v1/classes/${classId}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleOpenFeeHeadDialog = (classItem) => {
    // Load saved settings from localStorage or initialize with all checked
    const savedSettings = localStorage.getItem(`feeHeadSettings_${classItem._id}`);
    let initialSettings = {};

    if (savedSettings) {
      initialSettings = JSON.parse(savedSettings);
    } else {
      // Initialize all fee heads with all months checked
      feeHeads.forEach(feeHead => {
        initialSettings[feeHead] = {};
        months.forEach(month => {
          initialSettings[feeHead][month] = true;
        });
      });
    }

    setFeeHeadSettings(initialSettings);
    setFeeHeadDialog({ open: true, class: classItem });
  };

  const handleToggleFeeHeadMonth = (feeHead, month) => {
    setFeeHeadSettings(prev => ({
      ...prev,
      [feeHead]: {
        ...prev[feeHead],
        [month]: !prev[feeHead]?.[month]
      }
    }));
  };

  const handleSaveFeeHeadSettings = () => {
    if (feeHeadDialog.class) {
      // Save to localStorage
      localStorage.setItem(
        `feeHeadSettings_${feeHeadDialog.class._id}`,
        JSON.stringify(feeHeadSettings)
      );
      // Close dialog
      setFeeHeadDialog({ open: false, class: null });
      // Show success message
      setError('');
      // You could also show a success message here
    }
  };

  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && classes.length === 0 && !error) {
    return (
      <Box>
        <TopBar title="Classes Management" />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title="Classes Management" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage academic classes
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/classes/new')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Class
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search Filter Only */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
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
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Fee Type</strong></TableCell>
                <TableCell><strong>Group Name</strong></TableCell>
                <TableCell><strong>Created By</strong></TableCell>
                <TableCell align="center"><strong>Action</strong></TableCell>
                <TableCell align="center"><strong>Monthly Fee Head Setting</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No classes found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClasses.map((cls) => (
                  <TableRow key={cls._id} hover>
                    <TableCell>
                      <Typography variant="body2">{capitalizeFirstOnly(cls.name || 'N/A')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{cls.code}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {capitalizeFirstOnly(cls.feeType?.name || 'N/A')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {capitalizeFirstOnly(cls.group?.name || 'N/A')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {capitalizeFirstOnly(cls.createdBy?.name || 'N/A')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => navigate(`/classes/edit/${cls._id}`)}
                        sx={{ textTransform: 'none' }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenFeeHeadDialog(cls)}
                        sx={{
                          bgcolor: '#dc3545',
                          '&:hover': {
                            bgcolor: '#c82333',
                          },
                          textTransform: 'none',
                        }}
                      >
                        Monthly Fee Head Setting
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      </Container>

      {/* Monthly Fee Head Setting Dialog */}
      <Dialog
        open={feeHeadDialog.open}
        onClose={() => setFeeHeadDialog({ open: false, class: null })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: '#0d6efd',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {feeHeadDialog.class?.name?.toUpperCase() || ''}
          </Typography>
          <IconButton
            onClick={() => setFeeHeadDialog({ open: false, class: null })}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#0d6efd' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                    Fee Head Name
                  </TableCell>
                  {months.map((month) => (
                    <TableCell
                      key={month}
                      align="center"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        borderRight: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      {month}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {feeHeads.map((feeHead, index) => (
                  <TableRow
                    key={feeHead}
                    sx={{
                      '&:nth-of-type(odd)': {
                        bgcolor: '#f8f9fa',
                      },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500, borderRight: '1px solid rgba(0,0,0,0.1)' }}>
                      {feeHead}
                    </TableCell>
                    {months.map((month) => (
                      <TableCell
                        key={month}
                        align="center"
                        sx={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}
                      >
                        <Checkbox
                          checked={feeHeadSettings[feeHead]?.[month] || false}
                          onChange={() => handleToggleFeeHeadMonth(feeHead, month)}
                          color="primary"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setFeeHeadDialog({ open: false, class: null })}
            variant="outlined"
            sx={{
              color: '#6c757d',
              borderColor: '#6c757d',
              '&:hover': {
                borderColor: '#5c636a',
                bgcolor: 'rgba(108, 117, 125, 0.1)',
              },
            }}
          >
            Close
          </Button>
          <Button
            onClick={handleSaveFeeHeadSettings}
            variant="contained"
            sx={{
              bgcolor: '#0d6efd',
              '&:hover': {
                bgcolor: '#0b5ed7',
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Classes;

