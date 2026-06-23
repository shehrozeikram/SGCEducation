export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  FINANCE_MANAGER: 'finance_manager',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

export const PERMISSIONS = {
  USERS: {
    VIEW: 'user:view',
    CREATE: 'user:create',
    EDIT: 'user:edit',
    DELETE: 'user:delete'
  },
  INSTITUTIONS: {
    VIEW: 'institution:view',
    CREATE: 'institution:create',
    EDIT: 'institution:edit',
    DELETE: 'institution:delete'
  },
  ADMISSIONS: {
    VIEW: 'admission:view',
    CREATE: 'admission:create',
    EDIT: 'admission:edit',
    APPROVE: 'admission:approve'
  },
  ACADEMIC: {
    MANAGE: 'academic:manage',
    VIEW: 'academic:view'
  },
  FEES: {
    VIEW: 'fee:view',
    MANAGE: 'fee:manage',
    REPORT: 'fee:report',
    DELETE: 'fee:delete',
    GENERATE_VOUCHER: 'fee:generate_voucher',
    SUBMIT_VOUCHER: 'fee:submit_voucher',
    PRINT_VOUCHER: 'fee:print_voucher',
    VIEW_VOUCHER: 'fee:view_voucher',
    EDIT_VOUCHER: 'fee:edit_voucher',
    DELETE_VOUCHER: 'fee:delete_voucher'
  },
  RESULTS: {
    VIEW: 'result:view',
    MANAGE: 'result:manage'
  },
  SYSTEM: {
    MANAGE: 'system:manage'
  },
  REPORTS: {
    VIEW: 'report:view'
  },
  ATTENDANCE: {
    MARK: 'attendance:mark',
    VIEW: 'attendance:view'
  }
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: ['*'], // All permissions
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.EDIT,
    PERMISSIONS.ADMISSIONS.VIEW,
    PERMISSIONS.ADMISSIONS.CREATE,
    PERMISSIONS.ACADEMIC.MANAGE,
    PERMISSIONS.FEES.VIEW,
    PERMISSIONS.FEES.MANAGE,
    PERMISSIONS.FEES.GENERATE_VOUCHER,
    PERMISSIONS.FEES.SUBMIT_VOUCHER,
    PERMISSIONS.FEES.PRINT_VOUCHER,
    PERMISSIONS.FEES.VIEW_VOUCHER,
    PERMISSIONS.FEES.EDIT_VOUCHER,
    PERMISSIONS.FEES.DELETE_VOUCHER,
    PERMISSIONS.RESULTS.VIEW,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.ATTENDANCE.VIEW
  ],
  [USER_ROLES.TEACHER]: [
    PERMISSIONS.ACADEMIC.VIEW,
    PERMISSIONS.RESULTS.MANAGE,
    PERMISSIONS.ATTENDANCE.MARK,
    PERMISSIONS.ATTENDANCE.VIEW
  ],
  [USER_ROLES.STUDENT]: [
    PERMISSIONS.ACADEMIC.VIEW,
    PERMISSIONS.RESULTS.VIEW,
    PERMISSIONS.FEES.VIEW
  ],
  [USER_ROLES.FINANCE_MANAGER]: [
    PERMISSIONS.FEES.VIEW,
    PERMISSIONS.FEES.MANAGE,
    PERMISSIONS.FEES.REPORT,
    PERMISSIONS.FEES.DELETE,
    PERMISSIONS.FEES.GENERATE_VOUCHER,
    PERMISSIONS.FEES.SUBMIT_VOUCHER,
    PERMISSIONS.FEES.PRINT_VOUCHER,
    PERMISSIONS.FEES.VIEW_VOUCHER,
    PERMISSIONS.FEES.EDIT_VOUCHER,
    PERMISSIONS.FEES.DELETE_VOUCHER,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.ADMISSIONS.VIEW,
    PERMISSIONS.USERS.VIEW
  ]
};
