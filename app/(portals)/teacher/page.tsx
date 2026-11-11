import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherDashboardScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Teacher Dashboard',
  'Teacher dashboard with classes, students, attendance tasks, assignments, and examinations.',
  '/teacher'
);

export default function TeacherDashboardPage() {
  return <TeacherDashboardScreen />;
}
