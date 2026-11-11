import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherLeaveRequestsScreen } from '@/components/portal/teacher/TeacherServiceScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Student Leave Requests',
  'Leave requested by students in your classes and the academic office decision.',
  '/teacher/leaves'
);

export default function TeacherLeavesPage() {
  return <TeacherLeaveRequestsScreen />;
}
