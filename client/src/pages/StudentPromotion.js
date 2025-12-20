import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  ArrowForward,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const StudentPromotion = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  // Promotion type: 'promote', 'transfer', 'passout'
  const [promotionType, setPromotionType] = useState('promote');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // FROM section state
  const [fromData, setFromData] = useState({
    school: '',
    schoolClass: '',
    group: '',
    section: '',
    remarks: '',
  });

  // TO section state
  const [toData, setToData] = useState({
    school: '',
    schoolClass: '',
    section: '',
    group: '',
  });

  // Data for dropdowns
  const [institutions, setInstitutions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [groups, setGroups] = useState([]);

  // Students data
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch institutions
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        // For both superadmin and admin, fetch all institutions
        // Backend will filter to only return admin's institution for non-superadmin users
        const response = await axios.get('http://localhost:5000/api/v1/institutions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const fetchedInstitutions = response.data.data || [];
        setInstitutions(fetchedInstitutions);

        // Auto-select the first institution if there's only one (which should be the case for admin)
        if (fetchedInstitutions.length === 1) {
          setFromData(prev => ({ ...prev, school: fetchedInstitutions[0]._id }));
        } else if (fetchedInstitutions.length === 0) {
          setError('No institution found for your account. Please contact administrator.');
        }
      } catch (err) {
        console.error('Error fetching institutions:', err);
        setError(err.response?.data?.message || 'Failed to load institutions');
      }
    };

    fetchInstitutions();
  }, [isSuperAdmin, user.institution]);

  // Fetch classes when school is selected (FROM section)
  useEffect(() => {
    if (fromData.school) {
      fetchClasses();
    }
  }, [fromData.school]);

  // Fetch classes when school is selected (TO section)
  useEffect(() => {
    if (toData.school) {
      fetchClassesForTo();
    }
  }, [toData.school]);

  // Fetch sections when class is selected (FROM section)
  useEffect(() => {
    if (fromData.schoolClass) {
      fetchSections();
    }
  }, [fromData.schoolClass, fromData.school]);

  // Fetch sections when class is selected (TO section)
  useEffect(() => {
    if (toData.schoolClass) {
      fetchSectionsForTo();
    }
  }, [toData.schoolClass, toData.school]);

  // Fetch groups
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/classes', {
        headers: { Authorization: `Bearer ${token}` },
        params: { institution: fromData.school }
      });
      setClasses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchClassesForTo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/classes', {
        headers: { Authorization: `Bearer ${token}` },
        params: { institution: toData.school }
      });
      // For TO section, we can use the same classes state or create a separate one
      // Since both FROM and TO might have different schools, we'll use the same state
      // but update it based on which section is being used
      setClasses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching classes for TO section:', err);
    }
  };

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/sections', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          institution: fromData.school,
          class: fromData.schoolClass 
        }
      });
      setSections(response.data.data || []);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const fetchSectionsForTo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/sections', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          institution: toData.school,
          class: toData.schoolClass 
        }
      });
      setSections(response.data.data || []);
    } catch (err) {
      console.error('Error fetching sections for TO section:', err);
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/v1/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data.data || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const handleGetStudents = async () => {
    if (!fromData.school || !fromData.schoolClass || !fromData.section) {
      setError('Please select School, Class, and Section in FROM section');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      // Fetch students based on FROM criteria
      // This will need a backend API endpoint to fetch students by class/section
      // For now, we'll fetch enrolled admissions and filter
      const response = await axios.get('http://localhost:5000/api/v1/admissions', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          institution: fromData.school,
          status: 'enrolled'
        }
      });

      const admissions = response.data.data || [];
      
      // Filter by class and section if available
      let filteredStudents = admissions.filter(admission => {
        if (fromData.schoolClass && admission.class) {
          const classId = typeof admission.class === 'object' ? admission.class._id : admission.class;
          if (classId !== fromData.schoolClass) return false;
        }
        if (fromData.section && admission.section) {
          const sectionId = typeof admission.section === 'object' ? admission.section._id : admission.section;
          if (sectionId !== fromData.section) return false;
        }
        return true;
      });

      // Map admissions to student data format
      const studentsData = filteredStudents.map((admission, index) => ({
        _id: admission._id,
        studentId: admission.studentId?.enrollmentNumber || admission.applicationNumber || `STU${index + 1}`,
        rollNumber: admission.studentId?.rollNumber || admission.rollNumber || '',
        name: `${capitalizeFirstOnly(admission.personalInfo?.firstName || '')} ${capitalizeFirstOnly(admission.personalInfo?.middleName || '')} ${capitalizeFirstOnly(admission.personalInfo?.lastName || '')}`.trim(),
        fatherName: capitalizeFirstOnly(admission.guardianInfo?.fatherName || ''),
        status: admission.status || 'enrolled',
        category: admission.personalInfo?.category || 'Default',
        gender: admission.personalInfo?.gender || 'Male',
        admission: admission,
      }));

      setStudents(studentsData);
      setSelectedStudents([]);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedStudents(students.map(s => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handlePromote = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }

    // For promote and transfer, TO section is required
    if (promotionType === 'promote' || promotionType === 'transfer') {
      if (!toData.school || !toData.schoolClass || !toData.section) {
        setError('Please fill all required fields in TO section');
        return;
      }
    }
    // For passout, TO section is optional

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');

      // TODO: Implement backend API call for promotion/transfer/passout
      // For now, just show success message
      const action = promotionType === 'promote' ? 'Promote' : promotionType === 'transfer' ? 'Transfer' : 'Pass Out';
      setSuccess(`${action} action will be implemented. ${selectedStudents.length} student(s) selected.`);

      // Reset selections
      setSelectedStudents([]);
    } catch (err) {
      console.error(`Error in ${promotionType}:`, err);
      setError(err.response?.data?.message || `Failed to ${promotionType} students`);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      student.studentId?.toLowerCase().includes(search) ||
      student.rollNumber?.toLowerCase().includes(search) ||
      student.name?.toLowerCase().includes(search) ||
      student.fatherName?.toLowerCase().includes(search) ||
      student.status?.toLowerCase().includes(search) ||
      student.category?.toLowerCase().includes(search) ||
      student.gender?.toLowerCase().includes(search)
    );
  });

  const getActionButtonLabel = () => {
    switch (promotionType) {
      case 'promote':
        return 'Promote';
      case 'transfer':
        return 'Transfer';
      case 'passout':
        return 'Pass Out';
      default:
        return 'Promote';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <TopBar title="Student Promotion" />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            STUDENT PROMOTION
          </Typography>

          {/* Information Message */}
          <Alert severity="info" sx={{ mb: 2, bgcolor: '#fff3cd', color: '#856404' }}>
            Fee Change will only be applied between classes having monthly fee system
          </Alert>

          {/* Promotion Type Selection */}
          <Box sx={{ mb: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Promotion Type</FormLabel>
              <RadioGroup
                row
                value={promotionType}
                onChange={(e) => setPromotionType(e.target.value)}
              >
                <FormControlLabel value="promote" control={<Radio />} label="Promote" />
                <FormControlLabel value="transfer" control={<Radio />} label="Transfer" />
                <FormControlLabel value="passout" control={<Radio />} label="Pass Out" />
              </RadioGroup>
            </FormControl>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              *Only Enrolled Students Will Be Promote / Transfer / PassOut
            </Typography>
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

          <Grid container spacing={3}>
            {/* FROM Section */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  FROM
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Schools</InputLabel>
                      <Select
                        value={fromData.school}
                        onChange={(e) => {
                          setFromData({ ...fromData, school: e.target.value, schoolClass: '', section: '' });
                        }}
                        label="Schools"
                      >
                        {institutions.map((inst) => (
                          <MenuItem key={inst._id} value={inst._id}>
                            {inst.name} ({inst.code || ''})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>School Class</InputLabel>
                      <Select
                        value={fromData.schoolClass}
                        onChange={(e) => {
                          setFromData({ ...fromData, schoolClass: e.target.value, section: '' });
                        }}
                        label="School Class"
                      >
                        {classes.map((cls) => (
                          <MenuItem key={cls._id} value={cls._id}>
                            {capitalizeFirstOnly(cls.name || '')} ({cls.code || ''})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Group*</InputLabel>
                      <Select
                        value={fromData.group}
                        onChange={(e) => setFromData({ ...fromData, group: e.target.value })}
                        label="Group*"
                      >
                        <MenuItem value="">Select Groups</MenuItem>
                        {groups.map((grp) => (
                          <MenuItem key={grp._id} value={grp._id}>
                            {grp.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Section</InputLabel>
                      <Select
                        value={fromData.section}
                        onChange={(e) => setFromData({ ...fromData, section: e.target.value })}
                        label="Section"
                      >
                        <MenuItem value="">Select Section</MenuItem>
                        {sections.map((sec) => (
                          <MenuItem key={sec._id} value={sec._id}>
                            {sec.name} {sec.academicYear ? `(${sec.academicYear})` : ''} {sec.isActive ? 'Active' : 'Inactive'}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Remarks"
                      placeholder="Remarks"
                      value={fromData.remarks}
                      onChange={(e) => setFromData({ ...fromData, remarks: e.target.value })}
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* TO Section */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    TO
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handlePromote}
                    disabled={loading || selectedStudents.length === 0}
                    sx={{
                      bgcolor: '#0d6efd',
                      '&:hover': { bgcolor: '#0b5ed7' },
                    }}
                  >
                    {getActionButtonLabel()}
                  </Button>
                </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Schools</InputLabel>
                        <Select
                          value={toData.school}
                          onChange={(e) => {
                            setToData({ ...toData, school: e.target.value, schoolClass: '', section: '' });
                          }}
                          label="Schools"
                        >
                          <MenuItem value="">Select School</MenuItem>
                          {institutions.map((inst) => (
                            <MenuItem key={inst._id} value={inst._id}>
                              {inst.name} ({inst.code || ''})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>School Class</InputLabel>
                        <Select
                          value={toData.schoolClass}
                          onChange={(e) => {
                            setToData({ ...toData, schoolClass: e.target.value, section: '' });
                          }}
                          label="School Class"
                        >
                          <MenuItem value="">Select Class</MenuItem>
                          {classes.map((cls) => (
                            <MenuItem key={cls._id} value={cls._id}>
                              {capitalizeFirstOnly(cls.name || '')} ({cls.code || ''})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Section</InputLabel>
                        <Select
                          value={toData.section}
                          onChange={(e) => setToData({ ...toData, section: e.target.value })}
                          label="Section"
                        >
                          <MenuItem value="">Select Section</MenuItem>
                          {sections.map((sec) => (
                            <MenuItem key={sec._id} value={sec._id}>
                              {sec.name} {sec.academicYear ? `(${sec.academicYear})` : ''} {sec.isActive ? 'Active' : 'Inactive'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Group*</InputLabel>
                        <Select
                          value={toData.group}
                          onChange={(e) => setToData({ ...toData, group: e.target.value })}
                          label="Group*"
                        >
                          <MenuItem value="">Select Groups</MenuItem>
                          {groups.map((grp) => (
                            <MenuItem key={grp._id} value={grp._id}>
                              {grp.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

            {/* Get Students Button */}
            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleGetStudents}
                disabled={loading}
                sx={{
                  bgcolor: '#0d6efd',
                  '&:hover': { bgcolor: '#0b5ed7' },
                  height: '56px',
                }}
              >
                Get Students
              </Button>
            </Grid>
          </Grid>

          {/* Students Table */}
          {students.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Students List
                </Typography>
                <TextField
                  size="small"
                  placeholder="Q Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 300 }}
                />
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedStudents.length > 0 && selectedStudents.length < filteredStudents.length}
                          checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell><strong>ID</strong></TableCell>
                      <TableCell><strong>Roll Number</strong></TableCell>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Father Name</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Gender</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No students found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student._id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedStudents.includes(student._id)}
                              onChange={() => handleSelectStudent(student._id)}
                            />
                          </TableCell>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell>{student.rollNumber || 'N/A'}</TableCell>
                          <TableCell>{capitalizeFirstOnly(student.name || 'N/A')}</TableCell>
                          <TableCell>{capitalizeFirstOnly(student.fatherName || 'N/A')}</TableCell>
                          <TableCell>
                            <Chip
                              label={student.status}
                              size="small"
                              color={student.status === 'enrolled' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{student.category}</TableCell>
                          <TableCell>{student.gender}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedStudents.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                    {selectedStudents.length} student(s) selected
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handlePromote}
                    disabled={loading}
                    sx={{
                      bgcolor: '#0d6efd',
                      '&:hover': { bgcolor: '#0b5ed7' },
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : getActionButtonLabel()}
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default StudentPromotion;

