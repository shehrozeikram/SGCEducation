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
  Person,
  Home,
  FamilyRestroom,
  School,
  CalendarToday,
  PhotoCamera,
  LocationOn,
  Phone,
  Email,
  Work,
  AccountCircle,
  Info,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { createAdmission, updateAdmission, getAdmissionById, updateAdmissionStatus, approveAndEnroll } from '../services/admissionService';
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

  // Helper function to get institution ID from various sources
  const getInstitutionId = () => {
    // First priority: selectedInstitution from localStorage (navbar selection)
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
        // If it's not JSON, it might be a plain string ID
        return selectedInstitutionStr;
      }
    }
    
    // Second priority: user.institution (extract _id if it's an object)
    if (user.institution) {
      return typeof user.institution === 'object' ? user.institution._id : user.institution;
    }
    
    return null;
  };

  const [formData, setFormData] = useState(() => {
    const initialData = createInitialFormData(user);
    // Override institution with selected institution from navbar if available
    const institutionId = getInstitutionId();
    if (institutionId) {
      initialData.institution = institutionId;
    }
    return initialData;
  });

  useEffect(() => {
    if (isEditMode) {
      // For edit/view mode: fetch admission data first, then fetch dropdowns with correct institution
      fetchAdmissionDataAndDropdowns();
    } else {
      // For new admission: fetch dropdowns with current institution
      fetchClasses();
      fetchSections();
      fetchGroups();
    }
    
    // Update institution when selectedInstitution changes
    const handleStorageChange = () => {
      const institutionId = getInstitutionId();
      if (institutionId && !isEditMode) {
        setFormData(prev => ({ ...prev, institution: institutionId }));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('institutionChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('institutionChanged', handleStorageChange);
    };
  }, [id, isEditMode]);

  const fetchClasses = async () => {
    const institutionId = getInstitutionId();
    return fetchClassesWithInstitution(institutionId);
  };

  const fetchSections = async () => {
    const institutionId = getInstitutionId();
    return fetchSectionsWithInstitution(institutionId);
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

  // Fetch classes with specific institution
  const fetchClassesWithInstitution = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      
      if (institutionId) {
        params.institution = institutionId;
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

  // Fetch sections with specific institution
  const fetchSectionsWithInstitution = async (institutionId) => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      
      if (institutionId) {
        params.institution = institutionId;
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

  // Fetch admission data and then fetch dropdowns with the correct institution
  const fetchAdmissionDataAndDropdowns = async () => {
    try {
      setLoading(true);
      const response = await getAdmissionById(id);
      const admission = response.data;
      
      // Get institution from admission (prioritize admission's institution)
      const admissionInstitutionId = admission.institution?._id || admission.institution;
      const institutionId = admissionInstitutionId || getInstitutionId();
      
      // Fetch dropdowns with the admission's institution
      await Promise.all([
        fetchClassesWithInstitution(institutionId),
        fetchSectionsWithInstitution(institutionId),
        fetchGroups()
      ]);
      
      // Map backend data to form structure
      // If studentId exists (enrolled), prefer data from Student model, otherwise use Admission model
      const student = admission.studentId;
      const guardianInfo = student?.guardianInfo || admission.guardianInfo;
      
      setFormData(prev => ({
        ...prev,
        class: admission.class?._id || admission.class || '',
        section: admission.section?._id || admission.section || student?.section || '',
        // Group comes from the class if available
        group: admission.class?.group?._id || admission.class?.group || admission.group?._id || admission.group || '',
        admissionDate: admission.admissionDate ? new Date(admission.admissionDate).toISOString().split('T')[0] : prev.admissionDate,
        // Use the name field from personalInfo
        studentName: admission.personalInfo?.name || '',
        fatherName: guardianInfo?.fatherName || '',
        dateOfBirth: admission.personalInfo?.dateOfBirth ? new Date(admission.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
        // Roll number comes from Student model if enrolled, otherwise empty
        rollNumber: student?.rollNumber || prev.rollNumber || '',
        religion: admission.personalInfo?.religion || 'Islam',
        gender: admission.personalInfo?.gender ? admission.personalInfo.gender.charAt(0).toUpperCase() + admission.personalInfo.gender.slice(1) : 'Male',
        admEffectNo: admission.admissionDate ? new Date(admission.admissionDate).toISOString().split('T')[0] : prev.admEffectNo,
        institution: admission.institution?._id || admission.institution || prev.institution,
        academicYear: admission.academicYear || student?.academicYear || prev.academicYear,
        program: admission.program || student?.program || prev.program,
        // Address - Present (from currentAddress)
        presentAddress: {
          address: admission.contactInfo?.currentAddress?.street || '',
          country: admission.contactInfo?.currentAddress?.country || 'Pakistan',
          city: admission.contactInfo?.currentAddress?.city || 'Sialkot',
        },
        // Address - Permanent (from permanentAddress)
        permanentAddress: {
          address: admission.contactInfo?.permanentAddress?.street || '',
          country: admission.contactInfo?.permanentAddress?.country || 'Pakistan',
          city: admission.contactInfo?.permanentAddress?.city || 'Sialkot',
        },
        father: {
          ...prev.father,
          name: guardianInfo?.fatherName || '',
          occupation: guardianInfo?.fatherOccupation || '',
          mobileNumber: guardianInfo?.fatherPhone || '',
          // CNIC doesn't exist in either model
          cnic: '',
          // Father email exists in Student model but not in Admission model
          emailAddress: guardianInfo?.fatherEmail || '',
        },
        mother: {
          ...prev.mother,
          name: guardianInfo?.motherName || '',
          occupation: guardianInfo?.motherOccupation || '',
          mobileNumber: guardianInfo?.motherPhone || '',
          // CNIC doesn't exist in either model
          cnic: '',
          // Mother email exists in Student model but not in Admission model
          emailAddress: guardianInfo?.motherEmail || '',
        },
        guardian: {
          ...prev.guardian,
          name: guardianInfo?.guardianName || '',
          relation: guardianInfo?.guardianRelation || '',
          mobileNumber: guardianInfo?.guardianPhone || '',
          emailAddress: guardianInfo?.guardianEmail || '',
          // CNIC doesn't exist in either model
          cnic: '',
        },
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admission data');
    } finally {
      setLoading(false);
    }
  };

  // Legacy function for backward compatibility (used in new admission mode)
  const fetchAdmissionData = async () => {
    return fetchAdmissionDataAndDropdowns();
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

      // Get institution ID - check multiple sources
      let institutionId = getInstitutionId();
      
      // If still no institution, try formData
      if (!institutionId && formData.institution) {
        institutionId = formData.institution;
      }
      
      // If still no institution and not super admin, use user's institution
      if (!institutionId && !isSuperAdmin && user.institution) {
        institutionId = typeof user.institution === 'object' && user.institution?._id 
          ? user.institution._id 
          : user.institution;
      }

      // Ensure institutionId is a string
      if (institutionId && typeof institutionId !== 'string') {
        institutionId = String(institutionId);
      }

      if (!institutionId) {
        setError('Institution is required. Please select an institution from the navbar or contact administrator.');
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

      let admissionId;
      if (isEditMode) {
        const response = await updateAdmission(id, admissionData);
        admissionId = id;
        setSuccess('Admission updated successfully');
      } else {
        const response = await createAdmission(admissionData);
        admissionId = response.data._id;
        setSuccess('Admission application submitted successfully');
      }

      // If "Mark as Enrolled" is checked, enroll the student
      if (formData.markAsEnrolled && admissionId) {
        try {
          // First, update status to 'approved' if not already approved
          const currentAdmission = await getAdmissionById(admissionId);
          if (currentAdmission.data.status !== 'approved' && currentAdmission.data.status !== 'enrolled') {
            await updateAdmissionStatus(admissionId, 'approved', 'Auto-approved during enrollment');
          }
          
          // Then enroll the student
          if (currentAdmission.data.status !== 'enrolled') {
            await approveAndEnroll(admissionId);
            setSuccess('Admission created and student enrolled successfully');
          }
        } catch (enrollError) {
          // If enrollment fails, still show success for admission creation
          console.error('Enrollment error:', enrollError);
          setError(enrollError.response?.data?.message || 'Admission created but enrollment failed. Please enroll manually.');
        }
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5', pb: 4 }}>
      <TopBar title={isEditMode ? 'Edit Admission' : 'New Admission'} />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Enhanced Header with Gradient */}
        <Paper 
          elevation={0}
          sx={{ 
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.1,
            }
          }}
        >
          <Box sx={{ p: 4, position: 'relative', zIndex: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Button 
                  startIcon={<ArrowBack />} 
                  onClick={() => navigate('/admissions')} 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
                  }}
                >
                  Back
                </Button>
                <Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: 'white', mb: 0.5 }}>
                    {isEditMode ? 'Edit Admission' : 'New Student Admission'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    {isEditMode ? 'Update student admission information' : 'Fill in the details to create a new admission'}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
                }}
                startIcon={<Print />}
                onClick={handlePrintBlankForm}
              >
                Print Blank Form
              </Button>
            </Box>
          </Box>
        </Paper>

        <Paper 
          elevation={0}
          sx={{ 
            p: 4,
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >

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
            <Box 
              sx={{ 
                mb: 4,
                p: 3,
                borderRadius: 2,
                bgcolor: '#f8f9fa',
                border: '1px solid #e9ecef',
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Person sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#2c3e50' }}>
                    Basic Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                    Student personal and academic details
                  </Typography>
                </Box>
              </Box>
              
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
                        sx={{
                          bgcolor: 'white',
                          '&:hover': {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                            },
                          },
                        }}
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
                        sx={{
                          bgcolor: 'white',
                          '&:hover': {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                            },
                          },
                        }}
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
                        sx={{
                          bgcolor: 'white',
                          '&:hover': {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                            },
                          },
                        }}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                    }}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                    }}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                    }}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                    }}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth required>
                    <InputLabel>RELIGION*</InputLabel>
                    <Select
                      value={formData.religion}
                      onChange={(e) => handleChange('religion', e.target.value)}
                      label="RELIGION*"
                      sx={{
                        bgcolor: 'white',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
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
                      sx={{
                        bgcolor: 'white',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                    }}
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
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#495057' }}>
                      STUDENT PICTURE
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<PhotoCamera />}
                      sx={{
                        borderColor: '#dee2e6',
                        color: '#495057',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'rgba(102, 126, 234, 0.04)',
                        },
                        py: 1.5,
                      }}
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
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'success.main',
                          display: 'block',
                          mt: 1,
                          fontWeight: 500,
                        }}
                      >
                        ✓ {formData.studentPicture.name}
                      </Typography>
                    )}
                  </Box>
                </Grid>
                
              </Grid>
            </Box>

            {/* ADDRESS Section */}
            <Box 
              sx={{ 
                mb: 4,
                p: 3,
                borderRadius: 2,
                bgcolor: '#f8f9fa',
                border: '1px solid #e9ecef',
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'success.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LocationOn sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#2c3e50' }}>
                    Address Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                    Present and permanent address details
                  </Typography>
                </Box>
              </Box>
              
              <Tabs 
                value={addressTab} 
                onChange={(e, newValue) => setAddressTab(newValue)} 
                sx={{ 
                  mb: 3,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  },
                  '& .Mui-selected': {
                    color: 'success.main',
                  },
                }}
                TabIndicatorProps={{
                  sx: { bgcolor: 'success.main', height: 3 }
                }}
              >
                <Tab icon={<Home />} iconPosition="start" label="Present Address" />
                <Tab icon={<Home />} iconPosition="start" label="Permanent Address" />
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
            <Box 
              sx={{ 
                mb: 4,
                p: 3,
                borderRadius: 2,
                bgcolor: '#f8f9fa',
                border: '1px solid #e9ecef',
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'warning.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FamilyRestroom sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#2c3e50' }}>
                    Guardian Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6c757d', mt: 0.5 }}>
                    Father, mother, and guardian contact details
                  </Typography>
                </Box>
              </Box>
              
              <Tabs 
                value={guardianTab} 
                onChange={(e, newValue) => setGuardianTab(newValue)} 
                sx={{ 
                  mb: 3,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  },
                  '& .Mui-selected': {
                    color: 'warning.main',
                  },
                }}
                TabIndicatorProps={{
                  sx: { bgcolor: 'warning.main', height: 3 }
                }}
              >
                <Tab icon={<AccountCircle />} iconPosition="start" label="Father" />
                <Tab icon={<AccountCircle />} iconPosition="start" label="Mother" />
                <Tab icon={<AccountCircle />} iconPosition="start" label="Guardian" />
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
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center"
              mt={4}
              pt={3}
              sx={{ 
                borderTop: '2px solid #e9ecef',
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ color: '#6c757d', mb: 1 }}>
                  <Info sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  Please review all information before submitting
                </Typography>
                <Typography variant="caption" sx={{ color: '#adb5bd' }}>
                  Fields marked with * are required
                </Typography>
              </Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  px: 5,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? 'Saving...' : isEditMode ? 'Update Admission' : 'Submit Admission'}
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
