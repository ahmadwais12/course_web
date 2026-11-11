import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherGradesScreen } from '@/components/portal/teacher/TeacherExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Enter Marks',
  'Record examination marks for your students.',
  '/teacher/grades'
);

export default function Page() {
  return <TeacherGradesScreen />;
}
