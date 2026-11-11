import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherResultsScreen } from '@/components/portal/teacher/TeacherExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Result History',
  'Examination results recorded across your classes.',
  '/teacher/results'
);

export default function Page() {
  return <TeacherResultsScreen />;
}
