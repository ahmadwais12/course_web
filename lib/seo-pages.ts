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
    path: '/inventory/overview',
    title: 'Inventory',
    description: 'Overview of the inventory module with quick links to items, stock movements, warehouses, and assets.',
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
    path: '/inventory/transactions',
    title: 'Inventory Transactions',
    description: 'Review all stock in and stock out movements in one filterable list.',
  },
  {
    path: '/inventory/settings',
    title: 'Inventory Settings',
    description: 'Configure inventory currency, default unit and warehouse, and low-stock alerts.',
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
  {
    path: '/portal',
    title: 'Portal',
    description: 'Routes each signed-in user to their role-specific self-service portal.',
  },
  {
    path: '/student',
    title: 'Student Portal',
    description: 'Student dashboard with academics, attendance, assignments, exams, fees, and documents.',
  },
  {
    path: '/student/profile',
    title: 'Student Profile',
    description: 'Personal, guardian, and academic details for the signed-in student.',
  },
  {
    path: '/student/academics',
    title: 'My Academics',
    description: 'Enrolled class, program, subjects, and assigned teachers.',
  },
  {
    path: '/student/enrollment',
    title: 'My Enrollment',
    description: 'Current class placement, academic year, and enrollment history.',
  },
  {
    path: '/student/timetable',
    title: 'My Timetable',
    description: 'Weekly class timetable with subjects, teachers, and rooms.',
  },
  {
    path: '/student/attendance',
    title: 'My Attendance',
    description: 'Daily attendance history and monthly attendance summary.',
  },
  {
    path: '/student/assignments',
    title: 'My Assignments',
    description: 'Assignments, due dates, submissions, marks, and teacher feedback.',
  },
  {
    path: '/student/exams',
    title: 'Exams & Results',
    description: 'Examination schedule, results, grades, and academic performance.',
  },
  {
    path: '/student/finance',
    title: 'Fees & Invoices',
    description: 'Fee summary, invoices, payments, outstanding balance, and receipts.',
  },
  {
    path: '/student/documents',
    title: 'My Documents',
    description: 'Student documents, certificates, transcripts, and verification status.',
  },
  {
    path: '/student/certificates',
    title: 'Certificates',
    description: 'Certificates issued to the student and requests awaiting approval.',
  },
  {
    path: '/student/submissions',
    title: 'My Submissions',
    description: 'Homework and assignment submissions uploaded by the student.',
  },
  {
    path: '/student/results',
    title: 'My Results',
    description: 'Published examination results and subject grades.',
  },
  {
    path: '/student/transcript',
    title: 'Academic Transcript',
    description: 'Printable academic transcript of recorded results.',
  },
  {
    path: '/student/calendar',
    title: 'My Calendar',
    description: 'Events, examinations, and holidays for the student’s class.',
  },
  {
    path: '/student/materials',
    title: 'Learning Materials',
    description: 'Lesson plans and study materials shared by teachers.',
  },
  {
    path: '/student/invoices',
    title: 'My Invoices',
    description: 'Invoices issued to the student with payment status.',
  },
  {
    path: '/student/fee-structure',
    title: 'Fee Structure',
    description: 'Fees that apply to the student’s class and program.',
  },
  {
    path: '/student/support',
    title: 'Support',
    description: 'Support tickets raised by the student and their resolution.',
  },
  {
    path: '/student/leaves',
    title: 'Leave Requests',
    description: 'Leave requests submitted by the student and their approval status.',
  },
  {
    path: '/student/progress',
    title: 'Academic Progress',
    description: 'Subject performance, examination history, and tracked academic progress.',
  },
  {
    path: '/student/placement-tests',
    title: 'Placement Tests',
    description: 'Available placement tests and the student’s assessment history.',
  },
  {
    path: '/student/library',
    title: 'Library',
    description: 'Borrowed books, the library catalogue, and digital resources.',
  },
  {
    path: '/student/feedback',
    title: 'Feedback',
    description: 'Feedback submitted by the student about courses, teaching, and services.',
  },
  {
    path: '/student/announcements',
    title: 'Announcements',
    description: 'School announcements published for students.',
  },
  {
    path: '/student/settings',
    title: 'Portal Settings',
    description: 'Appearance, language, and account security settings.',
  },
  {
    path: '/teacher',
    title: 'Teacher Portal',
    description: 'Teacher dashboard with classes, students, attendance, assignments, and exams.',
  },
  {
    path: '/teacher/profile',
    title: 'Teacher Profile',
    description: 'Employment and academic details for the signed-in teacher.',
  },
  {
    path: '/teacher/classes',
    title: 'My Classes',
    description: 'Classes and subjects assigned to the signed-in teacher.',
  },
  {
    path: '/teacher/students',
    title: 'My Students',
    description: 'Students enrolled in the teacher’s assigned classes.',
  },
  {
    path: '/teacher/schedule',
    title: 'Teaching Schedule',
    description: 'Weekly teaching timetable by class, subject, and room.',
  },
  {
    path: '/teacher/materials',
    title: 'Learning Materials',
    description: 'Lesson plans and learning materials shared with assigned classes.',
  },
  {
    path: '/teacher/leaves',
    title: 'Student Leave Requests',
    description: 'Leave requested by students in the teacher’s classes and its approval status.',
  },
  {
    path: '/teacher/workload',
    title: 'Teaching Workload',
    description: 'Assigned teaching hours, utilisation, and class load breakdown.',
  },
  {
    path: '/teacher/attendance',
    title: 'Take Attendance',
    description: 'Record daily attendance for an assigned class and section.',
  },
  {
    path: '/teacher/assignments',
    title: 'Assignments',
    description: 'Assigned homework, submission counts, and pending reviews.',
  },
  {
    path: '/teacher/exams',
    title: 'Examinations',
    description: 'Examination schedule and entered marks for assigned classes.',
  },
  {
    path: '/teacher/reports',
    title: 'Teaching Reports',
    description: 'Attendance, grade averages, and workload across assigned classes.',
  },
  {
    path: '/teacher/subjects',
    title: 'My Subjects',
    description: 'Subjects taught by the signed-in teacher and their classes.',
  },
  {
    path: '/teacher/attendance-history',
    title: 'Attendance History',
    description: 'Recorded student attendance across the teacher’s classes.',
  },
  {
    path: '/teacher/attendance-reports',
    title: 'Attendance Reports',
    description: 'Attendance analysis by class for the teacher’s assigned classes.',
  },
  {
    path: '/teacher/submissions',
    title: 'Student Submissions',
    description: 'Review, grade, and comment on submitted student work.',
  },
  {
    path: '/teacher/grades',
    title: 'Enter Marks',
    description: 'Record examination marks for students in assigned classes.',
  },
  {
    path: '/teacher/results',
    title: 'Result History',
    description: 'Examination results recorded across the teacher’s classes.',
  },
  {
    path: '/teacher/announcements',
    title: 'Announcements',
    description: 'Class and school announcements for the teacher’s students.',
  },
  {
    path: '/teacher/settings',
    title: 'Portal Settings',
    description: 'Appearance, language, and account security settings.',
  },
  {
    path: '/employee',
    title: 'Employee Portal',
    description: 'Employee dashboard with attendance, leave, payslips, and HR documents.',
  },
  {
    path: '/employee/profile',
    title: 'Employment Profile',
    description: 'Employment details, department, designation, and contact information.',
  },
  {
    path: '/employee/attendance',
    title: 'My Attendance',
    description: 'Employee attendance history, working days, and monthly summary.',
  },
  {
    path: '/employee/leaves',
    title: 'Leave',
    description: 'Apply for leave and track leave requests and approval status.',
  },
  {
    path: '/employee/tasks',
    title: 'Tasks & Schedule',
    description: 'Work assigned to the employee and their weekly timetable.',
  },
  {
    path: '/employee/expenses',
    title: 'Expense Claims',
    description: 'Submit reimbursable expenses and follow approval status.',
  },
  {
    path: '/employee/performance',
    title: 'Performance',
    description: 'Appraisal rating, attendance, and review schedule for the employee.',
  },
  {
    path: '/employee/payslips',
    title: 'Payslips',
    description: 'Salary details, payslips, allowances, deductions, and payment status.',
  },
  {
    path: '/employee/documents',
    title: 'My Documents',
    description: 'Employment contracts, certificates, and HR documents.',
  },
  {
    path: '/employee/document-requests',
    title: 'Document Requests',
    description: 'Request employment letters and HR documents and track their progress.',
  },
  {
    path: '/employee/check-in',
    title: 'Check In / Out',
    description: 'Record daily attendance check-in and check-out from the portal.',
  },
  {
    path: '/employee/hours',
    title: 'Working Hours',
    description: 'Hours worked per day calculated from attendance records.',
  },
  {
    path: '/employee/holidays',
    title: 'Holidays',
    description: 'School holidays published for staff and employees.',
  },
  {
    path: '/employee/shifts',
    title: 'My Shift',
    description: 'Assigned shift, contract terms, and weekly working schedule.',
  },
  {
    path: '/employee/schedule',
    title: 'My Schedule',
    description: 'Weekly timetable and duty slots assigned to the employee.',
  },
  {
    path: '/employee/requests',
    title: 'HR Requests',
    description: 'Raise HR and workplace requests and track their status.',
  },
  {
    path: '/employee/announcements',
    title: 'Announcements',
    description: 'School announcements published for staff and employees.',
  },
  {
    path: '/employee/settings',
    title: 'Portal Settings',
    description: 'Appearance, language, and account security settings.',
  },
  {
    path: '/leave',
    title: 'Leave Portal',
    description: 'Standalone leave portal for students and employees with requests, approvals, and holidays.',
  },
  {
    path: '/leave/requests',
    title: 'My Leave Requests',
    description: 'Submit leave requests, review approval status, and keep a full leave history.',
  },
  {
    path: '/leave/approvals',
    title: 'Leave Approvals',
    description: 'Review and approve or reject student and employee leave requests routed to you.',
  },
  {
    path: '/leave/holidays',
    title: 'Holidays',
    description: 'Published holidays for leave planning, including recurring annual closures.',
  },
  {
    path: '/leave/settings',
    title: 'Leave Portal Settings',
    description: 'Appearance, language, and account security settings for the Leave portal.',
  },
  {
    path: '/hr/designations',
    title: 'Designations',
    description: 'Designation directory with headcount, departments, and salary bands derived from staff and teacher records.',
  },
  {
    path: '/hr/contracts',
    title: 'Contracts',
    description: 'Employment contract register with expiry tracking for staff and teachers.',
  },
  {
    path: '/hr/payroll',
    title: 'Payroll',
    description: 'Salary register with allowances, deductions, net pay, and payment status by period.',
  },
  {
    path: '/finance/fee-structures',
    title: 'Fee Structures',
    description: 'Define fees by fee type, program, class, academic year, amount, and due day.',
  },
  {
    path: '/finance/student-fees',
    title: 'Student Fees',
    description: 'Student billing overview with invoiced, paid, and outstanding balances.',
  },
  {
    path: '/finance/expenses',
    title: 'Expenses',
    description: 'Record and review operating expenses with vendor, category, and approval status.',
  },
  {
    path: '/finance/income',
    title: 'Income',
    description: 'Income register of fee payments with method, type, and six-month trend.',
  },
  {
    path: '/finance/accounts',
    title: 'Accounts',
    description: 'Cash and bank positions with account list and payment and expense movement.',
  },
  {
    path: '/finance/vouchers',
    title: 'Vouchers',
    description: 'Receipt, payment, and journal vouchers in one register.',
  },
  {
    path: '/finance/chart-of-accounts',
    title: 'Chart of Accounts',
    description: 'Manage the chart of accounts with type, normal balance, and hierarchy.',
  },
  {
    path: '/reports/finance',
    title: 'Finance Reports',
    description: 'Collected income, expenses, net position, outstanding fees, and monthly trends.',
  },
  {
    path: '/organization/academic-years',
    title: 'Academic Years',
    description: 'Manage academic years, the current session, terms, and enrollment counts.',
  },
  {
    path: '/organization/terms',
    title: 'Terms & Semesters',
    description: 'Define semester terms within each academic year with start and end dates.',
  },
  {
    path: '/organization/departments',
    title: 'Departments',
    description: 'Manage departments with heads, subject counts, and contact details.',
  },
  {
    path: '/academic/subjects',
    title: 'Subjects',
    description: 'Subject catalogue mapped to departments, credits, and class schedules.',
  },
  {
    path: '/academic/classrooms',
    title: 'Classrooms',
    description: 'Rooms and classrooms with capacity and scheduled lesson counts.',
  },
  {
    path: '/academic/exams',
    title: 'Exams',
    description: 'Exam calendar with marks, passing thresholds, status, and grading progress.',
  },
  {
    path: '/academic/timetable',
    title: 'Timetable',
    description: 'Weekly class timetable with subjects, teachers, rooms, and lesson times.',
  },
  {
    path: '/academic/teachers',
    title: 'Teachers',
    description: 'Teaching directory with subjects, classes, and department assignments.',
  },
  {
    path: '/academic/enrollment',
    title: 'Enrollment',
    description: 'Students mapped to classes and academic years with enrollment status.',
  },
  {
    path: '/academic/certificates',
    title: 'Certificates',
    description: 'Issue and track student certificates with certificate numbers and status.',
  },
  {
    path: '/admissions/applications',
    title: 'Applications',
    description: 'Admission pipeline of new leads with contact details and follow-up dates.',
  },
  {
    path: '/admissions/enrollment',
    title: 'Admissions Enrollment',
    description: 'Convert admitted applicants into class enrollments for the academic year.',
  },
  {
    path: '/admissions/transfers',
    title: 'Transfers',
    description: 'Record students transferring in and out with direction, institution, and reason.',
  },
  {
    path: '/admissions/waiting-list',
    title: 'Waiting List',
    description: 'Applicants still waiting for a seat, with days waiting and follow-up status.',
  },
  {
    path: '/reports/academic',
    title: 'Academic Reports',
    description: 'Exam averages, pass rates, grade distribution, and class performance.',
  },
  {
    path: '/reports/attendance',
    title: 'Attendance Reports',
    description: 'Present, absent, and late trends with a class-by-class breakdown.',
  },
  {
    path: '/reports/hr',
    title: 'HR Reports',
    description: 'Headcount, department mix, leave usage, and payroll trends across staff.',
  },
  {
    path: '/reports/students',
    title: 'Student Reports',
    description: 'Enrollment totals, class and program distribution, attendance, and grades.',
  },
  {
    path: '/system/general',
    title: 'General Settings',
    description: 'Institute identity and contact details used across the app and public pages.',
  },
  {
    path: '/system/finance',
    title: 'Finance Settings',
    description: 'Currency, fiscal year, invoice numbering, tax, and payment policies.',
  },
  {
    path: '/system/academic',
    title: 'Academic Settings',
    description: 'Grading scale, passing marks, attendance thresholds, and enrollment rules.',
  },
  {
    path: '/system/integrations',
    title: 'Integrations',
    description: 'Manage API keys and webhooks that connect the institute to external systems.',
  },
  {
    path: '/system/languages',
    title: 'Languages',
    description: 'Default language, enabled languages, and translation options.',
  },
  {
    path: '/system/localization',
    title: 'Localization',
    description: 'Date, time, timezone, number format, week start, and right-to-left layout.',
  },
  {
    path: '/system/notifications',
    title: 'Notification Settings',
    description: 'Delivery channels, alert categories, and message templates for the institute.',
  },
  {
    path: '/inventory/suppliers',
    title: 'Suppliers',
    description: 'Manage inventory suppliers, their contact details, and purchase history.',
  },
  {
    path: '/inventory/purchases',
    title: 'Purchases',
    description: 'Create purchase orders from suppliers and receive goods into inventory stock.',
  },
  {
    path: '/inventory/adjustments',
    title: 'Stock Adjustments',
    description: 'Correct inventory quantities after physical counts, damage, loss, or data errors.',
  },
] as const;

export type PrivateAppPagePath = (typeof PRIVATE_APP_PAGES)[number]['path'];
