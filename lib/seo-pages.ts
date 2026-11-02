/**
 * Catalog of authenticated app routes for SEO metadata + robots disallow.
 * When you add a new (dashboard) page, add an entry here and a matching layout.tsx.
 */
export const PRIVATE_APP_PAGES = [
  {
    path: '/dashboard',
    title: 'Dashboard',
    description: 'General DreamFlow dashboard with system-wide KPIs, charts, and role dashboards.',
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
    description: 'WhatsApp-style inbox with mute, block, polls, disappearing messages, starred chats, and contact info.',
  },
  {
    path: '/messaging/new',
    title: 'New Conversation',
    description: 'Search users in a paginated list, start a direct chat, or add members to a group.',
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
    path: '/ports/business-types',
    title: 'Business Types',
    description: 'Create and manage business types used when registering businesses.',
  },
  {
    path: '/ports/plans',
    title: 'Plans',
    description: 'Manage business plan pricing, duration, features, and storage limits.',
  },
  {
    path: '/ports/messaging-types',
    title: 'Messaging Types',
    description: 'Create and manage messaging types used when starting chats.',
  },
  {
    path: '/settings',
    title: 'Settings',
    description: 'Configure institute preferences, profile, and application settings.',
  },
  {
    path: '/profile',
    title: 'Profile',
    description: 'View and update your DreamFlow account profile.',
  },
  {
    path: '/support',
    title: 'Support Overview',
    description: 'Call center, support tickets, inbox messages, and social channels at a glance.',
  },
  {
    path: '/business',
    title: 'Business Management',
    description: 'Create and manage businesses and their branches.',
  },
  {
    path: '/business/create',
    title: 'Create Business',
    description: 'Create a business with bio, contact details, city, services, logo, and cover image.',
  },
  {
    path: '/business/branches',
    title: 'Branches',
    description: 'View and manage branches linked to businesses.',
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
