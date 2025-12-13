/**
 * Request Validation Middleware
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Validate registration data
 */
const validateRegistration = (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Check required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email, and password.'
    });
  }

  // Validate email
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.'
    });
  }

  // Validate password
  if (!isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.'
    });
  }

  // Validate role
  const validRoles = ['super_admin', 'admin', 'teacher', 'student'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid role specified.'
    });
  }

  next();
};

/**
 * Validate login data
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password.'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.'
    });
  }

  next();
};

/**
 * Validate password change data
 */
const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both current and new password.'
    });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters long.'
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordChange
};
