import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentAcademicsScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Academics',
  'Enrolled class, program, subjects, and assigned teachers.',
  '/student/academics'
);

export default function StudentAcademicsPage() {
  return <StudentAcademicsScreen />;
}
