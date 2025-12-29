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
} from '@mui/icons-material';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';
import { capitalizeFirstOnly } from '../utils/textUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const FeeManagement = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab management
  const [activeTab, setActiveTab] = useState(0);
  const [feeDepositSubTab, setFeeDepositSubTab] = useState(0);

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
  const [feeStructureAcademicYear, setFeeStructureAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [feeStructureMatrixData, setFeeStructureMatrixData] = useState({});
  const [feeStructureSelectedInstitution, setFeeStructureSelectedInstitution] = useState(null);

  // Print Voucher
  const [printVoucherFilters, setPrintVoucherFilters] = useState({
    monthYear: `${new Date().getMonth() + 1}-${new Date().getFullYear()}`,
    enrolled: []
  });
  const [printVoucherStudents, setPrintVoucherStudents] = useState([]);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [selectedVoucherStudent, setSelectedVoucherStudent] = useState(null);
  const [voucherData, setVoucherData] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Manual Fee Deposit
  const [manualDepositSearch, setManualDepositSearch] = useState({
    id: '',
    admissionNumber: '',
    rollNumber: '',
    studentName: '',
    phoneNumber: '',
    familyNumber: ''
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
      // For super admin, ensure institution is selected
      if (isSuperAdmin) {
        const institutionId = feeStructureSelectedInstitution || getInstitutionId();
        if (!institutionId) {
          setError('Please select an institution first to view classes');
          setFeeStructureLoading(false);
          return;
        }
      }
      
      const params = {
        academicYear: feeStructureAcademicYear
      };
      
      // Institution is still needed to get classes (classes are institution-specific)
      // But fee structures themselves are shared
      if (isSuperAdmin) {
        const institutionId = feeStructureSelectedInstitution || getInstitutionId();
        if (institutionId) {
          params.institution = institutionId; // For getting classes only
        }
      } else {
        // For admin users, get their institution for classes
        const institutionId = getInstitutionId();
        if (institutionId) {
          params.institution = institutionId; // For getting classes only
        }
      }

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
      // Fee structures are institution-specific
      const institutionId = feeStructureSelectedInstitution || getInstitutionId();
      
      const payload = {
        institution: institutionId,
        academicYear: feeStructureAcademicYear,
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
          name: admission.personalInfo?.firstName && admission.personalInfo?.lastName
            ? `${admission.personalInfo.firstName} ${admission.personalInfo.lastName}`
            : admission.personalInfo?.firstName || 'N/A',
          fatherName: admission.personalInfo?.fatherName || 'N/A',
          status: admission.status || 'pending',
          school: admission.institution?.name || 'N/A',
          class: admission.class?.name || 'N/A',
          section: admission.section?.name || 'N/A',
          mobileNumber: admission.personalInfo?.phone || 'N/A',
          admissionNo: admission.applicationNumber || 'N/A',
          admissionDate: admission.admissionDate ? new Date(admission.admissionDate).toLocaleDateString() : 'N/A',
          familyNumber: admission.familyNumber || 'N/A',
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
      const token = localStorage.getItem('token');
      const institutionId = user.institution?._id || user.institution;

      const params = {
        institution: institutionId
      };

      if (printVoucherFilters.enrolled && printVoucherFilters.enrolled.length > 0) {
        params.status = printVoucherFilters.enrolled;
      }

      const response = await axios.get(`${API_URL}/admissions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
        paramsSerializer: { indexes: null }
      });

      const admissions = response.data.data || [];
      const transformedStudents = admissions.map(admission => ({
        _id: admission._id,
        id: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
        rollNumber: admission.rollNumber || 'N/A',
        admissionNo: admission.applicationNumber || 'N/A',
        familyNumber: admission.familyNumber || 'N/A',
        name: admission.personalInfo?.firstName && admission.personalInfo?.lastName
          ? `${admission.personalInfo.firstName} ${admission.personalInfo.lastName}`
          : admission.personalInfo?.firstName || 'N/A',
        fatherName: admission.personalInfo?.fatherName || 'N/A',
        class: admission.class?.name || 'N/A',
        section: admission.section?.name || 'N/A',
        status: admission.status || 'pending',
        studentCategory: admission.category || 'N/A',
        voucherStatus: 'Pending',
        printStatus: 'Not Printed'
      }));
      setPrintVoucherStudents(transformedStudents);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch voucher data
  const fetchVoucherData = async (student, monthYear) => {
    try {
      setVoucherLoading(true);
      const token = localStorage.getItem('token');

      const admissionResponse = await axios.get(`${API_URL}/admissions/${student._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const admission = admissionResponse.data.data;

      if (!admission) {
        throw new Error('Admission not found');
      }

      const [month, year] = monthYear.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

      let feeHeads = [];
      let totalAmount = 0;
      let lateFeeFine = 0;
      let absentFine = 0;
      let arrears = 0;
      let dueDate = new Date(parseInt(year), parseInt(month), 20);

      try {
        const institutionId = user.institution?._id || user.institution;
        const academicYear = admission.academicYear || new Date().getFullYear().toString();

        const matrixResponse = await axios.get(`${API_URL}/fees/structure-matrix`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            institution: institutionId,
            academicYear: academicYear
          }
        });

        const matrix = matrixResponse.data.data;

        if (matrix && matrix.matrix && admission.class) {
          const classId = admission.class._id || admission.class;
          const classRow = matrix.matrix.find(row =>
            row.classId?.toString() === classId.toString() ||
            row.class?._id?.toString() === classId.toString()
          );

          if (classRow && classRow.fees) {
            const feeHeadMap = {};
            if (matrix.feeHeads && Array.isArray(matrix.feeHeads)) {
              matrix.feeHeads.forEach(head => {
                feeHeadMap[head._id] = head.name;
              });
            }

            feeHeads = Object.entries(classRow.fees)
              .filter(([headId, amount]) => amount > 0)
              .map(([headId, amount]) => ({
                name: feeHeadMap[headId] || 'Fee Head',
                amount: amount || 0
              }));

            totalAmount = feeHeads.reduce((sum, head) => sum + (head.amount || 0), 0);
          }
        }

        try {
          const feeResponse = await axios.get(`${API_URL}/fees/student-fees`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              student: admission.studentId?._id || admission.studentId,
              admission: student._id
            }
          });

          const studentFees = feeResponse.data.data || [];
          const monthFees = studentFees.filter(fee => {
            if (!fee.dueDate) return false;
            const feeDate = new Date(fee.dueDate);
            return feeDate >= startDate && feeDate <= endDate;
          });

          if (monthFees.length > 0) {
            const firstFee = monthFees[0];
            if (firstFee.dueDate) {
              dueDate = new Date(firstFee.dueDate);
            }

            const unpaidFees = studentFees.filter(f => {
              if (!f.dueDate || f.status === 'paid') return false;
              const feeDate = new Date(f.dueDate);
              return feeDate < startDate;
            });
            arrears = unpaidFees.reduce((sum, f) => sum + (f.dueAmount || 0), 0);

            const now = new Date();
            if (dueDate < now) {
              lateFeeFine = 200;
            }
          }
        } catch (err) {
          console.error('Error fetching student fees:', err);
        }

      } catch (err) {
        console.error('Error fetching fee structure matrix:', err);
      }

      if (feeHeads.length === 0) {
        feeHeads = [
          { name: 'Tuition Fee', amount: 0 }
        ];
      }

      const tuitionFee = feeHeads.find(h => h.name.toLowerCase().includes('tuition'))?.amount ||
                        feeHeads.reduce((sum, h) => sum + h.amount, 0) || 0;
      const payableWithinDueDate = tuitionFee + arrears;
      const payableAfterDueDate = payableWithinDueDate + lateFeeFine + absentFine;

      const issueDate = new Date().toISOString().split('T')[0];
      const formattedDueDate = dueDate.toISOString().split('T')[0];
      const validDate = new Date(parseInt(year), parseInt(month), 31).toISOString().split('T')[0];

      return {
        voucherNo: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
        rollNo: admission.rollNumber || admission.studentId?.rollNumber || 'N/A',
        feeMonth: monthYear,
        validDate: validDate,
        issueDate: issueDate,
        dueDate: formattedDueDate,
        studentId: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
        admissionNo: admission.applicationNumber || 'N/A',
        name: admission.personalInfo?.firstName && admission.personalInfo?.lastName
          ? `${admission.personalInfo.firstName} ${admission.personalInfo.lastName}`
          : admission.personalInfo?.firstName || 'N/A',
        fatherName: admission.personalInfo?.fatherName || admission.guardianInfo?.fatherName || 'N/A',
        class: admission.class?.name || 'N/A',
        section: admission.section?.name || 'N/A',
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
      fetchMiscFeeStudents();
    }
    if (activeTab === 3) {
      fetchPrintVoucherStudents();
    }
  }, [activeTab, miscFeeFilters, printVoucherFilters, feeHeadSearchTerm, feeStructureAcademicYear, feeStructureSelectedInstitution]);

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
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Fee Heads" />
              <Tab label="Fee Structure" />
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

            {/* Filters */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {isSuperAdmin && (
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Schools</InputLabel>
                  <Select
                    value={feeStructureSelectedInstitution || ''}
                    onChange={(e) => {
                      setFeeStructureSelectedInstitution(e.target.value);
                      setTimeout(() => fetchFeeStructureMatrix(), 100);
                    }}
                    label="Schools"
                  >
                    {institutions.map((inst) => (
                      <MenuItem key={inst._id} value={inst._id}>
                        {capitalizeFirstOnly(inst.name)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                label="Academic Year"
                value={feeStructureAcademicYear}
                onChange={(e) => {
                  setFeeStructureAcademicYear(e.target.value);
                  fetchFeeStructureMatrix();
                }}
                placeholder="2024-2025"
                sx={{ minWidth: 200 }}
              />
            </Box>

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
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              MISC FEE OPERATIONS
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
                    <TableCell>Father Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Section</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : miscFeeStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
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
                        <TableCell>{capitalizeFirstOnly(student.name || 'N/A')}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.fatherName || 'N/A')}</TableCell>
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

        {/* Tab Panel 3: Print Voucher */}
        {activeTab === 3 && (
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
                      onChange={(e) => setPrintVoucherFilters({ ...printVoucherFilters, monthYear: e.target.value })}
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
                    <TableCell>Family #</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Father Name</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Student Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : printVoucherStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center">
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
                        <TableCell>{student.familyNumber || 'N/A'}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.name || 'N/A')}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.fatherName || 'N/A')}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.class || 'N/A')}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.section || 'N/A')}</TableCell>
                        <TableCell>
                          <Chip
                            label={capitalizeFirstOnly(student.status || 'pending')}
                            color={getStatusColor(student.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{capitalizeFirstOnly(student.studentCategory || 'N/A')}</TableCell>
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
        {activeTab === 4 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              FEE DEPOSIT
            </Typography>

            {/* Sub-tabs for Fee Deposit */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={feeDepositSubTab} onChange={(e, newValue) => setFeeDepositSubTab(newValue)}>
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
                      <Grid item xs={12} sm={6} md={4} lg={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Family Number"
                          value={manualDepositSearch.familyNumber}
                          onChange={(e) => setManualDepositSearch({ ...manualDepositSearch, familyNumber: e.target.value })}
                          placeholder="Enter family number"
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
                            onClick={() => {
                              setSuccess('Search functionality will be implemented');
                            }}
                          >
                            Search
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
                              <TableCell>Father Name</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>School</TableCell>
                              <TableCell>Class</TableCell>
                              <TableCell>Section</TableCell>
                              <TableCell>Mobile #</TableCell>
                              <TableCell>Admission #</TableCell>
                              <TableCell>Admission Date</TableCell>
                              <TableCell>Family #</TableCell>
                              <TableCell>Admission Effective Date</TableCell>
                              <TableCell>Adv. Fee</TableCell>
                              <TableCell>Last Voucher</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {manualDepositStudents.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
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
                                  </TableCell>
                                  <TableCell>{capitalizeFirstOnly(student.fatherName || 'N/A')}</TableCell>
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
                                  <TableCell>{student.familyNumber || 'N/A'}</TableCell>
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
        </Paper>
      </Container>
    </Box>
  );
};

export default FeeManagement;
