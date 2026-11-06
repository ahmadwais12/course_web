import type { Metadata } from 'next';
import {
  Activity,
  ArrowLeftRight,
  Archive,
  Award,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  BellRing,
  Bot,
  BookMarked,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Coins,
  Contact,
  CreditCard,
  DoorOpen,
  FileInput,
  FileSignature,
  FileText,
  FolderKanban,
  FolderTree,
  Gem,
  GitBranch,
  Globe,
  GraduationCap,
  Group,
  Headphones,
  History,
  Hourglass,
  IdCard,
  Inbox,
  KeyRound,
  Landmark,
  Languages,
  Layers,
  LayoutDashboard,
  Library,
  LineChart,
  ListTree,
  Mail,
  Megaphone,
  MessageSquare,
  MessageSquarePlus,
  MessageSquareText,
  MessagesSquare,
  Network,
  Package,
  PackageMinus,
  PackagePlus,
  PhoneCall,
  PieChart,
  Plug,
  Presentation,
  Receipt,
  Ruler,
  School,
  ScrollText,
  Settings,
  Share2,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Ticket,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  UserCog,
  UserPlus,
  UserSearch,
  UserX,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { privateAppPageMetadata } from '@/lib/seo';

export type NavLabel = Record<Language, string>;

export type SidebarItem = {
  href: string;
  icon: LucideIcon;
  label: NavLabel;
  /** Only highlight on an exact pathname match (parent routes with sibling items). */
  exact?: boolean;
  /** Set only for modules without a page yet — rendered by `ModulePlaceholder`. */
  description?: string;
  /** Hidden unless `/api/ai/status` grants this access (the API enforces it regardless). */
  requires?: 'ai' | 'aiOrgAdmin' | 'aiPlatformAdmin';
};

export type SidebarSection = {
  id: string;
  icon: LucideIcon;
  label: NavLabel;
  /** Ability required to see the section (see `usePermissions().can`). */
  permission?: string;
  items: SidebarItem[];
};

export const DASHBOARD_NAV_ITEM: SidebarItem = {
  href: '/dashboard',
  icon: LayoutDashboard,
  label: { en: 'Dashboard', dr: 'داشبورد', ps: 'داشبورډ' },
};

export const AI_ASSISTANT_NAV_ITEM: SidebarItem = {
  href: '/ai-assistant',
  icon: Sparkles,
  label: { en: 'AI Assistant', dr: 'دستیار هوش مصنوعی', ps: 'د مصنوعي ځيرکتيا مرستندوی' },
  exact: true,
  requires: 'ai',
};

/** Section segments that group modules but have no index page of their own. */
export const NAV_GROUP_PREFIXES = [
  '/organization',
  '/academic',
  '/admissions',
  '/finance',
  '/hr',
  '/communication',
  '/system',
] as const;

const departments: SidebarItem = {
  href: '/organization/departments',
  icon: Network,
  label: { en: 'Departments', dr: 'دیپارتمنت‌ها', ps: 'دیپارټمنټونه' },
  description: 'Define institute departments and assign staff and programs to them.',
};

const financeReports: SidebarItem = {
  href: '/reports/finance',
  icon: LineChart,
  label: { en: 'Finance Reports', dr: 'گزارشات مالی', ps: 'مالي راپورونه' },
  description: 'Fee collection, income, expense, and balance reports.',
};

const hrReports: SidebarItem = {
  href: '/reports/hr',
  icon: PieChart,
  label: { en: 'HR Reports', dr: 'گزارشات منابع بشری', ps: 'د بشري منابعو راپورونه' },
  description: 'Headcount, staff attendance, leave, and payroll reports.',
};

const inventoryReports: SidebarItem = {
  href: '/reports/inventory',
  icon: BarChart3,
  label: { en: 'Inventory Reports', dr: 'گزارشات انبار', ps: 'د ګدام راپورونه' },
};

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'organization',
    icon: Building2,
    label: { en: 'Organization', dr: 'سازمان', ps: 'سازمان' },
    items: [
      {
        href: '/business',
        icon: Building2,
        label: { en: 'Business / Institute', dr: 'کسب‌وکار / مؤسسه', ps: 'سوداګري / مؤسسه' },
        exact: true,
      },
      {
        href: '/business/branches',
        icon: GitBranch,
        label: { en: 'Branches', dr: 'شعبه‌ها', ps: 'څانګې' },
      },
      departments,
      {
        href: '/organization/academic-years',
        icon: CalendarRange,
        label: { en: 'Academic Years', dr: 'سال‌های تعلیمی', ps: 'تعلیمي کلونه' },
        description: 'Create academic years and mark the current active year.',
      },
      {
        href: '/organization/terms',
        icon: CalendarClock,
        label: { en: 'Terms / Semesters', dr: 'ترم‌ها / سمسترها', ps: 'ترمونه / سمسټرونه' },
        description: 'Split each academic year into terms or semesters with start and end dates.',
      },
      {
        href: '/settings',
        icon: Settings,
        label: { en: 'Settings', dr: 'تنظیمات', ps: 'ترتیبات' },
      },
      {
        href: '/ai-assistant/settings',
        icon: Bot,
        label: { en: 'AI Settings', dr: 'تنظیمات هوش مصنوعی', ps: 'د مصنوعي ځيرکتيا ترتیبات' },
        requires: 'aiOrgAdmin',
      },
      {
        href: '/ports/business-types',
        icon: FolderTree,
        label: { en: 'Business Types', dr: 'انواع کسب‌وکار', ps: 'د سوداګرۍ ډولونه' },
      },
    ],
  },
  {
    id: 'academic',
    icon: GraduationCap,
    label: { en: 'Academic', dr: 'تعلیمی', ps: 'تعلیمي' },
    items: [
      {
        href: '/courses',
        icon: BookOpen,
        label: { en: 'Programs / Courses', dr: 'برنامه‌ها / کورس‌ها', ps: 'پروګرامونه / کورسونه' },
      },
      {
        href: '/academic/subjects',
        icon: Library,
        label: { en: 'Subjects', dr: 'مضامین', ps: 'مضمونونه' },
        description: 'Manage subjects taught across programs, levels, and classes.',
      },
      {
        href: '/ports/student-levels',
        icon: Layers,
        label: { en: 'Levels / Grades', dr: 'سطوح / درجه‌ها', ps: 'کچې / درجې' },
      },
      {
        href: '/classes',
        icon: School,
        label: { en: 'Classes', dr: 'صنوف', ps: 'ټولګي' },
      },
      {
        href: '/ports/classes',
        icon: Group,
        label: { en: 'Sections / Groups', dr: 'بخش‌ها / گروپ‌ها', ps: 'برخې / ډلې' },
      },
      {
        href: '/academic/classrooms',
        icon: DoorOpen,
        label: { en: 'Classrooms', dr: 'اتاق‌های درسی', ps: 'درسي خونې' },
        description: 'Manage physical classrooms, capacity, and room availability.',
      },
      {
        href: '/academic/timetable',
        icon: CalendarDays,
        label: { en: 'Timetable', dr: 'تقسیم اوقات', ps: 'مهالوېش' },
        description: 'Build weekly class timetables by teacher, classroom, and section.',
      },
      {
        href: '/academic/teachers',
        icon: Presentation,
        label: { en: 'Teachers', dr: 'استادان', ps: 'ښوونکي' },
        description: 'Manage teachers, their subjects, and class assignments.',
      },
      {
        href: '/students',
        icon: Users,
        label: { en: 'Students', dr: 'شاگردان', ps: 'زدکونکي' },
        exact: true,
      },
      {
        href: '/academic/enrollment',
        icon: UserCheck,
        label: { en: 'Enrollment', dr: 'ثبت‌نام', ps: 'نوم‌لیکنه' },
        description: 'Enroll students into programs, classes, and sections for a term.',
      },
      {
        href: '/attendance',
        icon: CalendarCheck,
        label: { en: 'Attendance', dr: 'حاضری', ps: 'حاضري' },
      },
      {
        href: '/academic/exams',
        icon: FileSignature,
        label: { en: 'Exams', dr: 'امتحانات', ps: 'ازموینې' },
        description: 'Schedule exams, define exam types, and manage exam sessions.',
      },
      {
        href: '/grades',
        icon: ClipboardList,
        label: { en: 'Results', dr: 'نتایج', ps: 'پایلې' },
      },
      {
        href: '/academic/certificates',
        icon: Award,
        label: { en: 'Certificates', dr: 'شهادت‌نامه‌ها', ps: 'سندونه' },
        description: 'Design and issue completion certificates to students.',
      },
      {
        href: '/ports/programs',
        icon: SlidersHorizontal,
        label: { en: 'Program Setup', dr: 'تنظیم برنامه‌ها', ps: 'د پروګرام تنظیم' },
      },
      {
        href: '/ports/durations',
        icon: Timer,
        label: { en: 'Durations', dr: 'مدت‌ها', ps: 'مودې' },
      },
      {
        href: '/books',
        icon: BookMarked,
        label: { en: 'Library Books', dr: 'کتاب‌ها', ps: 'کتابونه' },
      },
    ],
  },
  {
    id: 'admissions',
    icon: UserPlus,
    label: { en: 'Admissions', dr: 'پذیرش', ps: 'داخلې' },
    items: [
      {
        href: '/admissions/applications',
        icon: FileInput,
        label: { en: 'Applications', dr: 'درخواست‌ها', ps: 'غوښتنلیکونه' },
        description: 'Review incoming admission applications and their status.',
      },
      {
        href: '/students/create',
        icon: UserPlus,
        label: { en: 'Admission', dr: 'پذیرش شاگرد', ps: 'د زده‌کوونکي داخله' },
        exact: true,
      },
      {
        href: '/admissions/enrollment',
        icon: ClipboardCheck,
        label: { en: 'Student Enrollment', dr: 'ثبت‌نام شاگردان', ps: 'د زده‌کوونکو نوم‌لیکنه' },
        description: 'Convert accepted applications into enrolled students.',
      },
      {
        href: '/admissions/waiting-list',
        icon: Hourglass,
        label: { en: 'Waiting List', dr: 'لست انتظار', ps: 'د انتظار لست' },
        description: 'Track applicants waiting for an open seat in a program or class.',
      },
      {
        href: '/admissions/transfers',
        icon: ArrowLeftRight,
        label: { en: 'Transfers', dr: 'انتقالات', ps: 'لېږدونه' },
        description: 'Handle student transfers between branches, classes, and institutes.',
      },
    ],
  },
  {
    id: 'finance',
    icon: Landmark,
    label: { en: 'Finance', dr: 'مالی', ps: 'مالي' },
    items: [
      {
        href: '/finance/fee-structures',
        icon: ListTree,
        label: { en: 'Fee Structures', dr: 'ساختار فیس‌ها', ps: 'د فیسونو جوړښت' },
        description: 'Define fee plans per program, level, and term.',
      },
      {
        href: '/finance/student-fees',
        icon: Receipt,
        label: { en: 'Student Fees', dr: 'فیس شاگردان', ps: 'د زده‌کوونکو فیسونه' },
        description: 'Assign fees to students and track dues, discounts, and balances.',
      },
      {
        href: '/payments',
        icon: CreditCard,
        label: { en: 'Payments', dr: 'پرداخت‌ها', ps: 'تادیات' },
      },
      {
        href: '/finance/expenses',
        icon: TrendingDown,
        label: { en: 'Expenses', dr: 'مصارف', ps: 'لګښتونه' },
        description: 'Record and categorize institute expenses.',
      },
      {
        href: '/finance/income',
        icon: TrendingUp,
        label: { en: 'Income', dr: 'عواید', ps: 'عواید' },
        description: 'Record income from fees and other revenue sources.',
      },
      {
        href: '/finance/accounts',
        icon: Wallet,
        label: { en: 'Accounts', dr: 'حساب‌ها', ps: 'حسابونه' },
        description: 'Manage cash, bank, and ledger accounts with running balances.',
      },
      {
        href: '/finance/vouchers',
        icon: FileText,
        label: { en: 'Vouchers', dr: 'واوچرها', ps: 'واوچرونه' },
        description: 'Create payment, receipt, and journal vouchers.',
      },
      {
        href: '/finance/chart-of-accounts',
        icon: FolderTree,
        label: { en: 'Chart of Accounts', dr: 'جدول حساب‌ها', ps: 'د حسابونو چارټ' },
        description: 'Organize accounts into assets, liabilities, equity, income, and expenses.',
      },
      { ...financeReports, label: { en: 'Financial Reports', dr: 'گزارشات مالی', ps: 'مالي راپورونه' } },
    ],
  },
  {
    id: 'hr',
    icon: Briefcase,
    label: { en: 'HR', dr: 'منابع بشری', ps: 'بشري منابع' },
    items: [
      {
        href: '/hr/staff',
        icon: UserSearch,
        label: { en: 'Employees', dr: 'کارمندان', ps: 'کارکوونکي' },
      },
      departments,
      {
        href: '/hr/designations',
        icon: IdCard,
        label: { en: 'Designations', dr: 'بست‌ها', ps: 'بستونه' },
        description: 'Manage job titles and designations for employees.',
      },
      {
        href: '/hr/contracts',
        icon: FileSignature,
        label: { en: 'Contracts', dr: 'قراردادها', ps: 'قراردادونه' },
        description: 'Track employee contracts, terms, and renewal dates.',
      },
      {
        href: '/hr/attendance',
        icon: CalendarCheck,
        label: { en: 'Attendance', dr: 'حاضری', ps: 'حاضري' },
      },
      {
        href: '/leaves',
        icon: CalendarOff,
        label: { en: 'Leave', dr: 'رخصتی', ps: 'رخصتي' },
      },
      {
        href: '/hr/payroll',
        icon: Banknote,
        label: { en: 'Payroll', dr: 'لیست معاشات', ps: 'د معاشونو لړلیک' },
        description: 'Run monthly payroll with allowances, deductions, and payslips.',
      },
      {
        href: '/salaries',
        icon: Coins,
        label: { en: 'Salaries', dr: 'معاشات', ps: 'معاشونه' },
      },
      hrReports,
      {
        href: '/hr/recruitment',
        icon: UserPlus,
        label: { en: 'Recruitment', dr: 'استخدام', ps: 'استخدام' },
      },
      {
        href: '/compliance',
        icon: BadgeCheck,
        label: { en: 'Compliance', dr: 'تطبیق', ps: 'تطبیق' },
      },
    ],
  },
  {
    id: 'inventory',
    icon: Boxes,
    label: { en: 'Inventory', dr: 'انبار', ps: 'ګدام' },
    items: [
      {
        href: '/inventory',
        icon: LayoutDashboard,
        label: { en: 'Inventory Dashboard', dr: 'داشبورد انبار', ps: 'د ګدام داشبورډ' },
        exact: true,
      },
      {
        href: '/inventory/assets',
        icon: Archive,
        label: { en: 'Assets', dr: 'دارایی‌ها', ps: 'شتمنۍ' },
      },
      {
        href: '/inventory/projects',
        icon: FolderKanban,
        label: { en: 'Projects', dr: 'پروژه‌ها', ps: 'پروژې' },
      },
      {
        href: '/inventory/holders',
        icon: Contact,
        label: { en: 'Asset Holders', dr: 'نگهدارنده‌ها', ps: 'د شتمنۍ ساتونکي' },
      },
      {
        href: '/inventory/properties',
        icon: SlidersHorizontal,
        label: { en: 'Asset Properties', dr: 'ویژگی‌های دارایی', ps: 'د شتمنۍ ځانګړتیاوې' },
      },
      {
        href: '/inventory/assets/trash',
        icon: Trash2,
        label: { en: 'Asset Trash', dr: 'زباله دارایی', ps: 'د شتمنۍ کثافات' },
      },
      {
        href: '/inventory/items',
        icon: Package,
        label: { en: 'Inventory Items', dr: 'اقلام انبار', ps: 'د ګدام توکي' },
      },
      {
        href: '/inventory/categories',
        icon: Tags,
        label: { en: 'Categories', dr: 'دسته‌بندی‌ها', ps: 'کټګورۍ' },
      },
      {
        href: '/inventory/units',
        icon: Ruler,
        label: { en: 'Units', dr: 'واحدها', ps: 'واحدونه' },
      },
      {
        href: '/inventory/warehouses',
        icon: Warehouse,
        label: { en: 'Warehouses', dr: 'گدام‌ها', ps: 'ګدامونه' },
      },
      {
        href: '/inventory/suppliers',
        icon: Truck,
        label: { en: 'Suppliers', dr: 'تأمین‌کنندگان', ps: 'عرضه کوونکي' },
        description: 'Manage suppliers and their contact details.',
      },
      {
        href: '/inventory/purchases',
        icon: ShoppingCart,
        label: { en: 'Purchase', dr: 'خریداری', ps: 'پېرود' },
        description: 'Create purchase orders and receive goods from suppliers.',
      },
      {
        href: '/inventory/stock-in',
        icon: PackagePlus,
        label: { en: 'Stock In', dr: 'ورود اجناس', ps: 'د توکو راتګ' },
      },
      {
        href: '/inventory/stock-out',
        icon: PackageMinus,
        label: { en: 'Stock Out', dr: 'خروج اجناس', ps: 'د توکو وتل' },
      },
      {
        href: '/inventory/transfers',
        icon: ArrowLeftRight,
        label: { en: 'Transfers', dr: 'انتقالات', ps: 'لېږدونه' },
      },
      {
        href: '/inventory/adjustments',
        icon: SlidersHorizontal,
        label: { en: 'Adjustments', dr: 'تعدیلات', ps: 'سمونې' },
        description: 'Correct stock quantities after counts, damage, or loss.',
      },
      inventoryReports,
    ],
  },
  {
    id: 'communication',
    icon: MessagesSquare,
    label: { en: 'Communication', dr: 'ارتباطات', ps: 'اړیکې' },
    items: [
      {
        href: '/communication/announcements',
        icon: Megaphone,
        label: { en: 'Announcements', dr: 'اعلانات', ps: 'اعلانونه' },
      },
      {
        href: '/notifications',
        icon: Bell,
        label: { en: 'Notifications', dr: 'اعلان‌ها', ps: 'خبرتیاوې' },
      },
      {
        href: '/communication/sms',
        icon: MessageSquareText,
        label: { en: 'SMS', dr: 'پیام کوتاه', ps: 'لنډ پیغام' },
      },
      {
        href: '/communication/email',
        icon: Mail,
        label: { en: 'Email', dr: 'ایمیل', ps: 'برېښنالیک' },
      },
      {
        href: '/messaging',
        icon: MessagesSquare,
        label: { en: 'Messages', dr: 'پیام‌ها', ps: 'پیغامونه' },
      },
      {
        href: '/support',
        icon: Headphones,
        label: { en: 'Support Overview', dr: 'نمای کلی پشتیبانی', ps: 'د ملاتړ عمومي کتنه' },
        exact: true,
      },
      {
        href: '/support/call-center',
        icon: PhoneCall,
        label: { en: 'Call Center', dr: 'مرکز تماس', ps: 'د زنګ مرکز' },
      },
      {
        href: '/support/tickets',
        icon: Ticket,
        label: { en: 'Support Tickets', dr: 'تکت‌های پشتیبانی', ps: 'د ملاتړ ټکټونه' },
      },
      {
        href: '/support/messages',
        icon: Inbox,
        label: { en: 'Support Inbox', dr: 'صندوق پشتیبانی', ps: 'د ملاتړ صندوق' },
      },
      {
        href: '/support/social',
        icon: Share2,
        label: { en: 'Social Media', dr: 'رسانه‌های اجتماعی', ps: 'ټولنیزې رسنۍ' },
      },
      {
        href: '/feedback',
        icon: MessageSquare,
        label: { en: 'Feedback', dr: 'بازخورد', ps: 'فیډبیک' },
      },
      {
        href: '/ports/messaging-types',
        icon: MessageSquarePlus,
        label: { en: 'Messaging Types', dr: 'انواع پیام‌رسانی', ps: 'د پیغام ډولونه' },
      },
    ],
  },
  {
    id: 'reports',
    icon: BarChart3,
    label: { en: 'Reports', dr: 'گزارشات', ps: 'راپورونه' },
    items: [
      {
        href: '/reports/academic',
        icon: GraduationCap,
        label: { en: 'Academic Reports', dr: 'گزارشات تعلیمی', ps: 'تعلیمي راپورونه' },
        description: 'Program, class, exam, and result reports.',
      },
      {
        href: '/reports/students',
        icon: Users,
        label: { en: 'Student Reports', dr: 'گزارشات شاگردان', ps: 'د زده‌کوونکو راپورونه' },
        description: 'Student enrollment, profile, and progress reports.',
      },
      {
        href: '/reports/attendance',
        icon: CalendarCheck,
        label: { en: 'Attendance Reports', dr: 'گزارشات حاضری', ps: 'د حاضرۍ راپورونه' },
        description: 'Daily, monthly, and per-class attendance reports.',
      },
      financeReports,
      hrReports,
      inventoryReports,
      {
        href: '/reports',
        icon: FileText,
        label: { en: 'All Reports', dr: 'همه گزارشات', ps: 'ټول راپورونه' },
        exact: true,
      },
      {
        href: '/observers',
        icon: Activity,
        label: { en: 'System Viewer', dr: 'بیننده سیستم', ps: 'سیسټم لیدونکی' },
        exact: true,
        description: 'Website, mobile app, and desktop EXE visitors with session details.',
      },
    ],
  },
  {
    id: 'users-security',
    icon: UserCog,
    label: { en: 'Users & Security', dr: 'کاربران و امنیت', ps: 'کاروونکي او امنیت' },
    permission: 'Team',
    items: [
      {
        href: '/users',
        icon: Users,
        label: { en: 'Users', dr: 'کاربران', ps: 'کاروونکي' },
        exact: true,
      },
      {
        href: '/users/roles',
        icon: Shield,
        label: { en: 'Roles', dr: 'نقش‌ها', ps: 'رولونه' },
      },
      {
        href: '/users/permissions',
        icon: KeyRound,
        label: { en: 'Permissions', dr: 'مجوزها', ps: 'اجازې' },
      },
      {
        href: '/logs',
        icon: ScrollText,
        label: { en: 'Activity Logs', dr: 'گزارش فعالیت‌ها', ps: 'د فعالیتونو لوګونه' },
      },
      {
        href: '/users/login-history',
        icon: History,
        label: { en: 'Login History', dr: 'تاریخچه ورود', ps: 'د ننوتلو تاریخچه' },
        description: 'Review sign-in history by user, device, and IP address.',
      },
      {
        href: '/users/deletion-requests',
        icon: UserX,
        label: { en: 'Deletion Requests', dr: 'درخواست‌های حذف حساب', ps: 'د حساب د ړنګولو غوښتنې' },
      },
      {
        href: '/observers/directory',
        icon: Contact,
        label: { en: 'Visitors', dr: 'بازدیدکنندگان', ps: 'لیدونکي' },
        description: 'Who opened the website, mobile app, or desktop EXE, with session details.',
      },
      {
        href: '/trash',
        icon: Trash2,
        label: { en: 'Trash', dr: 'سطل زباله', ps: 'کثافات' },
      },
    ],
  },
  {
    id: 'system',
    icon: Cog,
    label: { en: 'System', dr: 'سیستم', ps: 'سیسټم' },
    items: [
      {
        href: '/system/general',
        icon: Settings,
        label: { en: 'General Settings', dr: 'تنظیمات عمومی', ps: 'عمومي ترتیبات' },
        description: 'Institute name, contact details, branding, and defaults.',
      },
      {
        href: '/system/localization',
        icon: Globe,
        label: { en: 'Localization', dr: 'بومی‌سازی', ps: 'محلي کول' },
        description: 'Time zone, date format, currency, and calendar preferences.',
      },
      {
        href: '/system/languages',
        icon: Languages,
        label: { en: 'Languages', dr: 'زبان‌ها', ps: 'ژبې' },
        description: 'Enable interface languages and manage translations.',
      },
      {
        href: '/system/academic',
        icon: GraduationCap,
        label: { en: 'Academic Settings', dr: 'تنظیمات تعلیمی', ps: 'تعلیمي ترتیبات' },
        description: 'Grading scales, pass marks, and attendance rules.',
      },
      {
        href: '/system/finance',
        icon: Landmark,
        label: { en: 'Finance Settings', dr: 'تنظیمات مالی', ps: 'مالي ترتیبات' },
        description: 'Currencies, tax, invoice numbering, and payment methods.',
      },
      {
        href: '/system/notifications',
        icon: BellRing,
        label: { en: 'Notification Settings', dr: 'تنظیمات اعلان‌ها', ps: 'د خبرتیاوو ترتیبات' },
        description: 'Choose which events send in-app, SMS, and email notifications.',
      },
      {
        href: '/ports/plans',
        icon: Gem,
        label: { en: 'Subscription / Plan', dr: 'اشتراک / پلان', ps: 'ګډون / پلان' },
      },
      {
        href: '/system/integrations',
        icon: Plug,
        label: { en: 'Integrations', dr: 'ادغام‌ها', ps: 'یوځای کېدنې' },
        description: 'Connect SMS gateways, email providers, and payment services.',
      },
      {
        href: '/system/ai',
        icon: Bot,
        label: { en: 'AI Management', dr: 'مدیریت هوش مصنوعی', ps: 'د مصنوعي ځيرکتيا مدیریت' },
        requires: 'aiPlatformAdmin',
      },
    ],
  },
];

