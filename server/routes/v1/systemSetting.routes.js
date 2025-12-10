const express = require('express');
const router = express.Router();
const systemSettingController = require('../../controllers/systemSetting.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin } = require('../../middleware/rbac.middleware');

router.use(authenticate);

// Public routes (authenticated users)
router.get('/', systemSettingController.getAllSettings);
router.get('/by-category', systemSettingController.getSettingsByCategory);
router.get('/:key', systemSettingController.getSetting);

// Super Admin only routes
router.post('/', isSuperAdmin, systemSettingController.createSetting);
router.put('/:key', isSuperAdmin, systemSettingController.updateSetting);
router.put('/', isSuperAdmin, systemSettingController.updateMultipleSettings);
router.delete('/:key', isSuperAdmin, systemSettingController.deleteSetting);
router.post('/initialize', isSuperAdmin, systemSettingController.initializeDefaults);

module.exports = router;
