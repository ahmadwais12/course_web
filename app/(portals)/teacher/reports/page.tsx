import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherReportsScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Teaching Reports',
  'Attendance, grade averages, and workload across your assigned classes.',
  '/teacher/reports'
);

export default function TeacherReportsPage() {
  return <TeacherReportsScreen />;
}
