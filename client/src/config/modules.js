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
} from '@mui/icons-material';

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
    children: [
      { name: 'Admissions List', route: '/admissions' },
      { name: 'New Admission', route: '/admissions/new' },
      { name: 'Admissions Register', route: '/admissions/register' },
      { name: 'Import Students', route: '/admissions/students/import' },
      { name: 'Reports', route: '/admissions/reports' },
      { name: 'Admissions Analytics', route: '/admissions/analytics' },
      { name: 'Search Student', route: '/admissions/students/search' },
      { name: 'Search (All)', route: '/admissions/students/search-all' },
    ]
  },
  { name: 'Student Promotion', icon: SwapHoriz, color: '#10b981', route: '/student-promotion' },
  { name: 'Attendance', icon: EventAvailable, color: '#4facfe', route: null },
  { 
    name: 'Fee Management', 
    icon: Payment, 
    color: '#43e97b', 
    route: '/fee-management',
    children: [
      { name: 'Fee Heads', route: '/fee-management?tab=fee-heads' },
      { name: 'Fee Structure', route: '/fee-management?tab=fee-structure' },
      { name: 'Assign Fee', route: '/fee-management?tab=assign-fee-structure' },
      { name: 'Voucher Generation', route: '/fee-management?tab=voucher-generation' },
      { name: 'Print Voucher', route: '/fee-management?tab=print-voucher' },
      { name: 'Fee Deposit', route: '/fee-management?tab=fee-deposit' },
      { name: 'Receipts', route: '/fee-management?tab=receipt' },
      { name: 'Suspense', route: '/fee-management?tab=suspense' },
    ]
  },
  { name: 'Results', icon: Assessment, color: '#feca57', route: '/results' },
  { name: 'SMS & Notification', icon: Notifications, color: '#fa709a', route: '/notifications' },
  { name: 'Complaints', icon: Report, color: '#ee5a6f', route: null },
  { name: 'Academics', icon: MenuBook, color: '#764ba2', route: null },
  { name: 'HR Management', icon: People, color: '#667eea', route: null },
  { name: 'Library', icon: LocalLibrary, color: '#f093fb', route: null },
  { name: 'Assets Management', icon: Inventory, color: '#4facfe', route: null },
  { name: 'Finance Management', icon: AccountBalance, color: '#43e97b', route: null },
  { 
    name: 'User & Privilege', 
    icon: SupervisorAccount, 
    color: '#feca57', 
    route: '/users',
    children: [
      { name: 'User List', route: '/users' },
      { name: 'Create User', route: '/users/new' },
    ]
  },
  { name: 'Configuration', icon: Settings, color: '#fa709a', route: '/settings' },
  { name: 'Transport', icon: DirectionsBus, color: '#ee5a6f', route: null },
  { name: 'Event', icon: Event, color: '#764ba2', route: '/calendar' },
  { name: 'Institute Branding', icon: Brush, color: '#667eea', route: null },
  { name: 'Student Consultancy', icon: School, color: '#f093fb', route: null },
  { name: 'Franchise Management', icon: Business, color: '#4facfe', route: null },
  { name: 'Hostel Management', icon: Hotel, color: '#43e97b', route: null },
  { name: 'Electronic Paper Generation', icon: Description, color: '#feca57', route: '/reports' },
];

/**
 * Get modules with routes (available modules)
 */
export const getAvailableModules = () => {
  return modules.filter(module => module.route !== null);
};

/**
 * Get all modules (including unavailable ones)
 */
export const getAllModules = () => {
  return modules;
};
