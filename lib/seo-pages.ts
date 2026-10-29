/**
 * Catalog of authenticated app routes for SEO metadata + robots disallow.
 * When you add a new (dashboard) page, add an entry here and a matching layout.tsx.
 */
export const PRIVATE_APP_PAGES = [
  {
    path: '/dashboard',
    title: 'Dashboard',
    description: 'Overview of institute KPIs, activity, and quick actions in DreamFlow EMIS.',
  },
  {
    path: '/courses',
    title: 'Courses',
    description: 'Browse and manage courses, schedules, and academic offerings.',
  },
  {
    path: '/students',
    title: 'Students',
    description: 'Search, filter, and manage enrolled students and student records.',
  },
  {
    path: '/attendance',
    title: 'Attendance',
    description: 'Track and manage student and class attendance records.',
  },
  {
    path: '/payments',
    title: 'Payments',
    description: 'View and manage tuition payments, receipts, and fee collections.',
  },
  {
    path: '/salaries',
    title: 'Salaries',
    description: 'Manage staff salaries, payroll runs, and compensation records.',
  },
  {
    path: '/reports',
    title: 'Reports',
    description: 'Generate and review academic, financial, and operational reports.',
  },
  {
    path: '/books',
    title: 'Books',
    description: 'Manage library books, inventory, and borrowing records.',
  },
  {
    path: '/feedback',
    title: 'Feedback',
    description: 'Review feedback, complaints, and responses from stakeholders.',
  },
  {
    path: '/grades',
    title: 'Grades',
    description: 'Manage student exam scores, percentages, and letter grades.',
  },
  {
    path: '/messaging',
    title: 'Messaging',
    description: 'Direct messages and group conversations across DreamFlow.',
  },
  {
    path: '/messaging/new',
    title: 'New Conversation',
    description: 'Start a direct message or create a group chat.',
  },
  {
    path: '/observers',
    title: 'Website Analytics',
    description: 'First-party website traffic, devices, sources, and realtime visitors.',
  },
  {
    path: '/observers/directory',
    title: 'Account Directory',
    description: 'Read-only directory of accounts and their assigned roles.',
  },

  {
    path: '/ports',
    title: 'Ports UI Kit',
    description: 'Internal component gallery for DreamFlow list and form UI patterns.',
  },
  {
    path: '/settings',
    title: 'Settings',
    description: 'Configure institute preferences, profile, and application settings.',
  },
  {
    path: '/support',
    title: 'Support Overview',
    description: 'Call center, support tickets, inbox messages, and social channels at a glance.',
  },
  {
    path: '/users',
    title: 'Users',
    description: 'Manage system users, roles assignment, and account status.',
  },
  {
    path: '/users/create',
    title: 'Create User',
    description: 'Create a new DreamFlow user account and assign a role.',
  },
  {
    path: '/users/permissions',
    title: 'Permissions',
    description: 'Manage RBAC permissions used across DreamFlow modules.',
  },
  {
    path: '/users/roles',
    title: 'Roles',
    description: 'Manage roles, slugs, and permission sets for DreamFlow users.',
  },
] as const;

export type PrivateAppPagePath = (typeof PRIVATE_APP_PAGES)[number]['path'];
