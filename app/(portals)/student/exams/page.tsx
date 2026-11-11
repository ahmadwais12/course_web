import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { StudentExamsScreen } from '@/components/portal/student/StudentScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Exams & Results',
  'Examination schedule, results, grades, and academic performance.',
  '/student/exams'
);

export default function StudentExamsPage() {
  return <StudentExamsScreen />;
}
