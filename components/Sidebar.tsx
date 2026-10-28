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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { usePermissions } from '@/context/PermissionsContext';
import BrandLogo from '@/components/BrandLogo';
import LanguageSelector from '@/components/LanguageSelector';
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
  { name: 'students', href: '/students', icon: Users, label: 'Students', exact: true },
  { name: 'attendance', href: '/attendance', icon: CalendarCheck, label: 'Attendance', exact: true },
  { name: 'classes', href: '/classes', icon: BookOpen, label: 'Classes', exact: true },
  { name: 'grades', href: '/grades', icon: GraduationCap, label: 'Grades', exact: true },
];

/** HR: staff records, time, payroll, hiring */
const hrLinks = [
  { name: 'staff-directory', href: '/hr/staff', icon: UserSearch, label: 'Staff Directory' },
  { name: 'hr-attendance', href: '/hr/attendance', icon: CalendarCheck, label: 'Attendance' },
  { name: 'payroll', href: '/salaries', icon: Wallet, label: 'Payroll', exact: true },
  { name: 'recruitment', href: '/hr/recruitment', icon: UserPlus, label: 'Recruitment' },
];

/** Leave & Compliance: student and employee leave workflow plus document compliance */
const leaveModuleLinks = [
  { name: 'leave-requests', href: '/leaves', icon: CalendarDays, label: 'Leave Requests', exact: true },
  { name: 'compliance', href: '/compliance', icon: ClipboardCheck, label: 'Compliance', exact: true },
];

/** Support & Engagement: call center, help desk, inbox, and social channels */
const supportLinks = [
  {
    name: 'call-center',
    href: '/support/call-center',
    icon: PhoneCall,
    label: 'Call Center',
    exact: true,
  },
  {
    name: 'support-tickets',
    href: '/support/tickets',
    icon: Ticket,
    label: 'Support Tickets',
    exact: true,
  },
  {
    name: 'support-messages',
    href: '/support/messages',
    icon: Inbox,
    label: 'Messages',
    exact: true,
  },
  {
    name: 'social-media',
    href: '/support/social',
    icon: Share2,
    label: 'Social Media',
    exact: true,
  },
];

/** Ports = sidebar group name only; pages live under this dropdown */
const portsLinks = [
  { name: 'grade', href: '/grades', icon: GraduationCap, label: 'Grade' },
];

/** KMS Team section: Users → Permissions → Roles */
const userManagementLinks = [
  { name: 'users', href: '/users', icon: UserPlus, label: 'Users', exact: true },
  { name: 'permissions', href: '/users/permissions', icon: KeyRound, label: 'Permissions' },
  { name: 'roles', href: '/users/roles', icon: Shield, label: 'Roles' },
];

/** Observers section: website analytics + account directory */
const observerLinks = [
  {
    name: 'analytics',
    href: '/observers',
    icon: Activity,
    label: 'Website Analytics',
    exact: true,
  },
  {
    name: 'directory',
    href: '/observers/directory',
    icon: Contact,
    label: 'Directory',
    exact: true,
  },
];

export default function Sidebar({ role }: { role?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { t, isRTL, lang, setLang } = useLanguage();
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
          className="p-2 bg-card border border-border rounded-md shadow-md text-muted-foreground hover:text-primary transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside
        className={cn(
          'fixed top-0 h-full bg-card border-border w-64 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0',
          isRTL ? 'right-0 border-l' : 'left-0 border-r',
          isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <BrandLogo size={40} showName={false} />
              <div>
                <h1 className="font-bold text-foreground leading-tight">{APP_NAME}</h1>
                <p className="text-xs text-muted-foreground">Institute Manager</p>
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
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-sm'
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

            {/* Student Operations — students, attendance, classes, grades */}
            <div className="pt-3 mt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setStudentOpsOpen((v) => !v)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  studentOpsActive
                    ? 'bg-accent/60 text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <School size={20} />
                <span className="flex-1 text-left">Student Operations</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', studentOpsOpen && 'rotate-180')}
                />
              </button>

              {studentOpsOpen && (
                <div className="mt-1 ml-2 space-y-1 border-l border-border pl-2">
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
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {item.label}
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
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  hrActive
                    ? 'bg-accent/60 text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Briefcase size={20} />
                <span className="flex-1 text-left">HR</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', hrOpen && 'rotate-180')}
                />
              </button>

              {hrOpen && (
                <div className="mt-1 ml-2 space-y-1 border-l border-border pl-2">
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
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {item.label}
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
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-sm'
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
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  leaveModuleActive
                    ? 'bg-accent/60 text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <CalendarDays size={20} />
                <span className="flex-1 text-left">Leave &amp; Compliance</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', leaveModuleOpen && 'rotate-180')}
                />
              </button>

              {leaveModuleOpen && (
                <div className="mt-1 ml-2 space-y-1 border-l border-border pl-2">
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
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {item.label}
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
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  supportActive
                    ? 'bg-accent/60 text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Headphones size={20} />
                <span className="flex-1 text-left">Support &amp; Engagement</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', supportOpen && 'rotate-180')}
                />
              </button>

              {supportOpen && (
                <div className="mt-1 ml-2 space-y-1 border-l border-border pl-2">
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
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {item.label}
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
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  portsActive
                    ? 'bg-accent/60 text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Boxes size={20} />
                <span className="flex-1 text-left">Ports</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', portsOpen && 'rotate-180')}
                />
              </button>

              {portsOpen && (
                <div className="mt-1 ml-2 space-y-1 border-l border-border pl-2">
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
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {item.label}
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
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  observersActive
                    ? 'bg-accent/60 text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Eye size={20} />
                <span className="flex-1 text-left">Observers</span>
                <ChevronDown
                  size={16}
                  className={cn('transition-transform', observersOpen && 'rotate-180')}
                />
              </button>

              {observersOpen && (
                <div className="mt-1 ml-2 space-y-1 border-l border-border pl-2">
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
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                          isActive
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon
                          size={18}
                          className={cn(
                            isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {item.label}
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
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    userMgmtActive
                      ? 'bg-accent/60 text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <UserCog size={20} />
                  <span className="flex-1 text-left">Team</span>
                  <ChevronDown
                    size={16}
                    className={cn('transition-transform', userMgmtOpen && 'rotate-180')}
                  />
                </button>

                {userMgmtOpen && (
                  <div className="mt-1 ml-2 space-y-1 border-l border-border pl-2">
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
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                            isActive
                              ? 'bg-accent text-accent-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <item.icon
                            size={18}
                            className={cn(
                              isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                            )}
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Language
              </span>
              <LanguageSelector
                currentLang={lang}
                onLanguageChange={setLang}
                variant="ghost"
                placement="top"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                DF
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{APP_NAME}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {role ? t[role as keyof typeof t] || role : 'User'}
                </p>
              </div>
            </div>
            <button className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <LogOut size={18} />
              {t.logout}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
