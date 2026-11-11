import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BadgeCheck,
  Banknote,
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Megaphone,
  MessageSquare,
  Receipt,
  School,
  ScrollText,
  Settings,
  Star,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import type { Language } from '@/lib/i18n';

export type PortalId = 'student' | 'teacher' | 'employee' | 'leave';

export type PortalNavItem = {
  href: string;
  label: Record<Language, string>;
  icon: LucideIcon;
  /** Route lives outside the portal (shared app page). */
  shared?: boolean;
};

export type PortalNavSection = {
  id: string;
  label: Record<Language, string>;
  icon: LucideIcon;
  items: PortalNavItem[];
};

export type PortalMeta = {
  id: PortalId;
  name: string;
  label: Record<Language, string>;
  shortName: Record<Language, string>;
  audience: Record<Language, string>;
  icon: LucideIcon;
  basePath: string;
  /** Tailwind accent classes — portal identity colors. */
  accentText: string;
  accentBg: string;
  accentSoft: string;
  accentBorder: string;
  accentGradient: string;
  nav: PortalNavSection[];
};

const MESSAGES: PortalNavItem = {
  href: '/messaging',
  label: { en: 'Messages', dr: 'پیام‌ها', ps: 'پیغامونه' },
  icon: MessageSquare,
  shared: true,
};

const NOTIFICATIONS: PortalNavItem = {
  href: '/notifications',
  label: { en: 'Notifications', dr: 'اطلاعیه‌ها', ps: 'خبرتیاوې' },
  icon: BadgeCheck,
  shared: true,
};

