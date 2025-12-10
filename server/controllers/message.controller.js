const messageService = require('../services/message.service');
const { asyncHandler } = require('../middleware/error.middleware');

const getMessages = asyncHandler(async (req, res) => {
  const { status, messageType, page = 1, limit = 20 } = req.query;

  const result = await messageService.getMessages(
    { status, messageType },
    req.user,
    parseInt(page),
    parseInt(limit)
  );

  res.json({
    success: true,
    ...result
  });
});

const getMessageById = asyncHandler(async (req, res) => {
  const message = await messageService.getMessageById(req.params.id);

  res.json({
    success: true,
    data: message
  });
});

const createMessage = asyncHandler(async (req, res) => {
  const message = await messageService.createMessage(req.body, req.user);

  res.status(201).json({
    success: true,
    message: 'Message created successfully',
    data: message
  });
});

const updateMessage = asyncHandler(async (req, res) => {
  const message = await messageService.updateMessage(req.params.id, req.body, req.user);

  res.json({
    success: true,
    message: 'Message updated successfully',
    data: message
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = await messageService.sendMessage(req.params.id, req.user);

  res.json({
    success: true,
    message: 'Message sent successfully',
    data: message
  });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const result = await messageService.deleteMessage(req.params.id, req.user);

  res.json({
    success: true,
    ...result
  });
});

const getTemplates = asyncHandler(async (req, res) => {
  const templates = await messageService.getTemplates();

  res.json({
    success: true,
    data: templates
  });
});

module.exports = {
  getMessages,
  getMessageById,
  createMessage,
  updateMessage,
  sendMessage,
  deleteMessage,
  getTemplates
};
