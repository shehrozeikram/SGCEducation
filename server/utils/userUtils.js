/**
 * Utility functions for handling user and institution data
 */

/**
 * Extract institution ID from user object
 * Handles both populated (object) and unpopulated (string/ObjectId) institution
 * @param {Object} user - User object with institution field
 * @returns {String|ObjectId|null} - Institution ID or null
 */
const getInstitutionId = (user) => {
  if (!user || !user.institution) {
    return null;
  }
  
  // If institution is an object (populated), extract _id
  if (typeof user.institution === 'object' && user.institution._id) {
    return user.institution._id;
  }
  
  // If it's already a string or ObjectId, return as is
  return user.institution;
};

/**
 * Extract institution ID from any source (user, query param, etc.)
 * @param {*} institution - Institution value (can be object, string, ObjectId)
 * @returns {String|ObjectId|null} - Institution ID or null
 */
const extractInstitutionId = (institution) => {
  if (!institution) {
    return null;
  }
  
  // If institution is an object (populated), extract _id
  if (typeof institution === 'object' && institution._id) {
    return institution._id;
  }
  
  // If it's already a string or ObjectId, return as is
  return institution;
};

module.exports = {
  getInstitutionId,
  extractInstitutionId
};



















