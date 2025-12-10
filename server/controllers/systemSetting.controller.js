const systemSettingService = require('../services/systemSetting.service');
const { asyncHandler } = require('../middleware/error.middleware');

const getAllSettings = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const includePrivate = req.user.role === 'super_admin';

  const settings = await systemSettingService.getAllSettings(category, includePrivate);

  res.json({
    success: true,
    count: settings.length,
    data: settings
  });
});

const getSettingsByCategory = asyncHandler(async (req, res) => {
  const settings = await systemSettingService.getSettingsByCategory();

  res.json({
    success: true,
    data: settings
  });
});

const getSetting = asyncHandler(async (req, res) => {
  const setting = await systemSettingService.getSetting(req.params.key);

  res.json({
    success: true,
    data: setting
  });
});

const createSetting = asyncHandler(async (req, res) => {
  const setting = await systemSettingService.createSetting(req.body, req.user);

  res.status(201).json({
    success: true,
    message: 'Setting created successfully',
    data: setting
  });
});

const updateSetting = asyncHandler(async (req, res) => {
  const setting = await systemSettingService.updateSetting(req.params.key, req.body.value, req.user);

  res.json({
    success: true,
    message: 'Setting updated successfully',
    data: setting
  });
});

const updateMultipleSettings = asyncHandler(async (req, res) => {
  const results = await systemSettingService.updateMultipleSettings(req.body.settings, req.user);

  res.json({
    success: true,
    message: 'Settings updated',
    data: results
  });
});

const deleteSetting = asyncHandler(async (req, res) => {
  const result = await systemSettingService.deleteSetting(req.params.key, req.user);

  res.json({
    success: true,
    ...result
  });
});

const initializeDefaults = asyncHandler(async (req, res) => {
  const results = await systemSettingService.initializeDefaultSettings();

  res.json({
    success: true,
    message: `Initialized ${results.length} default settings`,
    data: results
  });
});

module.exports = {
  getAllSettings,
  getSettingsByCategory,
  getSetting,
  createSetting,
  updateSetting,
  updateMultipleSettings,
  deleteSetting,
  initializeDefaults
};
