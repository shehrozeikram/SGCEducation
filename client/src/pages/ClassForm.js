import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Save, ArrowBack, Add, Close } from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const ClassForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [grades, setGrades] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Dialogs for adding new items
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [feeTypeDialogOpen, setFeeTypeDialogOpen] = useState(false);
  const [newGrade, setNewGrade] = useState({ name: '', code: '', level: '' });
  const [newFeeType, setNewFeeType] = useState({ name: '', code: '', amount: 0 });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  // Extract institution ID if it's an object
  const getUserInstitutionId = () => {
    if (!user.institution) return '';
    return typeof user.institution === 'object' ? user.institution._id : user.institution;
  };

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    institution: getUserInstitutionId(),
    department: '',
    grade: '',
    group: '',
    feeType: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  });

  const location = useLocation();

  // Initialise institution/department from user or URL (e.g. ?department=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const depFromQuery = params.get('department');
    setFormData((prev) => ({
      ...prev,
      institution: prev.institution || user.institution || '',
      department: depFromQuery || prev.department
    }));
  }, [location.search]);

  useEffect(() => {
    fetchGrades();
    fetchFeeTypes();
    fetchGroups();
    if (!isEditMode) {
      // For new class, ensure we have a department if provided via query
      const params = new URLSearchParams(location.search);
      const depFromQuery = params.get('department');
      if (depFromQuery) {
        setFormData((prev) => ({ ...prev, department: depFromQuery }));
      }
    } else {
      fetchClass();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location.search]);

  const fetchGrades = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = formData.institution 
        ? `http://localhost:5000/api/v1/grades?institution=${formData.institution}`
        : 'http://localhost:5000/api/v1/grades';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(response.data.data || []);
    } catch (err) {
      console.error('Error fetching grades:', err);
      setGrades([]);
    }
  };

  const fetchFeeTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = formData.institution 
        ? `http://localhost:5000/api/v1/fee-types?institution=${formData.institution}`
        : 'http://localhost:5000/api/v1/fee-types';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeTypes(response.data.data || []);
    } catch (err) {
      console.error('Error fetching fee types:', err);
      setFeeTypes([]);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = formData.institution
        ? `http://localhost:5000/api/v1/groups?institution=${formData.institution}`
        : 'http://localhost:5000/api/v1/groups';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data.data || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    }
  };

  const fetchClass = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/classes/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const cls = response.data.data;
      setFormData({
        name: cls.name,
        code: cls.code,
        institution: cls.institution?._id || user.institution || '',
        department: cls.department?._id || '',
        grade: cls.grade?._id || '',
        group: cls.group?._id || '',
        feeType: cls.feeType?._id || '',
        academicYear: cls.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch class');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddGrade = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Extract institution ID if it's an object
      let institutionId = user.institution;
      if (institutionId && typeof institutionId === 'object') {
        institutionId = institutionId._id;
      }
      
      const response = await axios.post(
        'http://localhost:5000/api/v1/grades',
        {
          ...newGrade,
          institution: institutionId || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setGrades([...grades, response.data.data]);
      setFormData({ ...formData, grade: response.data.data._id });
      setGradeDialogOpen(false);
      setNewGrade({ name: '', code: '', level: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add grade');
    }
  };

  const handleAddFeeType = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Extract institution ID if it's an object
      let institutionId = user.institution;
      if (institutionId && typeof institutionId === 'object') {
        institutionId = institutionId._id;
      }
      
      const response = await axios.post(
        'http://localhost:5000/api/v1/fee-types',
        {
          ...newFeeType,
          institution: institutionId || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setFeeTypes([...feeTypes, response.data.data]);
      setFormData({ ...formData, feeType: response.data.data._id });
      setFeeTypeDialogOpen(false);
      setNewFeeType({ name: '', code: '', amount: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add fee type');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const selectedInstitution = localStorage.getItem('selectedInstitution');
      const params = new URLSearchParams(location.search);
      const depFromQuery = params.get('department');

      // Get institution from multiple sources and extract _id if it's an object
      let institutionId = currentUser.institution || selectedInstitution || formData.institution;
      
      // If institution is an object, extract the _id
      if (institutionId && typeof institutionId === 'object') {
        institutionId = institutionId._id;
      }

      if (!institutionId) {
        setError('Institution not found. Please select an institution or contact administrator.');
        setLoading(false);
        return;
      }

      const payload = {
        name: formData.name,
        code: formData.code,
        grade: formData.grade,
        group: formData.group,
        feeType: formData.feeType,
        academicYear: formData.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        institution: institutionId,
        // department is optional; include if present (from form or query)
        ...(formData.department || depFromQuery
          ? { department: formData.department || depFromQuery }
          : {})
      };

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/v1/classes/${id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Class updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/classes',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Class created successfully!');
      }

      setTimeout(() => {
        navigate('/classes');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save class');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box>
        <TopBar title={isEditMode ? 'Edit Class' : 'Add New Class'} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title={isEditMode ? 'Edit Class' : 'Add New Class'} />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/classes')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight="bold">
            {isEditMode ? 'Edit Class' : 'Add New Class'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Class Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Class Name"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Class Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Class Code"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <FormControl fullWidth>
                  <InputLabel>Grade</InputLabel>
                  <Select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    label="Grade"
                  >
                    <MenuItem value="">Select Grade</MenuItem>
                    {grades.map((grade) => (
                      <MenuItem key={grade._id} value={grade._id}>
                        {grade.name} ({grade.code}) - Level {grade.level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  color="primary"
                  onClick={() => setGradeDialogOpen(true)}
                  sx={{ mt: 1 }}
                  title="Add New Grade"
                >
                  <Add />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Group</InputLabel>
                <Select
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                  label="Group"
                >
                  <MenuItem value="">Select Group</MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group._id} value={group._id}>
                      {group.name} ({group.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <FormControl fullWidth>
                  <InputLabel>Fee Type</InputLabel>
                  <Select
                    name="feeType"
                    value={formData.feeType}
                    onChange={handleChange}
                    label="Fee Type"
                  >
                    <MenuItem value="">Select Fee Type</MenuItem>
                    {feeTypes.map((feeType) => (
                      <MenuItem key={feeType._id} value={feeType._id}>
                        {feeType.name} ({feeType.code}) - PKR {feeType.amount}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  color="primary"
                  onClick={() => setFeeTypeDialogOpen(true)}
                  sx={{ mt: 1 }}
                  title="Add New Fee Type"
                >
                  <Add />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/classes')}
                  sx={{ minWidth: 100 }}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    minWidth: 100
                  }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      </Container>

      {/* Add Grade Dialog */}
      <Dialog open={gradeDialogOpen} onClose={() => setGradeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Grade</Typography>
            <IconButton onClick={() => setGradeDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Grade Name"
                value={newGrade.name}
                onChange={(e) => setNewGrade({ ...newGrade, name: e.target.value })}
                placeholder="e.g., Grade 1, Class 10"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Grade Code"
                value={newGrade.code}
                onChange={(e) => setNewGrade({ ...newGrade, code: e.target.value.toUpperCase() })}
                placeholder="e.g., G1, C10"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Level"
                type="number"
                value={newGrade.level}
                onChange={(e) => setNewGrade({ ...newGrade, level: parseInt(e.target.value) || '' })}
                placeholder="e.g., 1, 10"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGradeDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddGrade}
            variant="contained"
            disabled={!newGrade.name || !newGrade.code || !newGrade.level}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Grade
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Fee Type Dialog */}
      <Dialog open={feeTypeDialogOpen} onClose={() => setFeeTypeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Fee Type</Typography>
            <IconButton onClick={() => setFeeTypeDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Fee Type Name"
                value={newFeeType.name}
                onChange={(e) => setNewFeeType({ ...newFeeType, name: e.target.value })}
                placeholder="e.g., Tuition Fee, Admission Fee"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Fee Type Code"
                value={newFeeType.code}
                onChange={(e) => setNewFeeType({ ...newFeeType, code: e.target.value.toUpperCase() })}
                placeholder="e.g., TUF, ADF"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={newFeeType.amount}
                onChange={(e) => setNewFeeType({ ...newFeeType, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeeTypeDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddFeeType}
            variant="contained"
            disabled={!newFeeType.name || !newFeeType.code}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Add Fee Type
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassForm;

