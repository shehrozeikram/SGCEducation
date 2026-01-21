import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Grid,
  Alert,
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

const API_URL = getApiBaseUrl();

const Settings = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);

  const categoryLabels = {
    general: 'General',
    email: 'Email',
    branding: 'Branding',
    features: 'Features',
    security: 'Security',
    api: 'API',
    backup: 'Backup'
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/settings/by-category`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data.data);
      setCategories(Object.keys(response.data.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/settings/${key}`,
        { value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update setting');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const updates = [];

      Object.values(settings).forEach(categorySettings => {
        categorySettings.forEach(setting => {
          updates.push({ key: setting.key, value: setting.value });
        });
      });

      await axios.put(
        `${API_URL}/settings`,
        { settings: updates },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: prev[category].map(setting =>
        setting.key === key ? { ...setting, value } : setting
      )
    }));
  };

  const renderSettingInput = (category, setting) => {
    if (!setting.isEditable) {
      return (
        <TextField
          fullWidth
          label={setting.key.replace(/_/g, ' ').toUpperCase()}
          value={setting.value}
          disabled
          size="small"
        />
      );
    }

    switch (setting.dataType) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={setting.value}
                onChange={(e) => handleSettingChange(category, setting.key, e.target.checked)}
              />
            }
            label={setting.key.replace(/_/g, ' ').toUpperCase()}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={setting.key.replace(/_/g, ' ').toUpperCase()}
            value={setting.value}
            onChange={(e) => handleSettingChange(category, setting.key, Number(e.target.value))}
            size="small"
          />
        );

      case 'object':
      case 'array':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={setting.key.replace(/_/g, ' ').toUpperCase()}
            value={JSON.stringify(setting.value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleSettingChange(category, setting.key, parsed);
              } catch (err) {
                // Invalid JSON, don't update
              }
            }}
            size="small"
          />
        );

      default:
        return (
          <TextField
            fullWidth
            label={setting.key.replace(/_/g, ' ').toUpperCase()}
            value={setting.value}
            onChange={(e) => handleSettingChange(category, setting.key, e.target.value)}
            size="small"
          />
        );
    }
  };

  const renderCategorySettings = (category) => {
    const categorySettings = settings[category] || [];

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            {categoryLabels[category] || category} Settings
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {categorySettings.map((setting) => (
            <Grid item xs={12} sm={6} key={setting.key}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    {setting.key.replace(/_/g, ' ').toUpperCase()}
                  </Typography>
                  {!setting.isEditable && (
                    <Chip label="Read Only" size="small" color="default" />
                  )}
                  {!setting.isPublic && (
                    <Chip label="Private" size="small" color="warning" />
                  )}
                </Box>
                {setting.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    {setting.description}
                  </Typography>
                )}
                {renderSettingInput(category, setting)}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {categorySettings.length === 0 && (
          <Alert severity="info">No settings available in this category</Alert>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          System Settings
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSettings}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
          >
            Save All
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map((category, index) => (
            <Tab key={category} label={categoryLabels[category] || category} />
          ))}
        </Tabs>
        <Divider />
        <Box sx={{ p: 3 }}>
          {categories.length > 0 && renderCategorySettings(categories[currentTab])}
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;
