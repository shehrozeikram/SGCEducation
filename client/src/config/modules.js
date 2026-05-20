import {
  ContactMail,
  PersonAdd,
  SwapHoriz,
  EventAvailable,
  Payment,
  Assessment,
  Notifications,
  Report,
  MenuBook,
  People,
  LocalLibrary,
  Inventory,
  AccountBalance,
  SupervisorAccount,
  Settings,
  DirectionsBus,
  Event,
  Brush,
  School,
  Business,
  Hotel,
  Description,
  CloudDownload,
  Security, // Add Security icon
} from '@mui/icons-material';
import { PERMISSIONS, ROLE_PERMISSIONS, USER_ROLES } from '../utils/constants';

/**
 * Application Modules Configuration
 * Defines all available modules with their routes, icons, and colors
 */
export const modules = [
  { name: 'Inquiry', icon: ContactMail, color: '#667eea', route: null },
  { 
    name: 'Admissions', 
    icon: PersonAdd, 
    color: '#f093fb', 
    route: '/admissions',
    permission: PERMISSIONS.ADMISSIONS.VIEW,
    children: [
      { name: 'Admissions List', route: '/admissions', permission: PERMISSIONS.ADMISSIONS.VIEW },
      { name: 'New Admission', route: '/admissions/new', permission: PERMISSIONS.ADMISSIONS.CREATE },
      { name: 'Admissions Register', route: '/admissions/register', permission: PERMISSIONS.ADMISSIONS.VIEW },
      { name: 'Import Students', route: '/admissions/students/import', permission: PERMISSIONS.ADMISSIONS.CREATE },
      { name: 'Reports', route: '/admissions/reports', permission: PERMISSIONS.REPORTS.VIEW },
      { name: 'Admissions Analytics', route: '/admissions/analytics', permission: PERMISSIONS.REPORTS.VIEW },
      { name: 'Search Student', route: '/admissions/students/search', permission: PERMISSIONS.ADMISSIONS.VIEW },
      { name: 'Search (All)', route: '/admissions/students/search-all', permission: PERMISSIONS.ADMISSIONS.VIEW },
    ]
  },
  { name: 'Student Promotion', icon: SwapHoriz, color: '#10b981', route: '/student-promotion', permission: PERMISSIONS.ACADEMIC.MANAGE },
  { name: 'Attendance', icon: EventAvailable, color: '#4facfe', route: null, permission: PERMISSIONS.ATTENDANCE.VIEW },
  { 
    name: 'Fee Management', 
    icon: Payment, 
    color: '#43e97b', 
    route: '/fee-management',
    permission: PERMISSIONS.FEES.VIEW,
    children: [
      { name: 'Fee Heads', route: '/fee-management?tab=fee-heads', permission: PERMISSIONS.FEES.MANAGE },
      { name: 'Fee Structure', route: '/fee-management?tab=fee-structure', permission: PERMISSIONS.FEES.VIEW },
      { name: 'Assign Fee', route: '/fee-management?tab=assign-fee-structure', permission: PERMISSIONS.FEES.MANAGE },
      { name: 'Voucher Generation', route: '/fee-management?tab=voucher-generation', permission: PERMISSIONS.FEES.MANAGE },
      { name: 'Print Voucher', route: '/fee-management?tab=print-voucher', permission: PERMISSIONS.FEES.VIEW },
      { name: 'Fee Deposit', route: '/fee-management?tab=fee-deposit', permission: PERMISSIONS.FEES.MANAGE },
      { name: 'Receipts', route: '/fee-management?tab=receipt', permission: PERMISSIONS.FEES.VIEW },
      { name: 'Suspense', route: '/fee-management?tab=suspense', permission: PERMISSIONS.FEES.VIEW },
      { name: 'Reports', route: '/fee-management?tab=reports', permission: PERMISSIONS.FEES.REPORT },
    ]
  },
  { name: 'Results', icon: Assessment, color: '#feca57', route: '/results', permission: PERMISSIONS.RESULTS.VIEW },
  { name: 'SMS & Notification', icon: Notifications, color: '#fa709a', route: '/notifications', permission: PERMISSIONS.SYSTEM.MANAGE },
  { name: 'Complaints', icon: Report, color: '#ee5a6f', route: null },
  { name: 'Academics', icon: MenuBook, color: '#764ba2', route: null, permission: PERMISSIONS.ACADEMIC.VIEW },
  { name: 'HR Management', icon: People, color: '#667eea', route: null },
  { name: 'Library', icon: LocalLibrary, color: '#f093fb', route: null },
  { name: 'Assets Management', icon: Inventory, color: '#4facfe', route: null },
  { name: 'Finance Management', icon: AccountBalance, color: '#43e97b', route: null },
  { 
    name: 'User & Privilege', 
    icon: SupervisorAccount, 
    color: '#feca57', 
    route: '/users',
    permission: PERMISSIONS.USERS.VIEW,
    children: [
      { name: 'User List', route: '/users', permission: PERMISSIONS.USERS.VIEW },
      { name: 'Create User', route: '/users/new', permission: PERMISSIONS.USERS.CREATE },
      { name: 'Role Management', route: '/roles', icon: Security, permission: PERMISSIONS.SYSTEM.MANAGE },
    ]
  },
  { name: 'Transport', icon: DirectionsBus, color: '#ee5a6f', route: null },
  { name: 'Event', icon: Event, color: '#764ba2', route: '/calendar', permission: PERMISSIONS.ACADEMIC.VIEW },
  { name: 'Institute Branding', icon: Brush, color: '#667eea', route: null },
  { name: 'Student Consultancy', icon: School, color: '#f093fb', route: null },
  { name: 'Franchise Management', icon: Business, color: '#4facfe', route: null },
  { name: 'Hostel Management', icon: Hotel, color: '#43e97b', route: null },
  { name: 'Organization Management', icon: Business, color: '#f093fb', route: '/organizations', permission: PERMISSIONS.SYSTEM.MANAGE, superAdminOnly: true },
  { name: 'Campus Management', icon: Business, color: '#667eea', route: '/institutions', permission: PERMISSIONS.INSTITUTIONS.VIEW, superAdminOnly: true },
  { name: 'Backup', icon: CloudDownload, color: '#667eea', route: '/backup-management', permission: PERMISSIONS.SYSTEM.MANAGE, superAdminOnly: true },
];

/**
 * Get modules with routes (available modules)
 */
export const getAvailableModules = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || '';
  const userPermissions = user.permissions || ROLE_PERMISSIONS[userRole] || [];

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (userPermissions.includes('*')) return true;
    return userPermissions.includes(permission);
  };

  return modules.filter(module => {
    if (module.route === null) return false;
    if (module.superAdminOnly && userRole !== USER_ROLES.SUPER_ADMIN) return false;
    
    // Check module level permission
    if (!hasPermission(module.permission)) return false;

    // If module has children, filter them too
    if (module.children) {
      module.children = module.children.filter(child => hasPermission(child.permission));
      // If no children left after filtering, hide the whole module? 
      // Depends on if the parent has its own route.
      if (module.children.length === 0 && !module.route) return false;
    }

    return true;
  });
};

/**
 * Get all modules (including unavailable ones)
 */
export const getAllModules = () => {
  return modules;
};
