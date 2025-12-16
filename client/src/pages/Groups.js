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
} from '@mui/material';
import {
  Add,
  Edit,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectDialog, setSubjectDialog] = useState({ open: false, group: null, selected: [] });
  const [subjectAssignments, setSubjectAssignments] = useState({});

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch groups (only search filter)
      let url = 'http://localhost:5000/api/v1/groups';
      const params = [];
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const groupResponse = await axios.get(url, {
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
        <TopBar title="Groups Management" />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title="Groups Management" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Groups
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage student groups
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/groups/new')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Group
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search only */}
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
            sx={{ flex: 1, minWidth: '200px' }}
          />
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Group Id</strong></TableCell>
                <TableCell><strong>Group Name</strong></TableCell>
                <TableCell><strong>Created By</strong></TableCell>
                <TableCell align="center"><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Box py={4}>
                      <Typography variant="body2" color="text.secondary">
                        No groups found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group, idx) => (
                  <TableRow key={group._id} hover>
                    <TableCell>
                      <Typography variant="body2">{idx + 1}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{group.name}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {group.createdBy?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/groups/edit/${group._id}`)}
                        title="Edit"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setSubjectDialog({
                          open: true,
                          group,
                          selected: subjectAssignments[group._id] || []
                        })}
                        sx={{ ml: 1, textTransform: 'none', fontWeight: 600 }}
                      >
                        Assign Subjects To Group
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

      {/* Assign Subjects Dialog (local-only for now) */}
      <Dialog
        open={subjectDialog.open}
        onClose={() => setSubjectDialog({ open: false, group: null, selected: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Group Subjects</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Subjects
          </Typography>
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
        <DialogActions>
          <Button onClick={() => setSubjectDialog({ open: false, group: null, selected: [] })}>
            Close
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
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Groups;

