import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherAssignmentsScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Assignments',
  'Publish assignments for assigned classes and track student submissions.',
  '/teacher/assignments'
);

export default function TeacherAssignmentsPage() {
  return <TeacherAssignmentsScreen />;
}
