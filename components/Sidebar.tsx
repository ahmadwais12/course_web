'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CalendarCheck,
  GraduationCap,
  BookMarked,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  Briefcase,
  CreditCard,
  FileText,
  Wallet,
  Shield,
  KeyRound,
  UserPlus,
  ChevronDown,
  UserCog,
  Boxes,
  Eye,
  Activity,
  Contact,
  School,
  ClipboardCheck,
  CalendarDays,
  UserSearch,
  Headphones,
  PhoneCall,
  Ticket,
  Inbox,
  Share2,
  MessagesSquare,
  MessageSquarePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { usePermissions } from '@/context/PermissionsContext';
import BrandLogo from '@/components/BrandLogo';
import { APP_NAME } from '@/lib/branding';

const navigationTop = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'courses', href: '/courses', icon: BookOpen },
];

const navigationBottom = [
  { name: 'payments', href: '/payments', icon: CreditCard },
  { name: 'reports', href: '/reports', icon: FileText },
  { name: 'books', href: '/books', icon: BookMarked },
  { name: 'feedback', href: '/feedback', icon: MessageSquare },
  { name: 'settings', href: '/settings', icon: Settings },
];

/** Student Operations: everything tied to a student's journey */
const studentOpsLinks = [
  { name: 'students', href: '/students', icon: Users, labelKey: 'students', exact: true },
  { name: 'attendance', href: '/attendance', icon: CalendarCheck, labelKey: 'attendance', exact: true },
  { name: 'classes', href: '/classes', icon: BookOpen, labelKey: 'classes', exact: true },
  { name: 'grades', href: '/grades', icon: GraduationCap, labelKey: 'grades', exact: true },
];

/** HR: staff records, time, payroll, hiring */
const hrLinks = [
  { name: 'staff-directory', href: '/hr/staff', icon: UserSearch, labelKey: 'staffDirectory' },
  { name: 'hr-attendance', href: '/hr/attendance', icon: CalendarCheck, labelKey: 'attendance' },
  { name: 'payroll', href: '/salaries', icon: Wallet, labelKey: 'payroll', exact: true },
  { name: 'recruitment', href: '/hr/recruitment', icon: UserPlus, labelKey: 'recruitment' },
];

/** Leave & Compliance: student and employee leave workflow plus document compliance */
const leaveModuleLinks = [
  { name: 'leave-requests', href: '/leaves', icon: CalendarDays, labelKey: 'leaveRequests', exact: true },
  { name: 'compliance', href: '/compliance', icon: ClipboardCheck, labelKey: 'compliance', exact: true },
];

/** Support & Engagement: call center, help desk, inbox, and social channels */
const supportLinks = [
  {
    name: 'support-overview',
    href: '/support',
    icon: LayoutDashboard,
    labelKey: 'overview',
    exact: true,
  },
  {
    name: 'call-center',
    href: '/support/call-center',
    icon: PhoneCall,
    labelKey: 'callCenter',
    exact: true,
  },
  {
    name: 'support-tickets',
    href: '/support/tickets',
    icon: Ticket,
    labelKey: 'supportTickets',
    exact: true,
  },
  {
    name: 'support-messages',
    href: '/support/messages',
    icon: Inbox,
    labelKey: 'supportMessages',
    exact: true,
  },
  {
    name: 'social-media',
    href: '/support/social',
    icon: Share2,
    labelKey: 'socialMedia',
    exact: true,
  },
];

/** Messaging: inbox and new conversation */
const messagingLinks = [
  {
    name: 'messaging-inbox',
    href: '/messaging',
    icon: MessagesSquare,
    labelKey: 'inbox',
    exact: true,
  },
  {
    name: 'messaging-new',
    href: '/messaging/new',
    icon: MessageSquarePlus,
    labelKey: 'newConversation',
    exact: true,
  },
];

/** Ports = sidebar group name only; pages live under this dropdown */
const portsLinks = [
  { name: 'grade', href: '/grades', icon: GraduationCap, labelKey: 'grade' },
];

