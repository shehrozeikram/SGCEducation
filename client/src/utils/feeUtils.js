/**
 * Fee Management Utility Functions
 * Centralized utilities to eliminate duplicate code in FeeManagement component
 */

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Get institution ID from user context
 * @param {Object} user - Current user object
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {string|null} Institution ID
 */
export const getInstitutionId = (user, isSuperAdmin) => {
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

/**
 * Parse month/year string to month and year numbers
 * Handles both "YYYY-MM" and "M-YYYY" formats
 * @param {string} monthYear - Month/year string
 * @returns {{month: number, year: number}} Parsed month and year
 */
export const parseMonthYear = (monthYear) => {
  if (!monthYear) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  const parts = monthYear.split('-');
  if (parts.length !== 2) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  // Check if first part is 4 digits (YYYY-MM format)
  if (parts[0].length === 4) {
    return {
      month: parseInt(parts[1], 10),
      year: parseInt(parts[0], 10)
    };
  } else {
    // M-YYYY format
    return {
      month: parseInt(parts[0], 10),
      year: parseInt(parts[1], 10)
    };
  }
};

/**
 * Format month/year for display
 * @param {number} month - Month number (1-12)
 * @param {number} year - Year number
 * @returns {string} Formatted string (e.g., "Jan 2024")
 */
export const formatMonthYear = (month, year) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[(month || 1) - 1] || month} ${year}`;
};

/**
 * Calculate academic year from month/year
 * @param {number} month - Month number
 * @param {number} year - Year number
 * @returns {string} Academic year string (e.g., "2024-2025")
 */
export const calculateAcademicYear = (month, year) => {
  // Academic year typically starts in April (month 4)
  // If month is before April, academic year is previous year-current year
  // If month is April or after, academic year is current year-next year
  if (month < 4) {
    return `${year - 1}-${year}`;
  } else {
    return `${year}-${year + 1}`;
  }
};

/**
 * Extract student name from admission or student object
 * @param {Object} admission - Admission object
 * @param {Object} student - Student object
 * @returns {string} Student name or 'N/A'
 */
export const getStudentName = (admission, student) => {
  if (admission?.personalInfo?.name) {
    return admission.personalInfo.name;
  }
  if (student?.user?.name) {
    return student.user.name;
  }
  if (admission?.personalInfo?.firstName) {
    const lastName = admission.personalInfo.lastName || '';
    return `${admission.personalInfo.firstName} ${lastName}`.trim();
  }
  return 'N/A';
};

/**
 * Extract student ID from various sources
 * @param {Object} admission - Admission object
 * @param {Object} student - Student object
 * @returns {string} Student ID or 'N/A'
 */
export const getStudentId = (admission, student) => {
  return student?.enrollmentNumber || 
         student?.rollNumber || 
         admission?.applicationNumber || 
         admission?.studentId?.enrollmentNumber || 
         'N/A';
};

/**
 * Extract roll number from various sources
 * @param {Object} admission - Admission object
 * @param {Object} student - Student object
 * @returns {string} Roll number or 'N/A'
 */
export const getRollNumber = (admission, student) => {
  return admission?.rollNumber || 
         student?.rollNumber || 
         admission?.studentId?.rollNumber || 
         'N/A';
};

/**
 * Transform student/admission data to consistent format
 * @param {Object} data - Admission or student data
 * @param {Object} options - Transformation options
 * @returns {Object} Transformed student data
 */
export const transformStudentData = (data, options = {}) => {
  const admission = data.admission || data;
  const student = data.student || admission?.studentId;
  
  return {
    _id: admission?._id || student?._id || data._id,
    studentId: student?._id || student || admission?.studentId?._id || admission?.studentId,
    id: getStudentId(admission, student),
    rollNumber: getRollNumber(admission, student),
    name: getStudentName(admission, student),
    fatherName: admission?.guardianInfo?.fatherName || admission?.personalInfo?.fatherName || 'N/A',
    class: admission?.class?.name || student?.class?.name || 'N/A',
    section: admission?.section?.name || student?.section?.name || 'N/A',
    status: student?.status || admission?.status || 'pending',
    admissionNo: admission?.applicationNumber || 'N/A',
    admissionDate: admission?.admissionDate 
      ? new Date(admission.admissionDate).toLocaleDateString() 
      : (admission?.createdAt ? new Date(admission.createdAt).toLocaleDateString() : 'N/A'),
    admissionEffectiveDate: admission?.effectiveDate 
      ? new Date(admission.effectiveDate).toLocaleDateString() 
      : (admission?.createdAt ? new Date(admission.createdAt).toLocaleDateString() : 'N/A'),
    mobileNumber: admission?.contactInfo?.phone || 
                  admission?.contactInfo?.mobileNumber || 
                  admission?.personalInfo?.phone || 
                  'N/A',
    ...options.additionalFields
  };
};

/**
 * Create axios request config with auth token
 * @param {Object} options - Request options
 * @returns {Object} Axios config object
 */
export const createAxiosConfig = (options = {}) => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    },
    ...options
  };
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    locale = 'en-US'
  } = options;
  
  return `Rs. ${(amount || 0).toLocaleString(locale, { 
    minimumFractionDigits, 
    maximumFractionDigits 
  })}`;
};

/**
 * Validate voucher number format
 * @param {string} voucherNumber - Voucher number to validate
 * @returns {boolean} True if valid format
 */
export const isValidVoucherNumber = (voucherNumber) => {
  if (!voucherNumber) return false;
  // Format: VCH-YYYY-MM-SEQ or RCP-YYYY-SEQ
  const patterns = [
    /^VCH-\d{4}-\d{2}-\d{6}$/,
    /^RCP-\d{4}-\d{6}$/
  ];
  return patterns.some(pattern => pattern.test(voucherNumber));
};

/**
 * Compare voucher month/year
 * @param {Object} voucher - Voucher object
 * @param {number} month - Month to compare
 * @param {number} year - Year to compare
 * @returns {boolean} True if voucher matches month/year
 */
export const matchesVoucherMonthYear = (voucher, month, year) => {
  if (!voucher || voucher.month === undefined || voucher.year === undefined) {
    return false;
  }
  const vMonth = typeof voucher.month === 'string' ? parseInt(voucher.month, 10) : Number(voucher.month);
  const vYear = typeof voucher.year === 'string' ? parseInt(voucher.year, 10) : Number(voucher.year);
  return vMonth === Number(month) && vYear === Number(year);
};

