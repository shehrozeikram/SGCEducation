const groupService = require('../services/group.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Get all groups
 */
const getGroups = asyncHandler(async (req, res) => {
  const filters = {
    institution: req.query.institution,
    department: req.query.department,
    class: req.query.class,
    section: req.query.section,
    type: req.query.type,
    academicYear: req.query.academicYear,
    isActive: req.query.isActive,
    search: req.query.search
  };

  const groups = await groupService.getAllGroups(filters, req.user);
  res.json({
    success: true,
    data: groups
  });
});

/**
 * Get group by ID
 */
const getGroupById = asyncHandler(async (req, res) => {
  const group = await groupService.getGroupById(req.params.id, req.user);
  res.json({
    success: true,
    data: group
  });
});

/**
 * Create new group
 */
const createGroup = asyncHandler(async (req, res) => {
  const group = await groupService.createGroup(req.body, req.user);
  res.status(201).json({
    success: true,
    data: group
  });
});

/**
 * Update group
 */
const updateGroup = asyncHandler(async (req, res) => {
  const group = await groupService.updateGroup(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: group
  });
});

/**
 * Delete group
 */
const deleteGroup = asyncHandler(async (req, res) => {
  await groupService.deleteGroup(req.params.id, req.user);
  res.json({
    success: true,
    message: 'Group deleted successfully'
  });
});

/**
 * Toggle group status
 */
const toggleGroupStatus = asyncHandler(async (req, res) => {
  const group = await groupService.toggleGroupStatus(req.params.id, req.user);
  res.json({
    success: true,
    data: group
  });
});

/**
 * Add member to group
 */
const addMember = asyncHandler(async (req, res) => {
  const group = await groupService.addMember(req.params.id, req.body, req.user);
  res.json({
    success: true,
    data: group
  });
});

/**
 * Remove member from group
 */
const removeMember = asyncHandler(async (req, res) => {
  const group = await groupService.removeMember(req.params.id, req.body.userId, req.user);
  res.json({
    success: true,
    data: group
  });
});

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  toggleGroupStatus,
  addMember,
  removeMember
};