export const PORTALS: Record<PortalId, PortalMeta> = {
  student: {
    id: 'student',
    name: 'Student Portal',
    label: { en: 'Student Portal', dr: 'پورتال شاگرد', ps: 'د زده‌کوونکي پورتال' },
    shortName: { en: 'Student', dr: 'شاگرد', ps: 'زده‌کوونکی' },
    audience: { en: 'Your academics, attendance and fees', dr: 'تحصیل، حاضری او فیس', ps: 'زده‌کړې، حاضري او فیس' },
    icon: GraduationCap,
    basePath: '/student',
    accentText: 'text-sky-700 dark:text-sky-300',
    accentBg: 'bg-sky-600 hover:bg-sky-500',
    accentSoft: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200',
    accentBorder: 'border-sky-200 dark:border-sky-900',
    accentGradient: 'from-sky-500 via-blue-600 to-indigo-600',
    nav: [
      {
        id: 'overview',
        label: { en: 'Overview', dr: 'نمای کلی', ps: 'عمومي کتنه' },
        icon: LayoutDashboard,
        items: [
          { href: '/student', label: { en: 'Dashboard', dr: 'داشبورد', ps: 'داشبورډ' }, icon: LayoutDashboard },
          { href: '/student/profile', label: { en: 'My Profile', dr: 'پروفایل من', ps: 'زما پروفایل' }, icon: UserRound },
        ],
      },
      {
        id: 'academics',
        label: { en: 'Academics', dr: 'تحصیلی', ps: 'زده‌کړې' },
        icon: BookOpen,
        items: [
          { href: '/student/academics', label: { en: 'Courses & Subjects', dr: 'کورسونه او مضامین', ps: 'کورسونه او مضمونونه' }, icon: BookOpen },
          { href: '/student/enrollment', label: { en: 'Enrollment', dr: 'ثبت‌نام', ps: 'نوم‌لیکنه' }, icon: GraduationCap },
          { href: '/student/timetable', label: { en: 'Timetable', dr: 'تقسیم اوقات', ps: 'مهالوېش' }, icon: CalendarDays },
          { href: '/student/attendance', label: { en: 'Attendance', dr: 'حاضری', ps: 'حاضري' }, icon: CalendarCheck },
        ],
      },
      {
        id: 'services',
        label: { en: 'Student Services', dr: 'خدمات شاگرد', ps: 'د زده‌کوونکي خدمتونه' },
        icon: LifeBuoy,
        items: [
          { href: '/leave', label: { en: 'Leave Portal', dr: 'پورتال رخصتی', ps: 'د رخصتۍ پورتال' }, icon: CalendarDays },
          { href: '/student/progress', label: { en: 'Progress', dr: 'پیشرفت درسی', ps: 'زده‌کړیز پرمختګ' }, icon: TrendingUp },
          { href: '/student/placement-tests', label: { en: 'Placement Tests', dr: 'امتحان تعیین سطح', ps: 'د کچې ټاکلو ازموینه' }, icon: Target },
          { href: '/student/library', label: { en: 'Library', dr: 'کتابخانه', ps: 'کتابخانه' }, icon: BookMarked },
          { href: '/student/feedback', label: { en: 'Feedback', dr: 'بازخورد', ps: 'نظر' }, icon: Star },
        ],
      },
      {
        id: 'learning',
        label: { en: 'Learning', dr: 'یادگیری', ps: 'زده‌کړه' },
        icon: ClipboardList,
        items: [
          { href: '/student/assignments', label: { en: 'Assignments', dr: 'وظایف', ps: 'دندې' }, icon: ClipboardList },
          { href: '/student/submissions', label: { en: 'My Submissions', dr: 'سپارل‌شده کارونه', ps: 'زما سپارل شوي' }, icon: FileCheck },
          { href: '/student/materials', label: { en: 'Learning Materials', dr: 'مواد آموزشی', ps: 'زده‌کړیز مواد' }, icon: BookMarked },
          { href: '/student/exams', label: { en: 'Exams & Results', dr: 'امتحانات او نتایج', ps: 'ازموینې او پایلې' }, icon: Award },
          { href: '/student/results', label: { en: 'My Results', dr: 'نتایج من', ps: 'زما پایلې' }, icon: BarChart3 },
          { href: '/student/transcript', label: { en: 'Transcript', dr: 'ترانسکریپت', ps: 'ترانسکریپټ' }, icon: ScrollText },
          { href: '/student/calendar', label: { en: 'Calendar', dr: 'تقویم', ps: 'کالنډر' }, icon: CalendarDays },
        ],
      },
      {
        id: 'records',
        label: { en: 'Records', dr: 'اسناد', ps: 'اسناد' },
        icon: FileText,
        items: [
          { href: '/student/finance', label: { en: 'Fees & Invoices', dr: 'فیس او بلونه', ps: 'فیس او بلونه' }, icon: CreditCard },
          { href: '/student/invoices', label: { en: 'My Invoices', dr: 'بلونه من', ps: 'زما بلونه' }, icon: Receipt },
          { href: '/student/fee-structure', label: { en: 'Fee Structure', dr: 'ساختار فیس', ps: 'د فیس جوړښت' }, icon: Wallet },
          { href: '/student/documents', label: { en: 'Documents', dr: 'اسناد', ps: 'اسناد' }, icon: FileText },
          { href: '/student/certificates', label: { en: 'Certificates', dr: 'تصدیق‌نامه‌ها', ps: 'سندونه' }, icon: ScrollText },
        ],
      },
      {
        id: 'communication',
        label: { en: 'Communication', dr: 'ارتباطات', ps: 'اړیکې' },
        icon: MessageSquare,
        items: [
          { href: '/student/announcements', label: { en: 'Announcements', dr: 'اطلاعیه‌ها', ps: 'خبرتیاوې' }, icon: Megaphone },
          { href: '/student/support', label: { en: 'Support', dr: 'پشتیبانی', ps: 'ملاتړ' }, icon: LifeBuoy },
          MESSAGES,
          NOTIFICATIONS,
        ],
      },
      {
        id: 'account',
        label: { en: 'Account', dr: 'حساب', ps: 'حساب' },
        icon: Settings,
        items: [
          { href: '/student/settings', label: { en: 'Settings', dr: 'تنظیمات', ps: 'ترتیبات' }, icon: Settings },
        ],
      },
    ],
  },
  teacher: {
    id: 'teacher',
    name: 'Teacher Portal',
    label: { en: 'Teacher Portal', dr: 'پورتال استاد', ps: 'د ښوونکي پورتال' },
    shortName: { en: 'Teacher', dr: 'استاد', ps: 'ښوونکی' },
    audience: { en: 'Classes, attendance and grading', dr: 'صنوف، حاضری او نمرې', ps: 'ټولګي، حاضري او نمرې' },
    icon: School,
    basePath: '/teacher',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-600 hover:bg-emerald-500',
    accentSoft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
    accentBorder: 'border-emerald-200 dark:border-emerald-900',
    accentGradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    nav: [
      {
        id: 'overview',
        label: { en: 'Overview', dr: 'نمای کلی', ps: 'عمومي کتنه' },
        icon: LayoutDashboard,
        items: [
          { href: '/teacher', label: { en: 'Dashboard', dr: 'داشبورد', ps: 'داشبورډ' }, icon: LayoutDashboard },
          { href: '/teacher/profile', label: { en: 'My Profile', dr: 'پروفایل من', ps: 'زما پروفایل' }, icon: UserRound },
        ],
      },
      {
        id: 'teaching',
        label: { en: 'My Teaching', dr: 'تدریس من', ps: 'زما تدریس' },
        icon: School,
        items: [
          { href: '/teacher/classes', label: { en: 'My Classes', dr: 'صنوف من', ps: 'زما ټولګي' }, icon: School },
          { href: '/teacher/students', label: { en: 'My Students', dr: 'شاگردان من', ps: 'زما زده‌کوونکي' }, icon: Users },
          { href: '/teacher/subjects', label: { en: 'My Subjects', dr: 'مضامین من', ps: 'زما مضمونونه' }, icon: BookOpen },
          { href: '/teacher/schedule', label: { en: 'Teaching Schedule', dr: 'برنامه تدریس', ps: 'د تدریس مهالوېش' }, icon: CalendarDays },
          { href: '/teacher/materials', label: { en: 'Learning Materials', dr: 'مواد آموزشی', ps: 'زده‌کړیز مواد' }, icon: BookMarked },
          { href: '/teacher/leaves', label: { en: 'Student Leave', dr: 'رخصتی شاگردان', ps: 'د زده‌کوونکو رخصتي' }, icon: CalendarDays },
          { href: '/teacher/workload', label: { en: 'My Workload', dr: 'بار کاری', ps: 'کاري بار' }, icon: Timer },
        ],
      },
      {
        id: 'assessment',
        label: { en: 'Assessment', dr: 'ارزیابی', ps: 'ارزونه' },
        icon: ClipboardCheck,
        items: [
          { href: '/teacher/attendance', label: { en: 'Take Attendance', dr: 'ثبت حاضری', ps: 'حاضري ثبتول' }, icon: ClipboardCheck },
          { href: '/teacher/attendance-history', label: { en: 'Attendance History', dr: 'تاریخچه حاضری', ps: 'د حاضري تاریخ' }, icon: CalendarCheck },
          { href: '/teacher/attendance-reports', label: { en: 'Attendance Reports', dr: 'گزارش حاضری', ps: 'د حاضري راپور' }, icon: BarChart3 },
          { href: '/teacher/assignments', label: { en: 'Assignments', dr: 'وظایف', ps: 'دندې' }, icon: ClipboardList },
          { href: '/teacher/submissions', label: { en: 'Submissions', dr: 'سپارل‌شده کارونه', ps: 'سپارل شوي' }, icon: FileCheck },
          { href: '/teacher/exams', label: { en: 'Examinations', dr: 'امتحانات', ps: 'ازموینې' }, icon: Award },
          { href: '/teacher/grades', label: { en: 'Enter Marks', dr: 'ثبت نمرې', ps: 'نمرې ثبتول' }, icon: ClipboardCheck },
          { href: '/teacher/results', label: { en: 'Result History', dr: 'تاریخچه نتایج', ps: 'د پایلو تاریخ' }, icon: ScrollText },
          { href: '/teacher/reports', label: { en: 'Reports', dr: 'گزارش‌ها', ps: 'راپورونه' }, icon: BarChart3 },
        ],
      },
      {
        id: 'communication',
        label: { en: 'Communication', dr: 'ارتباطات', ps: 'اړیکې' },
        icon: MessageSquare,
        items: [
          { href: '/teacher/announcements', label: { en: 'Announcements', dr: 'اطلاعیه‌ها', ps: 'خبرتیاوې' }, icon: Megaphone },
          MESSAGES,
          NOTIFICATIONS,
        ],
      },
      {
        id: 'account',
        label: { en: 'Account', dr: 'حساب', ps: 'حساب' },
        icon: Settings,
        items: [
          { href: '/leave', label: { en: 'My Leave Portal', dr: 'پورتال رخصتی من', ps: 'زما د رخصتۍ پورتال' }, icon: CalendarDays },
          { href: '/teacher/settings', label: { en: 'Settings', dr: 'تنظیمات', ps: 'ترتیبات' }, icon: Settings },
        ],
      },
    ],
  },
  employee: {
    id: 'employee',
    name: 'Employee Portal',
    label: { en: 'Employee Portal', dr: 'پورتال کارمند', ps: 'د کارمند پورتال' },
    shortName: { en: 'Employee', dr: 'کارمند', ps: 'کارمند' },
    audience: { en: 'Employment, leave and payroll', dr: 'استخدام، رخصتی او معاش', ps: 'استخدام، رخصتي او معاش' },
    icon: Briefcase,
    basePath: '/employee',
    accentText: 'text-violet-700 dark:text-violet-300',
    accentBg: 'bg-violet-600 hover:bg-violet-500',
    accentSoft: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200',
    accentBorder: 'border-violet-200 dark:border-violet-900',
    accentGradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
    nav: [
      {
        id: 'overview',
        label: { en: 'Overview', dr: 'نمای کلی', ps: 'عمومي کتنه' },
        icon: LayoutDashboard,
        items: [
          { href: '/employee', label: { en: 'Dashboard', dr: 'داشبورد', ps: 'داشبورډ' }, icon: LayoutDashboard },
          { href: '/employee/profile', label: { en: 'Employment Profile', dr: 'پروفایل کاری', ps: 'د کار پروفایل' }, icon: UserRound },
        ],
      },
      {
        id: 'work',
        label: { en: 'Work', dr: 'کار', ps: 'کار' },
        icon: Briefcase,
        items: [
          { href: '/employee/check-in', label: { en: 'Check In / Out', dr: 'ورود و خروج', ps: 'ننوتل او وتل' }, icon: Clock },
          { href: '/employee/attendance', label: { en: 'My Attendance', dr: 'حاضری من', ps: 'زما حاضري' }, icon: CalendarCheck },
          { href: '/employee/hours', label: { en: 'Working Hours', dr: 'ساعات کاری', ps: 'کاري ساعتونه' }, icon: Timer },
          { href: '/leave', label: { en: 'Leave Portal', dr: 'پورتال رخصتی', ps: 'د رخصتۍ پورتال' }, icon: ListChecks },
          { href: '/employee/tasks', label: { en: 'Tasks & Schedule', dr: 'وظایف و برنامه', ps: 'دندې او مهالوېش' }, icon: ClipboardList },
          { href: '/employee/schedule', label: { en: 'My Schedule', dr: 'برنامه کاری', ps: 'زما مهالوېش' }, icon: CalendarDays },
          { href: '/employee/shifts', label: { en: 'My Shift', dr: 'شیفت من', ps: 'زما شفټ' }, icon: Clock },
          { href: '/employee/holidays', label: { en: 'Holidays', dr: 'رخصتی‌ها', ps: 'رخصتۍ' }, icon: CalendarDays },
          { href: '/employee/expenses', label: { en: 'Expense Claims', dr: 'مصارف', ps: 'لګښتونه' }, icon: Banknote },
          { href: '/employee/performance', label: { en: 'Performance', dr: 'ارزیابی', ps: 'ارزونه' }, icon: TrendingUp },
        ],
      },
      {
        id: 'payroll',
        label: { en: 'Payroll', dr: 'معاش', ps: 'معاش' },
        icon: Wallet,
        items: [
          { href: '/employee/payslips', label: { en: 'Payslips', dr: 'فیش معاش', ps: 'د معاش فیش' }, icon: Wallet },
        ],
      },
      {
        id: 'records',
        label: { en: 'Records', dr: 'اسناد', ps: 'اسناد' },
        icon: FileText,
        items: [
          { href: '/employee/documents', label: { en: 'My Documents', dr: 'اسناد من', ps: 'زما اسناد' }, icon: Receipt },
          { href: '/employee/document-requests', label: { en: 'Document Requests', dr: 'درخواست اسناد', ps: 'د اسنادو غوښتنې' }, icon: FileText },
        ],
      },
      {
        id: 'communication',
        label: { en: 'Communication', dr: 'ارتباطات', ps: 'اړیکې' },
        icon: MessageSquare,
        items: [
          { href: '/employee/announcements', label: { en: 'Announcements', dr: 'اطلاعیه‌ها', ps: 'خبرتیاوې' }, icon: Megaphone },
          { href: '/employee/requests', label: { en: 'HR Requests', dr: 'درخواست‌های اداری', ps: 'اداري غوښتنې' }, icon: LifeBuoy },
          MESSAGES,
          NOTIFICATIONS,
        ],
      },
      {
        id: 'account',
        label: { en: 'Account', dr: 'حساب', ps: 'حساب' },
        icon: Settings,
        items: [
          { href: '/employee/settings', label: { en: 'Settings', dr: 'تنظیمات', ps: 'ترتیبات' }, icon: Settings },
        ],
      },
    ],
  },
  leave: {
    id: 'leave',
    name: 'Leave Portal',
    label: { en: 'Leave Portal', dr: 'پورتال رخصتی', ps: 'د رخصتۍ پورتال' },
    shortName: { en: 'Leave', dr: 'رخصتی', ps: 'رخصتي' },
    audience: {
      en: 'Request leave, track approvals and holidays',
      dr: 'درخواست رخصتی، پیگیری تایید و رخصتی‌ها',
      ps: 'د رخصتۍ غوښتنه، تایید او رخصتۍ',
    },
    icon: CalendarDays,
    basePath: '/leave',
    accentText: 'text-amber-700 dark:text-amber-300',
    accentBg: 'bg-amber-600 hover:bg-amber-500',
    accentSoft: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
    accentBorder: 'border-amber-200 dark:border-amber-900',
    accentGradient: 'from-amber-500 via-orange-600 to-rose-600',
    nav: [
      {
        id: 'overview',
        label: { en: 'Overview', dr: 'نمای کلی', ps: 'عمومي کتنه' },
        icon: LayoutDashboard,
        items: [
          { href: '/leave', label: { en: 'Dashboard', dr: 'داشبورد', ps: 'داشبورډ' }, icon: LayoutDashboard },
          { href: '/leave/requests', label: { en: 'My Requests', dr: 'درخواست‌های من', ps: 'زما غوښتنې' }, icon: ListChecks },
        ],
      },
      {
        id: 'approvals',
        label: { en: 'Approvals & Calendar', dr: 'تاییدات و تقویم', ps: 'تایید او کالنډر' },
        icon: ClipboardCheck,
        items: [
          { href: '/leave/approvals', label: { en: 'Approvals', dr: 'تاییدات', ps: 'تاییدونه' }, icon: ClipboardCheck },
          { href: '/leave/holidays', label: { en: 'Holidays', dr: 'رخصتی‌ها', ps: 'رخصتۍ' }, icon: CalendarDays },
        ],
      },
      {
        id: 'communication',
        label: { en: 'Communication', dr: 'ارتباطات', ps: 'اړیکې' },
        icon: MessageSquare,
        items: [MESSAGES, NOTIFICATIONS],
      },
      {
        id: 'account',
        label: { en: 'Account', dr: 'حساب', ps: 'حساب' },
        icon: Settings,
        items: [
          { href: '/leave/settings', label: { en: 'Settings', dr: 'تنظیمات', ps: 'ترتیبات' }, icon: Settings },
        ],
      },
    ],
  },
};

