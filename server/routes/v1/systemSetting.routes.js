const express = require('express');
const router = express.Router();
const systemSettingController = require('../../controllers/systemSetting.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');

router.use(authenticate);

// Public routes (authenticated users)
router.get('/', systemSettingController.getAllSettings);
router.get('/by-category', systemSettingController.getSettingsByCategory);
router.get('/:key', systemSettingController.getSetting);

// Super Admin / System manage routes
router.post('/', hasPermission(PERMISSIONS.SYSTEM.MANAGE), systemSettingController.createSetting);
router.put('/:key', hasPermission(PERMISSIONS.SYSTEM.MANAGE), systemSettingController.updateSetting);
router.put('/', hasPermission(PERMISSIONS.SYSTEM.MANAGE), systemSettingController.updateMultipleSettings);
router.delete('/:key', hasPermission(PERMISSIONS.SYSTEM.MANAGE), systemSettingController.deleteSetting);
router.post('/initialize', hasPermission(PERMISSIONS.SYSTEM.MANAGE), systemSettingController.initializeDefaults);

module.exports = router;
