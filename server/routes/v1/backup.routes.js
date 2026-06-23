const express = require('express');
const router = express.Router();
const backupController = require('../../controllers/backup.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/rbac.middleware');
const { PERMISSIONS } = require('../../utils/constants');
const multer = require('multer');

/**
 * Backup Routes - API v1
 * Base path: /api/v1/backups
 * All routes require System Manage access
 */

// Use memory storage for backup restore
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(hasPermission(PERMISSIONS.SYSTEM.MANAGE));

// Download backup as ZIP
router.post('/download', backupController.downloadBackup);

// Restore backup from ZIP
router.post('/restore', upload.single('file'), backupController.restoreBackup);

// Get backup history
router.get('/history', backupController.getBackupHistory);

// Delete a backup log
router.delete('/:id', backupController.deleteBackupLog);

module.exports = router;
