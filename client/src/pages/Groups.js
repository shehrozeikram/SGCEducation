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
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  TablePagination,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
  Group as GroupIcon,
  People,
  Assignment,
  Delete,
  Visibility,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { useTablePagination } from '../hooks/useTablePagination';

const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectDialog, setSubjectDialog] = useState({ open: false, group: null, selected: [] });
  const [subjectAssignments, setSubjectAssignments] = useState({});
  const pagination = useTablePagination(12);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const subjectOptions = [
    'Arts',
    'Value Education',
    'Physical Education',
    'Computer',
    'Geography',
    'Mathematics',
    'Science',
    'English',
    'Social Studies'
  ];

  // Load saved subject assignments on mount
  useEffect(() => {
    const storedAssignments = localStorage.getItem('groupSubjectAssignments');
    if (storedAssignments) {
      try {
        setSubjectAssignments(JSON.parse(storedAssignments));
      } catch (e) {
        console.error('Failed to parse group subject assignments', e);
      }
    }
    fetchData();
  }, []);

  const getInstitutionId = () => {
    // Super admins use the navbar selection
    if (user.role === 'super_admin') {
      const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
      if (selectedInstitutionStr) {
        try {
          const parsed = JSON.parse(selectedInstitutionStr);
          return parsed._id || parsed;
        } catch (e) {
          return selectedInstitutionStr;
        }
      }
    }
    
    // For other roles or as fallback, use user.institution
    if (user.institution) {
      return typeof user.institution === 'object' ? user.institution._id : user.institution;
    }
    
    return null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build query params
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const institutionId = getInstitutionId();
      if (institutionId) {
        params.append('institution', institutionId);
      }

      const groupResponse = await axios.get(getApiUrl(`groups?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      setGroups(groupResponse.data.data || []);
    } catch (err) {
      console.error('Error fetching groups data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch groups';
      setError(errorMessage);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups;

  if (loading && groups.length === 0 && !error) {
    return (
      <Box>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4, mt: '64px' }}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header Section with Gradient */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GroupIcon sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  Groups Management
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Organize and manage student groups efficiently
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/groups/new')}
              sx={{
                bgcolor: 'white',
                color: '#667eea',
                fontWeight: 'bold',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              Add New Group
            </Button>
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba205 100%)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Groups
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#667eea">
                      {groups.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#667eea15',
                      borderRadius: 2,
                    }}
                  >
                    <GroupIcon sx={{ fontSize: 32, color: '#667eea' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(135deg, #43e97b15 0%, #38f9d705 100%)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Active Groups
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#43e97b">
                      {groups.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#43e97b15',
                      borderRadius: 2,
                    }}
                  >
                    <People sx={{ fontSize: 32, color: '#43e97b' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(135deg, #f093fb15 0%, #f5576c05 100%)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      With Subjects
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#f093fb">
                      {Object.keys(subjectAssignments).length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#f093fb15',
                      borderRadius: 2,
                    }}
                  >
                    <Assignment sx={{ fontSize: 32, color: '#f093fb' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(135deg, #4facfe15 0%, #00f2fe05 100%)',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      This Month
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#4facfe">
                      {groups.filter(g => {
                        const created = new Date(g.createdAt);
                        const now = new Date();
                        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                      }).length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#4facfe15',
                      borderRadius: 2,
                    }}
                  >
                    <GroupIcon sx={{ fontSize: 32, color: '#4facfe' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4,
            borderRadius: 3,
            border: '1px solid #e0e0e0',
          }}
        >

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

          {/* Search Section */}
          <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
            <TextField
              fullWidth
              placeholder="Search groups by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#667eea' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                flex: 1, 
                minWidth: '200px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
              }}
            />
          </Box>
          <Divider sx={{ mb: 3 }} />

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '& .MuiTableCell-head': { 
                    color: 'white', 
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    py: 2,
                  } 
                }}>
                  <TableCell>#</TableCell>
                  <TableCell>Group Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Box py={6}>
                        <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No groups found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first group'}
                        </Typography>
                        {!searchTerm && (
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => navigate('/groups/new')}
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                          >
                            Create First Group
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.getPaginatedData(filteredGroups).map((group, idx) => {
                    const actualIndex = pagination.page * pagination.rowsPerPage + idx;
                    const hasSubjects = subjectAssignments[group._id]?.length > 0;
                    return (
                      <TableRow 
                        key={group._id} 
                        hover
                        sx={{
                          '&:hover': {
                            bgcolor: '#f5f5f5',
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {actualIndex + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <GroupIcon sx={{ fontSize: 20, color: '#667eea' }} />
                            <Typography variant="body2" fontWeight="medium">
                              {group.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={group.code || 'N/A'} 
                            size="small" 
                            sx={{ 
                              bgcolor: '#667eea15',
                              color: '#667eea',
                              fontWeight: 'medium',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {group.createdBy?.name || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/groups/edit/${group._id}`)}
                              sx={{
                                color: '#667eea',
                                '&:hover': {
                                  bgcolor: '#667eea15',
                                },
                              }}
                              title="Edit Group"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Assignment />}
                              onClick={() => setSubjectDialog({
                                open: true,
                                group,
                                selected: subjectAssignments[group._id] || []
                              })}
                              sx={{ 
                                textTransform: 'none',
                                borderColor: hasSubjects ? '#43e97b' : '#667eea',
                                color: hasSubjects ? '#43e97b' : '#667eea',
                                '&:hover': {
                                  borderColor: hasSubjects ? '#43e97b' : '#667eea',
                                  bgcolor: hasSubjects ? '#43e97b15' : '#667eea15',
                                },
                              }}
                            >
                              {hasSubjects ? `${subjectAssignments[group._id].length} Subjects` : 'Assign Subjects'}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          {filteredGroups.length > 0 && (
            <TablePagination
              component="div"
              count={filteredGroups.length}
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

      {/* Assign Subjects Dialog (local-only for now) */}
      <Dialog
        open={subjectDialog.open}
        onClose={() => setSubjectDialog({ open: false, group: null, selected: [] })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold',
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Assignment />
            Assign Subjects to {subjectDialog.group?.name || 'Group'}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
            Select subjects for this group
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <FormControlLabel
            control={
              <Checkbox
                checked={
                  subjectDialog.selected.length === subjectOptions.length &&
                  subjectOptions.length > 0
                }
                indeterminate={
                  subjectDialog.selected.length > 0 &&
                  subjectDialog.selected.length < subjectOptions.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSubjectDialog((prev) => ({ ...prev, selected: subjectOptions }));
                  } else {
                    setSubjectDialog((prev) => ({ ...prev, selected: [] }));
                  }
                }}
              />
            }
            label="Select All"
            sx={{ mb: 1 }}
          />
          {subjectOptions.map((subject) => (
            <FormControlLabel
              key={subject}
              control={
                <Checkbox
                  checked={subjectDialog.selected.includes(subject)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSubjectDialog((prev) => ({
                      ...prev,
                      selected: checked
                        ? [...prev.selected, subject]
                        : prev.selected.filter((s) => s !== subject)
                    }));
                  }}
                />
              }
              label={subject}
            />
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setSubjectDialog({ open: false, group: null, selected: [] })}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (subjectDialog.group) {
                const updated = {
                  ...subjectAssignments,
                  [subjectDialog.group._id]: subjectDialog.selected
                };
                setSubjectAssignments(updated);
                localStorage.setItem('groupSubjectAssignments', JSON.stringify(updated));
              }
              setSubjectDialog({ open: false, group: null, selected: [] });
            }}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 'bold',
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Groups;