export function isNavItemActive(pathname: string, item: Pick<SidebarItem, 'href' | 'exact'>) {
  if (pathname === item.href) return true;
  return !item.exact && pathname.startsWith(`${item.href}/`);
}

export function findNavItem(href: string): SidebarItem | undefined {
  for (const section of SIDEBAR_SECTIONS) {
    const item = section.items.find((i) => i.href === href);
    if (item) return item;
  }
  return undefined;
}

export function findNavSection(href: string): SidebarSection | undefined {
  return SIDEBAR_SECTIONS.find((section) => section.items.some((i) => i.href === href));
}

/** Modules listed in the sidebar that do not have a page yet. */
export function findPlannedNavItem(href: string): SidebarItem | undefined {
  const item = findNavItem(href);
  return item?.description ? item : undefined;
}

/** `generateStaticParams` for a `[slug]` placeholder route under `prefix` (e.g. `/finance`). */
export function plannedModuleParams(prefix: string): { slug: string }[] {
  const seen = new Set<string>();
  for (const section of SIDEBAR_SECTIONS) {
    for (const item of section.items) {
      if (!item.description || !item.href.startsWith(`${prefix}/`)) continue;
      const slug = item.href.slice(prefix.length + 1);
      if (!slug.includes('/')) seen.add(slug);
    }
  }
  return [...seen].map((slug) => ({ slug }));
}

export function plannedModuleMetadata(path: string): Metadata {
  const item = findPlannedNavItem(path);
  return privateAppPageMetadata(
    item?.label.en ?? 'Module',
    item?.description ?? 'This DreamFlow module is coming soon.',
    path
  );
}
