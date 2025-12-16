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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const sessionsDefault = ['2025-2026', '2024-2025', '2023-2024'];

const SectionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sessions] = useState(sessionsDefault);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Extract institution ID if it's an object
  const getUserInstitutionId = () => {
    if (!user.institution) return '';
    return typeof user.institution === 'object' ? user.institution._id : user.institution;
  };

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    session: '',
    grade: '',
    class: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    strength: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isActive: true,
    institution: getUserInstitutionId(),
    department: '',
  });

  useEffect(() => {
    fetchGrades();
    fetchClasses();
    if (isEditMode) {
      fetchSection();
    }
  }, [id]);

  const fetchGrades = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/grades', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrades(response.data.data || []);
    } catch (err) {
      console.error('Error fetching grades:', err);
      setGrades([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchSection = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/sections/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const section = response.data.data;
      setFormData({
        name: section.name,
        code: section.code,
        session: section.session || '',
        grade: section.grade || '',
        institution: section.institution?._id || user.institution || '',
        department: section.department?._id || '',
        class: section.class?._id || '',
        academicYear: section.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        strength: section.capacity || '',
        startDate: section.startDate ? new Date(section.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: section.endDate ? new Date(section.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isActive: section.isActive !== undefined ? section.isActive : true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch section');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'class') {
      const cls = classes.find((c) => c._id === value);
      setFormData({
        ...formData,
        class: value,
        institution: cls?.institution?._id || formData.institution,
        department: cls?.department?._id || formData.department,
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        capacity: formData.strength || 0,
      };

      // Remove empty department field to prevent validation errors
      if (!payload.department) {
        delete payload.department;
      }

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/v1/sections/${id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Section updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/sections',
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Section created successfully!');
      }

      setTimeout(() => {
        navigate('/sections');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save section');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box>
        <TopBar title={isEditMode ? 'Edit Section' : 'Add New Section'} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title={isEditMode ? 'Edit Section' : 'Add New Section'} />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/sections')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight="bold">
            {isEditMode ? 'Edit Section' : 'Add New Section'}
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

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Section Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Section Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Session</InputLabel>
                <Select
                  name="session"
                  value={formData.session}
                  onChange={handleChange}
                  label="Session"
                >
                  <MenuItem value="">Select Session</MenuItem>
                  {sessions.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
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
                      {grade.name} ({grade.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Class</InputLabel>
                <Select
                  name="class"
                  value={formData.class}
                  onChange={handleChange}
                  label="Class"
                >
                  <MenuItem value="">Select School Class</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls._id} value={cls._id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Strength"
                name="strength"
                type="number"
                value={formData.strength}
                onChange={handleChange}
                placeholder="Strength"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Academic Year"
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                placeholder="2025-2026"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="End Date"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                }
                label="Is Active"
              />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/sections')}
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
    </Box>
  );
};

export default SectionForm;
