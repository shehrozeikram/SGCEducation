const Group = require('../models/Group');
const Section = require('../models/Section');
const Class = require('../models/Class');
const Department = require('../models/Department');
const { ApiError } = require('../middleware/error.middleware');

/**
 * Group Service - Handles group-related business logic
 */
class GroupService {
  /**
   * Get all groups (filtered by user role and institution)
   */
  async getAllGroups(filters = {}, currentUser) {
    const query = {};

    // Apply institution filter based on role
    if (currentUser.role !== 'super_admin') {
      query.institution = currentUser.institution;
    } else if (filters.institution) {
      query.institution = filters.institution;
    }

    // Apply additional filters
    if (filters.department) query.department = filters.department;
    if (filters.class) query.class = filters.class;
    if (filters.section) query.section = filters.section;
    if (filters.type) query.type = filters.type;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const groups = await Group.find(query)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate('class', 'name code level')
      .populate('section', 'name code')
      .populate('leader.userId', 'name email')
      .populate('supervisor.userId', 'name email')
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ type: 1, name: 1 });

    return groups;
  }

  /**
   * Get group by ID
   */
  async getGroupById(groupId, currentUser) {
    const group = await Group.findById(groupId)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate('class', 'name code level')
      .populate('section', 'name code')
      .populate('leader.userId', 'name email')
      .populate('supervisor.userId', 'name email')
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && group.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    return group;
  }

  /**
   * Create new group
   */
  async createGroup(groupData, currentUser) {
    // Verify section exists if provided
    if (groupData.section) {
      const section = await Section.findById(groupData.section);
      if (!section) {
        throw new ApiError(404, 'Section not found');
      }

      // Check access
      if (currentUser.role !== 'super_admin' && section.institution.toString() !== currentUser.institution.toString()) {
        throw new ApiError(403, 'Access denied');
      }

      // Set institution, department, and class from section
      groupData.institution = section.institution;
      groupData.department = section.department;
      groupData.class = section.class;
    } else if (groupData.class) {
      // If only class is provided
      const classDoc = await Class.findById(groupData.class);
      if (!classDoc) {
        throw new ApiError(404, 'Class not found');
      }

      // Check access
      if (currentUser.role !== 'super_admin' && classDoc.institution.toString() !== currentUser.institution.toString()) {
        throw new ApiError(403, 'Access denied');
      }

      groupData.institution = classDoc.institution;
      groupData.department = classDoc.department;
    } else if (groupData.department) {
      // If only department is provided
      const department = await Department.findById(groupData.department);
      if (!department) {
        throw new ApiError(404, 'Department not found');
      }

      // Check access
      if (currentUser.role !== 'super_admin' && department.institution.toString() !== currentUser.institution.toString()) {
        throw new ApiError(403, 'Access denied');
      }

      groupData.institution = department.institution;
    }

    groupData.createdBy = currentUser._id;

    // Check for duplicate code
    const existingGroup = await Group.findOne({
      code: groupData.code.toUpperCase(),
      section: groupData.section,
      academicYear: groupData.academicYear
    });

    if (existingGroup) {
      throw new ApiError(400, 'Group code already exists for this section and academic year');
    }

    const newGroup = await Group.create(groupData);

    // Update section stats if section is provided
    if (groupData.section) {
      await Section.findByIdAndUpdate(groupData.section, {
        $inc: { 'stats.totalGroups': 1 }
      });
    }

    return await Group.findById(newGroup._id)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate('class', 'name code level')
      .populate('section', 'name code')
      .populate('leader.userId', 'name email')
      .populate('supervisor.userId', 'name email');
  }

  /**
   * Update group
   */
  async updateGroup(groupId, updateData, currentUser) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && group.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // If code is being updated, check for duplicates
    if (updateData.code) {
      const existingGroup = await Group.findOne({
        code: updateData.code.toUpperCase(),
        section: updateData.section || group.section,
        academicYear: updateData.academicYear || group.academicYear,
        _id: { $ne: groupId }
      });

      if (existingGroup) {
        throw new ApiError(400, 'Group code already exists for this section and academic year');
      }
    }

    Object.assign(group, updateData);
    await group.save();

    return await Group.findById(groupId)
      .populate('institution', 'name type code')
      .populate('department', 'name code')
      .populate('class', 'name code level')
      .populate('section', 'name code')
      .populate('leader.userId', 'name email')
      .populate('supervisor.userId', 'name email');
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId, currentUser) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && group.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Update section stats if section is provided
    if (group.section) {
      await Section.findByIdAndUpdate(group.section, {
        $inc: { 'stats.totalGroups': -1 }
      });
    }

    await Group.findByIdAndDelete(groupId);
    return { message: 'Group deleted successfully' };
  }

  /**
   * Toggle group status
   */
  async toggleGroupStatus(groupId, currentUser) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && group.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    group.isActive = !group.isActive;
    await group.save();

    return group;
  }

  /**
   * Add member to group
   */
  async addMember(groupId, memberData, currentUser) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && group.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Check capacity
    if (group.members.length >= group.capacity) {
      throw new ApiError(400, 'Group has reached maximum capacity');
    }

    // Check if member already exists
    const existingMember = group.members.find(
      m => m.userId && m.userId.toString() === memberData.userId.toString()
    );

    if (existingMember) {
      throw new ApiError(400, 'Member already exists in this group');
    }

    group.members.push({
      userId: memberData.userId,
      name: memberData.name,
      email: memberData.email,
      role: memberData.role || 'Member'
    });

    await group.save();
    return await this.getGroupById(groupId, currentUser);
  }

  /**
   * Remove member from group
   */
  async removeMember(groupId, userId, currentUser) {
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check access
    if (currentUser.role !== 'super_admin' && group.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    group.members = group.members.filter(
      m => m.userId && m.userId.toString() !== userId.toString()
    );

    await group.save();
    return await this.getGroupById(groupId, currentUser);
  }
}

module.exports = new GroupService();

