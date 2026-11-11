import type { Metadata } from 'next';
import PortalShell from '@/components/portal/PortalShell';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Student Portal',
  'Student self-service portal: academics, timetable, attendance, assignments, exams, fees, and documents.',
  '/student'
);

export default function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="student">{children}</PortalShell>;
}
