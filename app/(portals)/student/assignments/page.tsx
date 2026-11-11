import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentAssignmentsScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Assignments',
  'Assignments, due dates, submissions, marks, and teacher feedback.',
  '/student/assignments'
);

export default function StudentAssignmentsPage() {
  return <StudentAssignmentsScreen />;
}
