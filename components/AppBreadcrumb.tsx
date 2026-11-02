'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PRIVATE_APP_PAGES } from '@/lib/seo-pages';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  business: 'Business',
  create: 'Create',
  branches: 'Branches',
  ports: 'Ports',
  'business-types': 'Business Types',
  plans: 'Plans',
  'messaging-types': 'Messaging Types',
  users: 'Users',
  permissions: 'Permissions',
  roles: 'Roles',
  hr: 'HR',
  staff: 'Staff',
  attendance: 'Attendance',
  recruitment: 'Recruitment',
  support: 'Support',
  'call-center': 'Call Center',
  tickets: 'Tickets',
  messages: 'Messages',
  social: 'Social',
  messaging: 'Messaging',
  new: 'New',
  observers: 'Observers',
  directory: 'Directory',
  profile: 'Profile',
  settings: 'Settings',
  students: 'Students',
  courses: 'Courses',
  classes: 'Classes',
  grades: 'Grades',
  payments: 'Payments',
  salaries: 'Salaries',
  reports: 'Reports',
  books: 'Books',
  feedback: 'Feedback',
  leaves: 'Leaves',
  compliance: 'Compliance',
};

function labelFor(path: string, segment: string) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  const page = PRIVATE_APP_PAGES.find((item) => item.path === path);
  if (page) return page.title;
  if (/^[0-9a-f-]{16,}$/i.test(segment)) {
    return path.startsWith('/messaging/') ? 'Profile' : 'Details';
  }
  return segment
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AppBreadcrumb() {
  const pathname = usePathname() || '/dashboard';
  const parts = pathname.split('/').filter(Boolean);

  const crumbs = parts.map((segment, index) => {
    const href = `/${parts.slice(0, index + 1).join('/')}`;
    return {
      href,
      label: labelFor(href, segment),
      current: index === parts.length - 1,
    };
  });

  if (parts[0] !== 'dashboard') {
    crumbs.unshift({ href: '/dashboard', label: 'Dashboard', current: false });
  }

  if (crumbs.length === 0) {
    crumbs.push({ href: '/dashboard', label: 'Dashboard', current: true });
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem className="min-w-0">
              {crumb.current ? (
                <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href} className="truncate">
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
