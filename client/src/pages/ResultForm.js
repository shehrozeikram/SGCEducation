import React, { useState, useEffect } from 'react';
import {
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
  IconButton,
} from '@mui/material';
import { 
  Save, 
  ArrowBack,
  Assessment,
  School,
  Person,
  CalendarToday,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const ResultForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  const examTypes = ['quiz', 'assignment', 'midterm', 'final', 'practical', 'project', 'oral', 'other'];

  const [formData, setFormData] = useState({
    institution: '',
    student: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    class: '',
    section: '',
    group: '',
    examType: 'midterm',
    examName: '',
    examDate: new Date().toISOString().split('T')[0],
    subject: '',
    marks: {
      obtained: '',
      total: '',
    },
    remarks: '',
    teacherRemarks: '',
    status: 'draft',
  });

  // Helper to get institution ID
  const getInstitutionId = () => {
    const selectedInstitutionStr = localStorage.getItem('selectedInstitution');
    if (selectedInstitutionStr) {
      try {
        const parsed = JSON.parse(selectedInstitutionStr);
        if (parsed && parsed._id) {
          return parsed._id;
        } else if (typeof parsed === 'string') {
          return parsed;
        }
      } catch (e) {
        return selectedInstitutionStr;
      }
    }
    
    if (user.institution) {
      return typeof user.institution === 'object' ? user.institution._id : user.institution;
    }
    
    return null;
  };

  useEffect(() => {
    const institutionId = getInstitutionId();
    if (institutionId && !isSuperAdmin) {
      setFormData(prev => ({ ...prev, institution: institutionId }));
    }

    if (isSuperAdmin) {
      fetchInstitutions();
    }
    fetchClasses();
    
    if (isEditMode) {
      fetchResult();
    }
  }, [id]);

  useEffect(() => {
    if (formData.institution) {
      fetchClasses();
    }
  }, [formData.institution]);

  useEffect(() => {
    if (formData.class) {
      fetchSections();
      fetchStudents();
    }
  }, [formData.class]);

  const fetchInstitutions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('institutions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutions(response.data.data || []);
    } catch (err) {
      console.error('Error fetching institutions:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (formData.institution) {
        params.append('institution', formData.institution);
      }
      const response = await axios.get(getApiUrl(`classes?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (formData.class) {
        params.append('class', formData.class);
      }
      const response = await axios.get(getApiUrl(`sections?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSections(response.data.data || []);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      if (!formData.class) {
        setStudents([]);
        return;
      }

      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('status', 'enrolled');
      if (formData.institution) {
        params.append('institution', formData.institution);
      }
      
      const response = await axios.get(getApiUrl(`admissions?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const admissions = response.data.data || [];
      
      // Filter by class if selected
      const filteredAdmissions = admissions.filter(adm => {
        const admClassId = adm.class?._id || adm.class;
        return admClassId === formData.class;
      });
      
      // Extract students from admissions (studentId should be populated)
      const studentsList = filteredAdmissions
        .filter(adm => adm.studentId)
        .map(adm => {
          const student = adm.studentId;
          const studentId = student._id || student;
          return {
            _id: studentId,
            name: student.user?.name || adm.personalInfo?.name || 'Unknown',
            enrollmentNumber: student.enrollmentNumber || adm.applicationNumber || 'N/A',
            user: student.user
          };
        })
        .filter((student, index, self) => 
          // Remove duplicates based on _id
          index === self.findIndex(s => s._id === student._id)
        );
      
      setStudents(studentsList);
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    }
  };

  const fetchResult = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`results/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = response.data.data;
      setFormData({
        institution: result.institution?._id || result.institution || '',
        student: result.student?._id || result.student || '',
        academicYear: result.academicYear || '',
        class: result.class?._id || result.class || '',
        section: result.section?._id || result.section || '',
        group: result.group?._id || result.group || '',
        examType: result.examType || 'midterm',
        examName: result.examName || '',
        examDate: result.examDate ? new Date(result.examDate).toISOString().split('T')[0] : '',
        subject: result.subject || '',
        marks: {
          obtained: result.marks?.obtained || '',
          total: result.marks?.total || '',
        },
        remarks: result.remarks || '',
        teacherRemarks: result.teacherRemarks || '',
        status: result.status || 'draft',
      });

      // Fetch related data
      if (result.institution) {
        const institutionId = result.institution._id || result.institution;
        setFormData(prev => ({ ...prev, institution: institutionId }));
        await fetchClasses();
      }
      if (result.class) {
        await fetchSections();
        await fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch result');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.student) {
      setError('Please select a student');
      return;
    }
    if (!formData.examName) {
      setError('Please enter exam name');
      return;
    }
    if (!formData.subject) {
      setError('Please enter subject');
      return;
    }
    if (!formData.marks.obtained || !formData.marks.total) {
      setError('Please enter both obtained and total marks');
      return;
    }
    if (parseFloat(formData.marks.obtained) > parseFloat(formData.marks.total)) {
      setError('Obtained marks cannot be greater than total marks');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      const submitData = {
        ...formData,
        marks: {
          obtained: parseFloat(formData.marks.obtained),
          total: parseFloat(formData.marks.total),
        },
      };

      // Remove empty fields
      if (!submitData.section) delete submitData.section;
      if (!submitData.group) delete submitData.group;
      if (!submitData.remarks) delete submitData.remarks;
      if (!submitData.teacherRemarks) delete submitData.teacherRemarks;

      if (isEditMode) {
        await axios.put(getApiUrl(`results/${id}`), submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Result updated successfully');
      } else {
        await axios.post(getApiUrl('results'), submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Result created successfully');
      }

      setTimeout(() => {
        navigate('/results');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} result`);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', mt: '64px' }}>
      <Box sx={{ mt: 3, mb: 3, flex: 1, px: 3, width: '100%' }}>
        <Paper sx={{ p: 3 }}>
          {/* Header */}
          <Box display="flex" alignItems="center" mb={3}>
            <IconButton onClick={() => navigate('/results')} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {isEditMode ? 'Edit Result' : 'Add New Result'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditMode ? 'Update result information' : 'Enter student exam result details'}
              </Typography>
            </Box>
          </Box>

          {/* Alerts */}
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Institution (Super Admin only) */}
              {isSuperAdmin && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Institution</InputLabel>
                    <Select
                      value={formData.institution}
                      label="Institution"
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value, class: '', section: '', student: '' })}
                    >
                      {institutions.map((inst) => (
                        <MenuItem key={inst._id} value={inst._id}>
                          {inst.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Academic Year */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Academic Year"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  required
                />
              </Grid>

              {/* Class */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={formData.class}
                    label="Class"
                    onChange={(e) => setFormData({ ...formData, class: e.target.value, section: '', student: '' })}
                  >
                    {classes.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Section */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={formData.section}
                    label="Section"
                    onChange={(e) => setFormData({ ...formData, section: e.target.value, student: '' })}
                    disabled={!formData.class}
                  >
                    {sections.map((sec) => (
                      <MenuItem key={sec._id} value={sec._id}>
                        {sec.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Student */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Student</InputLabel>
                  <Select
                    value={formData.student}
                    label="Student"
                    onChange={(e) => setFormData({ ...formData, student: e.target.value })}
                    disabled={!formData.class}
                  >
                    {students.map((student) => (
                      <MenuItem key={student._id} value={student._id}>
                        {student.name} ({student.enrollmentNumber})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Exam Type */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Exam Type</InputLabel>
                  <Select
                    value={formData.examType}
                    label="Exam Type"
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                  >
                    {examTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Exam Name */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Exam Name"
                  value={formData.examName}
                  onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                  required
                />
              </Grid>

              {/* Exam Date */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Exam Date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* Subject */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </Grid>

              {/* Marks Obtained */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Marks Obtained"
                  value={formData.marks.obtained}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    marks: { ...formData.marks, obtained: e.target.value } 
                  })}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              {/* Total Marks */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Marks"
                  value={formData.marks.total}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    marks: { ...formData.marks, total: e.target.value } 
                  })}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              {/* Remarks */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </Grid>

              {/* Teacher Remarks */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Teacher Remarks"
                  value={formData.teacherRemarks}
                  onChange={(e) => setFormData({ ...formData, teacherRemarks: e.target.value })}
                />
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/results')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} /> : (isEditMode ? 'Update Result' : 'Create Result')}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};

export default ResultForm;
