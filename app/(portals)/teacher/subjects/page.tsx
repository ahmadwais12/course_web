import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { TeacherSubjectsScreen } from '@/components/portal/teacher/TeacherExtraScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'My Subjects',
  'Subjects you teach and where they are assigned.',
  '/teacher/subjects'
);

export default function Page() {
  return <TeacherSubjectsScreen />;
}
