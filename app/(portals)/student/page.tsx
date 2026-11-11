import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentDashboardScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Student Dashboard',
  'Student dashboard with attendance, timetable, assignments, exams, and fee balance.',
  '/student'
);

export default function StudentDashboardPage() {
  return <StudentDashboardScreen />;
}
