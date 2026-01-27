import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemIcon
} from '@mui/material';
import { CloudUpload, CheckCircle, Error as ErrorIcon, ArrowBack } from '@mui/icons-material';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import { useNavigate } from 'react-router-dom';

const ImportStudents = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file type
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(getApiUrl('admissions/import'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setResult(response.data.data);
      setFile(null);
      // Reset file input
      document.getElementById('file-upload').value = '';
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Failed to import students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f2f5', pb: 4, mt: '64px' }}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 4,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            mb: 3
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Button 
                startIcon={<ArrowBack />} 
                onClick={() => navigate('/admissions')}
                sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
            >
                Back to Admissions
            </Button>
            <Typography variant="h4" fontWeight="bold">
              Import Students
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Upload an Excel file (.xlsx) to bulk import student admissions.
          </Typography>
        </Paper>

        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box 
            sx={{ 
              border: '2px dashed #ccc', 
              borderRadius: 2, 
              p: 6, 
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: '#fafafa',
              '&:hover': { bgcolor: '#f0f0f0', borderColor: '#667eea' }
            }}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <input
              accept=".xlsx, .xls"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileChange}
            />
            <CloudUpload sx={{ fontSize: 60, color: '#667eea', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              {file ? file.name : 'Click to select or drag and drop Excel file'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Supported formats: .xlsx, .xls
            </Typography>
          </Box>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              size="large"
              onClick={handleUpload}
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
              sx={{ minWidth: 150 }}
            >
              {loading ? 'Importing...' : 'Start Import'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          {result && (
            <Box mt={4}>
              <Alert 
                severity={result.errorCount > 0 ? "warning" : "success"}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  Import Completed
                </Typography>
                <Typography variant="body2">
                  Successfully imported: {result.successCount}
                </Typography>
                {result.errorCount > 0 && (
                  <Typography variant="body2">
                    Failed records: {result.errorCount}
                  </Typography>
                )}
              </Alert>

              {result.errors.length > 0 && (
                <Box mt={2}>
                  <Typography variant="h6" gutterBottom color="error">
                    Error Details
                  </Typography>
                  <List sx={{ bgcolor: '#fff0f0', borderRadius: 2 }}>
                    {result.errors.map((err, index) => (
                      <React.Fragment key={index}>
                        <ListItem alignItems="flex-start">
                          <ListItemIcon>
                            <ErrorIcon color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`Row ${err.row}: ${err.name}`}
                            secondary={err.error}
                            primaryTypographyProps={{ fontWeight: 'medium' }}
                          />
                        </ListItem>
                        {index < result.errors.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </Paper>
        
        <Box mt={3}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Expected Columns:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                    Student Name, Father Name, Date Of Birth, Class Name, Section Name, Mobile Number, Guardian CNIC, Admission Number, Roll Number, Student Status...
                </Typography>
            </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default ImportStudents;
