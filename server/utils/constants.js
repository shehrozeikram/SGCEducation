/**
 * Application Constants
 */

const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'school_admin', // Deprecated, use ADMIN
  TEACHER: 'teacher',
  STUDENT: 'student'
};

const INSTITUTION_TYPES = {
  SCHOOL: 'school',
  COLLEGE: 'college'
};

const ADMISSION_STATUS = {
  PENDING: 'pending',
  STRUCK_OFF: 'struck_off',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ENROLLED: 'enrolled',
  CANCELLED: 'cancelled'
};

const STUDENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TRANSFERRED: 'transferred',
  GRADUATED: 'graduated',
  EXPELLED: 'expelled',
  ON_LEAVE: 'on_leave',
  STRUCK_OFF: 'struck_off'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

module.exports = {
  USER_ROLES,
  INSTITUTION_TYPES,
  ADMISSION_STATUS,
  STUDENT_STATUS,
  HTTP_STATUS
};
