import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  InputAdornment,
  Divider,
  Paper,
  IconButton,
  Checkbox,
} from '@mui/material';
import {
  Search,
  Print,
  FileDownload,
  Visibility,
  Add,
  Edit,
  Delete,
  Close,
  Restore,
  Receipt,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const FeeManagement = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab name mappings
  const tabNames = ['fee-heads', 'fee-structure', 'assign-fee-structure', 'misc-operations', 'print-voucher', 'fee-deposit'];
  const miscSubTabNames = ['student-operations', 'generate-voucher'];
  const feeDepositSubTabNames = ['manual', 'voucher'];

  // Tab management - initialize from URL or default
  const getTabFromURL = () => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabIndex = tabNames.indexOf(tabParam);
      return tabIndex >= 0 ? tabIndex : 0;
    }
    return 0;
  };

  const getSubTabFromURL = (tabIndex) => {
    const subtabParam = searchParams.get('subtab');
    if (subtabParam) {
      if (tabIndex === 3) { // misc-operations
        const subtabIndex = miscSubTabNames.indexOf(subtabParam);
        return subtabIndex >= 0 ? subtabIndex : 0;
      } else if (tabIndex === 5) { // fee-deposit
        const subtabIndex = feeDepositSubTabNames.indexOf(subtabParam);
        return subtabIndex >= 0 ? subtabIndex : 0;
      }
    }
    return 0;
  };

  const [activeTab, setActiveTab] = useState(getTabFromURL());
  const [feeDepositSubTab, setFeeDepositSubTab] = useState(getSubTabFromURL(5));
  const [miscFeeSubTab, setMiscFeeSubTab] = useState(getSubTabFromURL(3));

  // Update URL when tabs change
  const updateURL = (tabIndex, subtabIndex = null) => {
    const params = new URLSearchParams();
    params.set('tab', tabNames[tabIndex]);
    
    if (subtabIndex !== null) {
      if (tabIndex === 3) { // misc-operations
        params.set('subtab', miscSubTabNames[subtabIndex]);
      } else if (tabIndex === 5) { // fee-deposit
        params.set('subtab', feeDepositSubTabNames[subtabIndex]);
      }
    }
    
    navigate(`/fee-management?${params.toString()}`, { replace: true });
  };

  // Handle main tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    updateURL(newValue, null);
  };

  // Handle misc fee sub-tab change
  const handleMiscFeeSubTabChange = (event, newValue) => {
    setMiscFeeSubTab(newValue);
    updateURL(3, newValue);
  };

  // Handle fee deposit sub-tab change
  const handleFeeDepositSubTabChange = (event, newValue) => {
    setFeeDepositSubTab(newValue);
    updateURL(5, newValue);
  };

  // Initialize URL on mount if no params exist
  useEffect(() => {
    if (!searchParams.get('tab')) {
      updateURL(0, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync with URL when URL changes
  useEffect(() => {
    const tabFromURL = getTabFromURL();
    const subtabFromURL = getSubTabFromURL(tabFromURL);
    
    if (tabFromURL !== activeTab) {
      setActiveTab(tabFromURL);
    }
    
    if (tabFromURL === 3 && subtabFromURL !== miscFeeSubTab) {
      setMiscFeeSubTab(subtabFromURL);
    } else if (tabFromURL === 5 && subtabFromURL !== feeDepositSubTab) {
      setFeeDepositSubTab(subtabFromURL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Status options
  const [enrolledOptions, setEnrolledOptions] = useState([]);

  // Misc Fee Operations
  const [miscFeeStudents, setMiscFeeStudents] = useState([]);
  const [selectedMiscFeeStudents, setSelectedMiscFeeStudents] = useState([]);
  const [miscFeeFilters, setMiscFeeFilters] = useState({
    monthYear: `${new Date().getMonth() + 1}-${new Date().getFullYear()}`,
    enrolled: []
  });
  const [changeStatusDialog, setChangeStatusDialog] = useState(false);
  const [changeStatusForm, setChangeStatusForm] = useState({
    status: '',
    reason: '',
    changeDate: new Date().toISOString().split('T')[0]
  });
  const [changeMonthlyFeeDialog, setChangeMonthlyFeeDialog] = useState(false);
  const [changeMonthlyFeeForm, setChangeMonthlyFeeForm] = useState({
    operation: 'update',
    feeHead: '',
    feeChangeType: '',
    value: '',
    remarks: ''
  });

  // Generate Voucher
  const [generateVoucherFilters, setGenerateVoucherFilters] = useState({
    monthYear: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`, // Format: YYYY-MM for month input
    enrolled: []
  });
  const [generateVoucherStudents, setGenerateVoucherStudents] = useState([]);
  const [selectedGenerateVoucherStudents, setSelectedGenerateVoucherStudents] = useState([]);
  const [generateVoucherLoading, setGenerateVoucherLoading] = useState(false);

  // Fee Heads
  const [feeHeads, setFeeHeads] = useState([]);
  const [feeHeadsLoading, setFeeHeadsLoading] = useState(false);
  const [feeHeadSearchTerm, setFeeHeadSearchTerm] = useState('');
  const [feeHeadDialogOpen, setFeeHeadDialogOpen] = useState(false);
  const [feeHeadEditMode, setFeeHeadEditMode] = useState(false);
  const [selectedFeeHead, setSelectedFeeHead] = useState(null);
  const [availablePriorities, setAvailablePriorities] = useState([]);
  const [feeHeadFormData, setFeeHeadFormData] = useState({
    name: '',
    priority: '',
    accountType: '',
    frequencyType: ''
  });

  // Fee Structure
  const [feeStructureMatrix, setFeeStructureMatrix] = useState(null);
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [feeStructureSaving, setFeeStructureSaving] = useState(false);
  const [feeStructureMatrixData, setFeeStructureMatrixData] = useState({});

  // Print Voucher
  const [printVoucherFilters, setPrintVoucherFilters] = useState({
    monthYear: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`, // Format: YYYY-MM for month input
    enrolled: []
  });
  const [printVoucherStudents, setPrintVoucherStudents] = useState([]);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [selectedVoucherStudent, setSelectedVoucherStudent] = useState(null);
  const [voucherData, setVoucherData] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Assign Fee Structure
  const [studentsWithoutFeeStructure, setStudentsWithoutFeeStructure] = useState([]);
  const [assignFeeStructureLoading, setAssignFeeStructureLoading] = useState(false);
  const [assignFeeStructureDialog, setAssignFeeStructureDialog] = useState(false);
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [assignFeeStructureForm, setAssignFeeStructureForm] = useState({
    classId: '',
    discount: 0,
    discountType: 'amount',
    discountReason: ''
  });

  // Manual Fee Deposit
  const [manualDepositSearch, setManualDepositSearch] = useState({
    id: '',
    admissionNumber: '',
    rollNumber: '',
    studentName: '',
    phoneNumber: ''
  });
  const [manualDepositStudents, setManualDepositStudents] = useState([]);
  const [selectedManualDepositStudent, setSelectedManualDepositStudent] = useState(null);
  const [manualDepositForm, setManualDepositForm] = useState({
    paymentMethod: 'cash',
    bankAccount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    feeAmount: '',
    fineAmount: '',
    preFineAmount: '',
    absentFineAmount: '',
    remarks: ''
  });

  // Institutions
  const [institutions, setInstitutions] = useState([]);

  // Fetch admission statuses
  useEffect(() => {
    const fetchAdmissionStatuses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/admissions/statuses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const statuses = response.data.data || [];
        // Filter out 'Soft Admission' and 'Passout'
        const filteredStatuses = statuses.filter(s => 
          s !== 'Soft Admission' && s !== 'Passout'
        );
        setEnrolledOptions(filteredStatuses);
      } catch (err) {
        console.error('Error fetching admission statuses:', err);
      }
    };
    fetchAdmissionStatuses();
  }, []);

  // Fetch institutions
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchInstitutions = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`${API_URL}/institutions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setInstitutions(response.data.data || []);
        } catch (err) {
          console.error('Error fetching institutions:', err);
        }
      };
      fetchInstitutions();
    }
  }, [isSuperAdmin]);

  // Account Type options
  const accountTypeOptions = [
    'Liabilities',
    'Income',
    'Other Income'
  ];

  // Frequency Type options
  const frequencyTypeOptions = [
    'Monthly Fee/Annual Fee',
    'Once at First Fee',
    'Not Defined(e.g Paper Charges)'
  ];

  // Get institution ID helper
  const getInstitutionId = () => {
    // For admin users, always use their institution
    if (!isSuperAdmin && user.institution) {
      return typeof user.institution === 'object' ? user.institution._id : user.institution;
    }
    // For super admin, get from localStorage
    if (isSuperAdmin) {
      const institutionData = localStorage.getItem('selectedInstitution');
      if (institutionData) {
        try {
          const institution = JSON.parse(institutionData);
          return institution._id || institution;
        } catch (e) {
          // If it's not JSON, it might be a string ID
          return institutionData;
        }
      }
    }
    return null;
  };

  // Fetch fee heads
  const fetchFeeHeads = async () => {
    try {
      setFeeHeadsLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const params = {};
      
      // Fee heads are now shared across all institutions
      // No institution parameter needed
      
      if (feeHeadSearchTerm) params.search = feeHeadSearchTerm;

      const response = await axios.get(`${API_URL}/fee-heads`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      // Ensure we set the fee heads array even if empty
      setFeeHeads(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error fetching fee heads:', err);
      setError(err.response?.data?.message || 'Failed to fetch fee heads');
      setFeeHeads([]); // Set empty array on error
    } finally {
      setFeeHeadsLoading(false);
    }
  };

  // Fetch available priorities
  const fetchAvailablePriorities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/fee-heads/priorities/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Transform array of numbers to array of objects with value, label, and available
      const prioritiesArray = response.data.data || [];
      const formattedPriorities = prioritiesArray.map(priority => ({
        value: priority,
        label: `Priority ${priority}`,
        available: true
      }));
      
      setAvailablePriorities(formattedPriorities);
    } catch (err) {
      console.error('Error fetching priorities:', err);
      setAvailablePriorities([]);
    }
  };


  // Fetch fee structure matrix
  const fetchFeeStructureMatrix = async () => {
    try {
      setFeeStructureLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      // For admin users, ensure we have their institution
      if (!isSuperAdmin && !user.institution) {
        setError('No institution found for your account. Please contact administrator.');
        setFeeStructureLoading(false);
        return;
      }
      
      // Fee structures are shared, but we still need institution to get classes
      // Get institution from user context (navbar selection)
      const institutionId = getInstitutionId();
      if (!institutionId) {
        setError('No institution found. Please contact administrator.');
        setFeeStructureLoading(false);
        return;
      }
      
      const params = {
        institution: institutionId // For getting classes only (fee structures are shared)
      };

      const response = await axios.get(`${API_URL}/fees/structures/matrix`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      const matrix = response.data.data || {};
      
      setFeeStructureMatrix(matrix);
      
      // Initialize matrix data state
      const matrixData = {};
      if (matrix.data) {
        Object.keys(matrix.data).forEach(classId => {
          matrixData[classId] = {
            fees: { ...matrix.data[classId].fees }
          };
        });
      } else {
        // Initialize with zeros if no data exists
        if (matrix.classes && matrix.feeHeads) {
          matrix.classes.forEach(cls => {
            matrixData[cls._id] = {
              fees: {}
            };
            matrix.feeHeads.forEach(head => {
              matrixData[cls._id].fees[head._id] = 0;
            });
          });
        }
      }
      setFeeStructureMatrixData(matrixData);
    } catch (err) {
      console.error('Error fetching fee structure matrix:', err);
      setError(err.response?.data?.message || 'Failed to fetch fee structure matrix');
    } finally {
      setFeeStructureLoading(false);
    }
  };

  // Fee Head handlers
  const handleFeeHeadOpenDialog = (feeHead = null) => {
    if (feeHead) {
      setFeeHeadEditMode(true);
      setSelectedFeeHead(feeHead);
      setFeeHeadFormData({
        name: feeHead.name || '',
        priority: feeHead.priority || '',
        accountType: feeHead.accountType || '',
        frequencyType: feeHead.frequencyType || ''
      });
    } else {
      setFeeHeadEditMode(false);
      setSelectedFeeHead(null);
      setFeeHeadFormData({
        name: '',
        priority: '',
        accountType: '',
        frequencyType: ''
      });
    }
    // Fetch available priorities when dialog opens
    fetchAvailablePriorities();
    setFeeHeadDialogOpen(true);
  };

  const handleFeeHeadCloseDialog = () => {
    setFeeHeadDialogOpen(false);
    setFeeHeadEditMode(false);
    setSelectedFeeHead(null);
    setFeeHeadFormData({
      name: '',
      priority: '',
      accountType: '',
      frequencyType: ''
    });
  };

  const handleFeeHeadSubmit = async () => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');

      // Fee heads are now shared across all institutions
      // No institution field needed
      const payload = {
        ...feeHeadFormData,
        priority: parseInt(feeHeadFormData.priority)
        // institution is not needed - fee heads are shared
      };

      if (feeHeadEditMode) {
        await axios.put(`${API_URL}/fee-heads/${selectedFeeHead._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Fee head updated successfully');
      } else {
        await axios.post(`${API_URL}/fee-heads`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Fee head created successfully');
      }

      handleFeeHeadCloseDialog();
      fetchFeeHeads();
      fetchAvailablePriorities();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${feeHeadEditMode ? 'update' : 'create'} fee head`);
    }
  };

  const handleFeeHeadDelete = async (feeHeadId) => {
    if (!window.confirm('Are you sure you want to delete this fee head?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');

      await axios.delete(`${API_URL}/fee-heads/${feeHeadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Fee head deleted successfully');
      fetchFeeHeads();
      fetchAvailablePriorities();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete fee head');
    }
  };

  const handleFeeHeadReactivate = async (feeHeadId) => {
    if (!window.confirm('Are you sure you want to reactivate this fee head?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');

      await axios.put(`${API_URL}/fee-heads/${feeHeadId}/reactivate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Fee head reactivated successfully');
      fetchFeeHeads();
      fetchAvailablePriorities();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate fee head');
    }
  };

  // Fee Structure matrix handlers
  const handleFeeStructureAmountChange = (classId, feeHeadId, value) => {
    setFeeStructureMatrixData(prev => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        fees: {
          ...(prev[classId]?.fees || {}),
          [feeHeadId]: parseFloat(value) || 0
        }
      }
    }));
  };

  const handleFeeStructureSave = async () => {
    try {
      setFeeStructureSaving(true);
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      // Get institution from user context (navbar selection)
      const institutionId = getInstitutionId();
      
      const payload = {
        institution: institutionId,
        data: feeStructureMatrixData
      };

      await axios.post(`${API_URL}/fees/structures/bulk-save`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Fee structure saved successfully');
      fetchFeeStructureMatrix();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setFeeStructureSaving(false);
    }
  };

  // Fetch misc fee students
  const fetchMiscFeeStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const institutionId = user.institution?._id || user.institution;

      const params = {
        institution: institutionId,
        monthYear: miscFeeFilters.monthYear
      };

      if (miscFeeFilters.enrolled && miscFeeFilters.enrolled.length > 0) {
        params.status = miscFeeFilters.enrolled;
      }

      try {
        const response = await axios.get(`${API_URL}/fees/misc-operations/students`, {
          headers: { Authorization: `Bearer ${token}` },
          params: params,
          paramsSerializer: { indexes: null }
        });
        setMiscFeeStudents(response.data.data || []);
      } catch (err) {
        // Fallback to admissions endpoint
        const fallbackParams = {
          institution: institutionId
        };
        if (miscFeeFilters.enrolled && miscFeeFilters.enrolled.length > 0) {
          fallbackParams.status = miscFeeFilters.enrolled;
        }
        const fallbackResponse = await axios.get(`${API_URL}/admissions`, {
          headers: { Authorization: `Bearer ${token}` },
          params: fallbackParams,
          paramsSerializer: { indexes: null }
        });
        const admissions = fallbackResponse.data.data || [];
        const transformedStudents = admissions.map(admission => ({
          _id: admission._id,
          id: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
          rollNumber: admission.rollNumber || 'N/A',
          name: admission.personalInfo?.name || 'N/A',
          fatherName: admission.personalInfo?.fatherName || 'N/A',
          status: admission.status || 'pending',
          school: admission.institution?.name || 'N/A',
          class: admission.class?.name || 'N/A',
          section: admission.section?.name || 'N/A',
          mobileNumber: admission.personalInfo?.phone || 'N/A',
          admissionNo: admission.applicationNumber || 'N/A',
          admissionDate: admission.admissionDate ? new Date(admission.admissionDate).toLocaleDateString() : 'N/A',
          admissionEffectiveDate: admission.effectiveDate ? new Date(admission.effectiveDate).toLocaleDateString() : 'N/A',
          advanceFee: '0',
          lastVoucher: 'N/A'
        }));
        setMiscFeeStudents(transformedStudents);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch print voucher students
  const fetchPrintVoucherStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const institutionId = getInstitutionId();

      if (!institutionId) {
        setError('Institution not found');
        setLoading(false);
        return;
      }

      // Calculate month and year from filter
      let month, year;
      if (printVoucherFilters.monthYear) {
        const parts = printVoucherFilters.monthYear.split('-');
        if (parts[0].length === 4) {
          // Format: YYYY-MM
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
        } else {
          // Format: M-YYYY
          month = parseInt(parts[0]);
          year = parseInt(parts[1]);
        }
      } else {
        // Default to current month/year
        const now = new Date();
        month = now.getMonth() + 1;
        year = now.getFullYear();
      }

      // Fetch students with generated vouchers for the selected month/year
      const params = {
        institution: institutionId
      };

      const response = await axios.get(`${API_URL}/fees/student-fees`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      const studentFees = response.data.data || [];
      
      // Filter to only include students with vouchers for the selected month/year
      const studentsWithVouchers = studentFees.filter(sf => 
        sf.vouchers && sf.vouchers.some(v => v.month === month && v.year === year)
      );

      // Get unique students
      const uniqueStudentsMap = new Map();
      
      studentsWithVouchers.forEach(studentFee => {
        const studentId = studentFee.student?._id || studentFee.student;
        if (studentId && !uniqueStudentsMap.has(studentId.toString())) {
          const student = studentFee.student;
          const admission = studentFee.admission;
          
          // Get student name
          let studentName = 'N/A';
          if (admission?.personalInfo?.name) {
            studentName = admission.personalInfo.name;
          } else if (student?.user?.name) {
            studentName = student.user.name;
          } else if (admission?.personalInfo?.firstName) {
            const lastName = admission.personalInfo.lastName || '';
            studentName = `${admission.personalInfo.firstName} ${lastName}`.trim();
          }

          uniqueStudentsMap.set(studentId.toString(), {
            _id: admission?._id || studentId,
            studentId: studentId,
            id: student?.enrollmentNumber || student?.rollNumber || admission?.applicationNumber || 'N/A',
            rollNumber: student?.rollNumber || admission?.rollNumber || 'N/A',
            admissionNo: admission?.applicationNumber || student?.enrollmentNumber || 'N/A',
            name: studentName,
            fatherName: admission?.guardianInfo?.fatherName || 'N/A',
            class: studentFee.class?.name || admission?.class?.name || 'N/A',
            section: admission?.section?.name || 'N/A',
            status: student?.status || admission?.status || 'active',
            voucherStatus: 'Generated',
            printStatus: 'Not Printed'
          });
        }
      });

      const transformedStudents = Array.from(uniqueStudentsMap.values());
      setPrintVoucherStudents(transformedStudents);
      
      if (transformedStudents.length === 0) {
        setError(`No students found with generated vouchers for ${month}/${year}`);
      }
    } catch (err) {
      console.error('Error fetching students with generated vouchers:', err);
      setError(err.response?.data?.message || 'Failed to fetch students with generated vouchers');
      setPrintVoucherStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch generate voucher students (students with assigned fee structures)
  const fetchGenerateVoucherStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const institutionId = getInstitutionId();

      if (!institutionId) {
        setError('Institution not found');
        setLoading(false);
        return;
      }

      // Calculate academic year from monthYear filter
      // monthYear format can be "YYYY-MM" (from month input) or "M-YYYY" (from old format)
      let academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      if (generateVoucherFilters.monthYear) {
        const parts = generateVoucherFilters.monthYear.split('-');
        if (parts.length === 2) {
          // Check if it's "YYYY-MM" format (from month input)
          if (parts[0].length === 4) {
            const yearNum = parseInt(parts[0]);
            academicYear = `${yearNum}-${yearNum + 1}`;
          } else {
            // Old format "M-YYYY"
            const yearNum = parseInt(parts[1]);
            academicYear = `${yearNum}-${yearNum + 1}`;
          }
        }
      }

      // Fetch students with fee structures assigned
      const params = {
        institution: institutionId
        // Note: academicYear is optional - if not provided, will return all student fees for the institution
      };
      
      // Only add academicYear if we have a valid one
      if (academicYear) {
        params.academicYear = academicYear;
      }

      const response = await axios.get(`${API_URL}/fees/student-fees`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      const studentFees = response.data.data || [];
      
      if (studentFees.length === 0) {
        setGenerateVoucherStudents([]);
        setLoading(false);
        return;
      }
      
      // Get unique students from student fees
      const uniqueStudentsMap = new Map();
      
      studentFees.forEach(studentFee => {
        const studentId = studentFee.student?._id || studentFee.student;
        if (studentId && !uniqueStudentsMap.has(studentId.toString())) {
          const student = studentFee.student;
          const admission = studentFee.student?.admission;
          
          // Get student name - Student model has user reference, not direct name
          // We'll need to get it from admission or user
          let studentName = 'N/A';
          if (admission?.personalInfo?.name) {
            studentName = admission.personalInfo.name;
          } else if (student?.user?.name) {
            studentName = student.user.name;
          } else if (admission?.personalInfo?.firstName) {
            const lastName = admission.personalInfo.lastName || '';
            studentName = `${admission.personalInfo.firstName} ${lastName}`.trim();
          }

          // Check if voucher exists for the selected month/year
          let voucherStatus = 'Not Generated';
          if (generateVoucherFilters.monthYear) {
            let monthNum, yearNum;
            const parts = generateVoucherFilters.monthYear.split('-');
            if (parts[0].length === 4) {
              // Format: YYYY-MM
              yearNum = parseInt(parts[0]);
              monthNum = parseInt(parts[1]);
            } else {
              // Format: M-YYYY
              monthNum = parseInt(parts[0]);
              yearNum = parseInt(parts[1]);
            }
            
            // Check all student fees for this student to see if any have a voucher for this month/year
            const allStudentFees = studentFees.filter(sf => {
              const sfStudentId = sf.student?._id || sf.student;
              return sfStudentId && sfStudentId.toString() === studentId.toString();
            });
            
            const hasVoucher = allStudentFees.some(sf => 
              sf.vouchers && sf.vouchers.some(v => 
                v.month === monthNum && v.year === yearNum
              )
            );
            
            if (hasVoucher) {
              voucherStatus = 'Generated';
            }
          }

          uniqueStudentsMap.set(studentId.toString(), {
            _id: admission?._id || studentId, // Use admission ID if available for voucher generation
            studentId: studentId, // Keep student ID reference
            id: student?.enrollmentNumber || student?.rollNumber || admission?.applicationNumber || 'N/A',
            rollNumber: student?.rollNumber || admission?.rollNumber || 'N/A',
            admissionNo: admission?.applicationNumber || student?.enrollmentNumber || 'N/A',
            name: studentName,
            fatherName: admission?.guardianInfo?.fatherName || 'N/A',
            class: studentFee.class?.name || admission?.class?.name || 'N/A',
            section: admission?.section?.name || 'N/A',
            status: student?.status || admission?.status || 'active',
            voucherStatus: voucherStatus
          });
        }
      });

      // Convert map to array
      const transformedStudents = Array.from(uniqueStudentsMap.values());
      setGenerateVoucherStudents(transformedStudents);
      
      if (transformedStudents.length === 0) {
        setError('No students found with fee structures assigned for the selected academic year');
      }
    } catch (err) {
      console.error('Error fetching students with fee structures:', err);
      setError(err.response?.data?.message || 'Failed to fetch students with fee structures');
      setGenerateVoucherStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle generate vouchers
  const handleGenerateVouchers = async () => {
    if (selectedGenerateVoucherStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }

    try {
      setGenerateVoucherLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      // Handle month/year format (could be YYYY-MM or M-YYYY)
      let month, year;
      const monthYearParts = generateVoucherFilters.monthYear.split('-');
      if (monthYearParts[0].length === 4) {
        // Format: YYYY-MM
        year = parseInt(monthYearParts[0]);
        month = parseInt(monthYearParts[1]);
      } else {
        // Format: M-YYYY
        month = parseInt(monthYearParts[0]);
        year = parseInt(monthYearParts[1]);
      }

      const studentIds = selectedGenerateVoucherStudents.map(s => s._id);

      // Call API to generate vouchers
      const response = await axios.post(
        `${API_URL}/fees/generate-vouchers`,
        {
          studentIds: studentIds,
          month: month,
          year: year
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess(`Successfully generated vouchers for ${selectedGenerateVoucherStudents.length} student(s)`);
        // Update voucher status for selected students
        setGenerateVoucherStudents(prevStudents =>
          prevStudents.map(student =>
            selectedGenerateVoucherStudents.some(s => s._id === student._id)
              ? { ...student, voucherStatus: 'Generated' }
              : student
          )
        );
        setSelectedGenerateVoucherStudents([]);
        // Refresh the list
        fetchGenerateVoucherStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate vouchers');
    } finally {
      setGenerateVoucherLoading(false);
    }
  };

  // Fetch manual deposit students with search filters
  const fetchManualDepositStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const institutionId = user.institution?._id || user.institution;

      // Check if any search filter is provided
      const hasSearchFilters = Object.values(manualDepositSearch).some(value => value && value.trim() !== '');
      
      if (!hasSearchFilters) {
        setError('Please enter at least one search criteria');
        setLoading(false);
        return;
      }

      const params = {
        institution: institutionId
      };

      // Use search parameter for general search (API supports searching by applicationNumber, firstName, lastName, email)
      // We'll fetch all and filter client-side for specific fields
      const searchTerms = [];
      if (manualDepositSearch.id) searchTerms.push(manualDepositSearch.id);
      if (manualDepositSearch.admissionNumber) searchTerms.push(manualDepositSearch.admissionNumber);
      if (manualDepositSearch.studentName) searchTerms.push(manualDepositSearch.studentName);
      
      if (searchTerms.length > 0) {
        params.search = searchTerms.join(' ');
      }

      const response = await axios.get(`${API_URL}/admissions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
        paramsSerializer: { indexes: null }
      });

      let admissions = response.data.data || [];
      
      // Client-side filtering for specific fields
      if (manualDepositSearch.rollNumber) {
        admissions = admissions.filter(admission => 
          admission.rollNumber?.toLowerCase().includes(manualDepositSearch.rollNumber.toLowerCase()) ||
          admission.studentId?.rollNumber?.toLowerCase().includes(manualDepositSearch.rollNumber.toLowerCase())
        );
      }
      
      if (manualDepositSearch.phoneNumber) {
        admissions = admissions.filter(admission => 
          admission.personalInfo?.phone?.includes(manualDepositSearch.phoneNumber) ||
          admission.contactInfo?.phone?.includes(manualDepositSearch.phoneNumber)
        );
      }
      

      // Additional filtering for ID and admission number if they were used in general search
      if (manualDepositSearch.id && !searchTerms.includes(manualDepositSearch.id)) {
        admissions = admissions.filter(admission => 
          admission.studentId?.enrollmentNumber?.toLowerCase().includes(manualDepositSearch.id.toLowerCase()) ||
          admission.applicationNumber?.toLowerCase().includes(manualDepositSearch.id.toLowerCase())
        );
      }
      
      if (manualDepositSearch.admissionNumber && !searchTerms.includes(manualDepositSearch.admissionNumber)) {
        admissions = admissions.filter(admission => 
          admission.applicationNumber?.toLowerCase().includes(manualDepositSearch.admissionNumber.toLowerCase())
        );
      }

      const transformedStudents = admissions.map(admission => ({
        _id: admission._id,
        id: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
        rollNumber: admission.rollNumber || admission.studentId?.rollNumber || 'N/A',
        name: admission.personalInfo?.firstName && admission.personalInfo?.lastName
          ? `${admission.personalInfo.firstName} ${admission.personalInfo.lastName}`
          : admission.personalInfo?.firstName || 'N/A',
        fatherName: admission.personalInfo?.fatherName || 'N/A',
        status: admission.status || 'pending',
        school: admission.institution?.name || 'N/A',
        class: admission.class?.name || 'N/A',
        section: admission.section?.name || 'N/A',
        mobileNumber: admission.personalInfo?.phone || admission.contactInfo?.phone || 'N/A',
        admissionNo: admission.applicationNumber || 'N/A',
        admissionDate: admission.admissionDate ? new Date(admission.admissionDate).toLocaleDateString() : 'N/A',
        admissionEffectiveDate: admission.effectiveDate ? new Date(admission.effectiveDate).toLocaleDateString() : 'N/A',
        advanceFee: '0',
        lastVoucher: 'N/A'
      }));

      setManualDepositStudents(transformedStudents);
      
      if (transformedStudents.length === 0) {
        setError('No students found matching the search criteria');
      } else {
        setSuccess(`Found ${transformedStudents.length} student(s)`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch voucher data
  const fetchVoucherData = async (student, monthYear) => {
    try {
      setVoucherLoading(true);
      const token = localStorage.getItem('token');
      const institutionId = getInstitutionId();

      const admissionResponse = await axios.get(`${API_URL}/admissions/${student._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const admission = admissionResponse.data.data;

      if (!admission) {
        throw new Error('Admission not found');
      }

      // Parse month/year - handle both YYYY-MM and M-YYYY formats
      let month, year;
      const parts = monthYear.split('-');
      if (parts[0].length === 4) {
        // Format: YYYY-MM
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
      } else {
        // Format: M-YYYY
        month = parseInt(parts[0]);
        year = parseInt(parts[1]);
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      let feeHeads = [];
      let totalAmount = 0;
      let lateFeeFine = 0;
      let absentFine = 0;
      let arrears = 0;
      let dueDate = new Date(year, month, 20); // Default to 20th of the month
      let studentFees = []; // Declare outside try block for use later

      // Get student ID from admission
      const studentId = admission.studentId?._id || admission.studentId;

      // Fetch student fees for this student
      try {
        const feeResponse = await axios.get(`${API_URL}/fees/student-fees`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            institution: institutionId,
            student: studentId
          }
        });

        studentFees = feeResponse.data.data || [];
        
        // Filter fees for the selected month/year based on due date
        // Include fees that are due in the selected month OR fees that don't have a specific due date (one-time/annual fees)
        const monthFees = studentFees.filter(fee => {
          if (!fee.dueDate) {
            // Include fees without due date (they might be annual/one-time fees)
            return true;
          }
          const feeDate = new Date(fee.dueDate);
          // Include fees due in the selected month/year
          return feeDate >= startDate && feeDate <= endDate;
        });

        // Group fees by fee type and calculate totals
        const feeHeadMap = {};
        monthFees.forEach(fee => {
          const feeTypeName = fee.feeType?.name || 'Fee';
          if (!feeHeadMap[feeTypeName]) {
            feeHeadMap[feeTypeName] = 0;
          }
          // Use finalAmount (after discount) if available, otherwise use amount
          feeHeadMap[feeTypeName] += fee.finalAmount || fee.amount || 0;
        });
        
        // Also check if there are any fees that might be due in a different month but should be shown
        // For example, transport fee might be annual or have a different due date
        // Let's include all active fees for the student that haven't been paid
        const allUnpaidFees = studentFees.filter(f => 
          f.status !== 'paid' && 
          (f.status === 'pending' || f.status === 'overdue' || f.status === 'partial')
        );
        
        // Add any fees that weren't already included (like transport fee with different due date)
        allUnpaidFees.forEach(fee => {
          const feeTypeName = fee.feeType?.name || 'Fee';
          // Only add if not already in the map (to avoid duplicates)
          if (!feeHeadMap[feeTypeName]) {
            feeHeadMap[feeTypeName] = 0;
          }
          // Add the fee amount if it's not already counted
          const alreadyIncluded = monthFees.some(mf => 
            mf._id?.toString() === fee._id?.toString()
          );
          if (!alreadyIncluded) {
            feeHeadMap[feeTypeName] += fee.finalAmount || fee.amount || 0;
          }
        });

        // Convert to array
        feeHeads = Object.entries(feeHeadMap)
          .map(([name, amount]) => ({
            name: name,
            amount: amount || 0
          }))
          .filter(h => h.amount > 0);

        // Get due date from first fee
        if (monthFees.length > 0) {
          const firstFee = monthFees[0];
          if (firstFee.dueDate) {
            dueDate = new Date(firstFee.dueDate);
          }
        }

        // Calculate arrears (unpaid fees before the selected month)
        const unpaidFees = studentFees.filter(f => {
          if (!f.dueDate || f.status === 'paid') return false;
          const feeDate = new Date(f.dueDate);
          return feeDate < startDate && (f.status === 'pending' || f.status === 'overdue' || f.status === 'partial');
        });
        arrears = unpaidFees.reduce((sum, f) => sum + (f.dueAmount || 0), 0);

        // Calculate late fee fine if due date has passed
        const now = new Date();
        if (dueDate < now) {
          // Calculate days overdue
          const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
          lateFeeFine = Math.max(0, daysOverdue * 50); // Rs. 50 per day (adjust as needed)
        }

        totalAmount = feeHeads.reduce((sum, head) => sum + (head.amount || 0), 0);
      } catch (err) {
        console.error('Error fetching student fees:', err);
      }

      // If no fees found, set default
      if (feeHeads.length === 0) {
        feeHeads = [
          { name: 'Tuition Fee', amount: 0 }
        ];
      }

      const tuitionFee = feeHeads.find(h => h.name.toLowerCase().includes('tuition'))?.amount ||
                        feeHeads.reduce((sum, h) => sum + h.amount, 0) || 0;
      const payableWithinDueDate = tuitionFee + arrears;
      const payableAfterDueDate = payableWithinDueDate + lateFeeFine + absentFine;

      // Format dates correctly
      const issueDate = new Date().toISOString().split('T')[0];
      const formattedDueDate = dueDate.toISOString().split('T')[0];
      // Valid date should be end of the month
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const validDate = new Date(year, month - 1, lastDayOfMonth).toISOString().split('T')[0];

      // Get student name - use personalInfo.name (single field)
      let studentName = 'N/A';
      if (admission.personalInfo?.name) {
        studentName = admission.personalInfo.name;
      } else if (admission.studentId?.user?.name) {
        studentName = admission.studentId.user.name;
      }

      // Get class and section from admission or student fees
      let className = 'N/A';
      let sectionName = 'N/A';
      if (admission.class?.name) {
        className = admission.class.name;
      } else if (studentFees && studentFees.length > 0 && studentFees[0].class?.name) {
        className = studentFees[0].class.name;
      }
      
      if (admission.section?.name) {
        sectionName = admission.section.name;
      }

      return {
        voucherNo: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
        rollNo: admission.rollNumber || admission.studentId?.rollNumber || 'N/A',
        feeMonth: monthYear,
        validDate: validDate,
        issueDate: issueDate,
        dueDate: formattedDueDate,
        studentId: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
        admissionNo: admission.applicationNumber || 'N/A',
        name: studentName,
        fatherName: admission.guardianInfo?.fatherName || 'N/A',
        class: className,
        section: sectionName,
        feeHeads: [
          ...feeHeads.filter(h => !h.name.toLowerCase().includes('arrears') &&
                                  !h.name.toLowerCase().includes('fine')),
          { name: 'Arrears', amount: arrears },
          { name: 'Previous Fee Fine', amount: 0 },
          { name: 'Late Fee Fine', amount: lateFeeFine },
          { name: 'Absent Fine', amount: absentFine }
        ],
        payableWithinDueDate: payableWithinDueDate,
        payableAfterDueDate: payableAfterDueDate
      };
    } catch (err) {
      console.error('Error fetching voucher data:', err);
      setError(err.response?.data?.message || 'Failed to fetch voucher data');
      return null;
    } finally {
      setVoucherLoading(false);
    }
  };

  // Fetch students without fee structure
  const fetchStudentsWithoutFeeStructure = async () => {
    try {
      setAssignFeeStructureLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const institutionId = getInstitutionId();

      const params = {
        institution: institutionId
      };

      const response = await axios.get(`${API_URL}/fees/students/without-fee-structure`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setStudentsWithoutFeeStructure(response.data.data || []);
    } catch (err) {
      console.error('Error fetching students without fee structure:', err);
      setError(err.response?.data?.message || 'Failed to fetch students without fee structure');
    } finally {
      setAssignFeeStructureLoading(false);
    }
  };

  // Fetch available classes for assignment
  const fetchAvailableClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const institutionId = getInstitutionId();

      const params = {
        institution: institutionId,
        isActive: true
      };

      const response = await axios.get(`${API_URL}/classes`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setAvailableClasses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err.response?.data?.message || 'Failed to fetch classes');
    }
  };

  // Handle open assign fee structure dialog
  const handleOpenAssignFeeStructureDialog = async (student) => {
    setSelectedStudentForAssignment(student);
    setAssignFeeStructureForm({
      classId: '',
      discount: 0,
      discountType: 'amount',
      discountReason: ''
    });
    await fetchAvailableClasses();
    setAssignFeeStructureDialog(true);
  };

  // Handle close assign fee structure dialog
  const handleCloseAssignFeeStructureDialog = () => {
    setAssignFeeStructureDialog(false);
    setSelectedStudentForAssignment(null);
    setAssignFeeStructureForm({
      classId: '',
      discount: 0,
      discountType: 'amount',
      discountReason: ''
    });
  };

  // Handle assign fee structure
  const handleAssignFeeStructure = async () => {
    if (!assignFeeStructureForm.classId) {
      setError('Please select a class');
      return;
    }

    try {
      setAssignFeeStructureLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      const payload = {
        studentId: selectedStudentForAssignment._id,
        classId: assignFeeStructureForm.classId,
        discount: parseFloat(assignFeeStructureForm.discount) || 0,
        discountType: assignFeeStructureForm.discountType,
        discountReason: assignFeeStructureForm.discountReason
      };

      const response = await axios.post(`${API_URL}/fees/assign-structure`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = response.data.data;
      const totalAssigned = result?.totalAssigned || 0;
      
      if (totalAssigned > 0) {
        setSuccess(`Successfully assigned ${totalAssigned} fee structure(s) to the student`);
      } else {
        setError('No fee structures were assigned');
      }
      
      handleCloseAssignFeeStructureDialog();
      await fetchStudentsWithoutFeeStructure();
    } catch (err) {
      console.error('Error assigning fee structure:', err);
      setError(err.response?.data?.message || 'Failed to assign fee structure');
    } finally {
      setAssignFeeStructureLoading(false);
    }
  };

  const handleViewVoucher = async (student) => {
    setSelectedVoucherStudent(student);
    setVoucherDialogOpen(true);
    const data = await fetchVoucherData(student, printVoucherFilters.monthYear);
    if (data) {
      setVoucherData(data);
    }
  };

  // Listen for institution changes (for super admin)
  useEffect(() => {
    const handleInstitutionChange = () => {
      // Reload fee heads and fee structure when institution changes
      if (activeTab === 0) {
        fetchFeeHeads();
        fetchAvailablePriorities();
      }
      if (activeTab === 1) {
        fetchFeeStructureMatrix();
      }
      if (activeTab === 2) {
        fetchStudentsWithoutFeeStructure();
      }
    };
    
    window.addEventListener('institutionChanged', handleInstitutionChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'selectedInstitution') {
        handleInstitutionChange();
      }
    });
    
    return () => {
      window.removeEventListener('institutionChanged', handleInstitutionChange);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 0) {
      fetchFeeHeads();
      fetchAvailablePriorities();
    }
    if (activeTab === 1) {
      fetchFeeStructureMatrix();
    }
    if (activeTab === 2) {
      fetchStudentsWithoutFeeStructure();
    }
    if (activeTab === 3) {
      if (miscFeeSubTab === 0) {
        fetchMiscFeeStudents();
      } else if (miscFeeSubTab === 1) {
        fetchGenerateVoucherStudents();
      }
    }
    if (activeTab === 4) {
      fetchPrintVoucherStudents();
    }
  }, [activeTab, miscFeeSubTab, miscFeeFilters, generateVoucherFilters, printVoucherFilters, feeHeadSearchTerm]);

  // Status color helper
  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('enrolled')) return 'success';
    if (statusLower.includes('pending')) return 'warning';
    if (statusLower.includes('rejected') || statusLower.includes('expelled')) return 'error';
    return 'default';
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!changeStatusForm.reason || !changeStatusForm.status) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      for (const student of selectedMiscFeeStudents) {
        try {
          await axios.put(
            `${API_URL}/admissions/${student._id}/status`,
            {
              status: changeStatusForm.status,
              reason: changeStatusForm.reason,
              changeDate: changeStatusForm.changeDate
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
        } catch (err) {
          console.error(`Error updating status for student ${student._id}:`, err);
        }
      }

      setSuccess('Status updated successfully');
      setChangeStatusDialog(false);
      setChangeStatusForm({
        status: '',
        reason: '',
        changeDate: new Date().toISOString().split('T')[0]
      });
      setSelectedMiscFeeStudents([]);
      fetchMiscFeeStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <TopBar />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3, flex: 1 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="#667eea">
              Fee Management
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

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Fee Heads" />
              <Tab label="Fee Structure" />
              <Tab label="Assign Fee Structure" />
              <Tab label="Misc Fee Operations" />
              <Tab label="Print Voucher" />
              <Tab label="Fee Deposit" />
            </Tabs>
          </Box>

        {/* Tab Panel 0: Fee Heads */}
        {activeTab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                FEE HEADS
              </Typography>
              {(user.role === 'super_admin' || user.role === 'admin') && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleFeeHeadOpenDialog()}
                  sx={{ bgcolor: '#667eea' }}
                >
                  Add Fee Head
                </Button>
              )}
            </Box>

            {/* Search Bar */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Search by name, GL Account, or frequency type..."
                value={feeHeadSearchTerm}
                onChange={(e) => {
                  setFeeHeadSearchTerm(e.target.value);
                  fetchFeeHeads();
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {feeHeadsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                      <TableCell>Name</TableCell>
                      <TableCell>Frequency Name</TableCell>
                      <TableCell>Priority Order</TableCell>
                      <TableCell>GL Account</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created By</TableCell>
                      {(user.role === 'super_admin' || user.role === 'admin') && (
                        <TableCell>Action</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {feeHeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={(user.role === 'super_admin' || user.role === 'admin') ? 7 : 6} align="center">
                          {feeHeadSearchTerm ? 'No fee heads found matching your search' : 'No fee heads found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      feeHeads
                        .sort((a, b) => {
                          // Sort: active first, then by priority
                          if (a.isActive !== b.isActive) {
                            return a.isActive ? -1 : 1;
                          }
                          return (a.priority || 0) - (b.priority || 0);
                        })
                        .map((feeHead) => (
                        <TableRow 
                          key={feeHead._id} 
                          hover
                          sx={{
                            opacity: feeHead.isActive ? 1 : 0.6,
                            bgcolor: feeHead.isActive ? 'inherit' : '#f5f5f5'
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {capitalizeFirstOnly(feeHead.name)}
                              {!feeHead.isActive && (
                                <Chip label="Inactive" size="small" color="default" variant="outlined" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{feeHead.frequencyType}</TableCell>
                          <TableCell>{feeHead.priority}</TableCell>
                          <TableCell>{feeHead.glAccount}</TableCell>
                          <TableCell>
                            <Chip
                              label={feeHead.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              color={feeHead.isActive ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{capitalizeFirstOnly(feeHead.createdBy?.name || 'N/A')}</TableCell>
                          {(user.role === 'super_admin' || user.role === 'admin') && (
                            <TableCell>
                              {feeHead.isActive ? (
                                <>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleFeeHeadOpenDialog(feeHead)}
                                    sx={{ mr: 1 }}
                                    title="Edit"
                                  >
                                    <Edit />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleFeeHeadDelete(feeHead._id)}
                                    title="Delete"
                                  >
                                    <Delete />
                                  </IconButton>
                                </>
                              ) : (
                                <>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleFeeHeadReactivate(feeHead._id)}
                                    sx={{ mr: 1 }}
                                    title="Reactivate"
                                  >
                                    <Restore />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleFeeHeadOpenDialog(feeHead)}
                                    title="Edit"
                                  >
                                    <Edit />
                                  </IconButton>
                                </>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab Panel 1: Fee Structure */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, textTransform: 'uppercase' }}>
              FEE STRUCTURE
            </Typography>


            {feeStructureLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : feeStructureMatrix && feeStructureMatrix.classes && feeStructureMatrix.feeHeads && feeStructureMatrix.feeHeads.length > 0 ? (
              <Box>
                <TableContainer component={Paper} sx={{ maxHeight: '70vh', overflow: 'auto', border: '1px solid #e0e0e0' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ 
                            bgcolor: '#667eea', 
                            color: 'white', 
                            fontWeight: 'bold', 
                            minWidth: 150, 
                            position: 'sticky', 
                            left: 0, 
                            zIndex: 3,
                            borderRight: '1px solid rgba(255,255,255,0.2)'
                          }}
                        >
                          Classes
                        </TableCell>
                        <TableCell 
                          colSpan={feeStructureMatrix.feeHeads.length}
                          sx={{ bgcolor: '#667eea', color: 'white', fontWeight: 'bold', textAlign: 'center' }}
                        >
                          Fee Heads
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell 
                          sx={{ 
                            bgcolor: '#667eea', 
                            color: 'white', 
                            fontWeight: 'bold', 
                            position: 'sticky', 
                            left: 0, 
                            zIndex: 3,
                            borderRight: '1px solid rgba(255,255,255,0.2)'
                          }}
                        >
                        </TableCell>
                        {feeStructureMatrix.feeHeads.map((feeHead) => (
                          <TableCell
                            key={feeHead._id}
                            sx={{ bgcolor: '#667eea', color: 'white', fontWeight: 'bold', minWidth: 150 }}
                            align="center"
                          >
                            {capitalizeFirstOnly(feeHead.name)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {feeStructureMatrix.classes.length > 0 ? (
                        feeStructureMatrix.classes.map((cls) => (
                          <TableRow key={cls._id} hover>
                            <TableCell
                              sx={{
                                bgcolor: 'background.paper',
                                position: 'sticky',
                                left: 0,
                                zIndex: 2,
                                fontWeight: 'bold',
                                borderRight: '1px solid #e0e0e0'
                              }}
                            >
                              {capitalizeFirstOnly(cls.name)}
                            </TableCell>
                            {feeStructureMatrix.feeHeads.map((feeHead) => {
                              const classData = feeStructureMatrixData[cls._id];
                              const amount = classData?.fees?.[feeHead._id] ?? (feeStructureMatrix?.data?.[cls._id]?.fees?.[feeHead._id] ?? 0);
                              return (
                                <TableCell key={feeHead._id} align="center" sx={{ py: 1 }}>
                                  <TextField
                                    type="number"
                                    value={amount || ''}
                                    onChange={(e) => handleFeeStructureAmountChange(cls._id, feeHead._id, e.target.value)}
                                    size="small"
                                    sx={{ width: '100%', maxWidth: 150 }}
                                    InputProps={{
                                      inputProps: { min: 0, step: 1, style: { textAlign: 'center' } }
                                    }}
                                    placeholder="0"
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={feeStructureMatrix.feeHeads.length + 1} align="center">
                            No classes found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#667eea', minWidth: 120 }}
                    onClick={handleFeeStructureSave}
                    disabled={feeStructureSaving}
                  >
                    {feeStructureSaving ? <CircularProgress size={24} /> : 'Save'}
                  </Button>
                </Box>
              </Box>
            ) : feeStructureMatrix && feeStructureMatrix.feeHeads && feeStructureMatrix.feeHeads.length === 0 ? (
              <Alert severity="warning">
                No fee heads found. Please create fee heads in the "Fee Heads" tab first. (Fee heads are shared across all institutions)
              </Alert>
            ) : feeStructureMatrix && feeStructureMatrix.classes && feeStructureMatrix.classes.length === 0 ? (
              <Alert severity="warning">
                No classes found for this institution. Please create classes first.
              </Alert>
            ) : (
              <Alert severity="info">No fee structure data available. Please ensure classes and fee heads are configured.</Alert>
            )}
          </Box>
        )}

        {/* Tab Panel 2: Misc Fee Operations */}
        {/* Tab Panel 2: Assign Fee Structure */}
        {activeTab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                ASSIGN FEE STRUCTURE
              </Typography>
              <Button
                variant="outlined"
                onClick={fetchStudentsWithoutFeeStructure}
                disabled={assignFeeStructureLoading}
                sx={{ borderColor: '#667eea', color: '#667eea' }}
              >
                Refresh
              </Button>
            </Box>


            {assignFeeStructureLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : studentsWithoutFeeStructure.length === 0 ? (
              <Alert severity="info">No students found without fee structure assignment.</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#667eea' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Enrollment #</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Roll #</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Admission #</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Class</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Section</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Academic Year</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studentsWithoutFeeStructure.map((student) => (
                      <TableRow key={student._id} hover>
                        <TableCell>{student.enrollmentNumber}</TableCell>
                        <TableCell>{student.rollNumber}</TableCell>
                        <TableCell>{student.admissionNumber}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.name)}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.class)}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.section)}</TableCell>
                        <TableCell>{student.academicYear}</TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleOpenAssignFeeStructureDialog(student)}
                            sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5568d3' } }}
                          >
                            Assign Fee Structure
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab Panel 3: Misc Fee Operations */}
        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              MISC FEE OPERATIONS
            </Typography>

            {/* Sub-tabs for Misc Fee Operations */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={miscFeeSubTab} onChange={handleMiscFeeSubTabChange}>
                <Tab label="Student Operations" />
                <Tab label="Generate Voucher" />
              </Tabs>
            </Box>

            {/* Sub-tab Panel 0: Student Operations */}
            {miscFeeSubTab === 0 && (
              <Box>
                {/* Filters */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Month/Year"
                          type="month"
                          value={miscFeeFilters.monthYear}
                          onChange={(e) => setMiscFeeFilters({ ...miscFeeFilters, monthYear: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Enrolled Status</InputLabel>
                          <Select
                            multiple
                            value={miscFeeFilters.enrolled}
                            onChange={(e) => setMiscFeeFilters({ ...miscFeeFilters, enrolled: e.target.value })}
                            label="Enrolled Status"
                            renderValue={(selected) => selected.join(', ')}
                          >
                            {enrolledOptions.map((status) => (
                              <MenuItem key={status} value={status}>
                                {status}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{ bgcolor: '#667eea' }}
                          onClick={fetchMiscFeeStudents}
                        >
                          Search Students
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#667eea' }}
                    onClick={() => {
                      if (selectedMiscFeeStudents.length === 0) {
                        setError('Please select at least one student');
                        return;
                      }
                      setChangeStatusDialog(true);
                    }}
                    disabled={selectedMiscFeeStudents.length === 0}
                  >
                    Change Status
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#667eea' }}
                    onClick={() => {
                      if (selectedMiscFeeStudents.length === 0) {
                        setError('Please select at least one student');
                        return;
                      }
                      setChangeMonthlyFeeDialog(true);
                    }}
                    disabled={selectedMiscFeeStudents.length === 0}
                  >
                    Change Monthly Fee
                  </Button>
                </Box>

                {/* Students Table */}
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                        <TableCell padding="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedMiscFeeStudents.length === miscFeeStudents.length && miscFeeStudents.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMiscFeeStudents([...miscFeeStudents]);
                              } else {
                                setSelectedMiscFeeStudents([]);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>ID</TableCell>
                        <TableCell>Roll #</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell>Section</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : miscFeeStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography variant="body2" color="textSecondary">
                              No data found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        miscFeeStudents.map((student) => (
                          <TableRow key={student._id}>
                            <TableCell padding="checkbox">
                              <input
                                type="checkbox"
                                checked={selectedMiscFeeStudents.some(s => s._id === student._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMiscFeeStudents([...selectedMiscFeeStudents, student]);
                                  } else {
                                    setSelectedMiscFeeStudents(selectedMiscFeeStudents.filter(s => s._id !== student._id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>{student.id || 'N/A'}</TableCell>
                            <TableCell>{student.rollNumber || 'N/A'}</TableCell>
                            <TableCell>
                              {capitalizeFirstOnly(student.name || 'N/A')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={capitalizeFirstOnly(student.status || 'pending')}
                                color={getStatusColor(student.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{capitalizeFirstOnly(student.class || 'N/A')}</TableCell>
                            <TableCell>{capitalizeFirstOnly(student.section || 'N/A')}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Sub-tab Panel 1: Generate Voucher */}
            {miscFeeSubTab === 1 && (
              <Box>
                {/* Filters */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Month/Year"
                          type="month"
                          value={generateVoucherFilters.monthYear}
                          onChange={(e) => setGenerateVoucherFilters({ ...generateVoucherFilters, monthYear: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Enrolled Status</InputLabel>
                          <Select
                            multiple
                            value={generateVoucherFilters.enrolled}
                            onChange={(e) => setGenerateVoucherFilters({ ...generateVoucherFilters, enrolled: e.target.value })}
                            label="Enrolled Status"
                            renderValue={(selected) => selected.join(', ')}
                          >
                            {enrolledOptions.map((status) => (
                              <MenuItem key={status} value={status}>
                                {status}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<Search />}
                            sx={{ bgcolor: '#667eea' }}
                            onClick={fetchGenerateVoucherStudents}
                          >
                            Search Students
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<Receipt />}
                            sx={{ bgcolor: '#667eea' }}
                            disabled={selectedGenerateVoucherStudents.length === 0 || generateVoucherLoading}
                            onClick={handleGenerateVouchers}
                          >
                            {generateVoucherLoading ? 'Generating...' : 'Generate Vouchers'}
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Students Table */}
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                        <TableCell padding="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedGenerateVoucherStudents.length === generateVoucherStudents.length && generateVoucherStudents.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGenerateVoucherStudents([...generateVoucherStudents]);
                              } else {
                                setSelectedGenerateVoucherStudents([]);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>Voucher Status</TableCell>
                        <TableCell>ID</TableCell>
                        <TableCell>Roll #</TableCell>
                        <TableCell>Admission #</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell>Section</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : generateVoucherStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography variant="body2" color="textSecondary">
                              {error ? error : 'No students found with fee structures assigned. Please assign fee structures to students first.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        generateVoucherStudents.map((student) => (
                          <TableRow key={student._id}>
                            <TableCell padding="checkbox">
                              <input
                                type="checkbox"
                                checked={selectedGenerateVoucherStudents.some(s => s._id === student._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedGenerateVoucherStudents([...selectedGenerateVoucherStudents, student]);
                                  } else {
                                    setSelectedGenerateVoucherStudents(selectedGenerateVoucherStudents.filter(s => s._id !== student._id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={student.voucherStatus || 'Not Generated'} 
                                size="small" 
                                color={student.voucherStatus === 'Generated' ? 'success' : 'default'} 
                              />
                            </TableCell>
                            <TableCell>{student.id || 'N/A'}</TableCell>
                            <TableCell>{student.rollNumber || 'N/A'}</TableCell>
                            <TableCell>{student.admissionNo || 'N/A'}</TableCell>
                            <TableCell>
                              {capitalizeFirstOnly(student.name || 'N/A')}
                            </TableCell>
                            <TableCell>{capitalizeFirstOnly(student.class || 'N/A')}</TableCell>
                            <TableCell>{capitalizeFirstOnly(student.section || 'N/A')}</TableCell>
                            <TableCell>
                              <Chip
                                label={capitalizeFirstOnly(student.status || 'pending')}
                                color={getStatusColor(student.status)}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Total Count */}
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Typography variant="body1" fontWeight="bold">
                    Total: {generateVoucherStudents.length} student(s) | Selected: {selectedGenerateVoucherStudents.length} student(s)
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Tab Panel 3: Print Voucher */}
        {/* Tab Panel 4: Print Voucher */}
        {activeTab === 4 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              PRINT VOUCHER
            </Typography>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Month/Year"
                      type="month"
                      value={printVoucherFilters.monthYear}
                      onChange={(e) => {
                        setPrintVoucherFilters({ ...printVoucherFilters, monthYear: e.target.value });
                        // Auto-fetch when month/year changes
                        setTimeout(() => fetchPrintVoucherStudents(), 300);
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Enrolled Status</InputLabel>
                      <Select
                        multiple
                        value={printVoucherFilters.enrolled}
                        onChange={(e) => setPrintVoucherFilters({ ...printVoucherFilters, enrolled: e.target.value })}
                        label="Enrolled Status"
                        renderValue={(selected) => selected.join(', ')}
                      >
                        {enrolledOptions.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Search />}
                        sx={{ bgcolor: '#667eea' }}
                        onClick={fetchPrintVoucherStudents}
                      >
                        Search Students
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<Print />}
                        sx={{ bgcolor: '#667eea' }}
                        disabled={printVoucherStudents.length === 0}
                      >
                        Print Fee Voucher
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Students Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                    <TableCell>Action</TableCell>
                    <TableCell>Voucher Status</TableCell>
                    <TableCell>Print Status</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Roll #</TableCell>
                    <TableCell>Admission #</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : printVoucherStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No data found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    printVoucherStudents.map((student) => (
                      <TableRow key={student._id}>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewVoucher(student)}
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Chip label={student.voucherStatus || 'Pending'} size="small" color="warning" />
                        </TableCell>
                        <TableCell>
                          <Chip label={student.printStatus || 'Not Printed'} size="small" color="default" />
                        </TableCell>
                        <TableCell>{student.id || 'N/A'}</TableCell>
                        <TableCell>{student.rollNumber || 'N/A'}</TableCell>
                        <TableCell>{student.admissionNo || 'N/A'}</TableCell>
                        <TableCell>
                          {capitalizeFirstOnly(student.name || 'N/A')}
                          {student.fatherName && (
                            <Typography component="span" variant="body2" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.875rem' }}>
                              {capitalizeFirstOnly(student.fatherName)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{capitalizeFirstOnly(student.class || 'N/A')}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.section || 'N/A')}</TableCell>
                        <TableCell>
                          <Chip
                            label={capitalizeFirstOnly(student.status || 'pending')}
                            color={getStatusColor(student.status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Total Count */}
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="body1" fontWeight="bold">
                Total: {printVoucherStudents.length} student(s)
              </Typography>
            </Box>
          </Box>
        )}

        {/* Tab Panel 4: Fee Deposit */}
        {/* Tab Panel 5: Fee Deposit */}
        {activeTab === 5 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              FEE DEPOSIT
            </Typography>

            {/* Sub-tabs for Fee Deposit */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={feeDepositSubTab} onChange={handleFeeDepositSubTabChange}>
                <Tab label="Manual Fee Deposit" />
                <Tab label="Fee Deposit by Voucher" />
              </Tabs>
            </Box>

            {/* Sub-tab Panel 0: Manual Fee Deposit */}
            {feeDepositSubTab === 0 && (
              <Box>
                {/* Search Section */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#667eea' }}>
                      Search Student
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4} lg={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="ID"
                          value={manualDepositSearch.id}
                          onChange={(e) => setManualDepositSearch({ ...manualDepositSearch, id: e.target.value })}
                          placeholder="Enter ID"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4} lg={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Admission Number"
                          value={manualDepositSearch.admissionNumber}
                          onChange={(e) => setManualDepositSearch({ ...manualDepositSearch, admissionNumber: e.target.value })}
                          placeholder="Enter admission number"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4} lg={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Roll Number"
                          value={manualDepositSearch.rollNumber}
                          onChange={(e) => setManualDepositSearch({ ...manualDepositSearch, rollNumber: e.target.value })}
                          placeholder="Enter roll number"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4} lg={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Student Name"
                          value={manualDepositSearch.studentName}
                          onChange={(e) => setManualDepositSearch({ ...manualDepositSearch, studentName: e.target.value })}
                          placeholder="Enter student name"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4} lg={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Phone Number"
                          value={manualDepositSearch.phoneNumber}
                          onChange={(e) => setManualDepositSearch({ ...manualDepositSearch, phoneNumber: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Typography variant="body2" color="textSecondary">
                            Login as: {user.name || 'User'} ({user.id || 'N/A'})
                          </Typography>
                          <Button
                            variant="contained"
                            startIcon={<Search />}
                            sx={{ bgcolor: '#667eea' }}
                            onClick={fetchManualDepositStudents}
                            disabled={loading}
                          >
                            {loading ? 'Searching...' : 'Search'}
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Student Table Section */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                        Student List
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                        *Click on student row to select
                      </Typography>
                    </Box>

                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <TableContainer sx={{ maxHeight: 500 }}>
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                              <TableCell>ID</TableCell>
                              <TableCell>Roll #</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>School</TableCell>
                              <TableCell>Class</TableCell>
                              <TableCell>Section</TableCell>
                              <TableCell>Mobile #</TableCell>
                              <TableCell>Admission #</TableCell>
                              <TableCell>Admission Date</TableCell>
                              <TableCell>Admission Effective Date</TableCell>
                              <TableCell>Adv. Fee</TableCell>
                              <TableCell>Last Voucher</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {manualDepositStudents.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={14} align="center" sx={{ py: 4 }}>
                                  <Typography variant="body2" color="textSecondary">
                                    No data found. Please search for students.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ) : (
                              manualDepositStudents.map((student) => (
                                <TableRow
                                  key={student._id}
                                  onClick={() => setSelectedManualDepositStudent(student)}
                                  sx={{
                                    cursor: 'pointer',
                                    bgcolor: selectedManualDepositStudent?._id === student._id ? '#e3f2fd' : 'inherit',
                                    '&:hover': { bgcolor: selectedManualDepositStudent?._id === student._id ? '#e3f2fd' : '#f5f5f5' }
                                  }}
                                >
                                  <TableCell>{student.id || 'N/A'}</TableCell>
                                  <TableCell>{student.rollNumber || 'N/A'}</TableCell>
                                  <TableCell sx={{ fontWeight: selectedManualDepositStudent?._id === student._id ? 'bold' : 'normal' }}>
                                    {capitalizeFirstOnly(student.name || 'N/A')}
                                    {student.fatherName && (
                                      <Typography component="span" variant="body2" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.875rem' }}>
                                        {capitalizeFirstOnly(student.fatherName)}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={capitalizeFirstOnly(student.status || 'pending')}
                                      color={getStatusColor(student.status)}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>{student.school || 'N/A'}</TableCell>
                                  <TableCell>{capitalizeFirstOnly(student.class || 'N/A')}</TableCell>
                                  <TableCell>{capitalizeFirstOnly(student.section || 'N/A')}</TableCell>
                                  <TableCell>{student.mobileNumber || 'N/A'}</TableCell>
                                  <TableCell>{student.admissionNo || 'N/A'}</TableCell>
                                  <TableCell>{student.admissionDate || 'N/A'}</TableCell>
                                  <TableCell>{student.admissionEffectiveDate || 'N/A'}</TableCell>
                                  <TableCell>{student.advanceFee || '0'}</TableCell>
                                  <TableCell>{student.lastVoucher || 'N/A'}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Selected Student Info & Fee Collection */}
                {selectedManualDepositStudent && (
                  <Card sx={{ bgcolor: '#f8f9fa', border: '2px solid #667eea' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                          Fee Collection - {capitalizeFirstOnly(selectedManualDepositStudent.name || 'N/A')}
                        </Typography>
                        <Chip
                          label="Selected"
                          color="primary"
                          size="small"
                        />
                      </Box>

                      <Grid container spacing={3}>
                        {/* Payment Method & Date */}
                        <Grid item xs={12} md={6}>
                          <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold' }}>Payment Method</FormLabel>
                          <RadioGroup
                            row
                            value={manualDepositForm.paymentMethod}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, paymentMethod: e.target.value })}
                          >
                            <FormControlLabel value="cash" control={<Radio />} label="Cash" />
                            <FormControlLabel value="bank" control={<Radio />} label="Bank" />
                          </RadioGroup>
                          {manualDepositForm.paymentMethod === 'bank' && (
                            <FormControl fullWidth sx={{ mt: 2 }}>
                              <InputLabel>Select Bank Account</InputLabel>
                              <Select
                                value={manualDepositForm.bankAccount}
                                onChange={(e) => setManualDepositForm({ ...manualDepositForm, bankAccount: e.target.value })}
                                label="Select Bank Account"
                              >
                                <MenuItem value="">Select Bank Account</MenuItem>
                                <MenuItem value="allied">Allied Bank - 0010000070780246</MenuItem>
                                <MenuItem value="bankislami">Bank Islami - 0108000000000001</MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Payment Date"
                            type="date"
                            value={manualDepositForm.paymentDate}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, paymentDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>

                        {/* Fee Amount Fields */}
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Fee Amounts
                          </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <TextField
                            fullWidth
                            label="Fee Amount"
                            type="number"
                            value={manualDepositForm.feeAmount}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, feeAmount: e.target.value })}
                            placeholder="0.00"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                            }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <TextField
                            fullWidth
                            label="Fine Amount"
                            type="number"
                            value={manualDepositForm.fineAmount}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, fineAmount: e.target.value })}
                            placeholder="0.00"
                            sx={{ 
                              '& .MuiOutlinedInput-root': {
                                bgcolor: '#ffebee',
                                '&:hover': {
                                  bgcolor: '#ffcdd2'
                                }
                              }
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                            }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <TextField
                            fullWidth
                            label="Pre Fine Amount"
                            type="number"
                            value={manualDepositForm.preFineAmount}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, preFineAmount: e.target.value })}
                            placeholder="0.00"
                            sx={{ 
                              '& .MuiOutlinedInput-root': {
                                bgcolor: '#ffebee',
                                '&:hover': {
                                  bgcolor: '#ffcdd2'
                                }
                              }
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                            }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <TextField
                            fullWidth
                            label="Absent Fine Amount"
                            type="number"
                            value={manualDepositForm.absentFineAmount}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, absentFineAmount: e.target.value })}
                            placeholder="0.00"
                            sx={{ 
                              '& .MuiOutlinedInput-root': {
                                bgcolor: '#ffebee',
                                '&:hover': {
                                  bgcolor: '#ffcdd2'
                                }
                              }
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                            }}
                          />
                        </Grid>

                        {/* Total Amount Display */}
                        <Grid item xs={12}>
                          <Box sx={{ 
                            p: 2, 
                            bgcolor: '#e8f5e9', 
                            borderRadius: 1,
                            border: '1px solid #4caf50'
                          }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                              Total Amount: Rs. {(
                                parseFloat(manualDepositForm.feeAmount || 0) +
                                parseFloat(manualDepositForm.fineAmount || 0) +
                                parseFloat(manualDepositForm.preFineAmount || 0) +
                                parseFloat(manualDepositForm.absentFineAmount || 0)
                              ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        </Grid>

                        {/* Remarks */}
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <TextField
                            fullWidth
                            label="Remarks"
                            multiline
                            rows={3}
                            value={manualDepositForm.remarks}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, remarks: e.target.value })}
                            placeholder="Enter any remarks or notes about this payment"
                          />
                        </Grid>

                        {/* Action Buttons */}
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
                            <Button
                              variant="outlined"
                              onClick={() => {
                                setManualDepositForm({
                                  paymentMethod: 'cash',
                                  bankAccount: '',
                                  paymentDate: new Date().toISOString().split('T')[0],
                                  feeAmount: '',
                                  fineAmount: '',
                                  preFineAmount: '',
                                  absentFineAmount: '',
                                  remarks: ''
                                });
                                setSelectedManualDepositStudent(null);
                              }}
                            >
                              Reset
                            </Button>
                            <Button
                              variant="contained"
                              size="large"
                              sx={{ bgcolor: '#667eea', minWidth: 150 }}
                              onClick={() => {
                                setSuccess('Payment saved successfully');
                              }}
                            >
                              Save Payment
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State when no student selected */}
                {!selectedManualDepositStudent && manualDepositStudents.length > 0 && (
                  <Card sx={{ bgcolor: '#fff3e0', border: '1px dashed #ff9800' }}>
                    <CardContent>
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body1" color="textSecondary">
                          Please select a student from the table above to proceed with fee collection.
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}

            {/* Sub-tab Panel 1: Fee Deposit by Voucher */}
            {feeDepositSubTab === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Fee Deposit by Voucher
                </Typography>
                <Alert severity="info">Content for "Fee Deposit by Voucher" will be implemented here.</Alert>
              </Box>
            )}
          </Box>
        )}

        {/* Change Status Dialog */}
        <Dialog open={changeStatusDialog} onClose={() => setChangeStatusDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Change Status</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={changeStatusForm.status}
                    onChange={(e) => setChangeStatusForm({ ...changeStatusForm, status: e.target.value })}
                    label="Status"
                  >
                    {enrolledOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason"
                  multiline
                  rows={3}
                  value={changeStatusForm.reason}
                  onChange={(e) => setChangeStatusForm({ ...changeStatusForm, reason: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Change Date"
                  type="date"
                  value={changeStatusForm.changeDate}
                  onChange={(e) => setChangeStatusForm({ ...changeStatusForm, changeDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangeStatusDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#667eea' }}
              onClick={handleStatusUpdate}
              disabled={!changeStatusForm.reason || !changeStatusForm.status || loading}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* Change Monthly Fee Dialog */}
        <Dialog open={changeMonthlyFeeDialog} onClose={() => setChangeMonthlyFeeDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Change Monthly Fee</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormLabel component="legend">Operation</FormLabel>
                <RadioGroup
                  row
                  value={changeMonthlyFeeForm.operation}
                  onChange={(e) => setChangeMonthlyFeeForm({ ...changeMonthlyFeeForm, operation: e.target.value })}
                >
                  <FormControlLabel value="update" control={<Radio />} label="Update Fee Head" />
                  <FormControlLabel value="add" control={<Radio />} label="Add New Fee Head" />
                  <FormControlLabel value="remove" control={<Radio />} label="Remove Fee Head" />
                </RadioGroup>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Fee Head</InputLabel>
                  <Select
                    value={changeMonthlyFeeForm.feeHead}
                    onChange={(e) => setChangeMonthlyFeeForm({ ...changeMonthlyFeeForm, feeHead: e.target.value })}
                    label="Fee Head"
                  >
                    <MenuItem value="">Select Fee Head</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Fee Change Type</InputLabel>
                  <Select
                    value={changeMonthlyFeeForm.feeChangeType}
                    onChange={(e) => setChangeMonthlyFeeForm({ ...changeMonthlyFeeForm, feeChangeType: e.target.value })}
                    label="Fee Change Type"
                  >
                    <MenuItem value="">Select Type</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Value"
                  type="number"
                  value={changeMonthlyFeeForm.value}
                  onChange={(e) => setChangeMonthlyFeeForm({ ...changeMonthlyFeeForm, value: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks"
                  multiline
                  rows={3}
                  value={changeMonthlyFeeForm.remarks}
                  onChange={(e) => setChangeMonthlyFeeForm({ ...changeMonthlyFeeForm, remarks: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangeMonthlyFeeDialog(false)}>Close</Button>
            <Button variant="contained" sx={{ bgcolor: '#667eea' }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Fee Head Dialog */}
        <Dialog
          open={feeHeadDialogOpen}
          onClose={handleFeeHeadCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                {feeHeadEditMode ? 'Edit Fee Head' : 'Add Fee Head'}
              </Typography>
              <IconButton onClick={handleFeeHeadCloseDialog} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Head Name *"
                  value={feeHeadFormData.name}
                  onChange={(e) => setFeeHeadFormData({ ...feeHeadFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Priority *</InputLabel>
                  <Select
                    value={feeHeadFormData.priority}
                    onChange={(e) => setFeeHeadFormData({ ...feeHeadFormData, priority: e.target.value })}
                    label="Priority *"
                  >
                    {availablePriorities.map((priority) => (
                      <MenuItem
                        key={priority.value}
                        value={priority.value}
                        disabled={!priority.available && (!feeHeadEditMode || selectedFeeHead?.priority !== priority.value)}
                      >
                        {priority.label} {!priority.available && selectedFeeHead?.priority !== priority.value ? '(Already used)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Account Type *</InputLabel>
                  <Select
                    value={feeHeadFormData.accountType}
                    onChange={(e) => setFeeHeadFormData({ ...feeHeadFormData, accountType: e.target.value })}
                    label="Account Type *"
                  >
                    {accountTypeOptions.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Frequency Type *</InputLabel>
                  <Select
                    value={feeHeadFormData.frequencyType}
                    onChange={(e) => setFeeHeadFormData({ ...feeHeadFormData, frequencyType: e.target.value })}
                    label="Frequency Type *"
                  >
                    {frequencyTypeOptions.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFeeHeadCloseDialog}>Close</Button>
            <Button
              variant="contained"
              onClick={handleFeeHeadSubmit}
              disabled={!feeHeadFormData.name || !feeHeadFormData.priority || !feeHeadFormData.accountType || !feeHeadFormData.frequencyType}
              sx={{ bgcolor: '#667eea' }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>


        {/* Voucher View Dialog */}
        <Dialog 
          open={voucherDialogOpen} 
          onClose={() => {
            setVoucherDialogOpen(false);
            setVoucherData(null);
            setSelectedVoucherStudent(null);
          }} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Fee Voucher - {selectedVoucherStudent?.name || 'N/A'}
              </Typography>
              <Button onClick={() => {
                setVoucherDialogOpen(false);
                setVoucherData(null);
                setSelectedVoucherStudent(null);
              }}>
                Close
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent>
            {voucherLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : voucherData ? (
              <Box>
                {/* Parent's Copy */}
                <Paper sx={{ p: 2, mb: 2, border: '2px solid #000' }}>
                  <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                    PARENT'S COPY
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Voucher No:</strong> {voucherData.voucherNo}</Typography>
                      <Typography variant="body2"><strong>Roll No:</strong> {voucherData.rollNo}</Typography>
                      <Typography variant="body2"><strong>Fee Month:</strong> {voucherData.feeMonth}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Valid Date:</strong> {voucherData.validDate}</Typography>
                      <Typography variant="body2"><strong>Issue Date:</strong> {voucherData.issueDate}</Typography>
                      <Typography variant="body2"><strong>Due Date:</strong> {voucherData.dueDate}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Student ID:</strong> {voucherData.studentId}</Typography>
                      <Typography variant="body2"><strong>Admission No:</strong> {voucherData.admissionNo}</Typography>
                      <Typography variant="body2"><strong>Name:</strong> {voucherData.name}</Typography>
                      <Typography variant="body2"><strong>Father Name:</strong> {voucherData.fatherName}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Class:</strong> {voucherData.class}</Typography>
                      <Typography variant="body2"><strong>Section:</strong> {voucherData.section}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Fee Details:</Typography>
                      {voucherData.feeHeads.map((head, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{head.name}:</Typography>
                          <Typography variant="body2">Rs. {head.amount.toLocaleString()}</Typography>
                        </Box>
                      ))}
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <Typography>Payable Within Due Date:</Typography>
                        <Typography>Rs. {voucherData.payableWithinDueDate.toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <Typography>Payable After Due Date:</Typography>
                        <Typography>Rs. {voucherData.payableAfterDueDate.toLocaleString()}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* School's Copy */}
                <Paper sx={{ p: 2, mb: 2, border: '2px solid #000' }}>
                  <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                    SCHOOL'S COPY
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Voucher No:</strong> {voucherData.voucherNo}</Typography>
                      <Typography variant="body2"><strong>Roll No:</strong> {voucherData.rollNo}</Typography>
                      <Typography variant="body2"><strong>Fee Month:</strong> {voucherData.feeMonth}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Valid Date:</strong> {voucherData.validDate}</Typography>
                      <Typography variant="body2"><strong>Issue Date:</strong> {voucherData.issueDate}</Typography>
                      <Typography variant="body2"><strong>Due Date:</strong> {voucherData.dueDate}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Student ID:</strong> {voucherData.studentId}</Typography>
                      <Typography variant="body2"><strong>Admission No:</strong> {voucherData.admissionNo}</Typography>
                      <Typography variant="body2"><strong>Name:</strong> {voucherData.name}</Typography>
                      <Typography variant="body2"><strong>Father Name:</strong> {voucherData.fatherName}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Class:</strong> {voucherData.class}</Typography>
                      <Typography variant="body2"><strong>Section:</strong> {voucherData.section}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Fee Details:</Typography>
                      {voucherData.feeHeads.map((head, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{head.name}:</Typography>
                          <Typography variant="body2">Rs. {head.amount.toLocaleString()}</Typography>
                        </Box>
                      ))}
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <Typography>Payable Within Due Date:</Typography>
                        <Typography>Rs. {voucherData.payableWithinDueDate.toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <Typography>Payable After Due Date:</Typography>
                        <Typography>Rs. {voucherData.payableAfterDueDate.toLocaleString()}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Bank's Copy */}
                <Paper sx={{ p: 2, border: '2px solid #000' }}>
                  <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                    BANK'S COPY
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Voucher No:</strong> {voucherData.voucherNo}</Typography>
                      <Typography variant="body2"><strong>Roll No:</strong> {voucherData.rollNo}</Typography>
                      <Typography variant="body2"><strong>Fee Month:</strong> {voucherData.feeMonth}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Valid Date:</strong> {voucherData.validDate}</Typography>
                      <Typography variant="body2"><strong>Issue Date:</strong> {voucherData.issueDate}</Typography>
                      <Typography variant="body2"><strong>Due Date:</strong> {voucherData.dueDate}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Student ID:</strong> {voucherData.studentId}</Typography>
                      <Typography variant="body2"><strong>Admission No:</strong> {voucherData.admissionNo}</Typography>
                      <Typography variant="body2"><strong>Name:</strong> {voucherData.name}</Typography>
                      <Typography variant="body2"><strong>Father Name:</strong> {voucherData.fatherName}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Class:</strong> {voucherData.class}</Typography>
                      <Typography variant="body2"><strong>Section:</strong> {voucherData.section}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Fee Details:</Typography>
                      {voucherData.feeHeads.map((head, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{head.name}:</Typography>
                          <Typography variant="body2">Rs. {head.amount.toLocaleString()}</Typography>
                        </Box>
                      ))}
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <Typography>Payable Within Due Date:</Typography>
                        <Typography>Rs. {voucherData.payableWithinDueDate.toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <Typography>Payable After Due Date:</Typography>
                        <Typography>Rs. {voucherData.payableAfterDueDate.toLocaleString()}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            ) : (
              <Alert severity="error">Failed to load voucher data</Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setVoucherDialogOpen(false);
              setVoucherData(null);
              setSelectedVoucherStudent(null);
            }}>
              Close
            </Button>
            <Button variant="contained" startIcon={<Print />} sx={{ bgcolor: '#667eea' }}>
              Print
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Fee Structure Dialog */}
        <Dialog
          open={assignFeeStructureDialog}
          onClose={handleCloseAssignFeeStructureDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Assign Fee Structure
              </Typography>
              <IconButton onClick={handleCloseAssignFeeStructureDialog} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedStudentForAssignment && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Student Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Name:</strong> {capitalizeFirstOnly(selectedStudentForAssignment.name)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Enrollment #:</strong> {selectedStudentForAssignment.enrollmentNumber}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Roll #:</strong> {selectedStudentForAssignment.rollNumber}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2"><strong>Class:</strong> {capitalizeFirstOnly(selectedStudentForAssignment.class)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Class *</InputLabel>
                  <Select
                    value={assignFeeStructureForm.classId}
                    onChange={(e) => setAssignFeeStructureForm({ ...assignFeeStructureForm, classId: e.target.value })}
                    label="Class *"
                  >
                    {availableClasses.map((cls) => (
                      <MenuItem key={cls._id} value={cls._id}>
                        {cls.name} {cls.code ? `(${cls.code})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  All fee structures for the selected class will be assigned to the student
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Discount"
                  value={assignFeeStructureForm.discount}
                  onChange={(e) => setAssignFeeStructureForm({ ...assignFeeStructureForm, discount: e.target.value })}
                  InputProps={{
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={assignFeeStructureForm.discountType}
                    onChange={(e) => setAssignFeeStructureForm({ ...assignFeeStructureForm, discountType: e.target.value })}
                    label="Discount Type"
                  >
                    <MenuItem value="amount">Amount (Rs.)</MenuItem>
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Discount Reason (Optional)"
                  value={assignFeeStructureForm.discountReason}
                  onChange={(e) => setAssignFeeStructureForm({ ...assignFeeStructureForm, discountReason: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAssignFeeStructureDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleAssignFeeStructure}
              disabled={assignFeeStructureLoading || !assignFeeStructureForm.classId}
              sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5568d3' } }}
            >
              {assignFeeStructureLoading ? <CircularProgress size={24} /> : 'Assign Fee Structure'}
            </Button>
          </DialogActions>
        </Dialog>
        </Paper>
      </Container>
    </Box>
  );
};

export default FeeManagement;
