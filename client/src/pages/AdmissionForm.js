import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add,
  Search,
  Close,
  Print,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { createAdmission, updateAdmission, getAdmissionById } from '../services/admissionService';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const user = JSON.parse(localStorage.getItem('user') || '{}');

const createInitialFormData = (userCtx) => ({
  // Basic Info
  class: '',
  section: '',
  group: '',
  admissionDate: new Date().toISOString().split('T')[0],
  studentName: '',
  fatherName: '',
  dateOfBirth: '',
  rollNumber: '',
  religion: 'Islam',
  gender: 'Male',
  admEffectNo: new Date().toISOString().split('T')[0],
  markAsEnrolled: false,
  orphan: 'NO',
  studentPicture: null,

  // Address - Present
  presentAddress: {
    address: '',
    country: 'Pakistan',
    city: 'Sialkot',
  },
  // Address - Permanent
  permanentAddress: {
    address: '',
    country: 'Pakistan',
    city: 'Sialkot',
  },

  // Guardian - Father
  father: {
    name: '',
    cnic: '',
    mobileNumber: '',
    mobileOperator: 'Jazz',
    forApplicationLogin: false,
    forSMS: false,
    forWhatsappSMS: false,
    phoneNumberOffice: '',
    whatsappMobileNumber: '',
    occupation: '',
    emailAddress: '',
  },
  // Guardian - Mother
  mother: {
    name: '',
    cnic: '',
    mobileNumber: '',
    mobileOperator: 'Jazz',
    forApplicationLogin: false,
    forSMS: false,
    forWhatsappSMS: false,
    phoneNumberOffice: '',
    whatsappMobileNumber: '',
    occupation: '',
    emailAddress: '',
  },
  // Guardian - Guardian
  guardian: {
    name: '',
    cnic: '',
    mobileNumber: '',
    mobileOperator: 'Jazz',
    forApplicationLogin: false,
    forSMS: false,
    forWhatsappSMS: false,
    phoneNumberOffice: '',
    whatsappMobileNumber: '',
    occupation: '',
    emailAddress: '',
    relation: '',
  },

  // Backend required fields (hidden)
  institution: userCtx.institution 
    ? (typeof userCtx.institution === 'object' ? userCtx.institution._id : userCtx.institution)
    : '',
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  program: '',
});

const AdmissionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Address tab state
  const [addressTab, setAddressTab] = useState(0);
  // Guardian tab state
  const [guardianTab, setGuardianTab] = useState(0);
  
  // Dropdown data
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [religions, setReligions] = useState(['Islam', 'Christianity', 'Hinduism', 'Sikhism', 'Buddhism', 'Other']);
  const [countries, setCountries] = useState(['Pakistan', 'Bangladesh', 'Other']);
  const [cities, setCities] = useState(['Sialkot', 'Lahore', 'Karachi', 'Islamabad', 'Other']);
  const [mobileOperators, setMobileOperators] = useState(['Jazz', 'Telenor', 'Ufone', 'Zong', 'Warid']);
  
  // Dialog states for adding new items
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', code: '' });
  const [newSection, setNewSection] = useState({ name: '', code: '' });
  const [newGroup, setNewGroup] = useState({ name: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  const [formData, setFormData] = useState(() => createInitialFormData(user));

  useEffect(() => {
    fetchClasses();
    fetchSections();
    fetchGroups();
    if (isEditMode) {
      fetchAdmissionData();
    }
  }, [id]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      
      // For super_admin, include institution filter if available
      if (isSuperAdmin && user.institution) {
        const institutionId = typeof user.institution === 'object' ? user.institution._id : user.institution;
        if (institutionId) {
          params.institution = institutionId;
        }
      }
      
      const response = await axios.get('http://localhost:5000/api/v1/classes', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setClasses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes. Please refresh the page.');
    }
  };

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      
      // For super_admin, include institution filter if available
      if (isSuperAdmin && user.institution) {
        const institutionId = typeof user.institution === 'object' ? user.institution._id : user.institution;
        if (institutionId) {
          params.institution = institutionId;
        }
      }
      
      const response = await axios.get('http://localhost:5000/api/v1/sections', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setSections(response.data.data || []);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError('Failed to load sections. Please refresh the page.');
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

  const handlePrintBlankForm = () => {
    const saved = formData;
    setFormData(createInitialFormData(user));
    setTimeout(() => {
      window.print();
      setFormData(saved);
    }, 150);
  };

  // Format CNIC with dashes (XXXXX-XXXXXXX-X)
  const formatCNIC = (value) => {
    if (!value) return '';
    // Remove all non-digits
    const digits = value.toString().replace(/\D/g, '');
    
    // Limit to 13 digits
    const limited = digits.slice(0, 13);
    
    // Format with dashes
    if (limited.length <= 5) {
      return limited;
    } else if (limited.length <= 12) {
      return `${limited.slice(0, 5)}-${limited.slice(5)}`;
    } else {
      return `${limited.slice(0, 5)}-${limited.slice(5, 12)}-${limited.slice(12)}`;
    }
  };

  // Strip dashes from CNIC
  const stripCNIC = (value) => {
    if (!value) return '';
    return value.toString().replace(/\D/g, '');
  };

  // Validate CNIC format
  const validateCNIC = (value) => {
    if (!value) return true; // Allow empty (optional field)
    const digits = stripCNIC(value);
    return digits.length === 13;
  };

  const fetchAdmissionData = async () => {
    try {
      setLoading(true);
      const response = await getAdmissionById(id);
      const admission = response.data;
      // Map backend data to form structure
      setFormData(prev => ({
        ...prev,
        class: admission.class?._id || '',
        section: admission.section?._id || '',
        group: admission.group?._id || '',
        admissionDate: admission.admissionDate || prev.admissionDate,
        // Use the name field from personalInfo
        studentName: admission.personalInfo.name || '',
        fatherName: admission.guardianInfo?.fatherName || '',
        dateOfBirth: admission.personalInfo.dateOfBirth ? new Date(admission.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
        rollNumber: admission.rollNumber || '',
        religion: admission.personalInfo.religion || 'Islam',
        gender: admission.personalInfo.gender || 'Male',
        institution: admission.institution._id,
        academicYear: admission.academicYear,
        program: admission.program,
        father: {
          ...prev.father,
          name: admission.guardianInfo?.fatherName || '',
          occupation: admission.guardianInfo?.fatherOccupation || '',
          mobileNumber: admission.guardianInfo?.fatherPhone || '',
          cnic: admission.guardianInfo?.fatherCnic ? formatCNIC(admission.guardianInfo.fatherCnic) : '',
        },
        mother: {
          ...prev.mother,
          name: admission.guardianInfo?.motherName || '',
          occupation: admission.guardianInfo?.motherOccupation || '',
          mobileNumber: admission.guardianInfo?.motherPhone || '',
          cnic: admission.guardianInfo?.motherCnic ? formatCNIC(admission.guardianInfo.motherCnic) : '',
        },
        guardian: {
          ...prev.guardian,
          name: admission.guardianInfo?.guardianName || '',
          relation: admission.guardianInfo?.guardianRelation || '',
          mobileNumber: admission.guardianInfo?.guardianPhone || '',
          emailAddress: admission.guardianInfo?.guardianEmail || '',
          cnic: admission.guardianInfo?.guardianCnic ? formatCNIC(admission.guardianInfo.guardianCnic) : '',
        },
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admission data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Reset section when class changes
      if (field === 'class') {
        updated.section = '';
      }
      return updated;
    });
  };

  const handleNestedChange = (section, field, value) => {
    // Special handling for CNIC fields
    if (field === 'cnic') {
      const formatted = formatCNIC(value);
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: formatted,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, studentPicture: file }));
    }
  };

  const handleAddClass = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Build payload without empty/invalid fields
      const payload = {
        name: newClass.name,
        code: newClass.code,
        institution: user.institution || undefined,
        academicYear: formData.academicYear,
        // Note: group, and feeType are required by the backend
        // For now, we'll use placeholder values or require the user to add them via the Classes page
      };
      
      const response = await axios.post(
        'http://localhost:5000/api/v1/classes',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClasses([...classes, response.data.data]);
      setFormData(prev => ({ ...prev, class: response.data.data._id }));
      setClassDialogOpen(false);
      setNewClass({ name: '', code: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add class');
    }
  };

  const handleAddSection = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/v1/sections',
        {
          name: newSection.name,
          code: newSection.code,
          class: formData.class,
          institution: user.institution || undefined,
          academicYear: formData.academicYear,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSections([...sections, response.data.data]);
      setFormData(prev => ({ ...prev, section: response.data.data._id }));
      setSectionDialogOpen(false);
      setNewSection({ name: '', code: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add section');
    }
  };

  const handleAddGroup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/v1/groups',
        {
          name: newGroup.name,
          institution: user.institution || undefined,
          academicYear: formData.academicYear,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGroups([...groups, response.data.data]);
      setFormData(prev => ({ ...prev, group: response.data.data._id }));
      setGroupDialogOpen(false);
      setNewGroup({ name: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add group');
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Map form data to backend structure
      // We only have a single "Name" field, so store it directly in personalInfo.name
      const name = formData.studentName.trim();

      // Get institution ID - use formData if super admin and it's set, otherwise use user's institution
      let institutionId;
      if (isSuperAdmin && formData.institution) {
        institutionId = formData.institution;
      } else {
        // For non-super admins, always use user's institution
        institutionId = typeof user.institution === 'object' && user.institution?._id 
          ? user.institution._id 
          : user.institution;
      }

      if (!institutionId) {
        setError('Institution is required. Please contact administrator.');
        setLoading(false);
        return;
      }

      const admissionData = {
        institution: institutionId,
        academicYear: formData.academicYear,
        program: formData.program || 'General',
        class: formData.class || undefined,
        section: formData.section || undefined,
        rollNumber: formData.rollNumber || undefined,
        personalInfo: {
          name,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender.toLowerCase(),
          nationality: 'Pakistani',
          religion: formData.religion,
        },
        contactInfo: {
          email: formData.father.emailAddress || formData.mother.emailAddress || '',
          phone: formData.father.mobileNumber || formData.mother.mobileNumber || '',
          alternatePhone: formData.father.whatsappMobileNumber || '',
          currentAddress: {
            street: formData.presentAddress.address,
            city: formData.presentAddress.city,
            country: formData.presentAddress.country,
          },
          permanentAddress: {
            street: formData.permanentAddress.address,
            city: formData.permanentAddress.city,
            country: formData.permanentAddress.country,
          },
        },
        guardianInfo: {
          fatherName: formData.fatherName || formData.father.name,
          fatherOccupation: formData.father.occupation,
          fatherPhone: formData.father.mobileNumber,
          fatherCnic: formData.father.cnic ? stripCNIC(formData.father.cnic) : '',
          motherName: formData.mother.name,
          motherOccupation: formData.mother.occupation,
          motherPhone: formData.mother.mobileNumber,
          motherCnic: formData.mother.cnic ? stripCNIC(formData.mother.cnic) : '',
          guardianName: formData.guardian.name,
          guardianRelation: formData.guardian.relation,
          guardianPhone: formData.guardian.mobileNumber,
          guardianEmail: formData.guardian.emailAddress,
          guardianCnic: formData.guardian.cnic ? stripCNIC(formData.guardian.cnic) : '',
        },
      };

      if (isEditMode) {
        await updateAdmission(id, admissionData);
        setSuccess('Admission updated successfully');
      } else {
        await createAdmission(admissionData);
        setSuccess('Admission application submitted successfully');
      }

      setTimeout(() => {
        navigate('/admissions');
      }, 2000);
    } catch (err) {
      // Extract detailed error message from backend
      let errorMessage = 'Failed to submit admission';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.message) {
          errorMessage = errorData.message;
          
          // Parse Mongoose validation errors from message
          // Format: "ValidationError: Admission validation failed: personalInfo.name: Please provide name"
          if (errorMessage.includes('validation failed')) {
            // Extract the actual field error message
            const match = errorMessage.match(/: ([^:]+): (.+)$/);
            if (match) {
              const field = match[1].replace(/personalInfo\.|guardianInfo\.|contactInfo\./g, '');
              errorMessage = `${field}: ${match[2]}`;
            }
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <Box>
        <TopBar title={isEditMode ? 'Edit Admission' : 'New Admission'} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title={isEditMode ? 'Edit Admission' : 'New Admission'} />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} mb={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <Button startIcon={<ArrowBack />} onClick={() => navigate('/admissions')} sx={{ mr: 2 }}>
                Back
              </Button>
              <Typography variant="h4" fontWeight="bold">
                {isEditMode ? 'Edit Admission' : 'New Admission'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="error"
              startIcon={<Print />}
              onClick={handlePrintBlankForm}
            >
              Print Blank Form
            </Button>
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
            {/* BASIC INFO Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                BASIC INFO
              </Typography>
              
              <Grid container spacing={2}>
                {/* Row 1 */}
                <Grid item xs={12} md={3}>
                  <Box display="flex" gap={1}>
                    <FormControl fullWidth required>
                      <InputLabel>CLASS*</InputLabel>
                      <Select
                        value={formData.class}
                        onChange={(e) => handleChange('class', e.target.value)}
                        label="CLASS*"
                      >
                        <MenuItem value="">Select Class</MenuItem>
                        {classes.map((cls) => (
                          <MenuItem key={cls._id} value={cls._id}>
                            {capitalizeFirstOnly(cls.name || '')}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {/* Add Class button removed - classes must be created via Classes page with all required fields (group, feeType) */}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Box display="flex" gap={1}>
                    <FormControl fullWidth required>
                      <InputLabel>SECTION*</InputLabel>
                      <Select
                        value={formData.section}
                        onChange={(e) => handleChange('section', e.target.value)}
                        label="SECTION*"
                        disabled={!formData.class}
                      >
                        <MenuItem value="">Select Section</MenuItem>
                        {sections
                          .filter(sec => {
                            if (!formData.class) return false;
                            // Handle both populated object and string ID
                            const sectionClassId = sec.class?._id || sec.class;
                            return String(sectionClassId) === String(formData.class);
                          })
                          .map((section) => (
                            <MenuItem key={section._id} value={section._id}>
                              {capitalizeFirstOnly(section.name || '')} ({section.academicYear}) (Stds: {section.stats?.totalStudents || 0}) {section.isActive ? 'Active' : 'Inactive'}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    {/* Add Section button removed - sections must be created via Sections page */}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Box display="flex" gap={1}>
                    <FormControl fullWidth required>
                      <InputLabel>GROUP*</InputLabel>
                      <Select
                        value={formData.group}
                        onChange={(e) => handleChange('group', e.target.value)}
                        label="GROUP*"
                      >
                        <MenuItem value="">Select Groups</MenuItem>
                        {groups.map((group) => (
                          <MenuItem key={group._id} value={group._id}>
                            {group.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {/* Add Group button removed - groups must be created via Groups page */}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    required
                    label="ADMISSION DATE*"
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => handleChange('admissionDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Row 2 */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    required
                    label="STUDENT NAME*"
                    value={formData.studentName}
                    onChange={(e) => handleChange('studentName', e.target.value)}
                    placeholder="Student Name"
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    required
                    label="FATHER NAME*"
                    value={formData.fatherName}
                    onChange={(e) => handleChange('fatherName', e.target.value)}
                    placeholder="Father Name"
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    required
                    label="DATE OF BIRTH*"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Row 3 */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="ROLL NUMBER"
                    value={formData.rollNumber}
                    onChange={(e) => handleChange('rollNumber', e.target.value)}
                    placeholder="Roll Number"
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth required>
                    <InputLabel>RELIGION*</InputLabel>
                    <Select
                      value={formData.religion}
                      onChange={(e) => handleChange('religion', e.target.value)}
                      label="RELIGION*"
                    >
                      {religions.map((rel) => (
                        <MenuItem key={rel} value={rel}>
                          {rel}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth required>
                    <InputLabel>GENDER*</InputLabel>
                    <Select
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      label="GENDER*"
                    >
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Row 4 */}
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    required
                    label="ADM EFFCT NO*"
                    type="date"
                    value={formData.admEffectNo}
                    onChange={(e) => handleChange('admEffectNo', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.markAsEnrolled}
                        onChange={(e) => handleChange('markAsEnrolled', e.target.checked)}
                      />
                    }
                    label="MARK AS ENROLLED"
                  />
                </Grid>

                {/* Row 5 */}
                <Grid item xs={12} md={3}>
                  <FormControl component="fieldset">
                    <Typography variant="body2" sx={{ mb: 1 }}>ORPHAN</Typography>
                    <RadioGroup
                      row
                      value={formData.orphan}
                      onChange={(e) => handleChange('orphan', e.target.value)}
                    >
                      <FormControlLabel value="YES" control={<Radio />} label="YES" />
                      <FormControlLabel value="NO" control={<Radio />} label="NO" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>STUDENT PICTURE</Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                    >
                      Choose File
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </Button>
                    {formData.studentPicture && (
                      <Typography variant="caption" color="text.secondary">
                        {formData.studentPicture.name}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                
              </Grid>
            </Box>

            {/* ADDRESS Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                ADDRESS
              </Typography>
              
              <Tabs value={addressTab} onChange={(e, newValue) => setAddressTab(newValue)} sx={{ mb: 2 }}>
                <Tab label="Present" />
                <Tab label="Permanent" />
              </Tabs>
              
              {addressTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="STUDENT ADDRESS"
                      value={formData.presentAddress.address}
                      onChange={(e) => handleNestedChange('presentAddress', 'address', e.target.value)}
                      placeholder="Student Address"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>COUNTRY</InputLabel>
                      <Select
                        value={formData.presentAddress.country}
                        onChange={(e) => handleNestedChange('presentAddress', 'country', e.target.value)}
                        label="COUNTRY"
                      >
                        {countries.map((country) => (
                          <MenuItem key={country} value={country}>
                            {country}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>CITY</InputLabel>
                      <Select
                        value={formData.presentAddress.city}
                        onChange={(e) => handleNestedChange('presentAddress', 'city', e.target.value)}
                        label="CITY"
                      >
                        {cities.map((city) => (
                          <MenuItem key={city} value={city}>
                            {city}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}
              
              {addressTab === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="STUDENT ADDRESS"
                      value={formData.permanentAddress.address}
                      onChange={(e) => handleNestedChange('permanentAddress', 'address', e.target.value)}
                      placeholder="Student Address"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>COUNTRY</InputLabel>
                      <Select
                        value={formData.permanentAddress.country}
                        onChange={(e) => handleNestedChange('permanentAddress', 'country', e.target.value)}
                        label="COUNTRY"
                      >
                        {countries.map((country) => (
                          <MenuItem key={country} value={country}>
                            {country}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>CITY</InputLabel>
                      <Select
                        value={formData.permanentAddress.city}
                        onChange={(e) => handleNestedChange('permanentAddress', 'city', e.target.value)}
                        label="CITY"
                      >
                        {cities.map((city) => (
                          <MenuItem key={city} value={city}>
                            {city}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}
            </Box>

            {/* GUARDIAN Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                GUARDIAN
              </Typography>
              
              <Tabs value={guardianTab} onChange={(e, newValue) => setGuardianTab(newValue)} sx={{ mb: 2 }}>
                <Tab label="Father" />
                <Tab label="Mother" />
                <Tab label="Guardian" />
              </Tabs>
              
              {guardianTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="FATHER NAME*"
                      value={formData.father.name}
                      onChange={(e) => handleNestedChange('father', 'name', e.target.value)}
                      placeholder="Father Name"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="FATHER CNIC"
                      value={formData.father.cnic}
                      onChange={(e) => handleNestedChange('father', 'cnic', e.target.value)}
                      placeholder="XXXXX-XXXXXXX-X"
                      inputProps={{ maxLength: 15 }}
                      error={formData.father.cnic && !validateCNIC(formData.father.cnic)}
                      helperText={formData.father.cnic && !validateCNIC(formData.father.cnic) ? 'CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)' : ''}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="MOBILE NUMBER"
                      value={formData.father.mobileNumber}
                      onChange={(e) => handleNestedChange('father', 'mobileNumber', e.target.value)}
                      placeholder="e.g: 923001234567"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>MOBILE OPERATOR</InputLabel>
                      <Select
                        value={formData.father.mobileOperator}
                        onChange={(e) => handleNestedChange('father', 'mobileOperator', e.target.value)}
                        label="MOBILE OPERATOR"
                      >
                        {mobileOperators.map((op) => (
                          <MenuItem key={op} value={op}>
                            {op}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" gap={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.father.forApplicationLogin}
                            onChange={(e) => handleNestedChange('father', 'forApplicationLogin', e.target.checked)}
                          />
                        }
                        label="FOR APPLICATION LOGIN"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.father.forSMS}
                            onChange={(e) => handleNestedChange('father', 'forSMS', e.target.checked)}
                          />
                        }
                        label="FOR SMS"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.father.forWhatsappSMS}
                            onChange={(e) => handleNestedChange('father', 'forWhatsappSMS', e.target.checked)}
                          />
                        }
                        label="FOR WHATSAPP SMS"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="PHONE NUMBER OFFICE"
                      value={formData.father.phoneNumberOffice}
                      onChange={(e) => handleNestedChange('father', 'phoneNumberOffice', e.target.value)}
                      placeholder="Phone Number Office"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="WHATSAPP MOBILE NUMBER"
                      value={formData.father.whatsappMobileNumber}
                      onChange={(e) => handleNestedChange('father', 'whatsappMobileNumber', e.target.value)}
                      placeholder="Whatsapp Mobile Number"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="FATHER OCCUPATION"
                      value={formData.father.occupation}
                      onChange={(e) => handleNestedChange('father', 'occupation', e.target.value)}
                      placeholder="Father Occupation"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="EMAIL ADDRESS"
                      type="email"
                      value={formData.father.emailAddress}
                      onChange={(e) => handleNestedChange('father', 'emailAddress', e.target.value)}
                      placeholder="abc@example.com"
                    />
                  </Grid>
                </Grid>
              )}
              
              {guardianTab === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="MOTHER NAME"
                      value={formData.mother.name}
                      onChange={(e) => handleNestedChange('mother', 'name', e.target.value)}
                      placeholder="Mother Name"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="MOTHER CNIC"
                      value={formData.mother.cnic}
                      onChange={(e) => handleNestedChange('mother', 'cnic', e.target.value)}
                      placeholder="XXXXX-XXXXXXX-X"
                      inputProps={{ maxLength: 15 }}
                      error={formData.mother.cnic && !validateCNIC(formData.mother.cnic)}
                      helperText={formData.mother.cnic && !validateCNIC(formData.mother.cnic) ? 'CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)' : ''}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="MOBILE NUMBER"
                      value={formData.mother.mobileNumber}
                      onChange={(e) => handleNestedChange('mother', 'mobileNumber', e.target.value)}
                      placeholder="e.g: 923001234567"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>MOBILE OPERATOR</InputLabel>
                      <Select
                        value={formData.mother.mobileOperator}
                        onChange={(e) => handleNestedChange('mother', 'mobileOperator', e.target.value)}
                        label="MOBILE OPERATOR"
                      >
                        {mobileOperators.map((op) => (
                          <MenuItem key={op} value={op}>
                            {op}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" gap={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.mother.forApplicationLogin}
                            onChange={(e) => handleNestedChange('mother', 'forApplicationLogin', e.target.checked)}
                          />
                        }
                        label="FOR APPLICATION LOGIN"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.mother.forSMS}
                            onChange={(e) => handleNestedChange('mother', 'forSMS', e.target.checked)}
                          />
                        }
                        label="FOR SMS"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.mother.forWhatsappSMS}
                            onChange={(e) => handleNestedChange('mother', 'forWhatsappSMS', e.target.checked)}
                          />
                        }
                        label="FOR WHATSAPP SMS"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="PHONE NUMBER OFFICE"
                      value={formData.mother.phoneNumberOffice}
                      onChange={(e) => handleNestedChange('mother', 'phoneNumberOffice', e.target.value)}
                      placeholder="Phone Number Office"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="WHATSAPP MOBILE NUMBER"
                      value={formData.mother.whatsappMobileNumber}
                      onChange={(e) => handleNestedChange('mother', 'whatsappMobileNumber', e.target.value)}
                      placeholder="Whatsapp Mobile Number"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="MOTHER OCCUPATION"
                      value={formData.mother.occupation}
                      onChange={(e) => handleNestedChange('mother', 'occupation', e.target.value)}
                      placeholder="Mother Occupation"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="EMAIL ADDRESS"
                      type="email"
                      value={formData.mother.emailAddress}
                      onChange={(e) => handleNestedChange('mother', 'emailAddress', e.target.value)}
                      placeholder="abc@example.com"
                    />
                  </Grid>
                </Grid>
              )}
              
              {guardianTab === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="GUARDIAN NAME"
                      value={formData.guardian.name}
                      onChange={(e) => handleNestedChange('guardian', 'name', e.target.value)}
                      placeholder="Guardian Name"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="RELATION"
                      value={formData.guardian.relation}
                      onChange={(e) => handleNestedChange('guardian', 'relation', e.target.value)}
                      placeholder="Relation"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="GUARDIAN CNIC"
                      value={formData.guardian.cnic}
                      onChange={(e) => handleNestedChange('guardian', 'cnic', e.target.value)}
                      placeholder="XXXXX-XXXXXXX-X"
                      inputProps={{ maxLength: 15 }}
                      error={formData.guardian.cnic && !validateCNIC(formData.guardian.cnic)}
                      helperText={formData.guardian.cnic && !validateCNIC(formData.guardian.cnic) ? 'CNIC must be 13 digits (format: XXXXX-XXXXXXX-X)' : ''}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="MOBILE NUMBER"
                      value={formData.guardian.mobileNumber}
                      onChange={(e) => handleNestedChange('guardian', 'mobileNumber', e.target.value)}
                      placeholder="e.g: 923001234567"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>MOBILE OPERATOR</InputLabel>
                      <Select
                        value={formData.guardian.mobileOperator}
                        onChange={(e) => handleNestedChange('guardian', 'mobileOperator', e.target.value)}
                        label="MOBILE OPERATOR"
                      >
                        {mobileOperators.map((op) => (
                          <MenuItem key={op} value={op}>
                            {op}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" gap={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.guardian.forApplicationLogin}
                            onChange={(e) => handleNestedChange('guardian', 'forApplicationLogin', e.target.checked)}
                          />
                        }
                        label="FOR APPLICATION LOGIN"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.guardian.forSMS}
                            onChange={(e) => handleNestedChange('guardian', 'forSMS', e.target.checked)}
                          />
                        }
                        label="FOR SMS"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.guardian.forWhatsappSMS}
                            onChange={(e) => handleNestedChange('guardian', 'forWhatsappSMS', e.target.checked)}
                          />
                        }
                        label="FOR WHATSAPP SMS"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="PHONE NUMBER OFFICE"
                      value={formData.guardian.phoneNumberOffice}
                      onChange={(e) => handleNestedChange('guardian', 'phoneNumberOffice', e.target.value)}
                      placeholder="Phone Number Office"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="WHATSAPP MOBILE NUMBER"
                      value={formData.guardian.whatsappMobileNumber}
                      onChange={(e) => handleNestedChange('guardian', 'whatsappMobileNumber', e.target.value)}
                      placeholder="Whatsapp Mobile Number"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="GUARDIAN OCCUPATION"
                      value={formData.guardian.occupation}
                      onChange={(e) => handleNestedChange('guardian', 'occupation', e.target.value)}
                      placeholder="Guardian Occupation"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="EMAIL ADDRESS"
                      type="email"
                      value={formData.guardian.emailAddress}
                      onChange={(e) => handleNestedChange('guardian', 'emailAddress', e.target.value)}
                      placeholder="abc@example.com"
                    />
                  </Grid>
                </Grid>
              )}
            </Box>

            {/* Save Button */}
            <Box display="flex" justifyContent="flex-end" mt={4}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  px: 4,
                }}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Add Class Dialog */}
      <Dialog open={classDialogOpen} onClose={() => setClassDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Class</Typography>
            <IconButton onClick={() => setClassDialogOpen(false)} size="small">
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
                label="Class Name"
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Class Code"
                value={newClass.code}
                onChange={(e) => setNewClass({ ...newClass, code: e.target.value.toUpperCase() })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddClass} variant="contained">Add Class</Button>
        </DialogActions>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={sectionDialogOpen} onClose={() => setSectionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Section</Typography>
            <IconButton onClick={() => setSectionDialogOpen(false)} size="small">
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
                label="Section Name"
                value={newSection.name}
                onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Section Code"
                value={newSection.code}
                onChange={(e) => setNewSection({ ...newSection, code: e.target.value.toUpperCase() })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSection} variant="contained" disabled={!formData.class}>Add Section</Button>
        </DialogActions>
      </Dialog>

      {/* Add Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Add New Group</Typography>
            <IconButton onClick={() => setGroupDialogOpen(false)} size="small">
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
                label="Group Name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddGroup} variant="contained">Add Group</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AdmissionForm;