/** KMS Team section: Users → Permissions → Roles */
const userManagementLinks = [
  { name: 'users', href: '/users', icon: UserPlus, labelKey: 'users', exact: true },
  { name: 'permissions', href: '/users/permissions', icon: KeyRound, labelKey: 'permissions' },
  { name: 'roles', href: '/users/roles', icon: Shield, labelKey: 'roles' },
];

/** Observers section: website analytics + account directory */
const observerLinks = [
  {
    name: 'analytics',
    href: '/observers',
    icon: Activity,
    labelKey: 'websiteAnalytics',
    exact: true,
  },
  {
    name: 'directory',
    href: '/observers/directory',
    icon: Contact,
    labelKey: 'directory',
    exact: true,
  },
];

export default function Sidebar({ role }: { role?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { t, isRTL } = useLanguage();
  const { can, abilities, loading: permsLoading } = usePermissions();
  const showTeam = permsLoading || abilities.length === 0 || can('Team');

  const studentOpsActive = studentOpsLinks.some((l) =>
    l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`)
  );
  const [studentOpsOpen, setStudentOpsOpen] = useState(studentOpsActive);

  const hrActive = hrLinks.some((l) =>
    l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`)
  );
  const [hrOpen, setHrOpen] = useState(hrActive);

  const leaveModuleActive = leaveModuleLinks.some((l) =>
    l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`)
  );
  const [leaveModuleOpen, setLeaveModuleOpen] = useState(leaveModuleActive);

  const supportActive = supportLinks.some((l) =>
    l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`)
  );
  const [supportOpen, setSupportOpen] = useState(supportActive);

  const messagingActive = pathname.startsWith('/messaging');
  const [messagingOpen, setMessagingOpen] = useState(messagingActive);

  const portsActive = portsLinks.some(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`)
  );
  const [portsOpen, setPortsOpen] = useState(portsActive);

  const userMgmtActive = pathname.startsWith('/users');
  const [userMgmtOpen, setUserMgmtOpen] = useState(userMgmtActive);

  const observersActive = pathname.startsWith('/observers');
  const [observersOpen, setObserversOpen] = useState(observersActive);

  return (
    <>
      <div className={cn('lg:hidden fixed top-4 z-50', isRTL ? 'right-4' : 'left-4')}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl border border-border bg-card p-2 text-muted-foreground shadow-soft transition-colors hover:text-primary"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside
        className={cn(
          'fixed top-0 z-40 h-full w-64 overflow-hidden border-border bg-card transition-transform duration-300 ease-in-out lg:translate-x-0',
          isRTL ? 'right-0 border-s' : 'left-0 border-e',
          isOpen
            ? 'translate-x-0'
            : isRTL
              ? 'translate-x-full'
              : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="border-b border-border bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-50 p-5 dark:from-blue-950/70 dark:via-[#0f1c33] dark:to-indigo-950/40">
            <div className="flex flex-col gap-2">
              <BrandLogo size={44} showName={false} className="items-start" />
              <div>
                <h1 className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text font-bold leading-tight text-transparent">
                  {APP_NAME}
                </h1>
                <p className="text-xs text-muted-foreground">{t.instituteManager}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigationTop.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const label = t[item.name as keyof typeof t] || item.name;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch
                  scroll={false}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon
                    size={20}
                    className={cn(isActive ? 'text-accent-foreground' : 'text-muted-foreground')}
                  />
                  {label}
                </Link>
              );
            })}

            {/* Messaging — inbox and new conversation */}
            <div className="pt-3 mt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setMessagingOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  messagingActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <MessagesSquare size={20} />
                <span className="flex-1 text-start">{t.messaging}</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', messagingOpen && 'rotate-180')}
                />
              </button>

              {messagingOpen && (
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {messagingLinks.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch
                        scroll={false}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {t[item.labelKey as keyof typeof t]}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Student Operations — students, attendance, classes, grades */}
            <div className="pt-3 mt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setStudentOpsOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  studentOpsActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <School size={20} />
                <span className="flex-1 text-start">{t.studentOperations}</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', studentOpsOpen && 'rotate-180')}
                />
              </button>

              {studentOpsOpen && (
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {studentOpsLinks.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch
                        scroll={false}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {t[item.labelKey as keyof typeof t]}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* HR — staff, time, payroll, leave, hiring */}
            <div className="pt-3 mt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setHrOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  hrActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Briefcase size={20} />
                <span className="flex-1 text-start">{t.hr}</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', hrOpen && 'rotate-180')}
                />
              </button>

              {hrOpen && (
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {hrLinks.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch
                        scroll={false}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {t[item.labelKey as keyof typeof t]}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {navigationBottom.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const label = t[item.name as keyof typeof t] || item.name;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch
                  scroll={false}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon
                    size={20}
                    className={cn(isActive ? 'text-accent-foreground' : 'text-muted-foreground')}
                  />
                  {label}
                </Link>
              );
            })}

            {/* Leave & Compliance — shared student and employee leave workflow */}
            <div className="pt-3 mt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setLeaveModuleOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  leaveModuleActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <CalendarDays size={20} />
                <span className="flex-1 text-start">{t.leaveAndCompliance}</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', leaveModuleOpen && 'rotate-180')}
                />
              </button>

              {leaveModuleOpen && (
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {leaveModuleLinks.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch
                        scroll={false}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {t[item.labelKey as keyof typeof t]}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Support & Engagement — call center, help desk, inbox, social */}
            <div className="pt-3 mt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setSupportOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  supportActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Headphones size={20} />
                <span className="flex-1 text-start">{t.supportEngagement}</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', supportOpen && 'rotate-180')}
                />
              </button>

              {supportOpen && (
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {supportLinks.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch
                        scroll={false}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {t[item.labelKey as keyof typeof t]}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ports dropdown — group name only */}
            <div className="pt-3 mt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setPortsOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  portsActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Boxes size={20} />
                <span className="flex-1 text-start">{t.ports}</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', portsOpen && 'rotate-180')}
                />
              </button>

              {portsOpen && (
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {portsLinks.map((item) => {
                    const isActive =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch
                        scroll={false}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {t[item.labelKey as keyof typeof t]}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Observers dropdown — read-only monitoring views */}
            <div className="pt-3 mt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setObserversOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  observersActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Eye size={20} />
                <span className="flex-1 text-start">{t.observers}</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', observersOpen && 'rotate-180')}
                />
              </button>

              {observersOpen && (
                <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                  {observerLinks.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch
                        scroll={false}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {t[item.labelKey as keyof typeof t]}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {showTeam && (
              <div className="pt-3 mt-2 border-t border-border space-y-1">
                <button
                  type="button"
                  onClick={() => setUserMgmtOpen((v) => !v)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    userMgmtActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <UserCog size={20} />
                  <span className="flex-1 text-start">{t.team}</span>
                  <ChevronDown
                    size={16}
                    className={cn('transition-transform', userMgmtOpen && 'rotate-180')}
                  />
                </button>

                {userMgmtOpen && (
                  <div className="mt-1 ms-2 space-y-1 border-s border-border ps-2">
                    {userManagementLinks.map((item) => {
                      const isActive = item.exact
                        ? pathname === item.href
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          prefetch
                          scroll={false}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                            isActive
                              ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/40'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <item.icon
                            size={18}
                            className={cn(
                              isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                            )}
                          />
                          {t[item.labelKey as keyof typeof t]}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2.5">
              <div className="emis-btn-primary flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold">
                DF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{APP_NAME}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {role ? t[role as keyof typeof t] || role : 'User'}
                </p>
              </div>
            </div>
            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
              <LogOut size={18} />
              {t.logout}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
