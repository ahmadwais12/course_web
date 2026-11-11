import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherStudentsScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Students',
  'Students enrolled in the teacher’s assigned classes.',
  '/teacher/students'
);

export default function TeacherStudentsPage() {
  return <TeacherStudentsScreen />;
}
