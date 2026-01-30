import axios from 'axios';
import { getApiUrl } from '../config/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

/**
 * Admission Service - API calls for admission management
 */

// Get all admissions
export const getAllAdmissions = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.institution) params.append('institution', filters.institution);
  if (filters.status) params.append('status', filters.status);
  if (filters.department) params.append('department', filters.department);
  if (filters.academicYear) params.append('academicYear', filters.academicYear);
  if (filters.search) params.append('search', filters.search);

  const response = await axios.get(`${getApiUrl('admissions')}?${params.toString()}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Get admission by ID
export const getAdmissionById = async (id) => {
  const response = await axios.get(getApiUrl(`admissions/${id}`), {
    headers: getAuthHeader()
  });
  return response.data;
};

// Create admission
export const createAdmission = async (admissionData) => {
  const response = await axios.post(getApiUrl('admissions'), admissionData, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Update admission
export const updateAdmission = async (id, admissionData) => {
  const response = await axios.put(getApiUrl(`admissions/${id}`), admissionData, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Update admission status
export const updateAdmissionStatus = async (id, status, remarks) => {
  const response = await axios.put(
    getApiUrl(`admissions/${id}/status`),
    { status, remarks },
    { headers: getAuthHeader() }
  );
  return response.data;
};

// Approve and enroll admission
export const approveAndEnroll = async (id) => {
  const response = await axios.post(
    getApiUrl(`admissions/${id}/approve-enroll`),
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

// Reject admission
export const rejectAdmission = async (id, remarks) => {
  const response = await axios.put(
    getApiUrl(`admissions/${id}/reject`),
    { remarks },
    { headers: getAuthHeader() }
  );
  return response.data;
};

// Delete admission
export const deleteAdmission = async (id) => {
  const response = await axios.delete(getApiUrl(`admissions/${id}`), {
    headers: getAuthHeader()
  });
  return response.data;
};

// Get admission statistics
export const getAdmissionStats = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.institution) params.append('institution', filters.institution);
  if (filters.academicYear) params.append('academicYear', filters.academicYear);

  const response = await axios.get(`${getApiUrl('admissions/stats/overview')}?${params.toString()}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Get admissions by department
export const getAdmissionsByDepartment = async (departmentId) => {
  const response = await axios.get(getApiUrl(`departments/${departmentId}/admissions`), {
    headers: getAuthHeader()
  });
  return response.data;
};

// Get admission analytics for charts
export const getAdmissionAnalytics = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.institution) params.append('institution', filters.institution);
  if (filters.academicYear) params.append('academicYear', filters.academicYear);
  if (filters.days) params.append('days', filters.days);

  const response = await axios.get(`${getApiUrl('admissions/analytics/charts')}?${params.toString()}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Get next available roll number
export const getNextRollNumber = async (institutionId) => {
  const params = new URLSearchParams();
  if (institutionId) params.append('institution', institutionId);

  const response = await axios.get(`${getApiUrl('admissions/next-roll-number')}?${params.toString()}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Bulk soft delete admissions
export const bulkSoftDeleteAdmissions = async (admissionIds) => {
  const response = await axios.post(
    getApiUrl('admissions/bulk-soft-delete'),
    { admissionIds },
    { headers: getAuthHeader() }
  );
  return response.data;
};

// Restore admissions
export const restoreAdmissions = async (admissionIds) => {
  const response = await axios.post(
    getApiUrl('admissions/restore'),
    { admissionIds },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export default {
  getAllAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  updateAdmissionStatus,
  approveAndEnroll,
  rejectAdmission,
  deleteAdmission,
  getAdmissionStats,
  getAdmissionsByDepartment,
  getAdmissionAnalytics,
  getNextRollNumber,
  bulkSoftDeleteAdmissions,
  restoreAdmissions
};
