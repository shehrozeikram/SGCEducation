import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import TopBar from '../components/layout/TopBar';

const GroupForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  // Extract institution ID if it's an object
  const getUserInstitutionId = () => {
    if (!user.institution) return '';
    return typeof user.institution === 'object' ? user.institution._id : user.institution;
  };

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Study',
    institution: getUserInstitutionId(),
    department: '',
    class: '',
    section: '',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    description: '',
    capacity: 10,
    leader: {
      userId: '',
      name: '',
      email: ''
    },
    supervisor: {
      userId: '',
      name: '',
      email: ''
    },
    members: []
  });

  useEffect(() => {
    // try to set institution from selectedInstitution if missing
    if (!formData.institution) {
      const stored = localStorage.getItem('selectedInstitution');
      if (stored) {
        try {
          const inst = JSON.parse(stored);
          setFormData((prev) => ({ ...prev, institution: inst._id || inst }));
        } catch (e) {
          console.error('Failed to parse institution', e);
        }
      }
    }
    fetchDepartments();
    if (isEditMode) {
      fetchGroup();
    }
  }, [id, formData.institution]);

  const fetchDepartments = async () => {
    if (!formData.institution) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/v1/departments?institution=${formData.institution}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const depts = response.data.data || [];
      setDepartments(depts);
      if (!formData.department && depts.length > 0) {
        setFormData((prev) => ({ ...prev, department: depts[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
    }
  };

  const fetchGroup = async () => {
    try {
      setFetchLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/v1/groups/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const group = response.data.data;
      setFormData({
        name: group.name,
        code: group.code,
        type: group.type,
        institution: group.institution._id,
        department: group.department._id,
        class: group.class?._id || '',
        section: group.section?._id || '',
        academicYear: group.academicYear,
        description: group.description || '',
        capacity: group.capacity || 10,
        leader: {
          userId: group.leader?.userId?._id || '',
          name: group.leader?.name || '',
          email: group.leader?.email || ''
        },
        supervisor: {
          userId: group.supervisor?.userId?._id || '',
          name: group.supervisor?.name || '',
          email: group.supervisor?.email || ''
        },
        members: group.members || []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch group');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const generateCode = (name) => {
    if (!name) return '';
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 12);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');

      // Build minimal payload and strip empty optional refs to avoid ObjectId cast errors
      const payload = {
        name: formData.name,
        code: formData.code || generateCode(formData.name),
        institution: formData.institution,
        department: formData.department,
        academicYear: formData.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        type: formData.type || 'Study',
        capacity: formData.capacity || 10,
      };

      if (formData.class) payload.class = formData.class;
      if (formData.section) payload.section = formData.section;
      if (formData.description) payload.description = formData.description;

      // Leader (optional)
      const leader = formData.leader || {};
      if (leader.userId || leader.name || leader.email) {
        const cleanLeader = { ...leader };
        if (!cleanLeader.userId) delete cleanLeader.userId;
        payload.leader = cleanLeader;
      }

      // Supervisor (optional)
      const supervisor = formData.supervisor || {};
      if (supervisor.userId || supervisor.name || supervisor.email) {
        const cleanSupervisor = { ...supervisor };
        if (!cleanSupervisor.userId) delete cleanSupervisor.userId;
        payload.supervisor = cleanSupervisor;
      }

      // Members (optional) - include only non-empty entries
      const cleanMembers = (formData.members || []).filter(
        (m) => m.userId || m.name || m.email
      ).map((m) => {
        const copy = { ...m };
        if (!copy.userId) delete copy.userId;
        return copy;
      });
      if (cleanMembers.length) {
        payload.members = cleanMembers;
      }

      if (!payload.institution) {
        setError('Institution not set. Please contact administrator.');
        setLoading(false);
        return;
      }

      if (!payload.department && departments.length > 0) {
        payload.department = departments[0]._id;
      }

      if (isEditMode) {
        await axios.put(
          `http://localhost:5000/api/v1/groups/${id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Group updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/v1/groups',
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSuccess('Group created successfully!');
      }

      setTimeout(() => {
        navigate('/groups');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Box>
        <TopBar title={isEditMode ? 'Edit Group' : 'Add New Group'} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 4 }}>
      <TopBar title={isEditMode ? 'Edit Group' : 'Add New Group'} />
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/groups')}
              sx={{ mr: 2 }}
            >
              Back
            </Button>
            <Typography variant="h4" fontWeight="bold">
              {isEditMode ? 'Edit Group' : 'Add New Group'}
            </Typography>
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
            <TextField
              fullWidth
              required
              label="Group Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Group Name"
              sx={{ mb: 3 }}
            />

            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate('/groups')}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Save'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default GroupForm;

