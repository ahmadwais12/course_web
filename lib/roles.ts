/** Official role slugs → users.role CHECK constraint (+ roles.slug) */
export const SYSTEM_ROLES = [
  { id: 'ceo', label: 'CEO', description: 'Top-level executive access across the platform.' },
  { id: 'super_admin', label: 'Super Admin', description: 'Full platform control, tenants, and system settings.' },
  { id: 'admin', label: 'Admin', description: 'Institute / tenant administration.' },
  { id: 'branch_manager', label: 'Branch Manager', description: 'Branch operations, staff, and local oversight.' },
  { id: 'teacher', label: 'Teacher', description: 'Teaching, grades, attendance, and class tools.' },
  { id: 'student', label: 'Student', description: 'Student portal access for courses and results.' },
  { id: 'guardian', label: 'Guardian', description: 'Parent/guardian view of linked students.' },
  { id: 'staff', label: 'Staff', description: 'General staff operations.' },
  { id: 'academic_support', label: 'Academic Support', description: 'Academic support and counseling tools.' },
  { id: 'accountant', label: 'Accountant', description: 'Fees, payments, payroll, and finance.' },
  { id: 'cashier', label: 'Cashier', description: 'Cash handling, fee collection, and receipts.' },
  { id: 'librarian', label: 'Librarian', description: 'Library books, issues, and members.' },
  { id: 'receptionist', label: 'Receptionist', description: 'Front desk, leads, and reception events.' },
  { id: 'hr_manager', label: 'HR Manager', description: 'Staff, leaves, recruitment, and payroll.' },
  { id: 'inventory_manager', label: 'Inventory Manager', description: 'Inventory and asset management.' },
  { id: 'it_support', label: 'IT Support', description: 'Devices, sessions, and technical support.' },
  { id: 'maintenance', label: 'Maintenance', description: 'Facilities and maintenance tasks.' },
  { id: 'event_manager', label: 'Event Manager', description: 'Events and registrations.' },
  { id: 'complaint_manager', label: 'Complaint Manager', description: 'Support tickets and complaints.' },
] as const;

export type SystemRoleId = (typeof SYSTEM_ROLES)[number]['id'];

/** Default permission modules used on the Permissions page */
export const PERMISSION_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'students', label: 'Students' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'courses', label: 'Courses' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'exams', label: 'Exams & Grades' },
  { id: 'finance', label: 'Finance & Payments' },
  { id: 'payroll', label: 'Payroll & Salaries' },
  { id: 'library', label: 'Library' },
  { id: 'hr', label: 'HR & Staff' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
  { id: 'users', label: 'User Management' },
  { id: 'tenants', label: 'Tenants & Branches' },
] as const;

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

/** Display name → machine slug for roles.slug / users.role */
export function toRoleSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
