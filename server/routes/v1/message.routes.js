const express = require('express');
const router = express.Router();
const messageController = require('../../controllers/message.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { isSuperAdmin } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(isSuperAdmin);

router.get('/', messageController.getMessages);
router.get('/templates', messageController.getTemplates);
router.get('/:id', messageController.getMessageById);
router.post('/', messageController.createMessage);
router.put('/:id', messageController.updateMessage);
router.post('/:id/send', messageController.sendMessage);
router.delete('/:id', messageController.deleteMessage);

module.exports = router;
