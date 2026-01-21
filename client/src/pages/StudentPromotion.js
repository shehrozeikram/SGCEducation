import React, { useState, useEffect, useCallback } from 'react';
import {
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
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  SwapHoriz,
  SchoolOutlined,
  History,
  Search,
  Refresh,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTablePagination } from '../hooks/useTablePagination';

import { getApiUrl } from '../config/api';

const StudentPromotion = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [students, setStudents] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [toClasses, setToClasses] = useState([]);
  const [toSections, setToSections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [history, setHistory] = useState([]);

  // Pagination
  const studentsPagination = useTablePagination(12);

  // Form states
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [fromInstitution, setFromInstitution] = useState('');
  const [fromClass, setFromClass] = useState('');
  const [fromSection, setFromSection] = useState('');
  const [fromGroup, setFromGroup] = useState('');
  const [fromAcademicYear, setFromAcademicYear] = useState('');
  const [toInstitution, setToInstitution] = useState('');
  const [toClass, setToClass] = useState('');
  const [toSection, setToSection] = useState('');
  const [toGroup, setToGroup] = useState('');
  const [toAcademicYear, setToAcademicYear] = useState('');
  const [remarks, setRemarks] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInstitution, setFilterInstitution] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterOperationType, setFilterOperationType] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      let url = `${getApiUrl('student-promotions')}?`;
      const params = new URLSearchParams();
      
      if (filterInstitution) params.append('institution', filterInstitution);
      if (filterOperationType) params.append('operationType', filterOperationType);
      
      url += params.toString();

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setHistory(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setHistory([]);
    }
  }, [filterInstitution, filterOperationType]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (fromInstitution) {
      fetchClasses(fromInstitution);
    }
  }, [fromInstitution]);

  useEffect(() => {
    if (toInstitution) {
      fetchToClasses(toInstitution);
    } else {
      setToClasses([]);
      setToSections([]);
    }
  }, [toInstitution]);

  useEffect(() => {
    if (fromClass && fromInstitution) {
      fetchSections(fromClass, fromInstitution);
    }
  }, [fromClass, fromInstitution]);

  useEffect(() => {
    if (toClass && toInstitution) {
      fetchToSections(toClass, toInstitution);
    } else {
      setToSections([]);
    }
  }, [toClass, toInstitution]);

  // Fetch classes for filter when institution changes
  useEffect(() => {
    if (filterInstitution) {
      fetchClasses(filterInstitution);
    } else {
      // If no institution filter, fetch classes for the default institution
      const institutionData = localStorage.getItem('selectedInstitution');
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          fetchClasses(institution._id);
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterInstitution]);

  // Reset pagination when search term or class filter changes
  useEffect(() => {
    studentsPagination.resetPagination();
  }, [searchTerm, filterClass]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const institutionData = localStorage.getItem('selectedInstitution');

      // Fetch institutions
      const instRes = await axios.get(getApiUrl('institutions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstitutions(instRes.data.data || []);

      // Set default institution if available
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          setFromInstitution(institution._id);
          setFilterInstitution(institution._id);
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      }

      // Fetch enrolled students
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const institutionData = localStorage.getItem('selectedInstitution');

      let url = `${getApiUrl('admissions')}?status=enrolled`;
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          url += `&institution=${institution._id}`;
        } catch (e) {
          console.error('Failed to parse institution data', e);
        }
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const studentsData = response.data.data || [];
      setStudents(studentsData);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchClasses = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${getApiUrl('classes')}?institution=${institutionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchToClasses = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${getApiUrl('classes')}?institution=${institutionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setToClasses(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch to classes:', err);
    }
  };

  const fetchSections = async (classId, institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${getApiUrl('sections')}?class=${classId}&institution=${institutionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSections(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    }
  };

  const fetchToSections = async (classId, institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${getApiUrl('sections')}?class=${classId}&institution=${institutionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setToSections(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch to sections:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSelectedStudents([]);
    resetForm();
  };

  const resetForm = () => {
    setFromClass('');
    setFromSection('');
    setFromGroup('');
    setFromAcademicYear('');
    setToInstitution('');
    setToClass('');
    setToSection('');
    setToGroup('');
    setToAcademicYear('');
    setRemarks('');
  };

  const handleStudentSelect = (admissionId) => {
    setSelectedStudents(prev => {
      if (prev.includes(admissionId)) {
        // If deselecting, clear form if no students remain
        const newSelection = prev.filter(id => id !== admissionId);
        if (newSelection.length === 0) {
          resetForm();
        } else if (newSelection.length === 1) {
          // If only one student remains, populate from that student
          const remainingStudent = students.find(s => s._id === newSelection[0]);
          if (remainingStudent) {
            populateFromFields(remainingStudent);
          }
        }
        return newSelection;
      } else {
        const newSelection = [...prev, admissionId];
        // Find the selected student's data
        const selectedStudent = students.find(s => s._id === admissionId);
        
        if (selectedStudent) {
          // Auto-fill "from" fields based on student's current admission
          populateFromFields(selectedStudent);
        }
        
        return newSelection;
      }
    });
  };

  const populateFromFields = (student) => {
    // Handle institution (can be object or ID)
    const institutionId = student.institution?._id || student.institution;
    if (institutionId) {
      setFromInstitution(institutionId);
    }
    
    // Handle class (can be object or ID)
    const classId = student.class?._id || student.class;
    if (classId) {
      setFromClass(classId);
    }
    
    // Handle section (can be object or ID)
    const sectionId = student.section?._id || student.section;
    if (sectionId) {
      setFromSection(sectionId);
    }
    
    // Handle group (can be object or ID)
    const groupId = student.group?._id || student.group;
    if (groupId) {
      setFromGroup(groupId);
    }
    
    // Handle academic year
    if (student.academicYear) {
      setFromAcademicYear(student.academicYear);
    } else if (student.studentId?.academicYear) {
      setFromAcademicYear(student.studentId.academicYear);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
      resetForm();
    } else {
      const allIds = filteredStudents.map(s => s._id);
      setSelectedStudents(allIds);
      // If only one student, populate from fields
      if (filteredStudents.length === 1) {
        populateFromFields(filteredStudents[0]);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }

    const operationTypes = ['promote', 'transfer', 'passout'];
    const promotionType = operationTypes[tabValue];

    if (promotionType === 'passout') {
      // For passout, we don't need 'to' details
      if (!fromInstitution || !fromClass || !fromSection) {
        setError('Please fill in all required fields');
        return;
      }
    } else {
      // For promote and transfer, we need 'to' details
      if (!fromInstitution || !fromClass || !fromSection || !toInstitution || !toClass || !toSection) {
        setError('Please fill in all required fields');
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');

      const payload = {
        promotionType,
        studentIds: selectedStudents,
        from: {
          institution: fromInstitution,
          class: fromClass,
          section: fromSection,
          group: fromGroup || undefined,
          academicYear: fromAcademicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        },
        to: promotionType !== 'passout' ? {
          institution: toInstitution,
          class: toClass,
          section: toSection,
          group: toGroup || undefined,
          academicYear: toAcademicYear || new Date().getFullYear() + 1 + '-' + (new Date().getFullYear() + 2),
        } : undefined,
        remarks: remarks || undefined,
      };

      const response = await axios.post(getApiUrl('student-promotions'), payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(response.data.message || 'Operation completed successfully');
      setSelectedStudents([]);
      resetForm();
      fetchStudents();
      fetchHistory();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process operation');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    // Filter by class if selected
    if (filterClass) {
      const studentClassId = student.class?._id || student.class;
      if (studentClassId?.toString() !== filterClass.toString()) {
        return false;
      }
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      // Get name from personalInfo (admission) or user (student)
      const name = (student.personalInfo?.name || student.studentId?.user?.name || '').toLowerCase();
      const enrollment = student.studentId?.enrollmentNumber?.toLowerCase() || '';
      const rollNumber = student.rollNumber?.toLowerCase() || '';
      
      return name.includes(searchLower) || 
             enrollment.includes(searchLower) || 
             rollNumber.includes(searchLower);
    }

    return true;
  });

  const getStatusColor = (status) => {
    const colors = {
      'enrolled': 'success',
      'transferred': 'warning',
      'graduated': 'info',
      'active': 'success',
    };
    return colors[status] || 'default';
  };

  const getOperationTypeLabel = (type) => {
    const labels = {
      'promote': 'Promote',
      'transfer': 'Transfer',
      'passout': 'Pass Out',
    };
    return labels[type] || type;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5', overflowX: 'hidden', mt: '64px' }}>
      <Box sx={{ mt: 3, mb: 3, flex: 1, px: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <Paper sx={{ p: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="#667eea">
              Student Promotion & Transfer
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Promote" icon={<TrendingUp />} iconPosition="start" />
              <Tab label="Transfer" icon={<SwapHoriz />} iconPosition="start" />
              <Tab label="Pass Out" icon={<SchoolOutlined />} iconPosition="start" />
              <Tab label="History" icon={<History />} iconPosition="start" />
            </Tabs>
          </Box>

          {tabValue < 3 && (
            <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              {/* Student Selection Section */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                  SELECT STUDENTS
                </Typography>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  variant="outlined"
                >
                  {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>

              {/* Filters: Class and Search */}
              <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Class</InputLabel>
                  <Select
                    value={filterClass}
                    label="Filter by Class"
                    onChange={(e) => setFilterClass(e.target.value)}
                  >
                    {classes.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>
                        {cls.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by name, enrollment, or roll number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ flexGrow: 1, minWidth: 250 }}
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
                <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                            indeterminate={selectedStudents.length > 0 && selectedStudents.length < filteredStudents.length}
                            onChange={handleSelectAll}
                            sx={{ 
                              color: 'white',
                              '&.Mui-checked': { color: 'white' },
                              '&.MuiCheckbox-indeterminate': { color: 'white' }
                            }}
                          />
                        </TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Enrollment</TableCell>
                        <TableCell>Roll No</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        const paginatedStudents = studentsPagination.getPaginatedData(filteredStudents);
                        if (paginatedStudents.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={6} align="center">
                                {searchTerm ? 'No students found matching your search' : 'No students found'}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return paginatedStudents.map((student) => (
                          <TableRow
                            key={student._id}
                            hover
                            selected={selectedStudents.includes(student._id)}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedStudents.includes(student._id)}
                                onChange={() => handleStudentSelect(student._id)}
                              />
                            </TableCell>
                            <TableCell>
                              {student.personalInfo?.name || student.studentId?.user?.name || 'N/A'}
                            </TableCell>
                            <TableCell>{student.studentId?.enrollmentNumber || '-'}</TableCell>
                            <TableCell>{student.rollNumber || '-'}</TableCell>
                            <TableCell>
                              {student.class?.name || '-'} / {student.section?.name || '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={student.status || 'enrolled'}
                                color={getStatusColor(student.status)}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                  {filteredStudents.length > 0 && (
                    <TablePagination
                      component="div"
                      count={filteredStudents.length}
                      page={studentsPagination.page}
                      onPageChange={studentsPagination.handleChangePage}
                      rowsPerPage={studentsPagination.rowsPerPage}
                      onRowsPerPageChange={studentsPagination.handleChangeRowsPerPage}
                      rowsPerPageOptions={studentsPagination.rowsPerPageOptions}
                      labelRowsPerPage="Rows per page:"
                    />
                  )}
                </TableContainer>
              )}

              {/* Promotion Details Section Below */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea', mb: 3 }}>
                  {tabValue === 0 ? 'PROMOTION DETAILS' : tabValue === 1 ? 'TRANSFER DETAILS' : 'PASS OUT DETAILS'}
                </Typography>

                    <Grid container spacing={2} sx={{ width: '100%', maxWidth: '100%' }}>
                      {/* From Section */}
                      <Grid item xs={12}>
                        <Divider sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">FROM</Typography>
                        </Divider>
                      </Grid>

                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Institution *</InputLabel>
                          <Select
                            value={fromInstitution}
                            label="Institution *"
                            onChange={(e) => setFromInstitution(e.target.value)}
                          >
                            {institutions.map((inst) => (
                              <MenuItem key={inst._id} value={inst._id}>
                                {inst.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Class *</InputLabel>
                          <Select
                            value={fromClass}
                            label="Class *"
                            onChange={(e) => setFromClass(e.target.value)}
                          >
                            {classes.map((cls) => (
                              <MenuItem key={cls._id} value={cls._id}>
                                {cls.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Section *</InputLabel>
                          <Select
                            value={fromSection}
                            label="Section *"
                            onChange={(e) => setFromSection(e.target.value)}
                          >
                            {sections.map((sec) => (
                              <MenuItem key={sec._id} value={sec._id}>
                                {sec.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Academic Year"
                          value={fromAcademicYear}
                          onChange={(e) => setFromAcademicYear(e.target.value)}
                          placeholder="2024-2025"
                        />
                      </Grid>

                      {/* To Section - Only for Promote and Transfer */}
                      {tabValue < 2 && (
                        <>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 2 }}>
                              <Typography variant="subtitle2" color="text.secondary">TO</Typography>
                            </Divider>
                          </Grid>

                          <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Institution *</InputLabel>
                              <Select
                                value={toInstitution}
                                label="Institution *"
                                onChange={(e) => {
                                  setToInstitution(e.target.value);
                                  setToClass('');
                                  setToSection('');
                                }}
                              >
                                {institutions.map((inst) => (
                                  <MenuItem key={inst._id} value={inst._id}>
                                    {inst.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Class *</InputLabel>
                              <Select
                                value={toClass}
                                label="Class *"
                                onChange={(e) => {
                                  setToClass(e.target.value);
                                  setToSection('');
                                }}
                                disabled={!toInstitution}
                              >
                                {toInstitution && toClasses.map((cls) => (
                                  <MenuItem key={cls._id} value={cls._id}>
                                    {cls.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Section *</InputLabel>
                              <Select
                                value={toSection}
                                label="Section *"
                                onChange={(e) => setToSection(e.target.value)}
                                disabled={!toClass}
                              >
                                {toClass && toSections.map((sec) => (
                                  <MenuItem key={sec._id} value={sec._id}>
                                    {sec.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Academic Year"
                              value={toAcademicYear}
                              onChange={(e) => setToAcademicYear(e.target.value)}
                              placeholder="2025-2026"
                            />
                          </Grid>
                        </>
                      )}

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Remarks"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          multiline
                          rows={3}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            onClick={resetForm}
                            disabled={loading}
                          >
                            Reset
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={loading || selectedStudents.length === 0}
                            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                          >
                            {loading ? 'Processing...' : tabValue === 0 ? 'Promote' : tabValue === 1 ? 'Transfer' : 'Pass Out'}
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
              </Box>
            </Box>
          )}

          {/* History Tab */}
          {tabValue === 3 && (
            <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Institution</InputLabel>
                  <Select
                    value={filterInstitution}
                    label="Institution"
                    onChange={(e) => setFilterInstitution(e.target.value)}
                  >
                    <MenuItem value="">All Institutions</MenuItem>
                    {institutions.map((inst) => (
                      <MenuItem key={inst._id} value={inst._id}>
                        {inst.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Operation Type</InputLabel>
                  <Select
                    value={filterOperationType}
                    label="Operation Type"
                    onChange={(e) => setFilterOperationType(e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="promote">Promote</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                    <MenuItem value="passout">Pass Out</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchHistory}
                >
                  Refresh
                </Button>
              </Box>

              <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Operation</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell>Performed By</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          {new Date(record.operationDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getOperationTypeLabel(record.operationType)}
                            color={
                              record.operationType === 'promote' ? 'success' :
                              record.operationType === 'transfer' ? 'warning' : 'info'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {record.student?.enrollmentNumber || record.student?.rollNumber || '-'}
                        </TableCell>
                        <TableCell>
                          {record.from?.institution?.name || '-'} / {record.from?.class?.name || '-'} / {record.from?.section?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {record.to?.institution?.name || '-'} / {record.to?.class?.name || '-'} / {record.to?.section?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {record.performedBy?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {record.remarks || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {history.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No history found
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default StudentPromotion;
