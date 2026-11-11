import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherExamsScreen } from '@/components/portal/teacher/TeacherScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Examinations',
  'Examination schedule and marks workspace for assigned classes.',
  '/teacher/exams'
);

export default function TeacherExamsPage() {
  return <TeacherExamsScreen />;
}
