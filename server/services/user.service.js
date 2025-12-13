const User = require('../models/User');
const { ApiError } = require('../middleware/error.middleware');

/**
 * User Service - Handles user-related business logic
 */
class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId)
      .select('-password')
      .populate('institution', 'name type')
      .populate('department', 'name code');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const { name, email } = updateData;

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if email is being changed and already exists
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        throw new ApiError(400, 'Email already in use');
      }
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institution: user.institution
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  /**
   * Get all users (with filters)
   */
  async getUsers(filters = {}, currentUser) {
    const query = {};

    // Institution filtering based on role
    if (currentUser.role === 'super_admin') {
      // Super admin can filter by institution if provided
      if (filters.institution) {
        query.institution = filters.institution;
      }
      // If no institution filter, super admin sees all users
    } else if (currentUser.institution) {
      // Regular admin only sees users from their institution
      query.institution = currentUser.institution;
    }

    // Apply additional filters
    if (filters.role) query.role = filters.role;
    if (filters.department) query.department = filters.department;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('institution', 'name type')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    return users;
  }

  /**
   * Create user (by admin)
   */
  async createUser(userData, createdBy) {
    const { name, email, password, role, institution, department, phone, address, dateOfBirth, gender } = userData;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    // Validate permissions
    if (createdBy.role === 'admin' && role === 'super_admin') {
      throw new ApiError(403, 'You cannot create super admin users');
    }

    if (createdBy.role === 'admin' && institution.toString() !== createdBy.institution.toString()) {
      throw new ApiError(403, 'You can only create users for your institution');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      institution,
      department,
      phone,
      address,
      dateOfBirth,
      gender
    });

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('institution', 'name type')
      .populate('department', 'name code');

    return populatedUser;
  }

  /**
   * Update user (by admin)
   */
  async updateUser(userId, updateData, currentUser) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' && user.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'You can only update users from your institution');
    }

    // Check if email is being changed
    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await User.findOne({
        email: updateData.email,
        _id: { $ne: userId }
      });
      if (emailExists) {
        throw new ApiError(400, 'Email already in use');
      }
    }

    // Handle password update if provided
    if (updateData.password) {
      user.password = updateData.password;
      delete updateData.password; // Remove from updateData to avoid double assignment
    }

    // Update user
    Object.assign(user, updateData);
    await user.save();

    return await User.findById(user._id)
      .select('-password')
      .populate('institution', 'name type')
      .populate('department', 'name code');
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId, currentUser) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' && user.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'You can only deactivate users from your institution');
    }

    user.isActive = false;
    await user.save();

    return { message: 'User deactivated successfully' };
  }

  /**
   * Toggle user status
   */
  async toggleUserStatus(userId, currentUser) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check permissions
    if (currentUser.role !== 'super_admin' && user.institution.toString() !== currentUser.institution.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    user.isActive = !user.isActive;
    await user.save();

    return await User.findById(user._id)
      .select('-password')
      .populate('institution', 'name type')
      .populate('department', 'name code');
  }
}

module.exports = new UserService();
