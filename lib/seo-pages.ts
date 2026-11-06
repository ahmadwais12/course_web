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
    path: '/students/create',
    title: 'Create Student & Parent',
    description: 'Register a new student together with a parent or guardian account in DreamFlow.',
  },
  {
    path: '/ai-assistant',
    title: 'AI Assistant',
    description: 'Ask the AI Assistant about your organization’s data and how to use DreamFlow, with saved conversation history.',
  },
  {
    path: '/ai-assistant/settings',
    title: 'AI Settings',
    description: 'View your organization’s AI Assistant usage, choose which roles can use it, and manage knowledge documents.',
  },
  {
    path: '/system/ai',
    title: 'AI Management',
    description: 'Configure the shared Gemini AI provider, organization AI limits, plan quotas, pricing, usage, and the platform knowledge base.',
  },
  {
    path: '/notifications',
    title: 'Notifications',
    description: 'View your in-app notification history and mark alerts as read.',
  },
  {
    path: '/communication/announcements',
    title: 'Announcements',
    description: 'Publish announcements to students, guardians, teachers, and staff and notify them in the app.',
  },
  {
    path: '/communication/sms',
    title: 'SMS',
    description: 'Send SMS messages to students, guardians, and staff and review delivery history.',
  },
  {
    path: '/communication/email',
    title: 'Email',
    description: 'Send emails to students, guardians, and staff and review delivery history.',
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
    path: '/inventory',
    title: 'Inventory Dashboard',
    description: 'Stock levels, movement trend, unit mix, and fixed-asset status by department and location.',
  },
  {
    path: '/inventory/assets',
    title: 'Assets',
    description: 'Register fixed assets with a tag, holder, category, project, and status.',
  },
  {
    path: '/inventory/assets/trash',
    title: 'Asset Trash',
    description: 'Restore deleted assets or remove them permanently.',
  },
  {
    path: '/inventory/projects',
    title: 'Projects',
    description: 'Manage projects linked to fixed assets, including donor, dates, status, and budget.',
  },
  {
    path: '/inventory/holders',
    title: 'Asset Holders',
    description: 'Manage the people and offices that hold registered assets.',
  },
  {
    path: '/inventory/properties',
    title: 'Asset Properties',
    description: 'Manage category, department, location, and province values used on assets.',
  },
  {
    path: '/inventory/categories',
    title: 'Categories',
    description: 'Manage asset categories used when registering fixed assets.',
  },
  {
    path: '/inventory/transfers',
    title: 'Transfers',
    description: 'Record asset moves between holders, departments, locations, and provinces.',
  },
  {
    path: '/inventory/items',
    title: 'Inventory Items',
    description: 'Create and manage inventory items, bin cards, units, on-hand quantity, minimums, and prices.',
  },
  {
    path: '/inventory/units',
    title: 'Units',
    description: 'Manage units of measure used by inventory items.',
  },
  {
    path: '/inventory/warehouses',
    title: 'Warehouses',
    description: 'Manage warehouse locations used on stock in and stock out movements.',
  },
  {
    path: '/inventory/stock-in',
    title: 'Stock In',
    description: 'Record stock received and add it to the item on-hand quantity.',
  },
  {
    path: '/inventory/stock-out',
    title: 'Stock Out',
    description: 'Issue stock when the quantity does not exceed the current on-hand balance.',
  },
  {
    path: '/reports/inventory',
    title: 'Inventory Reports',
    description: 'On-hand totals, stock health against minimums, unit mix, and six-month in and out counts.',
  },
  {
    path: '/books',
    title: 'Books',
    description: 'Manage library books, inventory, and borrowing records.',
  },
  {
    path: '/feedback',
    title: 'Feedback',
    description: 'Submit feedback, review ratings, and reply to students, guardians, and staff.',
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
    title: 'System Viewer',
    description: 'See website, mobile app, and desktop EXE visitors with session details.',
  },
  {
    path: '/observers/directory',
    title: 'System Viewer — Visitors',
    description: 'Visitor sessions for website, mobile app, and desktop EXE clients.',
  },

  {
    path: '/ports',
    title: 'Portable UI Kit',
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
    path: '/ports/student-levels',
    title: 'Student Level',
    description: 'Create and manage student proficiency levels used when registering students.',
  },
  {
    path: '/ports/programs',
    title: 'Program',
    description: 'Create and manage academic programs used when registering students.',
  },
  {
    path: '/ports/classes',
    title: 'Class',
    description: 'Create and manage class groups used when registering students.',
  },
  {
    path: '/ports/durations',
    title: 'Duration',
    description: 'Create and manage program durations used when registering students.',
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
    description: 'Create module permissions such as assets.read and assign them to roles one module at a time.',
  },
  {
    path: '/users/roles',
    title: 'Roles',
    description: 'Manage roles, slugs, and permission sets for DreamFlow users.',
  },
  {
    path: '/users/login-history',
    title: 'Login History',
    description: 'Review sign-in history by user, device, and IP address.',
  },
  {
    path: '/users/deletion-requests',
    title: 'Account Deletion Requests',
    description: 'Review requests to delete user accounts, then delete the account or reject the request with a note.',
  },
  {
    path: '/logs',
    title: 'Activity Logs',
    description: 'Track account activity across DreamFlow — creates, updates, soft deletes, restores, and purges.',
  },
  {
    path: '/trash',
    title: 'Trash',
    description: 'Review soft-deleted records, restore them, or permanently purge them from DreamFlow.',
  },
] as const;

export type PrivateAppPagePath = (typeof PRIVATE_APP_PAGES)[number]['path'];
