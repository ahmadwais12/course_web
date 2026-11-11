import type { Metadata } from 'next';
import PortalShell from '@/components/portal/PortalShell';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Teacher Portal',
  'Teacher self-service portal: assigned classes, students, timetable, attendance, assignments, and examinations.',
  '/teacher'
);

export default function TeacherPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="teacher">{children}</PortalShell>;
}
