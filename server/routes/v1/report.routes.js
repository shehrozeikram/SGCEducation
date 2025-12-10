const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/report.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', reportController.getReports);
router.post('/', reportController.createReport);
router.get('/:id/generate', reportController.generateReport);
router.delete('/:id', reportController.deleteReport);

module.exports = router;