export const PORTAL_IDS: PortalId[] = ['student', 'teacher', 'employee', 'leave'];

const NON_PORTAL_ROLES = new Set(['student', 'guardian', 'parent']);

/** Portals this role may open. Teachers get both their academic and employee portal. */
export function portalsForRole(role: string | null | undefined): PortalId[] {
  if (!role) return [];
  if (role === 'student') return ['student', 'leave'];
  if (role === 'guardian' || role === 'parent') return [];
  if (role === 'teacher') return ['teacher', 'employee', 'leave'];
  if (NON_PORTAL_ROLES.has(role)) return [];
  return ['employee', 'leave'];
}

/** Default landing portal for a role, or `/dashboard` when the role has no portal. */
export function portalHomeForRole(role: string | null | undefined): string {
  const portals = portalsForRole(role);
  return portals.length ? PORTALS[portals[0]].basePath : '/dashboard';
}

/**
 * Portals listed in the main sidebar. Students get only their own portal;
 * every staff account can open all three (each portal still scopes data to
 * the signed-in user, so an unlinked portal simply shows an empty state).
 */
export function portalsForNav(role: string | null | undefined): PortalId[] {
  if (!role) return [];
  if (role === 'student') return ['student', 'leave'];
  if (role === 'guardian' || role === 'parent') return [];
  if (role === 'teacher') return ['teacher', 'employee', 'leave'];
  return PORTAL_IDS;
}

export function canOpenPortal(
  role: string | null | undefined,
  portal: PortalId
): boolean {
  return portalsForNav(role).includes(portal);
}

export function isPortalId(value: string): value is PortalId {
  return value === 'student' || value === 'teacher' || value === 'employee' || value === 'leave';
}

export function portalNavItemActive(pathname: string, item: PortalNavItem) {
  if (item.href.split('/').length === 2) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function portalPageLabel(portal: PortalId, pathname: string): string {
  for (const section of PORTALS[portal].nav) {
    const hit = section.items.find((item) => portalNavItemActive(pathname, item));
    if (hit) return hit.label.en;
  }
  return PORTALS[portal].name;
}
