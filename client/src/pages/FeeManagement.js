import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
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
  TablePagination,
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
  AccountBalanceWallet,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { capitalizeFirstOnly } from '../utils/textUtils';
import { notifyError, notifySuccess } from '../utils/notify';
import {
  getAuthToken,
  getInstitutionId as getInstitutionIdUtil,
  parseMonthYear,
  formatMonthYear,
  calculateAcademicYear,
  getStudentName,
  getStudentId,
  getRollNumber,
  transformStudentData,
  createAxiosConfig,
  formatCurrency,
  matchesVoucherMonthYear
} from '../utils/feeUtils';
import { getApiBaseUrl } from '../config/api';
import ReportsTab from '../components/fee-management/ReportsTab';

const API_URL = getApiBaseUrl();

const FeeManagement = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Tab name mappings
  const tabNames = ['fee-heads', 'fee-structure', 'assign-fee-structure', 'voucher-generation', 'print-voucher', 'fee-deposit', 'receipt', 'suspense', 'reports'];
  const miscSubTabNames = ['generate-voucher', 'student-operations'];
  const suspenseSubTabNames = ['unidentified', 'reconciled'];

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
      if (tabIndex === 3) { // voucher-generation
        const subtabIndex = miscSubTabNames.indexOf(subtabParam);
        return subtabIndex >= 0 ? subtabIndex : 0;
      }
      if (tabIndex === 7) { // suspense
        const subtabIndex = suspenseSubTabNames.indexOf(subtabParam);
        return subtabIndex >= 0 ? subtabIndex : 0;
      }
    }
    return 0;
  };

  const [activeTab, setActiveTab] = useState(getTabFromURL());
  const [miscFeeSubTab, setMiscFeeSubTab] = useState(getSubTabFromURL(3));
  const [suspenseSubTab, setSuspenseSubTab] = useState(getSubTabFromURL(7));

  // Update URL when tabs change
  const updateURL = (tabIndex, subtabIndex = null) => {
    const params = new URLSearchParams();
    params.set('tab', tabNames[tabIndex]);
    
    if (subtabIndex !== null) {
      if (tabIndex === 3) { // misc-operations
        params.set('subtab', miscSubTabNames[subtabIndex]);
      }
      if (tabIndex === 7) { // suspense
        params.set('subtab', suspenseSubTabNames[subtabIndex]);
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

  // Handle suspense sub-tab change
  const handleSuspenseSubTabChange = (event, newValue) => {
    setSuspenseSubTab(newValue);
    updateURL(7, newValue);
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
    }
    
    if (tabFromURL === 7 && subtabFromURL !== suspenseSubTab) {
      setSuspenseSubTab(subtabFromURL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Status options
  const [enrolledOptions, setEnrolledOptions] = useState([]);

  // Voucher Generation
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
    name: '',
    id: '',
    rollNumber: '',
    class: ''
  });
  const [generateVoucherStudents, setGenerateVoucherStudents] = useState([]);
  const [selectedGenerateVoucherStudents, setSelectedGenerateVoucherStudents] = useState([]);
  const [generateVoucherLoading, setGenerateVoucherLoading] = useState(false);
  const [feeHeadSelectionDialogOpen, setFeeHeadSelectionDialogOpen] = useState(false);
  const [selectedFeeHeadIds, setSelectedFeeHeadIds] = useState([]);
  // Default due date: 20th of current month
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(20);
    return date.toISOString().split('T')[0];
  };
  const [voucherDueDate, setVoucherDueDate] = useState(getDefaultDueDate()); // Default for newly generated vouchers
  const [feeHeadAmounts, setFeeHeadAmounts] = useState({}); // { feeHeadId: amount }
  const [loadingFeeHeadAmounts, setLoadingFeeHeadAmounts] = useState(false);

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
    voucherNumber: '',
    name: '',
    id: '',
    rollNumber: '',
    class: ''
  });
  const [printVoucherStudents, setPrintVoucherStudents] = useState([]);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [selectedVoucherStudent, setSelectedVoucherStudent] = useState(null);
  const [voucherData, setVoucherData] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState([]);

  // Receipt PDF
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Suspense Filters
  const [suspenseFilters, setSuspenseFilters] = useState({
    date: '',
    amount: '',
    transactionId: ''
  });

  // Assign Fee Structure
  const [studentsWithoutFeeStructure, setStudentsWithoutFeeStructure] = useState([]);
  const [assignFeeStructureLoading, setAssignFeeStructureLoading] = useState(false);
  const [assignFeeStructureDialog, setAssignFeeStructureDialog] = useState(false);
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClassFeeStructure, setSelectedClassFeeStructure] = useState(null);
  const [fetchingFeeStructure, setFetchingFeeStructure] = useState(false);
  const [assignFeeStructureForm, setAssignFeeStructureForm] = useState({
    classId: '',
    discount: 0,
    discountType: 'amount',
    discountReason: '',
    feeHeadDiscounts: {} // { feeHeadId: { discount, discountType, discountReason } }
  });
  const [assignFeeStructureFilters, setAssignFeeStructureFilters] = useState({
    name: '',
    id: '',
    rollNumber: '',
    class: ''
  });
  const [feeStructureDialogMode, setFeeStructureDialogMode] = useState('assign'); // 'assign' | 'update'



  // Fee Deposit
  const [manualDepositSearch, setManualDepositSearch] = useState({
    id: '',
    rollNumber: '',
    studentName: '',
    voucherNumber: ''
  });
  const [manualDepositStudents, setManualDepositStudents] = useState([]);
  const [hasSearchedStudents, setHasSearchedStudents] = useState(false);
  const [selectedManualDepositStudent, setSelectedManualDepositStudent] = useState(null);
  const [outstandingFees, setOutstandingFees] = useState([]);
  const [loadingOutstandingFees, setLoadingOutstandingFees] = useState(false);
  const [selectedFeePayments, setSelectedFeePayments] = useState({}); // { studentFeeId: amount }
  const [manualDepositForm, setManualDepositForm] = useState({
    paymentMethod: 'bank',
    bankAccount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    feeAmount: '',
    remarks: '',
    chequeNumber: '',
    bankName: '',
    transactionId: ''
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Receipt
  // Initialize receipt search with default dates (one month before today to today)
  const getDefaultReceiptDates = () => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return {
      startDate: oneMonthAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  const [receiptSearch, setReceiptSearch] = useState(() => {
    const defaultDates = getDefaultReceiptDates();
    return {
      id: '',
      rollNumber: '',
      studentName: '',
      receiptNumber: '',
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate
    };
  });
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [hasSearchedReceipts, setHasSearchedReceipts] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState(new Set());

  const toggleTransactionExpansion = (transactionId) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };

  // Suspense Management
  const [suspenseEntries, setSuspenseEntries] = useState([]);
  const [suspenseLoading, setSuspenseLoading] = useState(false);
  const [suspenseDialogOpen, setSuspenseDialogOpen] = useState(false);
  const [suspenseFormData, setSuspenseFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    transactionId: '',
    bankName: '',
    remarks: ''
  });
  const [savingSuspense, setSavingSuspense] = useState(false);
  
  // Reconciliation
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false);
  const [selectedSuspenseEntry, setSelectedSuspenseEntry] = useState(null);
  const [reconciliationSearch, setReconciliationSearch] = useState({
    id: '',
    rollNumber: '',
    studentName: ''
  });
  const [reconciliationStudents, setReconciliationStudents] = useState([]);
  const [searchingReconciliationStudents, setSearchingReconciliationStudents] = useState(false);
  const [selectedReconciliationStudent, setSelectedReconciliationStudent] = useState(null);
  const [reconciling, setReconciling] = useState(false);

  // Institutions
  const [institutions, setInstitutions] = useState([]);

  // Pagination state for all tables (default page size: 12)
  const [pagination, setPagination] = useState({
    feeHeads: { page: 0, rowsPerPage: 12 },
    assignFeeStructure: { page: 0, rowsPerPage: 12 },
    generateVoucher: { page: 0, rowsPerPage: 12 },
    studentOperations: { page: 0, rowsPerPage: 12 },
    printVoucher: { page: 0, rowsPerPage: 12 },
    feeDeposit: { page: 0, rowsPerPage: 12 },
    receipt: { page: 0, rowsPerPage: 12 },
    outstandingFees: { page: 0, rowsPerPage: 12 },
    feeHeadSelection: { page: 0, rowsPerPage: 12 },
    assignFeeStructureDialog: { page: 0, rowsPerPage: 12 },
    suspense: { page: 0, rowsPerPage: 12 },
    reconciliationStudents: { page: 0, rowsPerPage: 12 }
  });

  // Helper function to handle pagination change
  const handleChangePage = (tableName, event, newPage) => {
    setPagination(prev => ({
      ...prev,
      [tableName]: { ...prev[tableName], page: newPage }
    }));
  };

  // Helper function to handle rows per page change
  const handleChangeRowsPerPage = (tableName, event) => {
    setPagination(prev => ({
      ...prev,
      [tableName]: { page: 0, rowsPerPage: parseInt(event.target.value, 10) }
    }));
  };

  // Helper function to get paginated data
  const getPaginatedData = (data, tableName) => {
    const { page, rowsPerPage } = pagination[tableName] || { page: 0, rowsPerPage: 12 };
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return data.slice(startIndex, endIndex);
  };

  // Fetch admission statuses
  useEffect(() => {
    const fetchAdmissionStatuses = async () => {
      try {
        const response = await axios.get(`${API_URL}/admissions/statuses`, createAxiosConfig());
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
          const response = await axios.get(`${API_URL}/institutions`, createAxiosConfig());
          setInstitutions(response.data.data || []);
        } catch (err) {
          console.error('Error fetching institutions:', err);
        }
      };
      fetchInstitutions();
    }
  }, [isSuperAdmin]);

  // Handle auto-fetch for Print Voucher when month selection changes
  useEffect(() => {
    if (activeTab === 4 && printVoucherFilters.monthYear) {
      fetchPrintVoucherStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, printVoucherFilters.monthYear]);

  // Handle auto-fetch for Suspense Entries
  useEffect(() => {
    if (activeTab === 7) {
      fetchSuspenseEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, suspenseSubTab]);

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

  // Get institution ID helper - using utility function
  const getInstitutionId = () => getInstitutionIdUtil(user, isSuperAdmin);

  // Fetch fee heads
  const fetchFeeHeads = async () => {
    try {
      setFeeHeadsLoading(true);
      
      const params = {};
      
      // Fee heads are now shared across all institutions
      // No institution parameter needed
      
      if (feeHeadSearchTerm) params.search = feeHeadSearchTerm;

      const response = await axios.get(`${API_URL}/fee-heads`, createAxiosConfig({ params }));
      
      // Ensure we set the fee heads array even if empty
      setFeeHeads(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error fetching fee heads:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch fee heads');
      setFeeHeads([]); // Set empty array on error
    } finally {
      setFeeHeadsLoading(false);
    }
  };

  // Fetch available priorities
  const fetchAvailablePriorities = async () => {
    try {
      const response = await axios.get(`${API_URL}/fee-heads/priorities/available`, createAxiosConfig());
      
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
      // For admin users, ensure we have their institution
      if (!isSuperAdmin && !user.institution) {
        notifyError('No institution found for your account. Please contact administrator.');
        setFeeStructureLoading(false);
        return;
      }
      
      // Fee structures are shared, but we still need institution to get classes
      // Get institution from user context (navbar selection)
      const institutionId = getInstitutionId();
      if (!institutionId) {
        notifyError('No institution found. Please contact administrator.');
        setFeeStructureLoading(false);
        return;
      }
      
      const params = {
        institution: institutionId // For getting classes only (fee structures are shared)
      };

      const response = await axios.get(`${API_URL}/fees/structures/matrix`, createAxiosConfig({ params }));
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
      notifyError(err.response?.data?.message || 'Failed to fetch fee structure matrix');
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
      // Fee heads are now shared across all institutions
      // No institution field needed
      const payload = {
        ...feeHeadFormData,
        priority: parseInt(feeHeadFormData.priority)
        // institution is not needed - fee heads are shared
      };

      if (feeHeadEditMode) {
        await axios.put(`${API_URL}/fee-heads/${selectedFeeHead._id}`, payload, createAxiosConfig());
        notifySuccess('Fee head updated successfully');
      } else {
        await axios.post(`${API_URL}/fee-heads`, payload, createAxiosConfig());
        notifySuccess('Fee head created successfully');
      }

      handleFeeHeadCloseDialog();
      fetchFeeHeads();
      fetchAvailablePriorities();
    } catch (err) {
      notifyError(err.response?.data?.message || `Failed to ${feeHeadEditMode ? 'update' : 'create'} fee head`);
    }
  };

  const handleFeeHeadDelete = async (feeHeadId) => {
    if (!window.confirm('Are you sure you want to delete this fee head?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/fee-heads/${feeHeadId}`, createAxiosConfig());

      notifySuccess('Fee head deleted successfully');
      fetchFeeHeads();
      fetchAvailablePriorities();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to delete fee head');
    }
  };

  const handleFeeHeadReactivate = async (feeHeadId) => {
    if (!window.confirm('Are you sure you want to reactivate this fee head?')) {
      return;
    }

    try {
      await axios.put(`${API_URL}/fee-heads/${feeHeadId}/reactivate`, {}, createAxiosConfig());

      notifySuccess('Fee head reactivated successfully');
      fetchFeeHeads();
      fetchAvailablePriorities();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to reactivate fee head');
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
      // Get institution from user context (navbar selection)
      const institutionId = getInstitutionId();
      
      const payload = {
        institution: institutionId,
        data: feeStructureMatrixData
      };

      await axios.post(`${API_URL}/fees/structures/bulk-save`, payload, createAxiosConfig());

      notifySuccess('Fee structure saved successfully');
      fetchFeeStructureMatrix();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setFeeStructureSaving(false);
    }
  };

  // Fetch misc fee students
  const fetchMiscFeeStudents = async () => {
    try {
      setLoading(true);
      const institutionId = user.institution?._id || user.institution;

      // Use admissions endpoint directly (misc-operations endpoint doesn't exist)
      const params = {
        institution: institutionId
      };

      if (miscFeeFilters.enrolled && miscFeeFilters.enrolled.length > 0) {
        params.status = miscFeeFilters.enrolled;
      }

      const response = await axios.get(`${API_URL}/admissions`, createAxiosConfig({
        params: params,
        paramsSerializer: { indexes: null }
      }));

      const admissions = response.data.data || [];
      const transformedStudents = admissions.map(admission => transformStudentData(admission, {
        additionalFields: {
          school: admission.institution?.name || 'N/A',
          advanceFee: '0',
          lastVoucher: 'N/A'
        }
      }));
      setMiscFeeStudents(transformedStudents);
    } catch (err) {
      console.error('Error fetching students:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch print voucher students
  const fetchPrintVoucherStudents = async () => {
    try {
      setLoading(true);
      const institutionId = getInstitutionId();

      if (!institutionId) {
        notifyError('Institution not found');
        setLoading(false);
        return;
      }

      // Calculate month and year from filter
      const { month, year } = parseMonthYear(printVoucherFilters.monthYear);

      // Fetch students with generated vouchers for the selected month/year
      const params = {
        institution: institutionId
      };

      const response = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({ params }));

      const allStudentFees = response.data.data || response.data || [];
      
      // Filter to only include students with vouchers for the selected month/year
      const studentsWithVouchers = allStudentFees.filter(sf => {
        if (!sf.vouchers || !Array.isArray(sf.vouchers)) return false;
        return sf.vouchers.some(v => 
          v && 
          Number(v.month) === Number(month) && 
          Number(v.year) === Number(year)
        );
      });

      // Get unique students with voucher information
      const uniqueStudentsMap = new Map();
      
      // Group student fees by student ID - keep BOTH voucher fees and all fees
      const studentFeesByStudent = new Map();
      const allFeesByStudent = new Map();
      
      // First, group ALL fees by student (for arrears calculation)
      allStudentFees.forEach(studentFee => {
        const studentId = studentFee.student?._id || studentFee.student;
        if (studentId) {
          if (!allFeesByStudent.has(studentId.toString())) {
            allFeesByStudent.set(studentId.toString(), []);
          }
          allFeesByStudent.get(studentId.toString()).push(studentFee);
        }
      });
      
      // Then, group only fees with vouchers for current month (for voucher amount)
      studentsWithVouchers.forEach(studentFee => {
        const studentId = studentFee.student?._id || studentFee.student;
        if (studentId) {
          if (!studentFeesByStudent.has(studentId.toString())) {
            studentFeesByStudent.set(studentId.toString(), []);
          }
          studentFeesByStudent.get(studentId.toString()).push(studentFee);
        }
      });
      
      studentFeesByStudent.forEach((studentFees, studentIdStr) => {
        const firstStudentFee = studentFees[0];
        const student = firstStudentFee.student;
        const admission = student?.admission;
        
        // Get student name
        const studentName = getStudentName(admission, student);

        // Get voucher number and calculate total voucher amount for the selected month/year
        let voucherNumber = 'N/A';
        let voucherAmount = 0;
        
        // Find voucher for the selected month/year - all fees should have the same voucher number
        for (const sf of studentFees) {
          if (sf.vouchers && Array.isArray(sf.vouchers) && sf.vouchers.length > 0) {
            const voucher = sf.vouchers.find(v => 
              v && 
              Number(v.month) === Number(month) && 
              Number(v.year) === Number(year) &&
              v.voucherNumber
            );
            if (voucher && voucher.voucherNumber) {
              voucherNumber = voucher.voucherNumber;
              break; // Use the first voucher number found (they should all be the same)
            }
          }
        }
        
        // Calculate total amount and determine voucher status from all student fees that have vouchers for this month/year
        const feesWithVoucher = [];
        studentFees.forEach(sf => {
          // Check if this fee has a voucher for the selected month/year
          if (sf.vouchers && Array.isArray(sf.vouchers)) {
            const hasVoucher = sf.vouchers.some(v => 
              v && 
              Number(v.month) === Number(month) && 
              Number(v.year) === Number(year)
            );
            if (hasVoucher) {
              voucherAmount += parseFloat(sf.finalAmount || 0);
              feesWithVoucher.push(sf);
            }
          }
        });

        // Calculate Arrears (outstanding from previous months)
        // Use same logic as voucher popup for consistency
        const startDate = new Date(year, month - 1, 1);
        
        // Get ALL fees for this student (not just those with current voucher)
        const allFeesForStudent = allFeesByStudent.get(studentIdStr) || [];
        
        const arrears = allFeesForStudent.reduce((sum, f) => {
             // Exclude fees that are in the current voucher list
             const isCurrentVoucher = f.vouchers && f.vouchers.some(v => 
                v && Number(v.month) === Number(month) && Number(v.year) === Number(year)
             );
             
             if (isCurrentVoucher) return sum;

             // Check if it has remaining amount using dynamic calc
             const final = parseFloat(f.finalAmount || 0);
             const paid = parseFloat(f.paidAmount || 0);
             const calculatedRemaining = final - paid;
             
             // Use stored remaining if available, but trust calculated more
             let remaining = calculatedRemaining;
             if (f.remainingAmount !== undefined && f.remainingAmount !== null) {
                const storedRemaining = parseFloat(f.remainingAmount);
                if (paid > 0) {
                   remaining = calculatedRemaining;
                } else {
                   remaining = Math.min(storedRemaining, final);
                }
             }

             if (remaining <= 0.01 || (f.status && f.status.toLowerCase() === 'paid')) return sum;
             
             // Check if fee is from a previous month (critical for arrears)
             // A fee is an arrear if it belongs to a voucher from a previous month/year
             // OR if it has NO voucher but the due date/createdAt is before the current month
             const belongsToPreviousMonth = f.vouchers && f.vouchers.some(v => 
                (Number(v.year) < Number(year)) || (Number(v.year) === Number(year) && Number(v.month) < Number(month))
             );
    
             const isCurrentlyVouchered = f.vouchers && f.vouchers.some(v => 
                Number(v.year) === Number(year) && Number(v.month) === Number(month)
             );
    
             let isPrevious = belongsToPreviousMonth;
             
             if (!isPrevious && !isCurrentlyVouchered) {
                if (f.dueDate) {
                   const feeDate = new Date(f.dueDate);
                   if (!isNaN(feeDate.getTime())) {
                      isPrevious = feeDate < startDate;
                   }
                }
                
                // If still not determined, check createdAt
                if (!isPrevious && f.createdAt) {
                   const createdDate = new Date(f.createdAt);
                   if (!isNaN(createdDate.getTime())) {
                      isPrevious = createdDate < startDate;
                   }
                }
             }

             if (!isPrevious) return sum;
             
             return sum + Math.max(0, remaining);
        }, 0);

        // Determine voucher status based on payments for this specific voucher
        // A voucher is "Paid" only if payments were made AFTER the voucher was generated
        // and the remaining amount is 0 for fees with this voucher
        let voucherStatus = 'Unpaid';
        if (feesWithVoucher.length > 0) {
          // Get the voucher's generated date (use the first one found, they should all be the same)
          let voucherGeneratedDate = null;
          for (const sf of studentFees) {
            if (sf.vouchers && Array.isArray(sf.vouchers)) {
              const voucher = sf.vouchers.find(v => 
                v && 
                Number(v.month) === Number(month) && 
                Number(v.year) === Number(year)
              );
              if (voucher && voucher.generatedAt) {
                voucherGeneratedDate = new Date(voucher.generatedAt);
                break;
              }
            }
          }

          // Calculate total voucher amount
          const totalVoucherAmount = feesWithVoucher.reduce((sum, f) => sum + parseFloat(f.finalAmount || 0), 0);
          
          // Calculate total paid amount for fees with this voucher
          const totalPaidForVoucher = feesWithVoucher.reduce((sum, f) => sum + parseFloat(f.paidAmount || 0), 0);
          
          // Calculate total remaining for fees with this voucher
          const totalRemainingForVoucher = feesWithVoucher.reduce((sum, f) => sum + parseFloat(f.remainingAmount || 0), 0);



          // Determine voucher status based on paid and remaining amounts
          // For monthly fees, each month gets its own StudentFee record,
          // so paidAmount already reflects payments for this specific voucher
          if (totalRemainingForVoucher <= 0.01) {
            // Fully paid - remaining amount is 0
            voucherStatus = 'Paid';
          } else {
            if (totalPaidForVoucher > 0) {
              // Partially paid - some payment made but still has remaining
              voucherStatus = 'Partial';
            } else {
              // No payment made for this voucher
              voucherStatus = 'Unpaid';
            }
          }
        } else {
          // If no fees found, default to 'Generated' (voucher exists but no fee data)
          voucherStatus = 'Generated';
        }

        uniqueStudentsMap.set(studentIdStr, {
          _id: admission?._id || studentIdStr,
          studentId: studentIdStr,
          id: student?.enrollmentNumber || student?.rollNumber || admission?.applicationNumber || 'N/A',
          rollNumber: student?.rollNumber || admission?.rollNumber || 'N/A',
          name: studentName,
          fatherName: admission?.guardianInfo?.fatherName || 'N/A',
          class: firstStudentFee.class?.name || admission?.class?.name || 'N/A',
          section: admission?.section?.name || 'N/A',
          voucherStatus: voucherStatus,
          voucherNumber: voucherNumber,
          voucherAmount: voucherAmount,
          arrears: arrears
        });
      });

      const transformedStudents = Array.from(uniqueStudentsMap.values());
      
      // Filter by voucher number if provided
      const filteredStudents = printVoucherFilters.voucherNumber 
        ? transformedStudents.filter(s => s.voucherNumber.toLowerCase().includes(printVoucherFilters.voucherNumber.toLowerCase()))
        : transformedStudents;

      setPrintVoucherStudents(filteredStudents);
      
      if (transformedStudents.length === 0) {
        notifyError(`No students found with generated vouchers for ${month}/${year}`);
      }
    } catch (err) {
      console.error('Error fetching students with generated vouchers:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch students with generated vouchers');
      setPrintVoucherStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch generate voucher students (students with assigned fee structures)
  const fetchGenerateVoucherStudents = async () => {
    try {
      setLoading(true);
      const institutionId = getInstitutionId();

      if (!institutionId) {
        notifyError('Institution not found');
        setLoading(false);
        return;
      }

      // Fetch students with fee structures assigned
      // Note: We don't filter by academicYear here because:
      // 1. New students might not have academicYear set on their StudentFee records
      // 2. We want to show all students with fee structures, regardless of academic year
      // 3. The academic year will be used when generating vouchers, not when listing students
      const params = {
        institution: institutionId
      };

      const response = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({ params }));

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
          
          // Get student name
          const studentName = getStudentName(admission, student);

          // Check if voucher exists for the selected month/year
          let voucherStatus = 'Not Generated';
          if (generateVoucherFilters.monthYear) {
            const { month: monthNum, year: yearNum } = parseMonthYear(generateVoucherFilters.monthYear);
            
            // Check all student fees for this student to see if any have a voucher for this month/year
            const allStudentFees = studentFees.filter(sf => {
              const sfStudentId = sf.student?._id || sf.student;
              return sfStudentId && sfStudentId.toString() === studentId.toString();
            });
            
            const hasVoucher = allStudentFees.some(sf => 
              sf.vouchers && sf.vouchers.some(v => matchesVoucherMonthYear(v, monthNum, yearNum))
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
      let transformedStudents = Array.from(uniqueStudentsMap.values());
      
      // Filter students by admission effective date
      // Only show students whose admission is on or before the selected month/year
      if (generateVoucherFilters.monthYear) {
        const { month: selectedMonth, year: selectedYear } = parseMonthYear(generateVoucherFilters.monthYear);
        
        // Create cutoff date: last day of the selected month/year
        const cutoffDate = new Date(selectedYear, selectedMonth, 0); // Day 0 = last day of previous month, so selectedMonth gives us last day of that month
        
        transformedStudents = transformedStudents.filter(student => {
          const studentFeeRecord = studentFees.find(sf => {
            const sfStudentId = sf.student?._id || sf.student;
            return sfStudentId && sfStudentId.toString() === student.studentId.toString();
          });
          
          const admission = studentFeeRecord?.student?.admission;
          
          // Debug logging to see what data we have
          if (!admission && console && console.warn) {
            console.warn(`Student ${student.name} (${student.studentId}) has no admission data in student fees`, studentFeeRecord);
          }
          
          // If no admission object at all, we can't filter by date
          // In this case, include the student (shows warning above)
          if (!admission) {
            return true;
          }
          
          // Determine which date to use for comparison
          // Priority: admissionEffectiveDate > admissionDate > createdAt
          let studentAdmissionDate = null;
          
          if (admission.admissionEffectiveDate) {
            studentAdmissionDate = new Date(admission.admissionEffectiveDate);
          } else if (admission.admissionDate) {
            studentAdmissionDate = new Date(admission.admissionDate);
          } else if (admission.createdAt) {
            studentAdmissionDate = new Date(admission.createdAt);
          }
          
          // If admission exists but no valid date found, include with warning
          if (!studentAdmissionDate || isNaN(studentAdmissionDate.getTime())) {
            if (console && console.warn) {
              console.warn(`Student ${student.name} has admission but no valid date fields`, admission);
            }
            return true;
          }
          
          // Compare admission date with cutoff date
          const shouldInclude = studentAdmissionDate <= cutoffDate;
          
          // Debug log for date comparison
          if (console && console.log) {
            console.log(`Student ${student.name}: admission=${studentAdmissionDate.toLocaleDateString()}, cutoff=${cutoffDate.toLocaleDateString()}, included=${shouldInclude}`);
          }
          
          return shouldInclude;
        });
      }
      
      setGenerateVoucherStudents(transformedStudents);
      
      // Remove students with Generated status from selected list
      setSelectedGenerateVoucherStudents(prevSelected => 
        prevSelected.filter(selected => {
          const student = transformedStudents.find(s => s._id === selected._id);
          return student && student.voucherStatus !== 'Generated';
        })
      );
      
      if (transformedStudents.length === 0) {
        notifyError('No students found with fee structures assigned for the selected academic year');
      }
    } catch (err) {
      console.error('Error fetching students with fee structures:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch students with fee structures');
      setGenerateVoucherStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch fee head amounts for selected students
  const fetchFeeHeadAmounts = async () => {
    if (selectedGenerateVoucherStudents.length === 0) return;

    try {
      setLoadingFeeHeadAmounts(true);
      const institutionId = getInstitutionId();

      // Get actual student IDs (not admission IDs)
      const studentIds = selectedGenerateVoucherStudents
      .map(s => {
        const id = s.studentId || s._id;
        return (typeof id === 'object' ? id._id || id : id).toString();
      })
      .filter(id => id);

      if (studentIds.length === 0) {
        setFeeHeadAmounts({});
        setLoadingFeeHeadAmounts(false);
        return;
      }

      // Fetch student fees for all selected students
      const feeResponse = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({
        params: {
          institution: institutionId
        }
      }));

      const allStudentFees = feeResponse.data.data || [];
      
      // Filter fees for selected students only
      const selectedStudentFees = allStudentFees.filter(sf => {
        const sfStudentId = sf.student?._id || sf.student;
        if (!sfStudentId) return false;
        const sfStudentIdStr = sfStudentId.toString();
        
        return studentIds.some(id => {
          const idStr = (typeof id === 'object' ? id._id || id : id).toString();
          return sfStudentIdStr === idStr;
        });
      });

      // Calculate amounts per fee head
      // If multiple students have the same fee head, we'll use the first one's amount
      // (or we could average them, but for now using first is simpler)
      const amountsMap = {};
      selectedStudentFees.forEach(sf => {
        const feeHeadId = (sf.feeHead?._id || sf.feeHead)?.toString();
        if (feeHeadId) {
          // Use finalAmount (after discount) if available, otherwise baseAmount
          const amount = sf.finalAmount || sf.baseAmount || 0;
          // Only set if not already set (to use first occurrence)
          if (!amountsMap[feeHeadId]) {
            amountsMap[feeHeadId] = amount;
          }
        }
      });

      setFeeHeadAmounts(amountsMap);
    } catch (err) {
      console.error('Error fetching fee head amounts:', err);
      setFeeHeadAmounts({});
    } finally {
      setLoadingFeeHeadAmounts(false);
    }
  };

  // Handle open fee head selection dialog
  const handleOpenFeeHeadSelectionDialog = async () => {
    if (selectedGenerateVoucherStudents.length === 0) {
      notifyError('Please select at least one student');
      return;
    }
    
    // Fetch fee heads if not already loaded
    let headsToUse = feeHeads;
    if (headsToUse.length === 0) {
      try {
        setFeeHeadsLoading(true);
        const response = await axios.get(`${API_URL}/fee-heads`, createAxiosConfig());
        headsToUse = response.data?.data || response.data || [];
        setFeeHeads(headsToUse);
      } catch (err) {
        console.error('Error fetching fee heads:', err);
        notifyError(err.response?.data?.message || 'Failed to fetch fee heads');
        setFeeHeadsLoading(false);
        return;
      } finally {
        setFeeHeadsLoading(false);
      }
    }
    
    // Fetch fee head amounts for selected students
    await fetchFeeHeadAmounts();
    
    // Select "Tuition Fee" and "Arrears" by default
    const defaultFeeHeadNames = ['Tuition Fee', 'Arrears'];
    const defaultFeeHeadIds = headsToUse
      .filter(fh => {
        const name = (fh.name || '').trim();
        return defaultFeeHeadNames.some(defaultName => 
          name.toLowerCase() === defaultName.toLowerCase()
        );
      })
      .map(fh => fh._id);
    
    setSelectedFeeHeadIds(defaultFeeHeadIds);
    setFeeHeadSelectionDialogOpen(true);
  };

  // Handle close fee head selection dialog
  const handleCloseFeeHeadSelectionDialog = () => {
    setFeeHeadSelectionDialogOpen(false);
    setSelectedFeeHeadIds([]);
    setFeeHeadAmounts({});
    setVoucherDueDate(getDefaultDueDate()); // Reset to default for next time
  };

  // Handle fee head selection toggle
  const handleFeeHeadToggle = (feeHeadId) => {
    setSelectedFeeHeadIds(prev => {
      if (prev.includes(feeHeadId)) {
        return prev.filter(id => id !== feeHeadId);
      } else {
        return [...prev, feeHeadId];
      }
    });
  };

  // Handle select all fee heads
  const handleSelectAllFeeHeads = () => {
    if (selectedFeeHeadIds.length === feeHeads.length) {
      setSelectedFeeHeadIds([]);
    } else {
      setSelectedFeeHeadIds(feeHeads.map(fh => fh._id));
    }
  };

  // Handle generate vouchers (actual generation after fee head selection)
  const handleGenerateVouchersConfirm = async () => {
    if (selectedFeeHeadIds.length === 0) {
      notifyError('Please select at least one fee head');
      return;
    }

    try {
      setGenerateVoucherLoading(true);
      
      // Handle month/year format (could be YYYY-MM or M-YYYY)
      const { month, year } = parseMonthYear(generateVoucherFilters.monthYear);

      const studentIds = selectedGenerateVoucherStudents
        .map(s => {
          const id = s.studentId || s._id;
          return (typeof id === 'object' ? id._id || id : id).toString();
        })
        .filter(id => id);
      
      // Parse due date from the date picker
      const dueDate = new Date(voucherDueDate);
      const dueDay = dueDate.getDate();
      const dueMonth = dueDate.getMonth() + 1; // 0-indexed
      const dueYear = dueDate.getFullYear();

      // Call API to generate vouchers with selected fee heads
      const response = await axios.post(
        `${API_URL}/fees/generate-vouchers`,
        {
          studentIds: studentIds,
          month: month,
          year: year,
          feeHeadIds: selectedFeeHeadIds,
          dueDay: dueDay, // Send custom due day from date picker
          dueDate: voucherDueDate // Send full due date as well for backend use
        },
        createAxiosConfig()
      );

      if (response.data.success) {
        notifySuccess(`Successfully generated vouchers for ${selectedGenerateVoucherStudents.length} student(s)`);
        // Update voucher status for selected students
        setGenerateVoucherStudents(prevStudents =>
          prevStudents.map(student =>
            selectedGenerateVoucherStudents.some(s => s._id === student._id)
              ? { ...student, voucherStatus: 'Generated' }
              : student
          )
        );
        setSelectedGenerateVoucherStudents([]);
        handleCloseFeeHeadSelectionDialog();
        // Refresh the list
        fetchGenerateVoucherStudents();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to generate vouchers');
    } finally {
      setGenerateVoucherLoading(false);
    }
  };

  // Filter voucher generation students based on search criteria
  const getFilteredGenerateVoucherStudents = () => {
    return generateVoucherStudents.filter(student => {
      // Name filter
      if (generateVoucherFilters.name && 
          !student.name.toLowerCase().includes(generateVoucherFilters.name.toLowerCase())) {
        return false;
      }

      // ID filter (checks both student ID and admission number)
      if (generateVoucherFilters.id) {
        const searchId = generateVoucherFilters.id.toLowerCase();
        const matchesStudentId = student.studentId?.toString().toLowerCase().includes(searchId);
        const matchesAdmissionNumber = student.admissionNumber?.toString().toLowerCase().includes(searchId);
        if (!matchesStudentId && !matchesAdmissionNumber) {
          return false;
        }
      }

      // Roll number filter
      if (generateVoucherFilters.rollNumber && 
          !student.rollNumber?.toString().toLowerCase().includes(generateVoucherFilters.rollNumber.toLowerCase())) {
        return false;
      }

      // Class filter
      if (generateVoucherFilters.class && 
          student.class !== generateVoucherFilters.class) {
        return false;
      }

      return true;
    });
  };

  // Handle generate vouchers button click (opens dialog)
  const handleGenerateVouchers = () => {
    handleOpenFeeHeadSelectionDialog();
  };

  // Fetch manual deposit students with search filters
  const fetchManualDepositStudents = async () => {
    try {
      setLoading(true);
      setHasSearchedStudents(true);
      const institutionId = getInstitutionId();

      if (!institutionId) {
        notifyError('Institution ID not found');
        setLoading(false);
        return;
      }

      // Check if any search filter is provided
      const hasSearchFilters = Object.values(manualDepositSearch).some(value => value && value.trim() !== '');
      
      if (!hasSearchFilters) {
        notifyError('Please enter at least one search criteria');
        setLoading(false);
        return;
      }

      const params = {
        institution: institutionId
      };

      let studentIdsFromVoucher = [];

      // If voucher number is provided, search by voucher number only
      if (manualDepositSearch.voucherNumber) {
        try {
          const searchTerm = manualDepositSearch.voucherNumber.trim();
          
          // Get all student fees for the institution
          const studentFeesResponse = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({
            params: {
              institution: institutionId
            }
          }));

          const studentFees = studentFeesResponse.data.data || [];
          
          // Find student fees with matching voucher number
          const matchingFees = studentFees.filter(sf => 
            sf.vouchers && sf.vouchers.some(v => 
              v.voucherNumber && v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase())
            )
          );

          // Extract unique student IDs from voucher matches
          const studentIdArray = matchingFees
            .map(sf => sf.student?._id || sf.student)
            .filter(id => id);
          studentIdsFromVoucher = [...new Set(studentIdArray)];

          if (studentIdsFromVoucher.length === 0) {
            notifyError('No students found with the provided voucher number');
            setManualDepositStudents([]);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error searching by voucher:', err);
          notifyError('Failed to search by voucher number');
          setLoading(false);
          return;
        }
      }

      // Use search parameter for general search (API supports searching by applicationNumber, firstName, lastName, email)
      // We'll fetch all and filter client-side for specific fields
      const searchTerms = [];
      if (manualDepositSearch.studentName) {
        searchTerms.push(manualDepositSearch.studentName);
      }
      
      if (searchTerms.length > 0) {
        params.search = searchTerms.join(' ');
      }

      const response = await axios.get(`${API_URL}/admissions`, createAxiosConfig({
        params: params,
        paramsSerializer: { indexes: null }
      }));

      let admissions = response.data.data || [];
      
      // Filter by student IDs from voucher search if applicable
      if (studentIdsFromVoucher.length > 0) {
        admissions = admissions.filter(admission => {
          const studentId = admission.studentId?._id || admission.studentId;
          return studentId && studentIdsFromVoucher.some(id => id.toString() === studentId.toString());
        });
      }
      
      // Client-side filtering for specific fields
      if (manualDepositSearch.rollNumber) {
        admissions = admissions.filter(admission => 
          admission.rollNumber?.toLowerCase().includes(manualDepositSearch.rollNumber.toLowerCase()) ||
          admission.studentId?.rollNumber?.toLowerCase().includes(manualDepositSearch.rollNumber.toLowerCase())
        );
      }
      
      // Filter by ID - check enrollment number, application number, student ID, and admission ID
      if (manualDepositSearch.id) {
        const idLower = manualDepositSearch.id.toLowerCase().trim();
        admissions = admissions.filter(admission => {
          const enrollmentNumber = admission.studentId?.enrollmentNumber?.toLowerCase() || '';
          const applicationNumber = admission.applicationNumber?.toLowerCase() || '';
          const studentId = admission.studentId?._id?.toString() || '';
          const admissionId = admission._id?.toString() || '';
          
          return enrollmentNumber.includes(idLower) ||
                 applicationNumber.includes(idLower) ||
                 studentId.includes(idLower) ||
                 admissionId.includes(idLower);
        });
      }
      
      const transformedStudents = admissions.map(admission => ({
        _id: admission._id,
        id: admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A',
        rollNumber: admission.rollNumber || admission.studentId?.rollNumber || 'N/A',
        name: admission.personalInfo?.name || admission.studentId?.user?.name || 'N/A',
        fatherName: admission.guardianInfo?.fatherName || 'N/A',
        status: admission.status || 'pending',
        school: admission.institution?.name || 'N/A',
        class: admission.class?.name || 'N/A',
        section: admission.section?.name || 'N/A',
        mobileNumber: admission.contactInfo?.phone || admission.contactInfo?.mobileNumber || 'N/A',
        admissionNo: admission.applicationNumber || 'N/A',
        advanceFee: '0',
        lastVoucher: 'N/A',
        voucherAmount: 0,
        voucherMonth: 'N/A',
        paidAmount: 0,
        remainingAmount: 0,
        studentId: admission.studentId?._id || admission.studentId || null
      }));

      // Fetch all vouchers for each student who has a studentId
      const studentsWithIds = transformedStudents.filter(s => s.studentId);
      const isVoucherSearch = !!manualDepositSearch.voucherNumber;
      
      if (studentsWithIds.length > 0) {
        try {
          const institutionId = getInstitutionId();
          
          // Fetch student fees for each student in parallel
          const feesPromises = studentsWithIds.map(async (student) => {
            try {
              const feesResponse = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({
                params: {
                  institution: institutionId,
                  student: student.studentId
                }
              }));
              return { studentId: student.studentId, student: student, fees: feesResponse.data.data || [] };
            } catch (err) {
              console.error(`Error fetching fees for student ${student.studentId}:`, err);
              return { studentId: student.studentId, student: student, fees: [] };
            }
          });

          const feesResults = await Promise.all(feesPromises);
          
          // Create an array of student rows with vouchers (one row per voucher)
          const studentsWithVouchers = [];
          
          feesResults.forEach(({ studentId, student, fees }) => {
            // Collect all unique vouchers (grouped by voucherNumber + month + year)
            const voucherMap = new Map();
            
            fees.forEach(studentFee => {
              if (studentFee.vouchers && Array.isArray(studentFee.vouchers) && studentFee.vouchers.length > 0) {
                studentFee.vouchers.forEach(voucher => {
                  if (voucher && voucher.voucherNumber && voucher.month && voucher.year) {
                    // If searching by voucher number, filter to only matching vouchers
                    if (isVoucherSearch) {
                      const searchTerm = manualDepositSearch.voucherNumber.trim().toLowerCase();
                      if (!voucher.voucherNumber.toLowerCase().includes(searchTerm)) {
                        return; // Skip this voucher if it doesn't match
                      }
                    }
                    
                    const voucherKey = `${voucher.voucherNumber}-${voucher.month}-${voucher.year}`;
                    
                    if (!voucherMap.has(voucherKey)) {
                      voucherMap.set(voucherKey, {
                        voucherNumber: voucher.voucherNumber,
                        month: voucher.month,
                        year: voucher.year,
                        generatedAt: voucher.generatedAt,
                        feeIds: []
                      });
                    }
                    
                    // Track which fees are part of this voucher
                    const voucherInfo = voucherMap.get(voucherKey);
                    if (!voucherInfo.feeIds.includes(studentFee._id)) {
                      voucherInfo.feeIds.push(studentFee._id);
                    }
                  }
                });
              }
            });
            
            // If no vouchers found, create one row with N/A
            if (voucherMap.size === 0) {
              // Calculate total paid and remaining for all fees (if no vouchers)
              const totalPaid = fees.reduce((sum, f) => sum + parseFloat(f.paidAmount || 0), 0);
              const totalRemaining = fees.reduce((sum, f) => sum + parseFloat(f.remainingAmount || 0), 0);
              
              studentsWithVouchers.push({
                ...student,
                lastVoucher: 'N/A',
                voucherAmount: 0,
                voucherMonth: 'N/A',
                voucherStatus: 'N/A',
                paidAmount: totalPaid,
                remainingAmount: totalRemaining,
                originalAdmissionId: student._id // Store original admission ID
              });
            } else {
              // Create one row per voucher
              voucherMap.forEach((voucherInfo) => {
                // Calculate voucher amount and status for this specific voucher
                let voucherAmount = 0;
                const feesWithVoucher = [];
                
                fees.forEach(studentFee => {
                  if (studentFee.vouchers && Array.isArray(studentFee.vouchers)) {
                    const hasThisVoucher = studentFee.vouchers.some(v => 
                      v && 
                      v.voucherNumber === voucherInfo.voucherNumber &&
                      v.month === voucherInfo.month &&
                      v.year === voucherInfo.year
                    );
                    if (hasThisVoucher) {
                      voucherAmount += parseFloat(studentFee.finalAmount || 0);
                      feesWithVoucher.push(studentFee);
                    }
                  }
                });
                
                // Initialize paid and remaining amounts
                let totalPaidForVoucher = 0;
                let totalRemainingForVoucher = 0;
                
                // Determine voucher status based on payments for this specific voucher
                // A voucher is "Paid" only if payments were made AFTER the voucher was generated
                let voucherStatus = 'Unpaid';
                if (feesWithVoucher.length > 0) {
                  // Get the voucher's generated date
                  let voucherGeneratedDate = null;
                  fees.forEach(studentFee => {
                    if (studentFee.vouchers && Array.isArray(studentFee.vouchers)) {
                      const voucher = studentFee.vouchers.find(v => 
                        v && 
                        v.voucherNumber === voucherInfo.voucherNumber &&
                        v.month === voucherInfo.month &&
                        v.year === voucherInfo.year
                      );
                      if (voucher && voucher.generatedAt && !voucherGeneratedDate) {
                        voucherGeneratedDate = new Date(voucher.generatedAt);
                      }
                    }
                  });

                  // Calculate total voucher amount
                  const totalVoucherAmount = feesWithVoucher.reduce((sum, f) => sum + parseFloat(f.finalAmount || 0), 0);
                  
                  // Calculate total paid amount for fees with this voucher
                  totalPaidForVoucher = feesWithVoucher.reduce((sum, f) => sum + parseFloat(f.paidAmount || 0), 0);
                  
                  // Calculate total remaining for fees with this voucher
                  totalRemainingForVoucher = feesWithVoucher.reduce((sum, f) => sum + parseFloat(f.remainingAmount || 0), 0);

                  // Determine voucher status based on paid and remaining amounts
                  // For monthly fees, each month gets its own StudentFee record,
                  // so paidAmount already reflects payments for this specific voucher
                  if (totalRemainingForVoucher <= 0.01) {
                    // Fully paid - remaining amount is 0
                    voucherStatus = 'Paid';
                  } else {
                    if (totalPaidForVoucher > 0) {
                      // Partially paid - some payment made but still has remaining
                      voucherStatus = 'Partial';
                    } else {
                      // No payment made for this voucher
                      voucherStatus = 'Unpaid';
                    }
                  }
                }
                
                // Format month name
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[voucherInfo.month - 1] || voucherInfo.month;
                const voucherMonth = `${monthName} ${voucherInfo.year}`;
                
                // Calculate Arrears (outstanding from previous months)
                const startDate = new Date(voucherInfo.year, voucherInfo.month - 1, 1);
                const arrears = fees.reduce((sum, f) => {
                  // Exclude fees that are in the current voucher list
                  const isCurrentVoucher = f.vouchers && f.vouchers.some(v => 
                    v && v.voucherNumber === voucherInfo.voucherNumber &&
                    v.month === voucherInfo.month && v.year === voucherInfo.year
                  );
                  
                  if (isCurrentVoucher) return sum;

                  // Check if it has remaining amount using dynamic calc
                  const final = parseFloat(f.finalAmount || 0);
                  const paid = parseFloat(f.paidAmount || 0);
                  const calculatedRemaining = final - paid;
                  
                  // Use stored remaining if available, but trust calculated more
                  let remaining = calculatedRemaining;
                  if (f.remainingAmount !== undefined && f.remainingAmount !== null) {
                    const storedRemaining = parseFloat(f.remainingAmount);
                    if (paid > 0) {
                      remaining = calculatedRemaining;
                    } else {
                      remaining = Math.min(storedRemaining, final);
                    }
                  }

                  if (remaining <= 0.01 || (f.status && f.status.toLowerCase() === 'paid')) return sum;
                  
                  // Check if fee is from a previous month (critical for arrears)
                  // A fee is an arrear if it has a voucher from a previous month/year
                  // OR if it has NO voucher but the due date/createdAt is before the current month
                  const belongsToPreviousMonth = f.vouchers && f.vouchers.some(v => 
                    (Number(v.year) < Number(voucherInfo.year)) || (Number(v.year) === Number(voucherInfo.year) && Number(v.month) < Number(voucherInfo.month))
                  );

                  const isCurrentlyVouchered = f.vouchers && f.vouchers.some(v => 
                    Number(v.year) === Number(voucherInfo.year) && Number(v.month) === Number(voucherInfo.month)
                  );

                  let isPrevious = belongsToPreviousMonth;
                  
                  if (!isPrevious && !isCurrentlyVouchered) {
                    if (f.dueDate) {
                      const feeDate = new Date(f.dueDate);
                      if (!isNaN(feeDate.getTime())) {
                        isPrevious = feeDate < startDate;
                      }
                    }
                    
                    // If still not determined, check createdAt
                    if (!isPrevious && f.createdAt) {
                      const createdDate = new Date(f.createdAt);
                      if (!isNaN(createdDate.getTime())) {
                        isPrevious = createdDate < startDate;
                      }
                    }
                  }

                  if (!isPrevious) return sum;
                  
                  return sum + Math.max(0, remaining);
                }, 0);
                
                studentsWithVouchers.push({
                  ...student,
                  lastVoucher: voucherInfo.voucherNumber,
                  voucherAmount: voucherAmount,
                  voucherMonth: voucherMonth,
                  voucherStatus: voucherStatus,
                  paidAmount: totalPaidForVoucher,
                  remainingAmount: totalRemainingForVoucher + arrears, // Include arrears in total remaining
                  arrears: arrears,
                  originalAdmissionId: student._id, // Store original admission ID
                  _id: `${student._id}-${voucherInfo.voucherNumber}-${voucherInfo.month}-${voucherInfo.year}` // Unique key for each voucher row
                });
              });
            }
          });

          // Sort by generatedAt date (latest first)
          studentsWithVouchers.sort((a, b) => {
            if (a.voucherMonth === 'N/A' && b.voucherMonth === 'N/A') return 0;
            if (a.voucherMonth === 'N/A') return 1;
            if (b.voucherMonth === 'N/A') return -1;
            // Extract year and month for sorting
            const aParts = a.voucherMonth.split(' ');
            const bParts = b.voucherMonth.split(' ');
            const aYear = parseInt(aParts[1]);
            const bYear = parseInt(bParts[1]);
            if (aYear !== bYear) return bYear - aYear;
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const aMonth = monthNames.indexOf(aParts[0]);
            const bMonth = monthNames.indexOf(bParts[0]);
            return bMonth - aMonth;
          });

          setManualDepositStudents(studentsWithVouchers);
          return; // Exit early since we've set the students
        } catch (err) {
          console.error('Error fetching vouchers:', err);
          // Continue with original transformedStudents if fetch fails
        }
      }

      setManualDepositStudents(transformedStudents);
      
      if (transformedStudents.length === 0) {
        notifyError('No students found matching the search criteria');
      } else {
        notifySuccess(`Found ${transformedStudents.length} student(s)`);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to search students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch outstanding fees for a student
  // If voucherNumber is provided, only show fees with that specific voucher
  // Otherwise, show all vouchers sorted by latest first
  const fetchOutstandingFees = async (studentId, voucherNumber = null) => {
    if (!studentId) {
      setOutstandingFees([]);
      return;
    }

    try {
      setLoadingOutstandingFees(true);
      const institutionId = getInstitutionId();

      // Fetch ALL student fees to ensure we get arrears from previous months
      const response = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({
        params: {
          institution: institutionId,
          student: studentId
        }
      }));

      let fees = response.data.data || [];
      
      // Filter to only include fees with remaining balance
      fees = fees.filter(fee => {
        const remaining = fee.remainingAmount || (fee.finalAmount - (fee.paidAmount || 0));
        return remaining > 0.01 && fee.status !== 'paid';
      });
      
      // If voucher number is provided, filter to show only fees with that specific voucher
      if (voucherNumber) {
        const searchTerm = voucherNumber.toLowerCase().trim();
        fees = fees.filter(fee => {
          if (!fee.vouchers || fee.vouchers.length === 0) return false;
          return fee.vouchers.some(v => 
            v.voucherNumber && v.voucherNumber.toLowerCase().includes(searchTerm)
          );
        });
      } else {
        // Sort by latest voucher first (most recent generatedAt date)
        // Fees without vouchers (arrears) will appear at the end
        fees = fees.sort((a, b) => {
          const aLatestVoucher = a.vouchers && a.vouchers.length > 0
            ? a.vouchers.reduce((latest, v) => {
                const vDate = new Date(v.generatedAt || 0);
                const latestDate = new Date(latest.generatedAt || 0);
                return vDate > latestDate ? v : latest;
              })
            : null;
          
          const bLatestVoucher = b.vouchers && b.vouchers.length > 0
            ? b.vouchers.reduce((latest, v) => {
                const vDate = new Date(v.generatedAt || 0);
                const latestDate = new Date(latest.generatedAt || 0);
                return vDate > latestDate ? v : latest;
              })
            : null;
          
          if (!aLatestVoucher && !bLatestVoucher) {
            // Both have no vouchers, sort by dueDate or createdAt
            const aDate = new Date(a.dueDate || a.createdAt || 0);
            const bDate = new Date(b.dueDate || b.createdAt || 0);
            return bDate - aDate;
          }
          if (!aLatestVoucher) return 1; // Fees without vouchers go to end
          if (!bLatestVoucher) return -1; // Fees with vouchers come first
          
          const aDate = new Date(aLatestVoucher.generatedAt || 0);
          const bDate = new Date(bLatestVoucher.generatedAt || 0);
          return bDate - aDate; // Descending order (latest first)
        });
      }
      
      setOutstandingFees(fees);
      
      // Initialize selected payments with remaining amounts
      const initialPayments = {};
      fees.forEach(fee => {
        const remaining = fee.remainingAmount || (fee.finalAmount - (fee.paidAmount || 0));
        initialPayments[fee._id] = remaining;
      });
      setSelectedFeePayments(initialPayments);
    } catch (err) {
      console.error('Error fetching outstanding fees:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch outstanding fees');
      setOutstandingFees([]);
    } finally {
      setLoadingOutstandingFees(false);
    }
  };

  // Handle student selection for manual deposit
  const handleManualDepositStudentSelect = async (student) => {
    // Prevent selection of paid vouchers
    if (student.voucherStatus === 'Paid') {
      notifyError('This voucher is already paid and cannot be paid again.');
      return;
    }
    
    setSelectedManualDepositStudent(student);
    // Get student ID from admission
    // Use originalAdmissionId if available (for voucher rows), otherwise use _id
    const admissionId = student.originalAdmissionId || student._id;
    if (admissionId) {
      // Try to get actual student ID from admission
      try {
        const admissionResponse = await axios.get(`${API_URL}/admissions/${admissionId}`, createAxiosConfig());
        const admission = admissionResponse.data.data;
        const studentId = admission?.studentId?._id || admission?.studentId;
        if (studentId) {
          // If a specific voucher is selected (not from search), use that voucher number
          // Otherwise, if voucher number was used in search, pass it to filter fees
          const voucherNumber = student.lastVoucher && student.lastVoucher !== 'N/A' 
            ? student.lastVoucher 
            : (manualDepositSearch.voucherNumber || null);
          await fetchOutstandingFees(studentId, voucherNumber);
        }
      } catch (err) {
        console.error('Error fetching student ID:', err);
      }
    }
  };

  // Handle fee payment amount change
  const handleFeePaymentChange = (studentFeeId, amount) => {
    setSelectedFeePayments(prev => ({
      ...prev,
      [studentFeeId]: parseFloat(amount) || 0
    }));
  };

  // Calculate total payment amount
  const calculateTotalPayment = () => {
    const feesTotal = Object.values(selectedFeePayments).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
    return feesTotal;
  };

  // Handle save payment
  const handleSavePayment = async () => {
    if (!selectedManualDepositStudent) {
      notifyError('Please select a student');
      return;
    }

    const totalPayment = calculateTotalPayment();
    if (totalPayment <= 0) {
      notifyError('Please enter at least one payment amount');
      return;
    }

    // Validate bank account and transaction ID
    if (!manualDepositForm.bankAccount || manualDepositForm.bankAccount.trim() === '') {
      notifyError('Please select a bank account');
      return;
    }

    if (!manualDepositForm.transactionId || manualDepositForm.transactionId.trim() === '') {
      notifyError('Please enter a transaction ID');
      return;
    }

    try {
      setRecordingPayment(true);

      // Get student ID
      // Use originalAdmissionId if available (for voucher rows), otherwise use _id
      const admissionId = selectedManualDepositStudent.originalAdmissionId || selectedManualDepositStudent._id;
      const admissionResponse = await axios.get(`${API_URL}/admissions/${admissionId}`, createAxiosConfig());
      const admission = admissionResponse.data.data;
      const studentId = admission?.studentId?._id || admission?.studentId;

      if (!studentId) {
        notifyError('Student ID not found');
        setRecordingPayment(false);
        return;
      }

      // Get voucher number from selected student if available
      const voucherNumber = selectedManualDepositStudent?.lastVoucher && 
                            selectedManualDepositStudent.lastVoucher !== 'N/A' 
                            ? selectedManualDepositStudent.lastVoucher 
                            : null;

      // Record payments for each selected fee
      const paymentPromises = [];
      Object.entries(selectedFeePayments).forEach(([studentFeeId, amount]) => {
        if (amount > 0) {
          const fee = outstandingFees.find(f => f._id === studentFeeId);
          if (fee && amount <= (fee.remainingAmount || fee.finalAmount)) {
            paymentPromises.push(
              axios.post(
                `${API_URL}/fees/record-payment`,
                {
                  studentFeeId: studentFeeId,
                  amount: amount,
                  paymentMethod: 'bank_transfer',
                  paymentDate: manualDepositForm.paymentDate,
                  remarks: manualDepositForm.remarks,
                  chequeNumber: manualDepositForm.chequeNumber,
                  bankName: manualDepositForm.bankName,
                  transactionId: manualDepositForm.transactionId,
                  voucherNumber: voucherNumber
                },
                createAxiosConfig()
              )
            );
          }
        }
      });

      if (paymentPromises.length === 0) {
        notifyError('Please select at least one fee to pay');
        setRecordingPayment(false);
        return;
      }

      await Promise.all(paymentPromises);

      notifySuccess(`Successfully recorded payment(s) totaling Rs. ${totalPayment.toLocaleString()}`);
      
      // Reset form
      setManualDepositForm({
        paymentMethod: 'bank',
        bankAccount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        feeAmount: '',
        remarks: '',
        chequeNumber: '',
        bankName: '',
        transactionId: ''
      });
      
      // Refresh outstanding fees (this will also reset selected payments)
      await fetchOutstandingFees(studentId);
      
      // If on Print Voucher tab, refresh the voucher list to update statuses
      if (activeTab === 4) {
        await fetchPrintVoucherStudents();
      }
      
      // If on Fee Deposit tab, refresh the student list to update voucher statuses
      if (activeTab === 5) {
        await fetchManualDepositStudents();
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      notifyError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Fetch receipts with search filters
  const fetchReceipts = async (autoLoad = false) => {
    try {
      setReceiptsLoading(true);
      setHasSearchedReceipts(true);
      
      // Get institution ID - retry if not available immediately (for page refresh)
      let institutionId = getInstitutionId();
      if (!institutionId && autoLoad) {
        // Wait a bit for institution to load from localStorage (retry up to 3 times)
        for (let i = 0; i < 3 && !institutionId; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          institutionId = getInstitutionId();
        }
      }

      if (!institutionId) {
        // Don't show error on auto-load, just set empty array
        if (!autoLoad) {
          notifyError('Institution ID not found. Please select an institution.');
        }
        setReceiptsLoading(false);
        setReceipts([]);
        return;
      }

      // Build search params
      const params = {
        institution: institutionId
      };

      // If autoLoad, use default dates from receiptSearch state (one month before today to today)
      if (autoLoad) {
        // Use the default dates from receiptSearch state
        if (receiptSearch.startDate) {
          params.startDate = receiptSearch.startDate;
        }
        if (receiptSearch.endDate) {
          params.endDate = receiptSearch.endDate;
        }
      } else {
        // Use search filters - always include dates if provided
        if (receiptSearch.id) {
          params.studentId = receiptSearch.id.trim();
        }
        if (receiptSearch.rollNumber) {
          params.rollNumber = receiptSearch.rollNumber.trim();
        }
        if (receiptSearch.studentName) {
          params.studentName = receiptSearch.studentName.trim();
        }
        if (receiptSearch.receiptNumber) {
          params.receiptNumber = receiptSearch.receiptNumber.trim();
        }
        if (receiptSearch.startDate) {
          params.startDate = receiptSearch.startDate;
        }
        if (receiptSearch.endDate) {
          params.endDate = receiptSearch.endDate;
        }
      }

      const response = await axios.get(`${API_URL}/fees/payments`, createAxiosConfig({
        params: params,
        paramsSerializer: { indexes: null }
      }));

      const payments = response.data.data || response.data || [];
      const receiptsWithStudentInfo = payments.map((payment) => {
        const student = payment.student || {};
        const admission = student.admission || payment.admission || {};
        return {
          ...payment,
          studentName: admission.personalInfo?.name || student.name || 'N/A',
          studentId: student.enrollmentNumber || admission.applicationNumber || 'N/A',
          rollNumber: student.rollNumber || admission.rollNumber || 'N/A',
          class: admission.class?.name || student.class?.name || 'N/A',
          section: admission.section?.name || 'N/A',
          voucherNumber: payment.voucherNumber || 'N/A'
        };
      });

      setReceipts(receiptsWithStudentInfo);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch receipts');
      setReceipts([]);
    } finally {
      setReceiptsLoading(false);
    }
  };

  // Handle Print Receipt
  const handlePrintReceipt = async (receiptOrGroup) => {
    try {
      setReceiptLoading(true);
      const institutionId = getInstitutionId();
      
      let institutionData = null;
      if (institutionId) {
        try {
          const instResponse = await axios.get(`${API_URL}/institutions/${institutionId}`, createAxiosConfig());
          institutionData = instResponse.data.data;
        } catch (err) {
          console.error('Error fetching institution data for receipt:', err);
        }
      }

      // Prepare data for the receipt
      const receipts = Array.isArray(receiptOrGroup) ? receiptOrGroup : [receiptOrGroup];
      
      setSelectedReceiptData({
        institution: institutionData,
        receipts: receipts,
        printDate: new Date().toLocaleDateString('en-GB')
      });
      
      setReceiptDialogOpen(true);
    } catch (err) {
      console.error('Error preparing receipt:', err);
      notifyError('Failed to prepare receipt for printing');
    } finally {
      setReceiptLoading(false);
    }
  };

  // Handle Export to Excel for Receipts
  const handleExportReceipts = () => {
    try {
      if (!receipts || receipts.length === 0) {
        notifyError('No receipts found to export');
        return;
      }

      // Filter out refunded receipts to match UI totals
      const receiptsToExport = receipts.filter(r => r.status !== 'refunded');

      if (receiptsToExport.length === 0) {
        notifyError('No non-refunded receipts found to export');
        return;
      }

      // Transform data for Excel
      const excelData = receiptsToExport.map(r => ({
        'Receipt Number': r.receiptNumber || 'N/A',
        'Voucher Number': r.voucherNumber || 'N/A',
        'Payment Date': r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('en-GB') : 'N/A',
        'Student ID': r.studentId || 'N/A',
        'Roll #': r.rollNumber || 'N/A',
        'Student Name': capitalizeFirstOnly(r.studentName || 'N/A'),
        'Amount': parseFloat(r.amount || 0),
        'Bank': r.bankName || 'N/A',
        'Transaction ID': (r.transactionId && !r.transactionId.startsWith('no-tid-')) ? r.transactionId : 'N/A',
        'Status': (r.status || 'completed').toUpperCase(),
        'Collected By': r.collectedBy?.name || 'N/A'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns for better readability
      const colWidths = [
        { wch: 18 }, // Receipt Number
        { wch: 18 }, // Voucher Number
        { wch: 12 }, // Payment Date
        { wch: 12 }, // Student ID
        { wch: 8 },  // Roll #
        { wch: 25 }, // Student Name
        { wch: 12 }, // Amount
        { wch: 25 }, // Bank
        { wch: 25 }, // Transaction ID
        { wch: 12 }, // Status
        { wch: 20 }, // Collected By
      ];
      ws['!cols'] = colWidths;

      // Create workbook and append worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Receipts');

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `Receipts_Export_${date}.xlsx`;

      // Trigger download
      XLSX.writeFile(wb, filename);
      notifySuccess('Receipts exported to Excel successfully');
    } catch (err) {
      console.error('Error exporting receipts:', err);
      notifyError('Failed to export receipts to Excel');
    }
  };

  // Fetch suspense entries
  const fetchSuspenseEntries = async () => {
    try {
      setSuspenseLoading(true);
      const institutionId = getInstitutionId();
      if (!institutionId) return;

      const status = suspenseSubTab === 0 ? 'unidentified' : 'reconciled';
      const response = await axios.get(`${API_URL}/fees/suspense`, createAxiosConfig({
        params: { institution: institutionId, status }
      }));

      setSuspenseEntries(response.data.data || []);
    } catch (err) {
      console.error('Error fetching suspense entries:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch suspense entries');
    } finally {
      setSuspenseLoading(false);
    }
  };

  // Handle suspense save
  const handleSuspenseSave = async () => {
    try {
      setSavingSuspense(true);
      const institutionId = getInstitutionId();
      const payload = {
        ...suspenseFormData,
        amount: parseFloat(suspenseFormData.amount),
        institution: institutionId
      };

      await axios.post(`${API_URL}/fees/suspense`, payload, createAxiosConfig());
      notifySuccess('Suspense entry recorded successfully');
      setSuspenseDialogOpen(false);
      setSuspenseFormData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        transactionId: '',
        bankName: '',
        remarks: ''
      });
      fetchSuspenseEntries();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to record suspense entry');
    } finally {
      setSavingSuspense(false);
    }
  };

  // Reconciliation students search
  const fetchReconciliationStudents = async () => {
    try {
      setSearchingReconciliationStudents(true);
      const institutionId = getInstitutionId();
      
      const params = { institution: institutionId };
      if (reconciliationSearch.id) params.studentId = reconciliationSearch.id;
      if (reconciliationSearch.rollNumber) params.rollNumber = reconciliationSearch.rollNumber;
      if (reconciliationSearch.studentName) params.search = reconciliationSearch.studentName;

      const response = await axios.get(`${API_URL}/admissions`, createAxiosConfig({ params }));
      const admissions = response.data.data || [];
      const transformed = admissions.map(admission => transformStudentData(admission));
      setReconciliationStudents(transformed);
    } catch (err) {
      notifyError('Failed to search students for reconciliation');
    } finally {
      setSearchingReconciliationStudents(false);
    }
  };

  // Reset reconciliation dialog
  const resetReconciliationDialog = () => {
    setReconciliationDialogOpen(false);
    setSelectedSuspenseEntry(null);
    setSelectedReconciliationStudent(null);
    setReconciliationStudents([]);
    setOutstandingFees([]);
    setReconciliationSearch({
      id: '',
      rollNumber: '',
      studentName: ''
    });
  };

  // Handle reconciliation
  const handleReconcile = async (studentId, studentFeeId) => {
    try {
      setReconciling(true);
      const institutionId = getInstitutionId();
      const payload = {
        suspenseEntryId: selectedSuspenseEntry._id,
        studentId,
        studentFeeId,
        remarks: 'Reconciled from Suspense Dialog',
        institution: institutionId
      };

      await axios.post(`${API_URL}/fees/suspense/reconcile`, payload, createAxiosConfig());
      notifySuccess('Payment reconciled successfully');
      resetReconciliationDialog();
      fetchSuspenseEntries();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to reconcile payment');
    } finally {
      setReconciling(false);
    }
  };

  // Fetch voucher data
  const fetchVoucherData = async (student, monthYear) => {
    try {
      setVoucherLoading(true);
      const institutionId = getInstitutionId();
      
      // Fetch institution data for voucher header
      let institutionData = null;
      if (institutionId) {
        try {
          const instResponse = await axios.get(`${API_URL}/institutions/${institutionId}`, createAxiosConfig());
          institutionData = instResponse.data.data;
        } catch (err) {
          console.error('Error fetching institution data:', err);
        }
      }

      const admissionResponse = await axios.get(`${API_URL}/admissions/${student._id}`, createAxiosConfig());
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
      let arrears = typeof student.arrears === 'number' ? student.arrears : 0;
      let dueDate = new Date(year, month, 20); // Default to 20th of the month
      let studentFees = []; // Declare outside try block for use later
      let voucherNumber = 'N/A'; // Declare outside try block for use in return statement

      // Get student ID from admission
      const studentId = admission.studentId?._id || admission.studentId;

      // Fetch student fees for this student
      try {
        const feeResponse = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({
          params: {
            institution: institutionId,
            student: studentId
          }
        }));

        studentFees = feeResponse.data.data || feeResponse.data || [];
        
        // Filter to only include StudentFee records that have vouchers for the selected month/year
        // This ensures we only show fee heads that were selected during voucher generation
        const feesWithVouchers = studentFees.filter(fee => {
          // Check if vouchers array exists and has items
          if (!fee.vouchers || !Array.isArray(fee.vouchers) || fee.vouchers.length === 0) {
            return false;
          }
          
          // Check if this fee has a voucher for the selected month/year
          // Ensure month and year match exactly (handle both number and string comparisons)
          const hasVoucher = fee.vouchers.some(v => {
            if (!v || v.month === undefined || v.year === undefined) {
              return false;
            }
            const vMonth = typeof v.month === 'string' ? parseInt(v.month, 10) : Number(v.month);
            const vYear = typeof v.year === 'string' ? parseInt(v.year, 10) : Number(v.year);
            const checkMonth = Number(month);
            const checkYear = Number(year);
            return vMonth === checkMonth && vYear === checkYear;
          });
          
          return hasVoucher;
        });

        // Extract voucher number for the selected month/year
        // If no fees with vouchers found, return empty fee heads
        if (feesWithVouchers.length === 0) {
          feeHeads = [];
        } else {
          // Find voucher number from fees with vouchers
          for (const fee of feesWithVouchers) {
            const match = (fee.vouchers || []).find(v => {
              if (!v) return false;
              const vMonth = typeof v.month === 'string' ? parseInt(v.month, 10) : Number(v.month);
              const vYear = typeof v.year === 'string' ? parseInt(v.year, 10) : Number(v.year);
              return vMonth === Number(month) && vYear === Number(year) && v.voucherNumber;
            });
            if (match && match.voucherNumber) {
              voucherNumber = match.voucherNumber;
              break;
            }
          }

          // Group fees by fee head and calculate totals
          // Use feeHead name instead of feeType
          const feeHeadMap = {};
          feesWithVouchers.forEach(fee => {
            const feeHeadName = fee.feeHead?.name || 'Fee';
            // Use finalAmount (after discount) if available, otherwise baseAmount
            // Use nullish coalescing to ensure 0 is treated as a valid value
            const amount = (fee.finalAmount !== undefined && fee.finalAmount !== null) ? fee.finalAmount : (fee.baseAmount || 0);
            feeHeadMap[feeHeadName] = (feeHeadMap[feeHeadName] || 0) + amount;
          });

          // Convert to array and sort by fee head priority if available
          feeHeads = Object.entries(feeHeadMap)
            .map(([name, amount]) => {
              // Find the fee head to get its priority for sorting
              const feeHead = feesWithVouchers.find(f => (f.feeHead?.name || 'Fee') === name)?.feeHead;
              return {
                name: name,
                amount: amount || 0,
                priority: feeHead?.priority || 999
              };
            })
            .sort((a, b) => a.priority - b.priority)
            .map(({ name, amount }) => ({ name, amount }));
            // Removed .filter(h => h.amount > 0) to allow 100% discounted (Rs. 0) fees to show on voucher

          // Get due date from first fee with voucher
          if (feesWithVouchers.length > 0) {
            const firstFee = feesWithVouchers[0];
            if (firstFee.dueDate) {
              dueDate = new Date(firstFee.dueDate);
            }
          }

          // Only calculate arrears if not passed from student object or if 0 (to re-verify)
          if (arrears === 0) {
            // Calculate arrears (unpaid/partial payments from previous months)
            const previousMonthFees = studentFees.filter(f => {
              const hasCurrentVoucher = f.vouchers && f.vouchers.some(v => {
                const vMonth = typeof v.month === 'string' ? parseInt(v.month, 10) : Number(v.month);
                const vYear = typeof v.year === 'string' ? parseInt(v.year, 10) : Number(v.year);
                return vMonth === month && vYear === year;
              });
              
              if (hasCurrentVoucher) return false;
              
              const remainingAmount = f.remainingAmount || (parseFloat(f.finalAmount || 0) - (parseFloat(f.paidAmount || 0)));
              if (remainingAmount <= 0 || (f.status && f.status.toLowerCase() === 'paid')) return false;
              
              // Check if fee is from a previous month (critical for arrears)
              // A fee is an arrear if it has a voucher from a previous month/year
              // OR if it has NO voucher but the due date/createdAt is before the current month
              const belongsToPreviousMonth = f.vouchers && f.vouchers.some(v => 
                (Number(v.year) < Number(year)) || (Number(v.year) === Number(year) && Number(v.month) < Number(month))
              );

              const isCurrentlyVouchered = f.vouchers && f.vouchers.some(v => 
                Number(v.year) === Number(year) && Number(v.month) === Number(month)
              );

              let isPrevious = belongsToPreviousMonth;
              
              if (!isPrevious && !isCurrentlyVouchered) {
                if (f.dueDate) {
                   const feeDate = new Date(f.dueDate);
                   if (!isNaN(feeDate.getTime())) isPrevious = feeDate < startDate;
                }
                if (!isPrevious && f.createdAt) {
                  const createdDate = new Date(f.createdAt);
                  if (!isNaN(createdDate.getTime())) isPrevious = createdDate < startDate;
                }
              }
              
              return isPrevious;
            });

            // Calculate total arrears from previous months
            arrears = previousMonthFees.reduce((sum, f) => {
              const final = parseFloat(f.finalAmount || 0);
              const paid = parseFloat(f.paidAmount || 0);
              const calculatedRemaining = final - paid;
              
              let remaining = calculatedRemaining;
              if (f.remainingAmount !== undefined && f.remainingAmount !== null) {
                const storedRemaining = parseFloat(f.remainingAmount);
                if (paid > 0) {
                  remaining = calculatedRemaining;
                } else {
                  remaining = Math.min(storedRemaining, final);
                }
              }
              
              return sum + Math.max(0, remaining);
            }, 0);
          }
          
          // Add arrears to feeHeads list for display in the voucher table if > 0
          if (arrears > 0) {
            feeHeads.push({
              name: 'Arrears (Prev. Balance)',
              amount: arrears,
              priority: 998 // Show near the end (before fine)
            });
            // Re-sort to maintain order
            feeHeads.sort((a, b) => a.priority - b.priority);
          }

          // Calculate late fee fine if due date has passed
          const now = new Date();
          if (dueDate < now) {
            // Apply flat late fee of Rs. 200 after due date
            lateFeeFine = 200;
            
            // Check if payment is unpaid into the next month
            const dueMonth = dueDate.getMonth();
            const dueYear = dueDate.getFullYear();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // If we're in a different month than the due date month (and it's later)
            const monthsDiff = (currentYear - dueYear) * 12 + (currentMonth - dueMonth);
            if (monthsDiff >= 1) {
              // Add Rs. 500 fine for unpaid into next month
              lateFeeFine += 500;
            }
          }

          totalAmount = feeHeads.reduce((sum, head) => sum + (head.amount || 0), 0);
        }
      } catch (err) {
        console.error('Error fetching student fees:', err);
      }

      // Calculate payable amounts based on fees with vouchers only
      // Calculate total amount for CURRENT month fees only
      const currentMonthFeeTotal = feeHeads.reduce((sum, head) => {
        // Exclude Arrears and Fines from the current month total calculation to avoid double counting
        if (head.name.toLowerCase().includes('arrears') || head.name.toLowerCase().includes('fine')) {
          return sum;
        }
        return sum + (head.amount || 0);
      }, 0);
      
      const payableWithinDueDate = currentMonthFeeTotal + arrears;
      const payableAfterDueDate = payableWithinDueDate + lateFeeFine + absentFine;

      // Format dates correctly
      const issueDate = new Date().toISOString().split('T')[0];
      const formattedDueDate = dueDate.toISOString().split('T')[0];
      
      // Valid date logic: If due date is in a future month/year (beyond voucher month),
      // set valid date equal to due date. Otherwise, set to last day of voucher month.
      let validDate;
      const dueDateMonth = dueDate.getMonth() + 1; // 1-indexed
      const dueDateYear = dueDate.getFullYear();
      
      if (dueDateYear > year || (dueDateYear === year && dueDateMonth > month)) {
        // Due date is in a future month/year - use due date as valid date
        validDate = formattedDueDate;
      } else {
        // Due date is in current or past voucher month - use last day of voucher month
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        validDate = new Date(year, month - 1, lastDayOfMonth).toISOString().split('T')[0];
      }

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

      // Format fee month for display (e.g., "Jan 2026")
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedFeeMonth = `${monthNames[month - 1]} ${year}`;
      
      // Format dates for display (e.g., "31 Jan 2026")
      const formatDateForDisplay = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        const day = date.getDate();
        const monthName = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${monthName} ${year}`;
      };

      return {
        voucherNo: (() => {
          // Prefer voucher number from feesWithVouchers if available
          if (typeof voucherNumber !== 'undefined' && voucherNumber !== 'N/A') {
            return voucherNumber;
          }
          // Fallback to enrollment/application
          return admission.studentId?.enrollmentNumber || admission.applicationNumber || 'N/A';
        })(),
        rollNo: admission.rollNumber || admission.studentId?.rollNumber || 'N/A',
        feeMonth: formattedFeeMonth,
        validDate: formatDateForDisplay(validDate),
        issueDate: formatDateForDisplay(issueDate),
        dueDate: formatDateForDisplay(formattedDueDate),
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
          { name: 'Late Fee Fine', amount: lateFeeFine },
          { name: 'Absent Fine', amount: absentFine }
        ],
        arrears: arrears,
        lateFeeFine: lateFeeFine,
        absentFine: absentFine,
        payableWithinDueDate: payableWithinDueDate,
        payableAfterDueDate: payableAfterDueDate,
        institution: institutionData
      };
    } catch (err) {
      console.error('Error fetching voucher data:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch voucher data');
      return null;
    } finally {
      setVoucherLoading(false);
    }
  };

  // Fetch students without fee structure
  const fetchStudentsWithoutFeeStructure = async () => {
    try {
      setAssignFeeStructureLoading(true);
      const institutionId = getInstitutionId();

      const params = {
        institution: institutionId
      };

      const response = await axios.get(`${API_URL}/fees/students/without-fee-structure`, createAxiosConfig({ params }));

      setStudentsWithoutFeeStructure(response.data.data || []);
    } catch (err) {
      console.error('Error fetching students without fee structure:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch students without fee structure');
    } finally {
      setAssignFeeStructureLoading(false);
    }
  };

  // Filter students without fee structure based on search criteria
  const  getFilteredAssignFeeStructureStudents = () => {
    return studentsWithoutFeeStructure.filter(student => {
      // Name filter
      if (assignFeeStructureFilters.name && 
          !student.name.toLowerCase().includes(assignFeeStructureFilters.name.toLowerCase())) {
        return false;
      }

      // ID filter (checks both enrollment number and admission number)
      if (assignFeeStructureFilters.id) {
        const searchId = assignFeeStructureFilters.id.toLowerCase();
        const matchesEnrollment = student.enrollmentNumber?.toString().toLowerCase().includes(searchId);
        const matchesAdmission = student.admissionNumber?.toString().toLowerCase().includes(searchId);
        if (!matchesEnrollment && !matchesAdmission) {
          return false;
        }
      }

      // Roll number filter
      if (assignFeeStructureFilters.rollNumber && 
          !student.rollNumber?.toString().toLowerCase().includes(assignFeeStructureFilters.rollNumber.toLowerCase())) {
        return false;
      }

      // Class filter
      if (assignFeeStructureFilters.class && 
          student.class !== assignFeeStructureFilters.class) {
        return false;
      }

      return true;
    });
  };

  // Filter print voucher students based on search criteria
  const getFilteredPrintVoucherStudents = () => {
    return printVoucherStudents.filter(student => {
      // Name filter
      if (printVoucherFilters.name && 
          !student.name?.toLowerCase().includes(printVoucherFilters.name.toLowerCase())) {
        return false;
      }

      // ID filter (checks both enrollment number and admission number)
      if (printVoucherFilters.id) {
        const searchId = printVoucherFilters.id.toLowerCase();  
        const matchesEnrollment = student.enrollmentNumber?.toString().toLowerCase().includes(searchId);
        const matchesAdmission = student.admissionNumber?.toString().toLowerCase().includes(searchId);
        if (!matchesEnrollment && !matchesAdmission) {
          return false;
        }
      }

      // Roll number filter
      if (printVoucherFilters.rollNumber && 
          !student.rollNumber?.toString().toLowerCase().includes(printVoucherFilters.rollNumber.toLowerCase())) {
        return false;
      }

      // Class filter
      if (printVoucherFilters.class && student.class !== printVoucherFilters.class) {
        return false;
      }

      return true;
    });
  };

  // Fetch available classes for assignment
  const fetchAvailableClasses = async () => {
    try {
      const institutionId = getInstitutionId();

      const params = {
        institution: institutionId,
        isActive: true
      };

      const response = await axios.get(`${API_URL}/classes`, createAxiosConfig({ params }));

      setAvailableClasses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch classes');
    }
  };

  // Fetch fee structure by class ID
  const fetchFeeStructureByClass = async (classId) => {
    if (!classId) {
      setSelectedClassFeeStructure(null);
      return;
    }

    try {
      setFetchingFeeStructure(true);

      const response = await axios.get(`${API_URL}/fees/structures/class/${classId}`, createAxiosConfig());

      const feeStructure = response.data.data;
      setSelectedClassFeeStructure(feeStructure);

      // Initialize fee head discounts
      const feeHeadDiscounts = {};
      if (feeStructure && feeStructure.feeStructures) {
        feeStructure.feeStructures.forEach(fs => {
          feeHeadDiscounts[fs.feeHead._id] = {
            discount: 0,
            discountType: 'amount',
            discountReason: ''
          };
        });
      }
      setAssignFeeStructureForm(prev => ({
        ...prev,
        feeHeadDiscounts
      }));
    } catch (err) {
      console.error('Error fetching fee structure:', err);
      notifyError(err.response?.data?.message || 'Failed to fetch fee structure');
      setSelectedClassFeeStructure(null);
    } finally {
      setFetchingFeeStructure(false);
    }
  };

  // Handle class selection change
  const handleClassSelectionChange = async (classId) => {
    setAssignFeeStructureForm(prev => ({
      ...prev,
      classId
    }));
    await fetchFeeStructureByClass(classId);
  };

  // Handle open assign fee structure dialog
  const handleOpenAssignFeeStructureDialog = async (student) => {
    setFeeStructureDialogMode('assign');
    setSelectedStudentForAssignment(student);
    setSelectedClassFeeStructure(null);
    setAssignFeeStructureForm({
      classId: '',
      discount: 0,
      discountType: 'amount',
      discountReason: '',
      feeHeadDiscounts: {}
    });
    await fetchAvailableClasses();
    setAssignFeeStructureDialog(true);
  };

  // Handle open update fee structure dialog
  const handleOpenUpdateFeeStructureDialog = async (student) => {
    setFeeStructureDialogMode('update');
    setSelectedStudentForAssignment(student);
    setSelectedClassFeeStructure(null);
    
    try {
      // Fetch the student's existing fee structures to pre-populate the form
      const institutionId = getInstitutionId();
      const response = await axios.get(`${API_URL}/fees/student-fees`, createAxiosConfig({
        params: {
          institution: institutionId,
          student: student._id
        }
      }));

      const existingFees = response.data.data || [];
      
      if (existingFees.length > 0) {
        // Get the class from the first fee record (all should have same class)
        const firstFee = existingFees[0];
        const classId = firstFee.class?._id || firstFee.class;
        
        // Extract discount info (use first fee's discount as default)
        const discount = firstFee.discountAmount || 0;
        const discountType = firstFee.discountType || 'amount';
        const discountReason = firstFee.discountReason || '';
        
        // 1. First fetch and set the fee structure for this class
        // This will initialize the form with default 0 discounts
        await fetchFeeStructureByClass(classId);
        
        // 2. Build the custom fee head discounts object from existing records
        const feeHeadDiscounts = {};
        existingFees.forEach(fee => {
          const feeHeadId = (fee.feeHead?._id || fee.feeHead)?.toString();
          if (feeHeadId) {
            // Preload all discounts, including 0 (important for 100% discount cases)
            feeHeadDiscounts[feeHeadId] = {
              discount: fee.discountAmount || 0,
              discountType: fee.discountType || 'amount',
              discountReason: fee.discountReason || ''
            };
          }
        });
        
        // 3. Update the form with existing values, OVERRIDING the defaults from step 1
        setAssignFeeStructureForm(prev => ({
          ...prev,
          classId: classId,
          discount: discount,
          discountType: discountType,
          discountReason: discountReason,
          feeHeadDiscounts: {
            ...prev.feeHeadDiscounts, // Keep any other heads if they exist
            ...feeHeadDiscounts       // Override with actual preloaded discounts
          }
        }));
        
        setAssignFeeStructureDialog(true);
      } else {
        // No existing fees found, initialize with empty form
        setAssignFeeStructureForm({
          classId: '',
          discount: 0,
          discountType: 'amount',
          discountReason: '',
          feeHeadDiscounts: {}
        });
      }
    } catch (error) {
      console.error('Error fetching existing fee structure:', error);
      notifyError('Failed to load existing fee structure');
      // Initialize with empty form on error
      setAssignFeeStructureForm({
        classId: '',
        discount: 0,
        discountType: 'amount',
        discountReason: '',
        feeHeadDiscounts: {}
      });
    }
    
    await fetchAvailableClasses();
    setAssignFeeStructureDialog(true);
  };

  // Handle close assign fee structure dialog
  const handleCloseAssignFeeStructureDialog = () => {
    setAssignFeeStructureDialog(false);
    setSelectedStudentForAssignment(null);
    setSelectedClassFeeStructure(null);
    setAssignFeeStructureForm({
      classId: '',
      discount: 0,
      discountType: 'amount',
      discountReason: '',
      feeHeadDiscounts: {}
    });
  };

  // Handle fee head discount change
  const handleFeeHeadDiscountChange = (feeHeadId, field, value) => {
    setAssignFeeStructureForm(prev => ({
      ...prev,
      feeHeadDiscounts: {
        ...prev.feeHeadDiscounts,
        [feeHeadId]: {
          ...prev.feeHeadDiscounts[feeHeadId],
          [field]: value
        }
      }
    }));
  };

  // Calculate final amount for a fee head
  const calculateFinalAmount = (baseAmount, discount, discountType) => {
    if (!discount || discount <= 0) return baseAmount;
    
    let finalAmount = baseAmount;
    if (discountType === 'percentage') {
      finalAmount = baseAmount - (baseAmount * discount / 100);
    } else {
      finalAmount = baseAmount - discount;
    }
    return Math.max(0, finalAmount);
  };

  // Handle assign fee structure
  const handleAssignFeeStructure = async () => {
    if (!assignFeeStructureForm.classId) {
      notifyError('Please select a class');
      return;
    }

    try {
      setAssignFeeStructureLoading(true);

      const payload = {
        studentId: selectedStudentForAssignment._id,
        classId: assignFeeStructureForm.classId,
        discount: parseFloat(assignFeeStructureForm.discount) || 0,
        discountType: assignFeeStructureForm.discountType,
        discountReason: assignFeeStructureForm.discountReason,
        feeHeadDiscounts: assignFeeStructureForm.feeHeadDiscounts || {}
      };

      let response;
      if (feeStructureDialogMode === 'update') {
      response = await axios.put(`${API_URL}/fees/update-structure`, payload, createAxiosConfig());
    } else {
      response = await axios.post(`${API_URL}/fees/assign-structure`, payload, createAxiosConfig());
    }

    const result = response.data.data;
    const totalProcessed = result?.totalAssigned || result?.totalUpdated || 0;
    
    if (totalProcessed > 0) {
      const action = feeStructureDialogMode === 'update' ? 'updated' : 'assigned';
      notifySuccess(`Successfully ${action} ${totalProcessed} fee structure(s) for the student`);
    } else {
      notifyError(`No fee structures were ${feeStructureDialogMode === 'update' ? 'updated' : 'assigned'}`);
    }
    
    handleCloseAssignFeeStructureDialog();
    
    // Refresh the student list to get updated hasAssignedFee status from backend
    await fetchStudentsWithoutFeeStructure();
    } catch (err) {
      console.error('Error assigning fee structure:', err);
      notifyError(err.response?.data?.message || 'Failed to assign fee structure');
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

  const handleDeleteVoucher = async (student) => {
    if (!window.confirm(`Are you sure you want to delete the voucher for ${student.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const { month, year } = parseMonthYear(printVoucherFilters.monthYear);
      // Use _id which is the admission ID, or studentId if available
      const studentId = student._id || student.studentId;

      const response = await axios.delete(`${API_URL}/fees/vouchers`, {
        ...createAxiosConfig(),
        data: {
          studentId,
          month,
          year
        }
      });

      notifySuccess(response.data.message || 'Voucher deleted successfully');
      // Refresh the voucher list
      await fetchPrintVoucherStudents();
      // Clear selection if it was selected
      setSelectedVoucherIds(prev => prev.filter(id => id !== studentId));
    } catch (err) {
      console.error('Error deleting voucher:', err);
      notifyError(err.response?.data?.message || 'Failed to delete voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVoucher = (id) => {
    setSelectedVoucherIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllVouchers = () => {
    const filteredStudents = getFilteredPrintVoucherStudents();
    const unpaidVoucherIds = filteredStudents
      .filter(s => s.voucherStatus === 'Unpaid')
      .map(s => s._id || s.studentId);

    if (selectedVoucherIds.length === unpaidVoucherIds.length) {
      setSelectedVoucherIds([]);
    } else {
      setSelectedVoucherIds(unpaidVoucherIds);
    }
  };

  const handleBulkDeleteVouchers = async () => {
    if (selectedVoucherIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedVoucherIds.length} selected vouchers? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const { month, year } = parseMonthYear(printVoucherFilters.monthYear);

      const response = await axios.delete(`${API_URL}/fees/vouchers`, {
        ...createAxiosConfig(),
        data: {
          studentIds: selectedVoucherIds,
          month,
          year
        }
      });

      notifySuccess(response.data.message || 'Selected vouchers deleted successfully');
      setSelectedVoucherIds([]);
      await fetchPrintVoucherStudents();
    } catch (err) {
      console.error('Error deleting bulk vouchers:', err);
      notifyError(err.response?.data?.message || 'Failed to delete selected vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReceipt = async (receiptId, receiptNumber) => {
    if (!window.confirm(`Are you sure you want to delete receipt ${receiptNumber}? This will reverse the payment and update the student's balance.`)) {
      return;
    }

    try {
      setReceiptsLoading(true);
      const response = await axios.delete(`${API_URL}/fees/payments/${receiptId}`, createAxiosConfig());

      notifySuccess(response.data.message || 'Receipt deleted and payment reversed successfully');
      // Refresh the receipt list
      await fetchReceipts();
    } catch (err) {
      console.error('Error deleting receipt:', err);
      notifyError(err.response?.data?.message || 'Failed to delete receipt');
    } finally {
      setReceiptsLoading(false);
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
      // Reset pagination when tab changes
      setPagination(prev => ({ ...prev, feeHeads: { page: 0, rowsPerPage: prev.feeHeads.rowsPerPage } }));
    }
    if (activeTab === 1) {
      fetchFeeStructureMatrix();
    }
    if (activeTab === 2) {
      fetchStudentsWithoutFeeStructure();
      setPagination(prev => ({ ...prev, assignFeeStructure: { page: 0, rowsPerPage: prev.assignFeeStructure.rowsPerPage } }));
    }
    if (activeTab === 3) {
      if (miscFeeSubTab === 0) {
        fetchGenerateVoucherStudents();
        setPagination(prev => ({ ...prev, generateVoucher: { page: 0, rowsPerPage: prev.generateVoucher.rowsPerPage } }));
      } else if (miscFeeSubTab === 1) {
        fetchMiscFeeStudents();
        setPagination(prev => ({ ...prev, studentOperations: { page: 0, rowsPerPage: prev.studentOperations.rowsPerPage } }));
      }
    }
    if (activeTab === 4) {
      fetchPrintVoucherStudents();
      setPagination(prev => ({ ...prev, printVoucher: { page: 0, rowsPerPage: prev.printVoucher.rowsPerPage } }));
    }
    if (activeTab === 6) {
      // Auto-load latest receipts
      fetchReceipts(true);
      // Also fetch unidentified suspense entries for total calculation
      fetchSuspenseEntries();
      setPagination(prev => ({ ...prev, receipt: { page: 0, rowsPerPage: prev.receipt.rowsPerPage } }));
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
      notifyError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Update local state immediately for each successful update
      const updatedStudentIds = new Set();
      
      for (const student of selectedMiscFeeStudents) {
        try {
          await axios.put(
            `${API_URL}/admissions/${student._id}/status`,
            {
              status: changeStatusForm.status,
              reason: changeStatusForm.reason,
              changeDate: changeStatusForm.changeDate
            },
            createAxiosConfig()
          );
          updatedStudentIds.add(student._id);
        } catch (err) {
          console.error(`Error updating status for student ${student._id}:`, err);
        }
      }

      // Update local state immediately to reflect the status change
      if (updatedStudentIds.size > 0) {
        setMiscFeeStudents(prevStudents => 
          prevStudents.map(student => 
            updatedStudentIds.has(student._id)
              ? { ...student, status: changeStatusForm.status }
              : student
          )
        );
      }

      notifySuccess('Status updated successfully');
      setChangeStatusDialog(false);
      setChangeStatusForm({
        status: '',
        reason: '',
        changeDate: new Date().toISOString().split('T')[0]
      });
      setSelectedMiscFeeStudents([]);
      
      // Refetch to ensure data is in sync with backend
      await fetchMiscFeeStudents();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5', overflowX: 'hidden' }}>
      <Box sx={{ mt: 3, mb: 3, flex: 1, px: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <Paper sx={{ p: 3, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" color="#667eea">
              Fee Management
            </Typography>
          </Box>


          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              <Tab label="Fee Heads" />
              <Tab label="Fee Structure" />
              <Tab label="Assign Fee Structure" />
              <Tab label="Voucher Generation" />
              <Tab label="Print Voucher" />
              <Tab label="Fee Deposit" />
              <Tab label="Receipt" />
              <Tab label="Suspense" />
              <Tab label="Reports" />
            </Tabs>
          </Box>

        {/* Tab Panel 0: Fee Heads */}
        {activeTab === 0 && (
          <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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

            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
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
              <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
                <Table sx={{ minWidth: 650 }}>
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
                      getPaginatedData(
                        feeHeads.sort((a, b) => {
                          // Sort: active first, then by priority
                          if (a.isActive !== b.isActive) {
                            return a.isActive ? -1 : 1;
                          }
                          return (a.priority || 0) - (b.priority || 0);
                        }),
                        'feeHeads'
                      ).map((feeHead) => (
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
                {feeHeads.length > 0 && (
                  <TablePagination
                    component="div"
                    count={feeHeads.length}
                    page={pagination.feeHeads.page}
                    onPageChange={(e, newPage) => handleChangePage('feeHeads', e, newPage)}
                    rowsPerPage={pagination.feeHeads.rowsPerPage}
                    onRowsPerPageChange={(e) => handleChangeRowsPerPage('feeHeads', e)}
                    rowsPerPageOptions={[12, 25, 50, 100]}
                    labelRowsPerPage="Rows per page:"
                  />
                )}
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab Panel 1: Fee Structure */}
        {activeTab === 1 && (
          <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, textTransform: 'uppercase' }}>
              FEE STRUCTURE
            </Typography>


            {feeStructureLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : feeStructureMatrix && feeStructureMatrix.classes && feeStructureMatrix.feeHeads && feeStructureMatrix.feeHeads.length > 0 ? (
              <Box>
                <TableContainer component={Paper} sx={{ maxHeight: '70vh', overflow: 'auto', overflowX: 'auto', width: '100%', border: '1px solid #e0e0e0' }}>
                  <Table stickyHeader sx={{ minWidth: 650 }}>
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

        {/* Tab Panel 2: Voucher Generation */}
        {/* Tab Panel 2: Assign Fee Structure */}
        {activeTab === 2 && (
          <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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

            {/* Filter Section */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Student Name"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={assignFeeStructureFilters.name}
                    onChange={(e) => setAssignFeeStructureFilters(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Search by name..."
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="ID / Admission #"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={assignFeeStructureFilters.id}
                    onChange={(e) => setAssignFeeStructureFilters(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="Search by ID..."
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Roll Number"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={assignFeeStructureFilters.rollNumber}
                    onChange={(e) => setAssignFeeStructureFilters(prev => ({ ...prev, rollNumber: e.target.value }))}
                    placeholder="Search by roll..."
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>Class</InputLabel>
                    <Select
                      value={assignFeeStructureFilters.class}
                      onChange={(e) => setAssignFeeStructureFilters(prev => ({ ...prev, class: e.target.value }))}
                      label="Class"
                    >
                      <MenuItem value="">All Classes</MenuItem>
                      {[...new Set(studentsWithoutFeeStructure.map(s => s.class).filter(Boolean))].sort().map((className) => (
                        <MenuItem key={className} value={className}>{capitalizeFirstOnly(className)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setAssignFeeStructureFilters({ name: '', id: '', rollNumber: '', class: '' })}
                    sx={{ borderColor: '#667eea', color: '#667eea' }}
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {assignFeeStructureLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : getFilteredAssignFeeStructureStudents().length === 0 ? (
              <Alert severity="info">
                {studentsWithoutFeeStructure.length === 0 
                  ? 'No students found without fee structure assignment.' 
                  : 'No students match the current filter criteria.'}
              </Alert>
            ) : (
              <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
                <Table sx={{ minWidth: 650 }}>
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
                    {getPaginatedData(getFilteredAssignFeeStructureStudents(), 'assignFeeStructure').map((student) => (
                      <TableRow key={student._id} hover>
                        <TableCell>{student.enrollmentNumber}</TableCell>
                        <TableCell>{student.rollNumber || 'N/A'}</TableCell>
                        <TableCell>{student.admissionNumber}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.name)}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.class)}</TableCell>
                        <TableCell>{capitalizeFirstOnly(student.section)}</TableCell>
                        <TableCell>{student.academicYear}</TableCell>
                        <TableCell align="center">
                          {student.hasAssignedFee ? (
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <Chip 
                                label="Fee Assigned" 
                                color="success" 
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleOpenUpdateFeeStructureDialog(student)}
                                sx={{ 
                                  borderColor: '#667eea', 
                                  color: '#667eea',
                                  '&:hover': { borderColor: '#5568d3', bgcolor: 'rgba(102, 126, 234, 0.04)' }
                                }}
                              >
                                Update
                              </Button>
                            </Box>
                          ) : (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleOpenAssignFeeStructureDialog(student)}
                              sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5568d3' } }}
                            >
                              Assign Fee Structure
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {getFilteredAssignFeeStructureStudents().length > 0 && (
                  <TablePagination
                    component="div"
                    count={getFilteredAssignFeeStructureStudents().length}
                    page={pagination.assignFeeStructure.page}
                    onPageChange={(e, newPage) => handleChangePage('assignFeeStructure', e, newPage)}
                    rowsPerPage={pagination.assignFeeStructure.rowsPerPage}
                    onRowsPerPageChange={(e) => handleChangeRowsPerPage('assignFeeStructure', e)}
                    rowsPerPageOptions={[12, 25, 50, 100]}
                    labelRowsPerPage="Rows per page:"
                  />
                )}
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab Panel 3: Voucher Generation */}
        {activeTab === 3 && (
          <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              VOUCHER GENERATION
            </Typography>

            {/* Sub-tabs for Voucher Generation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs 
                value={miscFeeSubTab} 
                onChange={handleMiscFeeSubTabChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
              >
                <Tab label="Generate Voucher" />
                <Tab label="Student Operations" />
              </Tabs>
            </Box>

            {/* Sub-tab Panel 0: Generate Voucher */}
            {miscFeeSubTab === 0 && (
              <Box>
                {/* Filters */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Grid container spacing={2} sx={{ width: '100%', maxWidth: '100%' }}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Month/Year"
                          type="month"
                          value={generateVoucherFilters.monthYear}
                          onChange={(e) => setGenerateVoucherFilters({ ...generateVoucherFilters, monthYear: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      {/* Search Filters */}
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Student Name"
                          value={generateVoucherFilters.name}
                          onChange={(e) => setGenerateVoucherFilters({ ...generateVoucherFilters, name: e.target.value })}
                          placeholder="Search by name..."
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="ID / Admission #"
                          value={generateVoucherFilters.id}
                          onChange={(e) => setGenerateVoucherFilters({ ...generateVoucherFilters, id: e.target.value })}
                          placeholder="Search by ID..."
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Roll Number"
                          value={generateVoucherFilters.rollNumber}
                          onChange={(e) => setGenerateVoucherFilters({ ...generateVoucherFilters, rollNumber: e.target.value })}
                          placeholder="Search by roll..."
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Class</InputLabel>
                          <Select
                            value={generateVoucherFilters.class}
                            onChange={(e) => setGenerateVoucherFilters({ ...generateVoucherFilters, class: e.target.value })}
                            label="Class"
                          >
                            <MenuItem value="">All Classes</MenuItem>
                            {[...new Set(generateVoucherStudents.map(s => s.class).filter(Boolean))].sort().map((className) => (
                              <MenuItem key={className} value={className}>{capitalizeFirstOnly(className)}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => setGenerateVoucherFilters(prev => ({ ...prev, name: '', id: '', rollNumber: '', class: '' }))}
                          sx={{ borderColor: '#667eea', color: '#667eea' }}
                        >
                          Clear Filters
                        </Button>
                      </Grid>
                      {/* Action Buttons */}
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
                            checked={
                              getFilteredGenerateVoucherStudents().length > 0 &&
                              getFilteredGenerateVoucherStudents()
                                .filter(s => s.voucherStatus !== 'Generated')
                                .every(s => selectedGenerateVoucherStudents.some(sel => sel._id === s._id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Only select students without Generated status
                                const selectableStudents = getFilteredGenerateVoucherStudents().filter(s => s.voucherStatus !== 'Generated');
                                setSelectedGenerateVoucherStudents(selectableStudents);
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
                              No students found with fee structures assigned. Please assign fee structures to students first.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedData(getFilteredGenerateVoucherStudents(), 'generateVoucher').map((student) => {
                          const isGenerated = student.voucherStatus === 'Generated';
                          const isSelected = selectedGenerateVoucherStudents.some(s => s._id === student._id);
                          
                          return (
                          <TableRow 
                            key={student._id}
                            sx={{
                              opacity: isGenerated ? 0.6 : 1,
                              bgcolor: isGenerated ? 'action.hover' : 'inherit'
                            }}
                          >
                            <TableCell padding="checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isGenerated}
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
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  {generateVoucherStudents.length > 0 && (
                    <TablePagination
                      component="div"
                      count={getFilteredGenerateVoucherStudents().length}
                      page={pagination.generateVoucher.page}
                      onPageChange={(e, newPage) => handleChangePage('generateVoucher', e, newPage)}
                      rowsPerPage={pagination.generateVoucher.rowsPerPage}
                      onRowsPerPageChange={(e) => handleChangeRowsPerPage('generateVoucher', e)}
                      rowsPerPageOptions={[12, 25, 50, 100]}
                      labelRowsPerPage="Rows per page:"
                    />
                  )}
                </TableContainer>

                {/* Total Count */}
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Typography variant="body1" fontWeight="bold">
                    Total: {generateVoucherStudents.length} student(s) | Selected: {selectedGenerateVoucherStudents.length} student(s)
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Sub-tab Panel 1: Student Operations */}
            {miscFeeSubTab === 1 && (
              <Box>
                {/* Filters */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
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
                        notifyError('Please select at least one student');
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
                        notifyError('Please select at least one student');
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
                        getPaginatedData(miscFeeStudents, 'studentOperations').map((student) => (
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
                  {miscFeeStudents.length > 0 && (
                    <TablePagination
                      component="div"
                      count={miscFeeStudents.length}
                      page={pagination.studentOperations.page}
                      onPageChange={(e, newPage) => handleChangePage('studentOperations', e, newPage)}
                      rowsPerPage={pagination.studentOperations.rowsPerPage}
                      onRowsPerPageChange={(e) => handleChangeRowsPerPage('studentOperations', e)}
                      rowsPerPageOptions={[12, 25, 50, 100]}
                      labelRowsPerPage="Rows per page:"
                    />
                  )}
                </TableContainer>
              </Box>
            )}
          </Box>
        )}

        {/* Tab Panel 3: Print Voucher */}
        {/* Tab Panel 4: Print Voucher */}
        {activeTab === 4 && (
          <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              PRINT VOUCHER
            </Typography>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2} sx={{ width: '100%', maxWidth: '100%' }}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Month/Year"
                      type="month"
                      value={printVoucherFilters.monthYear}
                      onChange={(e) => {
                        setPrintVoucherFilters({ ...printVoucherFilters, monthYear: e.target.value });
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Voucher Number"
                      value={printVoucherFilters.voucherNumber}
                      onChange={(e) => {
                        setPrintVoucherFilters({ ...printVoucherFilters, voucherNumber: e.target.value });
                      }}
                      placeholder="Search by voucher #"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Student Name"
                      value={printVoucherFilters.name}
                      onChange={(e) => setPrintVoucherFilters({ ...printVoucherFilters, name: e.target.value })}
                      placeholder="Search by name..."
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="ID / Admission #"
                      value={printVoucherFilters.id}
                      onChange={(e) => setPrintVoucherFilters({ ...printVoucherFilters, id: e.target.value })}
                      placeholder="Search by ID..."
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Roll Number"
                      value={printVoucherFilters.rollNumber}
                      onChange={(e) => setPrintVoucherFilters({ ...printVoucherFilters, rollNumber: e.target.value })}
                      placeholder="Search by roll..."
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel>Class</InputLabel>
                      <Select
                        value={printVoucherFilters.class}
                        onChange={(e) => setPrintVoucherFilters({ ...printVoucherFilters, class: e.target.value })}
                        label="Class"
                      >
                        <MenuItem value="">All Classes</MenuItem>
                        {availableClasses.map((cls) => (
                          <MenuItem key={cls._id} value={cls.name}>
                            {cls.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setPrintVoucherFilters({
                        monthYear: printVoucherFilters.monthYear,
                        voucherNumber: '',
                        name: '',
                        id: '',
                        rollNumber: '',
                        class: ''
                      })}
                    >
                      Clear Filters
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<Print />}
                      sx={{ bgcolor: '#667eea' }}
                      disabled={printVoucherStudents.length === 0}
                    >
                      Print Fee Voucher
                    </Button>
                  </Grid>
                  {selectedVoucherIds.length > 0 && (
                    <Grid item xs={12} md={4}>
                      <Button
                        variant="contained"
                        fullWidth
                        color="error"
                        startIcon={<Delete />}
                        onClick={handleBulkDeleteVouchers}
                        disabled={loading}
                      >
                        Delete Selected ({selectedVoucherIds.length})
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Students Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedVoucherIds.length > 0 && selectedVoucherIds.length < getFilteredPrintVoucherStudents().filter(s => s.voucherStatus === 'Unpaid').length}
                        checked={getFilteredPrintVoucherStudents().filter(s => s.voucherStatus === 'Unpaid').length > 0 && selectedVoucherIds.length === getFilteredPrintVoucherStudents().filter(s => s.voucherStatus === 'Unpaid').length}
                        onChange={handleSelectAllVouchers}
                        sx={{ color: 'white !important', '&.Mui-checked': { color: 'white !important' } }}
                      />
                    </TableCell>
                    <TableCell>Voucher Status</TableCell>
                    <TableCell>Voucher Number</TableCell>
                    <TableCell align="right">Voucher Amount</TableCell>
                    <TableCell align="right">Arrears</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Roll #</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : getFilteredPrintVoucherStudents().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body2" color="textSecondary">
                          {printVoucherStudents.length === 0 
                            ? 'No data found' 
                            : 'No students match the current filter criteria.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    getPaginatedData(getFilteredPrintVoucherStudents(), 'printVoucher').map((student) => (
                      <TableRow key={student._id}>
                        <TableCell padding="checkbox">
                          {student.voucherStatus === 'Unpaid' && (
                            <Checkbox
                              checked={selectedVoucherIds.includes(student._id || student.studentId)}
                              onChange={() => handleSelectVoucher(student._id || student.studentId)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {student.voucherStatus ? (
                            <Chip
                              label={student.voucherStatus === 'Partial' ? 'Partially Paid' : student.voucherStatus}
                              size="small"
                              color={
                                student.voucherStatus === 'Paid' ? 'success' :
                                student.voucherStatus === 'Partial' ? 'warning' :
                                student.voucherStatus === 'Unpaid' ? 'error' :
                                student.voucherStatus === 'Generated' ? 'info' : 'default'
                              }
                            />
                          ) : (
                            <Chip label="Pending" size="small" color="warning" />
                          )}
                        </TableCell>
                        <TableCell>{student.voucherNumber || 'N/A'}</TableCell>
                        <TableCell align="right">Rs. {(student.voucherAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell align="right" sx={{ color: (student.arrears || 0) > 0 ? 'error.main' : 'inherit', fontWeight: (student.arrears || 0) > 0 ? 'bold' : 'normal' }}>
                          Rs. {(student.arrears || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{student.id || 'N/A'}</TableCell>
                        <TableCell>{student.rollNumber || 'N/A'}</TableCell>
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
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleViewVoucher(student)}
                            >
                              <Visibility />
                            </IconButton>
                            {student.voucherStatus === 'Unpaid' && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteVoucher(student)}
                                disabled={loading}
                              >
                                <Delete />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {printVoucherStudents.length > 0 && (
                <TablePagination
                  component="div"
                  count={getFilteredPrintVoucherStudents().length}
                  page={pagination.printVoucher.page}
                  onPageChange={(e, newPage) => handleChangePage('printVoucher', e, newPage)}
                  rowsPerPage={pagination.printVoucher.rowsPerPage}
                  onRowsPerPageChange={(e) => handleChangeRowsPerPage('printVoucher', e)}
                  rowsPerPageOptions={[12, 25, 50, 100]}
                  labelRowsPerPage="Rows per page:"
                />
              )}
            </TableContainer>

            {/* Total Count */}
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="body1" fontWeight="bold">
                Total: {printVoucherStudents.length} student(s)
              </Typography>
            </Box>
          </Box>
        )}

        {/* Tab Panel 5: Fee Deposit */}
        {activeTab === 5 && (
          <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              FEE DEPOSIT
            </Typography>

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
                      label="Voucher Number"
                      value={manualDepositSearch.voucherNumber}
                      onChange={(e) => setManualDepositSearch({ ...manualDepositSearch, voucherNumber: e.target.value })}
                      placeholder="Enter voucher number (e.g., VCH-2024-01-000001)"
                    />
                  </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            variant="contained"
                            fullWidth
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

                {/* Student Table Section - Only show after search */}
                {hasSearchedStudents && (
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

                    <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
                      <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                            <TableCell>ID</TableCell>
                            <TableCell>Roll #</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Class</TableCell>
                            <TableCell>Section</TableCell>
                            <TableCell>Adv. Fee</TableCell>
                            <TableCell>Voucher Number</TableCell>
                            <TableCell>Voucher Month</TableCell>
                            <TableCell>Voucher Status</TableCell>
                            <TableCell align="right">Voucher Amount</TableCell>
                            <TableCell align="right">Arrears</TableCell>
                            <TableCell align="right">Paid Amount</TableCell>
                            <TableCell>Remaining Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                                <CircularProgress />
                              </TableCell>
                            </TableRow>
                          ) : manualDepositStudents.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={13} align="center" sx={{ py: 4 }}>
                                <Typography variant="body2" color="textSecondary">
                                  No data found. Please search for students.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            getPaginatedData(manualDepositStudents, 'feeDeposit').map((student) => {
                              const isPaid = student.voucherStatus === 'Paid';
                              const isSelectable = !isPaid;
                              return (
                              <TableRow
                                key={student._id}
                                onClick={() => {
                                  if (isSelectable) {
                                    handleManualDepositStudentSelect(student);
                                  } else {
                                    notifyError('This voucher is already paid and cannot be paid again.');
                                  }
                                }}
                                sx={{
                                  cursor: isSelectable ? 'pointer' : 'not-allowed',
                                  bgcolor: selectedManualDepositStudent?._id === student._id ? '#e3f2fd' : (isPaid ? '#f5f5f5' : 'inherit'),
                                  opacity: isPaid ? 0.6 : 1,
                                  '&:hover': { 
                                    bgcolor: selectedManualDepositStudent?._id === student._id 
                                      ? '#e3f2fd' 
                                      : (isPaid ? '#f5f5f5' : '#f5f5f5')
                                  }
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
                                <TableCell>{capitalizeFirstOnly(student.class || 'N/A')}</TableCell>
                                <TableCell>{capitalizeFirstOnly(student.section || 'N/A')}</TableCell>
                                <TableCell>{student.advanceFee || '0'}</TableCell>
                                <TableCell>{student.lastVoucher || 'N/A'}</TableCell>
                                <TableCell>{student.voucherMonth || 'N/A'}</TableCell>
                                <TableCell>
                                  {student.voucherStatus && student.voucherStatus !== 'N/A' ? (
                                    <Chip
                                      label={student.voucherStatus === 'Partial' ? 'Partially Paid' : student.voucherStatus}
                                      size="small"
                                      color={
                                        student.voucherStatus === 'Paid' ? 'success' :
                                        student.voucherStatus === 'Partial' ? 'warning' :
                                        student.voucherStatus === 'Unpaid' ? 'error' : 'default'
                                      }
                                    />
                                  ) : (
                                    'N/A'
                                  )}
                                </TableCell>
                                <TableCell align="right">Rs. {(student.voucherAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell align="right" sx={{ color: (student.arrears || 0) > 0 ? 'error.main' : 'inherit', fontWeight: (student.arrears || 0) > 0 ? 'bold' : 'normal' }}>
                                  Rs. {(student.arrears || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell align="right">Rs. {(student.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: (student.remainingAmount || 0) > 0 ? 'error.main' : 'success.main' }}>
                                  Rs. {(student.remainingAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            );
                            })
                          )}
                        </TableBody>
                      </Table>
                      {manualDepositStudents.length > 0 && (
                        <TablePagination
                          component="div"
                          count={manualDepositStudents.length}
                          page={pagination.feeDeposit.page}
                          onPageChange={(e, newPage) => handleChangePage('feeDeposit', e, newPage)}
                          rowsPerPage={pagination.feeDeposit.rowsPerPage}
                          onRowsPerPageChange={(e) => handleChangeRowsPerPage('feeDeposit', e)}
                          rowsPerPageOptions={[12, 25, 50, 100]}
                          labelRowsPerPage="Rows per page:"
                        />
                      )}
                    </TableContainer>
                  </CardContent>
                </Card>
                )}

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
                          <Typography variant="body2" sx={{ mb: 1 }}>Bank payment</Typography>
                          <FormControl fullWidth required sx={{ mt: 1 }}>
                            <InputLabel>Select Bank Account *</InputLabel>
                            <Select
                              value={manualDepositForm.bankAccount}
                              onChange={(e) => {
                                const account = e.target.value;
                                let name = manualDepositForm.bankName;
                                if (account === 'allied') name = 'Allied Bank';
                                else if (account === 'bankislami') name = 'Bank Islami';
                                setManualDepositForm({ ...manualDepositForm, bankAccount: account, bankName: name });
                              }}
                              label="Select Bank Account *"
                              error={!manualDepositForm.bankAccount || manualDepositForm.bankAccount.trim() === ''}
                            >
                              <MenuItem value="">Select Bank Account</MenuItem>
                              <MenuItem value="allied">Allied Bank - 0010000076780246</MenuItem>
                              <MenuItem value="bankislami">Bank Islami - 310000223490001</MenuItem>
                            </Select>
                            {(!manualDepositForm.bankAccount || manualDepositForm.bankAccount.trim() === '') && (
                              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                                Bank account is required
                              </Typography>
                            )}
                          </FormControl>
                          <TextField
                            fullWidth
                            sx={{ mt: 2 }}
                            label="Bank Name"
                            value={manualDepositForm.bankName}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, bankName: e.target.value })}
                            placeholder="Enter bank name"
                          />
                          <TextField
                            fullWidth
                            sx={{ mt: 2 }}
                            label="Cheque Number (if applicable)"
                            value={manualDepositForm.chequeNumber}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, chequeNumber: e.target.value })}
                            placeholder="Enter cheque number"
                          />
                          <TextField
                            fullWidth
                            required
                            sx={{ mt: 2 }}
                            label="Transaction ID *"
                            value={manualDepositForm.transactionId}
                            onChange={(e) => setManualDepositForm({ ...manualDepositForm, transactionId: e.target.value })}
                            placeholder="Enter transaction ID"
                            error={!manualDepositForm.transactionId || manualDepositForm.transactionId.trim() === ''}
                            helperText={(!manualDepositForm.transactionId || manualDepositForm.transactionId.trim() === '') ? 'Transaction ID is required' : ''}
                          />
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

                        {/* Outstanding Fees Section */}
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Outstanding Fees
                          </Typography>
                          {loadingOutstandingFees ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : outstandingFees.length === 0 ? (
                            <Alert severity="info">No outstanding fees found for this student.</Alert>
                          ) : (
                            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', width: '100%' }}>
                              <Table size="small" sx={{ minWidth: 650 }}>
                                <TableHead>
                                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Fee Head</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Amount</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Paid</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Remaining</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Payment Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {getPaginatedData(outstandingFees, 'outstandingFees').map((fee) => {
                                    const remaining = fee.remainingAmount || (fee.finalAmount - (fee.paidAmount || 0));
                                    const paymentAmount = selectedFeePayments[fee._id] || 0;
                                    return (
                                      <TableRow key={fee._id}>
                                        <TableCell>{fee.feeHead?.name || 'N/A'}</TableCell>
                                        <TableCell align="right">Rs. {(fee.finalAmount || 0).toLocaleString()}</TableCell>
                                        <TableCell align="right">Rs. {(fee.paidAmount || 0).toLocaleString()}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: remaining > 0 ? 'error.main' : 'success.main' }}>
                                          Rs. {remaining.toLocaleString()}
                                        </TableCell>
                                        <TableCell align="right">
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => {
                                              const amount = parseFloat(e.target.value) || 0;
                                              if (amount <= remaining && amount >= 0) {
                                                handleFeePaymentChange(fee._id, amount);
                                              }
                                            }}
                                            InputProps={{
                                              inputProps: { min: 0, max: remaining, step: 0.01 },
                                              startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                                              sx: { width: '150px' }
                                            }}
                                            helperText={`Max: Rs. ${remaining.toLocaleString()}`}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={fee.status || 'pending'}
                                            size="small"
                                            color={
                                              fee.status === 'paid' ? 'success' :
                                              fee.status === 'partial' ? 'warning' :
                                              fee.status === 'overdue' ? 'error' : 'default'
                                            }
                                          />
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                              {outstandingFees.length > 0 && (
                                <TablePagination
                                  component="div"
                                  count={outstandingFees.length}
                                  page={pagination.outstandingFees.page}
                                  onPageChange={(e, newPage) => handleChangePage('outstandingFees', e, newPage)}
                                  rowsPerPage={pagination.outstandingFees.rowsPerPage}
                                  onRowsPerPageChange={(e) => handleChangeRowsPerPage('outstandingFees', e)}
                                  rowsPerPageOptions={[12, 25, 50, 100]}
                                  labelRowsPerPage="Rows per page:"
                                />
                              )}
                            </TableContainer>
                          )}
                        </Grid>

                        {/* Total Amount Display */}
                        <Grid item xs={12}>
                          <Box sx={{ 
                            p: 2, 
                            bgcolor: '#e8f5e9', 
                            borderRadius: 1,
                            border: '1px solid #4caf50'
                          }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="body2" color="textSecondary">
                                  Fee Payments: Rs. {Object.values(selectedFeePayments).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0).toLocaleString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32', textAlign: { xs: 'left', md: 'right' } }}>
                                  Total Amount: Rs. {calculateTotalPayment().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Typography>
                              </Grid>
                            </Grid>
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
                                    paymentMethod: 'bank',
                                    bankAccount: '',
                                    paymentDate: new Date().toISOString().split('T')[0],
                                    feeAmount: '',
                                    remarks: '',
                                    chequeNumber: '',
                                    bankName: '',
                                    transactionId: ''
                                  });
                                  setSelectedManualDepositStudent(null);
                                  setOutstandingFees([]);
                                  setSelectedFeePayments({});
                                }}
                              >
                              Reset
                            </Button>
                            <Button
                              variant="contained"
                              size="large"
                              sx={{ bgcolor: '#667eea', minWidth: 150 }}
                              onClick={handleSavePayment}
                              disabled={
                                recordingPayment || 
                                calculateTotalPayment() <= 0 ||
                                !manualDepositForm.bankAccount || 
                                manualDepositForm.bankAccount.trim() === '' ||
                                !manualDepositForm.transactionId || 
                                manualDepositForm.transactionId.trim() === ''
                              }
                            >
                              {recordingPayment ? <CircularProgress size={24} /> : 'Save Payment'}
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

        {/* Tab Panel 6: Receipt */}
        {activeTab === 6 && (
          <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              RECEIPT
            </Typography>

            {/* Search Filters */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="ID"
                      value={receiptSearch.id}
                      onChange={(e) => setReceiptSearch({ ...receiptSearch, id: e.target.value })}
                      placeholder="Enter ID"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Roll Number"
                      value={receiptSearch.rollNumber}
                      onChange={(e) => setReceiptSearch({ ...receiptSearch, rollNumber: e.target.value })}
                      placeholder="Enter roll number"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Student Name"
                      value={receiptSearch.studentName}
                      onChange={(e) => setReceiptSearch({ ...receiptSearch, studentName: e.target.value })}
                      placeholder="Enter student name"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Receipt Number"
                      value={receiptSearch.receiptNumber}
                      onChange={(e) => setReceiptSearch({ ...receiptSearch, receiptNumber: e.target.value })}
                      placeholder="Enter receipt number"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Start Date"
                      type="date"
                      value={receiptSearch.startDate}
                      onChange={(e) => setReceiptSearch({ ...receiptSearch, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4} lg={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="End Date"
                      type="date"
                      value={receiptSearch.endDate}
                      onChange={(e) => setReceiptSearch({ ...receiptSearch, endDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Search />}
                        sx={{ bgcolor: '#667eea' }}
                        onClick={fetchReceipts}
                        disabled={receiptsLoading}
                      >
                        {receiptsLoading ? 'Searching...' : 'Search'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
 
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ my: 2, justifyContent: 'flex-end' }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  color: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 10px 0 rgba(0,0,0,0.1)'
                }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, '&:last-child': { pb: 2 } }}>
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>
                        Total Receipts
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                        {formatCurrency(receipts.filter(r => r.status !== 'refunded').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0))}
                      </Typography>
                    </Box>
                    <Receipt sx={{ fontSize: 32, opacity: 0.8 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
                  color: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 10px 0 rgba(0,0,0,0.1)'
                }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, '&:last-child': { pb: 2 } }}>
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>
                        Total Suspense
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                        {formatCurrency(suspenseEntries.filter(e => e.status === 'unidentified').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0))}
                      </Typography>
                    </Box>
                    <AccountBalanceWallet sx={{ fontSize: 32, opacity: 0.8 }} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
 
            {/* Receipts Table */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                    Receipt List {receipts.length > 0 && `(${receipts.length} receipt${receipts.length !== 1 ? 's' : ''})`}
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownload />}
                    onClick={handleExportReceipts}
                    disabled={receipts.length === 0}
                    sx={{ 
                      borderColor: '#667eea', 
                      color: '#667eea',
                      '&:hover': { borderColor: '#5568d3', bgcolor: 'rgba(102, 126, 234, 0.04)' }
                    }}
                  >
                    Export Excel
                  </Button>
                </Box>

                {receiptsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
                      <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#667eea', '& .MuiTableCell-head': { color: 'white', fontWeight: 'bold' } }}>
                            <TableCell>Receipt Number</TableCell>
                            <TableCell>Voucher Number</TableCell>
                            <TableCell>Payment Date</TableCell>
                            <TableCell>Student ID</TableCell>
                            <TableCell>Roll #</TableCell>
                            <TableCell>Student Name</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Bank</TableCell>
                            <TableCell>Transaction ID</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Collected By</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            // Step 1: Group ALL receipts by transaction ID before pagination
                            const allGroupedReceiptsMap = receipts.reduce((acc, receipt) => {
                              const tid = receipt.transactionId || `no-tid-${receipt._id}`;
                              if (!acc[tid]) {
                                acc[tid] = [];
                              }
                              acc[tid].push(receipt);
                              return acc;
                            }, {});

                            // Step 2: Create a list of group IDs in order of their first appearance in receipts
                            const transactionGroupIds = [];
                            const seenTids = new Set();
                            receipts.forEach(r => {
                              const tid = r.transactionId || `no-tid-${r._id}`;
                              if (!seenTids.has(tid)) {
                                transactionGroupIds.push(tid);
                                seenTids.add(tid);
                              }
                            });

                            // Step 3: Paginate the groups
                            const paginatedGroupIds = getPaginatedData(transactionGroupIds, 'receipt');

                            if (receipts.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={12} align="center">
                                    <Typography variant="body2" color="textSecondary">
                                      No receipts found. Please search for receipts.
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return paginatedGroupIds.map((tid) => {
                              const group = allGroupedReceiptsMap[tid];
                              const isGroup = group.length > 1;
                              const isExpanded = expandedTransactions.has(tid);
                              const firstReceipt = group[0];
                              const totalAmount = group.reduce((sum, r) => sum + (r.amount || 0), 0);
                              
                              // Check if all receipts in the group have the same voucher number
                              const allSameVoucher = group.every(r => r.voucherNumber === firstReceipt.voucherNumber);
                              const displayVoucher = allSameVoucher ? firstReceipt.voucherNumber : 'Multiple';

                              return (
                                <React.Fragment key={tid}>
                                  {/* Main Row / Grouped Row */}
                                  <TableRow 
                                    hover 
                                    onClick={() => isGroup && toggleTransactionExpansion(tid)}
                                    sx={{ 
                                      cursor: isGroup ? 'pointer' : 'default',
                                      bgcolor: isGroup ? '#f9faff' : 'inherit',
                                      '&:hover': { bgcolor: isGroup ? '#f0f4ff !important' : 'inherit' }
                                    }}
                                  >
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {isGroup && (
                                          <IconButton size="small" onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTransactionExpansion(tid);
                                          }}>
                                            {isExpanded ? <Close sx={{ fontSize: 16 }} /> : <Add sx={{ fontSize: 16 }} />}
                                          </IconButton>
                                        )}
                                        <Chip 
                                          label={isGroup ? `TRANS-${tid}` : (firstReceipt.receiptNumber || 'N/A')} 
                                          size="small" 
                                          color={isGroup ? "secondary" : "primary"} 
                                          variant="outlined" 
                                        />
                                        {isGroup && (
                                          <Chip label={`${group.length} Receipts`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                        )}
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      {displayVoucher && displayVoucher !== 'N/A' ? (
                                        <Chip label={displayVoucher} size="small" color="secondary" variant="outlined" />
                                      ) : (
                                        'N/A'
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {firstReceipt.paymentDate 
                                        ? new Date(firstReceipt.paymentDate).toLocaleDateString('en-GB')
                                        : 'N/A'}
                                    </TableCell>
                                    <TableCell>{firstReceipt.studentId || 'N/A'}</TableCell>
                                    <TableCell>{firstReceipt.rollNumber || 'N/A'}</TableCell>
                                    <TableCell>{capitalizeFirstOnly(firstReceipt.studentName || 'N/A')}</TableCell>
                                    <TableCell align="right">
                                      Rs. {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                      {firstReceipt.bankName || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      {tid.startsWith('no-tid-') ? 'N/A' : tid}
                                    </TableCell>
                                      {(() => {
                                        const hasRefunded = group.some(r => r.status === 'refunded');
                                        const allRefunded = group.every(r => r.status === 'refunded');
                                        let statusLabel = firstReceipt.status || 'completed';
                                        let statusColor = 'default';
                                        let cellBg = 'inherit';

                                        if (isGroup && hasRefunded && !allRefunded) {
                                          statusLabel = 'Partial Refund';
                                          statusColor = 'warning';
                                          cellBg = '#fffdf0'; // Light Yellow
                                        } else if (statusLabel === 'refunded') {
                                          statusColor = 'error';
                                          cellBg = '#fff5f5'; // Light Red
                                        } else if (statusLabel === 'completed') {
                                          statusColor = 'success';
                                        } else if (statusLabel === 'pending') {
                                          statusColor = 'warning';
                                        } else if (statusLabel === 'failed') {
                                          statusColor = 'error';
                                        }

                                        return (
                                          <TableCell>
                                            <Chip
                                              label={statusLabel}
                                              size="small"
                                              color={statusColor}
                                            />
                                          </TableCell>
                                        );
                                      })()}
                                    <TableCell>{firstReceipt.collectedBy?.name || 'N/A'}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrintReceipt(group);
                                          }}
                                          title="Download Receipt"
                                        >
                                          <Print fontSize="small" />
                                        </IconButton>
                                        {!isGroup && firstReceipt.status !== 'refunded' && (
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteReceipt(firstReceipt._id, firstReceipt.receiptNumber);
                                            }}
                                            title="Delete Receipt"
                                          >
                                            <Delete fontSize="small" />
                                          </IconButton>
                                        )}
                                      </Box>
                                    </TableCell>
                                  </TableRow>

                                  {/* Expanded Child Rows */}
                                  {isGroup && isExpanded && group.map((receipt) => (
                                    <TableRow key={receipt._id} sx={{ bgcolor: '#fff' }}>
                                      <TableCell sx={{ pl: 6 }}>
                                        <Chip label={receipt.receiptNumber || 'N/A'} size="small" color="primary" variant="outlined" sx={{ opacity: 0.8 }} />
                                      </TableCell>
                                      <TableCell>
                                        {receipt.voucherNumber && receipt.voucherNumber !== 'N/A' ? (
                                          <Chip label={receipt.voucherNumber} size="small" color="secondary" variant="outlined" sx={{ opacity: 0.8 }} />
                                        ) : (
                                          'N/A'
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {receipt.paymentDate 
                                          ? new Date(receipt.paymentDate).toLocaleDateString('en-GB')
                                          : 'N/A'}
                                      </TableCell>
                                      <TableCell>{receipt.studentId || 'N/A'}</TableCell>
                                      <TableCell>{receipt.rollNumber || 'N/A'}</TableCell>
                                      <TableCell>{capitalizeFirstOnly(receipt.studentName || 'N/A')}</TableCell>
                                      <TableCell align="right">
                                        Rs. {(receipt.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </TableCell>
                                      <TableCell>
                                        {receipt.bankName || 'N/A'}
                                      </TableCell>
                                      <TableCell>
                                        {receipt.transactionId || 'N/A'}
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={receipt.status || 'completed'}
                                          size="small"
                                          color={
                                            receipt.status === 'completed' ? 'success' :
                                            receipt.status === 'pending' ? 'warning' :
                                            receipt.status === 'failed' || receipt.status === 'refunded' ? 'error' : 'default'
                                          }
                                          sx={{ opacity: 0.8 }}
                                        />
                                      </TableCell>
                                      <TableCell>{receipt.collectedBy?.name || 'N/A'}</TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                          <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePrintReceipt(receipt);
                                            }}
                                            title="Download Receipt"
                                          >
                                            <Print fontSize="small" />
                                          </IconButton>
                                          {receipt.status !== 'refunded' && (
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteReceipt(receipt._id, receipt.receiptNumber);
                                              }}
                                              title="Delete Receipt"
                                            >
                                              <Delete fontSize="small" />
                                            </IconButton>
                                          )}
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </React.Fragment>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                      {receipts.length > 0 && (
                        <TablePagination
                          component="div"
                          count={(() => {
                            const seenTids = new Set();
                            receipts.forEach(r => {
                              const tid = r.transactionId || `no-tid-${r._id}`;
                              seenTids.add(tid);
                            });
                            return seenTids.size;
                          })()}
                          page={pagination.receipt.page}
                          onPageChange={(e, newPage) => handleChangePage('receipt', e, newPage)}
                          rowsPerPage={pagination.receipt.rowsPerPage}
                          onRowsPerPageChange={(e) => handleChangeRowsPerPage('receipt', e)}
                          rowsPerPageOptions={[12, 25, 50, 100]}
                          labelRowsPerPage="Rows per page:"
                        />
                      )}
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
          </Box>
        )}

        {/* Tab Panel 7: Suspense */}
        {activeTab === 7 && (
          <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                SUSPENSE MANAGEMENT
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setSuspenseDialogOpen(true)}
                sx={{ bgcolor: '#667eea' }}
              >
                Add Suspense Entry
              </Button>
            </Box>

            <Tabs 
              value={suspenseSubTab} 
              onChange={handleSuspenseSubTabChange} 
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              <Tab label="Unidentified Payments" />
              <Tab label="Reconciled History" />
            </Tabs>

            {/* Suspense Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Filter by Date"
                  type="date"
                  value={suspenseFilters.date}
                  onChange={(e) => setSuspenseFilters({ ...suspenseFilters, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Filter by Amount"
                  type="number"
                  value={suspenseFilters.amount}
                  onChange={(e) => setSuspenseFilters({ ...suspenseFilters, amount: e.target.value })}
                  placeholder="Enter exact amount"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Filter by Transaction ID"
                  value={suspenseFilters.transactionId}
                  onChange={(e) => setSuspenseFilters({ ...suspenseFilters, transactionId: e.target.value })}
                  placeholder="Search TID..."
                />
              </Grid>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setSuspenseFilters({ date: '', amount: '', transactionId: '' })}
                  disabled={!suspenseFilters.date && !suspenseFilters.amount && !suspenseFilters.transactionId}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>

            {(() => {
              const filteredEntries = suspenseEntries.filter(entry => {
                // Date filter
                if (suspenseFilters.date) {
                  const entryDate = new Date(entry.paymentDate).toISOString().split('T')[0];
                  if (entryDate !== suspenseFilters.date) return false;
                }
                
                // Amount filter (exact match)
                if (suspenseFilters.amount && entry.amount.toString() !== suspenseFilters.amount) {
                  return false;
                }
                
                // Transaction ID filter (partial match)
                if (suspenseFilters.transactionId && !entry.transactionId?.toLowerCase().includes(suspenseFilters.transactionId.toLowerCase())) {
                  return false;
                }
                
                return true;
              });

              return (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Transaction ID</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Bank/Method</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                        {suspenseSubTab === 1 && (
                          <TableCell sx={{ fontWeight: 'bold' }}>Reconciled To</TableCell>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {suspenseLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center"><CircularProgress /></TableCell>
                        </TableRow>
                      ) : filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">No entries found</TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedData(filteredEntries, 'suspense').map((entry) => (
                          <TableRow key={entry._id}>
                            <TableCell>
                              {entry.status === 'unidentified' && (
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  onClick={() => {
                                    setSelectedSuspenseEntry(entry);
                                    setReconciliationDialogOpen(true);
                                  }}
                                >
                                  Reconcile
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>{new Date(entry.paymentDate).toLocaleDateString()}</TableCell>
                            <TableCell>Rs. {entry.amount.toLocaleString()}</TableCell>
                            <TableCell>{entry.transactionId || 'N/A'}</TableCell>
                            <TableCell>{entry.bankName || entry.paymentMethod}</TableCell>
                            <TableCell>{entry.remarks}</TableCell>
                            {suspenseSubTab === 1 && (
                              <TableCell>
                                {entry.reconciledData?.student?.firstName} {entry.reconciledData?.student?.lastName}
                                <Typography variant="caption" display="block">
                                  Receipt: {entry.reconciledData?.payment?.receiptNumber}
                                </Typography>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filteredEntries.length}
                    page={pagination.suspense.page}
                    onPageChange={(e, p) => handleChangePage('suspense', e, p)}
                    rowsPerPage={pagination.suspense.rowsPerPage}
                    onRowsPerPageChange={(e) => handleChangeRowsPerPage('suspense', e)}
                    rowsPerPageOptions={[12, 25, 50]}
                  />
                </TableContainer>
              );
            })()}
          </Box>
        )}

        {activeTab === 8 && (
          <ReportsTab />
        )}

        {/* Change Status Dialog */}
        <Dialog open={changeStatusDialog} onClose={() => setChangeStatusDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{feeStructureDialogMode === 'update' ? 'Update' : 'Assign'} Fee Structure</DialogTitle>
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
            <Button onClick={() => setChangeMonthlyFeeDialog(false)}>Close</Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#667eea' }}
              onClick={handleStatusUpdate}
              disabled={!changeStatusForm.reason || !changeStatusForm.status || loading}
            >
              {feeStructureDialogMode === 'update' ? 'Update' : 'Assign'} Fee Structure
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
              <Box id="voucher-print-area">
                {/* Print Styles */}
                <style>
                  {`
                    @media print {
                      body * {
                          visibility: hidden;
                      }
                      #voucher-print-area, #voucher-print-area * {
                        visibility: visible;
                      }
                      #voucher-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                      }
                      .no-print {
                        display: none !important;
                      }
                      @page {
                        size: landscape;
                        margin: 10mm;
                      }
                    }
                  `}
                </style>

                {/* Three-Column Voucher Layout */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2,
                  '@media print': {
                    gap: '10px'
                  }
                }}>
                  {['Parent\'s Copy', 'School\'s Copy', 'Bank\'s Copy'].map((copyType, copyIndex) => (
                    <Box 
                      key={copyIndex}
                      sx={{ 
                        flex: 1,
                        border: '2px solid #000',
                        p: 1.5,
                        fontSize: '0.75rem',
                        '@media print': {
                          fontSize: '9pt',
                          padding: '8px'
                        }
                      }}
                    >
                      {/* Header with Voucher Number and Copy Type */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #000',
                        pb: 0.5,
                        mb: 1
                      }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                          Voucher#: {voucherData.voucherNo}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {copyType}
                        </Typography>
                      </Box>

                      {/* Institution Logo and Name */}
                      <Box sx={{ textAlign: 'center', mb: 1 }}>
                        <Box
                          component="img"
                          src={
                            voucherData.institution?.logo 
                              ? (voucherData.institution.logo.startsWith('http') 
                                  ? voucherData.institution.logo 
                                  : `${API_URL.replace('/api/v1', '')}${voucherData.institution.logo}`)
                              : process.env.PUBLIC_URL + '/logo.png'
                          }
                          alt="Logo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: '1px solid #000',
                            objectFit: 'cover',
                            mx: 'auto',
                            display: 'block',
                            mb: 0.5
                          }}
                        />
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                          {voucherData.institution?.name || 'TIGES - River Bliss Campus'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
                          {voucherData.institution?.address?.city || 'Muzaffarabad'}
                        </Typography>
                      </Box>

                      {/* Voucher Details Table */}
                      <table style={{ width: '100%', border: '1px solid #000', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '0.65rem' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', width: '35%' }}>Voucher No:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }}>{voucherData.voucherNo}</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', width: '25%' }}>Roll No:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }}>{voucherData.rollNo}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Fee Month:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }}>{voucherData.feeMonth}</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Valid Date:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }}>{voucherData.validDate}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Issue Date:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }}>{voucherData.issueDate}</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Due Date:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }}>{voucherData.dueDate}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Student Details Table */}
                      <table style={{ width: '100%', border: '1px solid #000', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '0.65rem' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', width: '35%' }}>Student Id:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }} colSpan={3}>{voucherData.studentId}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Adm/Reg #:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }} colSpan={3}>{voucherData.admissionNo}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }} colSpan={4}>
                              {voucherData.name}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Class:</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px' }} colSpan={3}>{voucherData.class}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Fee Breakdown Table */}
                      <table style={{ width: '100%', border: '1px solid #000', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '0.65rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f0f0f0' }}>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', width: '10%' }}>Sr No.</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Head Name</td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', textAlign: 'right', width: '25%' }}>Amount</td>
                          </tr>
                        </thead>
                        <tbody>
                          {voucherData.feeHeads
                            .filter(h => h.amount > 0)
                            .map((head, idx) => (
                            <tr key={idx}>
                              <td style={{ border: '1px solid #000', padding: '2px 4px' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid #000', padding: '2px 4px' }}>{head.name}</td>
                              <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>
                                {head.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={2} style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                              Arrears:
                            </td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', textAlign: 'right' }}>
                              {(voucherData.arrears || 0).toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                              Payable within due date:
                            </td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', textAlign: 'right' }}>
                              {voucherData.payableWithinDueDate.toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                              Late fee fine:
                            </td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', textAlign: 'right' }}>
                              {(voucherData.lateFeeFine || 0).toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                              Absent Fine:
                            </td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', textAlign: 'right' }}>
                              0
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                              Payable after due date:
                            </td>
                            <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold', textAlign: 'right' }}>
                              {voucherData.payableAfterDueDate.toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Notes Section */}
                      <Box sx={{ mb: 1, fontSize: '0.55rem', lineHeight: 1.3 }}>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '0.6rem', mb: 0.5 }}>Note:</Typography>
                        <Typography sx={{ fontSize: '0.55rem', mb: 0.3 }}>Payment Terms</Typography>
                        <Typography sx={{ fontSize: '0.55rem', lineHeight: 1.2 }}>
                          A fine of Rs. 200 will be charged if the fee is not paid by the due date.
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', lineHeight: 1.2 }}>
                          A fine of Rs. 500 will be applicable if the payment remains unpaid in the following month.
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', lineHeight: 1.2 }}>
                          The fee may be deposited at any branch of Bank Islami using the prescribed challan form.
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', lineHeight: 1.2 }}>
                          Online payments can be made via Kuickpay. Please use the prefix 17340 followed by your challan number. (Transaction charges will apply.)
                        </Typography>
                      </Box>

                      {/* Bank Details */}
                      <Box sx={{ mb: 1, fontSize: '0.6rem', textAlign: 'center', fontWeight: 'bold' }}>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
                          Fee Payable At Any Branch of
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem' }}>
                          Bank Islami Pakistan Limited-310000223490001-The Integrity Global Education System
                        </Typography>
                      </Box>

                      {/* Barcode */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        <Box
                          sx={{
                            width: '100%',
                            height: '40px',
                            border: '1px solid #000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#fff'
                          }}
                        >
                          <Typography sx={{ fontSize: '0.6rem', color: '#666', fontFamily: 'monospace' }}>
                            |||||||||||||||||||||||||||
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setVoucherDialogOpen(false);
              setVoucherData(null);
              setSelectedVoucherStudent(null);
            }}>
              Close
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Print />} 
              sx={{ bgcolor: '#667eea' }}
              onClick={() => {
                window.print();
              }}
            >
              Print
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Receipt Print Dialog */}
        <Dialog
          open={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Fee Receipt
              </Typography>
              <IconButton onClick={() => setReceiptDialogOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {receiptLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : selectedReceiptData ? (
              <Box id="receipt-print-area">
                <style>
                  {`
                    @media print {
                      body * { visibility: hidden; }
                      #receipt-print-area, #receipt-print-area * { visibility: visible; }
                      #receipt-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                      }
                      @page {
                        size: portrait;
                        margin: 15mm;
                      }
                    }
                  `}
                </style>

                {/* Receipt Content */}
                <Box sx={{ p: 3, border: '1px solid #ddd', borderRadius: 2, bgcolor: '#fff' }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, borderBottom: '2px solid #667eea', pb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {selectedReceiptData.institution?.logo && (
                        <Box
                          component="img"
                          src={selectedReceiptData.institution.logo.startsWith('http') 
                            ? selectedReceiptData.institution.logo 
                            : `${API_URL.replace('/api/v1', '')}${selectedReceiptData.institution.logo}`}
                          sx={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      )}
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
                          {selectedReceiptData.institution?.name || 'SGC Education System'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {selectedReceiptData.institution?.address?.city || ''}, {selectedReceiptData.institution?.address?.state || ''}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Phone: {selectedReceiptData.institution?.phone || ''}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" sx={{ color: '#667eea', fontWeight: 'bold' }}>OFFICIAL RECEIPT</Typography>
                      <Typography variant="body2">Date: {new Date().toLocaleDateString('en-GB')}</Typography>
                      <Typography variant="body2"><b>Print Date:</b> {selectedReceiptData.printDate}</Typography>
                    </Box>
                  </Box>

                  {/* Student & Payment Info */}
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" sx={{ color: '#667eea', fontWeight: 'bold', mb: 1 }}>STUDENT INFORMATION</Typography>
                      <Typography variant="body2"><b>Name:</b> {capitalizeFirstOnly(selectedReceiptData.receipts[0]?.studentName || 'N/A')}</Typography>
                      <Typography variant="body2"><b>Student ID:</b> {selectedReceiptData.receipts[0]?.studentId || 'N/A'}</Typography>
                      <Typography variant="body2"><b>Roll #:</b> {selectedReceiptData.receipts[0]?.rollNumber || 'N/A'}</Typography>
                      <Typography variant="body2"><b>Class:</b> {selectedReceiptData.receipts[0]?.class || 'N/A'} - {selectedReceiptData.receipts[0]?.section || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle2" sx={{ color: '#667eea', fontWeight: 'bold', mb: 1 }}>PAYMENT DETAILS</Typography>
                      <Typography variant="body2"><b>Receipt #:</b> {selectedReceiptData.receipts.length > 1 ? `TRANS-${selectedReceiptData.receipts[0]?.transactionId}` : selectedReceiptData.receipts[0]?.receiptNumber}</Typography>
                      <Typography variant="body2"><b>Payment Date:</b> {selectedReceiptData.receipts[0]?.paymentDate ? new Date(selectedReceiptData.receipts[0].paymentDate).toLocaleDateString('en-GB') : 'N/A'}</Typography>
                      <Typography variant="body2"><b>Bank:</b> {selectedReceiptData.receipts[0]?.bankName || 'N/A'}</Typography>
                      <Typography variant="body2"><b>Transaction ID:</b> {selectedReceiptData.receipts[0]?.transactionId || 'N/A'}</Typography>
                    </Grid>
                  </Grid>

                  {/* Fee Breakdown Table */}
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', mb: 4 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8faff' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Fee Head</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Voucher #</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedReceiptData.receipts.map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{r.feeHead?.name || 'Fee Payment'}</TableCell>
                            <TableCell>{r.voucherNumber || 'N/A'}</TableCell>
                            <TableCell>{r.remarks || '-'}</TableCell>
                            <TableCell align="right">Rs. {(r.amount || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold', bgcolor: '#f8faff' }}>TOTAL PAID</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f8faff', color: '#667eea' }}>
                            Rs. {selectedReceiptData.receipts.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Footer */}
                  <Box sx={{ mt: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ textAlign: 'center', width: 200 }}>
                      <Box sx={{ borderBottom: '1px solid #333', mb: 1 }} />
                      <Typography variant="caption">Student/Parent Signature</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', width: 200 }}>
                      <Box sx={{ borderBottom: '1px solid #333', mb: 1 }} />
                      <Typography variant="caption">Authorized Signature</Typography>
                    </Box>
                  </Box>

                  <Typography variant="caption" sx={{ mt: 4, display: 'block', textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
                    This is a computer generated receipt and does not require a physical stamp.
                  </Typography>
                </Box>
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReceiptDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              startIcon={<Print />} 
              sx={{ bgcolor: '#667eea' }}
              onClick={() => window.print()}
            >
              Print / Save PDF
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
                {feeStructureDialogMode === 'update' ? 'Update' : 'Assign'} Fee Structure
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
                    onChange={(e) => handleClassSelectionChange(e.target.value)}
                    label="Class *"
                    disabled={fetchingFeeStructure}
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

              {/* Fee Structure Display */}
              {fetchingFeeStructure && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                </Grid>
              )}

              {selectedClassFeeStructure && selectedClassFeeStructure.feeStructures && selectedClassFeeStructure.feeStructures.length > 0 && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                      Fee Structure for {selectedClassFeeStructure.class.name}
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Fee Head</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Base Amount</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Discount</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Final Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedClassFeeStructure.feeStructures.map((fs) => {
                            const feeHeadDiscount = assignFeeStructureForm.feeHeadDiscounts[fs.feeHead._id] || {
                              discount: 0,
                              discountType: 'amount',
                              discountReason: ''
                            };
                            const finalAmount = calculateFinalAmount(fs.amount, parseFloat(feeHeadDiscount.discount) || 0, feeHeadDiscount.discountType);
                            
                            return (
                              <TableRow key={fs._id}>
                                <TableCell>{fs.feeHead.name}</TableCell>
                                <TableCell align="right">Rs. {fs.amount.toLocaleString()}</TableCell>
                                <TableCell align="right">
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={feeHeadDiscount.discount || 0}
                                    onChange={(e) => handleFeeHeadDiscountChange(fs.feeHead._id, 'discount', e.target.value)}
                                    InputProps={{
                                      inputProps: { min: 0, step: 0.01 },
                                      sx: { width: '100px' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <FormControl size="small" sx={{ minWidth: 100 }}>
                                    <Select
                                      value={feeHeadDiscount.discountType || 'amount'}
                                      onChange={(e) => handleFeeHeadDiscountChange(fs.feeHead._id, 'discountType', e.target.value)}
                                    >
                                      <MenuItem value="amount">Amount</MenuItem>
                                      <MenuItem value="percentage">%</MenuItem>
                                    </Select>
                                  </FormControl>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: finalAmount < fs.amount ? 'success.main' : 'inherit' }}>
                                  Rs. {finalAmount.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {/* Discount Reason for each fee head */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Discount Reasons (Optional)
                      </Typography>
                      {selectedClassFeeStructure.feeStructures.map((fs) => {
                        const feeHeadDiscount = assignFeeStructureForm.feeHeadDiscounts[fs.feeHead._id] || {
                          discount: 0,
                          discountType: 'amount',
                          discountReason: ''
                        };
                        const hasDiscount = parseFloat(feeHeadDiscount.discount) > 0;
                        
                        return (
                          <Box key={`reason-${fs._id}`} sx={{ mb: 1, display: hasDiscount ? 'block' : 'none' }}>
                            <TextField
                              fullWidth
                              size="small"
                              label={`Reason for ${fs.feeHead.name} discount`}
                              value={feeHeadDiscount.discountReason || ''}
                              onChange={(e) => handleFeeHeadDiscountChange(fs.feeHead._id, 'discountReason', e.target.value)}
                              placeholder="Enter discount reason (optional)"
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Grid>
              )}

              {selectedClassFeeStructure && selectedClassFeeStructure.feeStructures && selectedClassFeeStructure.feeStructures.length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">No fee structure found for this class. Please create fee structure first.</Alert>
                </Grid>
              )}

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

        {/* Fee Head Selection Dialog for Generate Voucher */}
        <Dialog
          open={feeHeadSelectionDialogOpen}
          onClose={handleCloseFeeHeadSelectionDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Select Fee Heads for Voucher Generation
              </Typography>
              <IconButton onClick={handleCloseFeeHeadSelectionDialog} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Selected Students: {selectedGenerateVoucherStudents.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Month/Year: {generateVoucherFilters.monthYear}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={voucherDueDate}
                onChange={(e) => setVoucherDueDate(e.target.value)}
                helperText="Select the due date for voucher payment (month, year, and day)"
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Fee Heads ({selectedFeeHeadIds.length} of {feeHeads.length} selected)
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAllFeeHeads}
                variant="outlined"
              >
                {selectedFeeHeadIds.length === feeHeads.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>
            {feeHeadsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : feeHeads.length === 0 ? (
              <Alert severity="info">No fee heads found. Please create fee heads first.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', width: '100%' }}>
                <Table size="small" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedFeeHeadIds.length === feeHeads.length && feeHeads.length > 0}
                          indeterminate={selectedFeeHeadIds.length > 0 && selectedFeeHeadIds.length < feeHeads.length}
                          onChange={handleSelectAllFeeHeads}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Fee Head Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Frequency</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getPaginatedData(
                      feeHeads.sort((a, b) => (a.priority || 0) - (b.priority || 0)),
                      'feeHeadSelection'
                    ).map((feeHead) => (
                        <TableRow key={feeHead._id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedFeeHeadIds.includes(feeHead._id)}
                              onChange={() => handleFeeHeadToggle(feeHead._id)}
                            />
                          </TableCell>
                          <TableCell>{feeHead.name}</TableCell>
                          <TableCell align="right">
                            {loadingFeeHeadAmounts ? (
                              <CircularProgress size={16} />
                            ) : feeHeadAmounts[feeHead._id] !== undefined ? (
                              `Rs. ${feeHeadAmounts[feeHead._id].toLocaleString()}`
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell align="right">{feeHead.priority || 'N/A'}</TableCell>
                          <TableCell>{feeHead.frequencyType || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {feeHeads.length > 0 && (
                  <TablePagination
                    component="div"
                    count={feeHeads.length}
                    page={pagination.feeHeadSelection.page}
                    onPageChange={(e, newPage) => handleChangePage('feeHeadSelection', e, newPage)}
                    rowsPerPage={pagination.feeHeadSelection.rowsPerPage}
                    onRowsPerPageChange={(e) => handleChangeRowsPerPage('feeHeadSelection', e)}
                    rowsPerPageOptions={[12, 25, 50, 100]}
                    labelRowsPerPage="Rows per page:"
                  />
                )}
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFeeHeadSelectionDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGenerateVouchersConfirm}
              disabled={generateVoucherLoading || selectedFeeHeadIds.length === 0}
              sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5568d3' } }}
            >
              {generateVoucherLoading ? <CircularProgress size={24} /> : 'Generate Vouchers'}
            </Button>
          </DialogActions>
        </Dialog>
        {/* Suspense Entry Dialog */}
        <Dialog open={suspenseDialogOpen} onClose={() => setSuspenseDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Suspense Entry</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={suspenseFormData.amount}
                  onChange={(e) => setSuspenseFormData({ ...suspenseFormData, amount: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Payment Date"
                  type="date"
                  value={suspenseFormData.paymentDate}
                  onChange={(e) => setSuspenseFormData({ ...suspenseFormData, paymentDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Transaction ID"
                  value={suspenseFormData.transactionId}
                  onChange={(e) => setSuspenseFormData({ ...suspenseFormData, transactionId: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Bank Name"
                  value={suspenseFormData.bankName}
                  onChange={(e) => setSuspenseFormData({ ...suspenseFormData, bankName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks"
                  multiline
                  rows={2}
                  value={suspenseFormData.remarks}
                  onChange={(e) => setSuspenseFormData({ ...suspenseFormData, remarks: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuspenseDialogOpen(false)}>Cancel</Button>
            <Button 
                variant="contained" 
                onClick={handleSuspenseSave} 
                disabled={savingSuspense || !suspenseFormData.amount}
                sx={{ bgcolor: '#667eea' }}
            >
              {savingSuspense ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reconciliation Dialog */}
        <Dialog open={reconciliationDialogOpen} onClose={resetReconciliationDialog} maxWidth="md" fullWidth>
          <DialogTitle>Reconcile Payment: Rs. {selectedSuspenseEntry?.amount.toLocaleString()}</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, mt: 1 }}>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <TextField 
                    fullWidth size="small" label="Name" 
                    value={reconciliationSearch.studentName}
                    onChange={(e) => setReconciliationSearch({ ...reconciliationSearch, studentName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField 
                    fullWidth size="small" label="Roll #" 
                    value={reconciliationSearch.rollNumber}
                    onChange={(e) => setReconciliationSearch({ ...reconciliationSearch, rollNumber: e.target.value })}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Button variant="contained" fullWidth onClick={fetchReconciliationStudents} disabled={searchingReconciliationStudents}>
                    Search
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {reconciliationStudents.length > 0 && !selectedReconciliationStudent && (
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableBody>
                    {reconciliationStudents.filter((s) => {
                      const nameMatch = !reconciliationSearch.studentName || 
                        s.name?.toLowerCase().includes(reconciliationSearch.studentName.toLowerCase());
                      const rollMatch = !reconciliationSearch.rollNumber || 
                        s.rollNumber?.toLowerCase().includes(reconciliationSearch.rollNumber.toLowerCase());
                      return nameMatch && rollMatch;
                    }).map((s) => (
                      <TableRow key={s._id} hover onClick={() => {
                          setSelectedReconciliationStudent(s);
                          const studentId = s.studentId?._id || s.studentId;
                          if (studentId) fetchOutstandingFees(studentId);
                      }} sx={{ cursor: 'pointer' }}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.rollNumber}</TableCell>
                        <TableCell>{s.class}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {selectedReconciliationStudent && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Outstanding Fees for {selectedReconciliationStudent.name}
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Voucher #</TableCell>
                        <TableCell>Fee Head</TableCell>
                        <TableCell>Remaining</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingOutstandingFees ? (
                        <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                      ) : outstandingFees.length === 0 ? (
                        <TableRow><TableCell colSpan={4} align="center">No outstanding fees</TableCell></TableRow>
                      ) : (
                        outstandingFees.map((fee) => (
                          <TableRow key={fee._id}>
                            <TableCell>{fee.vouchers?.[0]?.voucherNumber}</TableCell>
                            <TableCell>{fee.feeHead?.name}</TableCell>
                            <TableCell>Rs. {(fee.remainingAmount || (fee.finalAmount - (fee.paidAmount || 0))).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button 
                                variant="contained" 
                                color="success" 
                                size="small"
                                onClick={() => handleReconcile(selectedReconciliationStudent.studentId?._id || selectedReconciliationStudent.studentId, fee._id)}
                                disabled={reconciling}
                              >
                                Apply Fund
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={resetReconciliationDialog}>Cancel</Button>
          </DialogActions>
        </Dialog>
        </Paper>
      </Box>
    </Box>
  );
};

export default FeeManagement;
